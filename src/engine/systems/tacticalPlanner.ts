import type { GameState } from '../../domain/game';
import type { KnownEnemy, TacticalBattle, TacticalOrder, TacticalPlan, TacticalPlanKind, TacticalSide, TacticalUnit } from '../../domain/tactical';
import { COMMAND_BUDGET, ORDER_COST, allCells, cellColumn, cellDistance, cellRow, chooseSingleRoundOrders, validateTacticalOrders, visibleCells } from './tactical';

/**
 * Phase 3 multi-round tactical AI.
 *
 * Each round an AI side (the opponent, or the player's side under standing orders) chooses one of a few plans
 * (recon, seize, flank, secure, withdraw) around one objective, projects it three rounds ahead and keeps its current
 * plan unless another is clearly better (plan consistency). Knowledge is limited to what the side can see now and
 * what it saw in the last few rounds; nothing hidden by fog of war is read. Orders go through the same validator,
 * fuel rules and command budget as the player's. The work is bounded by a deterministic evaluation budget; when it
 * is exceeded the side falls back to the single-round AI. No clock, no randomness: the same state gives the same orders.
 */
export const PLAN_HORIZON = 3;
/** A challenger plan must project at least this much better (25%) to replace the standing plan. */
export const PLAN_COMMITMENT = 0.25;
/** A plan is kept for at least this many rounds unless it becomes impossible or the side must withdraw. */
export const PLAN_MIN_ROUNDS = 2;
/** Deterministic work limit per decision (projected unit-steps plus order validations). */
export const PLAN_EVALUATION_BUDGET = 6000;
/** Rounds an unseen enemy group stays in memory at its last known sector. */
export const MEMORY_ROUNDS = 3;
/** Below this share of the enemy's strength, a side withdraws to cover. */
export const WITHDRAW_RATIO = 0.5;

const DISCOUNT = 0.8;
const other = (side: TacticalSide): TacticalSide => (side === 'attacker' ? 'defender' : 'attacker');
const alive = (units: TacticalUnit[]) => units.filter(u => u.remaining > 0);
const strength = (u: { remaining: number; role: string }) => u.remaining * (u.role === 'infantry' ? 0.002 : u.role === 'armor' ? 1.6 : 1.1);

export interface PlannedOrders {
  orders: TacticalOrder[];
  plan: TacticalPlan | null;
  evaluations: number;
  /** True when the evaluation budget ran out and the single-round AI chose the orders. */
  fallback: boolean;
  /** Short explanation of the decision (for tests, logs and the player's own standing orders). */
  reason: string;
}

class Budget {
  used = 0;
  constructor(readonly limit: number) {}
  spend(n = 1) { this.used += n; return this.used <= this.limit; }
  get exceeded() { return this.used > this.limit; }
}

// ---------------------------------------------------------------------------------------------
// Knowledge (fog of war)
// ---------------------------------------------------------------------------------------------

export interface Knowledge {
  visible: Set<number>;
  /** Enemy groups seen now, plus remembered groups whose last sector is not visible now. */
  enemies: KnownEnemy[];
  /** Holder of each objective as far as this side can tell; null = empty, contested or unknown. */
  holders: (TacticalSide | null)[];
  ownStrength: number;
  /** The enemy's total strength comes from published casualty reports, not from positions. */
  enemyStrength: number;
}

export function sideKnowledge(b: TacticalBattle, side: TacticalSide, memory: KnownEnemy[] = b.plans?.[side]?.known ?? []): Knowledge {
  const visible = visibleCells(b, side), own = alive(b.units).filter(u => u.side === side);
  const seen: KnownEnemy[] = alive(b.units).filter(u => u.side !== side && visible.has(u.cell))
    .map(u => ({ unitId: u.id, role: u.role, cell: u.cell, remaining: u.remaining, seenRound: b.round }));
  const seenIds = new Set(seen.map(e => e.unitId));
  const remembered = memory.filter(e => !seenIds.has(e.unitId) && !visible.has(e.cell) && b.round - e.seenRound <= MEMORY_ROUNDS);
  const enemies = [...seen, ...remembered].sort((x, y) => x.unitId.localeCompare(y.unitId));
  const holders = b.objectives.map(objective => {
    const mine = own.find(u => u.cell === objective), theirs = enemies.find(e => e.cell === objective);
    const contested = (holder: TacticalSide) => (holder === side ? enemies : own).some(u => cellDistance(b, u.cell, objective) <= 1);
    if (mine) return contested(side) ? null : side;
    if (theirs) return contested(other(side)) ? null : other(side);
    return null;
  });
  return {
    visible, enemies, holders,
    ownStrength: own.reduce((n, u) => n + strength(u), 0),
    enemyStrength: alive(b.units).filter(u => u.side !== side).reduce((n, u) => n + strength(u), 0),
  };
}

// ---------------------------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------------------------

type Destinations = Map<string, number>;

/** One greedy step for a unit toward `goal`: the reachable sector closest to the goal (ties: cover, then lowest index). */
function stepToward(b: TacticalBattle, u: TacticalUnit, goal: number, blocked: Set<number>, budget: Budget): number {
  const range = u.role === 'armor' ? 2 : 1;
  let best = u.cell, bestDistance = cellDistance(b, u.cell, goal);
  for (const cell of allCells(b)) {
    const d = cellDistance(b, u.cell, cell);
    if (d < 1 || d > range || blocked.has(cell)) continue;
    if (!budget.spend()) return u.cell;
    if (d === 2 && b.terrain[cell] === 'mountain' && u.role === 'armor') continue;
    const remaining = cellDistance(b, cell, goal);
    const better = remaining < bestDistance || (remaining === bestDistance && best !== u.cell && b.terrain[cell] !== 'plains' && b.terrain[best] === 'plains');
    if (better) { best = cell; bestDistance = remaining; }
  }
  return best;
}

/** Where each own group is sent under a plan. */
function destinations(b: TacticalBattle, side: TacticalSide, kind: TacticalPlanKind, objective: number, k: Knowledge): Destinations {
  const own = alive(b.units).filter(u => u.side === side), result: Destinations = new Map();
  const homeColumn = side === 'attacker' ? 0 : b.width - 1;
  const lateral = (cell: number) => { const row = cellRow(b, cell); return row < b.height / 2 ? Math.max(0, row - 2) : Math.min(b.height - 1, row + 2); };
  const nearestCover = (from: number, avoid: KnownEnemy[]) => allCells(b)
    .filter(c => b.terrain[c] !== 'plains' && !avoid.some(e => cellDistance(b, e.cell, c) <= 1))
    .sort((x, y) => cellDistance(b, from, x) - cellDistance(b, from, y) || x - y)[0] ?? from;
  for (const u of own) {
    if (kind === 'withdraw') {
      const retreat = cellRow(b, u.cell) * b.width + homeColumn;
      result.set(u.id, nearestCover(retreat, k.enemies));
    } else if (kind === 'secure') {
      result.set(u.id, u.role === 'artillery' ? nearestCover(objective, k.enemies) : objective);
    } else if (kind === 'flank' && u.role === 'armor') {
      // Armor swings wide on the far rows, then turns in on the objective.
      const wing = lateral(objective) * b.width + cellColumn(b, objective);
      result.set(u.id, cellDistance(b, u.cell, wing) > 1 ? wing : objective);
    } else if (u.role === 'artillery') {
      // Artillery closes to firing range (three sectors) of the objective and stays there.
      result.set(u.id, cellDistance(b, u.cell, objective) <= 3 ? u.cell : objective);
    } else result.set(u.id, objective);
  }
  return result;
}

/** Projected value of a plan over the horizon, from this side's knowledge only. */
function projectPlan(b: TacticalBattle, side: TacticalSide, kind: TacticalPlanKind, objective: number, k: Knowledge, budget: Budget): number {
  const goals = destinations(b, side, kind, objective, k);
  let units = alive(b.units).filter(u => u.side === side).map(u => ({ ...u }));
  const enemyCells = new Set(k.enemies.map(e => e.cell));
  const ratio = k.ownStrength / Math.max(1e-9, k.enemyStrength);
  const startDistance = units.reduce((n, u) => n + cellDistance(b, u.cell, goals.get(u.id)!), 0);
  let score = 0;
  for (let round = 1; round <= PLAN_HORIZON; round++) {
    const occupied = new Set([...units.map(u => u.cell), ...enemyCells]);
    units = units.map(u => { occupied.delete(u.cell); const cell = stepToward(b, u, goals.get(u.id)!, occupied, budget); occupied.add(cell); return { ...u, cell }; });
    if (budget.exceeded) return -Infinity;
    const weight = Math.pow(DISCOUNT, round - 1);
    const held = b.objectives.filter(o => units.some(u => u.cell === o) && !k.enemies.some(e => cellDistance(b, e.cell, o) <= 1)).length;
    const distance = units.reduce((n, u) => n + cellDistance(b, u.cell, goals.get(u.id)!), 0);
    const progress = (startDistance - distance) / Math.max(1, units.length);
    const cover = units.filter(u => b.terrain[u.cell] !== 'plains').length / Math.max(1, units.length);
    // Exposure: own groups in contact with known enemies, weighted by how outmatched this side is.
    const exposed = units.filter(u => k.enemies.some(e => cellDistance(b, e.cell, u.cell) <= 1)).length / Math.max(1, units.length);
    const support = units.some(u => u.role === 'artillery' && k.enemies.some(e => cellDistance(b, e.cell, u.cell) <= 3)) ? 1 : 0;
    score += weight * (held * 6 + progress * 1.5 + cover * 1.2 + support - exposed * 3 / Math.max(0.35, Math.min(2, ratio)));
  }
  if (kind === 'recon') score += k.enemies.length < 2 ? 4 : -2;
  if (kind === 'withdraw') score += ratio < WITHDRAW_RATIO ? 10 : -10;
  if (kind === 'secure') score += k.holders[b.objectives.indexOf(objective)] === side ? 3 : -1;
  if (kind === 'flank') score += alive(b.units).some(u => u.side === side && u.role === 'armor') ? 0.5 : -20;
  return score;
}

// ---------------------------------------------------------------------------------------------
// Orders for the chosen plan
// ---------------------------------------------------------------------------------------------

function planOrders(s: GameState, id: string, side: TacticalSide, plan: TacticalPlan, k: Knowledge, budget: Budget): TacticalOrder[] {
  const b = s.wars[id].tactical!, own = alive(b.units).filter(u => u.side === side);
  const goals = destinations(b, side, plan.kind, plan.objective, k);
  const visibleEnemies = k.enemies.filter(e => k.visible.has(e.cell) && e.seenRound === b.round);
  const candidates: { order: TacticalOrder; priority: number }[] = [];
  const forward = (from: number, to: number) => (side === 'attacker' ? cellColumn(b, to) > cellColumn(b, from) : cellColumn(b, to) < cellColumn(b, from));
  for (const u of own) {
    const goal = goals.get(u.id)!, threatened = visibleEnemies.some(e => cellDistance(b, e.cell, u.cell) <= 2);
    if (u.role === 'artillery') {
      const targets = visibleEnemies.filter(e => cellDistance(b, e.cell, u.cell) <= 3)
        .sort((x, y) => cellDistance(b, x.cell, plan.objective) - cellDistance(b, y.cell, plan.objective) || x.cell - y.cell);
      if (targets.length && plan.kind !== 'withdraw') candidates.push({ order: { unitId: u.id, kind: 'bombard', target: targets[0].cell }, priority: 9 - cellDistance(b, targets[0].cell, plan.objective) * 0.2 });
    }
    if (plan.kind === 'recon' && u.role !== 'artillery') {
      const scout = allCells(b).filter(c => !k.visible.has(c) && cellDistance(b, u.cell, c) <= 3)
        .sort((x, y) => cellDistance(b, x, plan.objective) - cellDistance(b, y, plan.objective) || x - y)[0];
      if (scout !== undefined) candidates.push({ order: { unitId: u.id, kind: 'recon', target: scout }, priority: 8 - cellDistance(b, u.cell, plan.objective) * 0.1 });
    }
    if (u.cell === goal || (b.objectives.includes(u.cell) && plan.kind !== 'withdraw')) {
      candidates.push({ order: { unitId: u.id, kind: threatened || plan.kind === 'secure' ? 'defend' : 'reserve' }, priority: threatened ? 7 : 3 });
      continue;
    }
    const occupied = new Set(alive(b.units).filter(x => x.id !== u.id && k.visible.has(x.cell)).map(x => x.cell));
    const step = stepToward(b, u, goal, occupied, budget);
    if (step === u.cell) { candidates.push({ order: { unitId: u.id, kind: 'defend' }, priority: 1 }); continue; }
    const kind = u.role === 'armor' && cellDistance(b, u.cell, step) <= 2 && forward(u.cell, step) && plan.kind !== 'withdraw' ? 'flank' : 'move';
    // Groups closest to the objective act first: they decide the plan's next round.
    candidates.push({ order: { unitId: u.id, kind, target: step }, priority: 6 - cellDistance(b, step, plan.objective) * 0.3 + (plan.kind === 'withdraw' ? 2 : 0) });
    if (kind === 'flank') candidates.push({ order: { unitId: u.id, kind: 'move', target: step }, priority: 5.5 - cellDistance(b, step, plan.objective) * 0.3 });
  }
  candidates.sort((x, y) => y.priority - x.priority || x.order.unitId.localeCompare(y.order.unitId) || (x.order.target ?? -1) - (y.order.target ?? -1));
  const orders: TacticalOrder[] = [], used = new Set<string>();
  for (const { order } of candidates) {
    if (used.has(order.unitId)) continue;
    if (!budget.spend(10)) break;
    if (validateTacticalOrders(s, id, side, [...orders, order]).length) continue;
    orders.push(order); used.add(order.unitId);
    if (orders.reduce((n, o) => n + ORDER_COST[o.kind], 0) >= COMMAND_BUDGET) break;
  }
  return orders;
}

// ---------------------------------------------------------------------------------------------
// Decision
// ---------------------------------------------------------------------------------------------

function stillValid(b: TacticalBattle, side: TacticalSide, plan: TacticalPlan, k: Knowledge): boolean {
  if (!b.objectives.includes(plan.objective)) return false;
  const ratio = k.ownStrength / Math.max(1e-9, k.enemyStrength);
  if (plan.kind === 'withdraw') return ratio < WITHDRAW_RATIO * 1.3;
  if (ratio < WITHDRAW_RATIO) return false;
  if (plan.kind === 'flank') return alive(b.units).some(u => u.side === side && u.role === 'armor');
  // A seize plan that has taken its objective becomes a secure plan.
  if (plan.kind === 'seize' || plan.kind === 'flank') return k.holders[b.objectives.indexOf(plan.objective)] !== side;
  if (plan.kind === 'recon') return k.enemies.length < 2 && b.round - plan.startedRound < PLAN_HORIZON;
  return true;
}

export function planSummary(b: TacticalBattle, plan: TacticalPlan): string {
  const sector = `${String.fromCharCode(65 + cellColumn(b, plan.objective))}${cellRow(b, plan.objective) + 1}`;
  const label = { recon: 'Reconnoitre toward', seize: 'Seize', flank: 'Flank and take', secure: 'Secure', withdraw: 'Withdraw to cover from' }[plan.kind];
  return `${label} objective ${sector} (plan round ${b.round - plan.startedRound + 1})`;
}

export function planTacticalOrders(s: GameState, id: string, side: TacticalSide, limit = PLAN_EVALUATION_BUDGET): PlannedOrders {
  const b = s.wars[id]?.tactical;
  if (!b) return { orders: [], plan: null, evaluations: 0, fallback: false, reason: 'No tactical battle.' };
  const previous = b.plans?.[side], budget = new Budget(limit), k = sideKnowledge(b, side, previous?.known);
  const fallback = (why: string): PlannedOrders => ({
    orders: chooseSingleRoundOrders(s, id, side), evaluations: budget.used, fallback: true, reason: why,
    plan: previous ? { ...previous, known: k.enemies, updatedRound: b.round } : null,
  });
  const kinds: TacticalPlanKind[] = ['seize', 'flank', 'secure', 'recon', 'withdraw'];
  const candidates: { kind: TacticalPlanKind; objective: number; score: number }[] = [];
  for (const objective of b.objectives) for (const kind of kinds) {
    if (kind === 'withdraw' && objective !== b.objectives[0]) continue;
    const score = projectPlan(b, side, kind, objective, k, budget);
    if (budget.exceeded) return fallback('Evaluation budget exceeded; single-round orders used.');
    candidates.push({ kind, objective, score });
  }
  candidates.sort((x, y) => y.score - x.score || kinds.indexOf(x.kind) - kinds.indexOf(y.kind) || x.objective - y.objective);
  const best = candidates[0];
  let plan: TacticalPlan, reason: string;
  const keep = previous && stillValid(b, side, previous, k) ? candidates.find(c => c.kind === previous.kind && c.objective === previous.objective) : undefined;
  const young = previous && b.round - previous.startedRound < PLAN_MIN_ROUNDS;
  if (keep && (young || best.score <= keep.score + Math.abs(keep.score) * PLAN_COMMITMENT + 0.5)) {
    plan = { ...previous!, score: keep.score, updatedRound: b.round, known: k.enemies };
    reason = `Kept plan: ${planSummary(b, plan)}.`;
  } else {
    // A seize/flank plan that has taken its objective continues as "secure" on the same objective.
    const converted = previous && (previous.kind === 'seize' || previous.kind === 'flank') && k.holders[b.objectives.indexOf(previous.objective)] === side
      ? candidates.find(c => c.kind === 'secure' && c.objective === previous.objective) : undefined;
    const chosen = converted && converted.score >= best.score - Math.abs(best.score) * PLAN_COMMITMENT ? converted : best;
    plan = { kind: chosen.kind, objective: chosen.objective, startedRound: b.round, updatedRound: b.round, score: chosen.score, known: k.enemies };
    reason = previous ? `New plan (${previous.kind} → ${chosen.kind}): ${planSummary(b, plan)}.` : `Plan: ${planSummary(b, plan)}.`;
  }
  const orders = planOrders(s, id, side, plan, k, budget);
  if (budget.exceeded) return fallback('Evaluation budget exceeded; single-round orders used.');
  return { orders, plan, evaluations: budget.used, fallback: false, reason };
}

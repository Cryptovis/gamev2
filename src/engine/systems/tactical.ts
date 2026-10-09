import type { BattlefieldTerrain, CasualtySnapshot, GameState, WarState } from '../../domain/game';
import type { TacticalAction, TacticalBattle, TacticalOrder, TacticalOrderKind, TacticalRole, TacticalSide, TacticalUnit } from '../../domain/tactical';
import { nextRandom } from '../rng';
import { COMMITTED_SHARE, emptyLosses, resolveCombatRound, type CombatSideOrders } from './warfare';
import { pendingVictory } from './victory';

export const COMMAND_BUDGET = 3;
export const ORDER_COST: Record<TacticalOrderKind, number> = { move: 1, defend: 1, flank: 2, recon: 1, reserve: 1, bombard: 2 };
export const ORDER_FUEL: Record<TacticalOrderKind, number> = { move: 1, defend: 0, flank: 2, recon: 1, reserve: 0, bombard: 2 };

/** HD War v2 board (0.85). Battles migrated from 0.83/0.84 saves keep their 6×6 board. */
export const BATTLE_WIDTH = 10;
export const BATTLE_HEIGHT = 8;
export const MAX_BATTLE_CELLS = 96;

const SIDES: TacticalSide[] = ['attacker', 'defender'];
const OFFENSIVE: TacticalOrderKind[] = ['move', 'flank', 'bombard'];
const TARGETED: TacticalOrderKind[] = ['move', 'flank', 'recon', 'bombard'];
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const other = (side: TacticalSide): TacticalSide => (side === 'attacker' ? 'defender' : 'attacker');
const isMove = (o: TacticalOrder) => o.kind === 'move' || o.kind === 'flank';

// ---------------------------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------------------------

type Grid = Pick<TacticalBattle, 'width' | 'height'>;
export const cellCount = (g: Grid) => g.width * g.height;
export const allCells = (g: Grid) => Array.from({ length: cellCount(g) }, (_, i) => i);
export const cellColumn = (g: Grid, cell: number) => cell % g.width;
export const cellRow = (g: Grid, cell: number) => Math.floor(cell / g.width);
export const cellDistance = (g: Grid, a: number, b: number) =>
  Math.abs(cellColumn(g, a) - cellColumn(g, b)) + Math.abs(cellRow(g, a) - cellRow(g, b));
export const isBattleCell = (g: Grid, cell: unknown): cell is number =>
  typeof cell === 'number' && Number.isInteger(cell) && cell >= 0 && cell < cellCount(g);
/** Sector label such as "C4": column letter, row number. */
export const sectorName = (g: Grid, cell: number) => `${String.fromCharCode(65 + cellColumn(g, cell))}${cellRow(g, cell) + 1}`;

// ---------------------------------------------------------------------------------------------
// Sides, units and vision
// ---------------------------------------------------------------------------------------------

export const playerSide = (s: GameState, w: WarState): TacticalSide => (w.attackerId === s.playerCountryId ? 'attacker' : 'defender');
const countryId = (w: WarState, side: TacticalSide) => (side === 'attacker' ? w.attackerId : w.defenderId);
export const roleKey = (u: Pick<TacticalUnit, 'role'>): 'personnel' | 'tanks' | 'artillery' =>
  u.role === 'infantry' ? 'personnel' : u.role === 'armor' ? 'tanks' : 'artillery';
const alive = (units: TacticalUnit[]) => units.filter(u => u.remaining > 0);

/** Group number shown next to the role ("Infantry 2"); empty for single-group legacy ids. */
export function unitNumber(u: TacticalUnit): string {
  const match = /-(\d+)$/.exec(u.id);
  return match ? match[1] : '';
}

export function visibleCells(b: TacticalBattle, side: TacticalSide, round = b.round): Set<number> {
  const visible = new Set<number>();
  const own = alive(b.units).filter(u => u.side === side);
  for (const cell of allCells(b)) if (own.some(u => cellDistance(b, u.cell, cell) <= 2)) visible.add(cell);
  // Recon persists for the next planning round, then expires.
  if (round === b.round) for (const cell of b.revealed[side]) visible.add(cell);
  return visible;
}

/**
 * Holder of each objective (audit B5). A side holds an objective only while one of its units stands on it
 * and no enemy unit is adjacent. A contested or empty objective is held by nobody, so reaching a depot
 * first no longer locks it for the rest of the battle.
 */
export function objectiveHolders(b: TacticalBattle, units: TacticalUnit[] = b.units): (TacticalSide | null)[] {
  const live = alive(units);
  return b.objectives.map(objective => {
    const occupant = live.find(u => u.cell === objective);
    if (!occupant) return null;
    const contested = live.some(u => u.side !== occupant.side && cellDistance(b, u.cell, objective) <= 1);
    return contested ? null : occupant.side;
  });
}

/**
 * Share (0–1) of a side's surviving strength in contact with the enemy: within one sector, or within
 * three for artillery. Units far from the fighting contribute less and suffer fewer losses.
 */
export function engagement(b: TacticalBattle, side: TacticalSide, units: TacticalUnit[] = b.units): number {
  const live = alive(units), own = live.filter(u => u.side === side), enemies = live.filter(u => u.side !== side);
  if (!own.length || !enemies.length) return 0;
  let total = 0, engaged = 0;
  for (const u of own) {
    const weight = u.remaining / Math.max(1, u.allocated), reach = u.role === 'artillery' ? 3 : 1;
    total += weight;
    if (enemies.some(e => cellDistance(b, u.cell, e.cell) <= reach)) engaged += weight;
  }
  return total ? engaged / total : 0;
}

// ---------------------------------------------------------------------------------------------
// Battle creation
// ---------------------------------------------------------------------------------------------

/** Attacker deployment; the defender mirrors it through the board centre. */
const DEPLOYMENT: { role: TacticalRole; group: number; groups: number; row: number; column: number }[] = [
  { role: 'infantry', group: 1, groups: 2, row: 2, column: 1 },
  { role: 'infantry', group: 2, groups: 2, row: 5, column: 1 },
  { role: 'armor', group: 1, groups: 2, row: 1, column: 1 },
  { role: 'armor', group: 2, groups: 2, row: 6, column: 1 },
  { role: 'artillery', group: 1, groups: 1, row: 3, column: 0 },
];

function battleSeed(s: GameState, w: WarState): number {
  let hash = 2166136261;
  for (const ch of `${w.id}:${s.day}`) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  return (hash ^ s.simulationSeed) >>> 0;
}

/**
 * Seeded terrain, point-symmetric through the board centre so neither side starts with better ground
 * (audit B5). The two deployment columns on each edge stay open.
 */
export function generateTerrain(seed: number, featureTerrain: BattlefieldTerrain, width = BATTLE_WIDTH, height = BATTLE_HEIGHT): BattlefieldTerrain[] {
  const total = width * height, terrain: BattlefieldTerrain[] = Array(total).fill('plains');
  const feature: BattlefieldTerrain = featureTerrain === 'plains' ? 'forest' : featureTerrain;
  let roll = { seed, value: 0 };
  for (let cell = 0; cell < Math.ceil(total / 2); cell++) {
    roll = nextRandom(roll.seed);
    const column = cell % width;
    if (column <= 1 || column >= width - 2) continue;
    const kind: BattlefieldTerrain = roll.value < 0.2 ? feature : roll.value < 0.28 ? 'forest' : 'plains';
    terrain[cell] = kind;
    terrain[total - 1 - cell] = kind;
  }
  return terrain;
}

export function tacticalStartStatus(s: GameState, id: string): string | null {
  const w = s.wars[id];
  if (!w || w.status !== 'active') return 'This war is no longer active.';
  if (![w.attackerId, w.defenderId].includes(s.playerCountryId)) return 'Only participants can command this battle.';
  if (w.tactical) return 'The tactical battlefield is already active.';
  if (Object.values(s.wars).some(x => x.status === 'active' && x.tactical && [x.attackerId, x.defenderId].some(cid => [w.attackerId, w.defenderId].includes(cid))))
    return 'These forces are already committed to another tactical battle.';
  return null;
}

export function startTacticalBattle(s: GameState, id: string): GameState {
  if (tacticalStartStatus(s, id)) return s;
  const w = s.wars[id], width = BATTLE_WIDTH, height = BATTLE_HEIGHT, total = width * height, units: TacticalUnit[] = [];
  for (const side of SIDES) {
    const m = s.countries[countryId(w, side)].military;
    for (const slot of DEPLOYMENT) {
      const committed = Math.floor(m[roleKey(slot)] * COMMITTED_SHARE), share = Math.floor(committed / slot.groups);
      const allocated = slot.group === slot.groups ? committed - share * (slot.groups - 1) : share;
      const attackerCell = slot.row * width + slot.column;
      if (allocated > 0) units.push({ id: `${side}-${slot.role}-${slot.group}`, side, role: slot.role, cell: side === 'attacker' ? attackerCell : total - 1 - attackerCell, allocated, remaining: allocated });
    }
  }
  const seed = battleSeed(s, w), firstObjective = 2 * width + 4;
  const tactical: TacticalBattle = {
    version: 2, width, height, seed, startedDay: s.day, round: 0,
    terrain: generateTerrain(seed, w.terrain, width, height),
    objectives: [firstObjective, total - 1 - firstObjective],
    initialUnits: structuredClone(units), units, revealed: { attacker: [], defender: [] }, events: [],
  };
  return { ...s, speed: 0, wars: { ...s.wars, [id]: { ...w, autoAssault: false, tactical } }, sitrep: ['WAR // Tactical battlefield opened. Orders resolve once per campaign day.', ...s.sitrep].slice(0, 12) };
}

// ---------------------------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------------------------

export function tacticalFuel(s: GameState, w: WarState, side: TacticalSide, orders: TacticalOrder[]): number {
  const m = s.countries[countryId(w, side)].military;
  const offensive = orders.some(o => OFFENSIVE.includes(o.kind));
  const operational = offensive ? Math.max(3, 2.5 + m.tanks * 0.0016 + m.fighters * 0.02 + m.bombers * 0.032) * COMMITTED_SHARE : 0;
  return operational + orders.reduce((n, o) => n + (ORDER_FUEL[o.kind] ?? 0), 0);
}

export function validateTacticalOrders(s: GameState, id: string, side: TacticalSide, orders: TacticalOrder[]): string[] {
  const w = s.wars[id], b = w?.tactical, reasons: string[] = [];
  if (!w || !b || w.status !== 'active') return ['This war is no longer active.'];
  if (!Array.isArray(orders) || orders.length > 3) return ['Use at most three orders per round.'];
  if (orders.some(o => !o || typeof o !== 'object' || !Object.hasOwn(ORDER_COST, o.kind))) return ['Choose a valid tactical order.'];
  if (orders.reduce((n, o) => n + (ORDER_COST[o.kind] ?? 99), 0) > COMMAND_BUDGET) reasons.push('The command budget is three points per round.');
  const ids = new Set<string>(), destinations = new Set<number>(), visible = visibleCells(b, side);
  const occupied = (cell: number) => b.units.some(x => x.remaining > 0 && x.cell === cell);
  for (const order of orders) {
    const u = b.units.find(x => x.id === order.unitId && x.side === side && x.remaining > 0);
    if (!u) { reasons.push('Choose a surviving unit under your command.'); continue; }
    if (ids.has(u.id)) reasons.push('Each unit can receive only one order per round.');
    ids.add(u.id);
    if (!TARGETED.includes(order.kind)) { if (order.target !== undefined) reasons.push('This order does not need a target.'); continue; }
    const target = order.target;
    if (!isBattleCell(b, target)) { reasons.push('Choose a sector on the battlefield.'); continue; }
    const distance = cellDistance(b, u.cell, target);
    if (order.kind === 'recon') { if (distance > 3) reasons.push('Recon targets must be within three sectors.'); continue; }
    if (!visible.has(target)) { reasons.push('Recon is required before ordering into an unseen sector.'); continue; }
    if (order.kind === 'bombard') {
      if (u.role !== 'artillery' || distance > 3 || !b.units.some(x => x.side !== side && x.remaining > 0 && x.cell === target))
        reasons.push('Artillery can bombard a visible enemy within three sectors.');
      continue;
    }
    const range = order.kind === 'flank' || u.role === 'armor' ? 2 : 1;
    if (distance < 1 || distance > range) reasons.push('The selected sector is outside this unit’s movement range.');
    const forward = side === 'attacker' ? cellColumn(b, target) > cellColumn(b, u.cell) : cellColumn(b, target) < cellColumn(b, u.cell);
    if (order.kind === 'flank' && !forward) reasons.push('Flanking must advance toward the opposing front.');
    if (distance === 2) {
      const route = allCells(b).some(c => cellDistance(b, c, u.cell) === 1 && cellDistance(b, c, target) === 1 && !occupied(c) && (u.role !== 'armor' || b.terrain[c] !== 'mountain'));
      if (!route) reasons.push('The movement path is blocked. Choose another route.');
    }
    if (occupied(target) || destinations.has(target)) reasons.push('Choose an unoccupied destination sector.');
    destinations.add(target);
    if (distance === 2 && b.terrain[target] === 'mountain' && u.role === 'armor') reasons.push('Armor cannot cross two sectors into mountain terrain.');
  }
  if (tacticalFuel(s, w, side, orders) > s.countries[countryId(w, side)].processedResources.fuel)
    reasons.push('Not enough fuel for these orders. Defend, hold reserves or secure fuel imports.');
  return [...new Set(reasons)];
}

/** AI orders: same validator, budget, vision and fuel as the player. Units on an objective hold it. */
export function chooseTacticalOrders(s: GameState, id: string, side: TacticalSide): TacticalOrder[] {
  const b = s.wars[id].tactical!, orders: TacticalOrder[] = [], visible = visibleCells(b, side);
  const enemies = alive(b.units).filter(u => u.side !== side && visible.has(u.cell));
  const holders = objectiveHolders(b);
  const open = b.objectives.filter((_, i) => holders[i] !== side);
  const goals = open.length ? open : b.objectives;
  for (const u of alive(b.units).filter(x => x.side === side)) {
    const candidates: TacticalOrder[] = [];
    if (u.role === 'artillery')
      for (const enemy of [...enemies].sort((x, y) => cellDistance(b, u.cell, x.cell) - cellDistance(b, u.cell, y.cell)))
        candidates.push({ unitId: u.id, kind: 'bombard', target: enemy.cell });
    if (!b.objectives.includes(u.cell)) {
      const goal = [...goals].sort((x, y) => cellDistance(b, u.cell, x) - cellDistance(b, u.cell, y) || x - y)[0];
      const steps = allCells(b)
        .filter(c => cellDistance(b, u.cell, c) <= 2 && cellDistance(b, c, goal) < cellDistance(b, u.cell, goal))
        .sort((x, y) => cellDistance(b, x, goal) - cellDistance(b, y, goal) || x - y);
      for (const target of steps) {
        if (u.role === 'armor') candidates.push({ unitId: u.id, kind: 'flank', target });
        candidates.push({ unitId: u.id, kind: 'move', target });
      }
    }
    candidates.push({ unitId: u.id, kind: 'defend' });
    const chosen = candidates.find(o => validateTacticalOrders(s, id, side, [...orders, o]).length === 0);
    if (chosen) orders.push(chosen);
  }
  return orders;
}

// ---------------------------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------------------------

// Exported for regression tests.
export function sideModifiers(s: GameState, w: WarState, side: TacticalSide, orders: TacticalOrder[], enemyOrders: TacticalOrder[]): CombatSideOrders {
  const b = w.tactical!, m = s.countries[countryId(w, side)].military, forces = emptyLosses();
  const own = b.units.filter(u => u.side === side);
  for (const u of own) forces[roleKey(u)] += u.remaining;
  for (const key of ['personnel', 'tanks', 'artillery'] as const) forces[key] = Math.min(m[key], forces[key]);
  for (const key of ['fighters', 'bombers', 'warships'] as const) forces[key] = Math.floor(m[key] * COMMITTED_SHARE);
  const count = (kind: TacticalOrderKind) => orders.filter(o => o.kind === kind).length;
  // Only bombardments that land on a unit (after simultaneous movement) penalise this side.
  const hits = enemyOrders.filter(o => o.kind === 'bombard').map(o => alive(b.units).find(u => u.side === side && u.cell === o.target)).filter((u): u is TacticalUnit => !!u);
  const bombarded = hits.length;
  const lossByType: Partial<Record<keyof CasualtySnapshot, number>> = {};
  for (const target of hits) lossByType[roleKey(target)] = 0.12;
  const covered = orders.filter(o => o.kind === 'defend').filter(o => b.terrain[b.units.find(u => u.id === o.unitId)!.cell] !== 'plains').length;
  const prepared = orders.filter(o => OFFENSIVE.includes(o.kind) && b.units.find(u => u.id === o.unitId)?.prepared).length;
  const held = objectiveHolders(b).filter(h => h === side).length;
  const surviving = own.reduce((n, u) => n + u.remaining / Math.max(1, u.allocated), 0) / Math.max(1, own.length);
  const contact = engagement(b, side);
  const tempo = clamp(0.85 + surviving * 0.1 + prepared * 0.04 + count('flank') * 0.08 + count('bombard') * 0.06 + count('recon') * 0.02 + covered * 0.025 + held * 0.06 - count('reserve') * 0.025 - bombarded * 0.04, 0.75, 1.25);
  return {
    power: (0.05 + surviving * 0.95) * tempo * (0.8 + 0.2 * contact),
    loss: clamp((1 - count('defend') * 0.06 - count('reserve') * 0.07 + count('flank') * 0.08 + bombarded * 0.06) * (0.85 + 0.15 * contact), 0.75, 1.25),
    lossByType,
    fuel: orders.some(o => OFFENSIVE.includes(o.kind)) ? COMMITTED_SHARE : 0,
    forces,
  };
}

/** Shared gate for every player combat order (tactical or legacy assault). */
export function combatAllowed(s: GameState): boolean {
  return !(s.campaignStatus !== 'active' || s.activeEvent || s.activeAdvisor || s.world.living?.advice.active || s.world.living?.notice || pendingVictory(s));
}

export function tacticalCommandStatus(s: GameState, id: string, expectedRound: number, orders: TacticalOrder[]): string[] {
  const w = s.wars[id];
  if (!w?.tactical) return ['Open the tactical battlefield first.'];
  if (![w.attackerId, w.defenderId].includes(s.playerCountryId)) return ['Only participants can command this battle.'];
  if (!combatAllowed(s)) return ['Resolve the pending campaign decision before giving combat orders.'];
  if (w.tactical.round !== expectedRound) return ['These orders belong to an earlier round. Review the current battlefield.'];
  if (w.lastCombatDay === s.day) return ['Orders already executed today. Advance one campaign day for the next round.'];
  return validateTacticalOrders(s, id, playerSide(s, w), orders);
}

/** Groups of one role never hold more than the national army has left (losses elsewhere may shrink it). */
function capToNationalForces(s: GameState, w: WarState, units: TacticalUnit[]): TacticalUnit[] {
  const result = units.map(u => ({ ...u }));
  for (const side of SIDES) for (const role of ['infantry', 'armor', 'artillery'] as const) {
    const group = result.filter(u => u.side === side && u.role === role);
    const total = group.reduce((n, u) => n + u.remaining, 0), cap = s.countries[countryId(w, side)].military[roleKey({ role })];
    if (total > cap) for (const u of group) u.remaining = Math.floor(u.remaining * cap / Math.max(1, total));
  }
  return result;
}

/**
 * Splits a side's campaign losses of each role across its groups. Groups in contact take a double share
 * and bombarded groups half again; integer remainders go to the heaviest-weighted groups.
 */
export function distributeLosses(b: TacticalBattle, units: TacticalUnit[], side: TacticalSide, losses: CasualtySnapshot, bombarded: Set<number>): Map<string, number> {
  const taken = new Map<string, number>(), live = alive(units), enemies = live.filter(u => u.side !== side);
  for (const role of ['infantry', 'armor', 'artillery'] as const) {
    const group = live.filter(u => u.side === side && u.role === role);
    let left = Math.min(losses[roleKey({ role })], group.reduce((n, u) => n + u.remaining, 0));
    if (!left) continue;
    const weight = (u: TacticalUnit) => u.remaining * (enemies.some(e => cellDistance(b, u.cell, e.cell) <= (u.role === 'artillery' ? 3 : 1)) ? 2 : 1) * (bombarded.has(u.cell) ? 1.5 : 1);
    const totalWeight = group.reduce((n, u) => n + weight(u), 0);
    for (const u of group) {
      const share = Math.min(u.remaining, Math.floor(left * weight(u) / totalWeight));
      taken.set(u.id, share);
    }
    left -= group.reduce((n, u) => n + (taken.get(u.id) ?? 0), 0);
    for (const u of [...group].sort((x, y) => weight(y) - weight(x) || x.id.localeCompare(y.id))) {
      if (!left) break;
      const extra = Math.min(left, u.remaining - (taken.get(u.id) ?? 0));
      taken.set(u.id, (taken.get(u.id) ?? 0) + extra);
      left -= extra;
    }
  }
  return taken;
}

export function resolveTacticalRound(s: GameState, id: string, orders: TacticalOrder[], expectedRound: number): GameState {
  if (tacticalCommandStatus(s, id, expectedRound, orders).length) return s;
  const w = s.wars[id], b = w.tactical!, mine = playerSide(s, w), enemy = other(mine), enemyOrders = chooseTacticalOrders(s, id, enemy);
  const bySide: Record<TacticalSide, TacticalOrder[]> = { attacker: mine === 'attacker' ? orders : enemyOrders, defender: mine === 'defender' ? orders : enemyOrders };
  const costs = { attacker: tacticalFuel(s, w, 'attacker', bySide.attacker), defender: tacticalFuel(s, w, 'defender', bySide.defender) };
  const all = [...bySide.attacker, ...bySide.defender];

  // Moves are simultaneous. Conflicting destinations leave both units in place.
  const moves = new Set(all.filter(o => isMove(o) && all.filter(x => isMove(x) && x.target === o.target).length === 1).map(o => o.unitId));
  const units = capToNationalForces(s, w, b.units.map(u => {
    const o = all.find(x => x.unitId === u.id);
    return { ...u, cell: o && moves.has(u.id) ? o.target! : u.cell };
  }));

  const actions: TacticalAction[] = [];
  for (const side of SIDES) for (const o of bySide[side]) {
    const from = b.units.find(u => u.id === o.unitId)!.cell;
    if (isMove(o)) actions.push({ kind: moves.has(o.unitId) ? 'move' : 'blocked', side, unitId: o.unitId, from, to: o.target });
    else if (o.kind === 'bombard') actions.push({ kind: 'bombard', side, unitId: o.unitId, target: o.target, hit: alive(units).some(u => u.side !== side && u.cell === o.target) });
    else if (o.kind === 'recon') actions.push({ kind: 'recon', side, unitId: o.unitId, target: o.target });
    else if (o.kind === 'defend' || o.kind === 'reserve') actions.push({ kind: o.kind, side, unitId: o.unitId });
  }

  const stagedWar = { ...w, tactical: { ...b, units } };
  const modifiers = {
    attacking: bySide.attacker.some(o => OFFENSIVE.includes(o.kind)),
    attacker: sideModifiers(s, stagedWar, 'attacker', bySide.attacker, bySide.defender),
    defender: sideModifiers(s, stagedWar, 'defender', bySide.defender, bySide.attacker),
  };
  let next = resolveCombatRound({ ...s, wars: { ...s.wars, [id]: stagedWar } }, id, modifiers);
  if (next.wars[id].rounds === w.rounds) return s;
  const nw = next.wars[id];
  const difference = (side: TacticalSide): CasualtySnapshot => {
    const total = side === 'attacker' ? nw.attackerLosses : nw.defenderLosses, previous = side === 'attacker' ? w.attackerLosses : w.defenderLosses;
    return Object.fromEntries(Object.entries(total).map(([key, n]) => [key, n - previous[key as keyof CasualtySnapshot]])) as unknown as CasualtySnapshot;
  };
  const losses = { attacker: difference('attacker'), defender: difference('defender') };

  const taken = new Map<string, number>();
  for (const side of SIDES) {
    const bombarded = new Set(bySide[other(side)].filter(o => o.kind === 'bombard').map(o => o.target!));
    for (const [unitId, amount] of distributeLosses(b, units, side, losses[side], bombarded)) taken.set(unitId, amount);
  }
  const after = units.map(u => ({ ...u, prepared: bySide[u.side].some(o => o.unitId === u.id && o.kind === 'reserve'), remaining: Math.max(0, u.remaining - (taken.get(u.id) ?? 0)) }));
  for (const u of after) {
    const amount = taken.get(u.id) ?? 0, before = units.find(x => x.id === u.id)!;
    if (amount > 0) actions.push({ kind: 'casualties', side: u.side, unitId: u.id, amount });
    if (before.remaining > 0 && u.remaining === 0) actions.push({ kind: 'lost', side: u.side, unitId: u.id });
  }

  const previousHolders = b.events.at(-1)?.objectives ?? objectiveHolders(b);
  const holders = objectiveHolders(b, after);
  holders.forEach((holder, i) => {
    if (holder === previousHolders[i]) return;
    if (holder) actions.push({ kind: 'capture', side: holder, objective: b.objectives[i] });
    else if (previousHolders[i]) actions.push({ kind: 'contest', side: previousHolders[i]!, objective: b.objectives[i] });
  });

  const revealed: Record<TacticalSide, number[]> = { attacker: [], defender: [] };
  for (const side of SIDES) {
    const seen = new Set<number>();
    for (const order of bySide[side].filter(o => o.kind === 'recon')) for (const cell of allCells(b)) if (cellDistance(b, cell, order.target!) <= 2) seen.add(cell);
    revealed[side] = [...seen];
    const c = next.countries[countryId(w, side)];
    // The shared resolver already charged the attacker's base operational fuel.
    const extra = side === 'attacker' ? bySide.attacker.reduce((n, o) => n + ORDER_FUEL[o.kind], 0) : costs.defender;
    next = { ...next, countries: { ...next.countries, [c.id]: { ...c, processedResources: { ...c.processedResources, fuel: Math.max(0, c.processedResources.fuel - extra) } } } };
  }

  const event = {
    round: b.round + 1, day: s.day, playerSide: mine, orders: structuredClone(orders), enemyOrders,
    attackerLosses: losses.attacker, defenderLosses: losses.defender, attackerFuel: costs.attacker, defenderFuel: costs.defender,
    progressBefore: w.progress, progressAfter: nw.progress, units: after, beforeUnits: structuredClone(b.units), objectives: holders, revealed, actions,
  };
  return { ...next, wars: { ...next.wars, [id]: { ...nw, tactical: { ...b, round: b.round + 1, units: after, revealed, events: [...b.events, event].slice(-60) } } } };
}

export function processAutoTacticalWars(s: GameState): GameState {
  let next = s;
  for (const w of Object.values(s.wars))
    if (w.status === 'active' && w.tactical && w.autoAssault && [w.attackerId, w.defenderId].includes(s.playerCountryId))
      next = resolveTacticalRound(next, w.id, chooseTacticalOrders(next, w.id, playerSide(next, w)), next.wars[w.id].tactical!.round);
  return next;
}

// ---------------------------------------------------------------------------------------------
// Save migration (schema 16 → 17)
// ---------------------------------------------------------------------------------------------

interface LegacyTacticalBattle {
  version: 1; size: 6; startedDay: number; round: number; terrain: BattlefieldTerrain[]; objectiveCell: number;
  initialUnits: TacticalUnit[]; units: TacticalUnit[]; revealed: Record<TacticalSide, number[]>;
  events: (Omit<TacticalBattle['events'][number], 'objectives' | 'actions'> & { objective: TacticalSide | null })[];
}

/** Converts a 0.83/0.84 battle to v2 without changing its board, units or recorded rounds. */
export function migrateTacticalBattle(battle: TacticalBattle | LegacyTacticalBattle): TacticalBattle {
  if (battle.version === 2) return battle;
  const { size, objectiveCell, events, ...rest } = battle;
  return {
    ...rest, version: 2, width: size, height: size, seed: 0, objectives: [objectiveCell],
    events: events.map(({ objective, ...event }) => ({ ...event, objectives: [objective ?? null], actions: [] })),
  };
}

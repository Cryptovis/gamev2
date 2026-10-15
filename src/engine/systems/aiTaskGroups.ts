import { log as detLog } from '../detMath';
import type { GameState, WarState } from '../../domain/game';
import type { TaskAsset, TaskGroup, TaskMission, TaskSide } from '../../domain/taskGroups';
import { TASK_ASSETS, TASK_MISSIONS } from '../../domain/taskGroups';
import { warCombatView } from './warfare';
import { calculateSupplyNetwork } from './supplyNetwork';
import {
  AI_TASK_REVIEW_DAYS, DEFAULT_SHARE, assignTaskGroup, assignedTotal, defaultTaskGroups, hasTaskGroups, missionEffects, missionGroups,
  missionReach, nationalStock, otherSide, sideCountryId,
} from './taskGroups';

/**
 * Phase 4: AI governments review their task groups with the player's rules: the same preview, validator, preparation
 * days and assignment function. A side sees only what the player would see: its own forces, the enemy's national
 * force counts (public), and the effects it suffers (its own supply cut). The enemy's assignment is not known, so each
 * candidate is scored against the enemy's default assignment, plus a blockade when this side's supply shows one.
 * Work is bounded: at most `PLANS.length` candidate evaluations per side per review, every `AI_TASK_REVIEW_DAYS` days.
 */

type Plan = { name: string; set: [TaskMission, TaskAsset, number][] };
/** A switch must project at least this much better (log power ratio, about 5%) to be worth the preparation days. */
export const AI_SWITCH_MARGIN = 0.05;

const share = (stock: number) => Math.ceil(stock * DEFAULT_SHARE);

/** Candidate assignments, as absolute strengths per mission (missions not listed are set to 0). */
export function candidatePlans(state: GameState, w: WarState, side: TaskSide): Plan[] {
  const c = state.countries[sideCountryId(w, side)];
  const f = nationalStock(c, 'fighters'), b = nationalStock(c, 'bombers'), s = nationalStock(c, 'warships');
  const shore = missionReach(state, w, side, 'shoreSupport', 'warships').allowed;
  const naval = (mission: TaskMission): [TaskMission, TaskAsset, number] => [mission, 'warships', share(s)];
  const defaultNaval = naval(shore ? 'shoreSupport' : 'convoyEscort');
  const plans: Plan[] = [
    { name: 'default', set: [['airSuperiority', 'fighters', share(f)], ['closeAirSupport', 'bombers', share(b)], defaultNaval] },
    { name: 'air dominance', set: [['airSuperiority', 'fighters', Math.min(f, 2 * share(f))], ['closeAirSupport', 'bombers', share(b)], defaultNaval] },
    { name: 'ground support', set: [['airSuperiority', 'fighters', share(f)], ['closeAirSupport', 'fighters', Math.min(f - share(f), share(f))], ['closeAirSupport', 'bombers', share(b)], defaultNaval] },
    { name: 'interdiction', set: [['airSuperiority', 'fighters', share(f)], ['interdiction', 'fighters', Math.min(f - share(f), share(f))], ['interdiction', 'bombers', share(b)], defaultNaval] },
  ];
  if (missionReach(state, w, side, 'blockade', 'warships').allowed) plans.push({ name: 'blockade', set: [['airSuperiority', 'fighters', share(f)], ['closeAirSupport', 'bombers', share(b)], naval('blockade')] });
  if (missionReach(state, w, side, 'convoyEscort', 'warships').allowed && shore) plans.push({ name: 'escort', set: [['airSuperiority', 'fighters', share(f)], ['closeAirSupport', 'bombers', share(b)], naval('convoyEscort')] });
  return plans;
}

/** The plan as ready groups of one side, limited to what this side can reach and owns outside its other wars. */
function planGroups(state: GameState, w: WarState, side: TaskSide, plan: Plan): TaskGroup[] {
  const id = sideCountryId(w, side);
  const left: Record<TaskAsset, number> = Object.fromEntries(TASK_ASSETS.map((a) => [a, Math.max(0, nationalStock(state.countries[id], a) - assignedTotal(state, id, a, w.id))])) as Record<TaskAsset, number>;
  const groups: TaskGroup[] = [];
  for (const [mission, asset, count] of plan.set) {
    const n = Math.max(0, Math.min(count, left[asset]));
    if (!n || !missionReach(state, w, side, mission, asset).allowed) continue;
    left[asset] -= n;
    groups.push({ id: `plan-${side}-${mission}-${asset}`, side, mission, asset, count: n, readyDay: state.day, baseId: id });
  }
  return groups;
}

/** Projected log power ratio from `side`'s perspective against the assumed enemy assignment. */
function score(state: GameState, w: WarState, side: TaskSide, own: TaskGroup[], enemy: TaskGroup[]): number {
  const war = { ...w, taskGroups: [...own, ...enemy] };
  const ratio = warCombatView({ ...state, wars: { ...state.wars, [w.id]: war } }, war).p.powerRatio;
  const log = detLog(Math.max(1e-6, ratio));
  return side === 'attacker' ? log : -log;
}

/** What this side may assume about the enemy: its default assignment, with a blockade if this side's supply shows one. */
function assumedEnemy(state: GameState, w: WarState, side: TaskSide): TaskGroup[] {
  const enemySide = otherSide(side), enemy = defaultTaskGroups(state, w).filter((g) => g.side === enemySide);
  const suffered = hasTaskGroups(w) ? missionEffects(state, w)[enemySide].blockade : 0;
  if (suffered <= 0) return enemy;
  const ships = nationalStock(state.countries[sideCountryId(w, enemySide)], 'warships');
  return [...enemy.filter((g) => g.asset !== 'warships'), { id: 'assumed-blockade', side: enemySide, mission: 'blockade', asset: 'warships', count: share(ships), readyDay: state.day, baseId: sideCountryId(w, enemySide) }];
}

/** Current strengths of a side, in the same order as the plan entries. */
const strength = (w: WarState, side: TaskSide, mission: TaskMission, asset: TaskAsset) => missionGroups(w, side, mission, asset).reduce((n, g) => n + g.count, 0);

export interface AiTaskDecision { plan: string; improvement: number }

/** Reviews one AI side of one war. Returns the state unchanged when keeping the current assignment. */
export function reviewTaskGroups(state: GameState, warId: string, side: TaskSide): { state: GameState; decision: AiTaskDecision | null } {
  const w = state.wars[warId];
  if (!hasTaskGroups(w) || w.status !== 'active') return { state, decision: null };
  const id = sideCountryId(w, side), country = state.countries[id];
  if (!country) return { state, decision: null };
  const enemy = assumedEnemy(state, w, side);
  const current = score(state, w, side, w.taskGroups.filter((g) => g.side === side).map((g) => ({ ...g, readyDay: Math.min(g.readyDay, state.day) })), enemy);
  // Short of fuel (under 14 operational days), a government will not add aircraft sorties.
  const lowFuel = calculateSupplyNetwork(country).fuelDays < 14;
  let best: { plan: Plan; value: number } | null = null;
  for (const plan of candidatePlans(state, w, side)) {
    const groups = planGroups(state, w, side, plan);
    const aircraft = groups.filter((g) => g.asset !== 'warships').reduce((n, g) => n + g.count, 0);
    const now = w.taskGroups.filter((g) => g.side === side && g.asset !== 'warships').reduce((n, g) => n + g.count, 0);
    if (lowFuel && aircraft > now) continue;
    const value = score(state, w, side, groups, enemy);
    if (!best || value > best.value) best = { plan, value };
  }
  const reviewed = { ...state, wars: { ...state.wars, [warId]: { ...w, taskReviewDay: { ...w.taskReviewDay, [side]: state.day } } } };
  if (!best || best.value < current + AI_SWITCH_MARGIN) return { state: reviewed, decision: null };
  // Apply through the shared validator: decreases first so freed forces can be reassigned, then increases.
  const target = new Map<string, number>();
  for (const g of planGroups(state, w, side, best.plan)) target.set(`${g.mission}|${g.asset}`, (target.get(`${g.mission}|${g.asset}`) ?? 0) + g.count);
  const changes: [TaskMission, TaskAsset, number][] = [];
  for (const mission of TASK_MISSIONS) for (const asset of TASK_ASSETS) {
    const want = target.get(`${mission}|${asset}`) ?? 0, have = strength(w, side, mission, asset);
    if (want !== have) changes.push([mission, asset, want]);
  }
  let next = reviewed;
  for (const [mission, asset, want] of changes.sort((x, y) => (x[2] - strength(w, side, x[0], x[1])) - (y[2] - strength(w, side, y[0], y[1])))) next = assignTaskGroup(next, warId, id, mission, asset, want);
  return { state: next, decision: { plan: best.plan.name, improvement: best.value - current } };
}

/** Daily: AI sides of wars with task groups review them every `AI_TASK_REVIEW_DAYS` days. The player's side is never changed. */
export function processAiTaskGroups(state: GameState): GameState {
  let next = state;
  for (const w of Object.values(state.wars).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (w.status !== 'active' || !hasTaskGroups(w)) continue;
    for (const side of ['attacker', 'defender'] as const) {
      if (sideCountryId(w, side) === state.playerCountryId) continue;
      const last = next.wars[w.id].taskReviewDay?.[side] ?? w.startedDay;
      if (next.day - last < AI_TASK_REVIEW_DAYS) continue;
      next = reviewTaskGroups(next, w.id, side).state;
    }
  }
  return next;
}

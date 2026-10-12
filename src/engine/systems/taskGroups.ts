import type { CountryState, GameState, WarState } from '../../domain/game';
import { MISSION_ASSETS, TASK_ASSETS, TASK_MISSIONS, type TaskAsset, type TaskGroup, type TaskMission, type TaskSide } from '../../domain/taskGroups';
import { CAPITAL_POSITIONS } from '../../data/capitalPositions';
import { countryPosition, pointDistanceKm } from './flights';
import { pilotCoverage } from './governance';
import { relationFor } from './diplomacy';

/**
 * Phase 4: air and naval task groups (0.90.0-playtest.13).
 *
 * Each side of a war assigns whole aircraft and warships to missions. Only assigned, ready forces fight in that war:
 * they set its air superiority, its air and naval share of combat power, the losses they can suffer and the fuel
 * they burn. One aircraft or ship serves one war and one mission at a time; the total assigned by a country across
 * its active wars never exceeds its national stock (`clampTaskGroups`).
 *
 * The default assignment of a new war equals the earlier fixed rule (a quarter of each force: fighters on air
 * superiority, bombers on close air support, warships on shore support), so balance is unchanged until a
 * government reassigns. Wars saved without task groups keep that fixed rule exactly (`hasTaskGroups`).
 *
 * The player and the AI use the same preview and validator (`taskGroupPreview`) and the same assignment function.
 */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Share of each force the earlier fixed rule committed to a battle; the default assignment reproduces it. */
export const DEFAULT_SHARE = 0.25;
/** Combat radius from a base to the front. Bombers are long-range strike aircraft. */
export const AIR_RADIUS_KM: Record<'fighters' | 'bombers', number> = { fighters: 2500, bombers: 6000 };
/** Close air support at full commitment (a default share of fighters on it) adds this much combat power. */
export const CAS_MAX = 0.12;
/** Interdiction cuts the enemy's front supply by at most this share; a naval blockade by at most this share. */
export const INTERDICTION_MAX = 0.15;
export const BLOCKADE_MAX = 0.12;
/** Escorts (against a blockade) and air-superiority fighters (against interdiction) cancel at most half the effect. */
export const COUNTER_MAX = 0.5;
/** Strike value of a bomber relative to a fighter on interdiction. */
const BOMBER_STRIKE = 2;
/** Air-superiority weight of aircraft busy on ground missions (bombers keep the earlier 0.45 weight). */
const GROUND_MISSION_COVER = 0.5, BOMBER_COVER = 0.45;
/** Fuel per assigned aircraft in a full offensive round (the earlier per-aircraft coefficients). */
export const AIRCRAFT_ROUND_FUEL: Record<'fighters' | 'bombers', number> = { fighters: 0.02, bombers: 0.032 };
/** AI governments review task groups at most this often. */
export const AI_TASK_REVIEW_DAYS = 14;

export const isAir = (asset: TaskAsset) => asset !== 'warships';
export const isNavalMission = (mission: TaskMission) => mission === 'convoyEscort' || mission === 'blockade' || mission === 'shoreSupport';
export const hasTaskGroups = (w: WarState | undefined): w is WarState & { taskGroups: TaskGroup[] } => !!w && Array.isArray(w.taskGroups);
export const sideCountryId = (w: WarState, side: TaskSide) => side === 'attacker' ? w.attackerId : w.defenderId;
export const otherSide = (side: TaskSide): TaskSide => side === 'attacker' ? 'defender' : 'attacker';
export function sideOf(w: WarState, countryId: string): TaskSide | null {
  return w.attackerId === countryId ? 'attacker' : w.defenderId === countryId ? 'defender' : null;
}
export const nationalStock = (c: CountryState | undefined, asset: TaskAsset) => Math.max(0, Math.floor(c?.military[asset] ?? 0));
const hasCoast = (state: GameState, id: string) => (state.infrastructure[id]?.ports ?? 0) > 0;

// ---------------------------------------------------------------------------------------------
// Geography: bases and the front
// ---------------------------------------------------------------------------------------------

/** Where a base country operates from: its capital; without one, the country's map position. Deterministic. */
export function basePosition(id: string): [number, number] | null {
  return CAPITAL_POSITIONS[id] ?? countryPosition(id);
}
/** The front lies in the defender's territory: its map position, or its capital when it has none. */
export function frontPosition(w: WarState): [number, number] | null {
  return countryPosition(w.defenderId) ?? CAPITAL_POSITIONS[w.defenderId] ?? null;
}
/** Countries a side may operate from: its own territory, countries it controls, and independent allies. */
export function basesFor(state: GameState, countryId: string): string[] {
  const own = state.countries[countryId];
  if (!own) return [];
  const extra = Object.values(state.countries)
    .filter((c) => c.id !== countryId && !c.annexedBy && (c.controllerCountryId === countryId || (!c.controllerCountryId && relationFor(own, c.id).treaties.includes('alliance') && relationFor(own, c.id).status !== 'war')))
    .map((c) => c.id).sort();
  return [countryId, ...extra];
}
export interface BaseChoice { baseId: string; km: number }
/** Nearest base to the front; ties keep the earlier base (own territory first). */
export function nearestBase(state: GameState, w: WarState, countryId: string): BaseChoice {
  const front = frontPosition(w);
  let best: BaseChoice = { baseId: countryId, km: pointDistanceKm(basePosition(countryId), front) };
  for (const id of basesFor(state, countryId).slice(1)) {
    const km = pointDistanceKm(basePosition(id), front);
    if (km < best.km) best = { baseId: id, km };
  }
  return best;
}
/** Preparation before a new group is on station: 1–3 days by distance (ships move slower but range further). */
export function preparationDays(asset: TaskAsset, km: number): number {
  return Math.min(3, 1 + Math.floor(km / (isAir(asset) ? 1000 : 4000)));
}

export type ReachBlock = 'range' | 'noPort' | 'enemyCoast' | 'frontCoast';
export interface Reach { allowed: boolean; block?: ReachBlock; reason?: string; baseId: string; km: number; prepDays: number }
/** Whether a side can fly or sail this mission at all, from where, and how long it takes to get there. */
export function missionReach(state: GameState, w: WarState, side: TaskSide, mission: TaskMission, asset: TaskAsset): Reach {
  const id = sideCountryId(w, side), enemy = sideCountryId(w, otherSide(side));
  if (isAir(asset)) {
    const base = nearestBase(state, w, id), radius = AIR_RADIUS_KM[asset as 'fighters' | 'bombers'];
    if (base.km > radius) return { allowed: false, block: 'range', reason: 'No air base within range of the front.', ...base, prepDays: preparationDays(asset, base.km) };
    return { allowed: true, ...base, prepDays: preparationDays(asset, base.km) };
  }
  const km = pointDistanceKm(basePosition(id), mission === 'blockade' ? basePosition(enemy) : frontPosition(w));
  const reach = { baseId: id, km, prepDays: preparationDays(asset, km) };
  if (!hasCoast(state, id)) return { allowed: false, block: 'noPort', reason: 'Your country has no port for warships.', ...reach };
  if (mission === 'blockade' && !hasCoast(state, enemy)) return { allowed: false, block: 'enemyCoast', reason: 'The enemy has no coast to blockade.', ...reach };
  if (mission === 'shoreSupport' && !hasCoast(state, w.defenderId)) return { allowed: false, block: 'frontCoast', reason: 'The front has no coast for naval gunfire.', ...reach };
  return { allowed: true, ...reach };
}

// ---------------------------------------------------------------------------------------------
// Allocation bookkeeping
// ---------------------------------------------------------------------------------------------

const activeWarsOf = (state: GameState, countryId: string) => Object.values(state.wars).filter((w) => w.status === 'active' && hasTaskGroups(w) && sideOf(w, countryId));
const groupsFor = (w: WarState, side: TaskSide) => (w.taskGroups ?? []).filter((g) => g.side === side);
const sum = (groups: readonly TaskGroup[]) => groups.reduce((n, g) => n + g.count, 0);

/** Aircraft or ships of `asset` this country has assigned in active wars, optionally leaving out one war. */
export function assignedTotal(state: GameState, countryId: string, asset: TaskAsset, exceptWarId?: string): number {
  let total = 0;
  for (const w of activeWarsOf(state, countryId)) if (w.id !== exceptWarId) total += sum(groupsFor(w, sideOf(w, countryId)!).filter((g) => g.asset === asset));
  return total;
}
/** Groups of one side's mission and asset in a war. */
export const missionGroups = (w: WarState, side: TaskSide, mission: TaskMission, asset: TaskAsset) => groupsFor(w, side).filter((g) => g.mission === mission && g.asset === asset);

/** Ready counts per mission and asset (preparing groups excluded), capped at the national stock. */
export type MissionCounts = Record<TaskMission, Record<TaskAsset, number>>;
const zeroCounts = (): MissionCounts => Object.fromEntries(TASK_MISSIONS.map((m) => [m, { fighters: 0, bombers: 0, warships: 0 }])) as MissionCounts;
export function readyCounts(state: GameState, w: WarState, side: TaskSide): MissionCounts {
  const counts = zeroCounts(), c = state.countries[sideCountryId(w, side)];
  for (const g of groupsFor(w, side)) if (g.readyDay <= state.day) counts[g.mission][g.asset] += g.count;
  // Defensive read-time cap (clampTaskGroups keeps saved groups within stock): never more than the country owns.
  for (const asset of TASK_ASSETS) {
    const total = TASK_MISSIONS.reduce((n, m) => n + counts[m][asset], 0), stock = nationalStock(c, asset);
    if (total > stock) {
      let excess = total - stock;
      for (const m of [...TASK_MISSIONS].reverse()) { const cut = Math.min(excess, counts[m][asset]); counts[m][asset] -= cut; excess -= cut; }
    }
  }
  return counts;
}
const assetTotal = (counts: MissionCounts, asset: TaskAsset) => TASK_MISSIONS.reduce((n, m) => n + counts[m][asset], 0);

/** Removes `amount` of `asset` from groups, preparing groups first, then the most recently formed. */
function removeFrom(groups: TaskGroup[], asset: TaskAsset, amount: number, day: number, predicate: (g: TaskGroup) => boolean = () => true): TaskGroup[] {
  let left = Math.max(0, Math.floor(amount));
  const order = groups.map((g, i) => ({ g, i })).filter(({ g }) => g.asset === asset && predicate(g))
    .sort((x, y) => Number(y.g.readyDay > day) - Number(x.g.readyDay > day) || y.i - x.i);
  const cut = new Map<number, number>();
  for (const { g, i } of order) { if (!left) break; const take = Math.min(left, g.count); cut.set(i, take); left -= take; }
  return groups.map((g, i) => cut.has(i) ? { ...g, count: g.count - cut.get(i)! } : g).filter((g) => g.count > 0);
}

/**
 * Keeps every country's assigned forces within its national stock (losses, scrapping or any other cause).
 * Excess comes out of the newest wars first, preparing groups first. Returns the same state when nothing changes.
 */
export function clampTaskGroups(state: GameState): GameState {
  let wars = state.wars, changed = false;
  const ids = new Set<string>();
  for (const w of Object.values(state.wars)) if (w.status === 'active' && hasTaskGroups(w) && w.taskGroups.length) { ids.add(w.attackerId); ids.add(w.defenderId); }
  for (const countryId of [...ids].sort()) for (const asset of TASK_ASSETS) {
    const stock = nationalStock(state.countries[countryId], asset);
    let excess = assignedTotal({ ...state, wars }, countryId, asset) - stock;
    if (excess <= 0) continue;
    const list = activeWarsOf({ ...state, wars }, countryId).sort((a, b) => b.startedDay - a.startedDay || (a.id < b.id ? 1 : -1));
    for (const w of list) {
      if (excess <= 0) break;
      const side = sideOf(w, countryId)!, mine = sum(groupsFor(w, side).filter((g) => g.asset === asset)), cut = Math.min(excess, mine);
      if (!cut) continue;
      wars = { ...wars, [w.id]: { ...w, taskGroups: removeFrom(w.taskGroups!, asset, cut, state.day, (g) => g.side === side) } };
      excess -= cut; changed = true;
    }
  }
  return changed ? { ...state, wars } : state;
}

/** Combat losses come out of the war's own ready groups (they were the forces exposed). */
export function applyTaskGroupLosses(state: GameState, warId: string, side: TaskSide, losses: Partial<Record<TaskAsset, number>>): GameState {
  const w = state.wars[warId];
  if (!hasTaskGroups(w)) return state;
  let groups = w.taskGroups;
  for (const asset of TASK_ASSETS) if ((losses[asset] ?? 0) > 0) groups = removeFrom(groups, asset, losses[asset]!, state.day, (g) => g.side === side && g.readyDay <= state.day);
  return groups === w.taskGroups ? state : { ...state, wars: { ...state.wars, [warId]: { ...w, taskGroups: groups } } };
}

// ---------------------------------------------------------------------------------------------
// Default assignment (new wars)
// ---------------------------------------------------------------------------------------------

/** The earlier fixed rule as task groups, ready at once (forces at their stations when war begins). */
export function defaultTaskGroups(state: GameState, w: WarState): TaskGroup[] {
  const groups: TaskGroup[] = [];
  for (const side of ['attacker', 'defender'] as const) {
    const id = sideCountryId(w, side), c = state.countries[id];
    if (!c) continue;
    const plan: [TaskMission, TaskAsset][] = [['airSuperiority', 'fighters'], ['closeAirSupport', 'bombers']];
    const shore = missionReach(state, w, side, 'shoreSupport', 'warships');
    plan.push([shore.allowed ? 'shoreSupport' : 'convoyEscort', 'warships']);
    for (const [mission, asset] of plan) {
      const reach = missionReach(state, w, side, mission, asset);
      if (!reach.allowed) continue;
      const free = nationalStock(c, asset) - assignedTotal(state, id, asset, w.id);
      // Rounded up so the default reaches the full earlier contribution (min(stock, count / share) = stock).
      const count = Math.min(free, Math.ceil(nationalStock(c, asset) * DEFAULT_SHARE));
      if (count > 0) groups.push({ id: `TG-${w.id}-${side}-${mission}-${asset}-0`, side, mission, asset, count, readyDay: state.day, baseId: reach.baseId });
    }
  }
  return groups;
}
/** Gives a war (already in `state.wars`) its default task groups. */
export function withDefaultTaskGroups(state: GameState, warId: string): GameState {
  const w = state.wars[warId];
  if (!w || hasTaskGroups(w)) return state;
  return { ...state, wars: { ...state.wars, [warId]: { ...w, taskGroups: defaultTaskGroups(state, w) } } };
}

// ---------------------------------------------------------------------------------------------
// Effects on combat
// ---------------------------------------------------------------------------------------------

/** Aircraft quality multiplier (technology and readiness), shared with the national air-power formula. */
export function airQuality(c: CountryState): number {
  return 0.35 + c.military.technology / 100 * 0.4 + c.military.readiness / 100 * 0.25;
}

export interface SideMissionEffects {
  /** Ready assigned forces: they bound this war's losses and burn its mission fuel. */
  forces: Record<TaskAsset, number>;
  /** Counts that enter militaryPower in place of the national stock (aircraft already crewed by pilots). */
  power: Record<TaskAsset, number>;
  /** Air-superiority strength (before the other side is compared). */
  airStrength: number;
  /** Close air support power factor (1 = none). */
  cas: number;
  /** Share of the enemy's front supply cut by this side's interdiction and blockade (after enemy counters). */
  interdiction: number;
  blockade: number;
}
export interface MissionEffects {
  attacker: SideMissionEffects;
  defender: SideMissionEffects;
  /** −100…100, attacker's perspective. */
  airSuperiority: number;
  /** Supply multipliers applied to each side's front supply by the enemy's interdiction and blockade. */
  supplyFactor: Record<TaskSide, number>;
}

function sideRaw(state: GameState, w: WarState, side: TaskSide) {
  const c = state.countries[sideCountryId(w, side)], counts = readyCounts(state, w, side), cover = pilotCoverage(state, c.id);
  const stock = (a: TaskAsset) => nationalStock(c, a);
  const share = (assigned: number, total: number) => total > 0 ? Math.min(1, assigned / (DEFAULT_SHARE * total)) : 0;
  const forces = { fighters: assetTotal(counts, 'fighters'), bombers: assetTotal(counts, 'bombers'), warships: assetTotal(counts, 'warships') };
  const cap = (a: TaskAsset, assigned: number) => Math.min(c.military[a], assigned / DEFAULT_SHARE);
  const frontCoast = hasCoast(state, w.defenderId);
  const power = {
    // Fighters on air superiority give the ground battle air cover; fighters on close air support strike it.
    fighters: cap('fighters', counts.airSuperiority.fighters + counts.closeAirSupport.fighters) * cover,
    bombers: cap('bombers', counts.closeAirSupport.bombers) * cover,
    warships: frontCoast ? cap('warships', counts.shoreSupport.warships) : 0,
  };
  const airStrength = (counts.airSuperiority.fighters + GROUND_MISSION_COVER * (counts.closeAirSupport.fighters + counts.interdiction.fighters) + BOMBER_COVER * (counts.closeAirSupport.bombers + counts.interdiction.bombers)) * cover * airQuality(c);
  const cas = 1 + CAS_MAX * share(counts.closeAirSupport.fighters, stock('fighters'));
  const strike = (counts.interdiction.fighters + BOMBER_STRIKE * counts.interdiction.bombers) * cover;
  const strikeShare = share(counts.interdiction.fighters + BOMBER_STRIKE * counts.interdiction.bombers, stock('fighters') + BOMBER_STRIKE * stock('bombers'));
  return { c, counts, cover, forces, power, airStrength, cas, strike, strikeShare, blockadeShare: share(counts.blockade.warships, stock('warships')) };
}

/** Mission effects of both sides of a war with task groups. */
export function missionEffects(state: GameState, w: WarState): MissionEffects {
  const a = sideRaw(state, w, 'attacker'), d = sideRaw(state, w, 'defender');
  const airSuperiority = clamp((a.airStrength - d.airStrength) / Math.max(1, a.airStrength + d.airStrength) * 100, -100, 100);
  const cut = (own: typeof a, enemy: typeof a) => {
    // Interdiction is countered by the enemy's air-superiority fighters, a blockade by its escorts; each at most halves it.
    const airCover = own.strike > 0 ? Math.min(1, enemy.counts.airSuperiority.fighters * enemy.cover / own.strike) : 0;
    const escorts = own.counts.blockade.warships > 0 ? Math.min(1, enemy.counts.convoyEscort.warships / own.counts.blockade.warships) : 0;
    return {
      interdiction: INTERDICTION_MAX * own.strikeShare * (1 - COUNTER_MAX * airCover),
      blockade: hasCoast(state, enemy.c.id) && hasCoast(state, own.c.id) ? BLOCKADE_MAX * own.blockadeShare * (1 - COUNTER_MAX * escorts) : 0,
    };
  };
  const ac = cut(a, d), dc = cut(d, a);
  const pack = (r: typeof a, c: { interdiction: number; blockade: number }): SideMissionEffects => ({ forces: r.forces, power: r.power, airStrength: r.airStrength, cas: r.cas, ...c });
  return {
    attacker: pack(a, ac), defender: pack(d, dc), airSuperiority,
    supplyFactor: { attacker: (1 - dc.interdiction) * (1 - dc.blockade), defender: (1 - ac.interdiction) * (1 - ac.blockade) },
  };
}

/** A country as it fights in this war: national air and naval counts replaced by the assigned ones. */
export function combatCountry(c: CountryState, e: SideMissionEffects): CountryState {
  return { ...c, military: { ...c.military, fighters: e.power.fighters, bombers: e.power.bombers, warships: e.power.warships } };
}
/** A country as it burns fuel in this war: only ready assigned aircraft count, at the earlier per-aircraft rate. */
export function fuelCountry(state: GameState, w: WarState, side: TaskSide): CountryState {
  const c = state.countries[sideCountryId(w, side)];
  if (!hasTaskGroups(w)) return c;
  const counts = readyCounts(state, w, side);
  // Scaled by the share so the earlier formula (stock × share) charges exactly the assigned aircraft; capped at the stock.
  return { ...c, military: { ...c.military, fighters: Math.min(c.military.fighters, assetTotal(counts, 'fighters') / DEFAULT_SHARE), bombers: Math.min(c.military.bombers, assetTotal(counts, 'bombers') / DEFAULT_SHARE) } };
}

// ---------------------------------------------------------------------------------------------
// Preview, validator and assignment (player and AI)
// ---------------------------------------------------------------------------------------------

export interface TaskGroupPreview {
  allowed: boolean;
  reasons: string[];
  side: TaskSide | null;
  /** Assigned to this mission now (ready and preparing). */
  current: number;
  ready: number;
  preparing: number;
  /** Largest count this mission can have: what is free plus what it already holds. */
  max: number;
  stock: number;
  baseId: string;
  km: number;
  /** Day an increase would be on station. */
  readyDay: number;
  /** Fuel the whole group would burn in a full offensive round (holding burns the sustainment share). */
  fuelPerRound: number;
}

export function taskGroupPreview(state: GameState, warId: string, countryId: string, mission: TaskMission, asset: TaskAsset, count: number): TaskGroupPreview {
  const w = state.wars[warId], reasons: string[] = [];
  const side = w ? sideOf(w, countryId) : null, c = state.countries[countryId];
  const empty: TaskGroupPreview = { allowed: false, reasons, side, current: 0, ready: 0, preparing: 0, max: 0, stock: nationalStock(c, asset), baseId: countryId, km: 0, readyDay: state.day, fuelPerRound: 0 };
  if (!w || w.status !== 'active' || !side || !c) { reasons.push('This war is no longer active.'); return empty; }
  if (!TASK_MISSIONS.includes(mission) || !MISSION_ASSETS[mission]?.includes(asset)) { reasons.push('These forces cannot fly or sail this mission.'); return empty; }
  if (!hasTaskGroups(w)) { reasons.push('This war was saved before task groups; its forces keep the fixed share.'); return empty; }
  const groups = missionGroups(w, side, mission, asset), current = sum(groups);
  const ready = sum(groups.filter((g) => g.readyDay <= state.day)), preparing = current - ready;
  const stock = nationalStock(c, asset), max = Math.max(0, stock - assignedTotal(state, countryId, asset)) + current;
  const reach = missionReach(state, w, side, mission, asset);
  const fuelPerRound = isAir(asset) ? count * AIRCRAFT_ROUND_FUEL[asset as 'fighters' | 'bombers'] : 0;
  const preview: TaskGroupPreview = { allowed: false, reasons, side, current, ready, preparing, max, stock, baseId: reach.baseId, km: reach.km, readyDay: state.day + reach.prepDays, fuelPerRound };
  if (!Number.isInteger(count) || count < 0) reasons.push('Choose a whole number of aircraft or ships.');
  else if (count > max) reasons.push(max > current ? 'Not enough free forces: the rest are assigned elsewhere.' : 'All of these forces are already assigned.');
  if (count > current && !reach.allowed && reach.reason) reasons.push(reach.reason);
  if (count === current && !reasons.length) reasons.push('This group already has that strength.');
  preview.allowed = reasons.length === 0;
  return preview;
}

/**
 * Sets a mission's strength. An increase forms a new group that is on station after the preparation days; a
 * decrease recalls preparing forces first, then the most recently formed. Refused changes return the same state.
 */
export function assignTaskGroup(state: GameState, warId: string, countryId: string, mission: TaskMission, asset: TaskAsset, count: number): GameState {
  const p = taskGroupPreview(state, warId, countryId, mission, asset, count);
  if (!p.allowed || !p.side) return state;
  const w = state.wars[warId] as WarState & { taskGroups: TaskGroup[] }, side = p.side;
  let groups = w.taskGroups;
  if (count > p.current) {
    const n = groups.filter((g) => g.side === side && g.mission === mission && g.asset === asset).length;
    groups = [...groups, { id: `TG-${w.id}-${side}-${mission}-${asset}-${state.day}-${n}`, side, mission, asset, count: count - p.current, readyDay: p.readyDay, baseId: p.baseId }];
  } else groups = removeFrom(groups, asset, p.current - count, state.day, (g) => g.side === side && g.mission === mission);
  return { ...state, wars: { ...state.wars, [warId]: { ...w, taskGroups: groups } } };
}

// ---------------------------------------------------------------------------------------------
// Cargo under blockade
// ---------------------------------------------------------------------------------------------

/** Chance that one cargo for a fully blockaded, unescorted country is intercepted (25–75% of it is then lost). */
export const CARGO_INTERCEPT_MAX = 0.6;
export interface CargoBlockade { blockaderId: string; warId: string; interceptChance: number }
/**
 * Whether goods arriving in `countryId` run an enemy blockade: an active war where the enemy has ready warships on
 * blockade, both have a coast, and `countryId` has no ready convoy escorts in that war. The strongest blockade counts.
 */
export function cargoBlockade(state: GameState, countryId: string): CargoBlockade | null {
  let best: CargoBlockade | null = null;
  for (const w of activeWarsOf(state, countryId)) {
    const side = sideOf(w, countryId)!, enemySide = otherSide(side), enemyId = sideCountryId(w, enemySide);
    if (!hasCoast(state, countryId) || !hasCoast(state, enemyId)) continue;
    if (readyCounts(state, w, side).convoyEscort.warships > 0) continue;
    const blockading = readyCounts(state, w, enemySide).blockade.warships, stock = nationalStock(state.countries[enemyId], 'warships');
    if (!blockading || !stock) continue;
    const chance = CARGO_INTERCEPT_MAX * Math.min(1, blockading / (DEFAULT_SHARE * stock));
    if (!best || chance > best.interceptChance) best = { blockaderId: enemyId, warId: w.id, interceptChance: chance };
  }
  return best;
}

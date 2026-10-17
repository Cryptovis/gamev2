import type { CountryState, GameState } from '../../domain/game';
import { FRONTIER_REGIONS, REGION_IDS, type DemandId, type DemandKind, type DisarmTarget, type PeaceConference, type ReparationTier, type RegionId } from '../../domain/peace';
import { regionWeight, sizeFactor } from './peaceRegions';

/**
 * Phase 9.6: the menu of demands and what each costs in war score. Costs scale with the loser's economy (sizeFactor)
 * so that carving up a microstate is cheaper than taking a great power's industrial belt. All of it is pure.
 */
export const REPARATION_YEARS = [1, 2, 3, 4, 5] as const;
export const REPARATION_TIERS: readonly ReparationTier[] = ['light', 'standard', 'heavy'];
/** Share of the loser's monthly GDP paid every 30 days. */
export const REPARATION_RATE: Record<ReparationTier, number> = { light: 0.02, standard: 0.04, heavy: 0.07 };
/** War score per year of tribute. */
const REPARATION_COST_PER_YEAR: Record<ReparationTier, number> = { light: 4, standard: 7, heavy: 11 };
/** Stability the loser's government loses with every payment. */
export const REPARATION_STRAIN: Record<ReparationTier, number> = { light: 0.1, standard: 0.25, heavy: 0.5 };
export const ARMOR_CAPS = [70, 50, 30] as const;
export const FLEET_CAPS = [70, 50, 25] as const;
const DISARM_COST: Record<DisarmTarget, Record<number, number>> = { armor: { 70: 6, 50: 12, 30: 20 }, fleet: { 70: 5, 50: 10, 25: 16 } };
export const PUPPET_BASE_COST = 40;
export const DMZ_COST = 8;

export type ParsedDemand =
  | { kind: 'annex'; region: RegionId }
  | { kind: 'puppet' }
  | { kind: 'dmz'; zone: RegionId }
  | { kind: 'reparations'; years: number; tier: ReparationTier }
  | { kind: 'disarm'; target: DisarmTarget; cap: number };

export const annexId = (region: RegionId): DemandId => `annex:${region}`;
export const dmzId = (zone: RegionId): DemandId => `dmz:${zone}`;
export const reparationsId = (years: number, tier: ReparationTier): DemandId => `reparations:${years}:${tier}`;
export const disarmId = (target: DisarmTarget, cap: number): DemandId => `disarm:${target}:${cap}`;
export const PUPPET_ID: DemandId = 'puppet';

export function parseDemand(id: DemandId): ParsedDemand | null {
  const [kind, a, b] = id.split(':');
  if (kind === 'puppet' && a === undefined) return { kind };
  if (kind === 'annex' && (REGION_IDS as readonly string[]).includes(a ?? '') && b === undefined) return { kind, region: a as RegionId };
  if (kind === 'dmz' && (FRONTIER_REGIONS as readonly string[]).includes(a ?? '') && b === undefined) return { kind, zone: a as RegionId };
  if (kind === 'reparations') {
    const years = Number(a);
    if ((REPARATION_YEARS as readonly number[]).includes(years) && (REPARATION_TIERS as readonly string[]).includes(b ?? '')) return { kind, years, tier: b as ReparationTier };
  }
  if (kind === 'disarm' && (a === 'armor' || a === 'fleet')) {
    const cap = Number(b);
    if ((a === 'armor' ? ARMOR_CAPS : FLEET_CAPS).includes(cap as never)) return { kind, target: a, cap };
  }
  return null;
}

export const demandKind = (id: DemandId): DemandKind | null => parseDemand(id)?.kind ?? null;

/** Everything a demand can be put on the table as, in the order the table lists them. */
export function demandCatalog(winnerIsAttacker: boolean): DemandId[] {
  const ids: DemandId[] = [];
  for (const region of REGION_IDS) ids.push(annexId(region));
  if (winnerIsAttacker) ids.push(PUPPET_ID);
  for (const zone of FRONTIER_REGIONS) ids.push(dmzId(zone));
  for (const tier of REPARATION_TIERS) for (const years of REPARATION_YEARS) ids.push(reparationsId(years, tier));
  for (const cap of ARMOR_CAPS) ids.push(disarmId('armor', cap));
  for (const cap of FLEET_CAPS) ids.push(disarmId('fleet', cap));
  return ids;
}

/** War score a demand costs against this loser. */
export function demandCost(loser: CountryState, id: DemandId): number {
  const demand = parseDemand(id);
  if (!demand) return 0;
  const size = sizeFactor(loser);
  switch (demand.kind) {
    case 'annex': return Math.round(6 + 64 * regionWeight(demand.region) * (0.45 + 0.55 * size));
    case 'puppet': return Math.round(PUPPET_BASE_COST + 20 * size);
    case 'dmz': return DMZ_COST;
    case 'reparations': return demand.years * REPARATION_COST_PER_YEAR[demand.tier];
    case 'disarm': return Math.round(DISARM_COST[demand.target][demand.cap] * (0.7 + 0.3 * size));
  }
}

export const totalCost = (loser: CountryState, ids: readonly DemandId[]) => ids.reduce((sum, id) => sum + demandCost(loser, id), 0);

/** Demands that cannot be on the table together. The group is the demand's kind, except reparations and disarmament which are single-choice. */
function exclusiveGroup(id: DemandId): string | null {
  const demand = parseDemand(id);
  if (!demand) return null;
  if (demand.kind === 'reparations') return 'reparations';
  if (demand.kind === 'disarm') return `disarm:${demand.target}`;
  return id;
}

export type DemandBlock = 'unknown' | 'taken' | 'not_occupied' | 'no_puppet_for_defender' | 'puppet_conflict' | 'already_ceded' | 'over_budget';

export interface DemandCheck {
  id: DemandId;
  cost: number;
  allowed: boolean;
  /** Set when it is not allowed. */
  block?: DemandBlock;
  selected: boolean;
}

/** Why a demand can or cannot be added to the table now. `selected` is the winner's current demands. */
export function checkDemand(state: GameState, conference: PeaceConference, id: DemandId, occupied: readonly RegionId[], selected: readonly DemandId[], budget: number): DemandCheck {
  const loser = state.countries[conference.loserId];
  const demand = parseDemand(id);
  const cost = loser ? demandCost(loser, id) : 0;
  const result = (allowed: boolean, block?: DemandBlock): DemandCheck => ({ id, cost, allowed, block, selected: selected.includes(id) });
  if (!demand || !loser) return result(false, 'unknown');
  if (selected.includes(id)) return result(true);
  const winnerIsAttacker = state.wars[conference.warId]?.attackerId === conference.winnerId;
  const ceded = state.world.peace?.cessions[conference.loserId] ?? {};
  if (demand.kind === 'annex') {
    if (ceded[demand.region]) return result(false, 'already_ceded');
    if (!occupied.includes(demand.region)) return result(false, 'not_occupied');
    if (selected.includes(PUPPET_ID) && allRemainingAnnexed(ceded, [...selected, id])) return result(false, 'puppet_conflict');
  }
  if (demand.kind === 'puppet') {
    if (!winnerIsAttacker) return result(false, 'no_puppet_for_defender');
    if (loser.controllerCountryId || loser.annexedBy) return result(false, 'taken');
    if (!occupied.includes('capital')) return result(false, 'not_occupied');
    if (allRemainingAnnexed(ceded, selected)) return result(false, 'puppet_conflict');
  }
  const group = exclusiveGroup(id);
  const others = selected.filter(other => exclusiveGroup(other) === group);
  const freed = others.reduce((sum, other) => sum + demandCost(loser, other), 0);
  if (totalCost(loser, selected) - freed + cost > budget) return result(false, 'over_budget');
  return result(true);
}

/** True when the listed annexations together with earlier cessions would leave the loser with no region at all. */
function allRemainingAnnexed(ceded: Partial<Record<RegionId, string>>, list: readonly DemandId[]): boolean {
  const taking = new Set<RegionId>();
  for (const id of list) {
    const demand = parseDemand(id);
    if (demand?.kind === 'annex') taking.add(demand.region);
  }
  return REGION_IDS.every(region => taking.has(region) || ceded[region]);
}

/** Returns the new list of demands after toggling `id`: removes a selected demand, or adds an allowed one (replacing the single-choice rival). */
export function toggleDemand(state: GameState, conference: PeaceConference, id: DemandId, occupied: readonly RegionId[], budget: number): DemandId[] | null {
  const selected = conference.selected;
  if (selected.includes(id)) return selected.filter(other => other !== id);
  const check = checkDemand(state, conference, id, occupied, selected, budget);
  if (!check.allowed) return null;
  const group = exclusiveGroup(id);
  return [...selected.filter(other => exclusiveGroup(other) !== group), id];
}

/** Cheapest way to see how much of the budget the table has left. */
export const budgetLeft = (loser: CountryState, selected: readonly DemandId[], budget: number) => budget - totalCost(loser, selected);

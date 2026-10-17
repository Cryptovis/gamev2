import type { CountryState, WarState } from '../../domain/game';
import { REGION_IDS, type RegionId } from '../../domain/peace';
import { log10 } from '../detMath';

/**
 * The simulation models each country as one unit, so peace talks divide every country into the same six parts. The
 * shares are the part of the country's population, output and natural resources that lies in each region; each column
 * sums to exactly 1. `depth` is the war progress (0-100, in the winner's favour) at which the winner's armies stand in
 * the region. A surrender or collapse puts every region within reach.
 */
export interface RegionTemplate {
  id: RegionId;
  name: string;
  population: number;
  output: number;
  resources: number;
  depth: number;
}

export const REGION_TEMPLATES: Record<RegionId, RegionTemplate> = {
  frontier_a: { id: 'frontier_a', name: 'Northern frontier', population: 0.15, output: 0.09, resources: 0.15, depth: 12 },
  frontier_b: { id: 'frontier_b', name: 'Eastern frontier', population: 0.15, output: 0.07, resources: 0.15, depth: 25 },
  resource: { id: 'resource', name: 'Resource belt', population: 0.1, output: 0.08, resources: 0.4, depth: 45 },
  industrial: { id: 'industrial', name: 'Industrial belt', population: 0.18, output: 0.24, resources: 0.12, depth: 62 },
  heartland: { id: 'heartland', name: 'Heartland', population: 0.24, output: 0.22, resources: 0.14, depth: 78 },
  capital: { id: 'capital', name: 'Capital region', population: 0.18, output: 0.3, resources: 0.04, depth: 92 },
};

/** Share of the country's national value a region carries: population counts most, then output, then resources. */
export const regionWeight = (id: RegionId): number => {
  const r = REGION_TEMPLATES[id];
  return r.population * 0.45 + r.output * 0.35 + r.resources * 0.2;
};

export type WarSide = 'attacker' | 'defender';

/** Regions of the enemy that `side` has overrun, from how far the front has moved in that side's favour. */
export function occupiedRegions(war: WarState, side: WarSide, capitulated = false): RegionId[] {
  if (capitulated) return [...REGION_IDS];
  const lead = side === 'attacker' ? war.progress : -war.progress;
  return REGION_IDS.filter(id => lead >= REGION_TEMPLATES[id].depth);
}

/** Sum of the regions' weights: the share of the country's national value they hold (0 to 1). */
export const regionsValue = (ids: readonly RegionId[]): number => ids.reduce((sum, id) => sum + regionWeight(id), 0);

/** Larger economies cost more to carve up: 0.25 for a microstate economy up to 1 for the largest. */
export function sizeFactor(country: CountryState): number {
  const billions = Math.max(1, country.economy.gdp);
  return Math.min(1, Math.max(0.25, log10(billions + 1) / 4));
}

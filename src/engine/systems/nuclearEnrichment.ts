import { log } from '../detMath';
import { LEVEL_ASSAY, type EnrichLevel, type FeedSource, type MaterialStock, type NuclearProgram, type NuclearSite } from '../../domain/nuclear';
import type { CountryState } from '../../domain/game';


/**
 * Phase 9.7: enrichment physics at game scale. A cascade is limited by its separative work (SWU) and by its feed. The
 * SWU a kilogram of product needs comes from the standard separative-work formula, so the step from natural uranium to
 * 3.67% costs about 4.5 SWU per kilogram, to 20% about 24, and to 90% about 208; starting from lower-enriched feed is
 * far cheaper, which is why a stock of reactor fuel shortens a breakout. All logarithms use detMath.
 */
export const NATURAL_ASSAY = 0.00711;
export const TAILS_ASSAY = 0.0025;
/** Kilograms of natural uranium in one unit of the national uranium stock. */
export const KG_PER_URANIUM_UNIT = 20000;
/** Separative work one centrifuge delivers in a year (an advanced machine). */
export const SWU_PER_CENTRIFUGE_YEAR = 5;
export const BLOCK_SIZE = 1000;
export const MAX_BLOCKS_PER_SITE = 10;
export const MAX_SITES = 6;
/** Kilograms of 90% material in one first-generation warhead core (the IAEA significant quantity). */
export const WARHEAD_KG = 25;
/** Kilograms of 3.67% fuel one civil nuclear power station burns each day. */
export const LEU_KG_PER_PLANT_DAY = 3;

/** Separative potential of an assay. */
const potential = (x: number) => (2 * x - 1) * log(x / (1 - x));

export const feedAssay = (feed: FeedSource): number => (feed === 'natural' ? NATURAL_ASSAY : LEVEL_ASSAY[feed]);
const tailsFor = (feed: FeedSource) => (feed === 'natural' ? TAILS_ASSAY : NATURAL_ASSAY);

/** Feed kilograms and separative work for each kilogram of product at `target`, or null when the feed is not below it. */
export function enrichmentCost(target: EnrichLevel, feed: FeedSource): { feedKg: number; swu: number } | null {
  const product = LEVEL_ASSAY[target];
  const xf = feedAssay(feed);
  const xt = tailsFor(feed);
  if (product <= xf) return null;
  const ratio = (product - xt) / (xf - xt);
  const swu = potential(product) + (ratio - 1) * potential(xt) - ratio * potential(xf);
  return { feedKg: ratio, swu };
}

/** True when a cascade may take this feed for this target (the feed must be a lower assay than the product). */
export const feedAllowed = (target: EnrichLevel, feed: FeedSource) => enrichmentCost(target, feed) !== null;

/** Separative work a site delivers each day. */
export const siteSwuPerDay = (site: Pick<NuclearSite, 'centrifuges'>) => (site.centrifuges * SWU_PER_CENTRIFUGE_YEAR) / 365;

export interface SiteOutput { siteId: string; kg: number; feedKg: number; feed: FeedSource; target: EnrichLevel }

/** Kilograms of feed of each kind a program can draw on today. */
export const feedAvailable = (country: CountryState, stock: MaterialStock, feed: FeedSource): number =>
  feed === 'natural' ? country.resources.uranium * KG_PER_URANIUM_UNIT : stock[feed];

/** Product a site would make in one day with unlimited feed (days to a warhead and similar previews use this). */
export function siteProductPerDay(site: Pick<NuclearSite, 'centrifuges' | 'target' | 'feed'>): number {
  const cost = enrichmentCost(site.target, site.feed);
  return cost && site.centrifuges > 0 ? siteSwuPerDay(site) / cost.swu : 0;
}

/**
 * One day of enrichment across every site, in order. Feed is shared: the national uranium stock for natural feed and the
 * program's own material for enriched feed. Returns the new program, the uranium units drawn and each site's output.
 */
export function enrichDay(program: NuclearProgram, country: CountryState): { program: NuclearProgram; uraniumUsed: number; outputs: SiteOutput[] } {
  const stock: MaterialStock = { ...program.stock };
  let natural = country.resources.uranium * KG_PER_URANIUM_UNIT;
  let drawn = 0;
  const outputs: SiteOutput[] = [];
  for (const site of program.sites) {
    const cost = enrichmentCost(site.target, site.feed);
    if (!cost || site.centrifuges <= 0) continue;
    const wanted = siteSwuPerDay(site) / cost.swu;
    const pool = site.feed === 'natural' ? natural : stock[site.feed];
    const kg = Math.min(wanted, pool / cost.feedKg);
    if (kg <= 0) continue;
    const used = kg * cost.feedKg;
    if (site.feed === 'natural') { natural -= used; drawn += used; } else stock[site.feed] -= used;
    stock[site.target] += kg;
    outputs.push({ siteId: site.id, kg, feedKg: used, feed: site.feed, target: site.target });
  }
  return { program: { ...program, stock }, uraniumUsed: drawn / KG_PER_URANIUM_UNIT, outputs };
}

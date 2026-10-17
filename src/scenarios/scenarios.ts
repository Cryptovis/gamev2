// Phase 10.0: the scenario engine. A scenario is a pure, seeded rewrite of the opening state: it reads nothing but the
// state it is given, draws no random numbers and never looks at the clock, so the same start always gives the same
// world. Once the campaign is running the ordinary simulation owns everything.

import type { CountryState, GameState } from '../domain/game';
import { isScenarioId, type ScenarioId } from '../domain/scenario';
import { activeCountries } from '../domain/sovereignty';
import { addShock, commodityExchange } from '../engine/systems/commodityExchange';
import { updateBilateralRelation } from '../engine/systems/diplomacy';
import { openWar, warFuelReadiness } from '../engine/systems/warRules';
import type { CommodityShock } from '../domain/commodityExchange';

export type ScenarioDifficulty = 'standard' | 'demanding' | 'brutal';

export interface ScenarioDefinition {
  id: ScenarioId;
  /** English titles and sentences; every one has a translation in uiCatalog100Scenarios. */
  title: string;
  tagline: string;
  summary: string;
  difficulty: ScenarioDifficulty;
  /** The seed the simulation starts from; a scenario pins it so two starts of one scenario are identical. */
  seed: number;
  /** Nations that make the scenario most interesting, best first. The player may still pick any nation. */
  suggested: readonly string[];
  /** The leader portrait the scenario suggests (an avatar preset id). */
  suggestedAvatar: string;
  /** What changes at the start, in plain words, for the picker. */
  facts: readonly string[];
  /** Lines added to the opening situation report. */
  briefing: readonly string[];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number) => Math.round(v * 1000) / 1000;

export const SCENARIOS: readonly ScenarioDefinition[] = [
  {
    id: 'modern-2026', title: 'Modern World 2026', tagline: 'The balanced start', difficulty: 'standard', seed: 0xA17E5EED,
    summary: 'The world as it stands today: markets steady, alliances in place, no war in progress. The reference start for every other scenario.',
    suggested: ['TUR', 'USA', 'DEU', 'JPN', 'BRA'], suggestedAvatar: 'avatar-01',
    facts: ['Prices and stocks as shipped', 'No war at the start', 'Standard difficulty'],
    briefing: ['SCENARIO // Modern World 2026. Markets are steady and no war is in progress.'],
  },
  {
    id: 'resource-crisis', title: 'Global Resource Crisis', tagline: 'Fuel, food and uranium run short', difficulty: 'demanding', seed: 0x5E5C0A15,
    summary: 'Oil, food and uranium are scarce, supply chains are broken and prices are climbing. Inflation is high, treasuries are thin and every government is under pressure.',
    suggested: ['TUR', 'IND', 'EGY', 'JPN', 'DEU'], suggestedAvatar: 'avatar-02',
    facts: ['Oil and food stocks cut by about half', 'Uranium and processed fuel scarce', 'Inflation up about 6 points, debt up 8 percent', 'Ports and roads move less freight', 'Commodity prices open with large shocks'],
    briefing: ['SCENARIO // Global Resource Crisis. Fuel, food and uranium are short and supply chains are broken.', 'Inflation is high and treasuries are thin. Secure supply first.'],
  },
  {
    id: 'regional-conflicts', title: 'Regional Conflicts', tagline: 'Three fronts, one tense world', difficulty: 'brutal', seed: 0xC0F11C75,
    summary: 'War is already burning in Eastern Europe and the Middle East, and the Taiwan Strait is on the edge. Relations are hostile along every front and oil markets are nervous.',
    suggested: ['UKR', 'POL', 'TWN', 'IRN', 'ISR'], suggestedAvatar: 'avatar-07',
    facts: ['Active war in Eastern Europe', 'Active war in the Middle East', 'Taiwan Strait at the brink, relations hostile', 'Oil prices open with a war premium', 'Stability down in the war zones'],
    briefing: ['SCENARIO // Regional Conflicts. Wars are burning in Eastern Europe and the Middle East.', 'The Taiwan Strait is on the brink and oil markets are nervous.'],
  },
];

export const DEFAULT_SCENARIO: ScenarioId = 'modern-2026';
export const scenarioById = (id: ScenarioId): ScenarioDefinition => SCENARIOS.find(s => s.id === id) ?? SCENARIOS[0];

/** Applies one rewrite to every sovereign country, in catalogue order so the result never depends on iteration luck. */
function mapCountries(state: GameState, change: (c: CountryState) => CountryState): GameState {
  const countries: Record<string, CountryState> = {};
  for (const id of Object.keys(state.countries).sort()) countries[id] = change(state.countries[id]);
  return { ...state, countries };
}

function shock(good: CommodityShock['good'], size: number, halfLife: number, headline: string): Omit<CommodityShock, 'id'> {
  return { good, size, halfLife, headline, day: 1, source: 'event' };
}

function resourceCrisis(state: GameState): GameState {
  // The exchange opens on the untouched world, so its baseline remembers normal supply and the cuts below read as a shortage.
  let ex = commodityExchange(state);
  let next = mapCountries(state, c => ({
    ...c,
    resources: { food: round(c.resources.food * 0.55), oil: round(c.resources.oil * 0.5), iron: round(c.resources.iron * 0.8), uranium: round(c.resources.uranium * 0.55) },
    resourceProduction: { ...c.resourceProduction, food: round(c.resourceProduction.food * 0.88), oil: round(c.resourceProduction.oil * 0.85), uranium: round(c.resourceProduction.uranium * 0.9) },
    processedResources: { ...c.processedResources, fuel: round(c.processedResources.fuel * 0.6), steel: round(c.processedResources.steel * 0.85) },
    economy: {
      ...c.economy,
      inflation: round(clamp(c.economy.inflation + 6, 0, 45)), unemployment: round(clamp(c.economy.unemployment + 2.5, 0, 40)),
      treasury: round(c.economy.treasury * 0.85), debt: round(c.economy.debt * 1.08), productivity: round(c.economy.productivity * 0.95),
    },
    politics: { ...c.politics, approval: round(clamp(c.politics.approval - 6, 0, 100)), stability: round(clamp(c.politics.stability - 7, 0, 100)) },
  }));
  const infrastructure = Object.fromEntries(Object.keys(next.infrastructure).sort().map(id => [id, { ...next.infrastructure[id], throughput: round(next.infrastructure[id].throughput * 0.82) }]));
  next = { ...next, infrastructure };
  // Price shocks decay on their own; the fundamentals follow the reduced world supply.
  for (const s of [
    shock('oil', 0.35, 140, 'Supply routes break down and oil spikes'),
    shock('fuel', 0.3, 100, 'Fuel shortages spread across the refining chain'),
    shock('food', 0.3, 120, 'Harvest failures and broken shipping lift food prices'),
    shock('uranium', 0.22, 150, 'Uranium supply tightens as mines and enrichers stall'),
  ]) ex = addShock(ex, s);
  return { ...next, world: { ...next.world, commodities: ex } };
}

/** Pairs hostile at the start. A score at or below -50 reads as hostile; the pair keeps its treaties out of the way. */
const BRINK: readonly [string, string, number][] = [
  ['CHN', 'TWN', -78], ['CHN', 'USA', -38], ['RUS', 'POL', -52], ['IRN', 'SAU', -55], ['ISR', 'SYR', -60], ['IRN', 'USA', -60],
];
/** Wars opened at the start, in this order; a war the rules block is simply skipped. */
const WARS: readonly [string, string][] = [['RUS', 'UKR'], ['ISR', 'IRN']];

function regionalConflicts(state: GameState): GameState {
  let ex = commodityExchange(state);
  let next = state;
  for (const [a, b, score] of BRINK) {
    if (!next.countries[a] || !next.countries[b]) continue;
    next = updateBilateralRelation(next, a, b, r => ({ ...r, score: Math.min(r.score, score), status: 'hostile', treaties: [], sanctions: true }));
  }
  for (const [a, b] of WARS) {
    if (!next.countries[a] || !next.countries[b]) continue;
    // A government that goes to war has its tanks fuelled: top the attacker up to the fourteen days the rules ask for.
    const fuel = warFuelReadiness(next, a);
    if (!fuel.allowed) next = { ...next, countries: { ...next.countries, [a]: { ...next.countries[a], processedResources: { ...next.countries[a].processedResources, fuel: round(next.countries[a].processedResources.fuel + fuel.missing * 1.25) } } } };
    next = openWar(next, a, b, true).state;
  }
  const zone = new Set(['RUS', 'UKR', 'ISR', 'IRN', 'SYR', 'TWN', 'CHN']);
  next = mapCountries(next, c => zone.has(c.id)
    ? { ...c, politics: { ...c.politics, stability: round(clamp(c.politics.stability - 8, 0, 100)) }, economy: { ...c.economy, inflation: round(clamp(c.economy.inflation + 1.5, 0, 45)) } }
    : c);
  // The two wars open before the first tick, so the exchange's own war news prices them in; this adds the nerves.
  ex = addShock(ex, shock('oil', 0.12, 90, 'War in the region puts a premium on oil'));
  ex = addShock(ex, shock('gold', 0.07, 80, 'Investors rush to safe havens as fronts open'));
  return { ...next, world: { ...next.world, commodities: ex } };
}

/**
 * Builds the opening state of a scenario on top of a freshly built campaign. Pure and deterministic: the scenario pins
 * the simulation seed, rewrites the state in catalogue order and records which scenario it was.
 */
export function applyScenario(state: GameState, id: ScenarioId): GameState {
  if (!isScenarioId(id)) return state;
  const def = scenarioById(id);
  let next: GameState = { ...state, simulationSeed: def.seed };
  if (id === 'resource-crisis') next = resourceCrisis(next);
  else if (id === 'regional-conflicts') next = regionalConflicts(next);
  return {
    ...next,
    world: { ...next.world, scenario: { id, startedDay: next.day } },
    sitrep: [...def.briefing, ...next.sitrep],
  };
}

/** Sovereign countries a scenario lists as good starts that actually exist in this world. */
export function suggestedCountries(state: Pick<GameState, 'countries'>, id: ScenarioId): string[] {
  const live = new Set(activeCountries(state.countries).map(c => c.id));
  return scenarioById(id).suggested.filter(c => live.has(c));
}

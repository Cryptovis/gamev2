import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { AVATAR_PRESETS } from '../data/avatarPresets';
import type { GameState } from '../domain/game';
import { SCENARIO_IDS, isScenarioId, type ScenarioId } from '../domain/scenario';
import { commodityExchange } from '../engine/systems/commodityExchange';
import { tickGame } from '../engine/tick';
import { validScenarioState } from '../persistence/validation100';
import { validSaveShape } from '../persistence/validation';
import { snapshotGame } from '../persistence/snapshot';
import { DEFAULT_SCENARIO, SCENARIOS, applyScenario, scenarioById, suggestedCountries } from '../scenarios/scenarios';

const fresh = (): GameState => { const s = makeInitialState(); s.world.tutorial.active = false; s.eventCooldownUntil = 100000; s.advisorCooldownUntil = 100000; return s; };
const start = (id: ScenarioId) => applyScenario(fresh(), id);
const finite = (v: unknown): boolean => typeof v === 'number' ? Number.isFinite(v) : v && typeof v === 'object' ? Object.values(v as object).every(finite) : true;
const activeWars = (s: GameState) => Object.values(s.wars).filter(w => w.status === 'active');

describe('10.0 the scenario catalogue', () => {
  it('lists the three scenarios with distinct ids, seeds and difficulties in order', () => {
    expect(SCENARIOS.map(s => s.id)).toEqual([...SCENARIO_IDS]);
    expect(new Set(SCENARIOS.map(s => s.seed)).size).toBe(3);
    expect(SCENARIOS.map(s => s.difficulty)).toEqual(['standard', 'demanding', 'brutal']);
    expect(DEFAULT_SCENARIO).toBe('modern-2026');
  });
  it('names real nations and real portraits', () => {
    const world = fresh();
    for (const def of SCENARIOS) {
      expect(def.suggested.length).toBeGreaterThanOrEqual(3);
      expect(suggestedCountries(world, def.id)).toEqual([...def.suggested]);
      expect(AVATAR_PRESETS.some(a => a.id === def.suggestedAvatar)).toBe(true);
      expect(def.facts.length).toBeGreaterThan(1);
      expect(def.briefing.length).toBeGreaterThan(0);
    }
  });
  it('recognises scenario ids and nothing else', () => {
    for (const id of SCENARIO_IDS) expect(isScenarioId(id)).toBe(true);
    for (const bad of ['', 'Modern', null, 4, undefined, 'regional_conflicts']) expect(isScenarioId(bad)).toBe(false);
    expect(scenarioById('nope' as ScenarioId).id).toBe('modern-2026');
  });
});

describe('10.0 the scenario loader is deterministic', () => {
  it('builds the same world every time', () => {
    for (const id of SCENARIO_IDS) expect(JSON.stringify(start(id))).toBe(JSON.stringify(start(id)));
  });
  it('pins the seed and records the scenario', () => {
    for (const def of SCENARIOS) {
      const s = start(def.id);
      expect(s.simulationSeed).toBe(def.seed);
      expect(s.world.scenario).toEqual({ id: def.id, startedDay: 1 });
      expect(s.sitrep.slice(0, def.briefing.length)).toEqual([...def.briefing]);
    }
  });
  it('leaves the shipped start untouched for Modern World 2026', () => {
    const base = fresh(), s = start('modern-2026');
    expect(s.simulationSeed).toBe(base.simulationSeed);
    expect(JSON.stringify(s.countries)).toBe(JSON.stringify(base.countries));
    expect(JSON.stringify(s.wars)).toBe(JSON.stringify(base.wars));
    expect(activeWars(s)).toHaveLength(0);
  });
  it('ignores an unknown id', () => {
    const base = fresh();
    expect(applyScenario(base, 'nope' as ScenarioId)).toBe(base);
  });
  it('does not change the state it was given', () => {
    const base = fresh(), before = JSON.stringify(base);
    for (const id of SCENARIO_IDS) applyScenario(base, id);
    expect(JSON.stringify(base)).toBe(before);
  });
});

describe('10.0 Global Resource Crisis', () => {
  const base = fresh(), s = start('resource-crisis');
  it('cuts the stocks that matter in every country', () => {
    for (const id of Object.keys(base.countries)) {
      const a = base.countries[id], b = s.countries[id];
      expect(b.resources.oil).toBeLessThanOrEqual(a.resources.oil * 0.5 + 0.001);
      expect(b.resources.food).toBeLessThanOrEqual(a.resources.food * 0.55 + 0.001);
      expect(b.resources.uranium).toBeLessThanOrEqual(a.resources.uranium * 0.55 + 0.001);
      expect(b.processedResources.fuel).toBeLessThanOrEqual(a.processedResources.fuel * 0.6 + 0.001);
    }
  });
  it('lifts inflation and unemployment, thins treasuries and pressures governments', () => {
    const a = base.countries.TUR, b = s.countries.TUR;
    expect(b.economy.inflation).toBeGreaterThan(a.economy.inflation + 5.9);
    expect(b.economy.unemployment).toBeGreaterThan(a.economy.unemployment);
    expect(b.economy.treasury).toBeLessThan(a.economy.treasury);
    expect(b.economy.debt).toBeGreaterThan(a.economy.debt);
    expect(b.politics.stability).toBeLessThan(a.politics.stability);
    expect(b.politics.approval).toBeLessThan(a.politics.approval);
  });
  it('keeps every bounded figure inside its bounds', () => {
    for (const c of Object.values(s.countries)) {
      expect(c.economy.inflation).toBeLessThanOrEqual(45);
      expect(c.politics.stability).toBeGreaterThanOrEqual(0);
      expect(c.politics.approval).toBeGreaterThanOrEqual(0);
    }
  });
  it('slows freight and opens the exchange with price shocks', () => {
    expect(s.infrastructure.TUR.throughput).toBeLessThan(base.infrastructure.TUR.throughput);
    const ex = commodityExchange(s);
    expect(ex.shocks.map(x => x.good).sort()).toEqual(['food', 'fuel', 'oil', 'uranium']);
    const last = (g: 'oil' | 'food') => ex.markets[g].history[ex.markets[g].history.length - 1];
    expect(ex.markets.oil.price).toBeGreaterThan(last('oil') * 1.25);
    expect(ex.markets.food.price).toBeGreaterThan(last('food') * 1.2);
    expect(s.world.commodities).toBe(ex);
  });
  it('starts no war', () => expect(activeWars(s)).toHaveLength(0));
});

describe('10.0 Regional Conflicts', () => {
  const s = start('regional-conflicts');
  it('opens the wars in Eastern Europe and the Middle East', () => {
    const pairs = activeWars(s).map(w => `${w.attackerId}>${w.defenderId}`);
    expect(pairs).toContain('RUS>UKR');
    expect(activeWars(s).length).toBeGreaterThanOrEqual(1);
    for (const w of activeWars(s)) expect(w.startedDay).toBe(1);
  });
  it('puts the Taiwan Strait at the brink without a war', () => {
    const r = s.countries.CHN.diplomacy.relations.TWN, q = s.countries.TWN.diplomacy.relations.CHN;
    expect(r.status).toBe('hostile'); expect(q.status).toBe('hostile');
    expect(r.score).toBeLessThanOrEqual(-50);
    expect(activeWars(s).some(w => [w.attackerId, w.defenderId].includes('TWN'))).toBe(false);
  });
  it('gives the war zones lower stability and an oil premium', () => {
    const base = fresh();
    for (const id of ['RUS', 'UKR', 'TWN']) expect(s.countries[id].politics.stability).toBeLessThan(base.countries[id].politics.stability);
    expect(s.countries.BRA.politics.stability).toBe(base.countries.BRA.politics.stability);
    const oil = commodityExchange(s).markets.oil;
    expect(oil.price).toBeGreaterThan(oil.history[oil.history.length - 1] * 1.05);
  });
  it('keeps the warring sides at war in the relation table', () => {
    for (const w of activeWars(s)) expect(s.countries[w.attackerId].diplomacy.relations[w.defenderId].status).toBe('war');
  });
});

describe('10.0 every scenario plays on', () => {
  for (const id of SCENARIO_IDS) it(`${id}: 120 days stay finite and the world does not collapse`, () => {
    let s = start(id);
    for (let i = 0; i < 120; i++) s = tickGame({ ...s, speed: 1 });
    expect(finite(s.countries)).toBe(true);
    expect(s.day).toBe(121);
    const live = Object.values(s.countries).filter(c => c.economy.gdp > 0);
    expect(live.length).toBeGreaterThan(150);
    expect(Object.values(s.countries).filter(c => c.economy.treasury < -c.economy.gdp * 2).length).toBeLessThan(40);
  }, 120000);
  it('the same scenario ticks to the same world', () => {
    const run = () => { let s = start('regional-conflicts'); for (let i = 0; i < 20; i++) s = tickGame({ ...s, speed: 1 }); return JSON.stringify(s.countries.UKR) + s.simulationSeed; };
    expect(run()).toBe(run());
  });
});

describe('10.0 saves', () => {
  it('accepts saves with and without the scenario record', () => {
    const plain = fresh(), withIt = start('regional-conflicts');
    expect(validScenarioState(plain)).toBe(true);
    expect(validScenarioState(withIt)).toBe(true);
    expect(validSaveShape(JSON.parse(JSON.stringify(snapshotGame(plain))))).toBe(true);
    expect(validSaveShape(JSON.parse(JSON.stringify(snapshotGame(withIt))))).toBe(true);
  });
  it('refuses a record that names no scenario or a day in the future', () => {
    const s = start('resource-crisis');
    const bad = (scenario: unknown) => validScenarioState({ day: s.day, world: { scenario } });
    expect(bad({ id: 'nope', startedDay: 1 })).toBe(false);
    expect(bad({ id: 'resource-crisis', startedDay: 0 })).toBe(false);
    expect(bad({ id: 'resource-crisis', startedDay: s.day + 1 })).toBe(false);
    expect(bad({ id: 'resource-crisis', startedDay: 1.5 })).toBe(false);
    expect(bad(null)).toBe(false);
    expect(bad([])).toBe(false);
    expect(bad({ id: 'resource-crisis', startedDay: 1 })).toBe(true);
  });
});

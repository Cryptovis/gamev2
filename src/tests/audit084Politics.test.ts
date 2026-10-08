import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { CountryState, GameState } from '../domain/game';
import { simulatePolitics, stabilityTarget } from '../engine/systems/politics';
import { processMinistries, MAX_PRODUCTIVITY } from '../engine/systems/ministries';
import { maybeTriggerEvent, resolveEvent, EVENT_KIND_COOLDOWN, pickWeighted } from '../engine/systems/events';
import { proposeCouncilResolution, processCouncilSanctions, SANCTIONS_DURATION_DAYS } from '../engine/systems/council';
import { processLivingEconomyAI } from '../engine/systems/livingEconomyAI';
import { processStrategicGoals } from '../engine/systems/strategicGoals';
import { processCountryAI } from '../engine/systems/ai';
import { occupationFor, processGovernance } from '../engine/systems/governance';
import { maybeCreateResourceAdvisor } from '../engine/systems/advisor';
import { processPrograms } from '../engine/systems/nationalPrograms';
import { relationFor } from '../engine/systems/diplomacy';

const calmEconomy = { next: { inflation: 2, unemployment: 5 }, dailyGrowthRate: 0 } as any;
const noShortage = { foodShortage: false, oilShortage: false } as any;
const withCountry = (s: GameState, c: CountryState): GameState => ({ ...s, countries: { ...s.countries, [c.id]: c } });
const withPlayer = (s: GameState, patch: (p: CountryState) => CountryState) => withCountry(s, patch(s.countries[s.playerCountryId]));
let agendaBase: GameState | null = null;
const agendaState = (seed: number, patch: (p: CountryState) => CountryState = (p) => p): GameState => {
  agendaBase ??= makeInitialState();
  return withPlayer({ ...agendaBase, day: 28, eventCooldownUntil: 0, simulationSeed: (seed * 2654435761) >>> 0 }, patch);
};
const rollAgenda = (n: number, patch?: (p: CountryState) => CountryState) => {
  const counts: Record<string, number> = {};
  for (let i = 0; i < n; i++) { const e = maybeTriggerEvent(agendaState(i, patch)).activeEvent; if (e) counts[e.kind] = (counts[e.kind] ?? 0) + 1; }
  return counts;
};

describe('0.84 audit D1: stability follows approval', () => {
  it('falls toward a low target when approval collapses', () => {
    const s = makeInitialState();
    let c: CountryState = { ...s.countries.TUR, politics: { ...s.countries.TUR.politics, approval: 0, stability: 80 }, society: { ...s.countries.TUR.society, cohesion: 50 } };
    const target = stabilityTarget(c);
    expect(target).toBeLessThan(40);
    for (let d = 0; d < 365; d++) c = { ...c, politics: simulatePolitics(processMinistries(c), calmEconomy, noShortage) };
    expect(c.politics.stability).toBeLessThan(60);
    expect(c.politics.stability).toBeGreaterThanOrEqual(target);
  });
  it('ministries raise the target instead of adding stability every day', () => {
    const s = makeInitialState(), c = s.countries.TUR;
    expect(processMinistries(c).politics.stability).toBe(c.politics.stability);
    const interior = { ...c, ministries: { ...c.ministries, allocations: { ...c.ministries.allocations, interior: 45 } } };
    expect(stabilityTarget(interior)).toBeGreaterThan(stabilityTarget(c));
    let high: CountryState = { ...c, politics: { ...c.politics, approval: 90, stability: 60 } };
    for (let d = 0; d < 3000; d++) high = { ...high, politics: simulatePolitics(processMinistries(high), calmEconomy, noShortage) };
    expect(high.politics.stability).toBeLessThanOrEqual(stabilityTarget(high) + 0.01);
  });
});

describe('0.84 audit D2-D4: event selection', () => {
  it('weighted pick reaches low-pressure kinds', () => {
    const items = [{ pressure: 90 }, { pressure: 3 }];
    expect(pickWeighted(items, 0)).toBe(items[0]);
    expect(pickWeighted(items, 0.99)).toBe(items[1]);
  });
  it('earthquakes can fire and low approval no longer always yields reform_demand', () => {
    const calm = rollAgenda(1500);
    expect(calm.earthquake ?? 0).toBeGreaterThan(0);
    const angry = rollAgenda(1500, (p) => ({ ...p, politics: { ...p.politics, approval: 25 } }));
    const total = Object.values(angry).reduce((a, b) => a + b, 0);
    expect(angry.reform_demand).toBeLessThan(total);
  });
  it('blocks the same kind within its per-kind cooldown and records firing', () => {
    const counts = rollAgenda(1500, (p) => ({ ...p, politics: { ...p.politics, approval: 25 }, eventLastFired: { reform_demand: 28 - EVENT_KIND_COOLDOWN + 1 } }));
    expect(counts.reform_demand ?? 0).toBe(0);
    let fired: GameState | null = null;
    for (let i = 0; i < 200 && !fired; i++) { const n = maybeTriggerEvent(agendaState(i)); if (n.activeEvent) fired = n; }
    expect(fired).not.toBeNull();
    expect(fired!.countries.TUR.eventLastFired?.[fired!.activeEvent!.kind]).toBe(28);
  });
  it('war weariness needs an active war', () => {
    const counts = rollAgenda(1500, (p) => ({ ...p, military: { ...p.military, morale: 5 } }));
    expect(counts.war_weariness ?? 0).toBe(0);
  });
  it('food crisis is per capita: big countries trigger, well-stocked microstates do not', () => {
    const s = makeInitialState();
    const big = Object.values(s.countries).sort((a, b) => b.demographics.population - a.demographics.population)[0];
    const bigState = withCountry({ ...s, playerCountryId: big.id, day: 20, eventCooldownUntil: 0 }, { ...big, resources: { ...big.resources, food: big.demographics.population / 1e6 * 0.25 } });
    expect(big.demographics.population / 1e6 * 0.25).toBeGreaterThan(80);
    expect(maybeTriggerEvent(bigState).activeEvent?.kind).toBe('food_crisis');
    const micro = Object.values(s.countries).sort((a, b) => a.demographics.population - b.demographics.population)[0];
    const microState = withCountry({ ...s, playerCountryId: micro.id, day: 20, eventCooldownUntil: 0 }, { ...micro, resources: { ...micro.resources, food: 50 }, processedResources: { ...micro.processedResources, fuel: 100 } });
    expect(maybeTriggerEvent(microState).activeEvent?.kind).not.toBe('food_crisis');
  });
});

describe('0.84 audit D5: event resolution validates options', () => {
  const crisis = () => { const s = makeInitialState(); return maybeTriggerEvent(withPlayer({ ...s, day: 20, eventCooldownUntil: 0 }, (p) => ({ ...p, resources: { ...p.resources, food: 1 } }))); };
  it('rejects unknown option ids', () => {
    const s = crisis();
    expect(s.activeEvent?.kind).toBe('food_crisis');
    expect(resolveEvent(s, 'not-an-option')).toBe(s);
  });
  it('refuses an unaffordable option while a cheaper one exists', () => {
    const s = withPlayer(crisis(), (p) => ({ ...p, economy: { ...p.economy, treasury: 2 } }));
    const refused = resolveEvent(s, 'imports');
    expect(refused.activeEvent).not.toBeNull();
    expect(refused.countries.TUR.economy.treasury).toBe(2);
    expect(resolveEvent(s, 'ration').activeEvent).toBeNull();
  });
});

describe('0.84 audit D6: Global Council', () => {
  const influence = (s: GameState): GameState => ({ ...s, council: { ...s.council, influenceByCountry: { ...s.council.influenceByCountry, TUR: 100 } } });
  const setRelations = (s: GameState, target: string, score: number): GameState => ({ ...s, countries: Object.fromEntries(Object.entries(s.countries).map(([id, c]) => [id, id === target ? c : { ...c, diplomacy: { ...c.diplomacy, relations: { ...c.diplomacy.relations, [target]: { ...relationFor(c, target), score } } } }])) });
  it('sanctions expire after a year', () => {
    const s = influence(setRelations({ ...makeInitialState(), day: 100 }, 'SYR', -100));
    const passed = proposeCouncilResolution(s, 'sanctions', 'SYR');
    expect(passed.countries.SYR.globalSanctions).toBe(true);
    expect(passed.countries.SYR.globalSanctionsUntil).toBe(100 + SANCTIONS_DURATION_DAYS);
    expect(processCouncilSanctions({ ...passed, day: 100 + SANCTIONS_DURATION_DAYS - 1 }).countries.SYR.globalSanctions).toBe(true);
    expect(processCouncilSanctions({ ...passed, day: 100 + SANCTIONS_DURATION_DAYS }).countries.SYR.globalSanctions).toBe(false);
    const legacy = withCountry(s, { ...s.countries.FRA, globalSanctions: true });
    expect(processCouncilSanctions(legacy).countries.FRA.globalSanctionsUntil).toBe(100 + SANCTIONS_DURATION_DAYS);
  });
  it('a ceasefire without an active war is refused at no cost', () => {
    const s = influence({ ...makeInitialState(), wars: {} });
    const next = proposeCouncilResolution(s, 'ceasefire', 'SYR');
    expect(next.council.history).toHaveLength(s.council.history.length);
    expect(next.council.influenceByCountry.TUR).toBe(100);
  });
  it('humanitarian aid support depends on relations', () => {
    const s = influence(makeInitialState());
    const stable = withCountry(s, { ...s.countries.SYR, politics: { ...s.countries.SYR.politics, stability: 60 } });
    const liked = proposeCouncilResolution(setRelations(stable, 'SYR', 80), 'humanitarian_aid', 'SYR').council.history[0];
    const disliked = proposeCouncilResolution(setRelations(stable, 'SYR', -80), 'humanitarian_aid', 'SYR').council.history[0];
    expect(liked.supportPercent).toBeGreaterThan(disliked.supportPercent);
    expect(disliked.passed).toBe(false);
    expect(liked.passed).toBe(true);
  });
});

describe('0.84 audit D7: AI trade never signs pacts with the player', () => {
  it('excludes the player from the automatic supplier path', () => {
    const s = makeInitialState();
    let next: GameState = { ...s, day: 7 };
    const p = next.countries.TUR;
    next = withCountry(next, { ...p, resources: { ...p.resources, food: 1e6 }, resourceProduction: { ...p.resourceProduction, food: 1e4 } });
    for (const c of Object.values(next.countries)) if (c.id !== 'TUR') next = withCountry(next, { ...c, resources: { ...c.resources, food: 0 }, diplomacy: { ...c.diplomacy, relations: { ...c.diplomacy.relations, TUR: { ...relationFor(c, 'TUR'), score: 100 } } } });
    const after = processLivingEconomyAI(next);
    const before = Object.values(next.countries.TUR.diplomacy.relations).filter((r) => r.treaties.includes('trade')).length;
    expect(Object.values(after.countries.TUR.diplomacy.relations).filter((r) => r.treaties.includes('trade')).length).toBe(before);
    expect(Object.values(after.tradeDeals).some((d) => d.sellerId === 'TUR')).toBe(false);
  });
});

describe('0.84 audit D9: AI tax policy', () => {
  it('stabilize lowers tax toward 20 and the weekly AI cycle no longer random-walks taxes', () => {
    const s = makeInitialState(), bgr = s.countries.BGR;
    const unstable = { ...bgr, economy: { ...bgr.economy, taxRate: 24 }, politics: { ...bgr.politics, stability: 35, approval: 30 } };
    const reviewed = processStrategicGoals({ ...withCountry(s, unstable), day: 20, lastStrategicReviewDay: 1 });
    expect(reviewed.countries.BGR.ai.strategicGoal).toBe('stabilize');
    expect(reviewed.countries.BGR.economy.taxRate).toBe(23);
    const at20 = processStrategicGoals({ ...withCountry(s, { ...unstable, economy: { ...unstable.economy, taxRate: 20 } }), day: 20, lastStrategicReviewDay: 1 });
    expect(at20.countries.BGR.economy.taxRate).toBe(20);
    let w: GameState = { ...s, lastAiDay: 0 };
    const taxes = Object.fromEntries(Object.values(s.countries).map((c) => [c.id, c.economy.taxRate]));
    for (let week = 1; week <= 20; week++) w = processCountryAI({ ...w, day: week * 7 });
    expect(Object.values(w.countries).every((c) => c.economy.taxRate === taxes[c.id])).toBe(true);
  });
});

describe('0.84 audit D10: occupation records end with control', () => {
  it('a re-occupied country starts from a fresh record', () => {
    const s = makeInitialState();
    const free = { ...s, world: { ...s.world, governance: { ...(s.world as any).governance, occupations: { SYR: { controllerId: 'TUR', unrest: 97, policy: 'civil', lastActionDay: 0 } } } } } as GameState;
    const pruned = processGovernance({ ...free, day: 30 });
    expect((pruned.world as any).governance.occupations.SYR).toBeUndefined();
    const retaken = withCountry(pruned, { ...pruned.countries.SYR, controllerCountryId: 'TUR' });
    expect(occupationFor(retaken, 'SYR')!.unrest).toBe(35);
    const afterElection = withCountry({ ...s, world: { ...s.world, governance: { ...(s.world as any).governance, occupations: { SYR: { controllerId: 'TUR', unrest: 0, policy: 'civil', lastActionDay: 0, election: { endsDay: 1, supported: null, winner: 'x', resolved: true, offerAccepted: false } } } } } } as GameState, { ...s.countries.SYR, controllerCountryId: 'TUR' });
    expect(occupationFor(afterElection, 'SYR')!.election).toBeUndefined();
  });
});

describe('0.84 audit D11: resource advice has its own suppression key', () => {
  it('suppressing inflation advice does not silence iron advice', () => {
    const s = makeInitialState();
    let st: GameState = { ...s, day: 10, advisorCooldownUntil: 0 };
    st = withPlayer(st, (p) => ({ ...p, resources: { ...p.resources, iron: 0, food: 1e6, oil: 1e6, uranium: 1e6 }, diplomacy: { ...p.diplomacy, relations: Object.fromEntries(Object.entries(p.diplomacy.relations).map(([id, r]) => [id, { ...r, score: 90 }])) } }));
    for (const c of Object.values(st.countries)) if (c.id !== 'TUR') st = withCountry(st, { ...c, resources: { ...c.resources, iron: 1e5 }, resourceProduction: { ...c.resourceProduction, iron: 100 } });
    const living = { ...(st.world as any).living, advice: { suppressed: ['inflation'], lastShown: {}, active: null } };
    const next = maybeCreateResourceAdvisor({ ...st, world: { ...st.world, living } } as GameState);
    expect(next.activeAdvisor?.resource).toBe('iron');
  });
});

describe('0.84 audit C14: one productivity cap', () => {
  it('national programs cap productivity at the ministries cap', () => {
    const s = makeInitialState();
    const st = withPlayer({ ...s, day: 50, world: { ...s.world, programs: [{ id: 'education-1', kind: 'education', readyDay: 50, status: 'active' }] } } as GameState, (p) => ({ ...p, economy: { ...p.economy, productivity: 99.6 } }));
    expect(MAX_PRODUCTIVITY).toBe(100);
    expect(processPrograms(st).countries.TUR.economy.productivity).toBe(100);
  });
});

import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { CountryState, GameState } from '../domain/game';
import { FACTION_KEYS, type FactionState } from '../domain/politics';
import { tickGame } from '../engine/tick';
import { applyGameCommand } from '../engine/commands';
import {
  CONCESSION_BASE_COST_B, CRISIS_DAYS, ELECTION_INTERVAL, IGNORED_CRISIS_PENALTY, REGIME_CRISIS_PRESSURE,
  advanceFactions, coalitionStabilityEffect, coalitionSupport, coupChance, coupRisk, crisisCoupChance, electionForecast,
  expectedGovernmentShare, factionsFor, initialFactions, legitimacy, processPoliticalLayer, winProbability,
} from '../engine/systems/factions';
import { scaledCostB } from '../engine/systems/policyPressure';
import { validSaveShape } from '../persistence/validation';
import { validFactionState } from '../persistence/validation088E';
import { UI_CATALOG_088_E } from '../i18n/uiCatalog088E';

let base: GameState | null = null;
const fresh = (): GameState => structuredClone(base ??= makeInitialState());
const withCountry = (s: GameState, c: CountryState): GameState => ({ ...s, countries: { ...s.countries, [c.id]: c } });
const patchCountry = (s: GameState, id: string, patch: (c: CountryState) => CountryState) => withCountry(s, patch(s.countries[id]));
const withFactions = (c: CountryState, patch: Partial<FactionState> = {}): CountryState => ({ ...c, politics: { ...c.politics, factions: { ...initialFactions(c), ...patch } } });
const satisfied = (value: number) => Object.fromEntries(FACTION_KEYS.map((k) => [k, value])) as FactionState['satisfaction'];

/** Player (TUR, a republic) at the given approval on election day, with neutral factions. */
function electionDay(approval: number, seed: number): GameState {
  const s = fresh();
  return patchCountry({ ...s, day: 1461, simulationSeed: seed }, 'TUR', (c) => withFactions({ ...c, politics: { ...c.politics, approval, electionDaysRemaining: 0 } }, { satisfaction: satisfied(55) }));
}

describe('0.88 E2: factions', () => {
  it('creates faction state lazily for every country and staggers AI elections, leaving the player clock alone', () => {
    const s = processPoliticalLayer(fresh());
    const live = Object.values(s.countries).filter((c) => !c.annexedBy);
    expect(live.every((c) => !!c.politics.factions)).toBe(true);
    for (const c of live) {
      const f = c.politics.factions!;
      expect(FACTION_KEYS.reduce((sum, k) => sum + f.strength[k], 0)).toBeCloseTo(100, 6);
      for (const k of FACTION_KEYS) expect(f.satisfaction[k]).toBeGreaterThanOrEqual(0);
    }
    expect(s.countries.TUR.politics.electionDaysRemaining).toBe(1460);
    const aiClocks = new Set(live.filter((c) => c.id !== 'TUR' && ['democracy', 'republic'].includes(c.politics.regime)).map((c) => c.politics.electionDaysRemaining));
    expect(aiClocks.size).toBeGreaterThan(100);
  });

  it('moves faction satisfaction with policy: a 55% tax alienates business, defence spending pleases the security forces', () => {
    const c = withFactions(fresh().countries.TUR);
    let taxed = { ...c, economy: { ...c.economy, taxRate: 55 } }, armed = { ...c, ministries: { ...c.ministries, allocations: { ...c.ministries.allocations, defense: 40, science: 8 } } };
    for (let d = 0; d < 120; d++) {
      taxed = { ...taxed, politics: { ...taxed.politics, factions: advanceFactions(taxed, factionsFor(taxed), d, false) } };
      armed = { ...armed, politics: { ...armed.politics, factions: advanceFactions(armed, factionsFor(armed), d, false) } };
    }
    expect(factionsFor(taxed).satisfaction.business).toBeLessThan(factionsFor(c).satisfaction.business - 25);
    expect(coalitionSupport(taxed)).toBeLessThan(coalitionSupport(c));
    expect(factionsFor(armed).satisfaction.security).toBeGreaterThan(factionsFor(c).satisfaction.security + 15);
    expect(factionsFor(armed).satisfaction.liberal).toBeLessThan(factionsFor(c).satisfaction.liberal);
  });

  it('lets the coalition move the stability target by at most four points, and not at all before factions exist', () => {
    const c = fresh().countries.TUR;
    expect(coalitionStabilityEffect(c)).toBe(0);
    expect(coalitionStabilityEffect(withFactions(c, { satisfaction: satisfied(100) }))).toBe(4);
    expect(coalitionStabilityEffect(withFactions(c, { satisfaction: satisfied(0) }))).toBe(-4);
  });
});

describe('0.88 E2: elections are a seeded contest', () => {
  // Regression: before 0.88 the election was "approval >= 45": 47% always won and 43% always lost.
  it('makes a narrow loss possible at 47% approval and a narrow win possible at 43%', () => {
    const outcomes = (approval: number) => {
      let won = 0, lost = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const next = processPoliticalLayer(electionDay(approval, seed * 7919));
        if (next.campaignStatus === 'lost') lost++; else won++;
      }
      return { won, lost };
    };
    const at47 = outcomes(47), at43 = outcomes(43);
    expect(at47.lost).toBeGreaterThan(0);
    expect(at47.won).toBeGreaterThan(at47.lost);
    expect(at43.won).toBeGreaterThan(0);
    expect(at43.lost).toBeGreaterThan(at43.won);
    const f47 = electionForecast(electionDay(47, 1), 'TUR')!, f43 = electionForecast(electionDay(43, 1), 'TUR')!;
    expect(f47.winChance).toBeGreaterThan(0.5); expect(f47.winChance).toBeLessThan(1);
    expect(f43.winChance).toBeGreaterThan(0); expect(f43.winChance).toBeLessThan(0.5);
  }, 60_000);

  it('re-elects a well-governed player and reports both vote shares; a collapsed government always loses', () => {
    const won = processPoliticalLayer(electionDay(62, 12345));
    expect(won.campaignStatus).toBe('active');
    expect(won.countries.TUR.politics.electionDaysRemaining).toBe(ELECTION_INTERVAL);
    expect(won.countries.TUR.politics.factions!.terms).toBe(1);
    expect(won.sitrep[0]).toMatch(/^ELECTION \/\/ Turkey government re-elected with \d+\.\d% of the vote \(opposition \d+\.\d%\)\.$/);
    expect(winProbability(expectedGovernmentShare(electionDay(5, 1).countries.TUR))).toBe(0);
    const lost = processPoliticalLayer(electionDay(5, 12345));
    expect(lost.campaignStatus).toBe('lost');
    expect(lost.speed).toBe(0);
    expect(lost.sitrep[0]).toMatch(/^CAMPAIGN LOST \/\/ The government lost the election: \d+\.\d% against the opposition's \d+\.\d%\.$/);
  });

  it('is deterministic and threads the seed back into state', () => {
    const a = processPoliticalLayer(electionDay(47, 99)), b = processPoliticalLayer(electionDay(47, 99));
    expect(a.campaignStatus).toBe(b.campaignStatus);
    expect(a.countries.TUR.politics.factions!.lastElection).toEqual(b.countries.TUR.politics.factions!.lastElection);
    expect(a.simulationSeed).not.toBe(99);
  });

  it('changes an AI government after a lost election instead of doing nothing', () => {
    const s = fresh();
    const loser = patchCountry({ ...s, day: 500 }, 'DEU', (c) => withFactions({ ...c, politics: { ...c.politics, approval: 5, stability: 50, electionDaysRemaining: 0 }, ai: { ...c.ai, strategicGoal: 'rearm' } }, { satisfaction: { ...satisfied(30), security: 80 }, terms: 2 }));
    const next = processPoliticalLayer(loser), deu = next.countries.DEU, f = deu.politics.factions!;
    expect(next.campaignStatus).toBe('active');
    expect(f.lastElection).toMatchObject({ day: 500, won: false });
    expect(f.terms).toBe(0);
    expect(f.honeymoonUntil).toBeGreaterThan(500);
    expect(deu.politics.approval).toBeGreaterThanOrEqual(45);
    expect(deu.politics.electionDaysRemaining).toBe(ELECTION_INTERVAL);
    expect(deu.ai.strategicGoal).toBe('grow_economy');
    // Factions the old government neglected are courted; the one it pampered loses ground.
    expect(f.satisfaction.labour).toBeGreaterThan(f.satisfaction.security);
    expect(next.sitrep.some((m) => /^ELECTION \/\/ Germany: the opposition won with \d+\.\d% of the vote/.test(m))).toBe(true);
  });
});

describe('0.88 E2: regime pressure, crises and coups', () => {
  it('keeps a healthy default autocracy free of regime pressure for four years', () => {
    let c = withFactions(fresh().countries.RUS);
    expect(legitimacy(c)).toBeGreaterThan(50);
    for (let d = 0; d < 1460; d++) c = { ...c, politics: { ...c.politics, factions: advanceFactions(c, factionsFor(c), d, false) } };
    expect(factionsFor(c).pressure).toBe(0);
    expect(coupRisk(withCountry(fresh(), c), 'RUS')!.coupChanceAtDeadline).toBe(0);
  }, 60_000);

  it('builds pressure only while legitimacy stays low', () => {
    let c = withFactions(fresh().countries.RUS);
    c = { ...c, politics: { ...c.politics, approval: 15, stability: 30 } };
    for (let d = 0; d < 60; d++) c = { ...c, politics: { ...c.politics, factions: advanceFactions(c, factionsFor(c), d, false) } };
    expect(factionsFor(c).pressure).toBeGreaterThan(10);
  });

  /** The player governs Russia with regime pressure at `pressure`. */
  function playerAutocracy(pressure: number, approval = 20, stability = 25): GameState {
    const s = fresh();
    return patchCountry({ ...s, day: 300, speed: 1, playerCountryId: 'RUS', selectedCountryId: 'RUS' }, 'RUS', (c) => withFactions({ ...c, politics: { ...c.politics, approval, stability } }, { pressure, satisfaction: { ...satisfied(50), security: 40 } }));
  }
  const runUntil = (s: GameState, day: number) => { let next = s; while (next.day < day && next.campaignStatus === 'active') next = processPoliticalLayer({ ...next, day: next.day + 1 }); return next; };

  it('warns the player first, then ends the campaign with a coup when the crisis is ignored', () => {
    const warned = processPoliticalLayer(playerAutocracy(REGIME_CRISIS_PRESSURE + 2));
    const crisis = warned.countries.RUS.politics.factions!.crisis!;
    expect(crisis).toMatchObject({ openedDay: 300, deadlineDay: 300 + CRISIS_DAYS });
    expect(warned.speed).toBe(0);
    expect(warned.campaignStatus).toBe('active');
    expect(warned.sitrep[0]).toBe(`REGIME // Security services warn of a plot against the government. Respond within ${CRISIS_DAYS} days.`);
    expect(coupChance(REGIME_CRISIS_PRESSURE + IGNORED_CRISIS_PENALTY)).toBe(1);
    const acknowledged = applyGameCommand(warned, { type: 'politics/acknowledgeCrisis' });
    expect(acknowledged.countries.RUS.politics.factions!.crisis!.acknowledged).toBe(true);
    const ended = runUntil(acknowledged, crisis.deadlineDay);
    expect(ended.campaignStatus).toBe('lost');
    expect(ended.sitrep[0]).toBe('CAMPAIGN LOST // Military officers seized power in Russia. The regime crisis was not contained.');
  }, 60_000);

  it('lets the player avert the coup with a costly response and sound government', () => {
    const warned = processPoliticalLayer(playerAutocracy(REGIME_CRISIS_PRESSURE + 2));
    const treasury = warned.countries.RUS.economy.treasury;
    const answered = applyGameCommand(warned, { type: 'politics/crisisResponse', option: 'concede' });
    const f = answered.countries.RUS.politics.factions!;
    expect(f.crisis!.response).toBe('concede');
    expect(answered.countries.RUS.economy.treasury).toBeCloseTo(treasury - scaledCostB(warned.countries.RUS, 6), 6);
    expect(f.pressure).toBeLessThan(REGIME_CRISIS_PRESSURE - 30);
    expect(f.concession).toMatchObject({ faction: 'security' });
    // A second answer to the same crisis is refused.
    expect(applyGameCommand(answered, { type: 'politics/crisisResponse', option: 'reform' }).countries.RUS.economy.treasury).toBe(answered.countries.RUS.economy.treasury);
    const governed = patchCountry(answered, 'RUS', (c) => ({ ...c, politics: { ...c.politics, approval: 60, stability: 60 } }));
    const after = runUntil(governed, f.crisis!.deadlineDay + 1);
    expect(after.campaignStatus).toBe('active');
    expect(after.countries.RUS.politics.factions!.crisis).toBeUndefined();
    expect(after.sitrep).toContain('REGIME // The regime crisis has passed. The government survived.');
  }, 60_000);

  it('applies the same crisis rules to the AI: it answers at once, and a coup changes its leadership', () => {
    const s = fresh();
    const shaky = patchCountry({ ...s, day: 300 }, 'SAU', (c) => withFactions({ ...c, politics: { ...c.politics, regime: 'monarchy', approval: 10, stability: 10 } }, { pressure: 95, satisfaction: { ...satisfied(30), security: 10 } }));
    const opened = processPoliticalLayer(shaky), crisis = opened.countries.SAU.politics.factions!.crisis!;
    expect(crisis.response).toBeDefined();
    expect(opened.speed).toBe(s.speed);
    // Pressure stays far above the coup range at the deadline: a coup is certain whatever the seed.
    const forced = patchCountry(opened, 'SAU', (c) => ({ ...c, politics: { ...c.politics, factions: { ...c.politics.factions!, pressure: 100 } } }));
    expect(crisisCoupChance(100, 10, true)).toBe(1);
    const after = runUntil(forced, crisis.deadlineDay);
    const sau = after.countries.SAU;
    expect(after.campaignStatus).toBe('active');
    expect(sau.politics.regime).toBe('autocracy');
    expect(sau.politics.approval).toBe(50);
    expect(sau.ai.strategicGoal).toBe('stabilize');
    expect(sau.politics.factions!.satisfaction.security).toBeGreaterThanOrEqual(70);
    expect(after.sitrep.some((m) => m.startsWith('COUP // Military officers seized power in Saudi Arabia'))).toBe(true);
  }, 60_000);

  it('cuts the coup chance for loyal security forces only when the government answered', () => {
    expect(crisisCoupChance(60, 70, true)).toBeCloseTo(coupChance(60) * 0.25, 9);
    expect(crisisCoupChance(60, 70, false)).toBe(coupChance(60 + IGNORED_CRISIS_PENALTY));
  });
});

describe('0.88 E2: concessions and saves', () => {
  it('charges a GDP-scaled concession, refuses a second one while it runs, and scales the price with GDP', () => {
    const s = fresh(), cost = scaledCostB(s.countries.TUR, CONCESSION_BASE_COST_B);
    const once = applyGameCommand(s, { type: 'politics/concession', faction: 'labour' });
    expect(once.countries.TUR.economy.treasury).toBeCloseTo(s.countries.TUR.economy.treasury - cost, 6);
    expect(once.countries.TUR.politics.factions!.concession).toEqual({ faction: 'labour', untilDay: s.day + 180 });
    const twice = applyGameCommand(once, { type: 'politics/concession', faction: 'business' });
    expect(twice.countries.TUR.economy.treasury).toBe(once.countries.TUR.economy.treasury);
    expect(scaledCostB(s.countries.USA, CONCESSION_BASE_COST_B)).toBeGreaterThan(cost * 10);
  });

  it('accepts saves with and without faction state and rejects a malformed one', () => {
    const legacy = fresh();
    expect(validSaveShape(legacy)).toBe(true);
    const ticked = tickGame(fresh());
    expect(ticked.countries.TUR.politics.factions).toBeDefined();
    expect(validSaveShape(JSON.parse(JSON.stringify(ticked)))).toBe(true);
    const f = ticked.countries.TUR.politics.factions!;
    expect(validFactionState(f, ticked.day)).toBe(true);
    expect(validFactionState({ ...f, satisfaction: { ...f.satisfaction, labour: 150 } }, ticked.day)).toBe(false);
    expect(validFactionState({ ...f, crisis: { openedDay: 9999, deadlineDay: 10044 } }, ticked.day)).toBe(false);
    const broken = patchCountry(ticked, 'TUR', (c) => ({ ...c, politics: { ...c.politics, factions: { ...f, pressure: Number.NaN } } }));
    expect(validSaveShape(JSON.parse(JSON.stringify(broken)))).toBe(false);
  });
});

describe('0.88 E2: translations', () => {
  it('gives every new string four non-empty translations that keep the template slots', () => {
    const slots = (text: string) => [...text.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort().join();
    for (const [key, values] of Object.entries(UI_CATALOG_088_E)) {
      expect(values).toHaveLength(4);
      for (const value of values) { expect(value.trim().length).toBeGreaterThan(0); expect(slots(value)).toBe(slots(key)); }
    }
    for (const key of ['ELECTION // {0} government re-elected with {1}% of the vote (opposition {2}%).', "CAMPAIGN LOST // The government lost the election: {0}% against the opposition's {1}%.", 'COUP // Military officers seized power in {0}; the new leadership promises order.', 'REGIME // Security services warn of a plot against the government. Respond within {0} days.'])
      expect(UI_CATALOG_088_E[key]).toBeDefined();
  });
});

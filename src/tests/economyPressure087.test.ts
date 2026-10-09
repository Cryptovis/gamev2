import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { CountryState, GameState } from '../domain/game';
import { applyGameCommand } from '../engine/commands';
import { tickGame } from '../engine/tick';
import { flights, processFlights } from '../engine/systems/flights';
import { relationFor } from '../engine/systems/diplomacy';
import { infrastructureInvestmentCost, investInfrastructure, processInfrastructureAI } from '../engine/systems/infrastructure';
import { activityPreview, letterCost, living, processWellbeing, startActivity } from '../engine/systems/livingEconomy';
import { processPrograms, programCost, startProgram } from '../engine/systems/nationalPrograms';
import { BASE_COST_B, actionEffectMultiplier, costScale, diplomaticMissionStatus, headroomFactor, MAX_COST_SCALE, MIN_COST_SCALE, recordActionUse, scaledCostB, sendDiplomaticMission } from '../engine/systems/policyPressure';
import { simulatePolitics } from '../engine/systems/politics';
import { strategicDecisionSpec } from '../engine/systems/strategicDecision';
import { validPressureState } from '../persistence/validation083';

let base: GameState | null = null;
const fresh = (): GameState => structuredClone(base ??= makeInitialState());
const treasury = (s: GameState, id = s.playerCountryId) => s.countries[id].economy.treasury;
const patchPlayer = (s: GameState, patch: (p: CountryState) => CountryState): GameState => ({ ...s, countries: { ...s.countries, [s.playerCountryId]: patch(s.countries[s.playerCountryId]) } });
const asPlayer = (s: GameState, id: string): GameState => ({ ...s, playerCountryId: id });
const calmEconomy = { next: { inflation: 2, unemployment: 5 }, dailyGrowthRate: 0 } as never;
const noShortage = { foodShortage: false, oilShortage: false } as never;

describe('C15: flat costs scale with GDP', () => {
  it('charges the reference economy the base cost and bounds microstates and superpowers', () => {
    const s = fresh();
    expect(costScale(s.countries.TUR)).toBeCloseTo(1, 5);
    expect(costScale(s.countries.AND)).toBe(MIN_COST_SCALE);
    expect(costScale(s.countries.USA)).toBe(MAX_COST_SCALE);
    expect(scaledCostB(s.countries.TUR, 2)).toBe(2);
    expect(scaledCostB(s.countries.USA, 2)).toBe(40);
    expect(scaledCostB(s.countries.AND, 2)).toBe(0.04);
    // A microstate can afford the action with its opening treasury; the USA pays more than two days of tax revenue.
    expect(scaledCostB(s.countries.AND, BASE_COST_B.alliance)).toBeLessThan(treasury(s, 'AND'));
    expect(scaledCostB(s.countries.USA, BASE_COST_B.diplomaticMission)).toBeGreaterThan(s.countries.USA.economy.gdp * 0.22 / 365 * 2);
  });

  it('charges a large player more and a microstate player less for the same command', () => {
    for (const [id, expected] of [['USA', 40], ['AND', 0.04]] as const) {
      const s = asPlayer(fresh(), id);
      const n = applyGameCommand(s, { type: 'diplomacy/improveRelations', targetCountryId: 'GRC' });
      expect(treasury(s) - treasury(n)).toBeCloseTo(expected, 6);
    }
    const usa = asPlayer(fresh(), 'USA');
    const research = applyGameCommand(usa, { type: 'development/economicResearch' });
    expect(treasury(usa) - treasury(research)).toBeCloseTo(BASE_COST_B.economicResearch * MAX_COST_SCALE, 6);
  });

  it('scales treaty, programme, activity, letter and infrastructure fees the same way', () => {
    const s = asPlayer(fresh(), 'USA');
    s.countries.USA.diplomacy.relations.GBR = { ...relationFor(s.countries.USA, 'GBR'), score: 90 };
    const pact = applyGameCommand(s, { type: 'diplomacy/signNonAggression', targetCountryId: 'GBR' });
    expect(treasury(s) - treasury(pact)).toBeCloseTo(BASE_COST_B.nonAggression * MAX_COST_SCALE, 6);
    expect(programCost(s, 'jobs')).toBe(60);
    expect(treasury(s) - treasury(startProgram(s, 'jobs'))).toBeCloseTo(60, 6);
    expect(activityPreview(s, 'festival').cost).toBe(4);
    expect(letterCost(s, 'USA', 'trade_pact')).toBe(100);
    expect(letterCost(s, 'AND', 'trade_pact')).toBe(0.1);
    expect(infrastructureInvestmentCost(s, 'USA', 'roads')).toBe(80);
    expect(treasury(s) - treasury(investInfrastructure(s, 'USA', 'roads'))).toBeCloseTo(80, 6);
  });

  it('lets a small AI economy invest in infrastructure at its own scaled price', () => {
    const s = { ...fresh(), day: 30 };
    const weak = { ...s.infrastructure.AND, roads: 20, rail: 20, hubs: 20 };
    const n = processInfrastructureAI({ ...s, infrastructure: { ...s.infrastructure, AND: weak } });
    const paid = treasury(s, 'AND') - treasury(n, 'AND');
    expect(paid).toBeGreaterThan(0);
    expect(paid).toBeLessThan(0.2);
  });

  it('shows the engine cost in the decision dialog', () => {
    const s = asPlayer(fresh(), 'USA');
    const spec = strategicDecisionSpec(s, 'diplomatic_mission', 'GRC');
    expect(spec?.impacts.find(i => i.label === 'Treasury')?.value).toBe('-$40B');
  });
});

describe('C15: "improve relations" has a per-target cooldown and fading goodwill', () => {
  it('refuses a second mission to the same target within 30 days without charging', () => {
    const s = fresh();
    const first = applyGameCommand(s, { type: 'diplomacy/improveRelations', targetCountryId: 'GRC' });
    // 0.89: the goodwill travels with the delegation's jet and applies on arrival (flightHooks089.test.ts).
    const landed = processFlights({ ...first, day: flights(first)[0].arriveDay });
    const gain = relationFor(landed.countries.TUR, 'GRC').score - relationFor(s.countries.TUR, 'GRC').score;
    expect(gain).toBe(10);
    const again = applyGameCommand(first, { type: 'diplomacy/improveRelations', targetCountryId: 'GRC' });
    expect(treasury(again)).toBe(treasury(first));
    expect(relationFor(again.countries.TUR, 'GRC').score).toBe(relationFor(first.countries.TUR, 'GRC').score);
    expect(again.sitrep[0]).toContain('30 days');
    // Another target is unaffected.
    const other = applyGameCommand(first, { type: 'diplomacy/improveRelations', targetCountryId: 'BRA' });
    expect(treasury(first) - treasury(other)).toBe(2);
  });

  it('gives less goodwill when the mission is repeated as soon as the cooldown ends', () => {
    const s = fresh();
    const first = sendDiplomaticMission(s, 'TUR', 'GRC');
    const later = { ...first, day: first.day + 30 };
    const status = diplomaticMissionStatus(later, 'TUR', 'GRC');
    expect(status.allowed).toBe(true);
    expect(status.gain).toBeLessThan(10);
    expect(status.gain).toBeGreaterThan(0);
    expect(diplomaticMissionStatus({ ...first, day: first.day + 29 }, 'TUR', 'GRC').allowed).toBe(false);
  });

  it('applies the same rule to any actor (AI parity)', () => {
    const s = fresh();
    const n = sendDiplomaticMission(s, 'BRA', 'ARG');
    expect(treasury(s, 'BRA') - treasury(n, 'BRA')).toBeCloseTo(scaledCostB(s.countries.BRA, 2), 6);
    expect(sendDiplomaticMission(n, 'BRA', 'ARG')).toBe(n);
  });
});

describe('C4: domestic activities have cooldowns and diminishing returns', () => {
  it('refuses repeating religious outreach and civic campaigns on the same day', () => {
    for (const type of ['society/religiousOutreach', 'society/civicCampaign'] as const) {
      const s = fresh();
      const once = applyGameCommand(s, { type });
      expect(treasury(s) - treasury(once)).toBe(4);
      const twice = applyGameCommand(once, { type });
      expect(twice.countries.TUR).toBe(once.countries.TUR);
      expect(twice.sitrep[0]).toContain('14 days');
    }
  });

  it('weakens a repeated instant programme once its cooldown has passed', () => {
    const s = patchPlayer(fresh(), p => ({ ...p, politics: { ...p.politics, approval: 40 } }));
    const once = applyGameCommand(s, { type: 'society/religiousOutreach' });
    const firstGain = once.countries.TUR.politics.approval - 40;
    const reset = patchPlayer({ ...once, day: once.day + 14 }, p => ({ ...p, politics: { ...p.politics, approval: 40 } }));
    const twice = applyGameCommand(reset, { type: 'society/religiousOutreach' });
    const secondGain = twice.countries.TUR.politics.approval - 40;
    expect(firstGain).toBeCloseTo(0.5, 6);
    expect(secondGain).toBeGreaterThan(0);
    expect(secondGain).toBeLessThan(firstGain * 0.8);
  });

  it('lets festivals, games and relief tire the same public (shared pool)', () => {
    const s = fresh();
    const festival = startActivity(s, 'festival');
    expect(living(festival).activities[0].strength).toBe(1);
    const sports = startActivity(festival, 'sports');
    expect(living(sports).activities[0].strength).toBeLessThan(1);
    expect(actionEffectMultiplier(sports, 'TUR', 'activity/festival')).toBeLessThan(actionEffectMultiplier(sports, 'TUR', 'activity/sports') + 1e-9);
    // Fatigue fades: after a quiet half-year the effect is almost fully back.
    expect(actionEffectMultiplier({ ...sports, day: sports.day + 180 }, 'TUR', 'activity/festival')).toBeGreaterThan(0.95);
  });

  it('applies the stored strength when programmes and activities pay out', () => {
    const s = patchPlayer(fresh(), p => ({ ...p, politics: { ...p.politics, approval: 40 } }));
    const tired = recordActionUse(recordActionUse(s, 'TUR', 'program/jobs'), 'TUR', 'program/jobs');
    const started = startProgram(tired, 'jobs');
    const program = started.world.programs![0];
    expect(program.strength).toBeLessThan(0.5);
    const done = processPrograms({ ...started, day: program.readyDay });
    expect(done.countries.TUR.politics.approval - 40).toBeCloseTo(program.strength!, 6);
    // Older saves without `strength` keep the full effect.
    const legacy = processPrograms({ ...started, day: program.readyDay, world: { ...started.world, programs: [{ ...program, strength: undefined }] } });
    expect(legacy.countries.TUR.politics.approval - 40).toBeCloseTo(1, 6);

    const act = startActivity(tired, 'festival');
    const day1 = processWellbeing({ ...act, day: act.day + 1 });
    expect(day1.countries.TUR.politics.approval - 40).toBeCloseTo(0.5 * living(act).activities[0].strength!, 6);
  });

  it('damps paid mood gains near the top of the scale', () => {
    expect(headroomFactor(40)).toBe(1);
    expect(headroomFactor(75)).toBeCloseTo(0.5, 6);
    expect(headroomFactor(100)).toBe(0);
    const s = patchPlayer(fresh(), p => ({ ...p, politics: { ...p.politics, approval: 96 } }));
    const n = applyGameCommand(s, { type: 'society/religiousOutreach' });
    expect(n.countries.TUR.politics.approval - 96).toBeLessThan(0.05);
  });
});

describe('C4: high tax is not a free lunch', () => {
  it('costs much more approval per day at 60% than the old capped penalty', () => {
    const s = fresh();
    const at = (rate: number) => {
      const c = { ...s.countries.TUR, economy: { ...s.countries.TUR.economy, taxRate: rate } };
      return simulatePolitics(c, calmEconomy, noShortage).approval - c.politics.approval;
    };
    expect(at(22)).toBeCloseTo(0, 6);
    expect(at(30)).toBeCloseTo(-0.02, 6);
    expect(at(60)).toBeLessThan(-0.18);
  });

  it('no longer lets 60% tax plus daily activity spam hold approval at the ceiling', () => {
    let s = applyGameCommand(fresh(), { type: 'economy/setTaxRate', rate: 60 });
    const start = s.countries.TUR.politics.approval;
    for (let day = 0; day < 120; day++) {
      s = { ...s, activeEvent: null, activeAdvisor: null, world: { ...s.world, tutorial: { ...s.world.tutorial, active: false }, living: s.world.living ? { ...s.world.living, advice: { ...s.world.living.advice, active: null }, notice: undefined } : s.world.living } };
      for (const type of ['society/religiousOutreach', 'society/civicCampaign'] as const) s = applyGameCommand(s, { type });
      for (const kind of ['festival', 'sports', 'food_relief'] as const) s = applyGameCommand(s, { type: 'activity/start', kind });
      for (const kind of ['jobs', 'health'] as const) s = applyGameCommand(s, { type: 'program/start', kind });
      s = tickGame(s);
    }
    // Before 0.87 this strategy reached ~100 approval within 120 days.
    expect(s.countries.TUR.politics.approval).toBeLessThan(start + 15);
    expect(s.countries.TUR.politics.approval).toBeLessThan(80);
  }, 120_000);
});

describe('save compatibility for the optional 0.87 fields', () => {
  it('accepts saves with and without fatigue/strength and rejects corrupt values', () => {
    const s = fresh();
    expect(validPressureState(s)).toBe(true);
    const used = startProgram(startActivity(recordActionUse(s, 'TUR', 'relations/GRC'), 'festival'), 'jobs');
    expect(used.world.actionFatigue).toBeDefined();
    expect(validPressureState(JSON.parse(JSON.stringify(used)))).toBe(true);
    expect(validPressureState({ ...used, world: { ...used.world, actionFatigue: { 'TUR|relations/GRC': { value: Number.NaN, day: 1 } } } })).toBe(false);
    expect(validPressureState({ ...used, world: { ...used.world, actionFatigue: { 'TUR|x': { value: 1, day: used.day + 5 } } } })).toBe(false);
    expect(validPressureState({ ...used, world: { ...used.world, actionFatigue: { nokey: { value: 1, day: 1 } } } })).toBe(false);
    expect(validPressureState({ ...used, world: { ...used.world, programs: [{ ...used.world.programs![0], strength: 2 }] } })).toBe(false);
  });
});

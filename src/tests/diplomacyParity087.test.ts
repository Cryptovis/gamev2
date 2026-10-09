import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { DiplomaticRelation, GameState, IntelOperation } from '../domain/game';
import { applyGameCommand } from '../engine/commands';
import { nextRandom } from '../engine/rng';
import { openEmbassy, relationFor } from '../engine/systems/diplomacy';
import { resolveDiplomaticOffer } from '../engine/systems/diplomaticOffers';
import { INTEL_HISTORY_LIMIT, processIntelOperations } from '../engine/systems/espionage';
import { letterCost } from '../engine/systems/livingEconomy';
import { agreementAcceptanceChance, agreementCost, agreementEligibility, aiProposeAgreement, PACT_STRAIN_GRACE_DAYS, processPactStrain, PROPOSAL_RETRY_DAYS } from '../engine/systems/treaties';
import { processWorldDiplomacy } from '../engine/systems/worldDynamics';
import { tickGame } from '../engine/tick';
import { migrateSave } from '../persistence/migrations';

// Keep only the listed countries sovereign so AI target choice is predictable.
function isolate(state: GameState, keep: string[]): GameState {
  return { ...state, countries: Object.fromEntries(Object.entries(state.countries).map(([id, c]) => [id, keep.includes(id) ? c : { ...c, annexedBy: state.playerCountryId }])) };
}
function setRelation(state: GameState, aId: string, bId: string, patch: Partial<DiplomaticRelation>): GameState {
  const a = state.countries[aId], b = state.countries[bId];
  const ra = { ...relationFor(a, bId), ...patch }, rb = { ...relationFor(b, aId), ...patch };
  return { ...state, countries: { ...state.countries, [aId]: { ...a, diplomacy: { ...a.diplomacy, relations: { ...a.diplomacy.relations, [bId]: ra } } }, [bId]: { ...b, diplomacy: { ...b.diplomacy, relations: { ...b.diplomacy.relations, [aId]: rb } } } } };
}
function withEconomy(state: GameState, id: string, patch: Partial<GameState['countries'][string]['economy']>): GameState {
  const c = state.countries[id];
  return { ...state, countries: { ...state.countries, [id]: { ...c, economy: { ...c.economy, ...patch } } } };
}
// Two AI states that want an alliance: embassy, trade and non-aggression already in place, relations +80.
function allianceCandidates(): GameState {
  let s = isolate(makeInitialState(), ['TUR', 'DEU', 'FRA']);
  s = openEmbassy(s, 'DEU', 'FRA');
  return setRelation(s, 'DEU', 'FRA', { score: 80, status: 'ally', treaties: ['trade', 'nonAggression'], sanctions: false });
}
function runReviews(state: GameState, cycles: number): GameState {
  let s = state;
  for (let i = 1; i <= cycles; i++) s = processWorldDiplomacy({ ...s, day: i * 14 });
  return s;
}
const treasury = (s: GameState, ...ids: string[]) => ids.reduce((sum, id) => sum + s.countries[id].economy.treasury, 0);

describe('0.87 D8: one treaty rule set for the player and the AI', () => {
  it('AI-to-AI alliances charge the same fee the player pays', () => {
    const before = allianceCandidates();
    const after = runReviews(before, 40);
    expect(relationFor(after.countries.DEU, 'FRA').treaties).toContain('alliance');
    expect(agreementCost(before, 'DEU', 'alliance')).toBe(10);
    expect(treasury(before, 'DEU', 'FRA') - treasury(after, 'DEU', 'FRA')).toBeCloseTo(10, 6);
  });

  it('AI-to-AI alliances are refused when the proposer cannot pay', () => {
    let s = allianceCandidates();
    s = withEconomy(withEconomy(s, 'DEU', { treasury: 0 }), 'FRA', { treasury: 0 });
    const after = runReviews(s, 40);
    expect(relationFor(after.countries.DEU, 'FRA').treaties).not.toContain('alliance');
    expect(agreementEligibility(s, 'DEU', 'FRA', 'alliance').block).toBe('treasury');
  });

  it('scales the fee with GDP and the player alliance command uses it', () => {
    let s = isolate(makeInitialState(), ['TUR', 'DEU', 'FRA']);
    s = withEconomy(s, 'TUR', { gdp: 40, treasury: 5 });
    s = setRelation(s, 'TUR', 'DEU', { score: 70, status: 'ally', treaties: [], sanctions: false });
    expect(agreementCost(s, 'TUR', 'alliance')).toBe(1);
    expect(agreementCost(s, 'DEU', 'alliance')).toBe(10);
    const next = applyGameCommand(s, { type: 'diplomacy/signAlliance', targetCountryId: 'DEU' });
    expect(relationFor(next.countries.TUR, 'DEU').treaties).toContain('alliance');
    expect(next.countries.TUR.economy.treasury).toBeCloseTo(4, 6);
    // Same threshold for the player: +60 raw score.
    const low = setRelation(s, 'TUR', 'FRA', { score: 59, status: 'friendly', treaties: [], sanctions: false });
    expect(applyGameCommand(low, { type: 'diplomacy/signAlliance', targetCountryId: 'FRA' }).countries.TUR.economy.treasury).toBe(5);
  });

  it('AI trade proposals use the acceptance roll and the 14-day retry cooldown', () => {
    let s = isolate(makeInitialState(), ['TUR', 'DEU', 'FRA']);
    s = setRelation(s, 'DEU', 'FRA', { score: 0, status: 'neutral', treaties: [], sanctions: false });
    const chance = agreementAcceptanceChance(s, 'DEU', 'FRA', 'trade');
    expect(chance).toBeGreaterThan(0);
    expect(chance).toBeLessThan(1);
    let seed = 1;
    while (nextRandom(seed).value < chance) seed++;
    const rejected = aiProposeAgreement({ ...s, simulationSeed: seed, day: 30 }, 'DEU', 'FRA', 'trade');
    expect(rejected.accepted).toBe(false);
    expect(rejected.state.simulationSeed).toBe(nextRandom(seed).seed);
    expect(relationFor(rejected.state.countries.DEU, 'FRA').treaties).not.toContain('trade');
    expect(treasury(rejected.state, 'DEU')).toBe(treasury(s, 'DEU'));
    expect(agreementEligibility({ ...rejected.state, day: 30 + PROPOSAL_RETRY_DAYS - 1 }, 'DEU', 'FRA', 'trade').block).toBe('cooldown');
    expect(agreementEligibility({ ...rejected.state, day: 30 + PROPOSAL_RETRY_DAYS }, 'DEU', 'FRA', 'trade').allowed).toBe(true);
    seed = 1;
    while (nextRandom(seed).value >= chance) seed++;
    const accepted = aiProposeAgreement({ ...s, simulationSeed: seed }, 'DEU', 'FRA', 'trade');
    expect(accepted.accepted).toBe(true);
    expect(relationFor(accepted.state.countries.FRA, 'DEU').treaties).toContain('trade');
    expect(treasury(s, 'DEU') - treasury(accepted.state, 'DEU')).toBeCloseTo(agreementCost(s, 'DEU', 'trade'), 6);
  });

  it('never signs agreements with the player without consent', () => {
    let s = isolate(makeInitialState(), ['TUR', 'DEU']);
    s = setRelation(s, 'TUR', 'DEU', { score: 90, status: 'ally', treaties: [], sanctions: false });
    expect(aiProposeAgreement(s, 'DEU', 'TUR', 'alliance').accepted).toBe(false);
    expect(relationFor(runReviews(s, 20).countries.TUR, 'DEU').treaties).toEqual([]);
  });

  it('shared letter fees follow each country GDP', () => {
    let s = withEconomy(makeInitialState(), 'TUR', { gdp: 100 });
    s = setRelation(s, 'TUR', 'GRC', { score: 20, status: 'friendly', treaties: [], sanctions: false });
    expect(letterCost(s, 'TUR', 'trade_pact')).toBe(1.25);
    expect(letterCost(s, 'GRC', 'trade_pact')).toBeCloseTo(5 * 245 / 400, 2);
    s = { ...s, diplomaticOffers: [{ id: 'OFFER-TRD-GRC-14', type: 'trade_pact', senderId: 'GRC', receiverId: 'TUR', createdDay: 1, expiresDay: 30, message: 'Trade framework' }] };
    const accepted = resolveDiplomaticOffer(s, 'OFFER-TRD-GRC-14', true);
    expect(relationFor(accepted.countries.TUR, 'GRC').treaties).toContain('trade');
    expect(s.countries.TUR.economy.treasury - accepted.countries.TUR.economy.treasury).toBeCloseTo(0.625, 6);
  });
});

describe('0.87 D12: separate intel dice, bounded history, pacts that follow relations', () => {
  function operationState(seed: number): { state: GameState; op: IntelOperation } {
    const s = makeInitialState(), src = s.countries.TUR, t = s.countries.BGR;
    const op: IntelOperation = { id: 'intel-sabotage', type: 'sabotage_industry', sourceCountryId: 'TUR', targetCountryId: 'BGR', startedDay: 1, completeDay: 5, status: 'active', successChance: 0, resultSummary: '' };
    const state: GameState = { ...s, day: 5, simulationSeed: seed, intelOperations: { [op.id]: op }, countries: { ...s.countries,
      TUR: { ...src, intelligence: { networkStrength: 0, counterIntelligence: 0, intelConfidence: 0 }, military: { ...src.military, technology: 0 }, ministries: { ...src.ministries, efficiency: { ...src.ministries.efficiency, intelligence: 0 } } },
      BGR: { ...t, intelligence: { ...t.intelligence, counterIntelligence: 100 }, politics: { ...t.politics, stability: 100 }, ministries: { ...t.ministries, efficiency: { ...t.ministries.efficiency, intelligence: 100 } } } } };
    return { state, op };
  }

  it('rolls success and detection independently', () => {
    // Weak source vs strong defender: success chance 14%, detection 64%. With one shared die success was impossible.
    let successes = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const { state, op } = operationState(seed * 7919);
      const next = processIntelOperations(state);
      if (next.intelOperations[op.id].status === 'success') successes++;
      expect(next.simulationSeed).toBe(nextRandom(nextRandom(state.simulationSeed).seed).seed);
    }
    expect(successes).toBeGreaterThan(0);
  });

  it('keeps active operations and a bounded resolved history', () => {
    const s = makeInitialState();
    const ops: Record<string, IntelOperation> = {};
    for (let i = 0; i < 60; i++) ops[`old-${i}`] = { id: `old-${i}`, type: 'gather_intelligence', sourceCountryId: 'TUR', targetCountryId: 'BGR', startedDay: i, completeDay: i + 5, status: 'failed', successChance: 0.5, resultSummary: '' };
    ops.live = { id: 'live', type: 'gather_intelligence', sourceCountryId: 'TUR', targetCountryId: 'GRC', startedDay: 100, completeDay: 200, status: 'active', successChance: 0, resultSummary: '' };
    ops.due = { id: 'due', type: 'gather_intelligence', sourceCountryId: 'TUR', targetCountryId: 'BGR', startedDay: 100, completeDay: 105, status: 'active', successChance: 0, resultSummary: '' };
    const next = processIntelOperations({ ...s, day: 105, intelOperations: ops });
    const resolved = Object.values(next.intelOperations).filter((op) => op.status !== 'active');
    expect(resolved).toHaveLength(INTEL_HISTORY_LIMIT);
    expect(next.intelOperations.live.status).toBe('active');
    expect(next.intelOperations.due.status).not.toBe('active');
    expect(next.intelOperations['old-59']).toBeDefined();
    expect(next.intelOperations['old-0']).toBeUndefined();
  });

  it('dissolves an alliance after the recovery period below 50/100, with a sitrep', () => {
    let s = setRelation(makeInitialState(), 'TUR', 'DEU', { score: -10, status: 'neutral', treaties: ['alliance'], sanctions: false });
    s = processPactStrain({ ...s, day: 100 });
    expect(relationFor(s.countries.TUR, 'DEU').allianceStrainSinceDay).toBe(100);
    expect(s.sitrep[0]).toBe('DIPLOMACY // Alliance with Germany at risk: relations below 50/100. Restore at least 50/100 within 14 days.');
    s = processPactStrain({ ...s, day: 100 + PACT_STRAIN_GRACE_DAYS - 1 });
    expect(relationFor(s.countries.DEU, 'TUR').treaties).toContain('alliance');
    s = processPactStrain({ ...s, day: 100 + PACT_STRAIN_GRACE_DAYS });
    expect(relationFor(s.countries.TUR, 'DEU').treaties).not.toContain('alliance');
    expect(relationFor(s.countries.DEU, 'TUR').treaties).not.toContain('alliance');
    expect(relationFor(s.countries.TUR, 'DEU').allianceStrainSinceDay).toBeUndefined();
    expect(s.sitrep[0]).toBe('DIPLOMACY // Alliance with Germany dissolved after 14 days below 50/100.');
  });

  it('keeps a pact whose relations recover in time and lapses non-aggression only when hostile', () => {
    let s = setRelation(makeInitialState(), 'TUR', 'DEU', { score: -10, status: 'neutral', treaties: ['alliance', 'nonAggression'], sanctions: false });
    s = processPactStrain({ ...s, day: 100 });
    s = setRelation(s, 'TUR', 'DEU', { score: 10 });
    s = processPactStrain({ ...s, day: 105 });
    s = processPactStrain({ ...s, day: 130 });
    expect(relationFor(s.countries.TUR, 'DEU').treaties).toEqual(['alliance', 'nonAggression']);
    expect(relationFor(s.countries.TUR, 'DEU').allianceStrainSinceDay).toBeUndefined();
    s = setRelation(s, 'TUR', 'DEU', { score: -60, status: 'hostile' });
    s = processPactStrain({ ...s, day: 200 });
    s = processPactStrain({ ...s, day: 214 });
    expect(relationFor(s.countries.TUR, 'DEU').treaties).toEqual([]);
    expect(s.sitrep).toContain('DIPLOMACY // Non-aggression pact with Germany lapsed after 14 days below 25/100.');
  });

  it('runs in the daily tick for AI pairs', () => {
    let s = makeInitialState();
    s = { ...s, eventCooldownUntil: 10_000, advisorCooldownUntil: 10_000, world: { ...s.world, tutorial: { ...s.world.tutorial, active: false } } };
    s = setRelation(s, 'DEU', 'FRA', { score: -70, status: 'hostile', treaties: ['alliance'], sanctions: false });
    for (let i = 0; i <= PACT_STRAIN_GRACE_DAYS + 1; i++) s = tickGame(s);
    expect(relationFor(s.countries.DEU, 'FRA').treaties).not.toContain('alliance');
  });

  it('accepts saves with and without the new optional relation fields', () => {
    const plain = makeInitialState();
    expect(migrateSave(plain)).not.toBeNull();
    const strained = setRelation(plain, 'TUR', 'DEU', { treaties: ['alliance'], allianceStrainSinceDay: plain.day, nonAggressionStrainSinceDay: undefined, proposalRetryDay: { trade: plain.day + 14 } });
    expect(migrateSave(strained)).not.toBeNull();
    expect(migrateSave(setRelation(plain, 'TUR', 'DEU', { allianceStrainSinceDay: plain.day + 5 }))).toBeNull();
    expect(migrateSave(setRelation(plain, 'TUR', 'DEU', { proposalRetryDay: { trade: Number.NaN } }))).toBeNull();
  });
});

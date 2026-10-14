import {leaderModifiers} from './leaderPerks';
import { activeCountries } from '../../domain/sovereignty';
import type { CountryState, DiplomaticRelation, GameState, TreatyType } from '../../domain/game';
import { nextRandom } from '../rng';
import { agreementFlightLabel, diplomaticFlight } from './flightHooks';
import { costScale, scaledCostB } from './policyPressure';
import { addTreaty, applyThirdPartyTradeReaction, changeRelations, embassyFor, openEmbassy, relationFor, relationshipIndex, statusFromScore, updateBilateralRelation } from './diplomacy';

/**
 * One rule set for every diplomatic agreement (audit D8). The player's commands, letters and offers and the
 * AI-to-AI diplomacy all read eligibility, fees, acceptance odds and retry cooldowns from this module.
 */
export type AgreementKind = TreatyType | 'embassy';
/** Agreements that the partner may reject (they answer a proposal); pacts are signed outright once eligible. */
export type ProposedAgreementKind = 'embassy' | 'trade';

/** Base fee ($B at the reference GDP); every country pays it scaled to its GDP (audit C15, policyPressure.costScale). */
export const AGREEMENT_BASE_COST: Record<AgreementKind, number> = { embassy: 3, trade: 5, nonAggression: 4, alliance: 10 };
/** Trade uses the 0-100 relationship index; pacts use the raw -100..100 score, as the player's commands always did. */
export const TRADE_MIN_INDEX = 20;
export const NON_AGGRESSION_MIN_SCORE = 25;
export const ALLIANCE_MIN_SCORE = 60;
/** Days before the same proposer may repeat a rejected proposal (same as the player's letter cooldown). */
export const PROPOSAL_RETRY_DAYS = 14;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const agreementCostScale = (country: CountryState) => costScale(country);

export function agreementCost(state: GameState, countryId: string, kind: AgreementKind): number {
  const country = state.countries[countryId];
  const base = AGREEMENT_BASE_COST[kind];
  return country ? scaledCostB(country, base)*(kind==='embassy'?leaderModifiers(state,countryId).embassy:1) : base;
}

/** "4", "0.25": the number shown in "$...B" labels. */
export const formatBillions = (value: number) => String(Number(value.toFixed(2)));

export type AgreementBlock = 'invalid' | 'active' | 'war' | 'sanctions' | 'relations' | 'cooldown' | 'treasury';
export interface AgreementEligibility { allowed: boolean; block?: AgreementBlock; cost: number }

/**
 * Can `proposerId` conclude `kind` with `partnerId` today? `proposerShare` is the part of the fee the proposer pays;
 * the partner pays the rest from its own (GDP-scaled) fee. `cost` is the proposer's full fee.
 */
export function agreementEligibility(state: GameState, proposerId: string, partnerId: string, kind: AgreementKind, proposerShare = 1): AgreementEligibility {
  const proposer = state.countries[proposerId], partner = state.countries[partnerId];
  const cost = agreementCost(state, proposerId, kind);
  const blocked = (block: AgreementBlock): AgreementEligibility => ({ allowed: false, block, cost });
  if (!proposer || !partner || proposer.id === partner.id) return blocked('invalid');
  const relation = relationFor(proposer, partner.id);
  if (kind === 'embassy' ? !!embassyFor(state, proposer.id, partner.id) : relation.treaties.includes(kind)) return blocked('active');
  if (relation.status === 'war') return blocked('war');
  if ((kind === 'embassy' || kind === 'trade') && (relation.sanctions || proposer.globalSanctions || partner.globalSanctions)) return blocked('sanctions');
  if (!meetsRelationRule(relation, kind)) return blocked('relations');
  if (kind === 'embassy' || kind === 'trade') {
    const retryDay = relation.proposalRetryDay?.[kind];
    if (retryDay !== undefined && state.day < retryDay) return blocked('cooldown');
  }
  const partnerFee = agreementCost(state, partner.id, kind) * (1 - proposerShare);
  if (proposer.economy.treasury < cost * proposerShare || (partnerFee > 0 && partner.economy.treasury < partnerFee)) return blocked('treasury');
  return { allowed: true, cost };
}

function meetsRelationRule(relation: DiplomaticRelation, kind: AgreementKind): boolean {
  if (kind === 'trade') return relationshipIndex(relation) >= TRADE_MIN_INDEX;
  if (kind === 'nonAggression') return relation.score >= NON_AGGRESSION_MIN_SCORE;
  if (kind === 'alliance') return relation.score >= ALLIANCE_MIN_SCORE;
  return true;
}

/** Probability that the partner accepts a proposal (0 when the rules block it). */
export function agreementAcceptanceChance(state: GameState, proposerId: string, partnerId: string, kind: ProposedAgreementKind): number {
  const partner = state.countries[partnerId], proposer = state.countries[proposerId];
  if (!partner || !proposer) return 0;
  const check = agreementEligibility(state, proposerId, partnerId, kind);
  if (!check.allowed && check.block !== 'active' && check.block !== 'cooldown') return 0;
  const relation = relationFor(proposer, partnerId), index = relationshipIndex(relation);
  if (kind === 'embassy') return clamp((relation.score + 20) / 100, 0.05, 0.95);
  const need = partner.resources.food < 30 || partner.resources.oil < 20;
  const base = index > 50 ? 0.75 + (index - 51) / 49 * 0.15 : 0.1 + index / 50 * 0.4;
  return clamp(base + (need ? 0.1 : 0), 0.05, 0.95);
}

/** Pays the fees and applies the agreement's effects. Returns `state` unchanged when the rules block it. */
export function concludeAgreement(state: GameState, proposerId: string, partnerId: string, kind: AgreementKind, proposerShare = 1): GameState {
  if (!agreementEligibility(state, proposerId, partnerId, kind, proposerShare).allowed) return state;
  const proposerFee = agreementCost(state, proposerId, kind) * proposerShare;
  const partnerFee = agreementCost(state, partnerId, kind) * (1 - proposerShare);
  let next = payFee(payFee(state, proposerId, proposerFee), partnerId, partnerFee);
  if (kind === 'embassy') return openEmbassy(next, proposerId, partnerId);
  next = addTreaty(next, proposerId, partnerId, kind);
  if (kind === 'trade') {
    next = changeRelations(next, proposerId, partnerId, 4);
    next = applyThirdPartyTradeReaction(next, proposerId, partnerId);
  }
  if (kind === 'alliance') next = changeRelations(next, proposerId, partnerId, 8);
  return next;
}

function payFee(state: GameState, countryId: string, fee: number): GameState {
  const country = state.countries[countryId];
  if (!country || fee <= 0) return state;
  return { ...state, countries: { ...state.countries, [countryId]: { ...country, economy: { ...country.economy, treasury: country.economy.treasury - fee } } } };
}

/**
 * AI-to-AI proposal under the player's rules: same eligibility and fee (proposer pays, as when the player proposes),
 * the partner answers embassy and trade proposals with the same seeded acceptance roll, and a rejection starts the
 * same retry cooldown. Agreements with the player always need the player's consent (letters and offers), so the
 * player is never a party here.
 */
export function aiProposeAgreement(state: GameState, proposerId: string, partnerId: string, kind: AgreementKind): { state: GameState; accepted: boolean } {
  if (proposerId === state.playerCountryId || partnerId === state.playerCountryId) return { state, accepted: false };
  if (!agreementEligibility(state, proposerId, partnerId, kind).allowed) return { state, accepted: false };
  let next = state;
  if (kind === 'embassy' || kind === 'trade') {
    const roll = nextRandom(state.simulationSeed);
    next = { ...state, simulationSeed: roll.seed };
    if (roll.value >= agreementAcceptanceChance(state, proposerId, partnerId, kind)) {
      const retryDay = state.day + PROPOSAL_RETRY_DAYS;
      next = updateBilateralRelation(next, proposerId, partnerId, (relation) => {
        const retry = relation.proposalRetryDay ?? {};
        return { ...relation, proposalRetryDay: kind === 'embassy' ? { ...retry, embassy: retryDay } : { ...retry, trade: retryDay } };
      });
      return { state: next, accepted: false };
    }
  }
  const concluded = concludeAgreement(next, proposerId, partnerId, kind);
  // 0.89: a new AI agreement may show a delegation flight; AI–AI flights are rate-limited (flightHooks.ts).
  return concluded === next ? { state: concluded, accepted: false } : { state: diplomaticFlight(concluded, proposerId, partnerId, agreementFlightLabel(kind)), accepted: true };
}

/**
 * Audit D12: pacts follow relations. Like trade pacts (0.82), an alliance or non-aggression pact whose relationship
 * index stays below its floor gets a recovery period and then ends.
 */
export const PACT_STRAIN_GRACE_DAYS = 14;
export const ALLIANCE_STRAIN_INDEX = 50;
export const NON_AGGRESSION_STRAIN_INDEX = 25;
type PactKind = 'alliance' | 'nonAggression';
type StrainField = 'allianceStrainSinceDay' | 'nonAggressionStrainSinceDay';
const PACT_STRAIN: { kind: PactKind; field: StrainField; floor: number }[] = [
  { kind: 'alliance', field: 'allianceStrainSinceDay', floor: ALLIANCE_STRAIN_INDEX },
  { kind: 'nonAggression', field: 'nonAggressionStrainSinceDay', floor: NON_AGGRESSION_STRAIN_INDEX },
];
const withStrain = (relation: DiplomaticRelation, field: StrainField, day: number | undefined): DiplomaticRelation =>
  field === 'allianceStrainSinceDay' ? { ...relation, allianceStrainSinceDay: day } : { ...relation, nonAggressionStrainSinceDay: day };
const PACT_TEXT: Record<PactKind, { risk: (name: string) => string; ended: (name: string) => string; world: (a: string, b: string) => string }> = {
  alliance: {
    risk: (name) => `DIPLOMACY // Alliance with ${name} at risk: relations below ${ALLIANCE_STRAIN_INDEX}/100. Restore at least ${ALLIANCE_STRAIN_INDEX}/100 within ${PACT_STRAIN_GRACE_DAYS} days.`,
    ended: (name) => `DIPLOMACY // Alliance with ${name} dissolved after ${PACT_STRAIN_GRACE_DAYS} days below ${ALLIANCE_STRAIN_INDEX}/100.`,
    world: (a, b) => `DIPLOMACY // ${a} and ${b} dissolved their alliance as relations collapsed.`,
  },
  nonAggression: {
    risk: (name) => `DIPLOMACY // Non-aggression pact with ${name} at risk: relations below ${NON_AGGRESSION_STRAIN_INDEX}/100. Restore at least ${NON_AGGRESSION_STRAIN_INDEX}/100 within ${PACT_STRAIN_GRACE_DAYS} days.`,
    ended: (name) => `DIPLOMACY // Non-aggression pact with ${name} lapsed after ${PACT_STRAIN_GRACE_DAYS} days below ${NON_AGGRESSION_STRAIN_INDEX}/100.`,
    world: (a, b) => `DIPLOMACY // ${a} and ${b} let their non-aggression pact lapse.`,
  },
};

export function processPactStrain(state: GameState): GameState {
  let next = state;
  const notes: string[] = [], day = state.day;
  for (const a of activeCountries(state.countries)) for (const bId of Object.keys(a.diplomacy.relations)) {
    if (a.id >= bId || !state.countries[bId]) continue;
    for (const rule of PACT_STRAIN) {
      const ra = relationFor(next.countries[a.id], bId), rb = relationFor(next.countries[bId], a.id);
      const since = ra[rule.field] ?? rb[rule.field];
      const active = ra.treaties.includes(rule.kind) || rb.treaties.includes(rule.kind);
      const strained = active && Math.min(relationshipIndex(ra), relationshipIndex(rb)) < rule.floor;
      if (!strained) {
        if (since !== undefined) next = updateBilateralRelation(next, a.id, bId, (r) => withStrain(r, rule.field, undefined));
        continue;
      }
      const playerPartner = a.id === next.playerCountryId ? bId : bId === next.playerCountryId ? a.id : null;
      if (since === undefined) {
        next = updateBilateralRelation(next, a.id, bId, (r) => withStrain(r, rule.field, day));
        if (playerPartner) notes.push(PACT_TEXT[rule.kind].risk(next.countries[playerPartner].name));
      } else if (next.day - since >= PACT_STRAIN_GRACE_DAYS) {
        next = updateBilateralRelation(next, a.id, bId, (r) => ({ ...withStrain(r, rule.field, undefined), treaties: r.treaties.filter((t) => t !== rule.kind), status: r.status === 'war' ? r.status : statusFromScore(r.score) }));
        notes.push(playerPartner ? PACT_TEXT[rule.kind].ended(next.countries[playerPartner].name) : PACT_TEXT[rule.kind].world(next.countries[a.id].name, next.countries[bId].name));
      }
    }
  }
  return notes.length ? { ...next, sitrep: [...notes, ...next.sitrep].slice(0, 12) } : next;
}

import type { GameState } from '../../domain/game';
import { ARMISTICE_OFFER_DAYS, ARMISTICE_QUIET_DAYS, type ArmisticeOffer, type PeaceState } from '../../domain/peace';
import { endWarRelation } from './diplomacy';
import { ARMISTICE_MIN_SCORE, peaceOf } from './peaceTreaty';
import { warScore } from './warScore';
import { settleWarOutcome } from './warOutcome';

/**
 * Phase 9.6: armistice requests. An AI government that is losing a war against the player asks for an armistice
 * before it collapses. The player may take a seat at the table (the war ends and the winner spends the war score held
 * at that moment) or decline and keep fighting. Pure and seed-free: the same war always produces the same request.
 */
export const ARMISTICE_REQUEST_EXHAUSTION = 70;
export const ARMISTICE_REQUEST_PROGRESS = 70;

const withOffers = (state: GameState, offers: Record<string, ArmisticeOffer>): GameState => {
  const peace: PeaceState = { ...peaceOf(state), offers };
  return { ...state, world: { ...state.world, peace } };
};

/** Why the defender of this war would ask for an armistice now, if it would. */
export function armisticeRequestReason(state: GameState, warId: string): 'exhaustion' | 'collapse of the front' | null {
  const war = state.wars[warId];
  if (!war || war.status !== 'active' || war.attackerId !== state.playerCountryId || war.defenderId === state.playerCountryId) return null;
  const defender = state.countries[war.defenderId];
  if (!defender || defender.annexedBy || defender.controllerCountryId) return null;
  if (warScore(state, war, 'attacker').subtotal < ARMISTICE_MIN_SCORE) return null;
  if (war.defenderExhaustion >= ARMISTICE_REQUEST_EXHAUSTION) return 'exhaustion';
  if (war.progress >= ARMISTICE_REQUEST_PROGRESS) return 'collapse of the front';
  return null;
}

/** Daily: opens a request for each war that qualifies and retires requests that lapsed or were declined long enough ago. */
export function processArmisticeRequests(state: GameState): GameState {
  const offers = peaceOf(state).offers;
  let next = state;
  let changed = false;
  const kept: Record<string, ArmisticeOffer> = {};
  for (const [warId, offer] of Object.entries(offers ?? {})) {
    const war = state.wars[warId];
    if (state.day >= offer.expiresDay || !war || war.status !== 'active') changed = true;
    else kept[warId] = offer;
  }
  for (const war of Object.values(state.wars)) {
    if (kept[war.id] || !armisticeRequestReason(state, war.id)) continue;
    const from = state.countries[war.defenderId];
    kept[war.id] = { warId: war.id, fromId: war.defenderId, day: state.day, expiresDay: state.day + ARMISTICE_OFFER_DAYS, status: 'open' };
    next = { ...next, sitrep: [`PEACE // ${from.name} asks for an armistice.`, ...next.sitrep].slice(0, 12), speed: 0 };
    changed = true;
  }
  return changed ? withOffers(next, kept) : state;
}

/** The player takes the request: the war ends in a ceasefire and the table opens with the war score held now. */
export function acceptArmistice(state: GameState, warId: string): GameState {
  const offer = peaceOf(state).offers?.[warId];
  const war = state.wars[warId];
  if (!offer || offer.status !== 'open' || !war || war.status !== 'active' || war.attackerId !== state.playerCountryId) return state;
  const rest = Object.fromEntries(Object.entries(peaceOf(state).offers ?? {}).filter(([id]) => id !== warId));
  let next = withOffers(state, rest);
  next = { ...next, wars: { ...next.wars, [warId]: { ...war, status: 'withdrawn', autoAssault: false, lastReport: 'Armistice agreed at the defender\'s request.' } } };
  next = endWarRelation(next, war.attackerId, war.defenderId);
  return settleWarOutcome(next, warId);
}

/** The player refuses: the war goes on and the same government will not ask again for a month. */
export function declineArmistice(state: GameState, warId: string): GameState {
  const offer = peaceOf(state).offers?.[warId];
  if (!offer || offer.status !== 'open') return state;
  return withOffers(state, { ...peaceOf(state).offers, [warId]: { ...offer, status: 'declined', expiresDay: state.day + ARMISTICE_QUIET_DAYS } });
}

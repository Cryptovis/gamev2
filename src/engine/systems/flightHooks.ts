import type { GameState } from '../../domain/game';
import type { Flight, FlightKind, FlightPayload } from '../../domain/flights';
import { flights, scheduleFlight } from './flights';

/**
 * 0.89 flight hooks: which actions put an aircraft in the sky.
 *
 * - Flights involving the player always fly.
 * - Flights that carry a payload (goodwill, goods) always fly, whoever sends them, because the payload is the rule.
 * - Visual-only AI–AI flights are rate-limited so the map stays readable: at most
 *   `MAX_AI_FLIGHTS_PER_WINDOW` departures in any `AI_FLIGHT_WINDOW_DAYS`-day window.
 *
 * The window is short enough that every flight that departed inside it is still in `world.flights` (a flight lasts
 * at least one day and stays listed for two days after landing), so the limit needs no extra saved state.
 */
export const AI_FLIGHT_WINDOW_DAYS = 4;
export const MAX_AI_FLIGHTS_PER_WINDOW = 2;
/** Active trade deals and supply contracts with the player show a cargo flight about once a month. */
export const TRADE_FLIGHT_INTERVAL_DAYS = 30;

export const involvesPlayer = (state: GameState, aId: string, bId: string) => aId === state.playerCountryId || bId === state.playerCountryId;

/** AI–AI flights that departed within the rate-limit window ending today. */
export function recentAiFlights(state: GameState): Flight[] {
  return flights(state).filter((f) => !involvesPlayer(state, f.fromId, f.toId) && f.departDay > state.day - AI_FLIGHT_WINDOW_DAYS);
}

export interface DispatchRequest { kind: FlightKind; fromId: string; toId: string; label: string; payload?: FlightPayload }

/** Schedules a flight under the visibility rules above. Returns the state unchanged when an AI flight is rate-limited. */
export function dispatchFlight(state: GameState, request: DispatchRequest): GameState {
  const carriesPayload = !!request.payload && request.payload.type !== 'none';
  if (!carriesPayload && !involvesPlayer(state, request.fromId, request.toId) && recentAiFlights(state).length >= MAX_AI_FLIGHTS_PER_WINDOW) return state;
  return scheduleFlight(state, request);
}

/** Diplomatic jet without payload (proposals, summits, signing delegations). */
export const diplomaticFlight = (state: GameState, fromId: string, toId: string, label: string) => dispatchFlight(state, { kind: 'diplomatic', fromId, toId, label });
/** Cargo aircraft without payload; goods of the deal itself move under the deal's own rules. */
export const cargoFlight = (state: GameState, fromId: string, toId: string, label: string) => dispatchFlight(state, { kind: 'cargo', fromId, toId, label });

/** Label of the delegation that carries a treaty of the given kind. */
export function agreementFlightLabel(kind: 'embassy' | 'trade' | 'nonAggression' | 'alliance'): string {
  return kind === 'embassy' ? 'Embassy delegation' : kind === 'trade' ? 'Trade pact delegation' : kind === 'nonAggression' ? 'Non-aggression talks' : 'Alliance summit';
}

/** Small deterministic offset so monthly cargo flights of different deals do not all leave on the same day. */
function stagger(id: string): number {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % TRADE_FLIGHT_INTERVAL_DAYS;
}

/**
 * Monthly cargo flights for the player's active trade: one per active bilateral trade deal every 30 days (staggered
 * by deal), and one for each industrial supply contract delivery made today. Visual only; deliveries are unchanged.
 */
export function processTradeFlights(state: GameState): GameState {
  let next = state;
  for (const deal of Object.values(state.tradeDeals)) {
    if (!deal.active || !involvesPlayer(state, deal.sellerId, deal.buyerId)) continue;
    if (deal.startDay === state.day) continue;
    if ((state.day + stagger(deal.id)) % TRADE_FLIGHT_INTERVAL_DAYS !== 0) continue;
    next = cargoFlight(next, deal.sellerId, deal.buyerId, 'Trade cargo');
  }
  for (const contract of Object.values(state.industrialContracts)) {
    // A delivery processed today moves the next delivery exactly one month ahead.
    if (!contract.active || contract.nextDeliveryDay !== state.day + 30 || !involvesPlayer(state, contract.sellerId, contract.buyerId)) continue;
    next = cargoFlight(next, contract.sellerId, contract.buyerId, 'Supply contract cargo');
  }
  return next;
}

/** Diplomatic flights with a goodwill payload that landed today and concern the player, for arrival reports. */
export function landedPlayerDelegations(state: GameState): Flight[] {
  return flights(state).filter((f) => f.status === 'landed' && f.arriveDay === state.day && f.kind === 'diplomatic' && f.payload.type === 'relations' && involvesPlayer(state, f.fromId, f.toId));
}

/** Adds one sitrep line per player delegation that arrived today. */
export function reportFlightArrivals(state: GameState): GameState {
  const landed = landedPlayerDelegations(state);
  if (!landed.length) return state;
  const lines = landed.map((f) => {
    const gain = f.payload.type === 'relations' ? Math.round(f.payload.amount) : 0;
    return `DIPLOMACY // Delegation arrived in ${state.countries[f.toId]?.name ?? f.toId}: relations +${gain}.`;
  });
  return { ...state, sitrep: [...lines, ...state.sitrep].slice(0, 12) };
}

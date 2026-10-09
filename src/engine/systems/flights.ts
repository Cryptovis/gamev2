import type { GameState } from '../../domain/game';
import type { Flight, FlightKind, FlightPayload } from '../../domain/flights';
import { COUNTRY_POSITIONS } from '../../data/countryPositions';
import { MICROSTATE_POINTS } from '../../data/microstates';
import { changeRelations } from './diplomacy';
import { changeExchangeStock } from './livingEconomy';

/**
 * 0.89 flights. Diplomatic jets and cargo aircraft travel between countries over campaign days. Travel time
 * comes from the great-circle distance between country centres; payloads (goods, goodwill) apply on arrival.
 * Rendering reads `world.flights` and never decides outcomes.
 */

const EARTH_RADIUS_KM = 6371;
/** Distance used when a country has no known position. */
const FALLBACK_DISTANCE_KM = 3000;
/** Landed flights stay visible briefly, then are pruned. */
const LANDED_VISIBLE_DAYS = 2;
export const MAX_FLIGHTS = 80;

export function countryPosition(id: string): [number, number] | null {
  return COUNTRY_POSITIONS[id] ?? MICROSTATE_POINTS[id] ?? null;
}

/** Great-circle distance in km between two countries' centres. */
export function distanceKm(fromId: string, toId: string): number {
  const a = countryPosition(fromId), b = countryPosition(toId);
  if (!a || !b) return FALLBACK_DISTANCE_KM;
  const rad = Math.PI / 180, dLat = (b[1] - a[1]) * rad, dLon = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Campaign days from departure to arrival. A day covers preparation, the flight and arrival formalities:
 * diplomatic delegations arrive the next day within ~7,000 km and take up to 3 days across the globe;
 * cargo needs loading and customs, so 2 days nearby and up to 6 days for the longest routes.
 */
export function travelDays(kind: FlightKind, fromId: string, toId: string): number {
  const km = distanceKm(fromId, toId);
  return kind === 'diplomatic' ? Math.min(3, 1 + Math.floor(km / 7000)) : Math.min(6, 2 + Math.floor(km / 4000));
}

export function flights(state: GameState): Flight[] {
  return state.world.flights ?? [];
}

export interface FlightRequest { kind: FlightKind; fromId: string; toId: string; label: string; payload?: FlightPayload }

/** Starts a flight today. Returns the state unchanged for invalid endpoints. */
export function scheduleFlight(state: GameState, request: FlightRequest): GameState {
  const { kind, fromId, toId, label } = request;
  if (fromId === toId || !state.countries[fromId] || !state.countries[toId]) return state;
  const list = flights(state);
  const flight: Flight = {
    id: `FL-${state.day}-${list.length}-${fromId}-${toId}`,
    kind, fromId, toId, label,
    departDay: state.day,
    arriveDay: state.day + travelDays(kind, fromId, toId),
    payload: request.payload ?? { type: 'none' },
    status: 'enroute',
  };
  // Keep the newest flights when the list is full; an evicted flight still delivers immediately.
  let next: GameState = { ...state, world: { ...state.world, flights: [...list, flight] } };
  const overflow = flights(next).length - MAX_FLIGHTS;
  if (overflow > 0) {
    const [evicted, kept] = [flights(next).slice(0, overflow), flights(next).slice(overflow)];
    next = { ...next, world: { ...next.world, flights: kept } };
    for (const f of evicted) if (f.status === 'enroute') next = deliver(next, f);
  }
  return next;
}

function deliver(state: GameState, flight: Flight): GameState {
  const p = flight.payload;
  if (p.type === 'goods' && state.countries[p.countryId] && Number.isFinite(p.amount) && p.amount > 0) return changeExchangeStock(state, p.countryId, p.good, p.amount);
  if (p.type === 'relations' && state.countries[p.aId] && state.countries[p.bId] && Number.isFinite(p.amount)) return changeRelations(state, p.aId, p.bId, p.amount);
  return state;
}

/** Lands flights due today (applying their payload once) and prunes flights that landed a while ago. */
export function processFlights(state: GameState): GameState {
  const list = state.world.flights;
  if (!list?.length) return state;
  let next = state;
  const updated: Flight[] = [];
  for (const f of list) {
    if (f.status === 'enroute' && f.arriveDay <= state.day) {
      next = deliver(next, f);
      updated.push({ ...f, status: 'landed' });
    } else if (f.status === 'landed' && state.day - f.arriveDay > LANDED_VISIBLE_DAYS) continue;
    else updated.push(f);
  }
  return { ...next, world: { ...next.world, flights: updated } };
}

/** Progress 0–1 of a flight on a given (possibly fractional) day, for rendering. */
export function flightProgress(flight: Flight, day: number): number {
  const span = Math.max(1, flight.arriveDay - flight.departDay);
  return Math.max(0, Math.min(1, (day - flight.departDay) / span));
}

import type { GameState } from '../../domain/game';
import type { Flight, FlightKind, FlightPayload } from '../../domain/flights';
import { COUNTRY_POSITIONS } from '../../data/countryPositions';
import { MICROSTATE_POINTS } from '../../data/microstates';
import { changeRelations } from './diplomacy';
import { changeExchangeStock } from './livingEconomy';
import { nextRandom } from '../rng';
import { cargoBlockade } from './taskGroups';

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
/** Flights without a payload (visual only) are dropped first when the list exceeds this. */
export const MAX_FLIGHTS = 80;
/**
 * Hard limit of the saved list (Phase 4). Cargo and goodwill flights are the delivery itself, so they are never dropped
 * to make room for visual flights; only beyond this limit does the oldest payload flight land early.
 */
export const MAX_FLIGHT_RECORDS = 400;

export function countryPosition(id: string): [number, number] | null {
  return COUNTRY_POSITIONS[id] ?? MICROSTATE_POINTS[id] ?? null;
}

/** Great-circle distance in km between two countries' centres. */
export function distanceKm(fromId: string, toId: string): number {
  return pointDistanceKm(countryPosition(fromId), countryPosition(toId));
}

/** Great-circle distance in km between two (lon, lat) points; a missing point gives the fixed fallback distance. */
export function pointDistanceKm(a: [number, number] | null, b: [number, number] | null): number {
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

export interface FlightRequest { kind: FlightKind; fromId: string; toId: string; label: string; payload?: FlightPayload; shipmentId?: string }

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
    ...(request.shipmentId ? { shipmentId: request.shipmentId } : {}),
  };
  let list2 = [...list, flight];
  // Phase 4: make room by dropping landed flights, then visual-only flights in the air, oldest first. Cargo and goodwill
  // stay listed until they land on their own day, so the map route and the delivery are the same record.
  const drop = (count: number, match: (f: Flight) => boolean) => {
    if (count <= 0) return;
    const ids = new Set(list2.filter(match).slice(0, count).map((f) => f.id));
    list2 = list2.filter((f) => !ids.has(f.id));
  };
  drop(list2.length - MAX_FLIGHTS, (f) => f.status === 'landed');
  drop(list2.length - MAX_FLIGHTS, (f) => f.payload.type === 'none' && f.id !== flight.id);
  let next: GameState = { ...state, world: { ...state.world, flights: list2 } };
  // Safety valve only: beyond the hard limit the oldest payload flights land now and leave the list.
  const overflow = list2.length - MAX_FLIGHT_RECORDS;
  if (overflow > 0) {
    const early = list2.slice(0, overflow);
    for (const f of early) next = land(next, f).state;
    next = { ...next, world: { ...next.world, flights: list2.slice(overflow) } };
  }
  return next;
}

/**
 * Lands one flight: applies its payload once. Goods for a country under an active naval blockade without escorts may
 * be partly intercepted (seeded roll, Phase 4); the record keeps what was delivered and lost, and the exchange books
 * the buyer's position from it on the same day.
 */
function land(state: GameState, flight: Flight): { state: GameState; flight: Flight } {
  const p = flight.payload;
  const landed: Flight = { ...flight, status: 'landed' };
  if (p.type === 'goods' && state.countries[p.countryId] && Number.isFinite(p.amount) && p.amount > 0) {
    let next = state, lost = 0;
    const blockade = cargoBlockade(state, p.countryId);
    if (blockade) {
      const roll = nextRandom(next.simulationSeed), share = nextRandom(roll.seed);
      next = { ...next, simulationSeed: share.seed };
      if (roll.value < blockade.interceptChance) {
        lost = p.amount * (0.25 + 0.5 * share.value);
        next = { ...next, sitrep: [`BLOCKADE // ${flight.label} for ${next.countries[p.countryId].name}: ${lost.toFixed(2)} of ${p.amount.toFixed(2)} intercepted by the ${next.countries[blockade.blockaderId]?.name ?? blockade.blockaderId} blockade.`, ...next.sitrep].slice(0, 12) };
      }
    }
    const delivered = p.amount - lost;
    if (delivered > 0) next = changeExchangeStock(next, p.countryId, p.good, delivered);
    return { state: next, flight: { ...landed, delivered, lost } };
  }
  if (p.type === 'relations' && state.countries[p.aId] && state.countries[p.bId] && Number.isFinite(p.amount)) return { state: changeRelations(state, p.aId, p.bId, p.amount), flight: landed };
  return { state, flight: landed };
}

/** Lands flights due today (applying their payload once) and prunes flights that landed a while ago. */
export function processFlights(state: GameState): GameState {
  const list = state.world.flights;
  if (!list?.length) return state;
  let next = state;
  const updated: Flight[] = [];
  for (const f of list) {
    if (f.status === 'enroute' && f.arriveDay <= state.day) {
      const result = land(next, f);
      next = result.state;
      updated.push(result.flight);
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

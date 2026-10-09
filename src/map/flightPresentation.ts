import type { Flight, FlightKind } from '../domain/flights';

/** Whole campaign days until a flight lands (0 on its arrival day). */
export function etaDays(flight: Flight, day: number): number {
  return Math.max(0, flight.arriveDay - day);
}

/** The player's flights still in the air, soonest arrival first. */
export function playerFlightsInTransit(list: readonly Flight[] | undefined, playerId: string): Flight[] {
  return (list ?? [])
    .filter((f) => f.status === 'enroute' && (f.fromId === playerId || f.toId === playerId))
    .sort((a, b) => a.arriveDay - b.arriveDay || a.id.localeCompare(b.id));
}

/** Flights that landed at most one day ago, for the arrival pulse at the destination. */
export function recentlyLanded(list: readonly Flight[] | undefined, day: number): Flight[] {
  return (list ?? []).filter((f) => f.status === 'landed' && day - f.arriveDay <= 1);
}

/** Aircraft icon for a news line: diplomatic reports get the jet, trade and supply reports the freighter. */
export function newsFlightKind(message: string): FlightKind | null {
  const head = message.trimStart().toUpperCase();
  if (head.startsWith('DIPLOMACY //') || head.startsWith('BLOC //')) return 'diplomatic';
  if (head.startsWith('TRADE //') || head.startsWith('AI TRADE //') || head.startsWith('MARKET //') || head.startsWith('SUPPLY CONTRACT //')) return 'cargo';
  return null;
}

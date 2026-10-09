import { MAX_FLIGHTS } from '../engine/systems/flights';

/**
 * 0.89 flights (world.flights, optional). Written as plain checks so it does not depend on zod refinements.
 * Rejects malformed flights, unknown countries, impossible days and non-finite payloads.
 */
export function validFlights(value: unknown): boolean {
  const s = value as { day: number; countries: Record<string, unknown>; world: { flights?: unknown } };
  const list = s.world?.flights;
  if (list === undefined) return true;
  if (!Array.isArray(list) || list.length > MAX_FLIGHTS) return false;
  const known = (id: unknown) => typeof id === 'string' && !!s.countries[id];
  const int = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n);
  return list.every((f: Record<string, unknown>) => {
    if (!f || typeof f !== 'object' || typeof f.id !== 'string' || typeof f.label !== 'string' || f.label.length > 120) return false;
    if (!['diplomatic', 'cargo'].includes(f.kind as string) || !['enroute', 'landed'].includes(f.status as string)) return false;
    if (!known(f.fromId) || !known(f.toId) || f.fromId === f.toId) return false;
    if (!int(f.departDay) || !int(f.arriveDay) || f.departDay > s.day || f.arriveDay < f.departDay || f.arriveDay - f.departDay > 10) return false;
    const p = f.payload as Record<string, unknown> | undefined;
    if (!p || typeof p !== 'object') return false;
    if (p.type === 'none') return true;
    if (p.type === 'goods') return known(p.countryId) && typeof p.good === 'string' && typeof p.amount === 'number' && Number.isFinite(p.amount) && p.amount > 0;
    if (p.type === 'relations') return known(p.aId) && known(p.bId) && typeof p.amount === 'number' && Number.isFinite(p.amount) && Math.abs(p.amount) <= 50;
    return false;
  });
}

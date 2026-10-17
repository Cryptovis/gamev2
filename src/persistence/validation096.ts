import { FRONTIER_REGIONS, REGION_IDS } from '../domain/peace';
import { parseDemand } from '../engine/systems/peaceDemands';

/**
 * Phase 9.6 peace state (world.peace, optional). Saves without it are valid; a present state must reference known
 * countries and wars, carry only demands the table can parse, keep every day within the campaign so far and stay bounded.
 */
export function validPeaceState(value: unknown): boolean {
  const s = value as { day: number; countries: Record<string, unknown>; wars?: Record<string, unknown>; world?: { peace?: unknown } };
  const peace = s?.world?.peace as Record<string, unknown> | undefined;
  if (peace === undefined) return true;
  const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  if (!obj(peace)) return false;
  const known = (id: unknown): id is string => typeof id === 'string' && !!s.countries?.[id];
  const day = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0;
  const past = (n: unknown): n is number => day(n) && n <= s.day;
  const demands = (v: unknown, max: number) => Array.isArray(v) && v.length <= max && v.every(id => typeof id === 'string' && parseDemand(id) !== null);
  const triggers = ['victory', 'surrender', 'armistice', 'collapse'];

  if (!obj(peace.conferences) || Object.keys(peace.conferences).length > 400) return false;
  for (const [warId, raw] of Object.entries(peace.conferences)) {
    if (!obj(raw) || raw.warId !== warId || !known(raw.winnerId) || !known(raw.loserId) || raw.winnerId === raw.loserId) return false;
    if (!triggers.includes(raw.trigger as string) || !past(raw.openedDay) || !['open', 'concluded', 'waived'].includes(raw.status as string)) return false;
    if (typeof raw.score !== 'number' || !Number.isFinite(raw.score) || raw.score < 0 || raw.score > 200 || !demands(raw.selected, 40)) return false;
    if (raw.closedDay !== undefined && !past(raw.closedDay)) return false;
  }
  if (!Array.isArray(peace.treaties) || peace.treaties.length > 100) return false;
  for (const t of peace.treaties) {
    if (!obj(t) || typeof t.id !== 'string' || !known(t.winnerId) || !known(t.loserId) || !past(t.day) || !demands(t.terms, 40) || typeof t.read !== 'boolean') return false;
  }
  if (!Array.isArray(peace.obligations) || peace.obligations.length > 400) return false;
  for (const o of peace.obligations) {
    if (!obj(o) || typeof o.id !== 'string' || !past(o.startDay) || !day(o.endDay) || o.endDay < (o.startDay as number)) return false;
    if (o.kind === 'reparations') {
      if (!known(o.payerId) || !known(o.payeeId) || !['light', 'standard', 'heavy'].includes(o.tier as string) || !day(o.nextDay) || typeof o.paid !== 'number' || !Number.isFinite(o.paid) || o.paid < 0) return false;
    } else if (o.kind === 'dmz') {
      if (!known(o.bound) || !known(o.beneficiary) || !(FRONTIER_REGIONS as readonly unknown[]).includes(o.zone)) return false;
    } else if (o.kind === 'disarm') {
      if (!known(o.bound) || !known(o.beneficiary) || !['armor', 'fleet'].includes(o.target as string) || typeof o.cap !== 'number' || !Number.isInteger(o.cap) || o.cap < 0) return false;
    } else return false;
  }
  if (!obj(peace.cessions)) return false;
  for (const [loserId, regions] of Object.entries(peace.cessions)) {
    if (!known(loserId) || !obj(regions)) return false;
    for (const [region, owner] of Object.entries(regions)) if (!(REGION_IDS as readonly string[]).includes(region) || !known(owner)) return false;
  }
  if (peace.offers !== undefined) {
    if (!obj(peace.offers)) return false;
    for (const [warId, raw] of Object.entries(peace.offers)) {
      if (!obj(raw) || raw.warId !== warId || !known(raw.fromId) || !past(raw.day) || !day(raw.expiresDay) || !['open', 'declined'].includes(raw.status as string)) return false;
    }
  }
  return true;
}

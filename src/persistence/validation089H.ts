import { COMMODITIES, HISTORY_DAYS } from '../engine/systems/commodityExchange';

/**
 * 0.89 commodity exchange (world.commodities, optional). Plain checks, no zod refinements: saves without the field are
 * valid (the exchange opens on the next tick); a present exchange must have finite prices, known commodities and
 * countries, bounded lists and no future days.
 */
export function validCommodityExchange(value: unknown): boolean {
  const s = value as { day: number; countries: Record<string, unknown>; world?: { commodities?: unknown } };
  const ex = s?.world?.commodities as Record<string, unknown> | undefined;
  if (ex === undefined) return true;
  if (!ex || typeof ex !== 'object' || Array.isArray(ex)) return false;
  const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
  const positive = (n: unknown) => finite(n) && n > 0;
  const nonNegative = (n: unknown) => finite(n) && n >= -1e-9;
  const int = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n);
  const known = (id: unknown) => typeof id === 'string' && !!s.countries?.[id];
  const commodity = (g: unknown) => typeof g === 'string' && (COMMODITIES as string[]).includes(g);
  const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  const list = (v: unknown, max: number): v is Array<Record<string, unknown>> => Array.isArray(v) && v.length <= max && v.every(obj);

  if (!int(ex.seed) || ex.seed < 0 || ex.seed > 0xffffffff || !int(ex.lastDay) || ex.lastDay > s.day) return false;
  const markets = ex.markets, baseline = ex.baseline;
  if (!obj(markets) || !obj(baseline)) return false;
  for (const g of COMMODITIES) {
    const m = markets[g], b = baseline[g];
    if (!obj(m) || (m.impact !== undefined && !(finite(m.impact) && Math.abs(m.impact) <= 5)) || !positive(m.price) || !positive(m.fundamental) || !Array.isArray(m.history) || m.history.length > HISTORY_DAYS || !m.history.every(positive)) return false;
    if (!obj(b) || !positive(b.stock) || !positive(b.ratio)) return false;
  }
  if (Object.keys(markets).some((g) => !commodity(g)) || Object.keys(baseline).some((g) => !commodity(g))) return false;
  if (!list(ex.shocks, 60) || !ex.shocks.every((x) => typeof x.id === 'string' && commodity(x.good) && finite(x.size) && Math.abs(x.size) <= 1 && int(x.day) && x.day <= s.day && positive(x.halfLife) && ['event', 'war', 'news'].includes(x.source as string) && typeof x.headline === 'string' && x.headline.length <= 160 && (x.countryId === undefined || typeof x.countryId === 'string'))) return false;
  if (!Array.isArray(ex.seenWars) || ex.seenWars.length > 100 || !ex.seenWars.every((id) => typeof id === 'string')) return false;
  if (!obj(ex.positions)) return false;
  for (const [id, goods] of Object.entries(ex.positions)) {
    if (!known(id) || !obj(goods)) return false;
    for (const [g, p] of Object.entries(goods)) {
      if (!commodity(g) || !obj(p)) return false;
      if (!nonNegative(p.units) || !nonNegative(p.inbound) || !nonNegative(p.avgCost) || !finite(p.realized) || !nonNegative(p.storagePaid) || !int(p.tradedDay) || p.tradedDay > s.day || !nonNegative(p.tradedToday)) return false;
    }
  }
  if (!list(ex.deliveries, 400) || !ex.deliveries.every((d) => (d.id === undefined || (typeof d.id === 'string' && d.id.length <= 120)) && known(d.countryId) && commodity(d.good) && positive(d.amount) && int(d.arriveDay) && d.arriveDay <= s.day + 10)) return false;
  if (!list(ex.settlements, 400) || !ex.settlements.every((x) => known(x.countryId) && nonNegative(x.amount) && int(x.day) && x.day <= s.day + 1)) return false;
  if (!list(ex.trades, 60) || !ex.trades.every((x) => int(x.day) && x.day <= s.day && known(x.countryId) && commodity(x.good) && (x.side === 'buy' || x.side === 'sell') && positive(x.quantity) && positive(x.price) && (x.counterpartyId === undefined || known(x.counterpartyId)))) return false;
  return true;
}

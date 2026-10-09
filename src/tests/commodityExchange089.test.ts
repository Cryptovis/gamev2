import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { GameState } from '../domain/game';
import type { Commodity } from '../domain/commodityExchange';
import { REFERENCE_PRICES } from '../data/commodityPrices';
import {
  COMMODITIES, COMMODITY_SPECS, EXCHANGE_FEE, HISTORY_DAYS, MARKET_IMPACT, commodityExchange, commodityHoldings, commodityOrderPreview,
  createCommodityExchange, dailyOrderLimit, dailyVolumeUnits, placeCommodityOrder, processCommodityExchange, shockPremium, storageCapacity,
} from '../engine/systems/commodityExchange';
import { flights, processFlights } from '../engine/systems/flights';
import { executeCommandResult } from '../engine/commands';
import { tickGame } from '../engine/tick';
import { snapshotGame } from '../persistence/snapshot';
import { migrateSave } from '../persistence/migrations';
import { validSaveShape } from '../persistence/validation';
import { validCommodityExchange } from '../persistence/validation089H';
import { UI_CATALOG_089_H } from '../i18n/uiCatalog089H';
import { EVENT_SHOCKS, WORLD_NEWS } from '../engine/systems/commodityExchange';

const base = (): GameState => { const s = makeInitialState(); s.world.tutorial.active = false; s.eventCooldownUntil = 100000; s.advisorCooldownUntil = 100000; return s; };
/** Opens the exchange on the current day (as the first tick would). */
const opened = (s = base()) => processCommodityExchange(s);
/** Advances the exchange (and flights) without the rest of the simulation, so tests isolate its rules. */
function advance(state: GameState, days: number, each?: (s: GameState) => GameState): GameState {
  let s = state;
  for (let i = 0; i < days; i++) { s = processFlights({ ...s, day: s.day + 1 }); if (each) s = each(s); s = processCommodityExchange(s); }
  return s;
}
const ex = (s: GameState) => s.world.commodities!;
const price = (s: GameState, g: Commodity) => ex(s).markets[g].price;
const setPrice = (s: GameState, g: Commodity, p: number): GameState => ({ ...s, world: { ...s.world, commodities: { ...ex(s), markets: { ...ex(s).markets, [g]: { ...ex(s).markets[g], price: p } } } } });
const P = 'TUR';
/** Same artefact shapes as i18nArtifacts.test.ts (importing that file would re-register its tests here). */
const repeated = /(?:^|(?<=\s))(\S+(?:\s+\S+){0,3})\s+\1(?=\s|$|[.,;:!?)])/iu;
const localeArtifacts = (catalog: Record<string, string>) => Object.entries(catalog).filter(([, v]) => v.includes('{\\f') || /&(?:amp|quot|lt|gt|apos|#\d+);/.test(v) || repeated.test(v)).map(([k, v]) => `${k} => ${v}`);

describe('0.89 commodity exchange — prices', () => {
  it('opens deterministically with bounded history, without consuming the simulation seed', () => {
    const a = opened(), b = opened();
    expect(a.simulationSeed).toBe(base().simulationSeed);
    expect(ex(a).markets).toEqual(ex(b).markets);
    for (const g of COMMODITIES) {
      expect(ex(a).markets[g].history.length).toBeLessThanOrEqual(HISTORY_DAYS);
      expect(price(a, g) / REFERENCE_PRICES[g]).toBeGreaterThan(0.6);
      expect(price(a, g) / REFERENCE_PRICES[g]).toBeLessThan(1.6);
    }
    const a60 = advance(a, 60), b60 = advance(b, 60);
    expect(ex(a60)).toEqual(ex(b60));
    expect(ex(a60).markets.oil.history).toHaveLength(Math.min(HISTORY_DAYS, 91 + 60));
    expect(processCommodityExchange(a60)).toBe(a60); // idempotent within a day
  }, 60_000);

  it('reverts toward the fundamental after a dislocation', () => {
    let s = opened();
    for (const g of COMMODITIES) s = setPrice(s, g, ex(s).markets[g].fundamental * 2);
    s = advance(s, 240);
    const gaps = COMMODITIES.map((g) => Math.abs(Math.log(price(s, g) / ex(s).markets[g].fundamental)));
    expect(gaps.reduce((a, b) => a + b, 0) / gaps.length).toBeLessThan(0.3); // started at ln 2 ≈ 0.69
    expect(Math.max(...gaps)).toBeLessThan(0.6);
  }, 60_000);

  it('turns a drought into a food shock that raises the price and then decays', () => {
    const start = opened();
    const withDrought = (s: GameState) => s.day === start.day + 1 ? { ...s, countries: { ...s.countries, [P]: { ...s.countries[P], eventLastFired: { ...s.countries[P].eventLastFired, drought: s.day } } } } : s;
    const shocked = advance(start, 1, withDrought), calm = advance(start, 1);
    const shock = ex(shocked).shocks.find((x) => x.source === 'event' && x.good === 'food');
    expect(shock).toBeDefined();
    expect(shock!.size).toBeGreaterThan(0.1);
    expect(price(shocked, 'food') / price(calm, 'food')).toBeGreaterThan(1.05);
    let a = shocked, b = calm, peak = 0;
    for (let d = 0; d < 30; d++) { a = advance(a, 1); b = advance(b, 1); peak = Math.max(peak, price(a, 'food') / price(b, 'food')); }
    expect(peak).toBeGreaterThan(price(shocked, 'food') / price(calm, 'food')); // mean reversion toward the premium continues the rise
    const s300 = advance(a, 270), c300 = advance(b, 270);
    expect(shockPremium(ex(s300), 'food', s300.day) - shockPremium(ex(c300), 'food', c300.day)).toBeLessThan(0.01);
    expect(Math.abs(Math.log(price(s300, 'food') / price(c300, 'food')))).toBeLessThan(0.05);
  }, 90_000);

  it('turns a new war involving a major oil producer into an oil shock', () => {
    let s = opened();
    s = { ...s, wars: { ...s.wars, W1: { ...Object.values(base().wars)[0] ?? {}, id: 'W1', attackerId: 'SAU', defenderId: 'IRN', status: 'active' } as GameState['wars'][string] } };
    s = advance(s, 1);
    expect(ex(s).seenWars).toContain('W1');
    expect(ex(s).shocks.some((x) => x.source === 'war' && x.good === 'oil' && x.size > 0.05)).toBe(true);
    const again = advance(s, 1);
    expect(ex(again).shocks.filter((x) => x.source === 'war' && x.good === 'oil')).toHaveLength(ex(s).shocks.filter((x) => x.source === 'war' && x.good === 'oil').length);
  }, 30_000);
});

describe('0.89 commodity exchange — orders and limits', () => {
  it('charges the spread, fee, impact and freight shown by the preview', () => {
    const s = opened();
    const q = commodityOrderPreview(s, P, 'oil', 'buy', 2);
    expect(q.allowed).toBe(true);
    expect(q.spread).toBeGreaterThanOrEqual(0.01);
    expect(q.spread).toBeLessThanOrEqual(0.03);
    expect(q.fillPrice).toBeCloseTo(q.mid * (1 + q.spread / 2) * Math.exp(MARKET_IMPACT * 2 / dailyVolumeUnits('oil') / 2), 10);
    expect(q.fee).toBeCloseTo(q.notional * EXCHANGE_FEE, 12);
    expect(q.freight).toBeGreaterThan(0);
    expect(q.total).toBeCloseTo(q.notional + q.fee + q.freight, 12);
    const treasury = s.countries[P].economy.treasury;
    const n = placeCommodityOrder(s, P, 'oil', 'buy', 2);
    expect(n.countries[P].economy.treasury).toBeCloseTo(treasury - q.total, 9);
    expect(price(n, 'oil')).toBeCloseTo(q.mid * Math.exp(MARKET_IMPACT * 2 / dailyVolumeUnits('oil')), 12);
    const sell = commodityOrderPreview(s, P, 'gold', 'sell', 0);
    expect(sell.allowed).toBe(false);
  });

  it('enforces the daily order limit, position limit, storage capacity, stock and treasury', () => {
    const s = opened();
    const limit = dailyOrderLimit('oil');
    expect(commodityOrderPreview(s, P, 'oil', 'buy', limit * 1.01).reasons.join(' ')).toMatch(/daily limit/);
    const half = placeCommodityOrder(s, P, 'oil', 'buy', limit * 0.6);
    expect(half).not.toBe(s);
    expect(placeCommodityOrder(half, P, 'oil', 'buy', limit * 0.6)).toBe(half); // 120% of the daily limit
    expect(commodityOrderPreview(advance(half, 1), P, 'oil', 'buy', limit * 0.6).reasons.join(' ')).not.toMatch(/daily limit/);
    // Microstate: position limit and storage bind long before the daily limit.
    const tiny = commodityOrderPreview(s, 'LIE', 'oil', 'buy', limit * 0.5).reasons.join(' ');
    expect(tiny).toMatch(/position limit/);
    expect(tiny).toMatch(/storage/i);
    expect(storageCapacity(s.countries.LIE, 'oil')).toBeLessThan(storageCapacity(s.countries.USA, 'oil') / 1000);
    // Treasury.
    const poor = { ...s, countries: { ...s.countries, [P]: { ...s.countries[P], economy: { ...s.countries[P].economy, treasury: 0.01 } } } };
    expect(commodityOrderPreview(poor, P, 'gold', 'buy', 1).reasons.join(' ')).toMatch(/Treasury/);
    // Selling needs stock (vault holdings for gold; holdings plus national surplus for physical goods).
    expect(commodityOrderPreview(s, P, 'gold', 'sell', 1).reasons.join(' ')).toMatch(/vault/);
    expect(commodityOrderPreview(s, P, 'uranium', 'sell', 1e6).allowed).toBe(false);
    // The command path refuses with the same reasons and leaves the state unchanged.
    const refused = executeCommandResult(s, { type: 'commodity/order', good: 'oil', side: 'buy', quantity: limit * 2 });
    expect(refused.status).toBe('unavailable');
    expect(refused.state).toBe(s);
    expect(executeCommandResult(s, { type: 'commodity/order', good: 'oil', side: 'buy', quantity: 1 }).status).toBe('applied');
  });

  it('applies the same limits to AI countries', () => {
    const s = opened();
    expect(placeCommodityOrder(s, 'CHN', 'oil', 'buy', dailyOrderLimit('oil') * 1.5)).toBe(s);
    expect(placeCommodityOrder(s, 'CHN', 'oil', 'buy', dailyOrderLimit('oil') * 0.5)).not.toBe(s);
  });

  it('flies bought cargo from a seller and delivers it on arrival', () => {
    const s = opened();
    const q = commodityOrderPreview(s, P, 'oil', 'buy', 3);
    const sellerOil = s.countries[q.counterpartyId!].resources.oil, oil = s.countries[P].resources.oil;
    let n = placeCommodityOrder(s, P, 'oil', 'buy', 3);
    const flight = flights(n).at(-1)!;
    expect(flight).toMatchObject({ kind: 'cargo', fromId: q.counterpartyId, toId: P, payload: { type: 'goods', countryId: P, good: 'oil', amount: 3 } });
    expect(flight.arriveDay - flight.departDay).toBe(q.arrivalDays);
    expect(n.countries[q.counterpartyId!].resources.oil).toBeCloseTo(sellerOil - 3, 9);
    expect(n.countries[P].resources.oil).toBe(oil);
    expect(ex(n).positions[P].oil).toMatchObject({ units: 0, inbound: 3 });
    n = advance(n, q.arrivalDays - 1);
    expect(n.countries[P].resources.oil).toBe(oil);
    n = advance(n, 1);
    expect(n.countries[P].resources.oil).toBeCloseTo(oil + 3, 9);
    expect(ex(n).positions[P].oil!.units).toBeCloseTo(3, 9);
    expect(ex(n).positions[P].oil!.inbound).toBe(0);
  });

  it('charges daily storage on holdings', () => {
    let s = placeCommodityOrder(opened(), P, 'gold', 'buy', 2);
    const before = s.countries[P].economy.treasury;
    s = advance(s, 1);
    const expected = 2 * price(s, 'gold') * COMMODITY_SPECS.gold.storageRate / 365;
    // Storage is charged at the previous close, before today's move; allow for one day of price change.
    expect(before - s.countries[P].economy.treasury).toBeGreaterThan(expected * 0.9);
    expect(before - s.countries[P].economy.treasury).toBeLessThan(expected * 1.1);
    expect(ex(s).positions[P].gold!.storagePaid).toBeCloseTo(before - s.countries[P].economy.treasury, 12);
  });

  it('computes average cost, unrealized and realized P&L, and settles sales on T+1', () => {
    let s = opened();
    const buy = commodityOrderPreview(s, P, 'gold', 'buy', 2);
    s = placeCommodityOrder(s, P, 'gold', 'buy', 2);
    const avg = buy.total / 2;
    expect(ex(s).positions[P].gold!.avgCost).toBeCloseTo(avg, 12);
    s = setPrice(s, 'gold', price(s, 'gold') * 1.2);
    const [h] = commodityHoldings(s, P);
    expect(h.unrealized).toBeCloseTo(2 * (price(s, 'gold') - avg), 12);
    const sell = commodityOrderPreview(s, P, 'gold', 'sell', 1);
    expect(sell.realized).toBeCloseTo(sell.fillPrice * (1 - EXCHANGE_FEE) - avg, 12);
    expect(sell.realized).toBeGreaterThan(0);
    const treasury = s.countries[P].economy.treasury;
    s = placeCommodityOrder(s, P, 'gold', 'sell', 1);
    expect(s.countries[P].economy.treasury).toBe(treasury); // not yet settled
    expect(ex(s).positions[P].gold).toMatchObject({ units: 1 });
    expect(ex(s).positions[P].gold!.realized).toBeCloseTo(sell.realized, 12);
    const storage = 1 * COMMODITY_SPECS.gold.storageRate / 365 * price(s, 'gold');
    s = advance(s, 1);
    expect(s.countries[P].economy.treasury - treasury).toBeGreaterThan(sell.total - storage * 1.2);
    expect(s.countries[P].economy.treasury - treasury).toBeLessThan(sell.total);
    expect(ex(s).settlements).toHaveLength(0);
  });

  it('pays the buyer country for a physical sale and ships it to them', () => {
    const s = opened();
    const q = commodityOrderPreview(s, P, 'food', 'sell', 5);
    expect(q.allowed).toBe(true);
    const buyer = q.counterpartyId!, paid = s.countries[buyer].economy.treasury, food = s.countries[P].resources.food;
    const n = placeCommodityOrder(s, P, 'food', 'sell', 5);
    expect(n.countries[P].resources.food).toBeCloseTo(food - 5, 9);
    expect(n.countries[buyer].economy.treasury).toBeCloseTo(paid - 5 * q.mid, 9);
    expect(flights(n).at(-1)).toMatchObject({ fromId: P, toId: buyer, payload: { type: 'goods', countryId: buyer, good: 'food', amount: 5 } });
  });
});

describe('0.89 commodity exchange — world and saves', () => {
  it('lets AI countries trade under the same rules inside the daily tick', () => {
    let s = base();
    for (let i = 0; i < 40; i++) s = tickGame({ ...s, activeEvent: null, activeAdvisor: null });
    expect(s.world.commodities).toBeDefined();
    const trades = ex(s).trades.filter((t) => t.countryId !== s.playerCountryId);
    expect(trades.length).toBeGreaterThan(0);
    for (const t of trades) expect(t.quantity).toBeLessThanOrEqual(dailyOrderLimit(t.good) + 1e-9);
  }, 120_000);

  it('accepts saves with and without the exchange and rejects corrupted exchange state', () => {
    const without = base();
    expect(without.world.commodities).toBeUndefined();
    expect(validCommodityExchange(snapshotGame(without))).toBe(true);
    expect(validSaveShape(snapshotGame(without))).toBe(true);
    const loaded = migrateSave(snapshotGame(without));
    expect(loaded).not.toBeNull();
    expect(commodityExchange(loaded!).markets.oil.price).toBeGreaterThan(0);
    expect(processCommodityExchange(loaded!).world.commodities).toBeDefined();

    let withEx = placeCommodityOrder(opened(), P, 'oil', 'buy', 2);
    withEx = placeCommodityOrder(withEx, P, 'gold', 'sell', 0);
    withEx = advance(placeCommodityOrder(withEx, P, 'gold', 'buy', 1), 1);
    withEx = placeCommodityOrder(withEx, P, 'gold', 'sell', 0.5);
    expect(validCommodityExchange(snapshotGame(withEx))).toBe(true);
    expect(validSaveShape(snapshotGame(withEx))).toBe(true);
    expect(migrateSave(snapshotGame(withEx))?.world.commodities).toEqual(ex(withEx));

    const corrupt = (edit: (e: ReturnType<typeof ex>) => void) => { const c = snapshotGame(withEx); edit(c.world.commodities!); return validCommodityExchange(c); };
    expect(corrupt((e) => { e.markets.oil.price = Number.NaN; })).toBe(false);
    expect(corrupt((e) => { e.positions.XXX = {}; })).toBe(false);
    expect(corrupt((e) => { e.lastDay = withEx.day + 5; })).toBe(false);
    expect(corrupt((e) => { e.markets.oil.history = new Array(HISTORY_DAYS + 1).fill(1); })).toBe(false);
    expect(corrupt((e) => { e.shocks.push({ id: 'x', good: 'oil', size: 3, day: 1, halfLife: 10, source: 'news', headline: 'x' }); })).toBe(false);
  });

  it('opens an exchange for a save from before 0.89 on its next tick', () => {
    const s = base();
    const created = createCommodityExchange(s);
    expect(created.lastDay).toBe(s.day - 1);
    const n = processCommodityExchange(s);
    expect(ex(n).lastDay).toBe(s.day);
    expect(ex(n).markets.food.history.length).toBe(created.markets.food.history.length + 1);
  });
});

describe('0.89 commodity exchange — translations', () => {
  it('translates every engine headline, label and order check into four languages without artefacts', () => {
    for (const values of Object.values(UI_CATALOG_089_H)) { expect(values).toHaveLength(4); for (const v of values) expect(v.trim().length).toBeGreaterThan(0); }
    for (const index of [0, 1, 2, 3]) expect(localeArtifacts(Object.fromEntries(Object.entries(UI_CATALOG_089_H).map(([k, v]) => [k, v[index]])))).toEqual([]);
    const keys = new Set(Object.keys(UI_CATALOG_089_H));
    const engineText = [
      ...COMMODITIES.map((g) => COMMODITY_SPECS[g].label),
      ...Object.values(EVENT_SHOCKS).flatMap((moves) => moves!.map((m) => m.headline)),
      ...WORLD_NEWS.map((x) => x.headline),
      'War threatens oil exports', 'War disrupts grain exports', 'War between major economies lifts gold',
    ];
    for (const text of engineText) expect(keys.has(text), text).toBe(true);
    const s = opened();
    const reasons = new Set<string>();
    for (const [id, g, side, q] of [[P, 'oil', 'buy', 1e9], [P, 'gold', 'sell', 5], ['LIE', 'oil', 'buy', 5], [P, 'oil', 'buy', 0], [P, 'uranium', 'sell', 1e6]] as const)
      for (const r of commodityOrderPreview(s, id, g, side, q).reasons) reasons.add(r);
    expect(reasons.size).toBeGreaterThan(4);
    for (const r of reasons) expect(keys.has(r), r).toBe(true);
  });
});

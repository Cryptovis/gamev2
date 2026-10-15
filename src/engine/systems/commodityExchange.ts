import {constrainedOilOutput} from './organizations/quotas';
import {organizationSanctionsBlock,anonymousMarketBlocked} from './organizations/sanctions';
import {integrationBenefits} from './organizations/marketIntegration';
import {tradePaymentPreview,recordTradeSettlement} from './organizations/tradeSettlement';
import {leaderModifiers} from './leaderPerks';
import { activeCountries } from '../../domain/sovereignty';
import type { CountryState, EventKind, GameState } from '../../domain/game';
import type {
  Commodity, CommodityDelivery, CommodityExchangeState, CommodityMarket, CommodityPosition, CommodityShock, CommodityTrade,
} from '../../domain/commodityExchange';
import { REFERENCE_PRICES } from '../../data/commodityPrices';
import { GOODS } from '../../data/industrialCatalog';
import { GOLD_PRODUCERS, SILVER_PRODUCERS } from '../../data/preciousMetals';
import { nextRandom } from '../rng';
import { simulateResources } from './resources';
import { changeExchangeStock, exchangeStock, exportableStock } from './livingEconomy';
import { distanceKm, scheduleFlight, travelDays } from './flights';
import { relationFor } from './diplomacy';

/**
 * 0.89 commodity exchange: a spot market for ten commodities that both the player and AI countries trade under the
 * same rules. It sits beside the open listing market (livingEconomy.ts) and bilateral contracts (trade.ts); those keep
 * their reference prices, while this exchange quotes a moving benchmark.
 *
 * Price model (daily, in log space):
 *   log P' = log P + reversion · (log F + premium − log P) + volatility · ε      (ε ~ N(0,1), seeded stream)
 * F (fundamental) is REFERENCE_PRICES scaled by world stocks and the consumption/production ratio relative to a
 * baseline that starts at the opening values and drifts toward current ones over about a year (BASELINE_DRIFT), so a
 * sudden glut or shortage moves prices for months while secular stock growth does not halve them. Gold and silver are
 * monetary metals priced off the reference, shocks and noise (industrial stock barely matters). `premium` is the sum of active shocks (event, war or world news), each decaying with its half-life.
 * A shock moves the spot by SHOCK_JUMP_SHARE of its size at once; the rest is reached by mean reversion.
 *
 * Trading: buy at mid·(1+spread/2), sell at mid·(1−spread/2); the spread widens while shocks are active. Every
 * order also pays EXCHANGE_FEE and moves the mid by MARKET_IMPACT · quantity / world daily volume (fills average half
 * of that move). The move is temporary: it is kept as `impact` and keeps a quarter of itself each day (IMPACT_DECAY), so a big buyer pays
 * up while buying and a big seller pushes the price down, but neither shifts the market for months. Limits per country and commodity: ORDER_LIMIT_SHARE of world daily volume per day; total holdings
 * at market value ≤ POSITION_LIMIT_GDP of GDP; physical holdings ≤ storage capacity (STORAGE_CAPACITY_GDP of GDP at
 * reference prices). Holdings pay storage every day (annual rate per commodity).
 *
 * Settlement: purchases are paid at once (T+0) and, for physical goods, travel by cargo flight from the largest
 * exporter with access; units are usable on arrival. Sales remove stock at once, are flown to the importer with the
 * greatest need, and the proceeds are credited on the next day (T+1). Gold and silver are vaulted financial holdings:
 * no flight, no counterparty country, settled the same way.
 */

export interface CommoditySpec {
  label: string;
  unit: string;
  physical: boolean;
  /** Daily log-price volatility. */
  volatility: number;
  /** Daily share of the gap to the target closed by mean reversion. */
  reversion: number;
  /** Full bid/ask spread as a share of mid in calm markets. */
  spread: number;
  /** World daily exchange volume at reference prices, $B. */
  dailyVolumeB: number;
  /** Annual storage/vault cost as a share of market value. */
  storageRate: number;
}

export const COMMODITY_SPECS: Record<Commodity, CommoditySpec> = {
  food: { label: 'Grain & food', unit: 'units', physical: true, volatility: 0.017, reversion: 0.03, spread: 0.016, dailyVolumeB: 4, storageRate: 0.12 },
  oil: { label: 'Crude oil', unit: 'units', physical: true, volatility: 0.022, reversion: 0.025, spread: 0.01, dailyVolumeB: 5, storageRate: 0.08 },
  fuel: { label: 'Refined fuel', unit: 'units', physical: true, volatility: 0.022, reversion: 0.03, spread: 0.016, dailyVolumeB: 2.5, storageRate: 0.08 },
  iron: { label: 'Iron ore', unit: 'units', physical: true, volatility: 0.018, reversion: 0.03, spread: 0.02, dailyVolumeB: 1.2, storageRate: 0.03 },
  coal: { label: 'Coal', unit: 'units', physical: true, volatility: 0.018, reversion: 0.03, spread: 0.024, dailyVolumeB: 0.8, storageRate: 0.04 },
  copper: { label: 'Copper', unit: 'units', physical: true, volatility: 0.014, reversion: 0.02, spread: 0.012, dailyVolumeB: 1.5, storageRate: 0.015 },
  aluminum: { label: 'Aluminum', unit: 'units', physical: true, volatility: 0.013, reversion: 0.025, spread: 0.014, dailyVolumeB: 1, storageRate: 0.015 },
  uranium: { label: 'Uranium', unit: 'units', physical: true, volatility: 0.016, reversion: 0.02, spread: 0.03, dailyVolumeB: 0.12, storageRate: 0.015 },
  gold: { label: 'Gold', unit: 'tonnes', physical: false, volatility: 0.009, reversion: 0.01, spread: 0.01, dailyVolumeB: 6, storageRate: 0.0012 },
  silver: { label: 'Silver', unit: 'tonnes', physical: false, volatility: 0.017, reversion: 0.015, spread: 0.016, dailyVolumeB: 0.8, storageRate: 0.003 },
};
export const COMMODITIES = Object.keys(COMMODITY_SPECS) as Commodity[];
const RAW: ReadonlySet<Commodity> = new Set(['food', 'oil', 'iron', 'uranium']);

export const EXCHANGE_FEE = 0.0025;
export const ORDER_LIMIT_SHARE = 0.1;
export const MARKET_IMPACT = 0.25;
/** Share of the temporary order impact left after each day. */
export const IMPACT_DECAY = 0.25;
export const POSITION_LIMIT_GDP = 0.05;
export const STORAGE_CAPACITY_GDP = 0.015;
export const HISTORY_DAYS = 180;
/** Days of simulated trading recorded before the exchange opens, so charts start with context. */
export const PREROLL_DAYS = 90;
export const SHOCK_JUMP_SHARE = 0.8;
/** Chance per day of a world news shock (≈ 9 a year). */
export const NEWS_DAILY_CHANCE = 1 / 40;
export const FREIGHT_BASE = 0.002, FREIGHT_PER_1000KM = 0.0004, FREIGHT_MAX = 0.01;
const STOCK_ELASTICITY: Record<Commodity, number> = { food: 0.25, oil: 0.25, fuel: 0.25, iron: 0.25, coal: 0.25, copper: 0.25, aluminum: 0.25, uranium: 0.25, gold: 0, silver: 0.05 };
const FLOW_ELASTICITY = 0.5, FUNDAMENTAL_MIN = 0.6, FUNDAMENTAL_MAX = 2;
/** Daily share of the gap between the fundamentals baseline and current world stocks/flows that the baseline closes. */
export const BASELINE_DRIFT = 1 / 365;
const MAX_SHOCKS = 40, MAX_TRADES = 40, MAX_SEEN_WARS = 80, MAX_PENDING = 300;
/** AI orders use at most this share of their daily limit, and at most AI_TRADES_PER_DAY orders run per day. */
const AI_ORDER_SHARE = 0.3, AI_TRADES_PER_DAY = 2;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const round6 = (v: number) => Number(v.toPrecision(6));

// ─── seeded noise ────────────────────────────────────────────────────────────

function gaussian(seed: number): { seed: number; value: number } {
  const a = nextRandom(seed), b = nextRandom(a.seed);
  const z = Math.sqrt(-2 * Math.log(Math.max(1e-12, a.value))) * Math.cos(2 * Math.PI * b.value);
  return { seed: b.seed, value: clamp(z, -4, 4) };
}

// ─── world supply and fundamentals ───────────────────────────────────────────

export interface WorldSupply { stock: Record<Commodity, number>; ratio: Record<Commodity, number>; oilProduction: Record<string, number>; foodProduction: Record<string, number>; worldOil: number; worldFood: number; worldGdp: number }

/** One pass over the world: stocks of every commodity and consumption/production for raw resources. */
export function worldSupply(s: GameState): WorldSupply {
  const stock = Object.fromEntries(COMMODITIES.map((g) => [g, 0])) as Record<Commodity, number>;
  const prod: Record<string, number> = { food: 0, oil: 0, iron: 0, uranium: 0 }, cons: Record<string, number> = { food: 0, oil: 0, iron: 0, uranium: 0 };
  const oilProduction: Record<string, number> = {}, foodProduction: Record<string, number> = {};
  let worldGdp = 0;
  for (const c of activeCountries(s.countries)) {
    const flow = simulateResources(c,1,undefined,leaderModifiers(s,c.id).consumer,constrainedOilOutput(s,c.id));
    for (const r of ['food', 'oil', 'iron', 'uranium'] as const) { prod[r] += flow.production[r]; cons[r] += flow.consumption[r]; }
    oilProduction[c.id] = flow.production.oil; foodProduction[c.id] = flow.production.food;
    worldGdp += Math.max(0, c.economy.gdp);
    for (const g of COMMODITIES) stock[g] += exchangeStock(s, c.id, g);
  }
  const ratio = Object.fromEntries(COMMODITIES.map((g) => [g, RAW.has(g) ? Math.max(0.01, cons[g]) / Math.max(0.01, prod[g]) : 1])) as Record<Commodity, number>;
  return { stock, ratio, oilProduction, foodProduction, worldOil: prod.oil, worldFood: prod.food, worldGdp };
}

export function fundamentalPrice(ex: Pick<CommodityExchangeState, 'baseline'>, supply: WorldSupply, g: Commodity): number {
  const base = ex.baseline[g];
  const stockFactor = clamp(Math.pow(Math.max(1e-6, supply.stock[g]) / Math.max(1e-6, base.stock), -STOCK_ELASTICITY[g]), 0.8, 1.35);
  const flowFactor = clamp(Math.pow(supply.ratio[g] / Math.max(1e-6, base.ratio), FLOW_ELASTICITY), 0.75, 1.5);
  return REFERENCE_PRICES[g] * clamp(stockFactor * flowFactor, FUNDAMENTAL_MIN, FUNDAMENTAL_MAX);
}

/** Current log premium of all active shocks on a commodity. */
export function shockPremium(ex: Pick<CommodityExchangeState, 'shocks'>, g: Commodity, day: number): number {
  let premium = 0;
  for (const x of ex.shocks) if (x.good === g && day >= x.day) premium += x.size * Math.pow(0.5, (day - x.day) / x.halfLife);
  return premium;
}

// ─── state ───────────────────────────────────────────────────────────────────

export function createCommodityExchange(s: GameState): CommodityExchangeState {
  const supply = worldSupply(s);
  let seed = ((s.simulationSeed ^ 0x5bd1e995) >>> 0) || 1;
  const markets = {} as Record<Commodity, CommodityMarket>;
  for (const g of COMMODITIES) {
    const spec = COMMODITY_SPECS[g], target = Math.log(REFERENCE_PRICES[g]);
    let x = target;
    const history: number[] = [];
    for (let i = 0; i < PREROLL_DAYS; i++) {
      const e = gaussian(seed); seed = e.seed;
      x += spec.reversion * (target - x) + spec.volatility * e.value;
      history.push(round6(Math.exp(x)));
    }
    markets[g] = { price: history[history.length - 1], fundamental: REFERENCE_PRICES[g], history };
  }
  return {
    seed, lastDay: s.day - 1,
    baseline: Object.fromEntries(COMMODITIES.map((g) => [g, { stock: Math.max(1e-6, supply.stock[g]), ratio: supply.ratio[g] }])) as CommodityExchangeState['baseline'],
    markets, shocks: [],
    seenWars: Object.values(s.wars).filter((w) => w.status === 'active').map((w) => w.id).slice(-MAX_SEEN_WARS),
    positions: {}, deliveries: [], settlements: [], trades: [],
  };
}

/** The exchange state, or the state it would open with (pure; for UI and previews on saves without it). */
export function commodityExchange(s: GameState): CommodityExchangeState {
  return s.world.commodities ?? createCommodityExchange(s);
}

function withExchange(s: GameState, ex: CommodityExchangeState): GameState {
  return { ...s, world: { ...s.world, commodities: ex } };
}

const EMPTY_POSITION: CommodityPosition = { units: 0, inbound: 0, avgCost: 0, realized: 0, storagePaid: 0, tradedDay: -1, tradedToday: 0 };
export function commodityPosition(ex: CommodityExchangeState, countryId: string, g: Commodity): CommodityPosition {
  return ex.positions[countryId]?.[g] ?? EMPTY_POSITION;
}
function setPosition(ex: CommodityExchangeState, countryId: string, g: Commodity, p: CommodityPosition): CommodityExchangeState {
  return { ...ex, positions: { ...ex.positions, [countryId]: { ...ex.positions[countryId], [g]: p } } };
}

function addTreasury(s: GameState, id: string, delta: number): GameState {
  const c = s.countries[id];
  if (!c || delta === 0) return s;
  return { ...s, countries: { ...s.countries, [id]: { ...c, economy: { ...c.economy, treasury: c.economy.treasury + delta } } } };
}

// ─── limits and quotes ───────────────────────────────────────────────────────

export const dailyVolumeUnits = (g: Commodity) => COMMODITY_SPECS[g].dailyVolumeB / REFERENCE_PRICES[g];
export const dailyOrderLimit = (g: Commodity) => dailyVolumeUnits(g) * ORDER_LIMIT_SHARE;
export const storageCapacity = (c: CountryState, g: Commodity) => Math.max(0, c.economy.gdp) * STORAGE_CAPACITY_GDP / REFERENCE_PRICES[g];
export const positionLimit = (c: CountryState) => Math.max(0, c.economy.gdp) * POSITION_LIMIT_GDP;
export function freightRate(fromId: string, toId: string): number {
  return Math.min(FREIGHT_MAX, FREIGHT_BASE + FREIGHT_PER_1000KM * distanceKm(fromId, toId) / 1000);
}
/** Full bid/ask spread now: the calm spread, widened by up to 2.5× while shocks are active. */
export function currentSpread(ex: CommodityExchangeState, g: Commodity, day: number): number {
  return COMMODITY_SPECS[g].spread * (1 + Math.min(1.5, 2 * Math.abs(shockPremium(ex, g, day))));
}
/** Market value of all of a country's exchange holdings (units + inbound) at mid. */
export function holdingsValue(ex: CommodityExchangeState, countryId: string): number {
  let value = 0;
  for (const [g, p] of Object.entries(ex.positions[countryId] ?? {}) as Array<[Commodity, CommodityPosition]>) value += (p.units + p.inbound) * ex.markets[g].price;
  return value;
}
const held = (p: CommodityPosition) => p.units + p.inbound;
const tradedToday = (p: CommodityPosition, day: number) => (p.tradedDay === day ? p.tradedToday : 0);

/** Both sides can trade: neither annexed or under global sanctions, no war and no bilateral sanctions. */
export function exchangeCounterpartyOk(s: GameState, a: string, b: string,g?:Commodity): boolean {
  const A = s.countries[a], B = s.countries[b];
  if (!A || !B || a === b || A.annexedBy || B.annexedBy || A.globalSanctions || B.globalSanctions) return false;
  const ab = relationFor(A, b), ba = relationFor(B, a);
  if(organizationSanctionsBlock(s,a,b,'trade',g))return false;
  return ab.status !== 'war' && !ab.sanctions && ba.status !== 'war' && !ba.sanctions;
}

/** Deterministic seller for a physical purchase: the country with the largest exportable stock that can ship it. */
export function exchangeSeller(s: GameState, buyerId: string, g: Commodity, quantity: number): string | null {
  let best: string | null = null, bestStock = 0;
  for (const c of activeCountries(s.countries)) {
    if (c.id === buyerId) continue;
    const stock = exportableStock(s, c.id, g);
    if (stock + 1e-9 < quantity || stock <= bestStock || !exchangeCounterpartyOk(s, buyerId, c.id,g)) continue;
    best = c.id; bestStock = stock;
  }
  return best;
}

function importNeed(s: GameState, c: CountryState, g: Commodity): number {
  if (RAW.has(g)) { const f = simulateResources(c,1,undefined,leaderModifiers(s,c.id).consumer,constrainedOilOutput(s,c.id)); const r = g as 'food' | 'oil' | 'iron' | 'uranium'; return Math.max(0, f.consumption[r] - f.production[r]) * 30; }
  const reserve = g in GOODS ? GOODS[g as keyof typeof GOODS].reserve : 0;
  return Math.max(0, reserve * 3 - exchangeStock(s, c.id, g));
}

/** Treasury an importer keeps after paying for exchange cargo: 2% of GDP, at least $1B. */
export const counterpartyReserve = (c: CountryState) => Math.max(1, Math.max(0, c.economy.gdp) * 0.02);

/** Deterministic buyer for a physical sale: the importer with the greatest need that can pay; else the richest country. */
export function exchangeBuyer(s: GameState, sellerId: string, g: Commodity, payment: number): string | null {
  let best: string | null = null, bestNeed = -1, bestTreasury = -Infinity;
  for (const c of activeCountries(s.countries)) {
    if (c.id === sellerId || c.economy.treasury - payment < counterpartyReserve(c) || !exchangeCounterpartyOk(s, sellerId, c.id,g)) continue;
    const need = importNeed(s, c, g);
    if (need > bestNeed || (need === bestNeed && c.economy.treasury > bestTreasury)) { best = c.id; bestNeed = need; bestTreasury = c.economy.treasury; }
  }
  return best;
}

export interface CommodityOrderPreview {
  allowed: boolean;
  /** English reasons, translated by the UI. */
  reasons: string[];
  good: Commodity;
  side: 'buy' | 'sell';
  quantity: number;
  mid: number;
  /** Full spread now (share of mid). */
  spread: number;
  /** Price move this order causes (share of mid, signed). */
  impact: number;
  fillPrice: number;
  /** Cost of crossing half the spread versus trading at mid. */
  spreadCost: number;
  notional: number;
  fee: number;
  freight: number;
  tariffB:number;
  /** Cash paid now (buy) or credited on settlement (sell). */
  total: number;
  counterpartyId: string | null;
  arrivalDays: number;
  settlementDay: number;
  dailyLimit: number;
  dailyUsed: number;
  positionLimit: number;
  positionValue: number;
  storageCapacity: number;
  storageUsed: number;
  /** Storage cost per day of this order's units at today's mid. */
  dailyStorageCost: number;
  sellable: number;
  /** Units of a sale taken from the exchange position (the rest is national surplus). */
  fromPosition: number;
  /** Realized profit of a sale on the position part, after fees. */
  realized: number;
}

/** Everything an order would do, computed by the same code that executes it. */
export function commodityOrderPreview(s: GameState, countryId: string, good: Commodity, side: 'buy' | 'sell', quantity: number): CommodityOrderPreview {
  const known = COMMODITIES.includes(good), g: Commodity = known ? good : 'food';
  const ex = commodityExchange(s), c = s.countries[countryId], spec = COMMODITY_SPECS[g];
  const reasons: string[] = known ? [] : ['Unknown commodity.'];
  if (side !== 'buy' && side !== 'sell') reasons.push('Choose buy or sell.');
  const q = Number.isFinite(quantity) ? quantity : 0;
  const mid = ex.markets[g]?.price ?? REFERENCE_PRICES[g];
  const spread = currentSpread(ex, g, s.day);
  const impactLog = MARKET_IMPACT * Math.max(0, q) / dailyVolumeUnits(g);
  const sign = side === 'buy' ? 1 : -1;
  const fillPrice = mid * (1 + sign * spread / 2) * Math.exp(sign * impactLog / 2);
  const notional = Math.max(0, q) * fillPrice, fee = notional * EXCHANGE_FEE;
  const p = commodityPosition(ex, countryId, g);
  const dailyUsed = tradedToday(p, s.day), limit = dailyOrderLimit(g);
  const posLimit = c ? positionLimit(c) : 0, posValue = holdingsValue(ex, countryId);
  const capacity = c && spec.physical ? storageCapacity(c, g) : Infinity, used = p.units + p.inbound;
  const exportable = c && spec.physical ? exportableStock(s, countryId, g) : 0;
  const sellable = spec.physical ? Math.min(c ? exchangeStock(s, countryId, g) : 0, p.units + Math.max(0, exportable - p.units)) : p.units;
  if (!c || c.annexedBy) reasons.push('This country cannot trade on the exchange.');
  else if (c.globalSanctions) reasons.push('Global sanctions bar this country from the exchange.');
  if (!(q > 0)) reasons.push('Enter a quantity above zero.');
  if (q > 0 && dailyUsed + q > limit + 1e-9) reasons.push('Order exceeds the daily limit (10% of world daily volume).');
  if (ex.deliveries.length >= MAX_PENDING || ex.settlements.length >= MAX_PENDING) reasons.push('Too many shipments are waiting for settlement. Try again tomorrow.');
  let counterpartyId: string | null = null, tariffB=0,freight = 0, arrivalDays = 0, total = 0, fromPosition = 0, realized = 0;
  if (side === 'buy') {
    if (spec.physical && c && q > 0) {
      counterpartyId = exchangeSeller(s, countryId, g, q);
      if (!counterpartyId) reasons.push('No exporter with access can ship this quantity today.');
      else { freight = notional * freightRate(counterpartyId, countryId)*integrationBenefits(s,counterpartyId,countryId).frictionMultiplier; arrivalDays = travelDays('cargo', counterpartyId, countryId); }
    }
    if(counterpartyId){const payment=tradePaymentPreview(s,counterpartyId,countryId,g,q*mid);tariffB=payment.tariffB;if(!payment.allowed)reasons.push('Treasury cannot pay for this order. Borrow through Sovereign Credit or reduce the quantity.');}
    if(!spec.physical&&anonymousMarketBlocked(s,countryId))reasons.push('Global sanctions bar this country from the exchange.');
    total = notional + fee + freight+tariffB;
    if (c && total > c.economy.treasury) reasons.push('Treasury cannot pay for this order. Borrow through Sovereign Credit or reduce the quantity.');
    if (c && posValue + q * mid > posLimit + 1e-9) reasons.push('Holdings would exceed the position limit (5% of GDP).');
    if (spec.physical && used + q > capacity + 1e-9) reasons.push('Strategic storage is full for this commodity.');
  } else {
    if (q > sellable + 1e-9) reasons.push(spec.physical ? 'Not enough stock to sell: exchange holdings plus national surplus above reserves.' : 'Not enough metal in the exchange vault.');
    if (spec.physical && c && q > 0) {
      counterpartyId = exchangeBuyer(s, countryId, g, q * mid);
      if (!counterpartyId) reasons.push('No importer with access can buy this quantity today.');
      else {arrivalDays = travelDays('cargo', countryId, counterpartyId);const payment=tradePaymentPreview(s,countryId,counterpartyId,g,q*mid);tariffB=payment.tariffB;if(!payment.allowed)reasons.push('No importer with access can buy this quantity today.');}
    }
    if(!spec.physical&&anonymousMarketBlocked(s,countryId))reasons.push('Global sanctions bar this country from the exchange.');
    total = notional - fee;
    fromPosition = Math.min(Math.max(0, q), p.units);
    realized = fromPosition * (fillPrice * (1 - EXCHANGE_FEE) - p.avgCost);
  }
  return {
    allowed: reasons.length === 0, reasons, good: g, side, quantity: q, mid, spread, impact: sign * (Math.exp(impactLog) - 1),
    fillPrice, spreadCost: Math.max(0, q) * mid * spread / 2, notional, fee, freight,tariffB, total, counterpartyId, arrivalDays, settlementDay: side === 'buy' ? s.day : s.day + 1,
    dailyLimit: limit, dailyUsed, positionLimit: posLimit, positionValue: posValue, storageCapacity: capacity, storageUsed: used,
    dailyStorageCost: Math.max(0, q) * mid * spec.storageRate / 365, sellable, fromPosition, realized,
  };
}

const LABELS: Record<Commodity, string> = { food: 'Food cargo', oil: 'Oil cargo', fuel: 'Fuel cargo', iron: 'Iron ore cargo', coal: 'Coal cargo', copper: 'Copper cargo', aluminum: 'Aluminum cargo', uranium: 'Uranium cargo', gold: 'Gold', silver: 'Silver' };

/** Executes a market order for any country under the shared rules. Returns the state unchanged when refused. */
export function placeCommodityOrder(s: GameState, countryId: string, g: Commodity, side: 'buy' | 'sell', quantity: number): GameState {
  if (!COMMODITIES.includes(g) || (side !== 'buy' && side !== 'sell')) return s;
  const q = commodityOrderPreview(s, countryId, g, side, quantity);
  if (!q.allowed) return s;
  let ex = commodityExchange(s);
  const spec = COMMODITY_SPECS[g], p = commodityPosition(ex, countryId, g);
  const traded = tradedToday(p, s.day) + q.quantity;
  const policy=q.counterpartyId?tradePaymentPreview(s,side==='buy'?q.counterpartyId:countryId,side==='buy'?countryId:q.counterpartyId,g,q.quantity*q.mid):undefined;
  let n = s;
  if (side === 'buy') {
    n = addTreasury(n, countryId, -q.total);
    const held = p.units + p.inbound;
    const avgCost = (p.avgCost * held + q.total) / (held + q.quantity);
    if (spec.physical && q.counterpartyId) {
      n = changeExchangeStock(n, q.counterpartyId, g, -q.quantity);
      n = addTreasury(n, q.counterpartyId, q.quantity * q.mid);
      // Phase 4: one shipment. The cargo flight carries the goods; its landing books the position (same day, same record).
      const shipmentId = `SH-${s.day}-${countryId}-${g}-${ex.deliveries.length}`;
      n = scheduleFlight(n, { kind: 'cargo', fromId: q.counterpartyId, toId: countryId, label: LABELS[g], payload: { type: 'goods', countryId, good: g, amount: q.quantity }, shipmentId });
      ex = { ...ex, deliveries: [...ex.deliveries, { id: shipmentId, countryId, good: g, amount: q.quantity, arriveDay: s.day + q.arrivalDays }] };
      ex = setPosition(ex, countryId, g, { ...p, inbound: p.inbound + q.quantity, avgCost, tradedDay: s.day, tradedToday: traded });
    } else ex = setPosition(ex, countryId, g, { ...p, units: p.units + q.quantity, avgCost, tradedDay: s.day, tradedToday: traded });
  } else {
    if (spec.physical && q.counterpartyId) {
      n = changeExchangeStock(n, countryId, g, -q.quantity);
      n = addTreasury(n, q.counterpartyId, -q.quantity * q.mid-q.tariffB);
      n = scheduleFlight(n, { kind: 'cargo', fromId: countryId, toId: q.counterpartyId, label: LABELS[g], payload: { type: 'goods', countryId: q.counterpartyId, good: g, amount: q.quantity }, shipmentId: `SH-${s.day}-${q.counterpartyId}-${g}-s${ex.settlements.length}` });
    }
    const units = Math.max(0, p.units - q.fromPosition);
    ex = setPosition(ex, countryId, g, { ...p, units, avgCost: units + p.inbound > 1e-12 ? p.avgCost : 0, realized: p.realized + q.realized, tradedDay: s.day, tradedToday: traded });
    ex = { ...ex, settlements: [...ex.settlements, { countryId, amount: q.total, day: s.day + 1 }] };
  }
  if(q.counterpartyId&&policy)n=recordTradeSettlement(n,side==='buy'?q.counterpartyId:countryId,side==='buy'?countryId:q.counterpartyId,g,q.quantity*q.mid,policy);
  const market = ex.markets[g];
  const sign = side === 'buy' ? 1 : -1;
  ex = {
    ...ex,
    markets: { ...ex.markets, [g]: { ...market, price: market.price * Math.exp(sign * MARKET_IMPACT * q.quantity / dailyVolumeUnits(g)), impact: clamp((market.impact ?? 0) + sign * MARKET_IMPACT * q.quantity / dailyVolumeUnits(g), -1, 1) } },
    trades: [{ day: s.day, countryId, good: g, side, quantity: q.quantity, price: q.fillPrice, ...(q.counterpartyId ? { counterpartyId: q.counterpartyId } : {}) } as CommodityTrade, ...ex.trades].slice(0, MAX_TRADES),
  };
  return withExchange(n, ex);
}

// ─── P&L ─────────────────────────────────────────────────────────────────────

export interface CommodityHolding { good: Commodity; units: number; inbound: number; avgCost: number; mid: number; marketValue: number; unrealized: number; realized: number; storagePaid: number; dailyStorageCost: number; net: number }

/** Holdings marked to mid: unrealized = (mid − average cost) × (units + inbound); net = realized + unrealized − storage paid. */
export function commodityHoldings(s: GameState, countryId = s.playerCountryId): CommodityHolding[] {
  const ex = commodityExchange(s);
  return COMMODITIES.flatMap((g) => {
    const p = ex.positions[countryId]?.[g];
    if (!p || (p.units + p.inbound <= 1e-9 && Math.abs(p.realized) < 1e-12 && p.storagePaid < 1e-12)) return [];
    const mid = ex.markets[g].price, held = p.units + p.inbound;
    const unrealized = held * (mid - p.avgCost);
    return [{ good: g, units: p.units, inbound: p.inbound, avgCost: p.avgCost, mid, marketValue: held * mid, unrealized, realized: p.realized, storagePaid: p.storagePaid, dailyStorageCost: p.units * mid * COMMODITY_SPECS[g].storageRate / 365, net: p.realized + unrealized - p.storagePaid }];
  });
}

// ─── shocks ──────────────────────────────────────────────────────────────────

/** Player events that move world prices (log size before the player's weight; half-life in days). */
export const EVENT_SHOCKS: Partial<Record<EventKind, Array<{ good: Commodity; size: number; halfLife: number; headline: string }>>> = {
  drought: [{ good: 'food', size: 0.22, halfLife: 40, headline: 'Drought slashes harvest forecasts' }],
  flood: [{ good: 'food', size: 0.1, halfLife: 25, headline: 'Floods damage farmland and grain stores' }],
  food_crisis: [{ good: 'food', size: 0.05, halfLife: 20, headline: 'Food shortage triggers emergency grain buying' }],
  fuel_crisis: [{ good: 'oil', size: 0.06, halfLife: 20, headline: 'Fuel crisis drives emergency oil purchases' }, { good: 'fuel', size: 0.08, halfLife: 20, headline: 'Fuel crisis drives emergency oil purchases' }],
  grid_failure: [{ good: 'coal', size: 0.06, halfLife: 20, headline: 'Grid failure lifts demand for coal' }],
  energy_windfall: [{ good: 'oil', size: -0.1, halfLife: 30, headline: 'Energy windfall adds supply to the oil market' }],
  banking_stress: [{ good: 'gold', size: 0.07, halfLife: 30, headline: 'Banking stress sends investors into gold' }, { good: 'silver', size: 0.06, halfLife: 30, headline: 'Banking stress sends investors into gold' }],
  inflation_shock: [{ good: 'gold', size: 0.04, halfLife: 30, headline: 'Inflation fears lift precious metals' }, { good: 'silver', size: 0.03, halfLife: 30, headline: 'Inflation fears lift precious metals' }],
  pandemic_outbreak: [{ good: 'oil', size: -0.14, halfLife: 45, headline: 'Pandemic lockdowns cut fuel demand' }, { good: 'copper', size: -0.06, halfLife: 45, headline: 'Pandemic lockdowns cut fuel demand' }],
  export_boom: [{ good: 'copper', size: 0.05, halfLife: 30, headline: 'Export boom lifts industrial metals' }, { good: 'aluminum', size: 0.04, halfLife: 30, headline: 'Export boom lifts industrial metals' }],
};

interface NewsItem { weight: number; headline: string; producers?: 'food' | 'oil' | 'gold' | 'silver'; moves: Array<{ good: Commodity; lo: number; hi: number; halfLife: number }> }
/** World news: about nine shocks a year, drawn from the exchange's own seeded stream. */
export const WORLD_NEWS: NewsItem[] = [
  { weight: 3, headline: 'Grain-belt drought cuts world harvest forecasts', producers: 'food', moves: [{ good: 'food', lo: 0.15, hi: 0.3, halfLife: 40 }] },
  { weight: 1, headline: 'Famine warnings issued as harvests fail', producers: 'food', moves: [{ good: 'food', lo: 0.2, hi: 0.35, halfLife: 45 }] },
  { weight: 2, headline: 'Crop disease hits key grain exporters', producers: 'food', moves: [{ good: 'food', lo: 0.08, hi: 0.16, halfLife: 30 }] },
  { weight: 2, headline: 'Record harvest lifts world grain supply', producers: 'food', moves: [{ good: 'food', lo: -0.15, hi: -0.08, halfLife: 35 }] },
  { weight: 2, headline: 'Pipeline sabotage disrupts crude exports', producers: 'oil', moves: [{ good: 'oil', lo: 0.08, hi: 0.16, halfLife: 20 }, { good: 'fuel', lo: 0.05, hi: 0.1, halfLife: 20 }] },
  { weight: 2, headline: 'Oil producers announce output cuts', producers: 'oil', moves: [{ good: 'oil', lo: 0.1, hi: 0.2, halfLife: 50 }] },
  { weight: 2, headline: 'Oil producers flood the market with extra output', producers: 'oil', moves: [{ good: 'oil', lo: -0.2, hi: -0.1, halfLife: 45 }] },
  { weight: 1.5, headline: 'Refinery outages tighten fuel supply', moves: [{ good: 'fuel', lo: 0.08, hi: 0.14, halfLife: 20 }] },
  { weight: 1.5, headline: 'Mine strikes halt copper output', moves: [{ good: 'copper', lo: 0.06, hi: 0.12, halfLife: 30 }] },
  { weight: 1, headline: 'Smelter power shortage curbs aluminum output', moves: [{ good: 'aluminum', lo: 0.06, hi: 0.12, halfLife: 30 }] },
  { weight: 1.5, headline: 'Central banks step up gold buying', producers: 'gold', moves: [{ good: 'gold', lo: 0.04, hi: 0.08, halfLife: 60 }] },
  { weight: 1.5, headline: 'Market turmoil sends investors to safe havens', moves: [{ good: 'gold', lo: 0.05, hi: 0.09, halfLife: 30 }, { good: 'silver', lo: 0.04, hi: 0.08, halfLife: 30 }] },
  { weight: 1.5, headline: 'Industrial slowdown weighs on metals', moves: [{ good: 'copper', lo: -0.08, hi: -0.04, halfLife: 40 }, { good: 'aluminum', lo: -0.07, hi: -0.03, halfLife: 40 }, { good: 'iron', lo: -0.08, hi: -0.04, halfLife: 40 }, { good: 'silver', lo: -0.06, hi: -0.03, halfLife: 40 }] },
  { weight: 1, headline: 'Port disruption delays iron ore shipments', moves: [{ good: 'iron', lo: 0.07, hi: 0.14, halfLife: 25 }] },
  { weight: 1, headline: 'Mine flooding cuts coal supply', moves: [{ good: 'coal', lo: 0.08, hi: 0.15, halfLife: 25 }] },
  { weight: 0.7, headline: 'Reactor restarts lift uranium demand', moves: [{ good: 'uranium', lo: 0.1, hi: 0.2, halfLife: 60 }] },
];

function addShock(ex: CommodityExchangeState, shock: Omit<CommodityShock, 'id'>): CommodityExchangeState {
  const market = ex.markets[shock.good];
  const id = `SHK-${shock.day}-${shock.good}-${ex.shocks.filter((x) => x.day === shock.day).length}`;
  return {
    ...ex,
    shocks: [{ ...shock, size: round6(shock.size), id }, ...ex.shocks].slice(0, MAX_SHOCKS),
    markets: { ...ex.markets, [shock.good]: { ...market, price: market.price * Math.exp(shock.size * SHOCK_JUMP_SHARE) } },
  };
}

function topProducer(ids: Record<string, number>, s: GameState, pick: number): string | undefined {
  const ranked = Object.entries(ids).filter(([id, v]) => v > 0 && s.countries[id] && !s.countries[id].annexedBy).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
  return ranked.length ? ranked[Math.min(ranked.length - 1, Math.floor(pick * ranked.length))][0] : undefined;
}

function detectShocks(s: GameState, ex0: CommodityExchangeState, supply: WorldSupply): CommodityExchangeState {
  let ex = ex0;
  // 1. The player's events (the event system is the player's agenda); weight by the player's share of world GDP.
  const player = s.countries[s.playerCountryId];
  if (player) {
    const weight = clamp(0.5 + 3 * Math.max(0, player.economy.gdp) / Math.max(1, supply.worldGdp), 0.5, 1);
    for (const [kind, moves] of Object.entries(EVENT_SHOCKS) as Array<[EventKind, NonNullable<(typeof EVENT_SHOCKS)[EventKind]>]>) {
      if (player.eventLastFired?.[kind] !== s.day) continue;
      for (const m of moves) ex = addShock(ex, { good: m.good, size: m.size * weight, day: s.day, halfLife: m.halfLife, source: 'event', headline: m.headline, countryId: player.id });
    }
  }
  // 2. New wars involving producers or large economies.
  const seen = new Set(ex.seenWars);
  for (const w of Object.values(s.wars)) {
    if (w.status !== 'active' || seen.has(w.id)) continue;
    seen.add(w.id);
    const pair = [w.attackerId, w.defenderId];
    const oilShare = pair.reduce((v, id) => v + (supply.oilProduction[id] ?? 0), 0) / Math.max(1e-6, supply.worldOil);
    const foodShare = pair.reduce((v, id) => v + (supply.foodProduction[id] ?? 0), 0) / Math.max(1e-6, supply.worldFood);
    const gdpShare = pair.reduce((v, id) => v + Math.max(0, s.countries[id]?.economy.gdp ?? 0), 0) / Math.max(1, supply.worldGdp);
    const producer = (supply.oilProduction[w.attackerId] ?? 0) >= (supply.oilProduction[w.defenderId] ?? 0) ? w.attackerId : w.defenderId;
    if (oilShare >= 0.02) ex = addShock(ex, { good: 'oil', size: Math.min(0.3, 2.5 * oilShare), day: s.day, halfLife: 60, source: 'war', headline: 'War threatens oil exports', countryId: producer });
    if (foodShare >= 0.03) ex = addShock(ex, { good: 'food', size: Math.min(0.25, 1.5 * foodShare), day: s.day, halfLife: 60, source: 'war', headline: 'War disrupts grain exports', countryId: w.defenderId });
    if (gdpShare >= 0.03) ex = addShock(ex, { good: 'gold', size: Math.min(0.08, 0.5 * gdpShare), day: s.day, halfLife: 45, source: 'war', headline: 'War between major economies lifts gold', countryId: w.attackerId });
  }
  ex = { ...ex, seenWars: [...seen].slice(-MAX_SEEN_WARS) };
  // 3. World news from the exchange's seeded stream.
  const roll = nextRandom(ex.seed);
  let seed = roll.seed;
  if (roll.value < NEWS_DAILY_CHANCE) {
    const pickRoll = nextRandom(seed); seed = pickRoll.seed;
    const total = WORLD_NEWS.reduce((v, x) => v + x.weight, 0);
    let cursor = pickRoll.value * total, item = WORLD_NEWS[WORLD_NEWS.length - 1];
    for (const x of WORLD_NEWS) { cursor -= x.weight; if (cursor < 0) { item = x; break; } }
    const where = nextRandom(seed); seed = where.seed;
    const producers = item.producers === 'oil' ? supply.oilProduction : item.producers === 'food' ? supply.foodProduction : item.producers === 'gold' ? GOLD_PRODUCERS : item.producers === 'silver' ? SILVER_PRODUCERS : undefined;
    const countryId = producers ? topProducer(producers, s, where.value) : undefined;
    for (const m of item.moves) {
      const size = nextRandom(seed); seed = size.seed;
      ex = addShock(ex, { good: m.good, size: m.lo + (m.hi - m.lo) * size.value, day: s.day, halfLife: m.halfLife, source: 'news', headline: item.headline, ...(countryId ? { countryId } : {}) });
    }
  }
  return { ...ex, seed };
}

// ─── daily processing ────────────────────────────────────────────────────────

function settleAndDeliver(s: GameState, ex0: CommodityExchangeState): { state: GameState; ex: CommodityExchangeState } {
  let n = s, ex = ex0;
  const dueCash = ex.settlements.filter((x) => x.day <= s.day);
  for (const x of dueCash) n = addTreasury(n, x.countryId, x.amount);
  ex = { ...ex, settlements: ex.settlements.filter((x) => x.day > s.day) };
  // Phase 4: a delivery linked to a cargo flight settles when that flight lands, with what it actually delivered (a
  // blockade may intercept part of it). Unlinked deliveries (older saves) and any whose flight is gone keep the day rule.
  const cargo = new Map((s.world.flights ?? []).filter((f) => f.shipmentId).map((f) => [f.shipmentId!, f]));
  const due = (d: CommodityDelivery) => { const f = d.id ? cargo.get(d.id) : undefined; return f ? f.status === 'landed' : d.arriveDay <= s.day; };
  for (const d of ex.deliveries.filter(due)) {
    const f = d.id ? cargo.get(d.id) : undefined, p = commodityPosition(ex, d.countryId, d.good), moved = Math.min(d.amount, p.inbound);
    const lost = Math.min(moved, Math.max(0, f?.lost ?? 0)), arrived = moved - lost;
    ex = setPosition(ex, d.countryId, d.good, { ...p, inbound: p.inbound - moved, units: p.units + arrived, realized: p.realized - lost * p.avgCost });
  }
  ex = { ...ex, deliveries: ex.deliveries.filter((d) => !due(d)) };
  // Physical holdings are part of national stock: if the nation consumed it, the position shrinks (no P&L on use).
  // Storage is charged on delivered and vaulted units.
  for (const [id, goods] of Object.entries(ex.positions)) {
    if (!n.countries[id]) continue;
    let storage = 0;
    for (const [g, p] of Object.entries(goods) as Array<[Commodity, CommodityPosition]>) {
      const spec = COMMODITY_SPECS[g];
      const units = spec.physical ? Math.min(p.units, exchangeStock(n, id, g)) : p.units;
      const cost = units * ex.markets[g].price * spec.storageRate / 365;
      storage += cost;
      if (units !== p.units || cost > 0) ex = setPosition(ex, id, g, { ...p, units, avgCost: units + p.inbound > 1e-12 ? p.avgCost : 0, storagePaid: p.storagePaid + cost });
    }
    n = addTreasury(n, id, -storage);
  }
  return { state: n, ex };
}

function stepPrices(s: GameState, ex0: CommodityExchangeState, supply: WorldSupply): CommodityExchangeState {
  let seed = ex0.seed;
  const markets = { ...ex0.markets };
  for (const g of COMMODITIES) {
    const spec = COMMODITY_SPECS[g], m = markets[g];
    const fundamental = fundamentalPrice(ex0, supply, g);
    const target = Math.log(fundamental) + shockPremium(ex0, g, s.day);
    const e = gaussian(seed); seed = e.seed;
    // Mean reversion acts on the price without the temporary order impact, which fades separately.
    const impact = m.impact ?? 0, x = Math.log(m.price) - impact, nextImpact = Math.abs(impact * IMPACT_DECAY) < 1e-6 ? 0 : round6(impact * IMPACT_DECAY);
    const price = clamp(Math.exp(x + spec.reversion * (target - x) + spec.volatility * e.value + nextImpact), REFERENCE_PRICES[g] * 0.2, REFERENCE_PRICES[g] * 6);
    markets[g] = { price: round6(price), fundamental: round6(fundamental), history: [...m.history, round6(price)].slice(-HISTORY_DAYS), ...(nextImpact ? { impact: nextImpact } : {}) };
  }
  // Drop shocks that have fully decayed (older than five half-lives), keeping recent news for the panel.
  const shocks = ex0.shocks.filter((x) => s.day - x.day < Math.max(30, 5 * x.halfLife));
  const baseline = Object.fromEntries(COMMODITIES.map((g) => {
    const b = ex0.baseline[g];
    return [g, { stock: Math.max(1e-6, b.stock + (supply.stock[g] - b.stock) * BASELINE_DRIFT), ratio: b.ratio + (supply.ratio[g] - b.ratio) * BASELINE_DRIFT }];
  })) as CommodityExchangeState['baseline'];
  return { ...ex0, seed, markets, shocks, baseline };
}

/** AI importers buy dips and exporters sell spikes, through the same order function and limits as the player. */
function aiTrading(s: GameState): GameState {
  const physical = COMMODITIES.filter((g) => COMMODITY_SPECS[g].physical);
  const g = physical[s.day % physical.length];
  const ex = commodityExchange(s), m = ex.markets[g];
  const deviation = Math.log(m.price / m.fundamental);
  const limit = dailyOrderLimit(g) * AI_ORDER_SHARE;
  let n = s, done = 0;
  const others = activeCountries(s.countries).filter((c) => c.id !== s.playerCountryId && !c.globalSanctions);
  if (deviation < -0.04) {
    const buyers = others.map((c) => ({ c, need: importNeed(s, c, g) })).filter((x) => x.need > 0 && x.c.economy.treasury > 20).sort((a, b) => b.need - a.need || a.c.id.localeCompare(b.c.id));
    for (const { c, need } of buyers) {
      if (done >= AI_TRADES_PER_DAY) break;
      const q = Math.min(limit, need, c.economy.treasury * 0.01 / m.price, storageCapacity(c, g) - held(commodityPosition(commodityExchange(n), c.id, g)));
      if (!(q > dailyOrderLimit(g) * 0.01)) continue;
      const next = placeCommodityOrder(n, c.id, g, 'buy', q);
      if (next !== n) { n = next; done++; }
    }
  } else if (deviation > 0.06) {
    const sellers = others.map((c) => ({ c, stock: exportableStock(s, c.id, g) })).filter((x) => x.stock > 0).sort((a, b) => b.stock - a.stock || a.c.id.localeCompare(b.c.id));
    for (const { c, stock } of sellers) {
      if (done >= AI_TRADES_PER_DAY) break;
      const q = Math.min(limit, stock * 0.2);
      if (!(q > dailyOrderLimit(g) * 0.01)) continue;
      const next = placeCommodityOrder(n, c.id, g, 'sell', q);
      if (next !== n) { n = next; done++; }
    }
  }
  return n;
}

/** Daily exchange step: settlement and deliveries, storage, shocks, prices, then AI orders. Idempotent per day. */
export function processCommodityExchange(s: GameState): GameState {
  const existing = s.world.commodities;
  if (existing && existing.lastDay >= s.day) return s;
  const supply = worldSupply(s);
  const settled = settleAndDeliver(s, existing ?? createCommodityExchange(s));
  let ex = detectShocks(settled.state, settled.ex, supply);
  ex = { ...stepPrices(settled.state, ex, supply), lastDay: s.day };
  return aiTrading(withExchange(settled.state, ex));
}

// ─── read models for the exchange screen ─────────────────────────────────────

export interface CommodityQuote { good: Commodity; price: number; fundamental: number; premium: number; spread: number; change1d: number; change30d: number; history: number[]; firstHistoryDay: number }

/** Price, daily and 30-day change (shares), spread and active shock premium for one commodity. */
export function commodityQuote(s: GameState, g: Commodity): CommodityQuote {
  const ex = commodityExchange(s), m = ex.markets[g], h = m.history;
  const close = (back: number) => h[Math.max(0, h.length - 1 - back)] ?? m.price;
  // Orders move the mid after the close, so the live mid is compared with the previous day's close.
  const reference = ex.lastDay === s.day ? close(1) : close(0);
  return {
    good: g, price: m.price, fundamental: m.fundamental, premium: shockPremium(ex, g, s.day), spread: currentSpread(ex, g, s.day),
    change1d: m.price / reference - 1, change30d: m.price / close(30) - 1,
    history: h, firstHistoryDay: ex.lastDay - h.length + 1,
  };
}

/** Largest quantity the shared preview accepts now (0 when none), found by bisection. */
export function maxOrderQuantity(s: GameState, countryId: string, g: Commodity, side: 'buy' | 'sell'): number {
  if (!s.countries[countryId] || !COMMODITIES.includes(g)) return 0;
  const p = commodityPosition(commodityExchange(s), countryId, g);
  let hi = Math.max(0, dailyOrderLimit(g) - tradedToday(p, s.day));
  if (side === 'sell') hi = Math.min(hi, commodityOrderPreview(s, countryId, g, 'sell', 0).sellable);
  if (!(hi > 0)) return 0;
  if (commodityOrderPreview(s, countryId, g, side, hi).allowed) return hi;
  let lo = 0;
  for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (commodityOrderPreview(s, countryId, g, side, mid).allowed) lo = mid; else hi = mid; }
  return lo;
}

export interface CommodityNews { shock: CommodityShock; ageDays: number; /** Log premium left today. */ remaining: number }
/** Recent shocks, newest first, with what is left of each. */
export function commodityNews(s: GameState, limit = 8): CommodityNews[] {
  return commodityExchange(s).shocks.slice(0, limit).map((shock) => ({ shock, ageDays: s.day - shock.day, remaining: shock.size * Math.pow(0.5, Math.max(0, s.day - shock.day) / shock.halfLife) }));
}

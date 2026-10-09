/** 0.89 commodity exchange (engine: src/engine/systems/commodityExchange.ts). All prices are $B per unit. */
export type Commodity = 'food' | 'oil' | 'fuel' | 'iron' | 'coal' | 'copper' | 'aluminum' | 'uranium' | 'gold' | 'silver';

export interface CommodityMarket {
  /** Spot mid price. */
  price: number;
  /** Fundamental price from world stocks and flows; the spot reverts toward it (plus active shock premia). */
  fundamental: number;
  /** Daily closing mid prices, oldest first; the last entry is the close of `CommodityExchangeState.lastDay`. */
  history: number[];
  /** Temporary log price move from recent orders, fading daily; absent when zero. */
  impact?: number;
}

export interface CommodityShock {
  id: string;
  good: Commodity;
  /** Log-price premium at onset (0.2 ≈ +22%); decays with `halfLife` days. */
  size: number;
  day: number;
  halfLife: number;
  source: 'event' | 'war' | 'news';
  /** Short English headline, translated by the UI. */
  headline: string;
  countryId?: string;
}

export interface CommodityPosition {
  /** Units held: delivered physical stock (part of national stock) or vaulted precious metal. */
  units: number;
  /** Units bought and still on a cargo flight. */
  inbound: number;
  /** All-in average cost per unit (price, fee and freight) of units + inbound. */
  avgCost: number;
  realized: number;
  storagePaid: number;
  tradedDay: number;
  /** Units traded (buy + sell) on `tradedDay`, for the daily order limit. */
  tradedToday: number;
}

export interface CommodityDelivery { countryId: string; good: Commodity; amount: number; arriveDay: number }
export interface CommoditySettlement { countryId: string; amount: number; day: number }
export interface CommodityTrade { day: number; countryId: string; good: Commodity; side: 'buy' | 'sell'; quantity: number; price: number; counterpartyId?: string }

export interface CommodityExchangeState {
  /** Separate seeded stream for exchange noise and world news (simulationSeed is not consumed). */
  seed: number;
  lastDay: number;
  /** World stock and consumption/production ratio when the exchange opened; fundamentals are relative to it. */
  baseline: Record<Commodity, { stock: number; ratio: number }>;
  markets: Record<Commodity, CommodityMarket>;
  shocks: CommodityShock[];
  seenWars: string[];
  positions: Record<string, Partial<Record<Commodity, CommodityPosition>>>;
  deliveries: CommodityDelivery[];
  settlements: CommoditySettlement[];
  trades: CommodityTrade[];
}

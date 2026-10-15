import type { CountryState, ResourceStockpile } from '../../domain/game';

export interface ResourceFlow {
  production: ResourceStockpile;
  consumption: ResourceStockpile;
  net: ResourceStockpile;
  next: ResourceStockpile;
  foodShortage: boolean;
  oilShortage: boolean;
  /** 0 = at least SHORTAGE_RESERVE_DAYS of reserve (or a surplus), 1 = stock exhausted. */
  foodSeverity: number;
  oilSeverity: number;
}

/** A resource is in shortage when its stock covers fewer than this many days of net deficit. */
export const SHORTAGE_RESERVE_DAYS = 10;
/** Minimum daily food output per million people; the catalog caps output at 7/day, which starves populous states. */
export const FOOD_OUTPUT_FLOOR_PER_MILLION = 0.033;
/** Reserve days reported when production covers consumption (kept finite so it is safe to store or display). */
export const SURPLUS_RESERVE_DAYS = 9999;

const round = (value: number) => Number(value.toFixed(4));

/** Days the stock lasts at the current net deficit (production minus consumption). */
export function reserveDays(stock: number, production: number, consumption: number) {
  const deficit = consumption - production;
  return deficit <= 1e-9 ? SURPLUS_RESERVE_DAYS : Math.min(SURPLUS_RESERVE_DAYS, Math.max(0, stock) / deficit);
}
const severity = (days: number) => Math.min(1, Math.max(0, 1 - days / SHORTAGE_RESERVE_DAYS));

function dailyFlows(country: CountryState, boost = 1, consumer = 1,oilOutput=country.resourceProduction.oil) {
  const populationMillions = country.demographics.population / 1_000_000;
  const utilization = country.industry.utilization / 100;

  const production: ResourceStockpile = {
    // Per-capita floor applied here (not only at country creation) so saves from before 0.84 get it too.
    food: Math.max(country.resourceProduction.food, populationMillions * FOOD_OUTPUT_FLOOR_PER_MILLION) * (0.85 + country.economy.productivity / 500)*boost,
    oil: Math.min(country.resourceProduction.oil,Math.max(0,oilOutput)),
    iron: country.resourceProduction.iron + country.industry.mines * 0.025 * utilization,
    uranium: country.resourceProduction.uranium,
  };

  const consumption: ResourceStockpile = {
    food: Math.max(0.25, populationMillions * 0.035) * consumer,
    // Scales with economic size so importers' deficits stay within what world exporters can supply.
    oil: 0.02 + Math.sqrt(Math.max(0, country.economy.gdp)) * (0.006 + country.industry.utilization * 0.00004 + country.military.readiness * 0.00003),
    iron: country.industry.factories * 0.004 * utilization,
    uranium: 0,
  };
  return { production, consumption };
}

export const oilReserveDays = (country: CountryState, tradeInflow?: TradeInflow) => { const f = dailyFlows(country); return reserveDays(country.resources.oil, f.production.oil + (tradeInflow?.oil ?? 0), f.consumption.oil); };
export const foodReserveDays = (country: CountryState, tradeInflow?: TradeInflow, consumer=1) => { const f = dailyFlows(country,1,consumer); return reserveDays(country.resources.food, f.production.food + (tradeInflow?.food ?? 0), f.consumption.food); };

/** Contracted daily trade flow per resource (imports positive, exports negative). */
export type TradeInflow = Partial<Record<'food' | 'oil', number>>;

/**
 * `tradeInflow` lets the shortage test count contracted imports/exports (deliveries themselves are applied
 * by processTradeDeals). Without it, an importer covering its deficit would still be flagged as short.
 */
export function simulateResources(country: CountryState,boost=1,tradeInflow?: TradeInflow,consumer=1,oilOutput=country.resourceProduction.oil): ResourceFlow {
  const { production, consumption } = dailyFlows(country, boost,consumer,oilOutput);

  const net: ResourceStockpile = {
    food: round(production.food - consumption.food),
    oil: round(production.oil - consumption.oil),
    iron: round(production.iron - consumption.iron),
    uranium: round(production.uranium - consumption.uranium),
  };

  const next: ResourceStockpile = {
    food: Math.max(0, round(country.resources.food + net.food)),
    oil: Math.max(0, round(country.resources.oil + net.oil)),
    iron: Math.max(0, round(country.resources.iron + net.iron)),
    uranium: Math.max(0, round(country.resources.uranium + net.uranium)),
  };

  // With contracted imports, the stock that matters is what is on hand after today's deliveries arrive.
  const foodIn = tradeInflow?.food ?? 0, oilIn = tradeInflow?.oil ?? 0;
  const foodDays = reserveDays(next.food + Math.max(0, foodIn), production.food + foodIn, consumption.food);
  const oilDays = reserveDays(next.oil + Math.max(0, oilIn), production.oil + oilIn, consumption.oil);
  return {
    production,
    consumption,
    net,
    next,
    foodShortage: foodDays < SHORTAGE_RESERVE_DAYS,
    oilShortage: oilDays < SHORTAGE_RESERVE_DAYS,
    foodSeverity: severity(foodDays),
    oilSeverity: severity(oilDays),
  };
}

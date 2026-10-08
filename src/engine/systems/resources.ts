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
/** Reserve days reported when production covers consumption (kept finite so it is safe to store or display). */
export const SURPLUS_RESERVE_DAYS = 9999;

const round = (value: number) => Number(value.toFixed(4));

/** Days the stock lasts at the current net deficit (production minus consumption). */
export function reserveDays(stock: number, production: number, consumption: number) {
  const deficit = consumption - production;
  return deficit <= 1e-9 ? SURPLUS_RESERVE_DAYS : Math.min(SURPLUS_RESERVE_DAYS, Math.max(0, stock) / deficit);
}
const severity = (days: number) => Math.min(1, Math.max(0, 1 - days / SHORTAGE_RESERVE_DAYS));

function dailyFlows(country: CountryState, boost = 1) {
  const populationMillions = country.demographics.population / 1_000_000;
  const utilization = country.industry.utilization / 100;

  const production: ResourceStockpile = {
    food: country.resourceProduction.food * (0.85 + country.economy.productivity / 500)*boost,
    oil: country.resourceProduction.oil,
    iron: country.resourceProduction.iron + country.industry.mines * 0.025 * utilization,
    uranium: country.resourceProduction.uranium,
  };

  const consumption: ResourceStockpile = {
    food: Math.max(0.25, populationMillions * 0.035),
    // Scales with economic size so importers' deficits stay within what world exporters can supply.
    oil: 0.02 + Math.sqrt(Math.max(0, country.economy.gdp)) * (0.006 + country.industry.utilization * 0.00004 + country.military.readiness * 0.00003),
    iron: country.industry.factories * 0.004 * utilization,
    uranium: 0,
  };
  return { production, consumption };
}

export const oilReserveDays = (country: CountryState) => { const f = dailyFlows(country); return reserveDays(country.resources.oil, f.production.oil, f.consumption.oil); };
export const foodReserveDays = (country: CountryState) => { const f = dailyFlows(country); return reserveDays(country.resources.food, f.production.food, f.consumption.food); };

export function simulateResources(country: CountryState,boost=1): ResourceFlow {
  const { production, consumption } = dailyFlows(country, boost);

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

  const foodDays = reserveDays(next.food, production.food, consumption.food);
  const oilDays = reserveDays(next.oil, production.oil, consumption.oil);
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

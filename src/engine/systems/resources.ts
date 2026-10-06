import type { CountryState, ResourceStockpile } from '../../domain/game';

export interface ResourceFlow {
  production: ResourceStockpile;
  consumption: ResourceStockpile;
  net: ResourceStockpile;
  next: ResourceStockpile;
  foodShortage: boolean;
  oilShortage: boolean;
}

const round = (value: number) => Number(value.toFixed(4));

export function simulateResources(country: CountryState): ResourceFlow {
  const populationMillions = country.demographics.population / 1_000_000;
  const utilization = country.industry.utilization / 100;

  const production: ResourceStockpile = {
    food: country.resourceProduction.food * (0.85 + country.economy.productivity / 500),
    oil: country.resourceProduction.oil,
    iron: country.resourceProduction.iron + country.industry.mines * 0.025 * utilization,
    uranium: country.resourceProduction.uranium,
  };

  const consumption: ResourceStockpile = {
    food: Math.max(0.25, populationMillions * 0.035),
    oil: 0.25 + country.industry.utilization * 0.008 + country.military.readiness * 0.006,
    iron: country.industry.factories * 0.004 * utilization,
    uranium: 0,
  };

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

  return {
    production,
    consumption,
    net,
    next,
    foodShortage: next.food <= populationMillions * 0.15,
    oilShortage: next.oil <= 10,
  };
}

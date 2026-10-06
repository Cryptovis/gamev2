import type { CountryState, GameState } from '../domain/game';
import { simulateEconomy } from '../engine/systems/economy';
import { simulateResources } from '../engine/systems/resources';

export const selectPlayerCountry = (state: GameState): CountryState => state.countries[state.playerCountryId];

export const calculateDailyTaxRevenue = (country: CountryState): number =>
  (country.economy.gdp * (country.economy.taxRate / 100)) / 365;

export const calculateMilitaryPower = (country: CountryState): number => {
  const units =
    country.military.personnel * 0.002 +
    country.military.tanks * 1.6 +
    country.military.artillery * 1.1 +
    country.military.fighters * 8 +
    country.military.bombers * 11 +
    country.military.warships * 5;

  const quality =
    (country.military.readiness + country.military.morale + country.military.logistics + country.military.technology) / 400;

  return Math.round(units * (0.55 + quality * 0.9));
};

export const calculateIndustrialOutput = (country: CountryState): number => {
  const base =
    country.industry.factories * 3 +
    country.industry.refineries * 2.5 +
    country.industry.mines * 1.8 +
    country.industry.powerCapacity * 0.35;

  return Number((base * (country.industry.utilization / 100)).toFixed(2));
};

export const calculateResourcePressure = (country: CountryState): number => {
  const foodBuffer = country.resources.food / Math.max(1, country.demographics.population / 1_000_000);
  const oilBuffer = country.resources.oil / Math.max(1, country.military.readiness / 10);
  const pressure = 100 - Math.min(100, foodBuffer * 2 + oilBuffer * 1.5);
  return Number(Math.max(0, pressure).toFixed(1));
};

export const selectRelation = (state: GameState, fromId: string, toId: string) =>
  state.countries[fromId]?.diplomacy.relations[toId] ?? null;

export const calculateDailyResourceFlow = (country: CountryState) => simulateResources(country);

export const calculateEconomyForecast = (country: CountryState) => {
  const resources = simulateResources(country);
  return simulateEconomy(country, resources);
};

export const calculateEconomicHealth = (country: CountryState): number => {
  const growth = calculateEconomyForecast(country).dailyGrowthRate * 100_000;
  const score =
    65 + growth * 4 + country.economy.productivity * 0.25 - country.economy.inflation * 1.6 - country.economy.unemployment * 1.2;
  return Number(Math.min(100, Math.max(0, score)).toFixed(1));
};

import type { CountryState, EconomyState } from '../../domain/game';
import type { ResourceFlow } from './resources';

export interface EconomyFlow {
  taxRevenue: number;
  publicSpending: number;
  dailyBalance: number;
  dailyGrowthRate: number;
  next: EconomyState;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function simulateEconomy(country: CountryState, resources: ResourceFlow): EconomyFlow {
  const economy = country.economy;
  const utilization = country.industry.utilization / 100;
  const productivity = economy.productivity / 100;

  const taxRevenue = (economy.gdp * (economy.taxRate / 100)) / 365;
  const publicSpending = economy.gdp * 0.00035 + country.military.personnel*.00000006;
  const dailyBalance = taxRevenue - publicSpending;

  const productiveGrowth = utilization * productivity * 0.00016;
  const inflationDrag = Math.max(0, economy.inflation - 4) * 0.000004;
  const unemploymentDrag = Math.max(0, economy.unemployment - 6) * 0.000002;
  // Stored electricity is capped (1500) by energy.ts, so compare it with daily civil demand: pressure means the buffer no longer covers generation shortfalls.
  const civilElectricityDemand = country.industry.factories * 0.012 * utilization + (country.demographics.population / 1_000_000) * 0.004;
  const electricityPressure = country.processedResources.electricity < Math.max(8, civilElectricityDemand * 10);
  const shortageDrag = (resources.foodShortage ? 0.00018 : 0) + (resources.oilShortage ? 0.00012 : 0) + (electricityPressure ? 0.00009 : 0);
  const dailyGrowthRate = productiveGrowth - inflationDrag - unemploymentDrag - shortageDrag;

  const shortageInflation = (resources.foodShortage ? 0.025 : 0) + (resources.oilShortage ? 0.018 : 0);
  const inflationMeanReversion = (4 - economy.inflation) * 0.0008;
  const unemploymentTrend = dailyGrowthRate > 0 ? -0.003 : 0.006;

  const next: EconomyState = {
    ...economy,
    treasury: economy.treasury + dailyBalance,
    gdp: Math.max(1, economy.gdp * (1 + dailyGrowthRate)),
    inflation: clamp(economy.inflation + shortageInflation + inflationMeanReversion, -2, 80),
    unemployment: clamp(economy.unemployment + unemploymentTrend, 0, 45),
  };

  return { taxRevenue, publicSpending, dailyBalance, dailyGrowthRate, next };
}

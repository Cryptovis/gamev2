import type { CountryState } from "../../domain/game";
import type { ResourceFlow } from "./resources";
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export function populationForecast(c: CountryState, flow: ResourceFlow) {
  const base = c.demographics.baseGrowthRate ?? c.demographics.growthRate;
  const income = (c.economy.gdp * 1e9) / Math.max(1, c.demographics.population);
  const foodDays = flow.next.food / Math.max(0.01, flow.consumption.food);
  const welfare = clamp(
    38 +
      Math.min(24, income / 2000) +
      Math.min(18, foodDays / 3) +
      c.politics.stability * 0.15 -
      Math.max(0, c.economy.taxRate - 18) * 0.7 -
      Math.max(0, c.economy.inflation - 4) * 1.2 -
      c.economy.unemployment * 0.65 -
      (flow.foodShortage ? 28 : 0),
    0,
    100,
  );
  const births = clamp(
    11 +
      base * 10 +
      (welfare - 50) * 0.12 -
      Math.max(0, c.economy.taxRate - 25) * 0.09,
    4,
    45,
  );
  const deaths = clamp(
    9 +
      (flow.foodShortage ? 8 : 0) +
      Math.max(0, 35 - c.politics.stability) * 0.09,
    5,
    25,
  );
  const natural = (births - deaths) / 10;
  const emigrationRate =
    welfare < 45 ? -Math.min(2.5, (45 - welfare) * 0.055) : 0;
  const growthRate = clamp(natural + emigrationRate, -5, 4);
  const naturalChange = (c.demographics.population * natural) / 100 / 365;
  const emigrants = Math.max(
    0,
    (-c.demographics.population * emigrationRate) / 100 / 365,
  );
  const population = Math.max(
    1,
    c.demographics.population + naturalChange - emigrants,
  );
  const civilians = Math.max(0, population - c.military.personnel);
  return {
    ...c.demographics,
    baseGrowthRate: base,
    population,
    growthRate,
    workforce: Math.round(civilians * 0.4),
    welfare,
    birthsPerThousand: births,
    deathsPerThousand: deaths,
    netMigration: -emigrants,
    lastNaturalChange: naturalChange,
  };
}
export function distributeMigration(countries: Record<string, CountryState>) {
  const result = { ...countries };
  const destinations = Object.values(countries)
    .filter(
      (c) =>
        (c.demographics.welfare ?? 0) > 60 &&
        c.politics.stability >= 50 &&
        !c.controllerCountryId,
    )
    .sort(
      (a, b) =>
        (b.demographics.welfare ?? 0) - (a.demographics.welfare ?? 0) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 5);
  for (const c of Object.values(countries)) {
    const out = Math.max(0, -(c.demographics.netMigration ?? 0));
    if (!out) continue;
    const eligible = destinations.filter(
      (d) => d.id !== c.id && c.diplomacy.relations[d.id]?.status !== "war",
    );
    const weights = eligible.map(
        (d) =>
          Math.sqrt(d.demographics.population) * (d.demographics.welfare ?? 60),
      ),
      total = weights.reduce((a, b) => a + b, 0);
    if (!total) {
      const old = result[c.id];
      result[c.id] = {
        ...old,
        demographics: {
          ...old.demographics,
          population: old.demographics.population + out,
          workforce: old.demographics.workforce + Math.round(out * 0.4),
          netMigration: (old.demographics.netMigration ?? 0) + out,
          growthRate:
            (old.demographics.growthRate ?? 0) +
            (out / Math.max(1, old.demographics.population)) * 36500,
        },
      };
      continue;
    }
    eligible.forEach((d, i) => {
      const n = (out * weights[i]) / total,
        old = result[d.id];
      result[d.id] = {
        ...old,
        demographics: {
          ...old.demographics,
          population: old.demographics.population + n,
          netMigration: (old.demographics.netMigration ?? 0) + n,
          workforce: old.demographics.workforce + Math.round(n * 0.4),
        },
      };
    });
  }
  return result;
}
export function civilianPopulation(c: CountryState) {
  return Math.max(0, c.demographics.population - c.military.personnel);
}

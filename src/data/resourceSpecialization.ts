import type { CountryState } from '../domain/game';

const OIL = new Set(['SAU','RUS','USA','CAN','IRN','IRQ','ARE','KWT','QAT','VEN','NOR','DZA','LBY','NGA','AGO','AZE','KAZ','BRA']);
const FOOD = new Set(['USA','CAN','BRA','ARG','UKR','RUS','FRA','IND','CHN','AUS','THA','VNM','IDN','TUR','POL','ROU']);
const IRON = new Set(['AUS','BRA','CHN','IND','RUS','ZAF','UKR','KAZ','CAN','SWE','MRT']);
const URANIUM = new Set(['KAZ','CAN','NAM','AUS','NER','RUS','UZB','CHN']);
const INDUSTRY = new Set(['CHN','USA','DEU','JPN','KOR','IND','FRA','ITA','GBR','TUR','MEX','POL','CZE','ESP','CAN']);

export function applyStrategicSpecialization(country: CountryState): CountryState {
  const p = { ...country.resourceProduction };
  const r = { ...country.resources };
  const industry = { ...country.industry };

  if (OIL.has(country.id)) { p.oil = Math.max(p.oil * 2.5, 2.2); r.oil = Math.max(r.oil, 260); industry.refineries = Math.max(industry.refineries, 2); }
  if (FOOD.has(country.id)) { p.food = Math.max(p.food * 1.8, 1.5); r.food = Math.max(r.food, 220); }
  if (IRON.has(country.id)) { p.iron = Math.max(p.iron * 2.4, 1.25); r.iron = Math.max(r.iron, 190); industry.mines = Math.max(industry.mines, 2); }
  if (URANIUM.has(country.id)) { p.uranium = Math.max(p.uranium * 4, 0.08); r.uranium = Math.max(r.uranium, 18); }
  // The catalog caps food output at 7/day; populous states would otherwise starve within a year (consumption is 0.035/M).
  p.food = Math.max(p.food, (country.demographics.population / 1_000_000) * 0.04);
  if (INDUSTRY.has(country.id)) { industry.factories = Math.max(industry.factories, 5); industry.utilization = Math.min(92, industry.utilization + 4); country = { ...country, economy: { ...country.economy, productivity: Math.min(96, country.economy.productivity + 4) } }; }

  return { ...country, resourceProduction: p, resources: r, industry };
}

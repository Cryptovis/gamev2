import type { CountryState } from '../domain/game';
import { countryStateSchema } from '../domain/gameSchema';
import { WORLD_COUNTRY_SEEDS } from './worldCountryCatalog';
import { applyStrategicSpecialization } from './resourceSpecialization';

function build(seed: (typeof WORLD_COUNTRY_SEEDS)[number]): CountryState {
  const country: CountryState = {
    id: seed.id,
    name: seed.name,
    iso2: seed.iso2,
    mapName: seed.name,
    mapNumericId: seed.id,
    region: seed.region,
    subregion: seed.subregion,
    controllerCountryId: null,
    globalSanctions: false,
    demographics: { population: seed.population, workforce: Math.round(seed.population * 0.4), growthRate: 0.15 },
    economy: { gdp: seed.gdp, treasury: Math.max(4, seed.gdp * 0.11), debt: Math.max(2, seed.gdp * 0.55), taxRate: seed.regime === 'democracy' ? 22 : 18, inflation: seed.inflation, unemployment: seed.unemployment, productivity: seed.productivity },
    resources: { food: seed.food, oil: seed.oil, iron: seed.iron, uranium: seed.uranium },
    resourceProduction: { food: seed.foodProd, oil: seed.oilProd, iron: seed.ironProd, uranium: seed.uraniumProd },
    processedResources: { fuel: Math.max(20, seed.oil * 0.22 + seed.refineries * 8), steel: Math.max(16, seed.iron * 0.2 + seed.factories * 4), electricity: Math.max(12, seed.power * 0.45) },
    industry: { factories: seed.factories, refineries: seed.refineries, mines: seed.mines, powerCapacity: seed.power, utilization: seed.utilization },
    politics: { approval: seed.approval, stability: seed.stability, regime: seed.regime, electionDaysRemaining: ['democracy','republic'].includes(seed.regime) ? 1460 : 3650 },
    society: { dominantReligion: seed.religion, ideology: seed.ideology, cohesion: Math.min(92, Math.max(35, seed.stability + 4)), secularization: seed.religion === 'unaffiliated' ? 80 : seed.ideology === 'pluralist' ? 48 : 24, influencePressure: { ideology: 0, religion: 0 } },
    military: { personnel: seed.personnel, tanks: seed.tanks, artillery: seed.artillery, fighters: seed.fighters, bombers: seed.bombers, warships: seed.warships, readiness: seed.readiness, morale: seed.morale, logistics: seed.logistics, technology: seed.technology, assessment: { gfpRank: seed.gfpRank, gfpIndex: seed.gfpIndex, capability: seed.militaryCapability, dataConfidence: seed.gfpRank ? 'gfp-2026' : 'estimated' } },
    diplomacy: { reputation: 55, relations: {} },
    intelligence: { networkStrength: 42, counterIntelligence: 50, intelConfidence: 52 },
    ministries: {
      allocations: { economy: 22, defense: 20, science: 18, intelligence: 12, interior: 15, society: 13 },
      efficiency: { economy: 62, defense: 60, science: 58, intelligence: 56, interior: 61, society: 59 },
    },
    technology: { researchPoints: Math.max(8, seed.technology * 0.35), unlocked: [] },
    ai: { strategicGoal: seed.stability < 50 ? 'stabilize' : seed.militaryCapability > 70 ? 'rearm' : seed.gdp > 1000 ? 'expand_influence' : 'grow_economy', goalProgress: 0, threatFocus: null, lastGoalReviewDay: 0 },
  };
  return countryStateSchema.parse(applyStrategicSpecialization(country));
}

const list = WORLD_COUNTRY_SEEDS.map(build);
const countries = Object.fromEntries(list.map((country) => [country.id, country]));

function setRelation(a: string, b: string, score: number) {
  if (!countries[a] || !countries[b]) return;
  const status = score >= 65 ? 'ally' : score >= 20 ? 'friendly' : score <= -50 ? 'hostile' : 'neutral';
  countries[a].diplomacy.relations[b] = { score, status, treaties: [], sanctions: false };
  countries[b].diplomacy.relations[a] = { score, status, treaties: [], sanctions: false };
}

// A small set of authored relations seeds gameplay; all other bilateral relations begin neutral and are created lazily.
setRelation('TUR','GRC',8); setRelation('TUR','BGR',24); setRelation('TUR','GEO',35); setRelation('TUR','ARM',5);
setRelation('TUR','AZE',62); setRelation('TUR','IRN',12); setRelation('TUR','IRQ',18); setRelation('TUR','SYR',-18);
setRelation('TUR','RUS',4); setRelation('TUR','UKR',20); setRelation('TUR','DEU',32); setRelation('TUR','USA',30);
if (countries.TUR?.diplomacy.relations.BGR && countries.BGR?.diplomacy.relations.TUR) {
  countries.TUR.diplomacy.relations.BGR.treaties.push('trade');
  countries.BGR.diplomacy.relations.TUR.treaties.push('trade');
}

export const initialCountries = countries;

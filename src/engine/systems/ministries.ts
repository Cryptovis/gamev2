import type { CountryState, MinistryKey } from '../../domain/game';

const KEYS: MinistryKey[] = ['economy','defense','science','intelligence','interior','society'];
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));

export function normalizedMinistryShare(country: CountryState, key: MinistryKey) {
  const total = KEYS.reduce((sum,k)=>sum+country.ministries.allocations[k],0) || 1;
  return country.ministries.allocations[key] / total;
}

export function setMinistryAllocation(country: CountryState, key: MinistryKey, value: number): CountryState {
  const nextValue = clamp(value, 5, 45);
  const current = country.ministries.allocations;
  const others = KEYS.filter((k)=>k!==key);
  const remaining = Math.max(0, 100-nextValue);
  const otherTotal = others.reduce((sum,k)=>sum+current[k],0) || 1;
  const allocations = { ...current, [key]: nextValue };
  for (const other of others) allocations[other] = Number((remaining * current[other] / otherTotal).toFixed(2));
  return { ...country, ministries: { ...country.ministries, allocations } };
}

export function processMinistries(country: CountryState): CountryState {
  const economy = normalizedMinistryShare(country,'economy');
  const defense = normalizedMinistryShare(country,'defense');
  const science = normalizedMinistryShare(country,'science');
  const intelligence = normalizedMinistryShare(country,'intelligence');
  const interior = normalizedMinistryShare(country,'interior');
  const society = normalizedMinistryShare(country,'society');

  const efficiency = country.ministries.efficiency;
  return {
    ...country,
    economy: {
      ...country.economy,
      productivity: clamp(country.economy.productivity + economy * efficiency.economy * 0.0008, 1, 100),
    },
    industry: {
      ...country.industry,
      utilization: clamp(country.industry.utilization + economy * efficiency.economy * 0.0005, 1, 100),
    },
    military: {
      ...country.military,
      readiness: clamp(country.military.readiness + defense * efficiency.defense * 0.0008 - 0.003, 0, 100),
      logistics: clamp(country.military.logistics + defense * efficiency.defense * 0.0006 - 0.002, 0, 100),
    },
    intelligence: {
      ...country.intelligence,
      networkStrength: clamp(country.intelligence.networkStrength + intelligence * efficiency.intelligence * 0.0008, 0, 100),
      counterIntelligence: clamp(country.intelligence.counterIntelligence + intelligence * efficiency.intelligence * 0.0007, 0, 100),
    },
    politics: {
      ...country.politics,
      stability: clamp(country.politics.stability + interior * efficiency.interior * 0.00055 + society * efficiency.society * 0.00028, 0, 100),
    },
    society: {
      ...country.society,
      cohesion: clamp(country.society.cohesion + society * efficiency.society * 0.00055, 0, 100),
    },
    technology: {
      ...country.technology,
      researchPoints: country.technology.researchPoints + 0.018 + science * efficiency.science * 0.018,
    },
  };
}

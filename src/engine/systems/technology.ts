import type { CountryState, GameState } from '../../domain/game';
import { technologyById } from '../../data/technologyTree';

const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));

export function canUnlockTechnology(country: CountryState, technologyId: string) {
  const node = technologyById[technologyId];
  if (!node || country.technology.unlocked.includes(technologyId)) return false;
  return node.prerequisites.every((id)=>country.technology.unlocked.includes(id)) && country.technology.researchPoints >= node.cost;
}

export function unlockTechnology(state: GameState, countryId: string, technologyId: string): GameState {
  const country = state.countries[countryId];
  const node = technologyById[technologyId];
  if (!country || !node || !canUnlockTechnology(country,technologyId)) return state;
  let next: CountryState = {
    ...country,
    technology: { researchPoints: country.technology.researchPoints-node.cost, unlocked:[...country.technology.unlocked,technologyId] },
  };
  if (node.category==='economy') next={...next,economy:{...next.economy,productivity:clamp(next.economy.productivity+2.5,0,100)}};
  if (node.category==='industry') next={...next,industry:{...next.industry,utilization:clamp(next.industry.utilization+1.5,0,100)}};
  if (node.category==='military') next={...next,military:{...next.military,technology:clamp(next.military.technology+2.2,0,100),readiness:clamp(next.military.readiness+1.2,0,100)}};
  if (node.category==='intelligence') next={...next,intelligence:{...next.intelligence,intelConfidence:clamp(next.intelligence.intelConfidence+4,0,100)}};
  if (node.category==='society') next={...next,society:{...next.society,cohesion:clamp(next.society.cohesion+3,0,100)}};
  return { ...state, countries:{...state.countries,[countryId]:next}, sitrep:[`TECH // ${node.name} unlocked by ${country.name}.`,...state.sitrep].slice(0,12) };
}

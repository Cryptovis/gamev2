import {activeCountries} from '../../domain/sovereignty';
import type { CountryState, GameState } from '../../domain/game';
import { nextRandom } from '../rng';
import { changeRelations, relationFor } from './diplomacy';
import { processCouncilSanctions } from './council';

const clamp = (value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));

function updateCountry(state: GameState, country: CountryState, seed: number) {
  const r1 = nextRandom(seed);
  const r2 = nextRandom(r1.seed);
  const relation = relationFor(country, state.playerCountryId);
  const readinessTarget = relation.status === 'hostile' || relation.status === 'war' ? 78 : 64;
  const readinessDelta = Math.sign(readinessTarget - country.military.readiness) * Math.min(.4, Math.abs(readinessTarget-country.military.readiness));
  // Tax policy is goal-directed only (strategicGoals.ts); the old weekly random walk fought it (audit D9).
  const nextCountry: CountryState = {
    ...country,
    military:{...country.military,readiness:clamp(country.military.readiness+readinessDelta,0,100)},
  };
  let next: GameState = { ...state, simulationSeed:r2.seed, countries:{...state.countries,[country.id]:nextCountry} };
  if (relation.status !== 'war') {
    const strategicDrift = relation.score > 20 ? 0.5 : relation.score < -20 ? -0.5 : 0;
    const randomDrift = r2.value > .8 ? 1 : r2.value < .2 ? -1 : 0;
    if (strategicDrift + randomDrift !== 0) next = changeRelations(next,country.id,state.playerCountryId,strategicDrift+randomDrift);
  }
  return next;
}

export function processCountryAI(input: GameState): GameState {
  // Council sanctions expiry is checked daily alongside the world's policy cycle (no separate tick hook).
  const state = processCouncilSanctions(input);
  if (state.day - state.lastAiDay < 7) return state;
  let next = state;
  for (const country of activeCountries(next.countries)) {
    if (country.id === next.playerCountryId || country.controllerCountryId) continue;
    next = updateCountry(next, country, next.simulationSeed);
  }
  return { ...next, lastAiDay:state.day, sitrep:[`AI // Regional governments completed their weekly policy cycle.`,...next.sitrep].slice(0,12) };
}

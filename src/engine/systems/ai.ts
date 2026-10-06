import type { CountryState, GameState } from '../../domain/game';
import { nextRandom } from '../rng';
import { changeRelations, relationFor } from './diplomacy';

const clamp = (value:number,min:number,max:number)=>Math.min(max,Math.max(min,value));

function updateCountry(state: GameState, country: CountryState, seed: number) {
  const r1 = nextRandom(seed);
  const r2 = nextRandom(r1.seed);
  const relation = relationFor(country, state.playerCountryId);
  const taxDelta = r1.value > .72 ? 1 : r1.value < .28 ? -1 : 0;
  const readinessTarget = relation.status === 'hostile' || relation.status === 'war' ? 78 : 64;
  const readinessDelta = Math.sign(readinessTarget - country.military.readiness) * Math.min(.4, Math.abs(readinessTarget-country.military.readiness));
  const nextCountry: CountryState = {
    ...country,
    economy:{...country.economy,taxRate:clamp(country.economy.taxRate+taxDelta,8,45)},
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

export function processCountryAI(state: GameState): GameState {
  if (state.day - state.lastAiDay < 7) return state;
  let next = state;
  for (const country of Object.values(next.countries)) {
    if (country.id === next.playerCountryId || country.controllerCountryId) continue;
    next = updateCountry(next, country, next.simulationSeed);
  }
  return { ...next, lastAiDay:state.day, sitrep:[`AI // Regional governments completed their weekly policy cycle.`,...next.sitrep].slice(0,12) };
}

import type {GameState} from '../domain/game';
import {warFuelReadiness} from '../engine/systems/warRules';
/** Existing combat tests begin after preparation; readiness rejection has its own regression tests. */
export function withWarFuel<T extends GameState>(state:T,attackerId=state.playerCountryId):T {
 const country=state.countries[attackerId],fuel=Math.max(country.processedResources.fuel,warFuelReadiness(state,attackerId).required);
 return {...state,countries:{...state.countries,[attackerId]:{...country,processedResources:{...country.processedResources,fuel}}}};
}

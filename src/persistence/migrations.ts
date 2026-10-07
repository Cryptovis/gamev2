import type { GameState } from '../domain/game';

import {createIndustrialMap} from '../engine/systems/industrialEconomy';
import {createLeadership} from '../engine/systems/leadership';
export const CURRENT_SCHEMA_VERSION = 13;
export function migrateSave(state:GameState|null|undefined):GameState|null {
 if(!state)return null;
 if(state.schemaVersion===12&&state.countries&&state.production&&state.infrastructure){
  return {...state,schemaVersion:13,industrialEconomy:createIndustrialMap(state.countries),industrialContracts:{},leadership:createLeadership(state.countries[state.playerCountryId].economy.gdp)};
 }
 return canLoadSave(state)?state:null;
}

export function canLoadSave(state: GameState | null | undefined): state is GameState {
  return Boolean(state && state.schemaVersion === CURRENT_SCHEMA_VERSION && state.industrialEconomy && state.industrialContracts && state.leadership && state.blocs && state.council && state.intelOperations && state.intelligenceLedger && state.culturalInfluence && state.playerProfile && state.preferredSpeed && state.mapPresentation && state.advisorCooldownUntil !== undefined && state.embassies && state.diplomaticOffers && state.production && state.infrastructure);
}

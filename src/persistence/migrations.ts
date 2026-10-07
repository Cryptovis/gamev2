import type { GameState } from '../domain/game';

import {createIndustrialMap} from '../engine/systems/industrialEconomy';
import {createLeadership} from '../engine/systems/leadership';
import {createWorld} from '../engine/systems/worldInstitutions';
export const CURRENT_SCHEMA_VERSION = 14;
export function migrateSave(state:GameState|null|undefined):GameState|null {
 if(!state)return null;
 if(state.schemaVersion===12&&state.countries&&state.production&&state.infrastructure){
  state={...state,schemaVersion:13,industrialEconomy:createIndustrialMap(state.countries),industrialContracts:{},leadership:createLeadership(state.countries[state.playerCountryId].economy.gdp)};
 }
 if(state.schemaVersion===13)state={...state,schemaVersion:14,world:createWorld(state.countries,state.playerCountryId)};
 return canLoadSave(state)?state:null;
}

export function canLoadSave(state: GameState | null | undefined): state is GameState {
  return Boolean(state && state.schemaVersion === CURRENT_SCHEMA_VERSION && state.world && state.industrialEconomy && state.industrialContracts && state.leadership && state.blocs && state.council && state.intelOperations && state.intelligenceLedger && state.culturalInfluence && state.playerProfile && state.preferredSpeed && state.mapPresentation && state.advisorCooldownUntil !== undefined && state.embassies && state.diplomaticOffers && state.production && state.infrastructure);
}

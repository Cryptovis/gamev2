import {recordEconomicHistory} from '../engine/systems/economicHistory';
import {createLiving} from '../engine/systems/livingEconomy';
import {createGovernance,governance} from '../engine/systems/governance';
import type {GameState} from '../domain/game';
import {createIndustrialMap} from '../engine/systems/industrialEconomy';
import {createLeadership} from '../engine/systems/leadership';
import {createWorld} from '../engine/systems/worldInstitutions';
import {validSaveShape} from './validation';
export const CURRENT_SCHEMA_VERSION=16;
export function migrateSave(input:GameState|null|undefined):GameState|null {
 try {
  let state=input;if(!state||!state.countries?.[state.playerCountryId])return null;
  if(state.schemaVersion===12&&state.production&&state.infrastructure)state={...state,schemaVersion:13,industrialEconomy:createIndustrialMap(state.countries),industrialContracts:{},leadership:createLeadership(state.countries[state.playerCountryId].economy.gdp)};
  if(state.schemaVersion===13)state={...state,schemaVersion:14,world:createWorld(state.countries,state.playerCountryId)};
  if(state.schemaVersion===14)state={...state,schemaVersion:15,world:{...state.world,campaignId:state.world?.campaignId??`legacy-${state.playerCountryId}-${state.simulationSeed}`,commandIds:state.world?.commandIds??[],journal:state.world?.journal??state.sitrep.map((message,index)=>({id:`legacy:${index}`,day:input!.day,message,kind:'legacy' as const}))}};
  if(state.schemaVersion===15)state=recordEconomicHistory({...state,schemaVersion:16});
  if(!canLoadSave(state))return null;
  const defaults=createIndustrialMap(state.countries);
  const industrialEconomy=Object.fromEntries(Object.entries(state.industrialEconomy).map(([id,n])=>[id,{...n,stock:{...defaults[id]?.stock,...n.stock},facilities:{...defaults[id]?.facilities,...n.facilities},enabled:{...defaults[id]?.enabled,...n.enabled},potential:{...defaults[id]?.potential,...n.potential},deposits:{...defaults[id]?.deposits,...n.deposits}}]));
  const g=governance(state);
  return {...(state.world.economicHistory?state:recordEconomicHistory(state)),industrialEconomy,world:{...state.world,economicHistory:state.world.economicHistory??recordEconomicHistory(state).world.economicHistory,living:state.world.living??createLiving(state.countries),governance:{...g,academies:{...createGovernance(state.countries).academies,...g.academies}}}};
 }catch(error){console.warn('Save migration failed:',error);return null;}
}
export function canLoadSave(state:GameState|null|undefined):state is GameState {
 return !!state&&state.schemaVersion===CURRENT_SCHEMA_VERSION&&validSaveShape(state);
}

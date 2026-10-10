import {recordEconomicHistory} from '../engine/systems/economicHistory';
import {createLiving} from '../engine/systems/livingEconomy';
import {createGovernance,governance} from '../engine/systems/governance';
import type {GameState} from '../domain/game';
import {createIndustrialMap} from '../engine/systems/industrialEconomy';
import {createLeadership} from '../engine/systems/leadership';
import {createWorld} from '../engine/systems/worldInstitutions';
import {validSaveShape} from './validation';
import {migrateTacticalBattle} from '../engine/systems/tactical';
export const CURRENT_SCHEMA_VERSION=17;
/** Oldest schema that can still be migrated. Older saves are refused with a warning instead of silently. */
export const OLDEST_SUPPORTED_SCHEMA=12;

/**
 * One step per schema version (audit A6): each takes a save at version `v` and returns it at `v + 1`.
 * A step that cannot apply returns the save unchanged, which stops the chain and the save is refused.
 * `original` is the save as loaded, for steps that need its values.
 */
const MIGRATIONS:Record<number,(state:GameState,original:GameState)=>GameState>={
 12:s=>s.production&&s.infrastructure?{...s,schemaVersion:13,industrialEconomy:createIndustrialMap(s.countries),industrialContracts:{},leadership:createLeadership(s.countries[s.playerCountryId].economy.gdp)}:s,
 13:s=>({...s,schemaVersion:14,world:createWorld(s.countries,s.playerCountryId)}),
 14:(s,original)=>({...s,schemaVersion:15,world:{...s.world,campaignId:s.world?.campaignId??`legacy-${s.playerCountryId}-${s.simulationSeed}`,commandIds:s.world?.commandIds??[],journal:s.world?.journal??s.sitrep.map((message,index)=>({id:`legacy:${index}`,day:original.day,message,kind:'legacy' as const}))}}),
 15:s=>recordEconomicHistory({...s,schemaVersion:16}),
 // 0.85 HD War v2: tactical battles gain a sized grid, objective list and action timeline. 6×6 boards are kept as they are.
 16:s=>({...s,schemaVersion:17,wars:Object.fromEntries(Object.entries(s.wars).map(([id,war])=>[id,war.tactical?{...war,tactical:migrateTacticalBattle(war.tactical as Parameters<typeof migrateTacticalBattle>[0])}:war]))}),
};

/** Runs the migration steps in order until the save reaches the current schema or a step cannot apply. */
export function migrateSchema(input:GameState):GameState {
 let state=input;
 while(state.schemaVersion<CURRENT_SCHEMA_VERSION){
  const step=MIGRATIONS[state.schemaVersion];
  if(!step)break;
  const next=step(state,input);
  if(next.schemaVersion!==state.schemaVersion+1)break;
  state=next;
 }
 return state;
}

/** Fills defaults added without a schema bump (new facilities, living world, academies, economic history). */
function withCurrentDefaults(state:GameState):GameState {
 const renamed:Record<string,{old:string;name:string}>={TUR:{old:'Turkey',name:'Türkiye'},MKD:{old:'Macedonia',name:'North Macedonia'},SWZ:{old:'eSwatini',name:'Eswatini'}};
 state={...state,countries:Object.fromEntries(Object.entries(state.countries).map(([id,c])=>[id,renamed[id]?.old===c.name?{...c,name:renamed[id].name}:c]))};
 const defaults=createIndustrialMap(state.countries);
 const industrialEconomy=Object.fromEntries(Object.entries(state.industrialEconomy).map(([id,n])=>[id,{...n,stock:{...defaults[id]?.stock,...n.stock},facilities:{...defaults[id]?.facilities,...n.facilities},enabled:{...defaults[id]?.enabled,...n.enabled},potential:{...defaults[id]?.potential,...n.potential},deposits:{...defaults[id]?.deposits,...n.deposits}}]));
 const g=governance(state);
 return {...(state.world.economicHistory?state:recordEconomicHistory(state)),industrialEconomy,world:{...state.world,economicHistory:state.world.economicHistory??recordEconomicHistory(state).world.economicHistory,living:state.world.living??createLiving(state.countries),governance:{...g,academies:{...createGovernance(state.countries).academies,...g.academies}}}};
}

export function migrateSave(input:GameState|null|undefined):GameState|null {
 try {
  if(!input||!input.countries?.[input.playerCountryId])return null;
  if(!Number.isInteger(input.schemaVersion)||input.schemaVersion<OLDEST_SUPPORTED_SCHEMA){console.warn(`Save schema ${input.schemaVersion} is older than the oldest supported schema (${OLDEST_SUPPORTED_SCHEMA}).`);return null;}
  if(input.schemaVersion>CURRENT_SCHEMA_VERSION){console.warn(`Save schema ${input.schemaVersion} is newer than this game (${CURRENT_SCHEMA_VERSION}).`);return null;}
  const state=migrateSchema(input);
  if(!canLoadSave(state)){console.warn(`Save could not be migrated from schema ${input.schemaVersion}.`);return null;}
  // The final state is validated again so default-filling can never produce a save that would be refused on write.
  const result=withCurrentDefaults(state);
  return canLoadSave(result)?result:null;
 }catch(error){console.warn('Save migration failed:',error);return null;}
}
export function canLoadSave(state:GameState|null|undefined):state is GameState {
 return !!state&&state.schemaVersion===CURRENT_SCHEMA_VERSION&&validSaveShape(state);
}

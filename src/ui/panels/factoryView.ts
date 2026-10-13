import type {GameState} from '../../domain/game';
import type {FacilityKind,IndustrialGood} from '../../domain/industrial';
import {FACILITIES} from '../../data/industrialCatalog';

/** The engine allows at most this many construction projects at once (`buildFacility`). */
export const PROJECT_LIMIT=6;
export type BuildBlock='limit'|'tech'|'treasury'|'deposit'|'foreign'|null;

/**
 * Why `industry/build` would be refused for this country, mirroring `buildFacility` condition by condition.
 * `foreign`: the command always acts on the player's own country. A unit test compares this with the engine for every kind.
 */
export function facilityBuildBlock(state:GameState,countryId:string,kind:FacilityKind):BuildBlock{
 const c=state.countries[countryId],n=state.industrialEconomy[countryId],d=FACILITIES[kind];
 if(!c||!n||!d||countryId!==state.playerCountryId)return 'foreign';
 if(n.projects.length>=PROJECT_LIMIT)return 'limit';
 if(d.tech&&!c.technology.unlocked.includes(d.tech))return 'tech';
 if(d.deposit&&n.deposits[d.deposit]<=0)return 'deposit';
 if(!Number.isFinite(c.economy.treasury)||c.economy.treasury<d.cost)return 'treasury';
 return null;
}

export interface FactoryView{
 kind:FacilityKind;label:string;count:number;enabled:boolean;
 dailyOutput:{good:IndustrialGood|null;amount:number;healthy:boolean};
 dailyPower:{amount:number;healthy:boolean};
 /** The limiting input the last tick reported ('electricity', 'treasury', a good's label, 'deposit depleted'); null when running normally or not built. */
 bottleneck:string|null;
 projects:number;projectLimit:typeof PROJECT_LIMIT;limitReached:boolean;
 build:BuildBlock;
}

export function factoryView(state:GameState,countryId:string,kind:FacilityKind):FactoryView|null{
 const n=state.industrialEconomy[countryId],d=FACILITIES[kind];
 if(!n||!d)return null;
 const count=n.facilities[kind]??0,enabled=n.enabled[kind]!==false,reported=n.bottlenecks[kind];
 // The engine writes 'operational' for a healthy tick; it is a status, not a limit.
 const bottleneck=count>0&&enabled&&reported&&reported!=='operational'?reported:null;
 const running=count>0&&enabled;
 return {
  kind,label:d.label,count,enabled,
  dailyOutput:{good:d.output??null,amount:d.output?n.lastOutput[d.output]??0:0,healthy:running&&bottleneck===null},
  dailyPower:{amount:d.power*count,healthy:bottleneck!=='electricity'},
  bottleneck,
  projects:n.projects.length,projectLimit:PROJECT_LIMIT,limitReached:n.projects.length>=PROJECT_LIMIT,
  build:facilityBuildBlock(state,countryId,kind),
 };
}

/** Wording of a build block, as `Research {0}` style English keys for the i18n layer. */
export function buildBlockLabel(block:Exclude<BuildBlock,null>,tech?:string):string{
 switch(block){
  case 'limit':return 'Limit Reached';
  case 'tech':return tech?'Research {0}':'Research required';
  case 'treasury':return 'Insufficient treasury.';
  case 'deposit':return 'deposit depleted';
  case 'foreign':return 'Only your own country can build.';
 }
}

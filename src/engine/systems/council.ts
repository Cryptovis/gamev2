import {activeCountries} from '../../domain/sovereignty';
import type { CouncilResolution, CouncilResolutionType, GameState } from '../../domain/game';
import { endWarRelation } from './diplomacy';

const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
/** Global Council sanctions lapse after a year unless re-imposed by a new resolution. */
export const SANCTIONS_DURATION_DAYS=365;
const inActiveWar=(state:GameState,id:string)=>Object.values(state.wars).some((w)=>w.status==='active'&&(w.attackerId===id||w.defenderId===id));

function supportFor(state:GameState,targetId:string,type:CouncilResolutionType){
  const target=state.countries[targetId]; if(!target)return 0;
  let yes=0,total=0;
  for(const country of activeCountries(state.countries)){
    if(country.id===targetId)continue;
    const weight=Math.max(1,Math.sqrt(Math.max(1,country.economy.gdp)));
    const relation=country.diplomacy.relations[targetId]?.score??0;
    const hostility=Math.max(0,-relation);
    const warPenalty=Object.values(state.wars).some((w)=>w.status==='active'&&(w.attackerId===targetId||w.defenderId===targetId))?18:0;
    let inclination=50 + hostility*0.35 + warPenalty;
    if(type==='humanitarian_aid')inclination=45+relation*0.25+Math.max(0,50-target.politics.stability)*0.35;
    if(type==='ceasefire')inclination=55+warPenalty*1.3;
    yes+=weight*clamp(inclination,0,100); total+=weight*100;
  }
  return total?Number((yes/total*100).toFixed(1)):0;
}

/** The player's command and AI members (aiWar.ts) propose under the same influence costs and vote. */
export function proposeCouncilResolution(state:GameState,type:CouncilResolutionType,targetId:string,proposerId=state.playerCountryId):GameState{
  const player=state.countries[proposerId]; const target=state.countries[targetId]; if(!player||!target||target.id===player.id)return state;
  if(type==='ceasefire'&&!inActiveWar(state,targetId))return {...state,sitrep:[`COUNCIL // ${target.name} is not at war; no ceasefire to impose.`,...state.sitrep].slice(0,12)};
  const influence=state.council.influenceByCountry[player.id]??20; const cost=type==='sanctions'?10:type==='ceasefire'?8:6;
  if(influence<cost)return {...state,sitrep:[`COUNCIL // Not enough diplomatic influence.`,...state.sitrep].slice(0,12)};
  const support=supportFor(state,targetId,type); const passed=support>=55;
  const resolution:CouncilResolution={id:`GC-${type}-${targetId}-${state.day}`,type,proposerId:player.id,targetCountryId:targetId,supportPercent:support,passed,day:state.day,summary:`${type.replaceAll('_',' ')} on ${target.name}: ${support}% support`};
  let next:GameState={...state,council:{influenceByCountry:{...state.council.influenceByCountry,[player.id]:influence-cost},history:[resolution,...state.council.history].slice(0,20)}};
  if(passed&&type==='sanctions')next={...next,countries:{...next.countries,[target.id]:{...target,globalSanctions:true,globalSanctionsUntil:state.day+SANCTIONS_DURATION_DAYS}}};
  if(passed&&type==='humanitarian_aid'&&player.economy.treasury>=5){next={...next,countries:{...next.countries,[player.id]:{...player,economy:{...player.economy,treasury:player.economy.treasury-5},diplomacy:{...player.diplomacy,reputation:clamp(player.diplomacy.reputation+2,0,100)}},[target.id]:{...target,politics:{...target.politics,stability:clamp(target.politics.stability+4,0,100)}}}};}
  if(passed&&type==='ceasefire'){
    const active=Object.values(next.wars).filter((w)=>w.status==='active'&&(w.attackerId===targetId||w.defenderId===targetId));
    for(const war of active){next={...next,wars:{...next.wars,[war.id]:{...war,status:'withdrawn',autoAssault:false,lastReport:'Global Council ceasefire imposed.'}}};next=endWarRelation(next,war.attackerId,war.defenderId);}
  }
  return {...next,sitrep:[`COUNCIL // ${resolution.summary} — ${passed?'PASSED':'FAILED'}.`,...next.sitrep].slice(0,12)};
}

/** Lifts expired Global Council sanctions; legacy sanctions without an expiry get a fresh one-year term. */
export function processCouncilSanctions(state:GameState):GameState{
  let countries=state.countries; const lifted:string[]=[];
  for(const country of Object.values(state.countries)){
    if(!country.globalSanctions)continue;
    const until=country.globalSanctionsUntil;
    if(until===undefined){countries={...countries,[country.id]:{...country,globalSanctionsUntil:state.day+SANCTIONS_DURATION_DAYS}};continue;}
    if(state.day<until)continue;
    countries={...countries,[country.id]:{...country,globalSanctions:false,globalSanctionsUntil:undefined}}; lifted.push(country.name);
  }
  if(countries===state.countries)return state;
  return {...state,countries,sitrep:[...lifted.map((name)=>`COUNCIL // Global sanctions on ${name} have expired.`),...state.sitrep].slice(0,12)};
}

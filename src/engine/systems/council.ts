import type { CouncilResolution, CouncilResolutionType, GameState } from '../../domain/game';
import { endWarRelation } from './diplomacy';

const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));

function supportFor(state:GameState,targetId:string,type:CouncilResolutionType){
  const target=state.countries[targetId]; if(!target)return 0;
  let yes=0,total=0;
  for(const country of Object.values(state.countries)){
    if(country.id===targetId)continue;
    const weight=Math.max(1,Math.sqrt(Math.max(1,country.economy.gdp)));
    const relation=country.diplomacy.relations[targetId]?.score??0;
    const hostility=Math.max(0,-relation);
    const warPenalty=Object.values(state.wars).some((w)=>w.status==='active'&&(w.attackerId===targetId||w.defenderId===targetId))?18:0;
    let inclination=50 + hostility*0.35 + warPenalty;
    if(type==='humanitarian_aid')inclination=58+Math.max(0,50-target.politics.stability)*0.35;
    if(type==='ceasefire')inclination=55+warPenalty*1.3;
    yes+=weight*clamp(inclination,0,100); total+=weight*100;
  }
  return total?Number((yes/total*100).toFixed(1)):0;
}

export function proposeCouncilResolution(state:GameState,type:CouncilResolutionType,targetId:string):GameState{
  const player=state.countries[state.playerCountryId]; const target=state.countries[targetId]; if(!player||!target||target.id===player.id)return state;
  const influence=state.council.influenceByCountry[player.id]??20; const cost=type==='sanctions'?10:type==='ceasefire'?8:6;
  if(influence<cost)return {...state,sitrep:[`COUNCIL // Not enough diplomatic influence.`,...state.sitrep].slice(0,12)};
  const support=supportFor(state,targetId,type); const passed=support>=55;
  const resolution:CouncilResolution={id:`GC-${type}-${targetId}-${state.day}`,type,proposerId:player.id,targetCountryId:targetId,supportPercent:support,passed,day:state.day,summary:`${type.replaceAll('_',' ')} on ${target.name}: ${support}% support`};
  let next:GameState={...state,council:{influenceByCountry:{...state.council.influenceByCountry,[player.id]:influence-cost},history:[resolution,...state.council.history].slice(0,20)}};
  if(passed&&type==='sanctions')next={...next,countries:{...next.countries,[target.id]:{...target,globalSanctions:true}}};
  if(passed&&type==='humanitarian_aid'&&player.economy.treasury>=5){next={...next,countries:{...next.countries,[player.id]:{...player,economy:{...player.economy,treasury:player.economy.treasury-5},diplomacy:{...player.diplomacy,reputation:clamp(player.diplomacy.reputation+2,0,100)}},[target.id]:{...target,politics:{...target.politics,stability:clamp(target.politics.stability+4,0,100)}}}};}
  if(passed&&type==='ceasefire'){
    const active=Object.values(next.wars).filter((w)=>w.status==='active'&&(w.attackerId===targetId||w.defenderId===targetId));
    for(const war of active){next={...next,wars:{...next.wars,[war.id]:{...war,status:'withdrawn',autoAssault:false,lastReport:'Global Council ceasefire imposed.'}}};next=endWarRelation(next,war.attackerId,war.defenderId);}
  }
  return {...next,sitrep:[`COUNCIL // ${resolution.summary} — ${passed?'PASSED':'FAILED'}.`,...next.sitrep].slice(0,12)};
}

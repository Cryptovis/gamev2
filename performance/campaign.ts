import type {GameState} from '../src/domain/game';
import {makeInitialState} from '../src/data/initialState';
import {tickGame} from '../src/engine/tick';
import {resolveEvent} from '../src/engine/systems/events';
import {dismissVictory,pendingVictory} from '../src/engine/systems/victory';

/** Real seeded, unattended campaign. Acknowledge blockers between days; never alter economic values. */
export function measuredCampaign(days:number,onTick?:(ms:number)=>void):GameState {
 let state=makeInitialState();
 for(let i=0;i<days;i++){
  if(state.activeEvent)state=resolveEvent(state,state.activeEvent.options[0].id);
  for(let victory=pendingVictory(state);victory;victory=pendingVictory(state))state=dismissVictory(state,victory.warId);
  const living=state.world.living;
  state={...state,activeEvent:null,activeAdvisor:null,world:{...state.world,tutorial:{...state.world.tutorial,active:false},living:living?{...living,advice:{...living.advice,active:null},notice:undefined}:living}};
  const started=performance.now();state=tickGame(state);onTick?.(performance.now()-started);
  if(state.day!==i+2)throw new Error(`Campaign stopped at day ${state.day}: ${state.campaignStatus}`);
 }
 const living=state.world.living;
 return {...state,speed:0,activeEvent:null,activeAdvisor:null,eventCooldownUntil:100000,advisorCooldownUntil:100000,selectedCountryId:null,playerProfile:{...state.playerProfile,language:'en',setupComplete:true},world:{...state.world,tutorial:{...state.world.tutorial,active:false,completed:true},living:living?{...living,advice:{...living.advice,active:null},notice:undefined}:living}};
}

export function distribution(values:number[]) {
 const sorted=[...values].sort((a,b)=>a-b);
 if(!sorted.length)throw new Error('No measurement samples');
 return {samples:sorted.length,median:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.95)-1)],max:sorted.at(-1)!};
}

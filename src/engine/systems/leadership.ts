import {activeCountries} from '../../domain/sovereignty';
import type {GameState} from '../../domain/game';
import type {LeadershipState,DiplomaticMessage} from '../../domain/industrial';
import {relationFor,relationshipIndex} from './diplomacy';
export const CAMPAIGN_START_DATE='2026-01-01';
export function gameDate(state:Pick<GameState,'day'|'leadership'>):string {
 const date=new Date(state.leadership.campaignStartDate+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+state.day-1);return date.toISOString().slice(0,10);
}
export function validBirthDate(value:string):boolean {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value&&value<=CAMPAIGN_START_DATE&&value>='1900-01-01';
}
export function createLeadership(gdp:number):LeadershipState {return {campaignStartDate:CAMPAIGN_START_DATE,lastBirthdayYear:null,celebrationUntilDay:0,lastAchievementDay:0,baselineGdp:gdp,messages:[]};}
function messagesFor(state:GameState,kind:DiplomaticMessage['kind'],occasion:string){
 const player=state.countries[state.playerCountryId];
 const eligible=activeCountries(state.countries).filter(c=>c.id!==player.id&&relationFor(player,c.id).status!=='war').map(c=>({c,index:relationshipIndex(relationFor(player,c.id))})).filter(x=>x.index>=85||x.index<=15).sort((a,b)=>a.c.id.localeCompare(b.c.id));
 const chosen=eligible.filter(x=>([...x.c.id].reduce((s,ch)=>s+ch.charCodeAt(0),0)+state.day+state.simulationSeed)%3===0).slice(0,5);
 return chosen.map(({c,index}):DiplomaticMessage=>({id:`${kind}-${state.day}-${c.id}`,senderId:c.id,day:state.day,kind,tone:index>=85?'warm':'rival',read:false,text:kind==='birthday'?(index>=85?`${c.name} sends warm birthday wishes to ${state.playerProfile.commanderName}. May our partnership prosper in the year ahead.`:`Happy birthday, ${state.playerProfile.commanderName}. Enjoy your celebrations; ${c.name} intends to set the pace this year.`):(index>=85?`${c.name} congratulates your government on ${occasion}. Your progress strengthens our confidence in this partnership.`:`Congratulations on ${occasion}. A respectable result — ${c.name} is aiming higher. Consider that a friendly challenge.`)}));
}
export function processLeadership(state:GameState):GameState {
 const player=state.countries[state.playerCountryId],date=gameDate(state),year=Number(date.slice(0,4));let leadership={...state.leadership},sitrep=state.sitrep;
 const birth=state.playerProfile.birthDate;
 const leapBirthday=birth?.slice(5)==='02-29'&&date.slice(5)==='02-28'&&new Date(`${year}-02-29T00:00:00Z`).getUTCMonth()!==1;
 if(birth&&validBirthDate(birth)&&(birth.slice(5)===date.slice(5)||leapBirthday)&&leadership.lastBirthdayYear!==year){
  const popular=player.politics.approval>=65&&player.politics.stability>=50;
  leadership={...leadership,lastBirthdayYear:year,celebrationUntilDay:popular?state.day+7:0,messages:[...messagesFor(state,'birthday',''),...leadership.messages].slice(0,60)};
  sitrep=[`BIRTHDAY // ${state.playerProfile.commanderName}: ${popular?'public support grants +12% agricultural and industrial output for seven days':'birthday greetings; public support is too low for a production campaign'}.`,...sitrep].slice(0,12);
 }
 if(state.day%30===0&&state.day-leadership.lastAchievementDay>=90&&player.politics.approval>=65&&player.politics.stability>=60&&player.economy.gdp>=leadership.baselineGdp*1.05){
  leadership={...leadership,lastAchievementDay:state.day,baselineGdp:player.economy.gdp,messages:[...messagesFor(state,'achievement','sustained economic growth and public confidence'),...leadership.messages].slice(0,60)};
  sitrep=[`DIPLOMACY // International reactions to national economic progress received.`,...sitrep].slice(0,12);
 }
 return {...state,leadership,sitrep};
}

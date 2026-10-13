import type {GameState,TradeResource} from '../domain/game';
import {MARKET_RESOURCES,resourceReserveDays,resourceStrategicStatus} from './marketSelectors';
import {living} from '../engine/systems/livingEconomy';
import {expansion} from '../engine/systems/sovereignCredit';
export const ALERT_CATEGORIES=['resources','finance','security','domestic','diplomacy'] as const;
export type AlertCategory=typeof ALERT_CATEGORIES[number];
export interface CommandAlert {id:string;category:AlertCategory;severity:'critical'|'warning'|'info';title:string;value:string;panel:'resources'|'credit'|'military'|'society'|'diplomacy'|'diplomacy-inbox'|'economy';resource?:TradeResource}
/** Presentation thresholds only: all reserve/credit calculations remain engine-owned. */
export function commandAlerts(s:GameState):CommandAlert[]{
 const p=s.countries[s.playerCountryId],alerts:CommandAlert[]=[];
 for(const resource of MARKET_RESOURCES){const status=resourceStrategicStatus(p,resource),days=resourceReserveDays(p,resource);if(status==='CRITICAL'||status==='IMPORT NEED')alerts.push({id:resource,category:'resources',severity:status==='CRITICAL'?'critical':'warning',title:status,value:String(Math.max(0,Math.min(365,days)).toFixed(0)),resource,panel:'resources'});}
 if(p.economy.treasury<=0)alerts.push({id:'treasury',category:'finance',severity:'critical',title:'Treasury depleted',value:'',panel:'economy'});
 for(const loan of expansion(s).loans.filter(l=>l.borrowerId===p.id&&l.status!=='paid'&&(l.status==='arrears'||l.dueDay-s.day<=30)))alerts.push({id:loan.id,category:'finance',severity:loan.status==='arrears'?'critical':'warning',title:loan.status==='arrears'?'Loan in arrears':'Loan payment approaching',value:`${s.countries[loan.lenderId]?.name??loan.lenderId} · ${loan.dueDay}`,panel:'credit'});
 const wars=Object.values(s.wars).filter(w=>w.status==='active'&&(w.attackerId===p.id||w.defenderId===p.id));
 if(wars.length)alerts.push({id:'wars',category:'security',severity:'critical',title:'Active national wars',value:String(wars.length),panel:'military'});
 if(p.globalSanctions)alerts.push({id:'sanctions',category:'security',severity:'warning',title:'Country under sanctions',value:'',panel:'diplomacy-inbox'});
 if(p.military.readiness<40)alerts.push({id:'readiness',category:'security',severity:'warning',title:'Low military readiness',value:`${p.military.readiness.toFixed(0)}%`,panel:'military'});
 for(const key of ['approval','stability'] as const)if(p.politics[key]<40)alerts.push({id:key,category:'domestic',severity:p.politics[key]<25?'critical':'warning',title:key==='approval'?'Low public approval':'Low national stability',value:`${p.politics[key].toFixed(0)}%`,panel:'society'});
 if(['democracy','republic'].includes(p.politics.regime)&&p.politics.electionDaysRemaining<=30)alerts.push({id:'election',category:'domestic',severity:'info',title:'Election approaching',value:String(p.politics.electionDaysRemaining),panel:'society'});
 const pending=s.diplomaticOffers.filter(o=>o.receiverId===p.id&&o.expiresDay>=s.day).length+living(s).letters.filter(l=>l.receiverId===p.id&&l.incoming&&l.status==='pending'&&l.expiresDay>=s.day).length;
 if(pending)alerts.push({id:'offers',category:'diplomacy',severity:'info',title:'Incoming diplomatic offers',value:String(pending),panel:'diplomacy-inbox'});
 const unread=living(s).letters.filter(l=>l.receiverId===p.id&&!l.read).length+s.leadership.messages.filter(m=>!m.read).length;
 if(unread)alerts.push({id:'messages',category:'diplomacy',severity:'info',title:'Unread diplomatic messages',value:String(unread),panel:'diplomacy-inbox'});
 const order={critical:0,warning:1,info:2};return alerts.sort((a,b)=>order[a.severity]-order[b.severity]);
}
/** The six campaign goals shown on the GOALS rail and in the Help briefing. Pure reads of the state. */
export function strategicObjectives(s:GameState):{label:string;done:boolean}[]{
 const p=s.countries[s.playerCountryId];
 return [
  {label:'Establish a player trade flow',done:Object.values(s.tradeDeals).some(d=>d.active&&(d.buyerId===p.id||d.sellerId===p.id))},
  {label:'Resolve a covert operation',done:Object.values(s.intelOperations).some(o=>o.sourceCountryId===p.id&&o.status!=='active')},
  {label:'Unlock a technology',done:p.technology.unlocked.length>0},
  {label:'Join or form an alliance bloc',done:Object.values(s.blocs).some(b=>b.memberIds.includes(p.id))},
  {label:'Execute a combat round',done:Object.values(s.wars).some(w=>(w.attackerId===p.id||w.defenderId===p.id)&&w.rounds>0)},
  {label:'Reach Day 30',done:s.day>=30},
 ];
}
/** Resource alert wording: "Oil · Import Needed" rather than the engine's raw "IMPORT NEED" status. */
export const ALERT_STATUS_TITLE:Record<string,string>={'IMPORT NEED':'Import Needed',CRITICAL:'Critical'};
export const sentenceCase=(text:string,language?:string)=>text.charAt(0).toLocaleUpperCase(language)+text.slice(1);
/** Empty journal must not suppress opening messages; unknown dates stay unknown. */
export function newsEntries(s:GameState){
 const journal=[...(s.world.journal??[])].sort((a,b)=>b.day-a.day),seen=new Set(journal.map(e=>e.message));
 return [...journal,...s.sitrep.filter(message=>{if(seen.has(message))return false;seen.add(message);return true;}).map((message,i)=>({id:`opening-${i}`,message,day:null,kind:'legacy' as const}))];
}

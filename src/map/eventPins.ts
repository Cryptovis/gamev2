import type {CountryState,WarState} from '../domain/game';
import {factionsFor} from '../engine/systems/factions';

/** playtest.19 (Phase 6.5): live event pins on the map. Crossed swords on an active war, a megaphone where the government is in trouble at home. Pure view model. */
export type EventPinKind='war'|'unrest';
export interface EventPin{id:string;kind:EventPinKind;point:[number,number];/** war id for a war pin, country id for an unrest pin */target:string;/** 0-100 */severity:number;label:{key:string;values:string[]}}
export type EventProjector=(lonLat:[number,number])=>[number,number]|null;
export interface EventPinInput{
 wars:Record<string,WarState>;countries:Record<string,CountryState>;playerCountryId:string;
 capitals:Record<string,[number,number]>;project:EventProjector;
 width:number;height:number;maxWar?:number;maxUnrest?:number;
 currentDay?:number;
 dismissedPins?:ReadonlySet<string>|Record<string,boolean>;
 unrestStartDays?:Record<string,number>;
}
export const UNREST_PIN_LEVEL=40,UNREST_STABILITY=30,UNREST_OFFSET=-18,EDGE_MARGIN=12;

/** 0-100: an open regime crisis counts 75; stability under 30 grows from 42 to 100. Below UNREST_PIN_LEVEL no pin is drawn. */
export function unrestLevel(c:CountryState):number{
 const crisis=factionsFor(c).crisis?75:0,stability=c.politics.stability<UNREST_STABILITY?40+(UNREST_STABILITY-c.politics.stability)*2:0;
 return Math.min(100,Math.max(crisis,stability));
}
const inside=(p:[number,number],w:number,h:number)=>p[0]>=-EDGE_MARGIN&&p[0]<=w+EDGE_MARGIN&&p[1]>=-EDGE_MARGIN&&p[1]<=h+EDGE_MARGIN;

export function eventPins(i:EventPinInput):EventPin[]{
 const out:EventPin[]=[],place=(id:string)=>{const ll=i.capitals[id];return ll?i.project(ll):null;};
 const wars=Object.values(i.wars).filter(w=>w.status==='active'&&i.countries[w.attackerId]&&i.countries[w.defenderId]).map(w=>({w,mine:w.attackerId===i.playerCountryId||w.defenderId===i.playerCountryId}))
  .sort((a,b)=>Number(b.mine)-Number(a.mine)||a.w.id.localeCompare(b.w.id));
 for(const {w,mine} of wars){
  if(out.filter(p=>p.kind==='war').length>=(i.maxWar??12))break;
  const a=place(w.attackerId),d=place(w.defenderId),seen=[a,d].filter((p):p is [number,number]=>p!==null);
  if(!seen.length)continue;
  // The front lies between the two capitals; when only one is on the visible side of the globe the pin sits on it.
  const point:[number,number]=[seen.reduce((s,p)=>s+p[0],0)/seen.length,seen.reduce((s,p)=>s+p[1],0)/seen.length];
  if(!inside(point,i.width,i.height))continue;
  out.push({id:`war:${w.id}`,kind:'war',point,target:w.id,severity:mine?100:60,label:{key:'Active war: {0} vs {1}',values:[i.countries[w.attackerId].name,i.countries[w.defenderId].name]}});
 }
 const isDismissed=(id:string)=>{
  if(!i.dismissedPins)return false;
  return i.dismissedPins instanceof Set?i.dismissedPins.has(id):Boolean((i.dismissedPins as Record<string,boolean>)[id]);
 };
 const isExpired=(id:string)=>{
  if(i.currentDay===undefined||!i.unrestStartDays)return false;
  const start=i.unrestStartDays[id];
  return start!==undefined&&i.currentDay-start>=3;
 };
 const troubled=Object.values(i.countries).filter(c=>!c.annexedBy&&!c.controllerCountryId&&unrestLevel(c)>=UNREST_PIN_LEVEL&&!isDismissed(c.id)&&!isExpired(c.id))
  .map(c=>({c,level:unrestLevel(c)})).sort((a,b)=>(b.c.id===i.playerCountryId?1:0)-(a.c.id===i.playerCountryId?1:0)||b.level-a.level||a.c.id.localeCompare(b.c.id));
 let unrest=0;
 for(const {c,level} of troubled){
  if(unrest>=(i.maxUnrest??12))break;
  const p=place(c.id);if(!p)continue;
  const point:[number,number]=[p[0],p[1]+UNREST_OFFSET];
  if(!inside(point,i.width,i.height))continue;
  out.push({id:`unrest:${c.id}`,kind:'unrest',point,target:c.id,severity:level,label:{key:'Unrest in {0}',values:[c.name]}});unrest++;
 }
 return out;
}

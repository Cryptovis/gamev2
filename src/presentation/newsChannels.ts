import type {GameState} from '../domain/game';
export type NewsChannel='all'|'wars'|'economy'|'diplomacy'|'trade';
/** Canonical engine prefixes, before localization. Old unclassified records stay in All. */
export function newsChannel(message:string):Exclude<NewsChannel,'all'>|null{
 const prefix=message.split(' // ')[0];
 if(['WAR','VICTORY','DEFEAT','BATTLE','TACTICAL','CEASEFIRE','BLOCKADE','PEACE'].includes(prefix))return 'wars';
 if(['DIPLOMACY','DIPLOMATIC OFFER','EMBASSY','ALLIANCE','COUNCIL','BLOC'].includes(prefix))return 'diplomacy';
 if(['MARKET','TRADE','AI TRADE','SUPPLY CONTRACT','EXCHANGE'].includes(prefix))return 'trade';
 if(['ECONOMY','ENERGY','INDUSTRY','CREDIT','TREASURY','PRODUCTION','DEVELOPMENT','INFRASTRUCTURE','INVESTMENT'].includes(prefix))return 'economy';
 return null;
}
/** Security alerts can be military or diplomatic; domestic alerts stay in the unfiltered archive. */
export function alertNewsChannel(alert:{category:string;panel:string}):NewsChannel{
 if(alert.category==='diplomacy'||alert.panel==='diplomacy'||alert.panel==='diplomacy-inbox')return 'diplomacy';
 if(alert.panel==='military')return 'wars';
 return alert.category==='resources'||alert.category==='finance'?'economy':'all';
}
export function matchesNews(message:string,channel:NewsChannel){const category=newsChannel(message);return channel==='all'||category===channel||channel==='economy'&&category==='trade';}
export interface ToastEvent{id:string;message:string;priority:number;channel:NewsChannel;day:number;count:number}
export function newJournalToasts(before:GameState,after:GameState,loaded=false):ToastEvent[]{
 if(loaded||after.day<before.day||after.playerCountryId!==before.playerCountryId)return [];
 const seen=new Set((before.world.journal??[]).map(e=>e.id));
 return (after.world.journal??[]).filter(e=>!seen.has(e.id)).map(e=>({id:e.id,message:e.message,day:e.day,channel:newsChannel(e.message)??'all',priority:e.message.startsWith('VICTORY //')?3:newsChannel(e.message)==='wars'?2:1,count:1}));
}
export function enqueueToasts(queue:ToastEvent[],incoming:ToastEvent[]){
 const result=[...queue],seen=new Set(result.map(e=>e.id));
 for(const event of incoming){if(seen.has(event.id))continue;seen.add(event.id);const existing=result.findIndex(e=>e.channel===event.channel&&e.day===event.day&&e.priority===event.priority);
  if(existing>=0)result[existing]={...event,count:result[existing].count+event.count};else result.push(event);
 }
 return result.sort((a,b)=>b.priority-a.priority||b.day-a.day).slice(0,8);
}

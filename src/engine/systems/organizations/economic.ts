import type {GameState} from '../../../domain/game';
import type {EconomicResolutionPayload,OrganizationId,OrganizationEconomicEffect,Resolution} from '../../../domain/organizations';
import {economicEffects,effectActive,activeMember} from './effectSelectors';
import {organizationSanctionsBlock} from './sanctions';
// Supported scenario goods; medicine has no stock/market yet and is accepted only as a humanitarian exemption.
export const TRADE_COMMODITIES=['food','oil','iron','uranium','gold','silver','water','coal','copper','silicon','aluminum','rare_earths','rubber','armor_plate','engines','electronics','steel','fuel','tanks'];
export function isEconomicPayload(payload:{kind:string}):payload is EconomicResolutionPayload {
 return ['oilQuota','tradeRemedy','marketIntegration','localCurrencySwap'].includes(payload.kind);
}
export function economicParticipants(p:EconomicResolutionPayload):string[] {
 switch(p.kind){case 'oilQuota':return Object.keys(p.quotas).sort();case 'tradeRemedy':return [p.remedy.targetId];case 'marketIntegration':return p.agreement.countryIds.slice().sort();case 'localCurrencySwap':return [p.agreement.countryA,p.agreement.countryB].sort();}
}
export function economicProposalReason(state:GameState,organizationId:OrganizationId,bodyId:string,p:EconomicResolutionPayload,actorId:string):string|null {
 const allowed=p.kind==='oilQuota'?organizationId==='opecPlus':p.kind==='tradeRemedy'?organizationId==='wto':p.kind==='marketIntegration'?['eu','asean'].includes(organizationId):organizationId==='bricsPlus';
 if(!allowed||bodyId!=='plenary'||!activeMember(state,organizationId,actorId))return 'economicAuthority';
 const ids=economicParticipants(p);
 if(!ids.length||ids.some(id=>!Object.hasOwn(state.countries,id)||state.countries[id].annexedBy))return 'invalidParticipants';
 if(p.kind!=='tradeRemedy'&&ids.some(id=>!activeMember(state,organizationId,id)))return 'participantMembership';
 const duration=p.kind==='oilQuota'?p.durationDays:p.kind==='tradeRemedy'?p.remedy.durationDays:p.agreement.durationDays;
 if(duration>3650||!Number.isSafeInteger(state.day+duration))return 'invalidDeadline';
 if(p.kind==='oilQuota'&&(ids.some(id=>!Number.isFinite(p.quotas[id])||p.quotas[id]<0||p.quotas[id]>1e9)))return 'invalidQuota';
 if(p.kind==='tradeRemedy'){
  if(!TRADE_COMMODITIES.includes(p.remedy.commodity)||p.remedy.targetId===actorId||!(p.remedy.maximumValueB>0))return 'invalidRemedy';
  if(economicEffects(state).some(e=>e.kind==='organizationTradeRemedy'&&effectActive(state,e)&&(e.disputeId===p.disputeId||e.remedy.targetId===p.remedy.targetId&&e.remedy.commodity===p.remedy.commodity)))return 'activeDispute';
 }
 if(p.kind==='marketIntegration'&&!ids.includes(actorId))return 'participantConsent';
 if(p.kind==='localCurrencySwap'){
  const {countryA:a,countryB:b}=p.agreement;
  if(a===b||!ids.includes(actorId)||p.agreement.limitB>Math.min(state.countries[a].economy.gdp,state.countries[b].economy.gdp)*.05)return 'invalidSwap';
  // Both treasuries remain necessary; approval opens a settlement limit, it never mints budget money.
  if(organizationSanctionsBlock(state,a,b,'finance')||state.countries[a].globalSanctions||state.countries[b].globalSanctions)return 'financialRestriction';
  if(economicEffects(state).some(e=>e.kind==='organizationCurrencySwap'&&effectActive(state,e)&&[e.agreement.countryA,e.agreement.countryB].includes(a)&&[e.agreement.countryA,e.agreement.countryB].includes(b)))return 'activeSwap';
 }
 return null;
}
export function executeEconomicResolution(state:GameState,r:Resolution & {payload:EconomicResolutionPayload}):GameState {
 const reason=economicProposalReason(state,r.organizationId,r.bodyId,r.payload,r.proposerId),id=`economic:${r.id}`,o=state.world.organizations;
 const failed=reason??(Object.hasOwn(o.effects,id)?'effectCollision':null);
 if(failed)return {...state,world:{...state.world,organizations:{...o,resolutions:{...o.resolutions,[r.id]:{...r,phase:'failed',execution:{status:'failed',effectIds:[],reason:failed}}}}}};
 const p=structuredClone(r.payload),duration=p.kind==='oilQuota'?p.durationDays:p.kind==='tradeRemedy'?p.remedy.durationDays:p.agreement.durationDays;
 const endsDay=r.effectiveDay+duration;
 const base={id,organizationId:r.organizationId,bodyId:r.bodyId,sourceResolutionId:r.id,startsDay:r.effectiveDay,endsDay,status:state.day>=endsDay?'expired' as const:'active' as const};
 let effect:OrganizationEconomicEffect;
 switch(p.kind){
  case 'oilQuota':effect={...base,kind:'organizationOilQuota',quotas:p.quotas,allowedDeviationByCountry:{},lastStandingDay:state.day};break;
  case 'tradeRemedy':effect={...base,kind:'organizationTradeRemedy',disputeId:p.disputeId,remedy:p.remedy,collectedB:0};break;
  case 'marketIntegration':effect={...base,kind:'organizationMarketIntegration',agreement:p.agreement};break;
  case 'localCurrencySwap':{
   // A bilateral monetary liability needs the other party's explicit yes, even if the wider bloc approves.
   if(r.ballots[p.agreement.countryA]!=='yes'||r.ballots[p.agreement.countryB]!=='yes')return {...state,world:{...state.world,organizations:{...o,resolutions:{...o.resolutions,[r.id]:{...r,phase:'failed',execution:{status:'failed',effectIds:[],reason:'participantConsent'}}}}}};
   effect={...base,kind:'organizationCurrencySwap',agreement:p.agreement,usedB:0,localBalanceByCountry:{[p.agreement.countryA]:0,[p.agreement.countryB]:0}};break;
  }
 }
 return {...state,world:{...state.world,organizations:{...o,effects:{...o.effects,[id]:effect},resolutions:{...o.resolutions,[r.id]:{...r,execution:{status:'applied',effectIds:[id]}}}}}};
}

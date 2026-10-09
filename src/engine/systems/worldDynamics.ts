import {activeCountries} from '../../domain/sovereignty';
import type { CountryState, GameState } from '../../domain/game';
import { changeRelations, embassyFor, relationFor, relationshipIndex, updateBilateralRelation } from './diplomacy';
import { agreementEligibility, aiProposeAgreement, type AgreementKind } from './treaties';
const AI_AGREEMENT_NOTE:Record<AgreementKind,string>={embassy:'opened reciprocal embassies.',trade:'signed a trade pact.',nonAggression:'signed a non-aggression pact.',alliance:'entered a strategic alliance.'};

function stableHash(value:string){let h=2166136261;for(const ch of value){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function affinity(a:CountryState,b:CountryState){
 let score=0;
 if(a.region===b.region)score+=18;
 if(a.subregion&&a.subregion===b.subregion)score+=18;
 if(a.society.ideology===b.society.ideology)score+=12;
 if(a.society.dominantReligion===b.society.dominantReligion)score+=5;
 if(b.resourceProduction.oil>a.resourceProduction.oil*1.5)score+=5;
 if(b.economy.gdp>a.economy.gdp*.8)score+=3;
 const relation=relationFor(a,b.id);
 score+=relation.score*.35;
 if(relation.status==='war'||relation.sanctions)score-=200;
 return score;
}

export function processWorldDiplomacy(state:GameState):GameState{
 if(state.day%14!==0)return state;
 let next=state;
 const notes:string[]=[];
 const countries=activeCountries(state.countries).filter((c)=>!c.controllerCountryId);
 for(const source0 of countries){
  if(source0.id===state.playerCountryId)continue;
  if(stableHash(`${source0.id}-${state.day}`)%4!==0)continue;
  const source=next.countries[source0.id];
  const target=countries.filter((c)=>c.id!==source.id&&c.id!==state.playerCountryId).map((c)=>({c,score:affinity(source,next.countries[c.id])})).sort((a,b)=>b.score-a.score)[0]?.c;
  if(!target)continue;
  const current=relationFor(source,target.id);
  if(current.status==='war'||current.score<-30)continue;
  const drift=source.ai.strategicGoal==='expand_influence'?3:source.ai.strategicGoal==='grow_economy'?2:1;
  if(current.score<75)next=changeRelations(next,source.id,target.id,drift);
  const rel=relationFor(next.countries[source.id],target.id);
  // AI picks what it wants; the shared treaty rules (eligibility, GDP-scaled fee, acceptance roll, cooldown) decide (audit D8).
  const wanted:[AgreementKind,boolean][]=[['embassy',rel.score>=12&&!embassyFor(next,source.id,target.id)&&stableHash(`emb-${source.id}-${target.id}-${state.day}`)%5===0],['trade',relationshipIndex(rel)>50],['nonAggression',rel.score>=40],['alliance',rel.score>=72]];
  const kind=wanted.find(([k,want])=>want&&agreementEligibility(next,source.id,target.id,k).allowed)?.[0];
  if(!kind)continue;
  const proposal=aiProposeAgreement(next,source.id,target.id,kind);next=proposal.state;
  if(proposal.accepted)notes.push(`DIPLOMACY // ${source.name} and ${target.name} ${AI_AGREEMENT_NOTE[kind]}`);
 }
 return {...next,sitrep:[...notes,...next.sitrep].slice(0,12)};
}


export const TRADE_STRAIN_GRACE_DAYS=14;
export function processTradeRelations(state:GameState):GameState{
 let n=state;
 for(const a of activeCountries(state.countries))for(const bId of Object.keys(a.diplomacy.relations)){
  if(a.id>=bId||!state.countries[bId])continue;
  const ra=relationFor(n.countries[a.id],bId),rb=relationFor(n.countries[bId],a.id);
  if(!ra.treaties.includes('trade')&&!rb.treaties.includes('trade'))continue;
  const poor=Math.min(relationshipIndex(ra),relationshipIndex(rb))<20;
  const since=ra.tradeStrainSinceDay??rb.tradeStrainSinceDay;
  if(!poor){if(since!==undefined)n=updateBilateralRelation(n,a.id,bId,r=>({...r,tradeStrainSinceDay:undefined}));continue;}
  if(since===undefined){
   n=updateBilateralRelation(n,a.id,bId,r=>({...r,tradeStrainSinceDay:n.day}));
   if([a.id,bId].includes(n.playerCountryId))n={...n,sitrep:[`DIPLOMACY // Trade pact with ${n.countries[a.id===n.playerCountryId?bId:a.id].name} at risk: relations below 20/100. Restore at least 20/100 within 14 days.`,...n.sitrep].slice(0,12)};
  }else if(n.day-since>=TRADE_STRAIN_GRACE_DAYS){
   n=updateBilateralRelation(n,a.id,bId,r=>({...r,treaties:r.treaties.filter(t=>t!=='trade'),tradeStrainSinceDay:undefined}));
   n={...n,tradeDeals:Object.fromEntries(Object.entries(n.tradeDeals).map(([id,d])=>[id,((d.buyerId===a.id&&d.sellerId===bId)||(d.buyerId===bId&&d.sellerId===a.id))?{...d,active:false}:d]))};
   if([a.id,bId].includes(n.playerCountryId))n={...n,sitrep:[`DIPLOMACY // Trade pact with ${n.countries[a.id===n.playerCountryId?bId:a.id].name} ended after 14 days below 20/100. Bilateral shipments cancelled.`,...n.sitrep].slice(0,12)};
  }
 }
 return n;
}

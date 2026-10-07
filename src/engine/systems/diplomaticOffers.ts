import type { DiplomaticOffer, GameState } from '../../domain/game';
import { addTreaty, changeRelations, openEmbassy, relationFor, relationshipIndex } from './diplomacy';

function stableHash(value:string){let h=2166136261;for(const ch of value){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}

export function processIncomingDiplomaticOffers(state:GameState):GameState{
 if(state.day%14!==0 || state.diplomaticOffers.filter(o=>o.expiresDay>=state.day).length>=3)return state;
 const player=state.countries[state.playerCountryId]; if(!player)return state;
 const candidates=Object.values(state.countries)
  .filter(c=>c.id!==player.id&&!c.controllerCountryId&&!c.globalSanctions)
  .map(c=>({country:c,relation:relationFor(player,c.id)}))
  .filter(x=>x.relation.status!=='war'&&!x.relation.sanctions&&relationshipIndex(x.relation)>=48)
  .sort((a,b)=>relationshipIndex(b.relation)-relationshipIndex(a.relation));
 if(!candidates.length)return state;

 const offset=stableHash(`${state.day}-${player.id}-offer`)%candidates.length;
 const picked=candidates[offset];
 const relation=picked.relation;
 const embassyKey=[player.id,picked.country.id].sort().join('::');
 const hasEmbassy=Boolean(state.embassies[embassyKey]);
 const hasTrade=relation.treaties.includes('trade');
 const roll=stableHash(`${picked.country.id}-${state.day}`)%100;
 let offer:DiplomaticOffer|null=null;

 if(!hasEmbassy && roll<38){
  offer={id:`OFFER-EMB-${picked.country.id}-${state.day}`,type:'embassy',senderId:picked.country.id,receiverId:player.id,createdDay:state.day,expiresDay:state.day+30,message:`${picked.country.name} proposes opening reciprocal embassies to deepen political, commercial and diplomatic access.`};
 } else if(!hasTrade && relationshipIndex(relation)>=58 && roll<72){
  offer={id:`OFFER-TRD-${picked.country.id}-${state.day}`,type:'trade_pact',senderId:picked.country.id,receiverId:player.id,createdDay:state.day,expiresDay:state.day+24,message:`${picked.country.name} proposes a bilateral trade framework and lower-friction commercial access.`};
 }
 if(!offer)return {...state,diplomaticOffers:state.diplomaticOffers.filter(o=>o.expiresDay>=state.day)};
 return {...state,diplomaticOffers:[...state.diplomaticOffers.filter(o=>o.expiresDay>=state.day),offer],sitrep:[`DIPLOMATIC OFFER // ${picked.country.name}: ${offer.type==='embassy'?'Embassy exchange':'Trade pact'} proposal received.`,...state.sitrep].slice(0,12)};
}

export function resolveDiplomaticOffer(state:GameState,offerId:string,accept:boolean):GameState{
 const offer=state.diplomaticOffers.find(o=>o.id===offerId);
 if(!offer)return state;
 const sender=state.countries[offer.senderId];
 let next={...state,diplomaticOffers:state.diplomaticOffers.filter(o=>o.id!==offerId)};
 if(!sender)return next;
 if(!accept){
  next=changeRelations(next,state.playerCountryId,sender.id,-1);
  return {...next,sitrep:[`DIPLOMACY // ${sender.name} proposal declined.`,...next.sitrep].slice(0,12)};
 }
 if(offer.type==='embassy'){
  next=openEmbassy(next,state.playerCountryId,sender.id,1);
  return {...next,sitrep:[`EMBASSY // Reciprocal diplomatic mission opened with ${sender.name}. Relations and diplomatic access will improve faster.`,...next.sitrep].slice(0,12)};
 }
 next=addTreaty(next,state.playerCountryId,sender.id,'trade');
 next=changeRelations(next,state.playerCountryId,sender.id,5);
 return {...next,sitrep:[`TRADE // Bilateral trade framework accepted with ${sender.name}.`,...next.sitrep].slice(0,12)};
}

import {activeCountries} from '../../domain/sovereignty';
import {letterCost,requestDiplomacy} from './livingEconomy';
import type { GameState, TradeResource } from '../../domain/game';
import type { AdviceKind } from '../../domain/living';
import { addTreaty, relationFor } from './diplomacy';
import { getExportCapacity, makeLongTermImportContract } from './trade';
import { simulateResources } from './resources';

const resources: TradeResource[]=['food','oil','iron','uranium'];

function reserveDays(state:GameState,resource:TradeResource){
 const player=state.countries[state.playerCountryId];
 const flow=simulateResources(player);
 const daily=Math.max(.0001,flow.consumption[resource]);
 return player.resources[resource]/daily;
}

/** Suppression key for each resource advice; iron/uranium have no player toggle yet, so they are never silenced by another kind. */
function adviceKey(resource:TradeResource):AdviceKind|null{
 return resource==='oil'?'fuel':resource==='food'?'food':null;
}

function isSuppressed(state:GameState,resource:TradeResource){
 const key=adviceKey(resource);
 return key!==null&&!!state.world.living?.advice.suppressed.includes(key);
}

function threshold(resource:TradeResource){
 if(resource==='food')return 45;
 if(resource==='oil')return 50;
 if(resource==='iron')return 55;
 return 120;
}

export function maybeCreateResourceAdvisor(state:GameState):GameState{
 if(state.activeEvent||state.activeAdvisor||state.day<state.advisorCooldownUntil||state.day%5!==0)return state;
 const player=state.countries[state.playerCountryId];
 if(!player)return state;

 const need=resources
  .map(resource=>({resource,days:reserveDays(state,resource)}))
  .filter(x=>x.days<threshold(x.resource)&&!isSuppressed(state,x.resource))
  .sort((a,b)=>a.days-b.days)[0];
 if(!need)return {...state,advisorCooldownUntil:state.day+5};

 const hasContract=Object.values(state.tradeDeals).some(d=>d.active&&d.buyerId===player.id&&d.resource===need.resource&&d.contractType==='long_term');
 if(hasContract)return {...state,advisorCooldownUntil:state.day+10};

 const candidates=activeCountries(state.countries)
  .filter(c=>c.id!==player.id&&!c.globalSanctions&&getExportCapacity(c,need.resource)>.05)
  .map(c=>({country:c,relation:relationFor(player,c.id),capacity:getExportCapacity(c,need.resource)}))
  .filter(x=>x.relation.status!=='war'&&!x.relation.sanctions&&x.relation.score>=15)
  .sort((a,b)=>(b.relation.score+b.capacity*10)-(a.relation.score+a.capacity*10));
 const best=candidates[0];
 if(!best)return {...state,advisorCooldownUntil:state.day+10};

 const hasPact=best.relation.treaties.includes('trade');
 const stage=hasPact?'contract':'pact';
 const prompt={
  id:`advisor-${need.resource}-${state.day}`,
  resource:need.resource,
  supplierId:best.country.id,
  stage,
  createdDay:state.day,
  message:hasPact
   ? `${need.resource.toUpperCase()} reserves are falling. ${best.country.name} has export capacity and an active trade pact. Consider locking a long-term contract.`
   : `${need.resource.toUpperCase()} reserves are falling. ${best.country.name} is the strongest friendly supplier candidate. A trade pact is required first.`,
 } as const;
 return {...state,activeAdvisor:prompt,speed:0,sitrep:[`ADVISOR // ${prompt.message}`,...state.sitrep].slice(0,12)};
}

export function dismissAdvisor(state:GameState):GameState{
 if(!state.activeAdvisor)return state;
 return {...state,activeAdvisor:null,advisorCooldownUntil:state.day+12,speed:state.preferredSpeed};
}

export function acceptAdvisorTradePact(state:GameState):GameState{
 const prompt=state.activeAdvisor;
 if(!prompt||prompt.stage!=='pact')return state;
 const player=state.countries[state.playerCountryId];
 const supplier=state.countries[prompt.supplierId];
 if(!player||!supplier)return dismissAdvisor(state);
 const relation=relationFor(player,supplier.id);
 if(relation.status==='war'||relation.sanctions||player.globalSanctions||supplier.globalSanctions||relation.score<15||player.economy.treasury<letterCost(state,player.id,'trade_pact'))return {...dismissAdvisor(state),sitrep:[`ADVISOR // Trade pact with ${supplier.name} could not be completed.`,...state.sitrep].slice(0,12)};
 if(relation.treaties.includes('trade'))return {...state,activeAdvisor:{...prompt,stage:'contract'}};
 const next=requestDiplomacy(state,supplier.id,'trade_pact');return {...next,activeAdvisor:null,advisorCooldownUntil:state.day+7,speed:0};
}

export function acceptAdvisorContract(state:GameState,years:1|3|5|10):GameState{
 const prompt=state.activeAdvisor;
 if(!prompt||prompt.stage!=='contract')return state;
 const contract=makeLongTermImportContract(state,state.playerCountryId,prompt.supplierId,prompt.resource,years);
 if(!contract)return {...dismissAdvisor(state),sitrep:[`ADVISOR // Supplier can no longer support the proposed ${prompt.resource.toUpperCase()} contract.`,...state.sitrep].slice(0,12)};
 const supplier=state.countries[prompt.supplierId];
 return {
  ...state,
  tradeDeals:{...state.tradeDeals,[contract.id]:contract},
  activeAdvisor:null,
  advisorCooldownUntil:state.day+20,
  speed:state.preferredSpeed,
  sitrep:[`TRADE // ${years}-year ${prompt.resource.toUpperCase()} contract signed with ${supplier.name}; monthly delivery, locked unit price $${contract.pricePerUnit.toFixed(3)}.`,...state.sitrep].slice(0,12),
 };
}

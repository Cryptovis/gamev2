import type {GameState} from '../../domain/game';
import type {TacticalOrder,TacticalOrderKind} from '../../domain/tactical';
import {COMMAND_BUDGET,ORDER_COST,cellCount,playerSide,tacticalCommandStatus,tacticalRoundFuel,validateTacticalOrders} from './tactical';
export function tacticalDraftPreview(state:GameState,warId:string,queued:TacticalOrder[],candidate:TacticalOrder,expectedRound:number){
 const war=state.wars[warId];if(!war?.tactical)return null;
 const status=tacticalCommandStatus(state,warId,expectedRound,[]);
 const side=playerSide(state,war),retained=queued.filter(o=>o.unitId!==candidate.unitId),orders=[...retained,candidate];
 const reasons=tacticalCommandStatus(state,warId,expectedRound,orders);
 const actions=Object.fromEntries((['move','defend','flank','recon','reserve','bombard'] as TacticalOrderKind[]).map(kind=>{
  if(status.length)return [kind,{allowed:false,reason:status[0]}];
  const targets=['defend','reserve'].includes(kind)?[undefined]:Array.from({length:cellCount(war.tactical!)},(_,i)=>i);
  const results:string[][]=[];
  for(const target of targets){
   const reasons=validateTacticalOrders(state,warId,side,[...retained,{unitId:candidate.unitId,kind,...(target===undefined?{}:{target})}]);
   // Availability needs one legal target, not an exhaustive validation of every remaining sector.
   if(!reasons.length)return [kind,{allowed:true,reason:null}];
   results.push(reasons);
  }
  const common=results[0]?.filter(reason=>results.every(r=>r.includes(reason)))??[];
  return [kind,{allowed:false,reason:common[0]??results.slice().sort((a,b)=>a.length-b.length)[0]?.[0]??null}];
 })) as Record<TacticalOrderKind,{allowed:boolean;reason:string|null}>;
 return {orders,reasons,actions,points:orders.reduce((n,o)=>n+ORDER_COST[o.kind],0),budget:COMMAND_BUDGET,fuel:tacticalRoundFuel(state,war,side,orders)};
}

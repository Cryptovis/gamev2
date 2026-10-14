import type {GameState} from '../../domain/game';
import type {TacticalOrder,TacticalOrderKind} from '../../domain/tactical';
import {COMMAND_BUDGET,ORDER_COST,cellCount,playerSide,tacticalCommandStatus,tacticalRoundFuel,validateTacticalOrders} from './tactical';
export function tacticalDraftPreview(state:GameState,warId:string,queued:TacticalOrder[],candidate:TacticalOrder,expectedRound:number){
 const war=state.wars[warId];if(!war?.tactical)return null;
 const status=tacticalCommandStatus(state,warId,expectedRound,[]);
 const side=playerSide(state,war),orders=[...queued.filter(o=>o.unitId!==candidate.unitId),candidate];
 const reasons=tacticalCommandStatus(state,warId,expectedRound,orders);
 const actions=Object.fromEntries((['move','defend','flank','recon','reserve','bombard'] as TacticalOrderKind[]).map(kind=>{
  const targets=['defend','reserve'].includes(kind)?[undefined]:Array.from({length:cellCount(war.tactical!)},(_,i)=>i);
  const results=targets.map(target=>validateTacticalOrders(state,warId,side,[...queued.filter(o=>o.unitId!==candidate.unitId),{unitId:candidate.unitId,kind,...(target===undefined?{}:{target})}]));
  const allowed=!status.length&&results.some(r=>!r.length),common=results[0]?.filter(reason=>results.every(r=>r.includes(reason)))??[];
  return [kind,{allowed,reason:allowed?null:status[0]??common[0]??results.slice().sort((a,b)=>a.length-b.length)[0]?.[0]??null}];
 })) as Record<TacticalOrderKind,{allowed:boolean;reason:string|null}>;
 return {orders,reasons,actions,points:orders.reduce((n,o)=>n+ORDER_COST[o.kind],0),budget:COMMAND_BUDGET,fuel:tacticalRoundFuel(state,war,side,orders)};
}

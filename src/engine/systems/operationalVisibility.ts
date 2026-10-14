import type {GameState,CountryState} from '../../domain/game';
import {getWarPreview,warForceComparison} from './warfare';

export const INTEL_ESTIMATE_MIN=35;
export type ForceKey='personnel'|'tanks'|'artillery'|'fighters'|'bombers'|'warships';
export const FORCE_KEYS:ForceKey[]=['personnel','tanks','artillery','fighters','bombers','warships'];
export interface EstimateBand{min:number;max:number|null}
export type ForceInventory=Record<ForceKey,number>;
export type EstimatedInventory=Record<ForceKey,EstimateBand|null>;
const inventory=(country:CountryState)=>Object.fromEntries(FORCE_KEYS.map(key=>[key,country.military[key]])) as ForceInventory;
export function forceBand(value:number,key:ForceKey):EstimateBand{
 const edges=key==='personnel'?[0,1000,10000,50000,150000,500000]:key==='tanks'||key==='artillery'?[0,50,250,1000,2500,5000]:[0,10,50,200,500];
 const index=edges.findIndex((edge,i)=>value>=edge&&(edges[i+1]===undefined||value<edges[i+1]));
 const i=Math.max(0,index);return {min:edges[i],max:edges[i+1]===undefined?null:edges[i+1]-1};
}
const representative=(band:EstimateBand)=>band.max===null?band.min*1.25:(band.min+band.max)/2;
export const qualityBand=(value:number):EstimateBand=>value<40?{min:0,max:39}:value<70?{min:40,max:69}:{min:70,max:100};
const quality=(value:number)=>value<40?20:value<70?55:85;
export const supplyBand=(value:number):EstimateBand=>{const min=Math.min(80,Math.max(0,Math.floor(value/20)*20));return {min,max:min===80?100:min+19};};

/** Coverage is the existing intelligence ledger, not a fabricated probability. No seed/clock advance, snapshot or save fields. */
export function operationalVisibility(state:GameState,targetId:string){
 const own=state.countries[state.playerCountryId],target=state.countries[targetId];if(!own||!target||own.id===target.id)return null;
 const coverage=state.intelligenceLedger[targetId]??12,known=coverage>=INTEL_ESTIMATE_MIN;
 const enemy=Object.fromEntries(FORCE_KEYS.map(key=>[key,known?forceBand(target.military[key],key):null])) as EstimatedInventory;
 const actual=getWarPreview(own,target,state.infrastructure[own.id],state.infrastructure[targetId]);
 const lastReconDay=Object.values(state.intelOperations).filter(op=>op.sourceCountryId===own.id&&op.targetCountryId===targetId&&op.type==='gather_intelligence'&&op.status==='success').reduce<number|null>((day,op)=>Math.max(day??0,op.completeDay),null);
 const enemySupply=known?supplyBand(actual.defenderSupply):null;
 let comparison:ReturnType<typeof warForceComparison>|null=null;
 if(known&&enemySupply){
  // Forecast only from published bands. Hidden differences inside these bands cannot leak through decimal ratios or air badges.
  const values=Object.fromEntries(FORCE_KEYS.map(key=>[key,representative(enemy[key]!)]));
  const projected={...target,military:{...target.military,...values,readiness:quality(target.military.readiness),morale:quality(target.military.morale),logistics:quality(target.military.logistics),technology:quality(target.military.technology)}};
  comparison=warForceComparison(own,projected,actual.attackerSupply,representative(enemySupply));
 }
 return {terrain:actual.terrain,own:inventory(own),enemy,ownSupply:actual.attackerSupply,enemySupply,enemyReadiness:known?qualityBand(target.military.readiness):null,comparison,confidence:known?(coverage>=70?'established':'limited'):'unknown',lastReconDay} as const;
}

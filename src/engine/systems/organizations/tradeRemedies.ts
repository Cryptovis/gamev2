import type {GameState} from '../../../domain/game';
import {economicEffects,activeMember,effectActive} from './effectSelectors';
/** WTO countermeasure caps are cumulative tariff revenue; strongest active remedy wins rather than stacking. */
export function tariffPreview(state:GameState,sellerId:string,buyerId:string,commodity:string,customsValueB:number):{tariffB:number;effectId?:string} {
 const remedies=economicEffects(state).filter(e=>e.kind==='organizationTradeRemedy'&&effectActive(state,e)&&e.remedy.targetId===sellerId&&e.remedy.commodity===commodity&&
  sellerId!==buyerId&&activeMember(state,'wto',buyerId));
 let tariffB=0,effectId:string|undefined;
 for(const e of remedies)if(e.kind==='organizationTradeRemedy'){
  const levy=Math.min(Math.max(0,customsValueB)*e.remedy.tariffRate,Math.max(0,e.remedy.maximumValueB-e.collectedB));
  if(levy>tariffB){tariffB=levy;effectId=e.id;}
 }
 return {tariffB,...(effectId?{effectId}:{})};
}

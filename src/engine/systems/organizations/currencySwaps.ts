import type {GameState,CountryState} from '../../../domain/game';
import {economicEffects,activeMember,effectActive} from './effectSelectors';
import {organizationSanctionsBlock} from './sanctions';
export const foreignReservesB=(country:CountryState)=>country.economy.foreignReservesB??Math.max(0,country.economy.treasury);
export function swapSettlementPreview(state:GameState,sellerId:string,buyerId:string,amountB:number) {
 let remaining=Math.max(0,amountB);const draws:Array<{effectId:string;amountB:number}>=[];
 if(!organizationSanctionsBlock(state,sellerId,buyerId,'finance'))for(const e of economicEffects(state)){
  if(e.kind!=='organizationCurrencySwap'||!effectActive(state,e)||!activeMember(state,'bricsPlus',sellerId)||!activeMember(state,'bricsPlus',buyerId)||
   ![e.agreement.countryA,e.agreement.countryB].includes(sellerId)||![e.agreement.countryA,e.agreement.countryB].includes(buyerId)||sellerId===buyerId)continue;
  const amount=Math.min(remaining,Math.max(0,e.agreement.limitB-e.usedB));
  if(amount>0){draws.push({effectId:e.id,amountB:amount});remaining=Math.max(0,remaining-amount);}
 }
 return {draws,localB:Math.max(0,amountB-remaining),usdB:remaining,allowed:!!state.countries[buyerId]&&remaining<=foreignReservesB(state.countries[buyerId])+1e-9};
}

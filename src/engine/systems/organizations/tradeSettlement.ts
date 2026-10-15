import type {GameState} from '../../../domain/game';
import type {CurrencySwapEffect,TradeRemedyEffect} from '../../../domain/organizations';
import {tariffPreview} from './tradeRemedies';
import {swapSettlementPreview,foreignReservesB} from './currencySwaps';
import {organizationSanctionsBlock} from './sanctions';
export function tradePaymentPreview(state:GameState,seller:string,buyer:string,good:string,baseB:number) {
 const tariff=tariffPreview(state,seller,buyer,good,baseB),swap=swapSettlementPreview(state,seller,buyer,baseB);
 const grossB=baseB+tariff.tariffB;
 return {...tariff,...swap,grossB,baseB,sellerReservesB:state.countries[seller]?foreignReservesB(state.countries[seller]):0,buyerReservesB:state.countries[buyer]?foreignReservesB(state.countries[buyer]):0,allowed:Number.isFinite(grossB)&&baseB>0&&!!state.countries[seller]&&seller!==buyer&&swap.allowed&&
  state.countries[buyer].economy.treasury>=grossB&&!organizationSanctionsBlock(state,seller,buyer,'trade',good)&&
  !(['tanks','fighters','armor'].includes(good)&&organizationSanctionsBlock(state,seller,buyer,'arms'))};
}
/** Record the customs credit and FX/local clearing once, AFTER the caller debits gross cash. */
export function recordTradeSettlement(state:GameState,seller:string,buyer:string,good:string,baseB:number,preview=tradePaymentPreview(state,seller,buyer,good,baseB)):GameState {
 const a=state.countries[seller],b=state.countries[buyer],o=state.world.organizations;
 let effects=o.effects;
 if(preview.effectId){const e=effects[preview.effectId] as TradeRemedyEffect;const collectedB=Math.min(e.remedy.maximumValueB,e.collectedB+preview.tariffB);effects={...effects,[e.id]:{...e,collectedB,status:collectedB>=e.remedy.maximumValueB?'expired':'active'}};}
 for(const draw of preview.draws){const e=effects[draw.effectId] as CurrencySwapEffect;
  effects={...effects,[e.id]:{...e,usedB:Math.min(e.agreement.limitB,e.usedB+draw.amountB),localBalanceByCountry:{...e.localBalanceByCountry,[seller]:(e.localBalanceByCountry[seller]??0)+draw.amountB,[buyer]:(e.localBalanceByCountry[buyer]??0)-draw.amountB}}};
 }
 // Old campaigns with no FX field preserve legacy settlement until an explicit reserve/swap is used.
 const track=a.economy.foreignReservesB!==undefined||b.economy.foreignReservesB!==undefined||preview.localB>0;
 return {...state,countries:{...state.countries,
  [seller]:{...a,economy:{...a.economy,...(track?{foreignReservesB:preview.sellerReservesB+preview.usdB}:{})}},
  [buyer]:{...b,economy:{...b.economy,treasury:b.economy.treasury+preview.tariffB,...(preview.tariffB?{tariffRevenueB:(b.economy.tariffRevenueB??0)+preview.tariffB}:{}),...(track?{foreignReservesB:Math.max(0,preview.buyerReservesB-preview.usdB)}:{})}}},
  world:{...state.world,organizations:{...o,effects}}};
}
export function settleTradePayment(state:GameState,seller:string,buyer:string,good:string,baseB:number):GameState {
 const preview=tradePaymentPreview(state,seller,buyer,good,baseB);if(!preview.allowed)return state;
 const a=state.countries[seller],b=state.countries[buyer];
 const debited={...state,countries:{...state.countries,[seller]:{...a,economy:{...a.economy,treasury:a.economy.treasury+baseB}},[buyer]:{...b,economy:{...b.economy,treasury:b.economy.treasury-preview.grossB}}}};
 return recordTradeSettlement(debited,seller,buyer,good,baseB,preview);
}

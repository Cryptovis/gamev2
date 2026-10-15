import {organizationSanctionsBlock} from './organizations/sanctions';
import {integrationBenefits} from './organizations/marketIntegration';
import {tradePaymentPreview,settleTradePayment} from './organizations/tradeSettlement';
import {leaderModifiers,facilityLeaderFactor} from './leaderPerks';
import {activeCountries} from '../../domain/sovereignty';
import {EQUIPMENT_CATALOG,EQUIPMENT_TYPES} from '../../data/equipmentCatalog';
import {TANK_COMPONENTS} from '../../data/industrialCatalog';
import type {GameState} from '../../domain/game';
import type {FacilityKind,IndustrialGood,IndustrialContract} from '../../domain/industrial';
import {FACILITIES,GOODS} from '../../data/industrialCatalog';
import {changeGoodStock,facilityPotential,goodStock} from './industrialEconomy';
import {processIndustry} from './industry';
import {changeRelations,relationFor} from './diplomacy';
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function industrialPrice(state:GameState,good:IndustrialGood){
 const stock=Object.keys(state.countries).filter(id=>!state.countries[id].annexedBy).reduce((sum,id)=>sum+goodStock(state,id,good),0);
 const listed=(state.world.living?.listings??[]).filter(x=>x.good===good&&x.status==='open').reduce((a,x)=>a+x.remaining,0);
 const demand=Object.keys(state.countries).filter(id=>!state.countries[id].annexedBy).length*GOODS[good].reserve*3;
 const warPremium=(good==='gold'||good==='silver')?1+Math.min(.6,Object.values(state.wars).filter(w=>w.status==='active').length*.06):1;
 return GOODS[good].price*clamp(demand/Math.max(1,stock+listed),.65,2.5)*warPremium;
}
/** Longest supply contract an AI buyer signs, and the share of its treasury it commits to one shipment (audit C11). */
export const AI_CONTRACT_MAX_YEARS=3,AI_SHIPMENT_TREASURY_SHARE=.05;
/** Estimated daily use of a good by a country's facilities, population (water) and production lines. */
export function industrialDailyUse(state:GameState,id:string,good:IndustrialGood){
 const c=state.countries[id],n=state.industrialEconomy[id];if(!c||!n)return 0;
 let use=good==='water'?Math.max(.1,c.demographics.population/1e6*.04)*leaderModifiers(state,id).consumer:0;
 for(const [kind,d] of Object.entries(FACILITIES) as Array<[FacilityKind,typeof FACILITIES[FacilityKind]]>){
  const count=n.facilities[kind],amount=d.inputs[good];
  if(count&&n.enabled[kind]&&amount)use+=amount*d.yield*count*facilityPotential(n,kind)*c.industry.utilization/100*facilityLeaderFactor(state,id,kind);
 }
 const p=state.production[id];
 if(p){
  if(good==='steel'||good==='fuel')for(const type of EQUIPMENT_TYPES)use+=EQUIPMENT_CATALOG[type].inputs[good]*p.lines[type].factories;
  const perTank=TANK_COMPONENTS[good];
  if(perTank&&c.technology.unlocked.includes('mil-armor-assembly'))use+=perTank*EQUIPMENT_CATALOG.armor.baseOutput*p.lines.armor.factories*Math.max(.2,p.lines.armor.efficiency/100);
 }
 return use;
}
/** Daily domestic output of a good: last facility output, or this day's refinery/steelworks gain for fuel and steel. */
function domesticDailyOutput(state:GameState,id:string,good:IndustrialGood){
 const c=state.countries[id];if(!c)return 0;
 if(good==='steel'||good==='fuel')return Math.max(0,processIndustry(c,1,true,leaderModifiers(state,id).factory).processedResources[good]-c.processedResources[good]);
 return state.industrialEconomy[id]?.lastOutput[good]??0;
}
/**
 * What an AI buyer actually needs (audit C11). `shortfall`: stock missing to reach twice the reserve plus a month of
 * net use. `monthlyNeed`: recurring net consumption per month not yet covered by its active supply contracts.
 */
export function industrialBuyerDemand(state:GameState,id:string,good:IndustrialGood){
 const monthlyUse=Math.max(0,industrialDailyUse(state,id,good)-domesticDailyOutput(state,id,good))*30;
 const contracted=Object.values(state.industrialContracts).filter(k=>k.active&&k.buyerId===id&&k.good===good).reduce((sum,k)=>sum+k.quantity,0);
 return {monthlyUse,monthlyNeed:Math.max(0,monthlyUse-contracted),shortfall:Math.max(0,GOODS[good].reserve*2+monthlyUse-goodStock(state,id,good))};
}
/** Largest shipment an AI buyer accepts at `price`: its shortfall, and no more than 5% of its treasury. */
export function aiPurchaseLimit(state:GameState,buyerId:string,good:IndustrialGood,price:number){
 const buyer=state.countries[buyerId];if(!buyer||!(price>0))return 0;
 return Math.min(industrialBuyerDemand(state,buyerId,good).shortfall,Math.max(0,buyer.economy.treasury)*AI_SHIPMENT_TREASURY_SHARE/price);
}
/** Validation shared by the order command and the market panel; null when the order would be accepted. */
export function industrialOrderError(state:GameState,partnerId:string,good:IndustrialGood,quantity:number,direction:'buy'|'sell',years:0|1|3|5|10=0):string|null {
 const sellerId=direction==='buy'?partnerId:state.playerCountryId,buyerId=direction==='buy'?state.playerCountryId:partnerId;
 if(years===0)return industrialQuote(state,sellerId,buyerId,good,quantity).error;
 if(Object.values(state.industrialContracts).some(c=>c.active&&c.sellerId===sellerId&&c.buyerId===buyerId&&c.good===good))return 'A supply contract already exists for this route';
 if(buyerId!==state.playerCountryId){
  if(years>AI_CONTRACT_MAX_YEARS)return 'The buyer signs supply contracts of at most 3 years';
  if(quantity>industrialBuyerDemand(state,buyerId,good).monthlyNeed+1e-9)return 'Monthly delivery exceeds the buyer\'s recurring consumption';
 }
 const quote=industrialQuote(state,sellerId,buyerId,good,quantity);
 // A contract's first delivery is a month away, so only the buyer's current stock shortfall is not required now.
 return quote.error==='Buyer has no demand for this quantity'?null:quote.error;
}
export function canTradeIndustrial(state:GameState,sellerId:string,buyerId:string,good:IndustrialGood){
 const seller=state.countries[sellerId],buyer=state.countries[buyerId];if(!seller||!buyer||sellerId===buyerId)return false;
 const relation=relationFor(buyer,sellerId);
 if(organizationSanctionsBlock(state,sellerId,buyerId,'trade',good)||good==='tanks'&&organizationSanctionsBlock(state,sellerId,buyerId,'arms')||seller.globalSanctions||buyer.globalSanctions||relation.status==='war'||relation.sanctions||!relation.treaties.includes('trade'))return false;
 return relation.score>=10&&(good!=='tanks'||(relation.treaties.includes('alliance')&&relation.score>=60));
}
export function industrialQuote(state:GameState,sellerId:string,buyerId:string,good:IndustrialGood,quantity:number,lockedPrice?:number){
 const seller=state.countries[sellerId],buyer=state.countries[buyerId];
 const basePrice=lockedPrice??Math.max(industrialPrice(state,good)*(seller?.economy.treasury<5?.85:1.08),good==='tanks'?tankDomesticCost(state,sellerId)*1.35:0);
 const customsPrice=basePrice*integrationBenefits(state,sellerId,buyerId).frictionMultiplier;
 const payment=tradePaymentPreview(state,sellerId,buyerId,good,customsPrice*quantity),price=quantity>0?payment.grossB/quantity:customsPrice;
 const available=Math.max(0,goodStock(state,sellerId,good)-GOODS[good].reserve);
 const error=!seller||!buyer||!Number.isFinite(quantity)||quantity<=0?'Invalid order':!canTradeIndustrial(state,sellerId,buyerId,good)?(good==='tanks'?'Trade pact and alliance required':'Trade pact required; sanctions and war block access'):available<quantity?'Supplier reserve protection':buyer.economy.treasury<price*quantity?'Buyer cannot afford shipment':buyerId!==state.playerCountryId&&quantity>aiPurchaseLimit(state,buyerId,good,price)+1e-9?'Buyer has no demand for this quantity':null;
 return {price,basePrice,customsPrice,available,cost:price*quantity,tariffB:payment.tariffB,error:error??(!payment.allowed?'Buyer cannot afford shipment':null)};
}
export function settleIndustrialTrade(state:GameState,sellerId:string,buyerId:string,good:IndustrialGood,quantity:number,lockedPrice?:number):GameState {
 const quote=industrialQuote(state,sellerId,buyerId,good,quantity,lockedPrice),price=quote.price;
 if(quote.error||!Number.isFinite(price)||price<=0||state.countries[buyerId].economy.treasury<quantity*price)return state;
 let next=changeGoodStock(state,sellerId,good,-quantity);next=changeGoodStock(next,buyerId,good,quantity);
 const cost=quantity*quote.customsPrice;
 const paid=settleTradePayment(next,sellerId,buyerId,good,cost);if(paid===next)return state;
 next={...paid,industrialEconomy:{...paid.industrialEconomy,[sellerId]:{...paid.industrialEconomy[sellerId],lastTradeBalance:paid.industrialEconomy[sellerId].lastTradeBalance+cost},[buyerId]:{...paid.industrialEconomy[buyerId],lastTradeBalance:paid.industrialEconomy[buyerId].lastTradeBalance-cost}}};
 return changeRelations(next,sellerId,buyerId,.03);
}
/** Shared calendar preview for the UI and contract creation; no clock advance or settlement. */
export function industrialContractSchedule(day:number,years:0|1|3|5|10){
 return {firstDeliveryDay:day+(years?30:0),expiresDay:day+365*years};
}
export function placeIndustrialOrder(state:GameState,partnerId:string,good:IndustrialGood,quantity:number,direction:'buy'|'sell',years:0|1|3|5|10=0):GameState {
 const sellerId=direction==='buy'?partnerId:state.playerCountryId,buyerId=direction==='buy'?state.playerCountryId:partnerId;
 if(industrialOrderError(state,partnerId,good,quantity,direction,years))return state;
 const quote=industrialQuote(state,sellerId,buyerId,good,quantity);
 if(years===0){const next=settleIndustrialTrade(state,sellerId,buyerId,good,quantity);return {...next,sitrep:[`MARKET // ${direction==='buy'?'Imported':'Exported'} ${quantity} ${GOODS[good].label}; $${quote.cost.toFixed(3)}B settled.`,...next.sitrep].slice(0,12)};}
 const id=`${sellerId}-${buyerId}-${good}-${state.day}-${Object.keys(state.industrialContracts).length}`;
 const schedule=industrialContractSchedule(state.day,years);
 const contract:IndustrialContract={id,sellerId,buyerId,good,quantity,price:quote.basePrice,nextDeliveryDay:schedule.firstDeliveryDay,expiresDay:schedule.expiresDay,active:true,missedDeliveries:0};
 return {...state,industrialContracts:{...state.industrialContracts,[id]:contract},sitrep:[`MARKET // ${years}-year ${GOODS[good].label} supply contract agreed; monthly delivery ${quantity} units.`,...state.sitrep].slice(0,12)};
}
export function processIndustrialContracts(state:GameState):GameState {
 let next=state;
 for(const contract of Object.values(state.industrialContracts)){
  if(!contract.active)continue;
  if(state.day>contract.expiresDay){next={...next,industrialContracts:{...next.industrialContracts,[contract.id]:{...contract,active:false}}};continue;}
  if(state.day<contract.nextDeliveryDay)continue;
  // Audit C11: an AI buyer takes only what it needs and can afford; with no need the delivery is declined, not missed.
  const quantity=contract.buyerId===state.playerCountryId?contract.quantity:Math.min(contract.quantity,aiPurchaseLimit(next,contract.buyerId,contract.good,contract.price));
  if(quantity<=1e-6&&canTradeIndustrial(next,contract.sellerId,contract.buyerId,contract.good)){
   next={...next,industrialContracts:{...next.industrialContracts,[contract.id]:{...contract,nextDeliveryDay:state.day+30}}};
   if(contract.sellerId===state.playerCountryId)next={...next,sitrep:[`SUPPLY CONTRACT // ${GOODS[contract.good].label} delivery declined: the buyer has no current demand.`,...next.sitrep].slice(0,12)};
   continue;
  }
  const before=next;next=settleIndustrialTrade(next,contract.sellerId,contract.buyerId,contract.good,Math.max(quantity,1e-6),contract.price);
  const failed=next===before;const blocked=!canTradeIndustrial(next,contract.sellerId,contract.buyerId,contract.good);
  next={...next,industrialContracts:{...next.industrialContracts,[contract.id]:{...contract,nextDeliveryDay:state.day+30,active:!blocked,missedDeliveries:contract.missedDeliveries+(failed?1:0)}}};
  if(failed&&(contract.sellerId===state.playerCountryId||contract.buyerId===state.playerCountryId))next={...next,sitrep:[`SUPPLY CONTRACT // ${GOODS[contract.good].label} delivery ${blocked?'cancelled by diplomatic restrictions':'missed: insufficient stock or liquidity'}.`,...next.sitrep].slice(0,12)};
 }
 return next;
}
export function processIndustrialMarketAI(state:GameState):GameState {
 if(state.day%14!==0)return state;
 let next=state;
 for(const buyer of activeCountries(state.countries)){
  if(buyer.id===state.playerCountryId)continue;
  for(const good of ['water','engines','electronics','armor_plate'] as IndustrialGood[]){
   if(goodStock(next,buyer.id,good)>=GOODS[good].reserve)continue;
   const seller=activeCountries(next.countries).filter(s=>canTradeIndustrial(next,s.id,buyer.id,good)&&goodStock(next,s.id,good)>GOODS[good].reserve*2).sort((a,b)=>goodStock(next,b.id,good)-goodStock(next,a.id,good)||a.id.localeCompare(b.id))[0];
   if(!seller)continue;
   const quantity=Math.min(5,GOODS[good].reserve,aiPurchaseLimit(next,buyer.id,good,industrialQuote(next,seller.id,buyer.id,good,1).price));
   if(quantity>1e-6)next=settleIndustrialTrade(next,seller.id,buyer.id,good,quantity);
  }
 }
 return next;
}

export function tankDomesticCost(s:GameState,id:string){const c=s.countries[id],line=s.production[id]?.lines.armor;if(!c)return 0;const tech=1+c.military.technology/500+(c.technology.unlocked.includes('ind-automation')?.08:0)+(c.technology.unlocked.includes('ind-metallurgy')?.06:0)+(c.technology.unlocked.includes('mil-modernization')?.08:0);const output=EQUIPMENT_CATALOG.armor.baseOutput*Math.max(.2,(line?.efficiency??70)/100)*tech;return EQUIPMENT_CATALOG.armor.inputs.treasury/output+Object.entries(TANK_COMPONENTS).reduce((v,[k,q])=>v+(q??0)*GOODS[k as IndustrialGood].price,0)+(EQUIPMENT_CATALOG.armor.inputs.steel*GOODS.steel.price+EQUIPMENT_CATALOG.armor.inputs.fuel*GOODS.fuel.price)/output;}

import {EQUIPMENT_CATALOG} from '../../data/equipmentCatalog';
import {TANK_COMPONENTS} from '../../data/industrialCatalog';
import type {GameState} from '../../domain/game';
import type {IndustrialGood,IndustrialContract} from '../../domain/industrial';
import {GOODS} from '../../data/industrialCatalog';
import {changeGoodStock,goodStock} from './industrialEconomy';
import {changeRelations,relationFor} from './diplomacy';
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function industrialPrice(state:GameState,good:IndustrialGood){
 const stock=Object.keys(state.countries).reduce((sum,id)=>sum+goodStock(state,id,good),0);
 const listed=(state.world.living?.listings??[]).filter(x=>x.good===good&&x.status==='open').reduce((a,x)=>a+x.remaining,0);
 const demand=Object.keys(state.countries).length*GOODS[good].reserve*3;
 const warPremium=(good==='gold'||good==='silver')?1+Math.min(.6,Object.values(state.wars).filter(w=>w.status==='active').length*.06):1;
 return GOODS[good].price*clamp(demand/Math.max(1,stock+listed),.65,2.5)*warPremium;
}
export function canTradeIndustrial(state:GameState,sellerId:string,buyerId:string,good:IndustrialGood){
 const seller=state.countries[sellerId],buyer=state.countries[buyerId];if(!seller||!buyer||sellerId===buyerId)return false;
 const relation=relationFor(buyer,sellerId);
 if(seller.globalSanctions||buyer.globalSanctions||relation.status==='war'||relation.sanctions||!relation.treaties.includes('trade'))return false;
 return relation.score>=10&&(good!=='tanks'||(relation.treaties.includes('alliance')&&relation.score>=60));
}
export function industrialQuote(state:GameState,sellerId:string,buyerId:string,good:IndustrialGood,quantity:number,lockedPrice?:number){
 const seller=state.countries[sellerId],buyer=state.countries[buyerId];
 const price=lockedPrice??Math.max(industrialPrice(state,good)*(seller?.economy.treasury<5?.85:1.08),good==='tanks'?tankDomesticCost(state,sellerId)*1.35:0);
 const available=Math.max(0,goodStock(state,sellerId,good)-GOODS[good].reserve);
 const error=!seller||!buyer||!Number.isFinite(quantity)||quantity<=0?'Invalid order':!canTradeIndustrial(state,sellerId,buyerId,good)?(good==='tanks'?'Trade pact and alliance required':'Trade pact required; sanctions and war block access'):available<quantity?'Supplier reserve protection':buyer.economy.treasury<price*quantity?'Buyer cannot afford shipment':null;
 return {price,available,cost:price*quantity,error};
}
export function settleIndustrialTrade(state:GameState,sellerId:string,buyerId:string,good:IndustrialGood,quantity:number,lockedPrice?:number):GameState {
 const quote=industrialQuote(state,sellerId,buyerId,good,quantity,lockedPrice),price=lockedPrice??quote.price;
 if(quote.error||!Number.isFinite(price)||price<=0||state.countries[buyerId].economy.treasury<quantity*price)return state;
 let next=changeGoodStock(state,sellerId,good,-quantity);next=changeGoodStock(next,buyerId,good,quantity);
 const cost=quantity*price,seller=next.countries[sellerId],buyer=next.countries[buyerId];
 next={...next,countries:{...next.countries,[sellerId]:{...seller,economy:{...seller.economy,treasury:seller.economy.treasury+cost}},[buyerId]:{...buyer,economy:{...buyer.economy,treasury:buyer.economy.treasury-cost}}},industrialEconomy:{...next.industrialEconomy,[sellerId]:{...next.industrialEconomy[sellerId],lastTradeBalance:next.industrialEconomy[sellerId].lastTradeBalance+cost},[buyerId]:{...next.industrialEconomy[buyerId],lastTradeBalance:next.industrialEconomy[buyerId].lastTradeBalance-cost}}};
 return changeRelations(next,sellerId,buyerId,.03);
}
export function placeIndustrialOrder(state:GameState,partnerId:string,good:IndustrialGood,quantity:number,direction:'buy'|'sell',years:0|1|3|5|10=0):GameState {
 const sellerId=direction==='buy'?partnerId:state.playerCountryId,buyerId=direction==='buy'?state.playerCountryId:partnerId;
 const quote=industrialQuote(state,sellerId,buyerId,good,quantity);if(quote.error)return state;
 if(years===0){const next=settleIndustrialTrade(state,sellerId,buyerId,good,quantity);return {...next,sitrep:[`MARKET // ${direction==='buy'?'Imported':'Exported'} ${quantity} ${GOODS[good].label}; $${quote.cost.toFixed(3)}B settled.`,...next.sitrep].slice(0,12)};}
 if(Object.values(state.industrialContracts).some(c=>c.active&&c.sellerId===sellerId&&c.buyerId===buyerId&&c.good===good))return state;
 const id=`${sellerId}-${buyerId}-${good}-${state.day}-${Object.keys(state.industrialContracts).length}`;
 const contract:IndustrialContract={id,sellerId,buyerId,good,quantity,price:quote.price,nextDeliveryDay:state.day+30,expiresDay:state.day+365*years,active:true,missedDeliveries:0};
 return {...state,industrialContracts:{...state.industrialContracts,[id]:contract},sitrep:[`MARKET // ${years}-year ${GOODS[good].label} supply contract agreed; monthly delivery ${quantity} units.`,...state.sitrep].slice(0,12)};
}
export function processIndustrialContracts(state:GameState):GameState {
 let next=state;
 for(const contract of Object.values(state.industrialContracts)){
  if(!contract.active)continue;
  if(state.day>contract.expiresDay){next={...next,industrialContracts:{...next.industrialContracts,[contract.id]:{...contract,active:false}}};continue;}
  if(state.day<contract.nextDeliveryDay)continue;
  const before=next;next=settleIndustrialTrade(next,contract.sellerId,contract.buyerId,contract.good,contract.quantity,contract.price);
  const failed=next===before;const blocked=!canTradeIndustrial(next,contract.sellerId,contract.buyerId,contract.good);
  next={...next,industrialContracts:{...next.industrialContracts,[contract.id]:{...contract,nextDeliveryDay:state.day+30,active:!blocked,missedDeliveries:contract.missedDeliveries+(failed?1:0)}}};
  if(failed&&(contract.sellerId===state.playerCountryId||contract.buyerId===state.playerCountryId))next={...next,sitrep:[`SUPPLY CONTRACT // ${GOODS[contract.good].label} delivery ${blocked?'cancelled by diplomatic restrictions':'missed: insufficient stock or liquidity'}.`,...next.sitrep].slice(0,12)};
 }
 return next;
}
export function processIndustrialMarketAI(state:GameState):GameState {
 if(state.day%14!==0)return state;
 let next=state;
 for(const buyer of Object.values(state.countries)){
  if(buyer.id===state.playerCountryId)continue;
  for(const good of ['water','engines','electronics','armor_plate'] as IndustrialGood[]){
   if(goodStock(next,buyer.id,good)>=GOODS[good].reserve)continue;
   const seller=Object.values(next.countries).filter(s=>canTradeIndustrial(next,s.id,buyer.id,good)&&goodStock(next,s.id,good)>GOODS[good].reserve*2).sort((a,b)=>goodStock(next,b.id,good)-goodStock(next,a.id,good)||a.id.localeCompare(b.id))[0];
   if(seller)next=settleIndustrialTrade(next,seller.id,buyer.id,good,Math.min(5,GOODS[good].reserve));
  }
 }
 return next;
}

export function tankDomesticCost(s:GameState,id:string){const c=s.countries[id],line=s.production[id]?.lines.armor;if(!c)return 0;const tech=1+c.military.technology/500+(c.technology.unlocked.includes('ind-automation')?.08:0)+(c.technology.unlocked.includes('ind-metallurgy')?.06:0)+(c.technology.unlocked.includes('mil-modernization')?.08:0);const output=EQUIPMENT_CATALOG.armor.baseOutput*Math.max(.2,(line?.efficiency??70)/100)*tech;return EQUIPMENT_CATALOG.armor.inputs.treasury/output+Object.entries(TANK_COMPONENTS).reduce((v,[k,q])=>v+(q??0)*GOODS[k as IndustrialGood].price,0)+(EQUIPMENT_CATALOG.armor.inputs.steel*GOODS.steel.price+EQUIPMENT_CATALOG.armor.inputs.fuel*GOODS.fuel.price)/output;}

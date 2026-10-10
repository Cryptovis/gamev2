import type {GameState} from '../domain/game';
import type {GameCommand} from '../domain/commands';
import type {CommandResult} from '../engine/commands';
import {commodityExchange,COMMODITY_SPECS} from '../engine/systems/commodityExchange';
import {exchangeStock} from '../engine/systems/livingEconomy';
import type {ReviewContent} from '../ui/panels/ReviewDialog';
import {money} from '../ui/formatMoney';

/** Describe settled engine results, including freight and delayed cargo/cash. */
export function commandReceipt(before:GameState,command:GameCommand,result:CommandResult):ReviewContent {
 const after=result.state,id=before.playerCountryId,language=before.playerProfile.language;
 const treasury=after.countries[id].economy.treasury;
 const receipt:ReviewContent={title:result.status==='applied'?'Command completed':result.status==='duplicate'?'Command already applied':'Command unavailable',summary:result.message,metrics:[['Treasury',money(treasury,language)]]};
 if(result.status!=='applied'||command.type!=='commodity/order')return receipt;
 const ex=commodityExchange(after),trade=ex.trades[0];
 if(!trade||trade.countryId!==id||trade.good!==command.good||trade.side!==command.side)return receipt;
 const spec=COMMODITY_SPECS[command.good],buy=command.side==='buy';
 const quantity=trade.quantity.toFixed(3),unit=spec.unit;
 const metrics:string[][]=[['Commodity',spec.label],[buy?'Purchased quantity':'Sold quantity',`${buy?'+':'−'}${quantity} ${unit}`]];
 const tones:NonNullable<ReviewContent['metricTones']>={[buy?'Purchased quantity':'Sold quantity']:buy?'positive':'negative'};
 const warnings:string[]=[];
 if(buy){
  metrics.push(['Total paid',`−${money(before.countries[id].economy.treasury-treasury,language)}`]);
  tones['Total paid']='negative';
  if(spec.physical){
   const delivery=ex.deliveries[ex.deliveries.length-1];
   metrics.push(['Current reserves',`${exchangeStock(after,id,command.good).toFixed(3)} ${unit}`],['Incoming cargo',`+${quantity} ${unit}`]);
   tones['Incoming cargo']='positive';
   if(delivery?.countryId===id&&delivery.good===command.good)metrics.push(['Days until arrival',String(delivery.arriveDay-after.day)]);
   warnings.push('Your purchase is on its way. Reserves increase when the cargo arrives.');
  }else{
   metrics.push(['Vault holdings',`${ex.positions[id]?.[command.good]?.units.toFixed(3)??'0.000'} ${unit}`]);
   tones['Vault holdings']='positive';
  }
 }else{
  const settlement=ex.settlements[ex.settlements.length-1];
  if(settlement?.countryId===id){metrics.push(['Proceeds pending',`+${money(settlement.amount,language)}`],['Days until payment',String(settlement.day-after.day)]);tones['Proceeds pending']='positive';}
  warnings.push('Sale proceeds enter your treasury on the next game day.');
 }
 metrics.push(['Treasury now',money(treasury,language)]);
 return {...receipt,title:buy?'Purchase completed':'Sale completed',visual:'economy',asset:command.good,outcome:'success',metrics,metricTones:tones,warnings};
}

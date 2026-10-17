import type {GameState} from '../domain/game';
import type {GameCommand} from '../domain/commands';
import type {CommandResult} from '../engine/commands';
import {expansion,repaymentPreview} from '../engine/systems/sovereignCredit';
import {commodityExchange,COMMODITY_SPECS} from '../engine/systems/commodityExchange';
import {exchangeStock, living} from '../engine/systems/livingEconomy';
import type {ReviewContent} from '../ui/panels/ReviewDialog';
import {longTermContractPreview} from '../engine/systems/trade';
import {money} from '../ui/formatMoney';

interface ActionCopy{title:string;next:string}
const TRADE_PACT_NEXT='The partner will review and respond in 3 campaign days. If accepted, bilateral trade friction will be reduced.';
const EMBASSY_NEXT='The partner will review and respond in 3 campaign days. If accepted, the embassy opens diplomatic access and raises commercial trust.';
const GIFT_NEXT='The partner records the gesture as goodwill. Relations improve over the coming days.';
const TREATY_NEXT='The treaty is in force. Review its obligations in Diplomacy.';
/** Title and next steps for diplomatic and trade commands; null for everything else. */
function actionCopy(command:GameCommand):ActionCopy|null{
 switch(command.type){
  case 'diplomacy/request':return command.kind==='embassy'?{title:'Diplomatic Delegation Dispatched',next:EMBASSY_NEXT}:{title:'Trade Pact Proposed',next:TRADE_PACT_NEXT};
  case 'diplomacy/signTradePact':return {title:'Trade Pact Proposed',next:TRADE_PACT_NEXT};
  case 'diplomacy/improveRelations':return {title:'Relations Initiative Launched',next:'Relations improve gradually. Check the bilateral index in Diplomacy.'};
  case 'diplomacy/giftTreasury':return {title:'Treasury Grant Sent',next:GIFT_NEXT};
  case 'diplomacy/giftResource':return {title:'Resource Aid Shipped',next:GIFT_NEXT};
  case 'diplomacy/signNonAggression':return {title:'Non-Aggression Pact Signed',next:TREATY_NEXT};
  case 'diplomacy/signAlliance':return {title:'Alliance Signed',next:TREATY_NEXT};
  case 'diplomacy/toggleEmbargo':return {title:'Embargo Updated',next:'Trade between the two countries changes immediately. You can reverse it at any time.'};
  case 'diplomacy/formBloc':case 'diplomacy/inviteToBloc':return {title:'Bloc Action Completed',next:'The bloc update takes effect now. Review members in Diplomacy.'};
  case 'trade/createImport':return {title:'Import Flow Opened',next:'Cargo arrives after the travel time. You can cancel the flow in Diplomacy.'};
  case 'trade/createLongTermContract':return {title:'Supply Agreement Signed',next:'Deliveries arrive every 30 days at the fixed price. Manage the agreement in Diplomacy.'};
  case 'industry/order':return {title:command.direction==='buy'?'Industrial Order Placed':'Industrial Export Placed',next:'Stocks move immediately. Your treasury and reserves are already updated.'};
  default:return null;
 }
}
const partnerOf=(command:GameCommand):string|undefined=>command.type==='diplomacy/request'?command.id:command.type==='industry/order'?command.partnerId:'targetCountryId' in command&&typeof command.targetCountryId==='string'?command.targetCountryId:undefined;

/** Clean metric chips for a signed supply contract, priced from the engine preview taken before signing. */
function supplyContractChips(before:GameState,command:Extract<GameCommand,{type:'trade/createLongTermContract'}>,fmt:typeof money,language:string):Pick<ReviewContent,'metrics'>{
 const view=longTermContractPreview(before,before.playerCountryId,command.targetCountryId,command.resource,command.years);
 return {metrics:[['Monthly delivery',`${view.monthlyQuantity.toFixed(2)} ${command.resource}`],['Unit price',`$${view.unitPrice.toFixed(3)}`],['Total monthly cost',fmt(view.monthlyCost,language)],['Delivery start',`Day ${before.day+30}`]]};
}

const INTEL_PHOTO='/assets/command/intel-espionage.jpg';
const INTEL_OPERATION_LABEL:Record<string,string>={gather_intelligence:'Gather Intelligence',influence_campaign:'Influence Campaign',sabotage_industry:'Sabotage Industry',counter_network:'Counter Network'};
/** UI-side risk and yield tiers, worded from the engine's operation table (the engine does not export it). Qualitative on purpose. */
const INTEL_TIER:Record<string,{risk:'Low'|'Medium'|'High';yield:'High'|'Medium'|'Low'}>={gather_intelligence:{risk:'Low',yield:'High'},counter_network:{risk:'Low',yield:'Medium'},influence_campaign:{risk:'Medium',yield:'Medium'},sabotage_industry:{risk:'High',yield:'Low'}};
const TIER_TONE:Record<string,'positive'|'neutral'|'negative'>={Low:'positive',Medium:'neutral',High:'negative'};

/** Executive briefing for a launched covert operation: target, type, risk, yield and the budget it actually cost. */
function intelBriefing(before:GameState,command:Extract<GameCommand,{type:'intelligence/launch'}>,after:GameState,receipt:ReviewContent):ReviewContent|null{
 const target=before.countries[command.targetCountryId],id=before.playerCountryId,language=before.playerProfile.language;
 const launched=Object.values(after.intelOperations).some(op=>op.type===command.operationType&&op.targetCountryId===command.targetCountryId&&op.sourceCountryId===id&&op.startedDay===before.day);
 if(!target||!launched)return null;
 const tier=INTEL_TIER[command.operationType]??{risk:'Medium',yield:'Medium'};
 const cost=before.countries[id].economy.treasury-after.countries[id].economy.treasury;
 return {...receipt,title:'Intelligence Briefing',image:INTEL_PHOTO,briefing:true,outcome:'success',
  metrics:[['Target Nation',target.name],['Operation Type',INTEL_OPERATION_LABEL[command.operationType]??command.operationType],['Risk Level',tier.risk],['Estimated Intel Yield',tier.yield],['Budget Cost',money(cost,language)],['Treasury',receipt.metrics?.[0]?.[1]??'']],
  metricTones:{'Risk Level':TIER_TONE[tier.risk],'Estimated Intel Yield':{High:'positive',Medium:'neutral',Low:'negative'}[tier.yield] as 'positive'|'neutral'|'negative'},
  nextSteps:'Results arrive when the operation completes. Review them in the Executive Desk.'};
}

/** Describe settled engine results, including freight and delayed cargo/cash. */
export function commandReceipt(before:GameState,command:GameCommand,result:CommandResult):ReviewContent {
 const after=result.state,id=before.playerCountryId,language=before.playerProfile.language;
 const treasury=after.countries[id].economy.treasury;
 const receipt:ReviewContent={title:result.status==='applied'?'Command completed':result.status==='duplicate'?'Command already applied':'Command unavailable',summary:result.message,metrics:[['Treasury',money(treasury,language)]]};
 if(result.status==='applied'&&command.type==='intelligence/launch'){const briefing=intelBriefing(before,command,after,receipt);if(briefing)return briefing;}
 if(result.status==='applied'&&command.type==='diplomacy/resolveLetter'){
  const letter=living(before).letters.find(l=>l.id===command.id);
  const home=before.countries[id],sender=letter?before.countries[letter.senderId]:undefined;
  if(letter&&home&&sender){
   if(command.accept){
    const isEmbassy=letter.kind==='embassy';
    const title=isEmbassy?'Embassy Exchange Ratified':'Trade Framework Ratified';
    const summary=isEmbassy
     ?`Bilateral embassy agreement ratified between ${home.name} and ${sender.name}. Permanent diplomatic missions are now established.`
     :`Bilateral trade framework ratified between ${home.name} and ${sender.name}. Trade frictions and tariffs are lowered.`;
    const nextSteps=isEmbassy
     ?'Diplomatic trust and communication channels are now open. Review bilateral standing in Diplomacy.'
     :'Bilateral commercial exchange is now active. Review trade deals and agreements in Diplomacy.';
    const fee=before.countries[id].economy.treasury-treasury;
    return {
     ...receipt,
     title,
     summary,
     visual:'diplomacy',
     asset:isEmbassy?'embassy':'trade',
     outcome:'success',
     parties:{left:{iso2:home.iso2,name:home.name},right:{iso2:sender.iso2,name:sender.name}},
     metrics:[
      ['Agreement',isEmbassy?'Embassy Exchange':'Trade Framework'],
      ['Setup fee',fee>0?money(fee,language):money(0,language)],
      ['Treasury now',money(treasury,language)],
     ],
     nextSteps,
    };
   }else{
    return {
     ...receipt,
     title:'Diplomatic Proposal Declined',
     summary:`The diplomatic proposal from ${sender.name} was officially declined.`,
     visual:'diplomacy',
     parties:{left:{iso2:home.iso2,name:home.name},right:{iso2:sender.iso2,name:sender.name}},
     metrics:[['Proposal status','Declined'],['Treasury now',money(treasury,language)]],
    };
   }
  }
 }
 const copy=result.status==='applied'?actionCopy(command):null,partnerId=partnerOf(command),home=before.countries[id],partner=partnerId?before.countries[partnerId]:undefined;
 if(copy&&home&&partner)return {...receipt,...(command.type==='trade/createLongTermContract'?supplyContractChips(before,command,money,language):{}),title:copy.title,visual:command.type.startsWith('diplomacy')?'diplomacy':'economy',outcome:'success',parties:{left:{iso2:home.iso2,name:home.name},right:{iso2:partner.iso2,name:partner.name}},nextSteps:copy.next};
 if(result.status==='applied'&&command.type==='credit/accept'){const application=expansion(after).creditApplications?.find(a=>a.offerId===command.id&&a.actorId===id&&a.status==='pending');if(application)return {...receipt,title:'Credit application submitted',summary:'Applications are assessed after three game days. Funds arrive only on approval; relations, rating and lender cash are checked again.',metrics:[['Principal',money(application.principal,language)],['Annual interest',`${application.apr}%`],['Decision day',String(application.decisionDay)],['Treasury now',money(treasury,language)]]};}
 if(result.status==='applied'&&command.type==='credit/repay'){const view=repaymentPreview(before,command.id);return {...receipt,title:'Loan settled',metrics:[['Payment now',money(view.amount,language)],['Interest saved',money(view.interestSaved,language)],['Credit score gain',`+${view.scoreGain.toFixed(2)}`],['Treasury now',money(treasury,language)]]};}
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

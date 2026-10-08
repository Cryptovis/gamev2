import {useWorldView} from '../../store/useWorldView';
import {money as formatMoney} from '../formatMoney';
import {LocaleText,translateLive} from '../../i18n/localeText';
import {ReviewDialog} from './ReviewDialog';
import {getTradeQuote} from '../../engine/systems/trade';
import type {TradeResource} from '../../domain/game';
import { useState } from 'react';
import { MARKET_RESOURCES, findBestSuppliers, resourceReserveDays, resourceSelfSufficiency, resourceStrategicStatus } from '../../store/marketSelectors';
import { useGameStore } from '../../store/gameStore';
import { relationFor, relationshipIndex } from '../../engine/systems/diplomacy';
import { strategicDecisionSpec } from '../../engine/systems/strategicDecision';
import type { StrategicDecisionSpec } from '../../domain/interaction';
import { StrategicDecisionModal } from './StrategicDecisionModal';
import { ResourceIcon } from '../icons/GameIcons';
import { DraggableWindow } from '../windows/DraggableWindow';

export function ResourceCommandWindow({onClose,resource:initialResource}:{onClose:()=>void;resource?:TradeResource}){
 const state=useWorldView();
 const [selectedResource,setSelectedResource]=useState<TradeResource|null>(initialResource??null);
 const [blocked,setBlocked]=useState<string|null>(null),[importReview,setImportReview]=useState<{id:string;resource:TradeResource}|null>(null);
 const [pendingDecision,setPendingDecision]=useState<{spec:StrategicDecisionSpec;execute:()=>void}|null>(null);
 const player=state.countries[state.playerCountryId];
  const money=(value:number)=>formatMoney(value,state.playerProfile.language);
 return <DraggableWindow id="resource-command-window" kicker="NATIONAL ECONOMY" title={translateLive("Strategic Resources")} initialX={92} initialY={150} width={650} onClose={onClose}>
  <div className="resource-command-summary">
   <span><small><LocaleText value={"FUEL"}/></small><strong><LocaleText value={player.processedResources.fuel.toFixed(1)}/></strong></span>
   <span><small><LocaleText value={"STEEL"}/></small><strong><LocaleText value={player.processedResources.steel.toFixed(1)}/></strong></span>
   <span><small><LocaleText value={"POWER"}/></small><strong><LocaleText value={player.processedResources.electricity.toFixed(1)}/></strong></span>
   <span><small><LocaleText value={"ACTIVE TRADE"}/></small><strong><LocaleText value={Object.values(state.tradeDeals).filter(d=>d.active&&(d.buyerId===player.id||d.sellerId===player.id)).length}/></strong></span>
  </div>
  <nav className="resource-filter"><button className={!selectedResource?'active':''} onClick={()=>setSelectedResource(null)}><LocaleText value="All resources"/></button>{MARKET_RESOURCES.map(r=><button key={r} className={selectedResource===r?'active':''} onClick={()=>setSelectedResource(r)}><ResourceIcon resource={r} size={20}/><LocaleText value={r}/></button>)}</nav>
  <div className="resource-command-grid">
   {MARKET_RESOURCES.filter(r=>!selectedResource||r===selectedResource).map(resource=>{
    const status=resourceStrategicStatus(player,resource);
    const days=resourceReserveDays(player,resource);
    const self=resourceSelfSufficiency(player,resource);
    const suppliers=findBestSuppliers(state,player.id,resource,3);
    return <article key={resource} className={'resource-command-card '+(status==='CRITICAL'?'critical':'')}>
      <header><ResourceIcon resource={resource} size={22}/><span><small><LocaleText value={resource.toUpperCase()}/></small><strong><LocaleText value={player.resources[resource].toFixed(resource==='uranium'?1:0)}/></strong></span><em><LocaleText value={status}/></em></header>
      <div className="resource-command-meta"><span><LocaleText value={days>365?'365+':Math.max(0,days).toFixed(0)}/><LocaleText value={" reserve days"}/></span><span><LocaleText value={Math.min(999,self*100).toFixed(0)}/><LocaleText value={"% self-sufficient"}/></span></div>
      <div className="supplier-command-list">{suppliers.map(item=>{const rel=relationFor(player,item.seller.id);const hasTrade=rel.treaties.includes('trade');return <div key={item.seller.id}><span><b><LocaleText value={item.seller.name}/></b><small><LocaleText value={'REL '+relationshipIndex(rel)+'/100 · '+money(item.price)+' · avail '+item.available.toFixed(1)}/></small></span>{hasTrade?<button onClick={()=>setImportReview({id:item.seller.id,resource})}><LocaleText value={"IMPORT"}/></button>:<button className={rel.score<15?'low-relations':''} title={translateLive(rel.score<15?'Improve relations to unlock trade':'Review a trade pact')} onClick={()=>{if(rel.score<15||player.economy.treasury<5){setBlocked(item.seller.id);return;}if(state.confirmationSkips.trade_pact){state.requestDiplomacy(item.seller.id,'trade_pact',1);return;}const spec=strategicDecisionSpec(state,'trade_pact',item.seller.id);if(spec)setPendingDecision({spec,execute:()=>state.signTradePact(item.seller.id)});}}><LocaleText value={rel.score<15?'Low Relations':player.economy.treasury<5?'Low Budget':'REVIEW PACT'}/></button>}</div>})}{!suppliers.length&&<p><LocaleText value={"No politically accessible surplus supplier detected."}/></p>}</div>
    </article>;
   })}
  </div>
  <p className="resource-command-note"><LocaleText value={"Shortage management is connected directly to diplomacy and trade. Trade pacts unlock imports; embassies can reduce bilateral friction."}/></p>
  {blocked&&<ReviewDialog title={translateLive("Trade access requirements")} summary={`${state.countries[blocked].name}: improve bilateral trust before signing a trade pact.`} metrics={[["Current relations",`${relationshipIndex(relationFor(player,blocked))}/100`],["Required relations",'58/100'],["Pact budget",`$5B · current $${player.economy.treasury.toFixed(2)}B`]]} warnings={['Send a diplomatic mission or aid to improve trust.','Open an embassy to support relations and reduce trade friction. Then sign a trade pact to unlock imports.']} confirmLabel="OPEN DIPLOMACY" onCancel={()=>setBlocked(null)} onConfirm={()=>{const id=blocked;setBlocked(null);state.navigate('diplomacy',id);state.issueMapControl('focus');}}/>}
  {importReview&&(()=>{const q=getTradeQuote(state,importReview.id,importReview.resource);return <ReviewDialog title={translateLive("Review import flow")} summary={`Import ${importReview.resource} from ${state.countries[importReview.id].name}.`} metrics={[["Daily supply",q.quantity.toFixed(3)],['Daily cost',`$${q.dailyCost.toFixed(3)}B`],['Treasury',`$${player.economy.treasury.toFixed(3)}B`]]} warnings={['This daily flow can be cancelled in Diplomacy. Actual supply depends on available stock and funds.']} allowed={q.quantity>0} onCancel={()=>setImportReview(null)} onConfirm={()=>{state.createImport(importReview.id,importReview.resource);setImportReview(null);state.showReceipt({title:'Import flow updated',summary:useGameStore.getState().sitrep[0]});}}/>;})()}
  {pendingDecision&&<StrategicDecisionModal spec={pendingDecision.spec} onCancel={()=>setPendingDecision(null)} onConfirm={()=>{pendingDecision.execute();setPendingDecision(null);}}/>}
 </DraggableWindow>;
}

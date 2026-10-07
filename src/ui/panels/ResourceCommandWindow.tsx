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

export function ResourceCommandWindow({onClose}:{onClose:()=>void}){
 const state=useGameStore();
 const [blocked,setBlocked]=useState<string|null>(null),[importReview,setImportReview]=useState<{id:string;resource:TradeResource}|null>(null);
 const [pendingDecision,setPendingDecision]=useState<{spec:StrategicDecisionSpec;execute:()=>void}|null>(null);
 const player=state.countries[state.playerCountryId];
 return <DraggableWindow id="resource-command-window" kicker="NATIONAL ECONOMY" title="Strategic Resources" initialX={92} initialY={150} width={650} onClose={onClose}>
  <div className="resource-command-summary">
   <span><small>FUEL</small><strong>{player.processedResources.fuel.toFixed(1)}</strong></span>
   <span><small>STEEL</small><strong>{player.processedResources.steel.toFixed(1)}</strong></span>
   <span><small>POWER</small><strong>{player.processedResources.electricity.toFixed(1)}</strong></span>
   <span><small>ACTIVE TRADE</small><strong>{Object.values(state.tradeDeals).filter(d=>d.active&&(d.buyerId===player.id||d.sellerId===player.id)).length}</strong></span>
  </div>
  <div className="resource-command-grid">
   {MARKET_RESOURCES.map(resource=>{
    const status=resourceStrategicStatus(player,resource);
    const days=resourceReserveDays(player,resource);
    const self=resourceSelfSufficiency(player,resource);
    const suppliers=findBestSuppliers(state,player.id,resource,3);
    return <article key={resource} className={'resource-command-card '+(status==='CRITICAL'?'critical':'')}>
      <header><ResourceIcon resource={resource} size={22}/><span><small>{resource.toUpperCase()}</small><strong>{player.resources[resource].toFixed(resource==='uranium'?1:0)}</strong></span><em>{status}</em></header>
      <div className="resource-command-meta"><span>{days>365?'365+':Math.max(0,days).toFixed(0)} reserve days</span><span>{Math.min(999,self*100).toFixed(0)}% self-sufficient</span></div>
      <div className="supplier-command-list">{suppliers.map(item=>{const rel=relationFor(player,item.seller.id);const hasTrade=rel.treaties.includes('trade');return <div key={item.seller.id}><span><b>{item.seller.name}</b><small>{'REL '+relationshipIndex(rel)+'/100 · $'+item.price.toFixed(3)+' · avail '+item.available.toFixed(1)}</small></span>{hasTrade?<button onClick={()=>setImportReview({id:item.seller.id,resource})}>IMPORT</button>:<button className={rel.score<15?'low-relations':''} title={rel.score<15?'Improve relations to unlock trade':'Review a trade pact'} onClick={()=>{if(rel.score<15||player.economy.treasury<5){setBlocked(item.seller.id);return;}if(state.confirmationSkips.trade_pact){state.signTradePact(item.seller.id);return;}const spec=strategicDecisionSpec(state,'trade_pact',item.seller.id);if(spec)setPendingDecision({spec,execute:()=>state.signTradePact(item.seller.id)});}}>{rel.score<15?'Low Relations':player.economy.treasury<5?'Low Budget':'REVIEW PACT'}</button>}</div>})}{!suppliers.length&&<p>No politically accessible surplus supplier detected.</p>}</div>
    </article>;
   })}
  </div>
  <p className="resource-command-note">Shortage management is connected directly to diplomacy and trade. Trade pacts unlock imports; embassies can reduce bilateral friction.</p>
  {blocked&&<ReviewDialog title="Trade access requirements" summary={`${state.countries[blocked].name}: improve bilateral trust before signing a trade pact.`} metrics={[["Current relations",`${relationshipIndex(relationFor(player,blocked))}/100`],["Required relations",'58/100'],["Pact budget",`$5B · current $${player.economy.treasury.toFixed(2)}B`]]} warnings={['Send a diplomatic mission or aid to improve trust.','Open an embassy to support relations and reduce trade friction. Then sign a trade pact to unlock imports.']} confirmLabel="OPEN DIPLOMACY" onCancel={()=>setBlocked(null)} onConfirm={()=>{state.navigate('diplomacy',blocked);setBlocked(null);onClose();}}/>}
  {importReview&&(()=>{const q=getTradeQuote(state,importReview.id,importReview.resource);return <ReviewDialog title="Review import flow" summary={`Import ${importReview.resource} from ${state.countries[importReview.id].name}.`} metrics={[["Daily supply",q.quantity.toFixed(3)],['Daily cost',`$${q.dailyCost.toFixed(3)}B`],['Treasury',`$${player.economy.treasury.toFixed(3)}B`]]} warnings={['This daily flow can be cancelled in Diplomacy. Actual supply depends on available stock and funds.']} allowed={q.quantity>0} onCancel={()=>setImportReview(null)} onConfirm={()=>{state.createImport(importReview.id,importReview.resource);setImportReview(null);state.showReceipt({title:'Import flow updated',summary:useGameStore.getState().sitrep[0]});}}/>;})()}
  {pendingDecision&&<StrategicDecisionModal spec={pendingDecision.spec} onCancel={()=>setPendingDecision(null)} onConfirm={()=>{pendingDecision.execute();setPendingDecision(null);}}/>}
 </DraggableWindow>;
}

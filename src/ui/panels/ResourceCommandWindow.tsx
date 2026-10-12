import {naturalCase} from '../../i18n/naturalCase';
import {useWorldView} from '../../store/useWorldView';
import {LocaleText,translateLive} from '../../i18n/localeText';
import type {TradeResource} from '../../domain/game';
import { useState } from 'react';
import { MARKET_RESOURCES, resourceReserveDays, resourceSelfSufficiency, resourceStrategicStatus } from '../../store/marketSelectors';
import {NavigationArt} from '../icons/NavigationArt';
import { ResourceIcon } from '../icons/GameIcons';
import { DraggableWindow } from '../windows/DraggableWindow';
import { SupplierRanking } from './TradeDesk';

export function ResourceCommandWindow({onClose,resource:initialResource}:{onClose:()=>void;resource?:TradeResource}){
 const state=useWorldView();
 const [selectedResource,setSelectedResource]=useState<TradeResource|null>(initialResource??null);
 const player=state.countries[state.playerCountryId];
 return <DraggableWindow expanded id="resource-command-window" kicker="NATIONAL ECONOMY" title={translateLive("Strategic Resources")} initialX={92} initialY={150} width={1100} onClose={onClose}>
  <div className="resource-command-summary">
   <span><small><LocaleText value={"FUEL"}/></small><strong><LocaleText value={player.processedResources.fuel.toFixed(1)}/></strong></span>
   <span><small><LocaleText value={"STEEL"}/></small><strong><LocaleText value={player.processedResources.steel.toFixed(1)}/></strong></span>
   <span><small><LocaleText value={"POWER"}/></small><strong><LocaleText value={player.processedResources.electricity.toFixed(1)}/></strong></span>
   <span><small><LocaleText value={"ACTIVE TRADE"}/></small><strong><LocaleText value={Object.values(state.tradeDeals).filter(d=>d.active&&(d.buyerId===player.id||d.sellerId===player.id)).length}/></strong></span>
  </div>
  <nav className="resource-filter"><button className={!selectedResource?'active':''} onClick={()=>setSelectedResource(null)}><NavigationArt kind="alerts" size={24}/><LocaleText value="All resources"/></button>{MARKET_RESOURCES.map(r=><button key={r} className={selectedResource===r?'active':''} onClick={()=>setSelectedResource(r)}><ResourceIcon resource={r} size={20}/>{naturalCase(translateLive(r[0].toUpperCase()+r.slice(1)),state.playerProfile.language)}</button>)}</nav>
  <div className="resource-command-grid">
   {MARKET_RESOURCES.filter(r=>!selectedResource||r===selectedResource).map(resource=>{
    const status=resourceStrategicStatus(player,resource);
    const days=resourceReserveDays(player,resource);
    const self=resourceSelfSufficiency(player,resource);
    return <article key={resource} className={'resource-command-card '+(status==='CRITICAL'?'critical':'')}>
      <header><ResourceIcon resource={resource} size={40}/><span className="resource-card-values"><small><LocaleText value={resource.toUpperCase()}/></small><strong><LocaleText value={player.resources[resource].toFixed(resource==='uranium'?1:0)}/></strong></span><em><LocaleText value={status}/></em></header>
      <div className="resource-command-meta"><span><LocaleText value={days>365?'365+':Math.max(0,days).toFixed(0)}/><LocaleText value={" reserve days"}/></span><span><LocaleText value={Math.min(999,self*100).toFixed(0)}/><LocaleText value={"% self-sufficient"}/></span></div>
      <div className="subhead"><LocaleText value="Best suppliers for you"/></div><SupplierRanking good={resource} limit={3}/>
    </article>;
   })}
  </div>
  <p className="resource-command-note"><LocaleText value={"Shortage management is connected directly to diplomacy and trade. Trade pacts unlock imports; embassies can reduce bilateral friction."}/></p>
 </DraggableWindow>;
}

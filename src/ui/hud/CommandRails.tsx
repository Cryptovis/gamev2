import {useWorldView} from '../../store/useWorldView';
const CreditWindow=lazy(()=>import('../panels/CreditWindow').then(m=>({default:m.CreditWindow})));
const CommodityExchangePanel=lazy(()=>import('../panels/CommodityExchangePanel').then(m=>({default:m.CommodityExchangePanel})));
import {activeCountries} from '../../domain/sovereignty';
import {money} from '../formatMoney';
import {GuideBriefing} from '../panels/GuideBriefing';
import {CampaignVictoryProgress} from './CampaignVictoryProgress';
const DomesticWindow=lazy(()=>import('../panels/DomesticWindow').then(m=>({default:m.DomesticWindow})));
const DiplomaticPost=lazy(()=>import('../panels/DiplomaticPost').then(m=>({default:m.DiplomaticPost})));
import {living} from '../../engine/systems/livingEconomy';
import {CivicArt} from '../icons/CivicArt';
import {CommandArt} from '../icons/CommandArt';
import {LocaleText,translateLive} from '../../i18n/localeText';
const ResearchWindow=lazy(()=>import('../panels/ResearchWindow').then(m=>({default:m.ResearchWindow})));
const InvestmentWindow=lazy(()=>import('../panels/InvestmentWindow').then(m=>({default:m.InvestmentWindow})));
const GovernanceWindow=lazy(()=>import('../panels/GovernanceWindow').then(m=>({default:m.GovernanceWindow})));
const HelpPanel=lazy(()=>import('../panels/HelpPanel').then(m=>({default:m.HelpPanel})));
import {NavigationArt} from '../icons/NavigationArt';
import {lazy,Suspense,useEffect, useMemo, useState, type ReactNode } from 'react';
import { MARKET_RESOURCES, getMarketBoard, resourceReserveDays, resourceStrategicStatus } from '../../store/marketSelectors';
import { useGameStore } from '../../store/gameStore';
import { BlocIcon, CouncilIcon, DiplomacyIcon, EmbassyIcon, IntelligenceIcon, ResourceIcon, TreasuryIcon, WorldIcon } from '../icons/GameIcons';
import { DraggableWindow } from '../windows/DraggableWindow';
import { MapModeBar } from './MapModeBar';
const IndustrialMarketPanel=lazy(()=>import('../panels/IndustrialMarketPanel').then(m=>({default:m.IndustrialMarketPanel})));
const ResourceCommandWindow=lazy(()=>import('../panels/ResourceCommandWindow').then(m=>({default:m.ResourceCommandWindow})));

type ToolId='objectives'|'market'|'pulse'|'map'|'resources'|'sitrep'|'alerts'|'diplomacy';

function RailButton({active,badge,label,children,onClick}:{active:boolean;badge?:number|string;label:string;children:ReactNode;onClick:()=>void}){
 return <button data-guide={'rail-'+label.toLowerCase()} className={active?'rail-button active':'rail-button'} onClick={onClick} aria-pressed={active} title={translateLive(`${label} · ${active?'Open — click to close':'Closed — click to open'}`)}><span><LocaleText value={children}/></span>{badge!==undefined&&badge!==0&&<b><LocaleText value={badge}/></b>}<small><LocaleText value={label}/></small></button>;
}

export function CommandRails(){
 const state=useWorldView();
 const open=new Set(state.activeTool?[state.activeTool]:[]);
 const player=state.countries[state.playerCountryId];
 const board=useMemo(()=>getMarketBoard(state),[state.countries,state.tradeDeals]);
 const activeWars=Object.values(state.wars).filter(w=>w.status==='active');
 const activeTrades=Object.values(state.tradeDeals).filter(d=>d.active);
 const activeOps=Object.values(state.intelOperations).filter(o=>o.status==='active');
 const sanctions=activeCountries(state.countries).filter(c=>c.globalSanctions);
 const offers=state.diplomaticOffers.filter(o=>o.expiresDay>=state.day);
 const embassies=Object.values(state.embassies).filter(e=>e.countryA===player.id||e.countryB===player.id);
 const objectives=useMemo(()=>[
  {label:'Establish a player trade flow',done:activeTrades.some(d=>d.buyerId===player.id||d.sellerId===player.id)},
  {label:'Resolve a covert operation',done:Object.values(state.intelOperations).some(o=>o.sourceCountryId===player.id&&o.status!=='active')},
  {label:'Unlock a technology',done:player.technology.unlocked.length>0},
  {label:'Join or form an alliance bloc',done:Object.values(state.blocs).some(b=>b.memberIds.includes(player.id))},
  {label:'Execute a combat round',done:Object.values(state.wars).some(w=>(w.attackerId===player.id||w.defenderId===player.id)&&w.rounds>0)},
  {label:'Reach Day 30',done:state.day>=30},
 ],[state.tradeDeals,state.intelOperations,state.blocs,state.wars,state.day,player.id,player.technology.unlocked.length]);
 const critical=MARKET_RESOURCES.map(resource=>({resource,status:resourceStrategicStatus(player,resource),days:resourceReserveDays(player,resource)})).filter(x=>x.status==='CRITICAL'||x.status==='IMPORT NEED');
 const toggle=(id:ToolId)=>state.openTool(state.activeTool===id?null:id);
 const close=(_id:ToolId)=>state.closeWorkspace();
 const done=objectives.filter(x=>x.done).length;

 return <Suspense fallback={<div className="loading-popup"><LocaleText value="Loading command…"/></div>}>
  <nav className="command-rail command-rail-left" aria-label={translateLive("World command tools")}>
   <RailButton active={open.has('market')} badge={activeTrades.length} label="MARKET" onClick={()=>toggle('market')}><NavigationArt kind="market"/></RailButton>
   <RailButton active={open.has('pulse')} badge={activeWars.length} label="WORLD" onClick={()=>toggle('pulse')}><NavigationArt kind="world"/></RailButton>
   <RailButton active={open.has('resources')} badge={critical.length} label="SUPPLY" onClick={()=>toggle('resources')}><NavigationArt kind="alerts"/></RailButton>
  </nav>
  <nav className={`command-rail command-rail-right ${state.selectedCountryId?'country-open':'country-closed'}`} aria-label={translateLive("Information tools")}>
   <RailButton active={open.has('objectives')} badge={`${done}/6`} label="GOALS" onClick={()=>toggle('objectives')}><NavigationArt kind="objectives"/></RailButton>
   <RailButton active={open.has('diplomacy')} badge={living(state).letters.filter(m=>!m.read).length+state.leadership.messages.filter(m=>!m.read).length} label="DIPLO" onClick={()=>toggle('diplomacy')}><NavigationArt kind="diplomacy"/></RailButton>
   <RailButton active={open.has('alerts')} badge={critical.length} label="ALERTS" onClick={()=>toggle('alerts')}><NavigationArt kind="alerts"/></RailButton>
   <RailButton active={open.has('sitrep')} badge={state.sitrep.length} label="NEWS" onClick={()=>toggle('sitrep')}><NavigationArt kind="intel"/></RailButton>
  </nav>

  <nav className="command-rail map-help-cluster" aria-label={translateLive("Map and help tools")}>
   <RailButton active={open.has('map')} label="MAP" onClick={()=>toggle('map')}><NavigationArt kind="map"/></RailButton>
   <RailButton active={open.has('help')} label="HELP" onClick={()=>state.openTool(state.activeTool==='help'?null:'help')}><NavigationArt kind="help"/></RailButton>
  </nav>
  <Suspense fallback={<div className="loading-popup"><LocaleText value="Loading command…"/></div>}>
  {open.has('research')&&<ResearchWindow/>}
  {open.has('investment')&&<InvestmentWindow/>}
  {open.has('governance')&&<GovernanceWindow/>}
  </Suspense>
  {open.has('society')&&<DomesticWindow/>}
  {open.has('credit')&&<Suspense fallback={null}><CreditWindow/></Suspense>}
  {open.has('exchange')&&<DraggableWindow id="commodity-exchange-window" kicker="GLOBAL ECONOMY" title={translateLive("Commodity Exchange")} initialX={96} initialY={110} width={980} onClose={()=>close('market')}><Suspense fallback={<p><LocaleText value="Loading command…"/></p>}><CommodityExchangePanel/></Suspense></DraggableWindow>}{open.has('help')&&<HelpPanel/>}
  {open.has('map')&&<div className="left-command-dock map-command-dock"><header className="map-dock-header"><strong><LocaleText value="MAP COMMAND"/></strong><button className="map-close" data-guide="close-workspace" onClick={state.closeWorkspace} aria-label={translateLive("Close map command")}><LocaleText value={"×"}/></button></header><div className="map-dock-body"><GuideBriefing/><MapModeBar/></div></div>}
  {open.has('resources')&&<ResourceCommandWindow onClose={()=>close('resources')}/>}

  {open.has('objectives')&&<DraggableWindow id="objectives-window" kicker="CAMPAIGN / GUIDANCE" title={translateLive("Strategic Objectives")} initialX={88} initialY={170} width={470} onClose={()=>close('objectives')}>
   <div className="floating-progress"><span><b><LocaleText value={done}/></b><LocaleText value={" of "}/><LocaleText value={objectives.length}/><LocaleText value={" complete"}/></span><i><b style={{width:`${done/objectives.length*100}%`}}/></i></div>
   <div className="floating-objectives">{objectives.map((o,i)=><div className={o.done?'done':''} key={o.label}><b><LocaleText value={o.done?'✓':String(i+1).padStart(2,'0')}/></b><span><strong><LocaleText value={o.label}/></strong><small><LocaleText value={o.done?'Completed':'Active objective'}/></small></span></div>)}</div>
   <CampaignVictoryProgress/>
  </DraggableWindow>}

  {open.has('market')&&<DraggableWindow id="market-window" kicker="GLOBAL ECONOMY" title={translateLive("Global Commodity & Industrial Market")} initialX={110} initialY={135} width={760} onClose={()=>close('market')}>
   <div className="floating-market">{board.map(item=><div key={item.resource}><ResourceIcon resource={item.resource} size={24}/><span><small><LocaleText value={item.resource.toUpperCase()}/></small><strong>{money(item.price)}</strong></span><em><LocaleText value={"WORLD PRICE"}/></em></div>)}</div>
   <button className="credit-market-entry exchange-market-entry" onClick={()=>state.openTool('exchange')}><LocaleText value="Commodity Exchange"/></button><button className="credit-market-entry" onClick={()=>state.openTool('credit')}><LocaleText value="Sovereign Credit & Monetary Fund"/></button><IndustrialMarketPanel/>
   <div className="floating-note"><LocaleText value={activeTrades.length}/><LocaleText value={" active global trade flows · prices react to world production and strategic scarcity."}/></div>
  </DraggableWindow>}

  {open.has('pulse')&&<DraggableWindow id="pulse-window" kicker="LIVING WORLD" title={translateLive("World Pulse")} initialX={145} initialY={240} width={520} onClose={()=>close('pulse')}>
   <div className="pulse-summary"><span className={activeWars.length?'danger-card':''}><CivicArt kind="war" size={38}/><small><LocaleText value={"ACTIVE WARS"}/></small><strong><LocaleText value={activeWars.length}/></strong></span><span><CivicArt kind="trade" size={38}/><small><LocaleText value={"TRADE FLOWS"}/></small><strong><LocaleText value={activeTrades.length}/></strong></span><span><CommandArt kind="intel" size={38}/><small><LocaleText value={"ACTIVE OPS"}/></small><strong><LocaleText value={activeOps.length}/></strong></span><span><CivicArt kind="bloc" size={38}/><small><LocaleText value={"BLOCS"}/></small><strong><LocaleText value={Object.values(state.blocs).length}/></strong></span><span><CivicArt kind="letter" size={38}/><small><LocaleText value={"SANCTIONED"}/></small><strong><LocaleText value={sanctions.length}/></strong></span></div>
   <div className="world-activity-list">{activeWars.slice(0,4).map(w=><div key={w.id}><button onClick={()=>state.openWarWindow(w.id)}><LocaleText value={"WAR"}/></button><span><LocaleText value={state.countries[w.attackerId]?.name}/><LocaleText value={" ↔ "}/><LocaleText value={state.countries[w.defenderId]?.name}/></span><em><LocaleText value={w.progress.toFixed(0)}/><LocaleText value={"%"}/></em></div>)}{activeOps.slice(0,4).map(o=><div key={o.id}><b><LocaleText value={"INTEL"}/></b><span><LocaleText value={state.countries[o.sourceCountryId]?.name}/><LocaleText value={" → "}/><LocaleText value={state.countries[o.targetCountryId]?.name}/></span><em><LocaleText value={"D"}/><LocaleText value={o.completeDay}/></em></div>)}{!activeWars.length&&!activeOps.length&&<p><LocaleText value={"No major military or covert activity currently detected."}/></p>}</div>
  </DraggableWindow>}

  {open.has('diplomacy')&&<DraggableWindow id="diplomacy-window" kicker="FOREIGN MINISTRY" title={translateLive("Diplomatic Inbox")} initialX={window.innerWidth-650} initialY={150} width={590} onClose={()=>close('diplomacy')}>
   <DiplomaticPost/><section className="diplomatic-messages"><header><strong><LocaleText value={"LEADER CORRESPONDENCE"}/></strong><button onClick={state.readDiplomaticMessages}><LocaleText value={"MARK READ"}/></button></header>{state.leadership.messages.map(m=><article key={m.id} className={m.tone}><small><LocaleText value={m.kind.toUpperCase()}/><LocaleText value={" · DAY "}/><LocaleText value={m.day}/><LocaleText value={" · "}/><LocaleText value={m.read?'READ':'NEW'}/></small><strong><LocaleText value={state.countries[m.senderId]?.name}/></strong><p><LocaleText value={m.text}/></p></article>)}{!state.leadership.messages.length&&<p><LocaleText value={"Friends and rivals may react to your birthday and national achievements."}/></p>}</section>
   <div className="diplomatic-summary"><span><EmbassyIcon size={22}/><i><small><LocaleText value={"ACTIVE EMBASSIES"}/></small><strong><LocaleText value={embassies.length}/></strong></i></span><span><DiplomacyIcon size={22}/><i><small><LocaleText value={"PENDING OFFERS"}/></small><strong><LocaleText value={offers.length+living(state).letters.filter(x=>x.incoming&&x.status==='pending'&&x.expiresDay>=state.day).length}/></strong></i></span></div>
   <div className="diplomatic-offer-list">{offers.length?offers.map(offer=>{const sender=state.countries[offer.senderId];return <article key={offer.id}><header><b><LocaleText value={sender?.iso2??'--'}/></b><span><small><LocaleText value={offer.type==='embassy'?'EMBASSY EXCHANGE':'TRADE FRAMEWORK'}/></small><strong><LocaleText value={sender?.name??offer.senderId}/></strong></span><em><LocaleText value={"D"}/><LocaleText value={offer.expiresDay-state.day}/></em></header><p><LocaleText value={offer.message}/></p><div><button onClick={()=>state.resolveDiplomaticOffer(offer.id,false)}><LocaleText value={"DECLINE"}/></button><button className="primary" onClick={()=>state.resolveDiplomaticOffer(offer.id,true)}><LocaleText value={"ACCEPT"}/></button></div></article>}):null}</div>
  </DraggableWindow>}

  {open.has('alerts')&&<DraggableWindow id="alerts-window" kicker="NATIONAL SECURITY" title={translateLive("Resource Alerts")} initialX={window.innerWidth-560} initialY={175} width={500} onClose={()=>close('alerts')}>
   <div className="resource-alert-list">{MARKET_RESOURCES.map(resource=>{const status=resourceStrategicStatus(player,resource),days=resourceReserveDays(player,resource);return <div key={resource} className={status==='CRITICAL'?'critical':''}><ResourceIcon resource={resource} size={22}/><span><strong><LocaleText value={resource.toUpperCase()}/></strong><small><LocaleText value={status}/></small></span><em><LocaleText value={days>365?'365+':Math.max(0,days).toFixed(0)}/><LocaleText value={" DAYS"}/></em></div>})}</div>
  </DraggableWindow>}

  {open.has('sitrep')&&<DraggableWindow id="sitrep-window" kicker="COMMAND CHANNEL" title={translateLive("News Archive")} initialX={window.innerWidth-600} initialY={220} width={540} onClose={()=>close('sitrep')}>
   <div className="sitrep-archive">{(state.world.journal??state.sitrep.map((message,i)=>({id:String(i),message,day:state.day}))).map(entry=><div key={entry.id}><b><LocaleText value="Day"/> {entry.day}</b><span><LocaleText value={entry.message}/></span></div>)}</div>
  </DraggableWindow>}
 </Suspense>;
}

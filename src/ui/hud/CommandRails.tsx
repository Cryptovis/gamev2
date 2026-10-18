import {leaderModifiers} from '../../engine/systems/leaderPerks';
import {FuelHelper} from '../panels/FuelHelper';
import {ExecutiveWorkspaceShell} from '../windows/ExecutiveWorkspaceShell';
import {MarketWindow} from '../panels/MarketWindow';
import {WorldRankingsWindow} from '../panels/WorldRankingsWindow';
import {useWorldView} from '../../store/useWorldView';
import {money} from '../formatMoney';
import {GuideBriefing} from '../panels/GuideBriefing';
import {CampaignVictoryProgress} from './CampaignVictoryProgress';
import {DomesticWindow} from '../panels/DomesticWindow';
import {DiplomaticPost} from '../panels/DiplomaticPost';
import {living} from '../../engine/systems/livingEconomy';
import {CivicArt} from '../icons/CivicArt';
import {CommandArt} from '../icons/CommandArt';
import {LocaleText,translateLive} from '../../i18n/localeText';
import {ResearchWindow} from '../panels/ResearchWindow';
import {InvestmentWindow} from '../panels/InvestmentWindow';
import {GovernanceWindow} from '../panels/GovernanceWindow';
// Keep Help available even when later lazy panel downloads fail.
import {HelpPanel} from '../panels/HelpPanel';
import {NavigationArt} from '../icons/NavigationArt';
import {CommandAlerts,CommandNews} from '../panels/CommandIntelligence';
import {ExecutiveDesk} from '../panels/ExecutiveDesk';
import {deskOffers} from '../panels/executiveDeskModel';
import {commandAlerts,newsEntries,strategicObjectives} from '../../store/commandIntelligence';
import {Suspense,useEffect, useMemo, useState, type ReactNode } from 'react';
import { MARKET_RESOURCES, getMarketBoard, resourceReserveDays, resourceStrategicStatus } from '../../store/marketSelectors';
import { useGameStore } from '../../store/gameStore';
import { BlocIcon, CouncilIcon, IntelligenceIcon, ResourceIcon, TreasuryIcon, WorldIcon } from '../icons/GameIcons';
import { DraggableWindow } from '../windows/DraggableWindow';
import { MapModeBar } from './MapModeBar';
import {ResourceCommandWindow} from '../panels/ResourceCommandWindow';
import {AssetThumbnail} from '../icons/AssetThumbnail';
import {InternationalAffairsWorkspace} from '../panels/InternationalAffairsWorkspace';
import { DIPLOMACY_RULES_HINT, INTERNATIONAL_AFFAIRS_HINT, NATIONAL_ALERTS_HINT, NEWS_ARCHIVE_HINT, OBJECTIVES_GUIDANCE_HINT } from '../hints/registry';

type ToolId='objectives'|'market'|'pulse'|'map'|'resources'|'sitrep'|'alerts'|'diplomacy'|'desk'|'alliances';

function RailButton({active,badge,label,children,onClick,guide,emblem}:{active:boolean;badge?:number|string;label:string;children?:ReactNode;onClick:()=>void;guide?:string;emblem?:string}){
 const iconSrc = `/assets/command/modern-${emblem}.png`;
 return <button data-guide={'rail-'+(guide??(label==='DIPLOMACY'?'diplo':label.toLowerCase()))} className={active?'rail-button active':'rail-button'} onClick={onClick} aria-pressed={active} title={translateLive(`${label} · ${active?'Open — click to close':'Closed — click to open'}`)}>{emblem?<><span className="rail-emblem-wrap"><img className="rail-emblem-art" src={iconSrc} alt="" aria-hidden="true"/></span><small className="rail-emblem-text"><LocaleText value={label}/></small></>:(<><span><LocaleText value={children}/></span><small><LocaleText value={label}/></small></>)}{badge!==undefined&&badge!==0&&<b><LocaleText value={badge}/></b>}</button>;
}

export function CommandRails(){
 const state=useWorldView(),navigation=useGameStore(s=>s.navigation);
 const open=new Set(state.activeTool?[state.activeTool]:[]);
 const mounted=new Set([...state.workspaceTrail.map(f=>f.activeTool).filter(Boolean),...open]);
 const player=state.countries[state.playerCountryId];

 const activeWars=Object.values(state.wars).filter(w=>w.status==='active');
 const activeTrades=Object.values(state.tradeDeals).filter(d=>d.active);
 const offers=state.diplomaticOffers.filter(o=>o.expiresDay>=state.day);
 const objectives=useMemo(()=>strategicObjectives(state),[state.tradeDeals,state.intelOperations,state.blocs,state.wars,state.day,player.id,player.technology.unlocked.length]);
 const critical=MARKET_RESOURCES.map(resource=>({resource,status:resourceStrategicStatus(player,resource,leaderModifiers(state,player.id).consumer),days:resourceReserveDays(player,resource,leaderModifiers(state,player.id).consumer)})).filter(x=>x.status==='CRITICAL'||x.status==='IMPORT NEED');
 const toggle=(id:ToolId)=>state.openTool(state.activeTool===id?null:id,false);
 const close=(_id:ToolId)=>state.closeWorkspace();
 const done=objectives.filter(x=>x.done).length;

 return <Suspense fallback={<div className="loading-popup"><LocaleText value="Loading command…"/></div>}>
  <nav className="command-rail command-rail-left" aria-label={translateLive("World command tools")}>
   <RailButton active={['market','exchange','credit'].some(id=>open.has(id))} badge={activeTrades.length} label="MARKET" emblem="market" onClick={()=>toggle('market')}><NavigationArt kind="market"/></RailButton>
   <RailButton active={open.has('alliances')} label="ALLIANCES" emblem="alliances" onClick={()=>toggle('alliances')}><CivicArt kind="bloc" size={36}/></RailButton>
   <RailButton active={open.has('pulse')} badge={activeWars.length} label="WORLD" emblem="world" onClick={()=>toggle('pulse')}><NavigationArt kind="world"/></RailButton>
   <RailButton active={open.has('resources')} badge={critical.length} label="RESOURCES" guide="supply" emblem="resources" onClick={()=>toggle('resources')}><AssetThumbnail asset="logistics" size={36}/></RailButton>
  </nav>
  <nav className={`command-rail command-rail-right ${state.selectedCountryId?'country-open':'country-closed'}`} aria-label={translateLive("Information tools")}>
   <RailButton active={open.has('desk')} badge={deskOffers(state).length} label="DESK" emblem="desk" onClick={()=>toggle('desk')}><CivicArt kind="letter" size={36}/></RailButton>
   <RailButton active={open.has('objectives')} badge={`${done}/6`} label="GOALS" emblem="goals" onClick={()=>toggle('objectives')}><NavigationArt kind="objectives"/></RailButton>
   <RailButton active={open.has('diplomacy')} badge={living(state).letters.filter(m=>!m.read).length+state.leadership.messages.filter(m=>!m.read).length} label="DIPLOMACY" emblem="diplomacy" onClick={()=>toggle('diplomacy')}><NavigationArt kind="diplomacy"/></RailButton>
   <RailButton active={open.has('alerts')} badge={commandAlerts(state).length} label="ALERTS" emblem="alerts" onClick={()=>toggle('alerts')}><NavigationArt kind="alerts"/></RailButton>
   <RailButton active={open.has('sitrep')} badge={newsEntries(state).length} label="NEWS" emblem="news" onClick={()=>toggle('sitrep')}><NavigationArt kind="intel"/></RailButton>
  </nav>

  <nav className="command-rail map-help-cluster" aria-label={translateLive("Map and help tools")}>
   <RailButton active={open.has('map')} label="MAP" emblem="map" onClick={()=>toggle('map')}><NavigationArt kind="map"/></RailButton>
   <RailButton active={open.has('help')} label="HELP" emblem="help" onClick={()=>state.openTool(state.activeTool==='help'?null:'help',false)}><NavigationArt kind="help"/></RailButton>
  </nav>
  <Suspense fallback={<div className="loading-popup"><LocaleText value="Loading command…"/></div>}>
  {mounted.has('research')&&<ResearchWindow/>}
  {mounted.has('investment')&&<InvestmentWindow/>}
  {mounted.has('governance')&&<GovernanceWindow/>}
  </Suspense>
  {mounted.has('society')&&<DomesticWindow/>}
  {(['market','exchange','credit'] as const).some(id=>mounted.has(id))&&<MarketWindow/>}{mounted.has('help')&&![navigation,...state.workspaceTrail.map(f=>f.navigation)].some(n=>n?.intent?.kind==='fuel-help')&&<HelpPanel/>}{(()=>{const intent=[navigation,...[...state.workspaceTrail].reverse().map(f=>f.navigation)].find(n=>n?.intent?.kind==='fuel-help')?.intent;return intent?.kind==='fuel-help'?<FuelHelper targetCountryId={intent.targetCountryId} active={state.activeTool==='help'&&navigation?.intent?.kind==='fuel-help'}/>:null;})()}
  {open.has('map')&&<div className="left-command-dock map-command-dock"><header className="map-dock-header"><strong><LocaleText value="MAP COMMAND"/></strong><button className="map-close" data-guide="close-workspace" onClick={state.closeWorkspace} aria-label={translateLive("Close map command")}><LocaleText value={"×"}/></button></header><div className="map-dock-body"><GuideBriefing/><MapModeBar/></div></div>}
  {mounted.has('resources')&&<ResourceCommandWindow onClose={()=>close('resources')}/>}

  {mounted.has('objectives')&&<DraggableWindow id="objectives-window" kicker="CAMPAIGN / GUIDANCE" title={translateLive("Strategic Objectives")} initialX={88} initialY={170} width={470} onClose={()=>close('objectives')} hint={OBJECTIVES_GUIDANCE_HINT}>
   <div className="floating-progress"><span><b><LocaleText value={done}/></b><LocaleText value={" of "}/><LocaleText value={objectives.length}/><LocaleText value={" complete"}/></span><i><b style={{width:`${done/objectives.length*100}%`}}/></i></div>
   <div className="floating-objectives">{objectives.map((o,i)=><div className={o.done?'done':''} key={o.label}><b><LocaleText value={o.done?'✓':String(i+1).padStart(2,'0')}/></b><span><strong><LocaleText value={o.label}/></strong><small><LocaleText value={o.done?'Completed':'Active objective'}/></small></span></div>)}</div>
   <CampaignVictoryProgress/>
  </DraggableWindow>}

  {mounted.has('alliances')&&<ExecutiveWorkspaceShell id="alliances-window" hideHeader title={translateLive("Alliances")} onClose={()=>close('alliances')} hint={INTERNATIONAL_AFFAIRS_HINT}><InternationalAffairsWorkspace/></ExecutiveWorkspaceShell>}
  {mounted.has('pulse')&&<WorldRankingsWindow/>}
  {mounted.has('desk')&&<ExecutiveDesk onClose={()=>close('desk')}/>}

  {mounted.has('diplomacy')&&<ExecutiveWorkspaceShell id="diplomacy-window" hideHeader kicker="FOREIGN MINISTRY" title={translateLive("Diplomatic Inbox")} onClose={()=>close('diplomacy')} hint={DIPLOMACY_RULES_HINT}>
   <DiplomaticPost/>
   <div className="diplomatic-offer-list">{offers.length?offers.map(offer=>{const sender=state.countries[offer.senderId];return <article key={offer.id}><header><b><LocaleText value={sender?.iso2??'--'}/></b><span><small><LocaleText value={offer.type==='embassy'?'EMBASSY EXCHANGE':'TRADE FRAMEWORK'}/></small><strong><LocaleText value={sender?.name??offer.senderId}/></strong></span><em><LocaleText value={"D"}/><LocaleText value={offer.expiresDay-state.day}/></em></header><p><LocaleText value={offer.message}/></p><div><button className="primary accept-action" onClick={()=>state.resolveDiplomaticOffer(offer.id,true)}><span aria-hidden="true">✓</span> <LocaleText value={"ACCEPT"}/></button><button className="decline-action" onClick={()=>state.resolveDiplomaticOffer(offer.id,false)}><span aria-hidden="true">×</span> <LocaleText value={"DECLINE"}/></button></div></article>}):null}</div>
  </ExecutiveWorkspaceShell>}

  {mounted.has('alerts')&&<DraggableWindow expanded id="alerts-window" kicker="COMMAND CHANNEL" title={translateLive("National Alerts")} initialX={window.innerWidth-640} initialY={175} width={580} onClose={()=>close('alerts')} hint={NATIONAL_ALERTS_HINT}><CommandAlerts/></DraggableWindow>}
  {mounted.has('sitrep')&&<DraggableWindow expanded id="sitrep-window" kicker="COMMAND CHANNEL" title={translateLive("News Archive")} initialX={window.innerWidth-680} initialY={170} width={620} onClose={()=>close('sitrep')} hint={NEWS_ARCHIVE_HINT}><CommandNews/></DraggableWindow>}
 </Suspense>;
}

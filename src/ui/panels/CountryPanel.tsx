import {simulateResources} from '../../engine/systems/resources';
import {leaderModifiers} from '../../engine/systems/leaderPerks';
import {displayCountry} from '../../presentation/countryIdentity';
import {WorkspaceActivityContext} from '../windows/workspaceActivity';
import type {WorkspaceNavigation} from '../../store/workspaceNavigation';
import {useScrollMemory} from '../windows/useScrollMemory';
import {useWindowLifecycle,WINDOW_LAYERS} from '../windows/useWindowLifecycle';
import {CountrySectionFrame} from './CountrySectionFrame';
import {PowerChartIcon} from '../icons/PowerChartIcon';
import {useShallow} from 'zustand/react/shallow';
import {EconomicTrends} from './EconomicTrends';
import {SectionMenu} from '../windows/SectionMenu';
import {ResearchWindow} from './ResearchWindow';
import {InvestmentWindow} from './InvestmentWindow';
import {activeCountries} from '../../domain/sovereignty';
import {money} from '../formatMoney';
import {GuideBriefing} from './GuideBriefing';
import {PopulationPanel,RecruitmentPanel} from './PopulationPanel';
import {PolicyCardGrid} from './PolicyCardGrid';
import {CommandArt} from '../icons/CommandArt';
import {LocaleText,translateLive} from '../../i18n/localeText';
import {WorldInstitutionsPanel} from './WorldInstitutionsPanel';
import {TechnologyPanel} from './TechnologyPanel';
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CountryDossierWindow } from './CountryDossierWindow';
import { ReviewDialog } from './ReviewDialog';
import { NuclearCommandWindow, NuclearIcon } from './NuclearCommandWindow';
import { ParliamentIcon, ParliamentWindow } from './ParliamentWindow';
import {ResourceCommandWindow} from './ResourceCommandWindow';
import { SupplyCommandWindow } from './SupplyCommandWindow';
import { DiplomacyPanel } from './DiplomacyPanel';
import { ProductionPanel, MilitaryHardwareView } from './ProductionPanel';
import type { CountryState, MinistryKey, TradeResource } from '../../domain/game';
import { useGameStore } from '../../store/gameStore';
import { calculateDailyResourceFlow, calculateEconomicHealth, calculateEconomyForecast, calculateIndustrialOutput, calculateMilitaryPower, calculateResourcePressure } from '../../store/selectors';
import { findBestSuppliers, MARKET_RESOURCES, resourceReserveDays, resourceSelfSufficiency, resourceStrategicStatus } from '../../store/marketSelectors';
import { ArtilleryIcon, BlocIcon, CabinetIcon, CouncilIcon, DiplomacyIcon, EconomyIcon, FuelIcon, IndustryIcon, IntelligenceIcon, InteriorIcon, JetIcon, OverviewIcon, PersonnelIcon, PowerIcon, SacredScriptureIcon, ResearchIcon, ResourceIcon, ShipIcon, SocietyIcon, SteelIcon, TankIcon, WarIcon, WorldIcon } from '../icons/GameIcons';
import { getTradeQuote } from '../../engine/systems/trade';
import { MINISTRY_DEFINITIONS } from '../../data/ministries';
import { TECHNOLOGY_TREE } from '../../data/technologyTree';
import { canUnlockTechnology } from '../../engine/systems/technology';
import { blocForCountry } from '../../engine/systems/blocs';
import { strategicGoalLabel } from '../../engine/systems/strategicGoals';
import { tr } from '../../i18n/gameI18n';
import { flagEmoji } from '../../data/countryThemes';
import { strategicDecisionSpec } from '../../engine/systems/strategicDecision';
import { StrategicDecisionModal } from './StrategicDecisionModal';
import { CountryTradeDesk } from './TradeDesk';
import { CivicArt } from '../icons/CivicArt';
import type { StrategicDecisionSpec } from '../../domain/interaction';
import { TacticalHint } from '../hints/TacticalHint';
import {
  DIPLOMACY_RULES_HINT,
  PRODUCTION_DOCTRINE_HINT,
  ECONOMY_OVERVIEW_HINT,
  POLICIES_LAWS_HINT,
  MILITARY_COMMAND_HINT,
  TECHNOLOGY_RESEARCH_HINT,
  INTERNATIONAL_AFFAIRS_HINT,
  WAR_TACTICAL_HINT,
} from '../hints/registry';

const signed=(value:number,digits=2)=>`${value>=0?'+':''}${value.toFixed(digits)}`;
const resources:TradeResource[]=['food','oil','iron','uranium'];
const humanize=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,(m)=>m.toUpperCase());
type PanelTab='overview'|'policies'|'economy'|'trade'|'production'|'diplomacy'|'military'|'intel'|'cabinet'|'technology'|'world'|'war';

function ResourceCard({ country, resource, onOpen, consumer=1 }: { country: CountryState; resource: TradeResource; onOpen?:()=>void;consumer?:number }) {
  const flow=simulateResources(country,1,undefined,consumer); const status=resourceStrategicStatus(country,resource,consumer); const suff=resourceSelfSufficiency(country,resource,consumer); const days=resourceReserveDays(country,resource,consumer);
  return <div className={`resource-card status-${status.toLowerCase().replace(' ','-')}`}><div className="resource-card-head"><button className="resource-name" disabled={!onOpen} onClick={onOpen}><ResourceIcon resource={resource} size={22}/><LocaleText value={resource.toUpperCase()}/></button><em><LocaleText value={status}/></em></div><strong><LocaleText value={country.resources[resource].toFixed(resource==='uranium'?1:0)}/></strong><div className="resource-card-flow"><span><LocaleText value="NET "/><LocaleText value={signed(flow.net[resource])}/><LocaleText value="/d"/></span><span><LocaleText value="SELF "/><LocaleText value={Math.min(999,suff*100).toFixed(0)}/>%</span></div>{onOpen&&<button className="resource-buy" onClick={onOpen}><LocaleText value="Buy / supply options"/></button>}<small><LocaleText value={days>365?'365+':Math.max(0,days).toFixed(0)}/><LocaleText value=" reserve days"/></small></div>;
}
function UnitStat({ icon, label, value }: { icon: ReactNode; label:string; value:number }) { return <div className="unit-stat"><span className="unit-icon"><LocaleText value={icon}/></span><span><small><LocaleText value={label}/></small><strong><LocaleText value={value.toLocaleString()}/></strong></span></div>; }
function MinistryIcon({id}:{id:MinistryKey}){ if(id==='economy')return <IndustryIcon/>; if(id==='defense')return <TankIcon/>; if(id==='science')return <ResearchIcon/>; if(id==='intelligence')return <IntelligenceIcon/>; if(id==='interior')return <InteriorIcon/>; return <SocietyIcon/>; }
function PanelTabIcon({id}:{id:PanelTab}){return id==='trade'?<CivicArt kind="trade" size={26}/>:<CommandArt kind={id==='policies'?'governance':id} size={26}/>;}

/** `onBrowse`: the country list inside the full panel keeps the full panel for the newly chosen country (Phase 6.1). */
export function CountryPanel({onBrowse,suspended=false,countryId,navigationFrame}:{onBrowse?:(countryId:string)=>void;suspended?:boolean;countryId?:string;navigationFrame?:WorkspaceNavigation|null}={}){
  const [supplyResource,setSupplyResource]=useState<TradeResource|null>(null);
  const [tab,setTab]=useState<PanelTab>('overview');
  const [expanded,setExpanded]=useState(false);
  const wideSection=['technology','world','war','production','policies','military','economy'].includes(tab);
  const chooseTab=(id:PanelTab)=>{if(id==='war'&&selected.id!==state.playerCountryId){state.routeWorkspace({kind:'operational-assessment',targetCountryId:selected.id});return;}setTab(id);setExpanded(['technology','world','war','production','policies','military','economy'].includes(id));};
  const [militarySection,setMilitarySection]=useState('overview');
  const [commandWindow,setCommandWindow]=useState<'dossier'|'supply'|'nuclear'|'parliament'|null>(null);
  const [pendingDecision,setPendingDecision]=useState<{spec:StrategicDecisionSpec;execute:()=>void}|null>(null);
  const state=useGameStore(useShallow(s=>{const {actionReceipt,saveMessage,mapControlCommand,mapZoomSensitivity,mapLabelScale,...view}=s;return view;}));
  const navigation=navigationFrame===undefined?state.navigation:navigationFrame;
  const seenNavigation=useRef(new WeakSet<object>());
  useEffect(()=>{if(suspended||!state.selectedCountryId||!navigation||seenNavigation.current.has(navigation))return;seenNavigation.current.add(navigation);if(['overview','economy','policies','trade','production','diplomacy','military','intel','cabinet','technology','world','war'].includes(navigation.panel))chooseTab(navigation.panel as PanelTab);},[navigation,suspended,state.selectedCountryId]);
  const language=state.playerProfile.language;
  const selected=displayCountry(state.countries[countryId ?? state.selectedCountryId ?? [...state.workspaceTrail].reverse().find(f=>f.selectedCountryId)?.selectedCountryId ?? state.playerCountryId]);
  const player=state.countries[state.playerCountryId];
  const isPlayer=selected.id===state.playerCountryId;
  const perks=leaderModifiers(state,selected.id);
  const resourceFlow=calculateDailyResourceFlow(selected,perks); const economy=calculateEconomyForecast(selected,perks); const relation=player.diplomacy.relations[selected.id];
  const countryList=useMemo(()=>activeCountries(state.countries).map(displayCountry).sort((a,b)=>a.name.localeCompare(b.name)),[state.countries]);
  const activeWar=useMemo(()=>Object.values(state.wars).find((war)=>war.status==='active'&&(war.attackerId===selected.id||war.defenderId===selected.id)&&(war.attackerId===player.id||war.defenderId===player.id)),[player.id,selected.id,state.wars]);
  // The player may be the defender of an AI war: "our" and "enemy" figures follow the player's side.
  const front=activeWar?(()=>{const defending=activeWar.defenderId===player.id;return {defending,ourSupply:defending?activeWar.defenderSupply:activeWar.attackerSupply,enemySupply:defending?activeWar.attackerSupply:activeWar.defenderSupply,ourExhaustion:defending?activeWar.defenderExhaustion:activeWar.attackerExhaustion,enemyExhaustion:defending?activeWar.attackerExhaustion:activeWar.defenderExhaustion,ourLosses:defending?activeWar.defenderLosses:activeWar.attackerLosses,enemyLosses:defending?activeWar.attackerLosses:activeWar.defenderLosses};})():null;
  const [confirmConcede,setConfirmConcede]=useState(false);
  const tradeDeals=Object.values(state.tradeDeals).filter((deal)=>deal.active&&(deal.sellerId===selected.id||deal.buyerId===selected.id));
  const playerBloc=blocForCountry(state,player.id); const selectedBloc=blocForCountry(state,selected.id); const influence=state.council.influenceByCountry[player.id]??0;
  const intelKnowledge=isPlayer?100:(state.intelligenceLedger[selected.id]??12); const culturalInfluence=isPlayer?100:(state.culturalInfluence[selected.id]??0);
  const intelOps=Object.values(state.intelOperations).filter((op)=>op.sourceCountryId===player.id&&(isPlayer||op.targetCountryId===selected.id)).sort((a,b)=>b.startedDay-a.startedDay).slice(0,6);

  useEffect(()=>setSupplyResource(null),[selected.id]);
  const panelRef=useRef<HTMLElement>(null);
  useWindowLifecycle(panelRef,{onClose:state.closeWorkspace,layer:WINDOW_LAYERS.workspace,modal:false,backdrop:false,enabled:!suspended&&!!state.selectedCountryId&&!commandWindow&&!supplyResource&&!expanded});
  useScrollMemory(panelRef,!suspended&&!!state.selectedCountryId);
  return <WorkspaceActivityContext.Provider value={!suspended}><aside ref={panelRef} className="command-panel" style={suspended||commandWindow||supplyResource||expanded||!state.selectedCountryId?{visibility:'hidden',opacity:0}:undefined}>
    <div className="national-panel-heading"><button data-guide="close-workspace" onClick={()=>state.selectCountry(null)} aria-label={translateLive("Close country panel")}><LocaleText value={"×"}/></button></div>
    <div className="command-panel-scroll">
    <select className="country-select" value={selected.id} onChange={(e)=>{onBrowse?.(e.target.value);state.selectCountry(e.target.value);}} aria-label={translateLive("Select country")}>{countryList.map((country)=><option key={country.id} value={country.id}><LocaleText value={country.name}/><LocaleText value={" ("}/><LocaleText value={country.iso2}/><LocaleText value={")"}/></option>)}</select>
    <div className="panel-title-row"><div className="country-title-identity"><span className="country-panel-flag"><LocaleText value={flagEmoji(selected.iso2)}/></span><div><h1><LocaleText value={selected.name}/></h1><p className="muted"><LocaleText value={isPlayer?'Player nation':'Observed nation'}/><LocaleText value={" · "}/><LocaleText value={humanize(selected.politics.regime)}/><LocaleText value={" · "}/><LocaleText value={selected.region || 'Global'}/></p></div></div>{selected.controllerCountryId&&<span className="occupation-badge"><LocaleText value={"CONTROLLED"}/></span>}</div>
    <div className="identity-strip"><span className="identity-with-icon"><SacredScriptureIcon className="identity-scripture" size={32}/><i><small><LocaleText value={"RELIGION"}/></small><strong><LocaleText value={humanize(selected.society.dominantReligion)}/></strong></i></span><span className="identity-with-icon"><CivicArt kind="bloc" size={32}/><i><small><LocaleText value={"IDEOLOGY"}/></small><strong><LocaleText value={humanize(selected.society.ideology)}/></strong></i></span><span className="identity-with-icon"><CommandArt kind="military" size={32}/><i><small><LocaleText value="Military rank"/></small><strong><LocaleText value={selected.military.assessment.gfpRank ? `GFP #${selected.military.assessment.gfpRank}` : 'ESTIMATE'}/></strong></i></span></div>
    <div className="panel-tabs country-navigation-group" data-menu-group="summary">
      <button data-guide="tab-overview" data-tab="overview" aria-pressed={tab==='overview'} onClick={()=>chooseTab('overview')}><PanelTabIcon id="overview"/><span><LocaleText value="Overview"/></span></button>
      <button data-guide="tab-power" onClick={()=>setCommandWindow('dossier')}><PowerChartIcon/><span><LocaleText value="National power"/></span></button>
      <button data-guide="tab-supply-command" onClick={()=>setCommandWindow('supply')}><CommandArt kind="production"/><span><LocaleText value="Supply command"/></span></button>
      {isPlayer&&<button data-guide="tab-nuclear" onClick={()=>setCommandWindow('nuclear')}><NuclearIcon size={22}/><span><LocaleText value="Nuclear command"/></span></button>}
      {isPlayer&&<button data-guide="tab-parliament" onClick={()=>setCommandWindow('parliament')}><ParliamentIcon size={22}/><span><LocaleText value="Parliament"/></span></button>}
    </div>
    <GuideBriefing/>
    <div className="panel-tabs country-navigation-group" data-menu-group="management">
      <button data-guide="tab-affairs" onClick={()=>state.navigate('governance',selected.id)}><CommandArt kind="governance"/><span><LocaleText value="Affairs"/></span></button>
      {(['economy','policies','trade','production','diplomacy','military','intel','cabinet'] as PanelTab[]).map(id=><button data-guide={'tab-'+id} key={id} data-tab={id} aria-pressed={tab===id} onClick={()=>chooseTab(id)}><PanelTabIcon id={id}/><span><LocaleText value={{economy:'Economy',policies:'Policies',trade:'Trade',production:'Production',diplomacy:'Diplomacy',military:'Military',intel:'Intelligence',cabinet:'Cabinet'}[id as 'economy']}/></span></button>)}
    </div>
    <div className="panel-tabs country-navigation-group" data-menu-group="strategy">
      {(['technology','world','war'] as PanelTab[]).map(id=><button data-guide={'tab-'+id} key={id} data-tab={id} aria-pressed={tab===id} onClick={()=>chooseTab(id)}><PanelTabIcon id={id}/><span><LocaleText value={id==='technology'?'Technology':id==='world'?'International Affairs':activeWar?'War command':isPlayer?'War readiness':'War planning'}/></span></button>)}
    </div>
    <CountrySectionFrame scrollKey={tab} hint={tab==='production'?PRODUCTION_DOCTRINE_HINT:tab==='diplomacy'?DIPLOMACY_RULES_HINT:tab==='economy'?ECONOMY_OVERVIEW_HINT:tab==='policies'?POLICIES_LAWS_HINT:tab==='military'?MILITARY_COMMAND_HINT:tab==='technology'?TECHNOLOGY_RESEARCH_HINT:tab==='world'?INTERNATIONAL_AFFAIRS_HINT:tab==='war'?WAR_TACTICAL_HINT:undefined} centered={['policies','military','economy','world'].includes(tab)} expanded={expanded} wideSection={wideSection} title={tab==='policies'?'Policies':tab==='military'?'Military':tab==='economy'?'Economy':tab==='technology'?'Technology':tab==='world'?'International Affairs':tab==='production'?'Production':activeWar?'War command':isPlayer?'War readiness':'War planning'} onClose={()=>navigation?.intent?.kind==='factory'?state.closeWorkspace():(setExpanded(false),setTab('overview'))}>

    {tab==='overview'&&<>
      <div className="stat-grid"><div><span><LocaleText value={"GDP"}/></span><strong><LocaleText value={"$"}/><LocaleText value={selected.economy.gdp.toFixed(1)}/><LocaleText value={"B"}/></strong></div><div><span><LocaleText value={"Economic health"}/></span><strong><LocaleText value={calculateEconomicHealth(selected)}/><LocaleText value={"%"}/></strong></div><div><span><LocaleText value={"Population"}/></span><strong><LocaleText value={(selected.demographics.population/1_000_000).toFixed(1)}/><LocaleText value={"M"}/></strong></div><div><span><LocaleText value={"Military capability"}/></span><strong><LocaleText value={selected.military.assessment.capability.toFixed(1)}/><LocaleText value={"/100"}/></strong></div><div><span><LocaleText value={"Industry output"}/></span><strong><LocaleText value={calculateIndustrialOutput(selected)}/></strong></div><div><span><LocaleText value={"Resource pressure"}/></span><strong><LocaleText value={calculateResourcePressure(selected)}/><LocaleText value={"%"}/></strong></div></div>
      <div className="processed-strip"><span><FuelIcon/><small><LocaleText value={"FUEL"}/></small><strong><LocaleText value={selected.processedResources.fuel.toFixed(1)}/></strong></span><span><SteelIcon/><small><LocaleText value={"STEEL"}/></small><strong><LocaleText value={selected.processedResources.steel.toFixed(1)}/></strong></span><span><PowerIcon/><small><LocaleText value={"POWER"}/></small><strong><LocaleText value={selected.processedResources.electricity.toFixed(1)}/></strong></span><span><ResearchIcon/><small><LocaleText value={"R&D"}/></small><strong><LocaleText value={selected.technology.researchPoints.toFixed(1)}/></strong></span></div>
      <div className="flow-grid"><div><span><LocaleText value={"Budget / day"}/></span><strong className={economy.dailyBalance>=0?'positive':'negative'}><LocaleText value={signed(economy.dailyBalance,3)}/><LocaleText value={"B"}/></strong></div><div><span><LocaleText value={"GDP trend"}/></span><strong className={economy.dailyGrowthRate>=0?'positive':'negative'}><LocaleText value={signed(economy.dailyGrowthRate*100,4)}/><LocaleText value={"%"}/></strong></div><div><span><LocaleText value={"Food / day"}/></span><strong className={resourceFlow.net.food>=0?'positive':'negative'}><LocaleText value={signed(resourceFlow.net.food)}/></strong></div><div><span><LocaleText value={"Oil / day"}/></span><strong className={resourceFlow.net.oil>=0?'positive':'negative'}><LocaleText value={signed(resourceFlow.net.oil)}/></strong></div><div><span><LocaleText value={"Iron / day"}/></span><strong className={resourceFlow.net.iron>=0?'positive':'negative'}><LocaleText value={signed(resourceFlow.net.iron)}/></strong></div><div><span><LocaleText value={"Inflation"}/></span><strong><LocaleText value={selected.economy.inflation.toFixed(2)}/><LocaleText value={"%"}/></strong></div><div><span><LocaleText value={"Stability"}/></span><strong><LocaleText value={selected.politics.stability.toFixed(1)}/><LocaleText value={"%"}/></strong></div><div><span><LocaleText value={"Cohesion"}/></span><strong><LocaleText value={selected.society.cohesion.toFixed(1)}/><LocaleText value={"%"}/></strong></div></div>
    </>}

    {tab==='economy'&&<div className="economy-panel">{isPlayer&&<Suspense fallback={<p><LocaleText value="Loading economic history…"/></p>}><EconomicTrends/></Suspense>}<PopulationPanel country={selected} showPolicy={false}/>{isPlayer?null:<><div className="subhead"><LocaleText value={"Bilateral export desk"}/><button className="trade-open-market" onClick={()=>setTab('trade')}><LocaleText value="Full trade desk"/></button></div><div className="export-desk">{resources.map((resource)=>{const quote=getTradeQuote(state,selected.id,resource);const canTrade=relation?.treaties.includes('trade')&&!relation?.sanctions&&relation?.status!=='war';return <div key={resource}><ResourceIcon resource={resource} size={17}/><span><b><LocaleText value={resource.toUpperCase()}/></b><small><LocaleText value={quote.available.toFixed(2)}/><LocaleText value={"/day available · "}/><LocaleText value={money(quote.price)}/></small></span><button disabled={!canTrade||quote.available<=0} onClick={()=>state.createImport(selected.id,resource)}><LocaleText value={canTrade?'IMPORT':'PACT REQ.'}/></button></div>})}</div></>}</div>}

    {tab==='policies'&&<div className="country-policies">
      <header className="policy-heading"><CommandArt kind="governance" size={40}/><div><h3><LocaleText value="Policies"/></h3><p><LocaleText value="Review taxes and state spending before you change them."/></p></div></header>
      <PolicyCardGrid country={selected}/>
      {isPlayer&&<button className="policy-relief-banner" onClick={()=>state.openTool('society')}><CivicArt kind="festival" size={44}/><span><strong><LocaleText value="Public Events & Relief"/></strong><small><LocaleText value="National Approval"/>: {selected.politics.approval.toFixed(0)}% · <LocaleText value="Stability"/>: {selected.politics.stability.toFixed(0)}%</small></span><b aria-hidden="true">→</b></button>}
      <PopulationPanel country={selected} policyOnly/>
      <section className="policy-budget"><h3><LocaleText value="State spending"/></h3><div className="stat-grid"><div><span><LocaleText value="Treasury"/></span><strong>{money(selected.economy.treasury)}</strong></div><div><span><LocaleText value="Budget / day"/></span><strong className={economy.dailyBalance>=0?'positive':'negative'}>{economy.dailyBalance>=0?'+':''}{money(economy.dailyBalance,language)}</strong></div></div>
      {isPlayer&&<button className="policy-budget-link" onClick={()=>chooseTab('cabinet')}><CabinetIcon size={24}/><LocaleText value="Manage ministry budgets"/></button>}</section>
    </div>}
    {tab==='trade'&&<CountryTradeDesk country={selected}/>}
    {tab==='production'&&<ProductionPanel country={selected}/>}

    {tab==='diplomacy'&&<DiplomacyPanel selectedId={selected.id}/>}

    {tab==='technology'&&<ResearchWindow embedded readOnly={!isPlayer}/>}
    {tab==='military'&&<div className="military-panel">
      <SectionMenu items={[
        {id:'overview',label:'Military overview',icon:<CommandArt kind="military"/>},
        ...(isPlayer?[
          {id:'recruit',label:'Recruit',icon:<CommandArt kind="investment"/>},
          {id:'produce',label:'Produce',icon:<CommandArt kind="production"/>},
        ]:[])
      ]} selected={militarySection} onSelect={setMilitarySection} contentId="military-section-content" label="Military sections"/>
      <div id="military-section-content">
        {militarySection==='overview'&&(
          <>
            <div className="military-score">
              <div><span><LocaleText value={"CONVENTIONAL CAPABILITY"}/></span><strong><LocaleText value={selected.military.assessment.capability.toFixed(1)}/></strong></div>
              <div><span><LocaleText value={"2026 GFP"}/></span><strong><LocaleText value={selected.military.assessment.gfpRank?`#${selected.military.assessment.gfpRank}`:'N/A'}/></strong></div>
            </div>
            <div className="unit-grid">
              <UnitStat icon={<PersonnelIcon/>} label="Personnel" value={selected.military.personnel}/>
              <UnitStat icon={<TankIcon/>} label="Tanks" value={selected.military.tanks}/>
              <UnitStat icon={<ArtilleryIcon/>} label="Artillery" value={selected.military.artillery}/>
              <UnitStat icon={<JetIcon/>} label="Fighters" value={selected.military.fighters}/>
              <UnitStat icon={<JetIcon/>} label="Bombers" value={selected.military.bombers}/>
              <UnitStat icon={<ShipIcon/>} label="Warships" value={selected.military.warships}/>
            </div>
            <div className="quality-bars">
              {[['Readiness',selected.military.readiness],['Logistics',selected.military.logistics],['Technology',selected.military.technology],['Morale',selected.military.morale]].map(([label,value])=><div key={String(label)}><span><LocaleText value={label}/></span><i><b style={{width:`${value}%`}}/></i><strong><LocaleText value={Number(value).toFixed(0)}/><LocaleText value={"%"}/></strong></div>)}
            </div>
            <p className="data-note"><LocaleText value={"Military capability uses 2026 GFP rank/index where available; inventories are gameplay estimates unless authored."}/></p>
          </>
        )}
        {isPlayer&&militarySection==='recruit'&&(
          <div className="military-recruit-hub">
            <div className="recruit-sub-section">
              <RecruitmentPanel/>
            </div>
            <div className="recruit-sub-section pilot-academy-section">
              <div className="subhead"><LocaleText value={"Air Force Pilot Academy"}/></div>
              <InvestmentWindow embedded section="pilots"/>
            </div>
          </div>
        )}
        {isPlayer&&militarySection==='produce'&&(
          <MilitaryHardwareView country={selected} onOpenNuclear={()=>setCommandWindow('nuclear')}/>
        )}
      </div>
    </div>}

    {tab==='intel'&&<div className="intel-panel">
      <div className="intel-hero"><IntelligenceIcon size={30}/><span><small><LocaleText value={"STRATEGIC INTELLIGENCE"}/></small><strong><LocaleText value={isPlayer?'National intelligence command':`${selected.name} intelligence picture`}/></strong><em><LocaleText value={isPlayer?`Network ${player.intelligence.networkStrength.toFixed(0)} · Counter-intel ${player.intelligence.counterIntelligence.toFixed(0)}`:`Knowledge ${intelKnowledge.toFixed(0)}% · Influence ${culturalInfluence.toFixed(1)}%`}/></em></span></div>
      {!isPlayer&&<><div className="intel-bars"><div><span><LocaleText value={"INTEL KNOWLEDGE"}/></span><i><b style={{width:`${intelKnowledge}%`}}/></i><strong><LocaleText value={intelKnowledge.toFixed(0)}/><LocaleText value={"%"}/></strong></div><div><span><LocaleText value={"CULTURAL INFLUENCE"}/></span><i><b style={{width:`${culturalInfluence}%`}}/></i><strong><LocaleText value={culturalInfluence.toFixed(0)}/><LocaleText value={"%"}/></strong></div><div><span><LocaleText value={"IDEOLOGY PRESSURE"}/></span><i><b style={{width:`${selected.society.influencePressure.ideology}%`}}/></i><strong><LocaleText value={selected.society.influencePressure.ideology.toFixed(0)}/><LocaleText value={"%"}/></strong></div></div><div className="subhead"><LocaleText value={"Covert operations"}/></div><div className="intel-actions"><button className="op-poster" data-op="gather_intelligence" onClick={()=>state.launchIntelOperation('gather_intelligence',selected.id)}><span className="op-poster-art" aria-hidden="true"><CommandArt kind="intel" size={56}/></span><LocaleText value={"Gather Intelligence "}/><small><LocaleText value={"5 days · $3B"}/></small></button><button className="op-poster" data-op="influence_campaign" onClick={()=>state.launchIntelOperation('influence_campaign',selected.id)}><span className="op-poster-art" aria-hidden="true"><CommandArt kind="diplomacy" size={56}/></span><LocaleText value={"Influence Campaign "}/><small><LocaleText value={"9 days · $5B"}/></small></button><button className="op-poster" data-op="sabotage_industry" onClick={()=>state.launchIntelOperation('sabotage_industry',selected.id)}><span className="op-poster-art" aria-hidden="true"><CommandArt kind="production" size={56}/></span><LocaleText value={"Sabotage Industry "}/><small><LocaleText value={"12 days · $8B"}/></small></button><button className="op-poster" data-op="counter_network" onClick={()=>state.launchIntelOperation('counter_network',selected.id)}><span className="op-poster-art" aria-hidden="true"><CommandArt kind="governance" size={56}/></span><LocaleText value={"Counter Network "}/><small><LocaleText value={"7 days · $4B"}/></small></button></div><div className="ai-doctrine-card"><small><LocaleText value={"ASSESSED STRATEGIC DOCTRINE"}/></small><strong><LocaleText value={strategicGoalLabel(selected.ai.strategicGoal)}/></strong><span><LocaleText value={intelKnowledge>=35?`Goal progress ${selected.ai.goalProgress.toFixed(0)}%${selected.ai.threatFocus?` · focus ${state.countries[selected.ai.threatFocus]?.name??selected.ai.threatFocus}`:''}`:'Increase intelligence knowledge to reveal strategic detail.'}/></span></div></>}
      {isPlayer&&<div className="intel-home-grid"><div><small><LocaleText value={"NETWORK STRENGTH"}/></small><strong><LocaleText value={player.intelligence.networkStrength.toFixed(0)}/></strong></div><div><small><LocaleText value={"COUNTER-INTEL"}/></small><strong><LocaleText value={player.intelligence.counterIntelligence.toFixed(0)}/></strong></div><div><small><LocaleText value={"CONFIDENCE"}/></small><strong><LocaleText value={player.intelligence.intelConfidence.toFixed(0)}/></strong></div><div><small><LocaleText value={"ACTIVE OPS"}/></small><strong><LocaleText value={Object.values(state.intelOperations).filter((op)=>op.status==='active').length}/></strong></div></div>}
      {intelOps.length>0&&<><div className="subhead"><LocaleText value={"Operation log"}/></div><div className="intel-log">{intelOps.map((op)=><div key={op.id} className={`status-${op.status}`}><span><b><LocaleText value={humanize(op.type)}/></b><small><LocaleText value={state.countries[op.targetCountryId]?.name??op.targetCountryId}/><LocaleText value={" · D"}/><LocaleText value={op.startedDay}/><LocaleText value={"→"}/><LocaleText value={op.completeDay}/></small></span><em><LocaleText value={op.status.toUpperCase()}/></em><p><LocaleText value={op.resultSummary}/></p></div>)}</div></>}
    </div>}

    {tab==='cabinet'&&<div className="cabinet-panel">{!isPlayer?<p className="muted"><LocaleText value={"Cabinet allocation is controlled only for the player nation."}/></p>:<><div className="cabinet-hero"><CabinetIcon size={28}/><span><small><LocaleText value={"NATIONAL BUDGET DIRECTIVE"}/></small><strong><LocaleText value={"Allocate state capacity across six ministries"}/></strong></span></div><div className="ministry-list">{MINISTRY_DEFINITIONS.map((ministry)=><label key={ministry.id} className="ministry-row"><span className="ministry-art"><CommandArt kind={{economy:"economy",defense:"military",science:"technology",intelligence:"intel",interior:"governance",society:"approval"}[ministry.id]} size={44}/><i style={{color:ministry.accent}}><MinistryIcon id={ministry.id}/></i></span><span className="ministry-copy"><b><LocaleText value={ministry.shortName}/></b><small><LocaleText value={ministry.description}/></small></span><strong><LocaleText value={player.ministries.allocations[ministry.id].toFixed(0)}/><LocaleText value={"%"}/></strong><input type="range" min="5" max="45" value={player.ministries.allocations[ministry.id]} onChange={(e)=>state.setMinistryAllocation(ministry.id,Number(e.target.value))}/></label>)}</div></>}</div>}

    {tab==='technology'&&<button onClick={()=>state.openTool('research')}><LocaleText value="Open technology tree"/></button>}

    {tab==='world'&&<div className="world-panel"><WorldInstitutionsPanel/></div>}

    {tab==='war'&&<div className="action-section war-command">{isPlayer?<p className="muted"><LocaleText value={"Select another country to prepare a military operation."}/></p>:activeWar?<><button onClick={()=>state.openWarWindow(activeWar.id)}><LocaleText value="OPEN WAR COMMAND"/></button><div className="war-theatre"><span><small><LocaleText value={"THEATRE"}/></small><strong><LocaleText value={humanize(activeWar.terrain)}/></strong></span><span><small><LocaleText value={"AIR SUPERIORITY"}/></small><strong className={activeWar.airSuperiority>=0?'positive':'negative'}><LocaleText value={activeWar.airSuperiority>=0?'+':''}/><LocaleText value={activeWar.airSuperiority.toFixed(0)}/></strong></span></div><div className="war-progress"><div><span><LocaleText value={"FRONT PROGRESS"}/></span><strong><LocaleText value={activeWar.progress.toFixed(1)}/></strong></div><div className="progress-track"><i style={{width:`${(activeWar.progress+100)/2}%`}}/></div><small><LocaleText value={activeWar.lastReport}/></small></div><div className="front-metrics"><div><span><LocaleText value={"OUR SUPPLY"}/></span><b style={{width:`${front!.ourSupply}%`}}/><strong><LocaleText value={front!.ourSupply.toFixed(0)}/><LocaleText value={"%"}/></strong></div><div><span><LocaleText value={"ENEMY SUPPLY"}/></span><b style={{width:`${front!.enemySupply}%`}}/><strong><LocaleText value={front!.enemySupply.toFixed(0)}/><LocaleText value={"%"}/></strong></div><div><span><LocaleText value={"OUR EXHAUSTION"}/></span><b className="danger-bar" style={{width:`${front!.ourExhaustion}%`}}/><strong><LocaleText value={front!.ourExhaustion.toFixed(0)}/><LocaleText value={"%"}/></strong></div><div><span><LocaleText value={"ENEMY EXHAUSTION"}/></span><b className="danger-bar" style={{width:`${front!.enemyExhaustion}%`}}/><strong><LocaleText value={front!.enemyExhaustion.toFixed(0)}/><LocaleText value={"%"}/></strong></div></div><div className="casualty-grid"><div><span><LocaleText value={"Our personnel"}/></span><strong><LocaleText value={front!.ourLosses.personnel.toLocaleString()}/></strong><small><LocaleText value={"Tanks "}/><LocaleText value={front!.ourLosses.tanks}/><LocaleText value={" · Air "}/><LocaleText value={front!.ourLosses.fighters+front!.ourLosses.bombers}/></small></div><div><span><LocaleText value={"Enemy personnel"}/></span><strong><LocaleText value={front!.enemyLosses.personnel.toLocaleString()}/></strong><small><LocaleText value={"Tanks "}/><LocaleText value={front!.enemyLosses.tanks}/><LocaleText value={" · Air "}/><LocaleText value={front!.enemyLosses.fighters+front!.enemyLosses.bombers}/></small></div></div><div className="action-grid"><button className="danger" disabled={activeWar.lastCombatDay===state.day} onClick={()=>state.assault(activeWar.id)}><LocaleText value={activeWar.lastCombatDay===state.day?'ORDERS EXECUTED':'ASSAULT'}/></button><button className={activeWar.autoAssault?'active':''} onClick={()=>state.setAutoAssault(activeWar.id,!activeWar.autoAssault)}><LocaleText value={activeWar.autoAssault?'HALT AUTO':'AUTO ASSAULT'}/></button><button onClick={()=>front!.defending?setConfirmConcede(true):state.withdraw(activeWar.id)}><LocaleText value={"Withdraw"}/></button></div><div className="logistics-strip"><span><LocaleText value={"FUEL "}/><LocaleText value={player.processedResources.fuel.toFixed(1)}/></span><span><LocaleText value={"STEEL "}/><LocaleText value={player.processedResources.steel.toFixed(1)}/></span><span><LocaleText value={"READINESS "}/><LocaleText value={player.military.readiness.toFixed(0)}/><LocaleText value={"%"}/></span></div></>:null}</div>}

    </CountrySectionFrame>
    </div>
    {commandWindow==='dossier'&&<CountryDossierWindow country={selected} onClose={()=>setCommandWindow(null)}/>} 
    {commandWindow==='nuclear'&&<NuclearCommandWindow onClose={()=>setCommandWindow(null)}/>}
    {commandWindow==='parliament'&&<ParliamentWindow onClose={()=>setCommandWindow(null)}/>}
    {commandWindow==='supply'&&<SupplyCommandWindow country={selected} war={activeWar} onClose={()=>setCommandWindow(null)}/>} 
    {confirmConcede&&activeWar&&<ReviewDialog title="Withdraw from the battlefield" summary="Withdrawing as the defender concedes control of the country to the attacker. Losing your home country ends the campaign." onCancel={()=>setConfirmConcede(false)} onConfirm={()=>{state.withdraw(activeWar.id);setConfirmConcede(false);}}/>}
    {pendingDecision&&<StrategicDecisionModal spec={pendingDecision.spec} onCancel={()=>setPendingDecision(null)} onConfirm={()=>{pendingDecision.execute();setPendingDecision(null);}}/>}
  {supplyResource&&<ResourceCommandWindow key={supplyResource} resource={supplyResource} onClose={()=>setSupplyResource(null)}/>}
  </aside></WorkspaceActivityContext.Provider>;
}

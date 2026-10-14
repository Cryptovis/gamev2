import {useState} from 'react';
import {LocaleText,formatText} from '../../i18n/localeText';
import {compactMoney} from '../formatMoney';
import {CommandArt} from '../icons/CommandArt';
import {PolicyCardGrid} from './PolicyCardGrid';
import type {CountryState} from '../../domain/game';
import type {DossierView,WarPlanningView} from './targetBriefing';

const OUTLOOK_LABEL={favourable:'Favourable odds',balanced:'Balanced odds',unfavourable:'Unfavourable odds',unknown:'Unknown'} as const;
const AIR_LABEL={superiority:'Air superiority',contested:'Air contested',inferiority:'Air inferiority',unknown:'Unknown'} as const;

/** 0.91.0 War Planning briefing: power ratio bar, air badge, logistics readiness and one firm confirm button. Presentation only. */
export function WarPlanningBrief({view,country,language,onDeclare}:{view:WarPlanningView;country:CountryState;language:string;onDeclare:()=>void}){
 const ratioLabel=view.outlook==='unknown'?'Unknown':view.outlook==='favourable'?'At least 1.25×':view.outlook==='balanced'?'0.8–1.25×':'Below 0.8×';
 const enemySupply=view.enemySupply?`${view.enemySupply.min}–${view.enemySupply.max}%`:'Unknown';
 const fuelFill=view.fuel.required>0?Math.min(100,view.fuel.have/view.fuel.required*100):100;
 return <div className="war-plan" data-outlook={view.outlook}>
  <div className="war-plan-glass">
   <header><small><LocaleText value="OPERATIONAL ASSESSMENT"/></small><strong><LocaleText value={country.name}/></strong><em><LocaleText value={view.terrain.replaceAll('_',' ')}/><LocaleText value=" theatre"/></em></header>
   <div className="war-ratio" role="img" aria-label={`${formatText(language,'POWER RATIO',[])} ${formatText(language,ratioLabel,[])}`}>
    <div className="war-ratio-head"><span><LocaleText value="POWER RATIO"/></span><b><LocaleText value={ratioLabel}/></b><i className={'war-outlook '+view.outlook}><LocaleText value={OUTLOOK_LABEL[view.outlook]}/></i></div>
    <div className="war-ratio-bar"><span className="ours" style={{width:`${view.ourShare}%`}}/><span className="theirs"/></div>
    <div className="war-ratio-legend"><span><LocaleText value="Us"/></span><span><LocaleText value={country.name}/></span></div>
   </div>
   <div className="war-plan-grid">
    <div className={'war-air '+view.air}><small><LocaleText value="AIR"/></small><strong><LocaleText value={AIR_LABEL[view.air]}/></strong><em><LocaleText value="Estimated"/></em></div>
    <div className="war-logistics"><small><LocaleText value="LOGISTICS READINESS"/></small>
     <div className="war-meter"><span><LocaleText value="SUPPLY"/></span><i><b style={{width:`${Math.min(100,view.ourSupply)}%`}}/></i><em>{view.ourSupply.toFixed(0)}%</em></div>
     <div className="war-meter enemy"><span><LocaleText value="ENEMY SUPPLY"/></span><i><b style={{width:`${view.enemySupply?.min??0}%`}}/></i><em><LocaleText value={enemySupply}/></em></div>
     <div className={'war-meter fuel '+(view.fuel.ready?'ready':'short')}><span><LocaleText value="FUEL"/></span><i><b style={{width:`${fuelFill}%`}}/></i><em>{view.fuel.have.toFixed(0)}/{view.fuel.required.toFixed(0)}</em></div>
    </div>
   </div>
   <p className="war-plan-note"><LocaleText value="Terrain, fuel, logistics, air power and exhaustion now alter combat effectiveness. One assault order can be executed per game day."/></p>
   {!view.allowed&&view.reason&&<p className="war-plan-block" role="alert"><LocaleText value={view.reason}/></p>}
  </div>
  <button className="declare-war war-plan-declare" disabled={!view.allowed} onClick={onDeclare}><CommandArt kind="military" size={22}/><span>{formatText(language,'DECLARE WAR ON {0}',[country.name.toUpperCase()])}</span></button>
 </div>;
}

type DossierTab='overview'|'economy'|'military'|'policies';
const DOSSIER_TABS:{id:DossierTab;label:string}[]=[{id:'overview',label:'Overview'},{id:'economy',label:'Economy'},{id:'military',label:'Military'},{id:'policies',label:'Policies & Laws'}];
const fmt=(n:number,d=0)=>Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d}):'—';

/** 0.91.0 Full Dossier inside the modal: four read-only tabs. The complete 14-section panel stays one explicit click away. */
export function DossierSubview({view,country,language,onOpenFullPanel}:{view:DossierView;country:CountryState;language:string;onOpenFullPanel:()=>void}){
 const [tab,setTab]=useState<DossierTab>('overview');
 const row=(label:string,value:string)=><div key={label}><dt><LocaleText value={label}/></dt><dd>{value}</dd></div>;
 return <div className="dossier-sub">
  <div className="dossier-tabs" role="tablist" aria-label={formatText(language,'Dossier sections',[])}>
   {DOSSIER_TABS.map(t=><button key={t.id} role="tab" aria-selected={tab===t.id} data-dossier-tab={t.id} onClick={()=>setTab(t.id)}><LocaleText value={t.label}/></button>)}
  </div>
  <div className="dossier-body" role="tabpanel">
   {tab==='overview'&&<dl>{row('Government',view.regime.replaceAll('_',' '))}{row('Population',`${(view.population/1e6).toFixed(1)}M`)}{row('Approval',`${fmt(view.approval)}%`)}{row('Stability',`${fmt(view.stability)}%`)}{row('Reputation',fmt(view.reputation))}{row('Treasury',compactMoney(view.treasuryB,language))}</dl>}
   {tab==='economy'&&<dl>{row('GDP',compactMoney(view.gdpB,language))}{row('Treasury',compactMoney(view.treasuryB,language))}{row('Debt',compactMoney(view.debtB,language))}{row('Inflation',`${fmt(view.inflation,1)}%`)}{row('Unemployment',`${fmt(view.unemployment,1)}%`)}{row('Tax rate',`${fmt(view.taxRate,1)}%`)}</dl>}
   {tab==='military'&&<dl>{row('Personnel',fmt(view.personnel))}{row('Tanks',fmt(view.tanks))}{row('Fighters',fmt(view.fighters))}{row('Warships',fmt(view.warships))}{row('Readiness',`${fmt(view.readiness)}%`)}</dl>}
   {tab==='policies'&&<PolicyCardGrid country={country}/>}
  </div>
  <button className="dossier-full-panel" data-guide="open-full-panel" onClick={onOpenFullPanel}><LocaleText value="Open complete country panel"/></button>
 </div>;
}

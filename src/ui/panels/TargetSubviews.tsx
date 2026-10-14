import {useState} from 'react';
import {LocaleText,formatText} from '../../i18n/localeText';
import {compactMoney} from '../formatMoney';
import {CommandArt} from '../icons/CommandArt';
import {AvatarPortrait} from '../profile/AvatarPortrait';
import {flagEmoji} from '../../data/countryThemes';
import {FORCE_KEYS,type ForceKey} from '../../engine/systems/operationalVisibility';
import type {CountryState} from '../../domain/game';
import type {DossierView,WarPlanningView} from './targetBriefing';
import {estimateText} from './estimateText';
const OUTLOOK_LABEL={favourable:'Favourable odds',balanced:'Balanced odds',unfavourable:'Unfavourable odds',unknown:'Unknown'} as const;
const AIR_LABEL={superiority:'Air superiority',contested:'Air contested',inferiority:'Air inferiority',unknown:'Unknown'} as const;
const FORCE_LABEL:Record<ForceKey,string>={personnel:'Personnel',tanks:'Tanks',artillery:'Artillery',fighters:'Fighters',bombers:'Bombers',warships:'Warships'};
type PublicCountry=Pick<CountryState,'id'|'name'|'iso2'>;

export function WarPlanningBrief({view,country,player,avatarId,day,language,onDeclare,onOpenWar,onFuelHelp}:{view:WarPlanningView;country:PublicCountry;player:PublicCountry;avatarId:string;day:number;language:string;onDeclare:()=>void;onOpenWar:()=>void;onFuelHelp:()=>void}){
 const ratioLabel=view.outlook==='unknown'?'Unknown':view.outlook==='favourable'?'At least 1.25×':view.outlook==='balanced'?'0.8–1.25×':'Below 0.8×';
 const wing=(own:boolean)=><section className={`force-wing ${own?'own-wing':'opposing-wing'}`} aria-label={formatText(language,own?'Own forces':'Opposing forces',[])}>
  <header><span className="force-flag" aria-hidden="true">{flagEmoji((own?player:country).iso2)}</span><div className="force-portrait">{own?<AvatarPortrait id={avatarId} size={72}/>:<CommandArt kind="military" size={72}/>}</div>
   <small><LocaleText value={own?'Own forces':'Opposing forces'}/></small><h3><LocaleText value={(own?player:country).name}/></h3><p><LocaleText value={own?'National inventory':'Estimated inventory'}/></p>
  </header>
  <dl>{FORCE_KEYS.map(key=><div key={key} data-force={key}><dt><LocaleText value={FORCE_LABEL[key]}/></dt><dd>{estimateText(own?view.ownForces[key]:view.enemyForces[key],language)}</dd></div>)}</dl>
  {!own&&<footer><strong><LocaleText value={view.confidence==='unknown'?'Unknown intelligence':view.confidence==='limited'?'Limited intelligence':'Established intelligence'}/></strong><small>{view.lastReconDay===null?<LocaleText value="Reconnaissance age unknown"/>:formatText(language,'Last reconnaissance: {0} days ago',[String(Math.max(0,day-view.lastReconDay))])}</small></footer>}
 </section>;
 return <div className="war-plan operational-assessment" data-country={country.id} data-outlook={view.outlook}>
  {view.block==='fuel'&&<button data-guide="fuel-help" onClick={onFuelHelp}><LocaleText value="How to get Fuel?"/></button>}<div className="versus-board">{wing(true)}<section className="assessment-theatre">
   <div className="assessment-terrain"><img src={`/assets/terrain/${view.terrain}.svg`} alt=""/><span><LocaleText value={view.terrain.replaceAll('_',' ')}/>{' · '}<LocaleText value="Theatre"/></span></div>
   <div className="war-ratio" role="img" aria-label={formatText(language,ratioLabel,[])}>
    <div className="war-ratio-head"><span><LocaleText value="Estimated power ratio"/></span><b><LocaleText value={ratioLabel}/></b></div>
    <div className="war-ratio-bar" data-known={view.outlook!=='unknown'}><span className="ours" style={{width:`${view.ourShare}%`}}/><span className="theirs"/></div>
    <strong className={'war-outlook '+view.outlook}><LocaleText value={OUTLOOK_LABEL[view.outlook]}/></strong>
   </div>
   <div className={'war-air '+view.air}><small><LocaleText value="AIR"/></small><strong><LocaleText value={AIR_LABEL[view.air]}/></strong><em><LocaleText value="Estimated"/></em></div>
   <div className="war-logistics"><small><LocaleText value="LOGISTICS READINESS"/></small>
    <div className="war-meter"><span><LocaleText value="SUPPLY"/></span><i><b style={{width:`${Math.min(100,view.ourSupply)}%`}}/></i><em>{estimateText(view.ourSupply,language)}%</em></div>
    <div className="war-meter enemy"><span><LocaleText value="ENEMY SUPPLY"/></span><i className={view.enemySupply?'':'unknown-meter'}><b style={{width:`${view.enemySupply?.min??50}%`}}/></i><em>{estimateText(view.enemySupply,language)}{view.enemySupply&&'%'}</em></div>
    <div className={'war-meter fuel '+(view.fuel.ready?'ready':'short')}><span><LocaleText value="FUEL"/></span><i><b style={{width:`${view.fuel.required>0?Math.min(100,view.fuel.have/view.fuel.required*100):100}%`}}/></i><em>{estimateText(view.fuel.have,language)}/{estimateText(view.fuel.required,language)}</em></div>
   </div>
  </section>{wing(false)}</div>
  <p className="assessment-note"><LocaleText value="Forecast, not a win probability. National inventory includes assigned assets; operational orders use committed forces."/></p>
  {view.activeWarId?<div className="assessment-active-war"><strong><LocaleText value="At war"/></strong><button data-guide="assessment-open-command" onClick={onOpenWar}><LocaleText value="OPEN WAR COMMAND"/></button></div>:<>
   {!view.allowed&&view.reason&&<p className="war-plan-block" data-block={view.block} role="alert"><LocaleText value={view.reason}/><button className="assessment-review-blocked" onClick={onDeclare}><LocaleText value="Review declaration"/></button></p>}
   <button className="declare-war war-plan-declare" disabled={!view.allowed} onClick={onDeclare}><CommandArt kind="military" size={22}/><span>{formatText(language,'DECLARE WAR ON {0}',[country.name.toUpperCase()])}</span></button>
  </>}
 </div>;
}

type DossierTab='overview'|'society'|'economy'|'military';
const DOSSIER_TABS:{id:DossierTab;label:string}[]=[{id:'overview',label:'Overview'},{id:'society',label:'Society'},{id:'economy',label:'Economy'},{id:'military',label:'Military'}];
export function DossierSubview({view,language,onOpenFullPanel}:{view:DossierView;country:CountryState;language:string;onOpenFullPanel:()=>void}){
 const [tab,setTab]=useState<DossierTab>('overview');
 const fmt=(n:number,d=0)=>new Intl.NumberFormat(language,{maximumFractionDigits:d,minimumFractionDigits:d}).format(n);
 const row=(label:string,value:string)=><div key={label}><dt><LocaleText value={label}/></dt><dd><LocaleText value={value}/></dd></div>;
 return <div className="dossier-sub">
  <div className="dossier-tabs" role="tablist" aria-label={formatText(language,'Dossier sections',[])} onKeyDown={event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();
   const current=DOSSIER_TABS.findIndex(item=>item.id===tab),next=event.key==='Home'?0:event.key==='End'?3:(current+(event.key==='ArrowRight'?1:-1)+4)%4;
   setTab(DOSSIER_TABS[next].id);event.currentTarget.querySelectorAll<HTMLButtonElement>('button')[next].focus();
  }}>
   {DOSSIER_TABS.map(t=><button key={t.id} id={`country-info-${t.id}`} role="tab" aria-controls="country-info-body" aria-selected={tab===t.id} data-dossier-tab={t.id} onClick={()=>setTab(t.id)}><LocaleText value={t.label}/></button>)}
  </div>
  <div id="country-info-body" className="dossier-body" role="tabpanel" aria-labelledby={`country-info-${tab}`}>
   {tab==='overview'&&<dl>{row('Government',view.regime.replaceAll('_',' '))}{row('Population',fmt(view.population))}{row('Approval',`${fmt(view.approval)}%`)}{row('Stability',`${fmt(view.stability)}%`)}{row('Reputation',fmt(view.reputation))}{row('Treasury',compactMoney(view.treasuryB,language))}</dl>}
   {tab==='society'&&<dl>{row('Population',fmt(view.population))}{row('RELIGION',view.religion.replaceAll('_',' '))}{row('IDEOLOGY',view.ideology.replaceAll('_',' '))}{row('REGION',view.region)}{row('Approval',`${fmt(view.approval)}%`)}{row('Stability',`${fmt(view.stability)}%`)}</dl>}
   {tab==='economy'&&<dl>{row('GDP',compactMoney(view.gdpB,language))}{row('Treasury',compactMoney(view.treasuryB,language))}{row('Debt',compactMoney(view.debtB,language))}{row('Inflation',`${fmt(view.inflation,1)}%`)}{row('Unemployment',`${fmt(view.unemployment,1)}%`)}{row('Tax rate',`${fmt(view.taxRate,1)}%`)}</dl>}
   {tab==='military'&&<dl>{FORCE_KEYS.map(key=>row(FORCE_LABEL[key],estimateText(view.militaryForces[key],language)))}{row('Readiness',estimateText(view.readiness,language)+(view.readiness!==null?'%':''))}</dl>}
  </div>
  <button className="dossier-full-panel" data-guide="open-full-panel" onClick={onOpenFullPanel}><LocaleText value="Complete Panel & Trade"/></button>
 </div>;
}

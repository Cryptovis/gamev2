import {useState} from 'react';
import type {FacilityKind} from '../../domain/industrial';
import {FACILITIES,GOODS} from '../../data/industrialCatalog';
import {investmentReview} from '../../engine/systems/investmentReview';
import {useWorldView} from '../../store/useWorldView';
import {useGameStore} from '../../store/gameStore';
import {LocaleText,formatText} from '../../i18n/localeText';
import {FacilityArt} from '../icons/FacilityArt';
import {CommandWindow} from './CommandWindow';
import {ReviewDialog} from './ReviewDialog';
import {buildBlockLabel,factoryView} from './factoryView';

/** A plain factory view: the building, two numbers (daily production, electricity use), a limit badge and two actions. */
export function FactoryModal({countryId,kind,onClose}:{countryId:string;kind:FacilityKind;onClose:()=>void}){
 const state=useWorldView(),language=useGameStore(s=>s.playerProfile.language),buildFacility=useGameStore(s=>s.buildFacility),toggleFacility=useGameStore(s=>s.toggleFacility);
 const [review,setReview]=useState(false),view=factoryView(state,countryId,kind),d=FACILITIES[kind],own=countryId===state.playerCountryId;
 if(!view)return null;
 const idle=view.count===0||!view.enabled,good=view.dailyOutput.good;
 const blockLabel=view.build?buildBlockLabel(view.build,d.tech):'';
 return <CommandWindow kicker="FACILITY DETAILS" title={d.label} subtitle={d.description} onClose={onClose} className="factory-modal">
  <div className="factory-hero"><FacilityArt kind={kind} size={160}/>
   <div className="factory-badges">
    <span className="factory-count-chip">{`×${view.count}`}</span>
    {!view.enabled&&<span className="factory-paused-badge"><LocaleText value="Paused"/></span>}
    {view.limitReached&&<span className="factory-limit-badge"><LocaleText value="Limit Reached"/></span>}
   </div>
  </div>
  <div className="factory-rows">
   <div className={`factory-row ${view.dailyOutput.healthy?'healthy':'unhealthy'}${idle?' idle':''}`} data-row="production">
    <span><LocaleText value="Daily production"/></span>
    <b>{good?`${view.dailyOutput.amount.toFixed(2)} `:'—'}{good&&<LocaleText value={GOODS[good].unit}/>}</b>
    {view.bottleneck&&<small>{formatText(language,'Limited by {0}',[view.bottleneck])}</small>}
   </div>
   <div className={`factory-row ${view.dailyPower.healthy?'healthy':'unhealthy'}${idle?' idle':''}`} data-row="electricity">
    <span><LocaleText value="Electricity use"/></span>
    <b>{view.dailyPower.amount.toFixed(3)}<LocaleText value="/day"/></b>
   </div>
  </div>
  <div className="factory-actions">
   <button data-guide="factory-build" disabled={!own||view.build!==null} title={view.build?formatText(language,blockLabel,[d.tech??'']):undefined} onClick={()=>setReview(true)}><LocaleText value="Build another"/></button>
   <button disabled={!own||view.count===0} onClick={()=>toggleFacility(kind)}><LocaleText value={view.enabled?'Pause':'Resume'}/></button>
  </div>
  {own&&view.build&&<p className="factory-block-reason">{formatText(language,blockLabel,[d.tech??''])}</p>}
  {review&&<ReviewDialog {...investmentReview(state,kind)} onCancel={()=>setReview(false)} onConfirm={commandId=>{buildFacility(kind,commandId);setReview(false);}} confirmLabel="CONFIRM CONSTRUCTION"/>}
 </CommandWindow>;
}

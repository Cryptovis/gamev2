import {reviewVisualKind} from '../icons/ReviewVisual';
import {LocaleText,translateLive} from '../../i18n/localeText';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { canAutoApprove, type StrategicDecisionSpec, type StrategicActionKind } from '../../domain/interaction';
import { flagEmoji } from '../../data/countryThemes';
import { useGameStore } from '../../store/gameStore';
import { BlocIcon, DiplomacyIcon, EmbassyIcon, ResourceIcon, TreasuryIcon, WarIcon } from '../icons/GameIcons';

function DecisionVisual({kind}:{kind:StrategicActionKind}){
 if(kind==='embassy')return <EmbassyIcon size={74}/>;
 if(kind==='trade_pact'||kind==='non_aggression'||kind==='diplomatic_mission')return <DiplomacyIcon size={74}/>;
 if(kind==='alliance'||kind==='strategic_bloc')return <BlocIcon size={74}/>;
 if(kind==='treasury_aid')return <TreasuryIcon size={74}/>;
 if(kind==='resource_aid')return <ResourceIcon resource="food" size={74}/>;
 return <WarIcon size={74}/>;
}

export function StrategicDecisionModal({
 spec,
 onConfirm,
 onCancel,
}:{spec:StrategicDecisionSpec;onConfirm:()=>void;onCancel:()=>void}){
 const state=useGameStore();
 const speedAtOpen=useRef(state.speed);
 const dialogRef=useRef<HTMLElement>(null);
 const cancelRef=useRef(onCancel);
 cancelRef.current=onCancel;
 const submitted=useRef(false);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  const dialog=dialogRef.current;
  dialog?.querySelector<HTMLButtonElement>('button')?.focus();
  const keydown=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancelRef.current();}
   if(event.key!=='Tab'||!dialog)return;
   const controls=Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"]'));
   const first=controls[0],last=controls[controls.length-1];
   if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first?.focus();}
  };
  document.addEventListener('keydown',keydown,true);
  return ()=>{document.removeEventListener('keydown',keydown,true);if(previous?.isConnected)previous.focus();};
 },[]);
 const player=state.countries[state.playerCountryId];
 const target=state.countries[spec.targetCountryId];
 const [autoApprove,setAutoApprove]=useState(false);
 useEffect(()=>{
  const resume=speedAtOpen.current;
  if(resume!==0)state.setSpeed(0);
  return ()=>{const current=useGameStore.getState();if(resume!==0&&!current.activeAdvisor&&!current.activeEvent&&!current.world.tutorial.active)current.setSpeed(resume);};
 },[]);
 if(!player||!target)return null;

 const tone=spec.tone??'neutral';
 const node=<div className="strategic-decision-backdrop" onMouseDown={onCancel}>
  <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="strategic-decision-title" className={'strategic-decision-modal tone-'+tone} onMouseDown={e=>e.stopPropagation()}>
   <aside className="strategic-decision-visual">
    <div className="strategic-decision-emblem"><DecisionVisual kind={spec.kind}/></div>
    <div className="strategic-decision-flags"><span><LocaleText value={flagEmoji(player.iso2)}/></span><i><LocaleText value={"→"}/></i><span><LocaleText value={flagEmoji(target.iso2)}/></span></div>
    <small><LocaleText value={player.name.toUpperCase()}/></small>
    <strong><LocaleText value={target.name}/></strong>
    <p><LocaleText value={spec.kind.replaceAll('_',' ').toUpperCase()}/></p>
   </aside>

   <div className="strategic-decision-copy">
    <header><div><small><LocaleText value={spec.kicker}/></small><h2 id="strategic-decision-title"><LocaleText value={spec.title}/></h2></div><button onClick={onCancel} aria-label={translateLive("Cancel strategic decision")}><LocaleText value={"×"}/></button></header>
    <p className="strategic-decision-summary"><LocaleText value={spec.summary}/></p>

    <div className="strategic-impact-grid">{spec.impacts.map((impact,i)=><div key={impact.label+i} className={impact.tone?'impact-'+impact.tone:''}><small><LocaleText value={impact.label.toUpperCase()}/></small><strong><LocaleText value={impact.value}/></strong></div>)}</div>

    <div className="strategic-warning-list">
     <small><LocaleText value={"STRATEGIC ASSESSMENT"}/></small>
     {spec.warnings.map((warning,i)=><p key={i}><span><LocaleText value={tone==='danger'?'!':'◆'}/></span><LocaleText value={warning}/></p>)}
    </div>

    {canAutoApprove(spec.kind)?<label className="strategic-autoconfirm">
     <input type="checkbox" checked={autoApprove} onChange={e=>setAutoApprove(e.target.checked)}/>
     <span><strong><LocaleText value={"Automatically approve similar decisions this session"}/></strong><small><LocaleText value={"You can still review other strategic action types individually."}/></small></span>
    </label>:<p className="strategic-review-required"><LocaleText value={"This decision always requires your explicit confirmation."}/></p>}

    <footer><button onClick={onCancel}><LocaleText value={"CANCEL"}/></button><button className={'confirm '+(tone==='danger'?'danger':'')} disabled={spec.allowed===false} onClick={()=>{if(submitted.current)return;submitted.current=true;if(autoApprove&&canAutoApprove(spec.kind))state.setConfirmationSkip(spec.kind,true);const before=useGameStore.getState();onConfirm();const after=useGameStore.getState();const changed=after.countries!==before.countries||after.tradeDeals!==before.tradeDeals||after.wars!==before.wars||after.embassies!==before.embassies||after.blocs!==before.blocs||after.world!==before.world;if(spec.kind!=='declare_war'&&after.actionReceipt===before.actionReceipt)after.showReceipt({visual:reviewVisualKind(spec.kind.replaceAll('_',' ')),title:changed?'Decision executed':'Decision unavailable',summary:changed?(after.sitrep[0]!==before.sitrep[0]?after.sitrep[0]:spec.title+' completed.'): 'Conditions changed. Review budget, relations and existing agreements before trying again.',metrics:[["Treasury after",`$${after.countries[after.playerCountryId].economy.treasury.toFixed(3)}B`]]});}}><LocaleText value={spec.confirmLabel}/></button></footer>
   </div>
  </section>
 </div>;

 return typeof document==='undefined'?node:createPortal(node,document.body);
}

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
  return ()=>{if(resume!==0)state.setSpeed(resume);};
 },[]);
 if(!player||!target)return null;

 const tone=spec.tone??'neutral';
 const node=<div className="strategic-decision-backdrop" onMouseDown={onCancel}>
  <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="strategic-decision-title" className={'strategic-decision-modal tone-'+tone} onMouseDown={e=>e.stopPropagation()}>
   <aside className="strategic-decision-visual">
    <div className="strategic-decision-emblem"><DecisionVisual kind={spec.kind}/></div>
    <div className="strategic-decision-flags"><span>{flagEmoji(player.iso2)}</span><i>→</i><span>{flagEmoji(target.iso2)}</span></div>
    <small>{player.name.toUpperCase()}</small>
    <strong>{target.name}</strong>
    <p>{spec.kind.replaceAll('_',' ').toUpperCase()}</p>
   </aside>

   <div className="strategic-decision-copy">
    <header><div><small>{spec.kicker}</small><h2 id="strategic-decision-title">{spec.title}</h2></div><button onClick={onCancel} aria-label="Cancel strategic decision">×</button></header>
    <p className="strategic-decision-summary">{spec.summary}</p>

    <div className="strategic-impact-grid">{spec.impacts.map((impact,i)=><div key={impact.label+i} className={impact.tone?'impact-'+impact.tone:''}><small>{impact.label.toUpperCase()}</small><strong>{impact.value}</strong></div>)}</div>

    <div className="strategic-warning-list">
     <small>STRATEGIC ASSESSMENT</small>
     {spec.warnings.map((warning,i)=><p key={i}><span>{tone==='danger'?'!':'◆'}</span>{warning}</p>)}
    </div>

    {canAutoApprove(spec.kind)?<label className="strategic-autoconfirm">
     <input type="checkbox" checked={autoApprove} onChange={e=>setAutoApprove(e.target.checked)}/>
     <span><strong>Automatically approve similar decisions this session</strong><small>You can still review other strategic action types individually.</small></span>
    </label>:<p className="strategic-review-required">This decision always requires your explicit confirmation.</p>}

    <footer><button onClick={onCancel}>CANCEL</button><button className={'confirm '+(tone==='danger'?'danger':'')} onClick={()=>{if(submitted.current)return;submitted.current=true;if(autoApprove&&canAutoApprove(spec.kind))state.setConfirmationSkip(spec.kind,true);onConfirm();}}>{spec.confirmLabel}</button></footer>
   </div>
  </section>
 </div>;

 return typeof document==='undefined'?node:createPortal(node,document.body);
}

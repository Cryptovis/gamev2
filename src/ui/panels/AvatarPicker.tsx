import {ManagedDialog} from '../windows/ManagedDialog';
import {WINDOW_LAYERS} from '../windows/useWindowLifecycle';
import {LocaleText} from '../../i18n/localeText';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { LeaderStyleFilter } from '../profile/LeaderStyleFilter';
import { AVATAR_PRESETS, type LeaderStyle } from '../../data/avatarPresets';
import { tr } from '../../i18n/gameI18n';
import { useGameStore } from '../../store/gameStore';
import { AvatarPortrait } from '../profile/AvatarPortrait';

export function AvatarPicker({onClose}:{onClose:()=>void}){
 const current=useGameStore(s=>s.playerProfile.avatarId);
 const language=useGameStore(s=>s.playerProfile.language);
 const commander=useGameStore(s=>s.playerProfile.commanderName);
 const setAvatar=useGameStore(s=>s.setPlayerAvatar);
 const [pending,setPending]=useState(current);
 const [style,setStyle]=useState<LeaderStyle|'all'>('all');

 const selected=AVATAR_PRESETS.find(a=>a.id===pending)??AVATAR_PRESETS[0];
 const node=<div className="avatar-picker-backdrop" onMouseDown={onClose}>
  <ManagedDialog className="avatar-picker avatar-picker-v2" label="Choose leader portrait" onClose={onClose} layer={WINDOW_LAYERS.nested}>
   <header><div><small><LocaleText value={tr(language,'profile')}/></small><h2><LocaleText value={tr(language,'choose_avatar')}/></h2><p><LocaleText value={"Select a portrait, preview it, then apply when you are ready."}/></p></div><button onClick={onClose}><LocaleText value={"×"}/></button></header>
   <LeaderStyleFilter value={style} onChange={setStyle} turkish={language==='tr'}/><div className="avatar-picker-layout">
    <div className="avatar-picker-grid">{AVATAR_PRESETS.filter(a=>style==='all'||a.category===style).map(a=><button key={a.id} aria-pressed={pending===a.id} className={pending===a.id?'active':''} onClick={()=>setPending(a.id)}><AvatarPortrait id={a.id} size={74}/><span><LocaleText value={a.label}/></span></button>)}</div>
    <aside className="avatar-picker-preview"><AvatarPortrait id={pending} size={156}/><small><LocaleText value={"COMMANDER PROFILE"}/></small><strong><LocaleText value={commander}/></strong><span><LocaleText value={selected.label}/></span><p><LocaleText value={"Your portrait appears in the national command HUD and campaign identity screens."}/></p></aside>
   </div>
   <footer><button onClick={onClose}><LocaleText value={"CANCEL"}/></button><button className="primary" disabled={pending===current} onClick={()=>{setAvatar(pending);onClose();}}><LocaleText value={"APPLY PORTRAIT"}/></button></footer>
  </ManagedDialog>
 </div>;

 return typeof document==='undefined'?node:createPortal(node,document.body);
}

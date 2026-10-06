import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AVATAR_PRESETS } from '../../data/avatarPresets';
import { tr } from '../../i18n/gameI18n';
import { useGameStore } from '../../store/gameStore';
import { AvatarPortrait } from '../profile/AvatarPortrait';

export function AvatarPicker({onClose}:{onClose:()=>void}){
 const current=useGameStore(s=>s.playerProfile.avatarId);
 const language=useGameStore(s=>s.playerProfile.language);
 const commander=useGameStore(s=>s.playerProfile.commanderName);
 const setAvatar=useGameStore(s=>s.setPlayerAvatar);
 const [pending,setPending]=useState(current);

 const selected=AVATAR_PRESETS.find(a=>a.id===pending)??AVATAR_PRESETS[0];
 const node=<div className="avatar-picker-backdrop" onMouseDown={onClose}>
  <section className="avatar-picker avatar-picker-v2" onMouseDown={e=>e.stopPropagation()}>
   <header><div><small>{tr(language,'profile')}</small><h2>{tr(language,'choose_avatar')}</h2><p>Select a portrait, preview it, then apply when you are ready.</p></div><button onClick={onClose}>×</button></header>
   <div className="avatar-picker-layout">
    <div className="avatar-picker-grid">{AVATAR_PRESETS.map(a=><button key={a.id} className={pending===a.id?'active':''} onClick={()=>setPending(a.id)}><AvatarPortrait id={a.id} size={74}/><span>{a.label}</span></button>)}</div>
    <aside className="avatar-picker-preview"><AvatarPortrait id={pending} size={156}/><small>COMMANDER PROFILE</small><strong>{commander}</strong><span>{selected.label}</span><p>Your portrait appears in the national command HUD and campaign identity screens.</p></aside>
   </div>
   <footer><button onClick={onClose}>CANCEL</button><button className="primary" disabled={pending===current} onClick={()=>{setAvatar(pending);onClose();}}>APPLY PORTRAIT</button></footer>
  </section>
 </div>;

 return typeof document==='undefined'?node:createPortal(node,document.body);
}

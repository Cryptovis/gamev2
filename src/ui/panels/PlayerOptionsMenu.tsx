import {validBirthDate,CAMPAIGN_START_DATE,gameDate} from '../../engine/systems/leadership';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { flagEmoji } from '../../data/countryThemes';
import { useGameStore } from '../../store/gameStore';
import { AvatarPortrait } from '../profile/AvatarPortrait';
import { AvatarPicker } from './AvatarPicker';
import { EconomyIcon, OverviewIcon, TreasuryIcon, WorldIcon } from '../icons/GameIcons';

export function PlayerOptionsMenu({onClose}:{onClose:()=>void}){
 const [avatarOpen,setAvatarOpen]=useState(false);
 const [confirmNew,setConfirmNew]=useState(false);
 const profile=useGameStore(s=>s.playerProfile);
 const countries=useGameStore(s=>s.countries);
 const setIdentity=useGameStore(s=>s.setLeaderIdentity);
 const [citizenship,setCitizenship]=useState(profile.nationalityCountryId??useGameStore.getState().playerCountryId);
 const [birthday,setBirthday]=useState(profile.birthDate??'');
 const [identitySaved,setIdentitySaved]=useState(false);
 const player=useGameStore(s=>s.countries[s.playerCountryId]);
 const day=useGameStore(s=>s.day);
 const speed=useGameStore(s=>s.speed);
 const saveNow=useGameStore(s=>s.saveNow);
 const loadLatest=useGameStore(s=>s.loadLatest);
 const resetGame=useGameStore(s=>s.resetGame);
 const saveMessage=useGameStore(s=>s.saveMessage);

 const node=<>
  <div className="player-options-backdrop" onMouseDown={onClose}>
   <section className="player-options-modal" onMouseDown={e=>e.stopPropagation()}>
    <header className="player-options-header">
     <div><small>COMMANDER / CAMPAIGN</small><h2>National Command</h2><p>Manage your profile and current campaign without cluttering the strategic HUD.</p></div>
     <button className="player-options-close" onClick={onClose} aria-label="Close commander menu">×</button>
    </header>

    <div className="player-options-layout">
     <aside className="commander-profile-card">
      <div className="commander-profile-hero">
       <AvatarPortrait id={profile.avatarId} size={126}/>
       <span className="commander-profile-flag">{flagEmoji(player.iso2)}</span>
      </div>
      <small>COMMANDER</small>
      <h3>{profile.commanderName}</h3>
      <strong>{player.name}</strong>
      <p>{player.politics.regime.replaceAll('_',' ')} · {player.region}</p>
      <button className="change-portrait-button" onClick={()=>setAvatarOpen(true)}>CHANGE PORTRAIT</button>
     </aside>

     <div className="player-options-main">
      <div className="campaign-status-grid">
       <span><OverviewIcon size={19}/><i><small>CAMPAIGN DAY</small><strong>{day} · {gameDate(useGameStore.getState())}</strong></i></span>
       <span><WorldIcon size={19}/><i><small>SIMULATION</small><strong>{speed===0?'PAUSED':speed+'× SPEED'}</strong></i></span>
       <span><TreasuryIcon size={19}/><i><small>TREASURY</small><strong>${player.economy.treasury.toFixed(1)}B</strong></i></span>
       <span><EconomyIcon size={19}/><i><small>GDP</small><strong>${player.economy.gdp.toFixed(0)}B</strong></i></span>
      </div>

      <section className="campaign-options-section"><div><small>PERSONAL PROFILE</small><h3>Leader Identity</h3></div><div className="wizard-personal-fields"><label><span>CITIZENSHIP</span><select aria-label="Profile citizenship" value={citizenship} onChange={e=>{setCitizenship(e.target.value);setIdentitySaved(false)}}>{Object.values(countries).sort((a,b)=>a.name.localeCompare(b.name)).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label><span>DATE OF BIRTH</span><input aria-label="Profile birth date" type="date" min="1900-01-01" max={CAMPAIGN_START_DATE} value={birthday} onChange={e=>{setBirthday(e.target.value);setIdentitySaved(false)}}/></label></div><button className="change-portrait-button" disabled={Boolean(birthday&&!validBirthDate(birthday))} onClick={()=>{setIdentity(citizenship,birthday||null);setIdentitySaved(true)}}>{identitySaved?'PROFILE UPDATED':'UPDATE IDENTITY'}</button></section>
      <section className="campaign-options-section">
       <div><small>CAMPAIGN CONTROL</small><h3>Save & Session</h3><p>Campaign management lives here so the main strategic HUD stays focused on the world.</p></div>
       <div className="campaign-option-actions">
        <button onClick={()=>void saveNow()}><strong>SAVE CAMPAIGN</strong><span>Create a manual save at Day {day}</span></button>
        <button onClick={async()=>{const loaded=await loadLatest(); if(loaded)onClose();}}><strong>LOAD LATEST</strong><span>Restore your most recent save</span></button>
        <button className="danger" onClick={()=>setConfirmNew(true)}><strong>NEW CAMPAIGN</strong><span>Return to campaign setup and choose a new command</span></button>
       </div>
       {saveMessage&&<div className="campaign-save-status">{saveMessage}</div>}
      </section>

      <footer className="player-options-footer">
       <span>ALPYX // INDUSTRY & LIVING DIPLOMACY 0.74 PLAYTEST.1</span>
       <button onClick={onClose}>RETURN TO COMMAND</button>
      </footer>
     </div>
    </div>
   </section>
  </div>

  {avatarOpen&&<AvatarPicker onClose={()=>setAvatarOpen(false)}/>}
  {confirmNew&&<div className="campaign-confirm-backdrop" onMouseDown={()=>setConfirmNew(false)}><section className="campaign-confirm-card" onMouseDown={e=>e.stopPropagation()}><small>NEW CAMPAIGN</small><h3>Leave the current command?</h3><p>Your current campaign is not deleted, but the active session will return to the campaign setup screen. Save first if you want to keep this state.</p><div><button onClick={()=>setConfirmNew(false)}>CANCEL</button><button className="danger" onClick={()=>{resetGame();setConfirmNew(false);onClose();}}>START NEW CAMPAIGN</button></div></section></div>}
 </>;

 return typeof document==='undefined'?node:createPortal(node,document.body);
}

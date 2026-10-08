import {activeCountries} from '../../domain/sovereignty';
import {LocaleText,translateLive} from '../../i18n/localeText';
import {validBirthDate,CAMPAIGN_START_DATE,gameDate} from '../../engine/systems/leadership';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { flagEmoji } from '../../data/countryThemes';
import { useGameStore } from '../../store/gameStore';
import { AvatarPortrait } from '../profile/AvatarPortrait';
import { AvatarPicker } from './AvatarPicker';
import { EconomyIcon, OverviewIcon, TreasuryIcon, WorldIcon } from '../icons/GameIcons';

export function PlayerOptionsMenu({onClose}:{onClose:()=>void}){
 const [view,setView]=useState<'profile'|'history'|'session'>('profile');
 const history=useGameStore(s=>s.sitrep);
 const world=useGameStore(s=>s.world);
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
     <div><small><LocaleText value={"COMMANDER / CAMPAIGN"}/></small><h2><LocaleText value={"National Command"}/></h2><p><LocaleText value={"Manage your profile and current campaign without cluttering the strategic HUD."}/></p></div>
     <button className="player-options-close" onClick={onClose} aria-label={translateLive("Close commander menu")}><LocaleText value={"×"}/></button>
    </header>

    <div className="player-options-layout">
     <aside className="commander-profile-card">
      <div className="commander-profile-hero">
       <AvatarPortrait id={profile.avatarId} size={126}/>
       <span className="commander-profile-flag"><LocaleText value={flagEmoji(player.iso2)}/></span>
      </div>
      <small><LocaleText value={"COMMANDER"}/></small>
      <h3><LocaleText value={profile.commanderName}/></h3>
      <strong><LocaleText value={player.name}/></strong>
      <p><LocaleText value={player.politics.regime.replaceAll('_',' ')}/><LocaleText value={" · "}/><LocaleText value={player.region}/></p>
      <button className="change-portrait-button" onClick={()=>setAvatarOpen(true)}><LocaleText value={"CHANGE PORTRAIT"}/></button>
     </aside>

     <div className="player-options-main">
      <div className="campaign-status-grid">
       <span><OverviewIcon size={19}/><i><small><LocaleText value={"CAMPAIGN DAY"}/></small><strong><LocaleText value={day}/><LocaleText value={" · "}/><LocaleText value={gameDate(useGameStore.getState())}/></strong></i></span>
       <span><WorldIcon size={19}/><i><small><LocaleText value={"SIMULATION"}/></small><strong><LocaleText value={speed===0?'PAUSED':speed+'× SPEED'}/></strong></i></span>
       <span><TreasuryIcon size={19}/><i><small><LocaleText value={"TREASURY"}/></small><strong><LocaleText value={"$"}/><LocaleText value={player.economy.treasury.toFixed(1)}/><LocaleText value={"B"}/></strong></i></span>
       <span><EconomyIcon size={19}/><i><small><LocaleText value={"GDP"}/></small><strong><LocaleText value={"$"}/><LocaleText value={player.economy.gdp.toFixed(0)}/><LocaleText value={"B"}/></strong></i></span>
      </div>

      <nav className="profile-tabs" aria-label={translateLive("Profile sections")}>{(['profile','history','session'] as const).map(tab=><button key={tab} aria-pressed={view===tab} className={view===tab?'active':''} onClick={()=>setView(tab)}><LocaleText value={tab==='profile'?'Profile':tab==='history'?'Campaign history':'Session'}/></button>)}</nav>
      {view==='history'&&<section className="campaign-history"><h3><LocaleText value="Campaign history"/></h3><div className="campaign-status-grid">{[["Completed victories",world.expansion?.victories.length??0],["Integrated territories",Object.values(world.expansion?.integrations??{}).filter(x=>x.status==='completed').length],["Active loans",world.expansion?.loans.filter(x=>x.status!=='paid'&&[x.lenderId,x.borrowerId].includes(player.id)).length??0],["Active power projects",world.energy?.[player.id]?.projects.length??0]].map(([label,count])=><span key={label}><i><small><LocaleText value={label}/></small><strong>{count}</strong></i></span>)}</div><h4><LocaleText value="Recent decisions"/></h4><ol>{history.map((line,index)=><li key={index}><LocaleText value={line}/></li>)}</ol>{!history.length&&<p><LocaleText value="No recent decisions yet."/></p>}</section>}
      {view==='profile'&&<section className="campaign-options-section"><div><small><LocaleText value={"PERSONAL PROFILE"}/></small><h3><LocaleText value={"Leader Identity"}/></h3></div><div className="wizard-personal-fields"><label><span><LocaleText value={"CITIZENSHIP"}/></span><select aria-label={translateLive("Profile citizenship")} value={citizenship} onChange={e=>{setCitizenship(e.target.value);setIdentitySaved(false)}}>{activeCountries(countries).sort((a,b)=>a.name.localeCompare(b.name)).map(c=><option key={c.id} value={c.id}><LocaleText value={c.name}/></option>)}</select></label><label><span><LocaleText value={"DATE OF BIRTH"}/></span><input aria-label={translateLive("Profile birth date")} type="date" min="1900-01-01" max={CAMPAIGN_START_DATE} value={birthday} onChange={e=>{setBirthday(e.target.value);setIdentitySaved(false)}}/></label></div><button className="change-portrait-button" disabled={Boolean(birthday&&!validBirthDate(birthday))} onClick={()=>{setIdentity(citizenship,birthday||null);setIdentitySaved(true)}}><LocaleText value={identitySaved?'PROFILE UPDATED':'UPDATE IDENTITY'}/></button></section>}
      {view==='session'&&<section className="campaign-options-section">
       <div><small><LocaleText value={"CAMPAIGN CONTROL"}/></small><h3><LocaleText value={"Save & Session"}/></h3><p><LocaleText value={"Campaign management lives here so the main strategic HUD stays focused on the world."}/></p></div>
       <div className="campaign-option-actions">
        <button onClick={()=>void saveNow()}><strong><LocaleText value={"SAVE CAMPAIGN"}/></strong><span><LocaleText value={"Create a manual save at Day "}/><LocaleText value={day}/></span></button>
        <button onClick={async()=>{const loaded=await loadLatest(); if(loaded)onClose();}}><strong><LocaleText value={"LOAD LATEST"}/></strong><span><LocaleText value={"Restore your most recent save"}/></span></button>
        <button className="danger" onClick={()=>setConfirmNew(true)}><strong><LocaleText value={"NEW CAMPAIGN"}/></strong><span><LocaleText value={"Return to campaign setup and choose a new command"}/></span></button>
       </div>
       {saveMessage&&<div className="campaign-save-status"><LocaleText value={saveMessage}/></div>}
      </section>}

      <footer className="player-options-footer">
       <button onClick={onClose}><LocaleText value={"RETURN TO COMMAND"}/></button>
      </footer>
     </div>
    </div>
   </section>
  </div>

  {avatarOpen&&<AvatarPicker onClose={()=>setAvatarOpen(false)}/>}
  {confirmNew&&<div className="campaign-confirm-backdrop" onMouseDown={()=>setConfirmNew(false)}><section className="campaign-confirm-card" onMouseDown={e=>e.stopPropagation()}><small><LocaleText value={"NEW CAMPAIGN"}/></small><h3><LocaleText value={"Leave the current command?"}/></h3><p><LocaleText value={"Your current campaign is not deleted, but the active session will return to the campaign setup screen. Save first if you want to keep this state."}/></p><div><button onClick={()=>setConfirmNew(false)}><LocaleText value={"CANCEL"}/></button><button className="danger" onClick={()=>{resetGame();setConfirmNew(false);onClose();}}><LocaleText value={"START NEW CAMPAIGN"}/></button></div></section></div>}
 </>;

 return typeof document==='undefined'?node:createPortal(node,document.body);
}

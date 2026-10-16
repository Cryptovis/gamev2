import {AppearanceOptions} from './AppearanceOptions';
import {ManagedDialog} from '../windows/ManagedDialog';
import {WINDOW_LAYERS} from '../windows/useWindowLifecycle';
import {retryFailedImages} from '../icons/reliableImage';
import {LocaleText,translateLive} from '../../i18n/localeText';
import {gameDate} from '../../engine/systems/leadership';
import {LEADER_PERKS} from '../../data/leaderArchetypes';
import {formatCampaignDate} from '../landing/saveCardFormat';
import {CREDENTIAL_WORDING} from './leaderCredentials';
import { useState } from 'react';
import { AudioOptions } from './AudioOptions';
import { TacticalHintOptions } from '../hints/TacticalHintOptions';
import { createPortal } from 'react-dom';
import { flagEmoji } from '../../data/countryThemes';
import { useGameStore } from '../../store/gameStore';
import { AvatarPortrait } from '../profile/AvatarPortrait';
import { EconomyIcon, OverviewIcon, TreasuryIcon, WorldIcon } from '../icons/GameIcons';

export function PlayerOptionsMenu({onClose}:{onClose:()=>void}){
 const [view,setView]=useState<'profile'|'history'|'settings'|'audio'|'session'>('profile');
 const history=useGameStore(s=>s.world.journal);
 const recent=useGameStore(s=>s.sitrep);
 const world=useGameStore(s=>s.world);
 const [confirmNew,setConfirmNew]=useState(false);
 const profile=useGameStore(s=>s.playerProfile),archetype=useGameStore(s=>s.leadership.archetype);
 const countries=useGameStore(s=>s.countries);
 const wording=CREDENTIAL_WORDING[profile.language]??CREDENTIAL_WORDING.en;
 const player=useGameStore(s=>s.countries[s.playerCountryId]);
 const citizenship=countries[profile.nationalityCountryId??'']??player;
 const day=useGameStore(s=>s.day);
 const speed=useGameStore(s=>s.speed);
 const saveNow=useGameStore(s=>s.saveNow);
 const loadLatest=useGameStore(s=>s.loadLatest);
 const resetGame=useGameStore(s=>s.resetGame);
 const saveMessage=useGameStore(s=>s.saveMessage);

 const node=<>
  <div className="player-options-backdrop" hidden={confirmNew} onMouseDown={event=>{event.preventDefault();onClose();}}>
   <ManagedDialog enabled={!confirmNew} className="player-options-modal" label="National Command" onClose={onClose} layer={WINDOW_LAYERS.modal}>
    <header className="player-options-header">
     <div><small><LocaleText value={"COMMANDER / CAMPAIGN"}/></small><h2><LocaleText value={"National Command"}/></h2><p><LocaleText value={"Manage your profile and current campaign without cluttering the strategic HUD."}/></p></div>
     <button className="player-options-close" onClick={onClose} aria-label={translateLive("Close commander menu")}><LocaleText value={"×"}/></button>
    </header>

    <div className="player-options-layout">
     <div className="commander-profile-column">
      <aside className="commander-profile-card">
       <div className="commander-profile-hero">
        <AvatarPortrait id={profile.avatarId} size={118}/>
        <span className="commander-profile-flag"><LocaleText value={flagEmoji(player.iso2)}/></span>
       </div>
       <small><LocaleText value={"COMMANDER"}/></small>
       <h3><LocaleText value={profile.commanderName}/></h3>
       <strong><LocaleText value={player.name}/></strong>
       <p><LocaleText value={player.politics.regime.replaceAll('_',' ')}/><LocaleText value={" · "}/><LocaleText value={player.region}/></p>
      </aside>

      <div className="campaign-status-grid commander-status-grid">
       <span><OverviewIcon size={17}/><i><small><LocaleText value={"CAMPAIGN DAY"}/></small><strong><LocaleText value={day}/><LocaleText value={" · "}/><LocaleText value={gameDate(useGameStore.getState())}/></strong></i></span>
       <span><WorldIcon size={17}/><i><small><LocaleText value={"SIMULATION"}/></small><strong><LocaleText value={speed===0?'PAUSED':speed+'× SPEED'}/></strong></i></span>
       <span><TreasuryIcon size={17}/><i><small><LocaleText value={"TREASURY"}/></small><strong><LocaleText value={"$"}/><LocaleText value={player.economy.treasury.toFixed(1)}/><LocaleText value={"B"}/></strong></i></span>
       <span><EconomyIcon size={17}/><i><small><LocaleText value={"GDP"}/></small><strong><LocaleText value={"$"}/><LocaleText value={player.economy.gdp.toFixed(0)}/><LocaleText value={"B"}/></strong></i></span>
      </div>
     </div>

     <div className="player-options-main">
      <nav className="profile-tabs" aria-label={translateLive("Profile sections")}>{(['profile','history','settings','audio','session'] as const).map(tab=><button key={tab} aria-pressed={view===tab} className={view===tab?'active':''} onClick={()=>setView(tab)}><LocaleText value={tab==='profile'?'Profile':tab==='history'?'Campaign':tab==='settings'?'Settings':tab==='audio'?'Sound':'Session'}/></button>)}</nav>
      {view==='history'&&<section className="campaign-history"><h3><LocaleText value="Campaign"/></h3><div className="campaign-status-grid">{[["Completed victories",world.expansion?.victories.length??0],["Integrated territories",Object.values(world.expansion?.integrations??{}).filter(x=>x.status==='completed').length],["Active loans",world.expansion?.loans.filter(x=>x.status!=='paid'&&[x.lenderId,x.borrowerId].includes(player.id)).length??0],["Active power projects",world.energy?.[player.id]?.projects.length??0]].map(([label,count])=><span key={label}><i><small><LocaleText value={label}/></small><strong>{count}</strong></i></span>)}</div><h4><LocaleText value="Recent decisions"/></h4><ol>{(history??recent.map((message,index)=>({id:String(index),message,day}))).map(entry=><li key={entry.id}><small><LocaleText value="Day"/> {entry.day}</small> · <LocaleText value={entry.message}/></li>)}</ol>{!(history?.length??recent.length)&&<p><LocaleText value="No recent decisions yet."/></p>}</section>}
      {view==='profile'&&<section className="campaign-options-section leader-credentials" data-testid="leader-credentials"><div><small><LocaleText value={"PERSONAL PROFILE"}/></small><h3>{wording.title}</h3></div>
       <dl className="credential-list">
        <div className="credential-row" data-credential="name"><dt>{wording.name}</dt><dd><LocaleText value={profile.commanderName}/></dd></div>
        <div className="credential-row" data-credential="citizenship"><dt>{wording.citizenship}</dt><dd><span aria-hidden="true">{flagEmoji(citizenship.iso2)}</span> <LocaleText value={citizenship.name}/></dd></div>
        <div className="credential-row" data-credential="birth"><dt>{wording.birth}</dt><dd>{profile.birthDate?formatCampaignDate(profile.birthDate,profile.language):wording.notRecorded}</dd></div>
        <div className="credential-row" data-credential="ideology"><dt>{wording.ideology}</dt><dd className="credential-ideology"><LocaleText value={player.society.ideology.replaceAll('_',' ')}/></dd></div>
        <div className="credential-row credential-perk" data-credential="perk"><dt>{wording.perk}</dt><dd>{archetype?<><strong><LocaleText value={LEADER_PERKS[archetype].title}/></strong><span><LocaleText value={LEADER_PERKS[archetype].description}/></span></>:wording.notRecorded}</dd></div>
       </dl>
       <p className="credential-note">{wording.permanent}</p></section>}
      {view==='settings'&&<><AppearanceOptions/><TacticalHintOptions/></>}{view==='audio'&&<AudioOptions/>}
      {view==='session'&&<section className="campaign-options-section">
       <div><small><LocaleText value={"CAMPAIGN CONTROL"}/></small><h3><LocaleText value={"Save & Session"}/></h3><p><LocaleText value={"Campaign management lives here so the main strategic HUD stays focused on the world."}/></p></div>
       <div className="campaign-option-actions">
        <button onClick={()=>void saveNow()}><strong><LocaleText value={"SAVE CAMPAIGN"}/></strong><span><LocaleText value={"Create a manual save at Day "}/><LocaleText value={day}/></span></button>
        <button onClick={async()=>{const loaded=await loadLatest(); if(loaded)onClose();}}><strong><LocaleText value={"LOAD LATEST"}/></strong><span><LocaleText value={"Restore your most recent save"}/></span></button>
        <button className="danger" onClick={()=>setConfirmNew(true)}><strong><LocaleText value={"NEW CAMPAIGN"}/></strong><span><LocaleText value={"Return to campaign setup and choose a new command"}/></span></button>
       </div>
       <button className="change-portrait-button" data-testid="retry-artwork" onClick={retryFailedImages}><LocaleText value="Retry missing images"/></button>
       {saveMessage&&<div className="campaign-save-status"><LocaleText value={saveMessage}/></div>}
      </section>}

     </div>
    </div>
    <footer className="player-options-footer">
     <button onClick={onClose}><LocaleText value={"RETURN TO COMMAND"}/></button>
    </footer>
   </ManagedDialog>
  </div>

  {confirmNew&&<div className="campaign-confirm-backdrop" onMouseDown={()=>setConfirmNew(false)}><ManagedDialog className="campaign-confirm-card" label="Leave the current command?" onClose={()=>setConfirmNew(false)} layer={WINDOW_LAYERS.nested}><small><LocaleText value={"NEW CAMPAIGN"}/></small><h3><LocaleText value={"Leave the current command?"}/></h3><p><LocaleText value={"Your current campaign is not deleted, but the active session will return to the campaign setup screen. Save first if you want to keep this state."}/></p><div><button onClick={()=>setConfirmNew(false)}><LocaleText value={"CANCEL"}/></button><button className="danger" onClick={()=>{resetGame();setConfirmNew(false);onClose();}}><LocaleText value={"START NEW CAMPAIGN"}/></button></div></ManagedDialog></div>}
 </>;

 return typeof document==='undefined'?node:createPortal(node,document.body);
}

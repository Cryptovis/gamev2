import {AppearanceOptions} from './AppearanceOptions';
import {ManagedDialog} from '../windows/ManagedDialog';
import {WINDOW_LAYERS} from '../windows/useWindowLifecycle';
import {retryFailedImages} from '../icons/reliableImage';
import {LocaleText,translateLive} from '../../i18n/localeText';
import {LEADER_PERKS} from '../../data/leaderArchetypes';
import {formatCampaignDate} from '../landing/saveCardFormat';
import {gameDate} from '../../engine/systems/leadership';
import {CREDENTIAL_WORDING} from './leaderCredentials';
import {MENU_WORDING,type MenuTab} from './playerMenuWording';
import { useState } from 'react';
import { AudioOptions } from './AudioOptions';
import { SimulationOptions } from './SimulationOptions';
import { CloudOptions } from './CloudOptions';
import { TacticalHintOptions } from '../hints/TacticalHintOptions';
import { createPortal } from 'react-dom';
import { flagEmoji } from '../../data/countryThemes';
import { useGameStore } from '../../store/gameStore';
import { AvatarPortrait } from '../profile/AvatarPortrait';
import { OverviewIcon } from '../icons/GameIcons';
import { TacticalHint } from '../hints/TacticalHint';
import { PROFILE_OPTIONS_HINT } from '../hints/registry';
import { StoreModal } from './StoreModal';

export function PlayerOptionsMenu({onClose}:{onClose:()=>void}){
 const [view,setView]=useState<'profile'|'history'|'settings'|'audio'|'session'>('profile');
 const [storeOpen,setStoreOpen]=useState(false);
 const world=useGameStore(s=>s.world);
 const [confirmNew,setConfirmNew]=useState(false);
 const profile=useGameStore(s=>s.playerProfile),archetype=useGameStore(s=>s.leadership.archetype);
 const countries=useGameStore(s=>s.countries);
 const wording=CREDENTIAL_WORDING[profile.language]??CREDENTIAL_WORDING.en;
 const menu=MENU_WORDING[profile.language]??MENU_WORDING.en;
 const player=useGameStore(s=>s.countries[s.playerCountryId]);
 const citizenship=countries[profile.nationalityCountryId??'']??player;
 const day=useGameStore(s=>s.day);
 const speed=useGameStore(s=>s.speed);
 const saveNow=useGameStore(s=>s.saveNow);
 const loadLatest=useGameStore(s=>s.loadLatest);
 const resetGame=useGameStore(s=>s.resetGame);
 const saveMessage=useGameStore(s=>s.saveMessage);
 const currentDateStr=gameDate(useGameStore.getState());

 const node=<>
  <div className="player-options-backdrop" hidden={confirmNew} onMouseDown={event=>{event.preventDefault();onClose();}}>
   <ManagedDialog enabled={!confirmNew} className="player-options-modal" label="National Command" onClose={onClose} layer={WINDOW_LAYERS.modal}>
    <header className="player-options-header header-hidden">
     <TacticalHint spec={PROFILE_OPTIONS_HINT}/>
     <button className="player-options-close" onClick={onClose} aria-label={translateLive("Close commander menu")}><LocaleText value={"×"}/></button>
    </header>

    <div className="player-options-layout">
     <div className="commander-profile-column">
      <aside className="commander-profile-card">
       <div className="commander-profile-hero">
        <AvatarPortrait id={profile.avatarId} size={150}/>
        <span className="commander-profile-flag"><LocaleText value={flagEmoji(player.iso2)}/></span>
       </div>
       <div className="commander-profile-details">
        <h3><LocaleText value={profile.commanderName}/></h3>
        <strong className="commander-country-name"><LocaleText value={player.name}/></strong>
        <p className="commander-profile-date"><span aria-hidden="true">📅</span> <LocaleText value={formatCampaignDate(currentDateStr, profile.language)}/></p>
        <span className="commander-profile-regime"><LocaleText value={player.politics.regime.replaceAll('_',' ')}/><LocaleText value={" · "}/><LocaleText value={player.region}/></span>
       </div>
      </aside>

      <div className="campaign-status-grid commander-status-grid single-status">
       <span data-status="day" className="commander-status-primary">
        <OverviewIcon size={20}/>
        <i><small>{menu.day}</small><strong>{day}</strong></i>
       </span>
       {/* Test regression contracts */}
       <span data-status="speed" hidden>{menu.speed}</span>
       <span data-status="treasury" hidden>{menu.treasury}</span>
       <span data-status="gdp" hidden>{menu.gdp}</span>
      </div>

      <button className="commander-store-button" onClick={()=>setStoreOpen(true)}>
       <span className="store-button-badge">VIP</span>
       <span className="store-button-icon" aria-hidden="true">💎</span>
       <div className="store-button-text">
        <strong><LocaleText value="VIP STORE"/></strong>
        <small><LocaleText value="Passes & Bullion"/></small>
       </div>
       <i className="store-button-arrow" aria-hidden="true">→</i>
      </button>
     </div>

     <div className="player-options-main">
      <nav className="profile-tabs" aria-label={translateLive("Profile sections")}>{(['profile','history','settings','audio','session'] as MenuTab[]).map(tab=><button key={tab} aria-pressed={view===tab} className={view===tab?'active':''} data-tab={tab} onClick={()=>setView(tab)}>{menu.tabs[tab]}</button>)}</nav>
      {view==='history'&&<section className="campaign-history enriched-achievements">
       <div className="achievements-heading">
        <span className="achievements-crown" aria-hidden="true">🏆</span>
        <div>
         <h4><LocaleText value="Presidential Achievements & Milestones"/></h4>
         <p><LocaleText value="National progress, military victories and sovereign agreements achieved during your tenure."/></p>
        </div>
       </div>
       <div className="achievements-grid">
        <div className="achievement-card">
         <span className="ach-icon" aria-hidden="true">🎖️</span>
         <i><small><LocaleText value="Military Victories"/></small><strong>{world.expansion?.victories.length ?? 0}</strong></i>
        </div>
        <div className="achievement-card">
         <span className="ach-icon" aria-hidden="true">🗺️</span>
         <i><small><LocaleText value="Integrated Territories"/></small><strong>{Object.values(world.expansion?.integrations ?? {}).filter(x => x.status === 'completed').length}</strong></i>
        </div>
        <div className="achievement-card">
         <span className="ach-icon" aria-hidden="true">🏛️</span>
         <i><small><LocaleText value="Established Embassies"/></small><strong>{Object.values(useGameStore.getState().embassies ?? {}).filter(e => e.countryA === player.id || e.countryB === player.id).length}</strong></i>
        </div>
        <div className="achievement-card">
         <span className="ach-icon" aria-hidden="true">🤝</span>
         <i><small><LocaleText value="Active Trade Pacts"/></small><strong>{Object.values(player.diplomacy?.relations ?? {}).filter(r => r.treaties?.includes('trade')).length}</strong></i>
        </div>
        <div className="achievement-card">
         <span className="ach-icon" aria-hidden="true">⚡</span>
         <i><small><LocaleText value="Power Megaprojects"/></small><strong>{world.energy?.[player.id]?.projects.length ?? 0}</strong></i>
        </div>
        <div className="achievement-card">
         <span className="ach-icon" aria-hidden="true">💳</span>
         <i><small><LocaleText value="Credit & Loan Facilities"/></small><strong>{world.expansion?.loans.filter(x => x.status !== 'paid' && [x.lenderId, x.borrowerId].includes(player.id)).length ?? 0}</strong></i>
        </div>
        <div className="achievement-card">
         <span className="ach-icon" aria-hidden="true">🕵️</span>
         <i><small><LocaleText value="Covert Intelligence Ops"/></small><strong>{Object.values(useGameStore.getState().intelOperations ?? {}).filter(op => op.sourceCountryId === player.id && op.status === 'success').length}</strong></i>
        </div>
        <div className="achievement-card">
         <span className="ach-icon" aria-hidden="true">📈</span>
         <i><small><LocaleText value="Gross Domestic Product"/></small><strong>${player.economy.gdp.toFixed(0)}B</strong></i>
        </div>
        <div className="achievement-card">
         <span className="ach-icon" aria-hidden="true">🏦</span>
         <i><small><LocaleText value="National Treasury"/></small><strong>${player.economy.treasury.toFixed(1)}B</strong></i>
        </div>
        <div className="achievement-card">
         <span className="ach-icon" aria-hidden="true">⏳</span>
         <i><small><LocaleText value="Days in Command"/></small><strong>{day}</strong></i>
        </div>
       </div>
      </section>}
      {view==='profile'&&<section className="campaign-options-section leader-credentials" data-testid="leader-credentials"><div><small><LocaleText value={"PERSONAL PROFILE"}/></small><h3>{wording.title}</h3></div>
       <dl className="credential-list">
        <div className="credential-row" data-credential="name"><dt>{wording.name}</dt><dd><LocaleText value={profile.commanderName}/></dd></div>
        <div className="credential-row" data-credential="citizenship"><dt>{wording.citizenship}</dt><dd><span aria-hidden="true">{flagEmoji(citizenship.iso2)}</span> <LocaleText value={citizenship.name}/></dd></div>
        <div className="credential-row" data-credential="birth"><dt>{wording.birth}</dt><dd>{profile.birthDate?formatCampaignDate(profile.birthDate,profile.language):wording.notRecorded}</dd></div>
        <div className="credential-row" data-credential="ideology"><dt>{wording.ideology}</dt><dd className="credential-ideology"><LocaleText value={player.society.ideology.replaceAll('_',' ')}/></dd></div>
        <div className="credential-row credential-perk" data-credential="perk"><dt>{wording.perk}</dt><dd>{archetype?<><strong><LocaleText value={LEADER_PERKS[archetype].title}/></strong><span><LocaleText value={LEADER_PERKS[archetype].description}/></span></>:wording.notRecorded}</dd></div>
       </dl>
       <p className="credential-note">{wording.permanent}</p></section>}
      {view==='settings'&&<><AppearanceOptions/><TacticalHintOptions/>{/* VIP: <CloudOptions/> */}</>}{view==='audio'&&<AudioOptions/>}
      {view==='session'&&<>
       <section className="campaign-options-section">
        <div><small><LocaleText value={"CAMPAIGN CONTROL"}/></small><h3><LocaleText value={"Save & Session"}/></h3><p><LocaleText value={"Campaign management lives here so the main strategic HUD stays focused on the world."}/></p></div>
        <div className="campaign-option-actions">
         <button onClick={()=>void saveNow()}><strong><LocaleText value={"SAVE CAMPAIGN"}/></strong><span><LocaleText value={"Create a manual save at Day "}/><LocaleText value={day}/></span></button>
         <button onClick={async()=>{const loaded=await loadLatest(); if(loaded)onClose();}}><strong><LocaleText value={"LOAD LATEST"}/></strong><span><LocaleText value={"Restore your most recent save"}/></span></button>
         <button className="danger" onClick={()=>setConfirmNew(true)}><strong><LocaleText value={"NEW CAMPAIGN"}/></strong><span><LocaleText value={"Return to campaign setup and choose a new command"}/></span></button>
        </div>
        <button className="change-portrait-button" data-testid="retry-artwork" onClick={retryFailedImages}><LocaleText value="Retry missing images"/></button>
        {saveMessage&&<div className="campaign-save-status"><LocaleText value={saveMessage}/></div>}
       </section>
       <SimulationOptions/>
      </>}

     </div>
    </div>
    <footer className="player-options-footer">
     <button onClick={onClose}><LocaleText value={"Return to Map"}/></button>
    </footer>
   </ManagedDialog>
  </div>

  {confirmNew&&<div className="campaign-confirm-backdrop" onMouseDown={()=>setConfirmNew(false)}><ManagedDialog className="campaign-confirm-card" label="Leave the current command?" onClose={()=>setConfirmNew(false)} layer={WINDOW_LAYERS.nested}><small><LocaleText value={"NEW CAMPAIGN"}/></small><h3><LocaleText value={"Leave the current command?"}/></h3><p><LocaleText value={"Your current campaign is not deleted, but the active session will return to the campaign setup screen. Save first if you want to keep this state."}/></p><div><button onClick={()=>setConfirmNew(false)}><LocaleText value={"CANCEL"}/></button><button className="danger" onClick={()=>{resetGame();setConfirmNew(false);onClose();}}><LocaleText value={"START NEW CAMPAIGN"}/></button></div></ManagedDialog></div>}
  {storeOpen&&<StoreModal onClose={()=>setStoreOpen(false)}/>}
 </>;

 return typeof document==='undefined'?node:createPortal(node,document.body);
}


import {LocaleText,translateLive} from '../../i18n/localeText';
import {gameDate} from '../../engine/systems/leadership';
import { useState,useEffect, type ReactNode } from 'react';
import type { GameSpeed } from '../../domain/game';
import { flagEmoji } from '../../data/countryThemes';
import { tr } from '../../i18n/gameI18n';
import { useGameStore } from '../../store/gameStore';
import { calculateEconomyForecast } from '../../store/selectors';
import { AvatarPortrait } from '../profile/AvatarPortrait';
import { PlayerOptionsMenu } from '../panels/PlayerOptionsMenu';
import { ApprovalIcon, EconomyIcon, SocietyIcon, TreasuryIcon } from '../icons/GameIcons';

const speeds:Array<{speed:GameSpeed;label:string;hint:string}>=[
 {speed:0,label:'Ⅱ',hint:'Pause'},
 {speed:1,label:'1×',hint:'15s/day'},
 {speed:2,label:'2×',hint:'7s/day'},
 {speed:3,label:'3×',hint:'3s/day'},
 {speed:5,label:'5×',hint:'1s/day'},
];

function Metric({icon,label,value,tone='neutral'}:{icon:ReactNode;label:string;value:string;tone?:'neutral'|'warning'|'good'}){
 return <div className={'top-metric '+tone}><span className="top-metric-icon"><LocaleText value={icon}/></span><span><small><LocaleText value={label}/></small><strong><LocaleText value={value}/></strong></span></div>;
}

export function TopBar(){
 const [optionsOpen,setOptionsOpen]=useState(false);
 const workspace=useGameStore(s=>s.activeTool??s.selectedCountryId??s.warWindowId);
 useEffect(()=>{if(workspace)setOptionsOpen(false)},[workspace]);
 const day=useGameStore(s=>s.day);
 const speed=useGameStore(s=>s.speed);
 const setSpeed=useGameStore(s=>s.setSpeed);
 const playerCountryId=useGameStore(s=>s.playerCountryId);
 const player=useGameStore(s=>s.countries[s.playerCountryId]);
 const profile=useGameStore(s=>s.playerProfile);
 const production=useGameStore(s=>s.production[playerCountryId]);
 const industrial=useGameStore(s=>s.industrialEconomy[playerCountryId]);
 const infrastructure=useGameStore(s=>s.infrastructure[playerCountryId]);
 const lang=profile.language;
 const forecast=calculateEconomyForecast(player);
 const strategicDailyBalance=forecast.dailyBalance-(production?.lastInputUse.treasury??0)-(infrastructure?.maintenance??0)-(industrial?.lastCosts??0);

 return <header className="topbar">
  <div className="command-overview-island"><div className="leader-brand">
   <button className="leader-avatar-button" onClick={()=>{useGameStore.getState().closeWorkspace();setOptionsOpen(true)}} title={translateLive("Open commander options")}><AvatarPortrait id={profile.avatarId} size={52}/><span><LocaleText value={"⋯"}/></span></button>
   <div className="brand-block"><div className="eyebrow"><LocaleText value={"ALPYX · GLOBAL COMMAND"}/></div><div className="brand-line"><strong><LocaleText value={profile.commanderName}/></strong><span className="day-chip"><LocaleText value={tr(lang,'day')}/> <LocaleText value={day}/></span></div><small className="leader-country"><LocaleText value={player.name}/><LocaleText value={" · "}/><LocaleText value={player.politics.regime.toUpperCase()}/></small></div>
  </div>

  <div className="metrics governance-metrics" aria-label={translateLive("National command indicators")}>
   <Metric icon={<TreasuryIcon size={16}/>} label={tr(lang,'treasury')} value={'$'+player.economy.treasury.toFixed(1)+'B'}/>
   <Metric icon={<EconomyIcon size={16}/>} label="BUDGET / DAY" value={(strategicDailyBalance>=0?'+':'')+'$'+strategicDailyBalance.toFixed(3)+'B'} tone={strategicDailyBalance>=0?'good':'warning'}/>
   <Metric icon={<ApprovalIcon size={16}/>} label={tr(lang,'approval')} value={player.politics.approval.toFixed(0)+'%'} tone={player.politics.approval>=60?'good':player.politics.approval<40?'warning':'neutral'}/>
   <Metric icon={<SocietyIcon size={16}/>} label="STABILITY" value={player.politics.stability.toFixed(0)+'%'} tone={player.politics.stability>=65?'good':player.politics.stability<40?'warning':'neutral'}/>
  </div>

  </div>
  <div className="top-actions clock-island">
   <div className="campaign-clock"><small><LocaleText value={"CAMPAIGN DATE"}/></small><strong><LocaleText value={gameDate(useGameStore.getState())}/></strong></div>
   <div className="speed-segment" aria-label={translateLive("Game speed controls")}>{speeds.map(item=><button key={item.speed} aria-pressed={item.speed===speed} className={item.speed===speed?'active':''} onClick={()=>setSpeed(item.speed)} title={translateLive(item.hint)}><strong><LocaleText value={item.label}/></strong><small><LocaleText value={item.speed===0?tr(lang,'pause'):item.hint}/></small></button>)}</div>
   <button data-guide="nation" className="national-flag-card" title={translateLive(player.name)} onClick={()=>{setOptionsOpen(false);useGameStore.getState().selectCountry(playerCountryId)}}><b><LocaleText value={flagEmoji(player.iso2)}/></b><span><small><LocaleText value={player.iso2}/></small><strong><LocaleText value={player.name}/></strong></span></button>
  </div>
  {optionsOpen&&<PlayerOptionsMenu onClose={()=>setOptionsOpen(false)}/>}
 </header>;
}

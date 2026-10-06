import { useState, type ReactNode } from 'react';
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
 return <div className={'top-metric '+tone}><span className="top-metric-icon">{icon}</span><span><small>{label}</small><strong>{value}</strong></span></div>;
}

export function TopBar(){
 const [optionsOpen,setOptionsOpen]=useState(false);
 const day=useGameStore(s=>s.day);
 const speed=useGameStore(s=>s.speed);
 const setSpeed=useGameStore(s=>s.setSpeed);
 const playerCountryId=useGameStore(s=>s.playerCountryId);
 const player=useGameStore(s=>s.countries[s.playerCountryId]);
 const profile=useGameStore(s=>s.playerProfile);
 const production=useGameStore(s=>s.production[playerCountryId]);
 const infrastructure=useGameStore(s=>s.infrastructure[playerCountryId]);
 const lang=profile.language;
 const forecast=calculateEconomyForecast(player);
 const strategicDailyBalance=forecast.dailyBalance-(production?.lastInputUse.treasury??0)-(infrastructure?.maintenance??0);

 return <header className="topbar">
  <div className="leader-brand">
   <button className="leader-avatar-button" onClick={()=>setOptionsOpen(true)} title="Open commander options"><AvatarPortrait id={profile.avatarId} size={52}/><span>⋯</span></button>
   <div className="brand-block"><div className="eyebrow">ALPYX // GLOBAL COMMAND · COMMAND & LOGISTICS 0.73 PLAYTEST</div><div className="brand-line"><strong>{profile.commanderName}</strong><span className="day-chip">{tr(lang,'day')} {day}</span></div><small className="leader-country">{player.name} · {player.politics.regime.toUpperCase()}</small></div>
  </div>

  <div className="metrics governance-metrics" aria-label="National command indicators">
   <Metric icon={<TreasuryIcon size={16}/>} label={tr(lang,'treasury')} value={'$'+player.economy.treasury.toFixed(1)+'B'}/>
   <Metric icon={<EconomyIcon size={16}/>} label="BUDGET / DAY" value={(strategicDailyBalance>=0?'+':'')+'$'+strategicDailyBalance.toFixed(3)+'B'} tone={strategicDailyBalance>=0?'good':'warning'}/>
   <Metric icon={<ApprovalIcon size={16}/>} label={tr(lang,'approval')} value={player.politics.approval.toFixed(0)+'%'} tone={player.politics.approval>=60?'good':player.politics.approval<40?'warning':'neutral'}/>
   <Metric icon={<SocietyIcon size={16}/>} label="STABILITY" value={player.politics.stability.toFixed(0)+'%'} tone={player.politics.stability>=65?'good':player.politics.stability<40?'warning':'neutral'}/>
  </div>

  <div className="top-actions">
   <div className="speed-segment" aria-label="Game speed controls">{speeds.map(item=><button key={item.speed} className={item.speed===speed?'active':''} onClick={()=>setSpeed(item.speed)} title={item.hint}><strong>{item.label}</strong><small>{item.speed===0?tr(lang,'pause'):item.hint}</small></button>)}</div>
   <div className="national-flag-card" title={player.name}><b>{flagEmoji(player.iso2)}</b><span><small>{player.iso2}</small><strong>{player.name}</strong></span></div>
  </div>
  {optionsOpen&&<PlayerOptionsMenu onClose={()=>setOptionsOpen(false)}/>}
 </header>;
}

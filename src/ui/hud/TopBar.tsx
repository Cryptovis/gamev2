import { useState, type ReactNode } from 'react';
import type { GameSpeed } from '../../domain/game';
import { flagEmoji } from '../../data/countryThemes';
import { tr } from '../../i18n/gameI18n';
import { useGameStore } from '../../store/gameStore';
import { AvatarPortrait } from '../profile/AvatarPortrait';
import { AvatarPicker } from '../panels/AvatarPicker';
import { ApprovalIcon, FoodIcon, FuelIcon, OilIcon, TreasuryIcon } from '../icons/GameIcons';

const speeds:Array<{speed:GameSpeed;label:string;hint:string}>=[
 {speed:0,label:'Ⅱ',hint:'Pause'},
 {speed:1,label:'1×',hint:'15s/day'},
 {speed:2,label:'2×',hint:'7s/day'},
 {speed:3,label:'3×',hint:'3s/day'},
 {speed:5,label:'5×',hint:'1s/day'},
];

function Metric({icon,label,value,tone='neutral'}:{icon:ReactNode;label:string;value:string;tone?:'neutral'|'warning'|'good'}){
 return <div className={`top-metric ${tone}`}><span className="top-metric-icon">{icon}</span><span><small>{label}</small><strong>{value}</strong></span></div>;
}

export function TopBar(){
 const [avatarOpen,setAvatarOpen]=useState(false);
 const day=useGameStore(s=>s.day);
 const speed=useGameStore(s=>s.speed);
 const setSpeed=useGameStore(s=>s.setSpeed);
 const player=useGameStore(s=>s.countries[s.playerCountryId]);
 const profile=useGameStore(s=>s.playerProfile);
 const saveNow=useGameStore(s=>s.saveNow);
 const loadLatest=useGameStore(s=>s.loadLatest);
 const reset=useGameStore(s=>s.resetGame);
 const msg=useGameStore(s=>s.saveMessage);
 const lang=profile.language;

 return <header className="topbar">
  <div className="leader-brand">
   <button className="leader-avatar-button" onClick={()=>setAvatarOpen(true)} title={tr(lang,'choose_avatar')}><AvatarPortrait id={profile.avatarId} size={52}/><span>✎</span></button>
   <div className="brand-block"><div className="eyebrow">ALPYX // GLOBAL COMMAND · INTERACTION WINDOWS 0.62 PLAYTEST</div><div className="brand-line"><strong>{profile.commanderName}</strong><span className="day-chip">{tr(lang,'day')} {day}</span></div><small className="leader-country">{player.name} · {player.politics.regime.toUpperCase()}</small></div>
  </div>

  <div className="metrics" aria-label="National resources">
   <Metric icon={<TreasuryIcon size={16}/>} label={tr(lang,'treasury')} value={`$${player.economy.treasury.toFixed(1)}B`}/>
   <Metric icon={<FoodIcon size={16}/>} label={tr(lang,'food')} value={player.resources.food.toFixed(0)} tone={player.resources.food<80?'warning':'neutral'}/>
   <Metric icon={<OilIcon size={16}/>} label={tr(lang,'oil')} value={player.resources.oil.toFixed(0)} tone={player.resources.oil<25?'warning':'neutral'}/>
   <Metric icon={<FuelIcon size={16}/>} label={tr(lang,'fuel')} value={player.processedResources.fuel.toFixed(0)} tone={player.processedResources.fuel<20?'warning':'neutral'}/>
   <Metric icon={<ApprovalIcon size={16}/>} label={tr(lang,'approval')} value={`${player.politics.approval.toFixed(0)}%`} tone={player.politics.approval>=60?'good':player.politics.approval<40?'warning':'neutral'}/>
  </div>

  <div className="top-actions">
   <div className="save-control"><button onClick={()=>void saveNow()}>{tr(lang,'save')}</button><button onClick={()=>void loadLatest()}>{tr(lang,'load')}</button><button onClick={reset}>{tr(lang,'new')}</button>{msg&&<small>{msg}</small>}</div>
   <div className="speed-segment" aria-label="Game speed controls">{speeds.map(item=><button key={item.speed} className={item.speed===speed?'active':''} onClick={()=>setSpeed(item.speed)} title={item.hint}><strong>{item.label}</strong><small>{item.speed===0?tr(lang,'pause'):item.hint}</small></button>)}</div>
   <div className="national-flag-card" title={player.name}><b>{flagEmoji(player.iso2)}</b><span><small>{player.iso2}</small><strong>{player.name}</strong></span></div>
  </div>
  {avatarOpen&&<AvatarPicker onClose={()=>setAvatarOpen(false)}/>}
 </header>;
}

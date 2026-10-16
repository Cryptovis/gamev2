import {leaderModifiers} from '../../engine/systems/leaderPerks';
import {LeaderCapsule,MetricsIsland} from './HudIslands';
import {displayCountry} from '../../presentation/countryIdentity';
import {BRAND_NAME} from '../BrandMark';
import {arrears} from '../../engine/systems/sovereignCredit';
import {CommandArt} from '../icons/CommandArt';
import {academyFor} from '../../engine/systems/governance';
import {LocaleText,translateLive} from '../../i18n/localeText';
import {gameDate} from '../../engine/systems/leadership';
import { useState,useEffect, type ReactNode } from 'react';
import type { GameSpeed } from '../../domain/game';
import { flagEmoji } from '../../data/countryThemes';
import { tr } from '../../i18n/gameI18n';
import { useGameStore } from '../../store/gameStore';
import { calculateEconomyForecast } from '../../store/selectors';
import { simulateResources } from '../../engine/systems/resources';
import { factionsFor } from '../../engine/systems/factions';
import { ARROW, liveDeltas, type LiveDelta } from './liveDeltas';
import { portraitMood } from './portraitMood';
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

const TREND_WORD:Record<LiveDelta['direction'],string>={up:'Rising',down:'Falling',flat:'Steady'};
/** Phase 6.5: a small change counter: arrow, signed amount and "/day". Colour is never the only signal (arrow shape, sign and a spoken word). */
function LiveChange({delta,unit=''}:{delta:LiveDelta;unit?:string}){
 return <em className={'live-delta '+delta.direction} data-delta={delta.id} aria-label={translateLive(TREND_WORD[delta.direction])+' '+delta.text+unit+' '+translateLive('/day')}><i aria-hidden="true">{ARROW[delta.direction]}</i> {delta.text}{unit}<LocaleText value={"/day"}/></em>;
}
function Metric({icon,label,value,tone='neutral',delta,id}:{icon:ReactNode;label:string;value:string;tone?:'neutral'|'warning'|'good';delta?:LiveDelta;id?:string}){
 return <div className={'top-metric '+tone} data-metric={id}><span className="top-metric-icon"><LocaleText value={icon}/></span><span><small><LocaleText value={label}/></small><strong><LocaleText value={value}/></strong>{delta&&<LiveChange delta={delta}/>}</span></div>;
}

export function TopBar(){
 const [optionsOpen,setOptionsOpen]=useState(false);
 const workspace=useGameStore(s=>s.activeTool??s.selectedCountryId??s.warWindowId);
 useEffect(()=>{if(workspace)setOptionsOpen(false)},[workspace]);
 const day=useGameStore(s=>s.day);
 const speed=useGameStore(s=>s.speed);
 const setSpeed=useGameStore(s=>s.setSpeed);
 const selectedCountryId=useGameStore(s=>s.selectedCountryId);
 const playerCountryId=useGameStore(s=>s.playerCountryId);
 const player=displayCountry(useGameStore(s=>s.countries[s.playerCountryId]));
 const profile=useGameStore(s=>s.playerProfile);
 const production=useGameStore(s=>s.production[playerCountryId]);
 const industrial=useGameStore(s=>s.industrialEconomy[playerCountryId]);
 const infrastructure=useGameStore(s=>s.infrastructure[playerCountryId]);
 const energy=useGameStore(s=>s.world.energy?.[playerCountryId]);
 const lang=profile.language;
 const mood=useGameStore(s=>{const p=s.countries[s.playerCountryId];return portraitMood({atWar:Object.values(s.wars).some(w=>w.status==='active'&&(w.attackerId===s.playerCountryId||w.defenderId===s.playerCountryId)),regimeCrisis:!!factionsFor(p).crisis,stability:p.politics.stability,approval:p.politics.approval});});
 const leadership=useGameStore(s=>s.leadership),perks=leaderModifiers({leadership,playerCountryId},player.id);
 const forecast=calculateEconomyForecast(player,perks);
 const strategicDailyBalance=forecast.dailyBalance-(production?.lastInputUse.treasury??0)-(infrastructure?.maintenance??0)-(industrial?.lastCosts??0)-(academyFor(useGameStore.getState(),playerCountryId).lastUpkeep)-(energy?.lastCosts??0);

 const flows=simulateResources(player,1,undefined,perks.consumer).net,deltas=liveDeltas({dailyBalance:strategicDailyBalance,net:flows}),byId=Object.fromEntries(deltas.map(d=>[d.id,d])) as Record<LiveDelta['id'],LiveDelta>;

 return <><div className="brand-watermark" translate="no">{BRAND_NAME}</div><header className="topbar">
  <div className="command-overview-island"><LeaderCapsule>
   <button className="leader-avatar-button" data-mood={mood} onClick={()=>{useGameStore.getState().openTool(null,false);setOptionsOpen(true)}} title={translateLive("Open commander options")}><AvatarPortrait id={profile.avatarId} size={52}/><span><LocaleText value={"⋯"}/></span>{mood!=='calm'&&<b className="mood-note"><LocaleText value={mood==='alarm'?'Crisis alert':'Prosperity'}/></b>}</button>
   <div className="brand-block"><div className="brand-line"><strong><LocaleText value={profile.commanderName}/></strong><span className="day-chip"><LocaleText value={tr(lang,'day')}/> <LocaleText value={day}/></span></div></div>
  </LeaderCapsule>

  <MetricsIsland label={translateLive("National command indicators")}>
   <Metric icon={<CommandArt kind="treasury" size={30}/>} label={arrears(useGameStore.getState(),player.id)>0?translateLive('Fiscal balance'):tr(lang,'treasury')} value={'$'+(player.economy.treasury-arrears(useGameStore.getState(),player.id)).toFixed(1)+'B'} delta={byId.treasury} id="treasury"/>
   <Metric icon={<CommandArt kind="production" size={30}/>} label="Food" value={player.resources.food.toFixed(0)+' '+translateLive('units')} delta={byId.food} id="food"/>
   <Metric icon={<CommandArt kind="economy" size={30}/>} label="Crude oil" value={player.resources.oil.toFixed(0)+' '+translateLive('units')} delta={byId.oil} id="oil"/>
   <Metric icon={<CommandArt kind="approval" size={30}/>} label={tr(lang,'approval')} value={player.politics.approval.toFixed(0)+'%'} tone={player.politics.approval>=60?'good':player.politics.approval<40?'warning':'neutral'}/>
   <Metric icon={<CommandArt kind="stability" size={30}/>} label="STABILITY" value={player.politics.stability.toFixed(0)+'%'} tone={player.politics.stability>=65?'good':player.politics.stability<40?'warning':'neutral'}/>
  </MetricsIsland>

  </div>
  <div className="top-actions clock-island">
   <div className="clock-speed-card">
   <div className="speed-segment" aria-label={translateLive("Game speed controls")}>{speeds.map(item=><button key={item.speed} aria-pressed={item.speed===speed} className={item.speed===speed?'active':''} onClick={()=>setSpeed(item.speed)} title={translateLive(item.hint)}><strong><LocaleText value={item.label}/></strong><small><LocaleText value={item.speed===0?tr(lang,'pause'):item.hint}/></small></button>)}</div>
   <div className="campaign-clock"><small><LocaleText value={"CAMPAIGN DATE"}/></small><strong><LocaleText value={gameDate(useGameStore.getState())}/></strong></div>
   </div>
   <button data-guide="nation" className="national-flag-card" aria-pressed={selectedCountryId===playerCountryId} title={translateLive("Open your nation")} aria-label={translateLive("Open your nation")} onClick={()=>{setOptionsOpen(false);useGameStore.getState().selectCountry(selectedCountryId===playerCountryId?null:playerCountryId)}}><b>{flagEmoji(player.iso2)}</b><span><strong><LocaleText value={player.name}/></strong><small><LocaleText value={player.politics.regime}/></small><em><LocaleText value={"Open your nation"}/></em></span></button>
  </div>
  {optionsOpen&&<PlayerOptionsMenu onClose={()=>setOptionsOpen(false)}/>}
 </header></>;
}

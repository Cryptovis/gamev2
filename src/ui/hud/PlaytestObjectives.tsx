import {LocaleText} from '../../i18n/localeText';
import { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';

export function PlaytestObjectives(){
 const [collapsed,setCollapsed]=useState(false);
 const state=useGameStore();
 const player=state.countries[state.playerCountryId];
 const objectives=useMemo(()=>[
  {id:'trade',label:'Establish a player trade flow',done:Object.values(state.tradeDeals).some((d)=>d.active&&(d.buyerId===player.id||d.sellerId===player.id))},
  {id:'intel',label:'Resolve a covert operation',done:Object.values(state.intelOperations).some((o)=>o.sourceCountryId===player.id&&o.status!=='active')},
  {id:'tech',label:'Unlock a technology',done:player.technology.unlocked.length>0},
  {id:'bloc',label:'Join or form an alliance bloc',done:Object.values(state.blocs).some((b)=>b.memberIds.includes(player.id))},
  {id:'war',label:'Execute a combat round',done:Object.values(state.wars).some((w)=>(w.attackerId===player.id||w.defenderId===player.id)&&w.rounds>0)},
  {id:'time',label:'Reach Day 30',done:state.day>=30},
 ],[state.tradeDeals,state.intelOperations,state.blocs,state.wars,state.day,player.id,player.technology.unlocked.length]);
 const complete=objectives.filter((o)=>o.done).length;
 return <aside className={`playtest-objectives ${collapsed?'collapsed':''}`}>
  <button className="playtest-header" onClick={()=>setCollapsed((v)=>!v)}><span><small><LocaleText value={"0.61 PLAYTEST"}/></small><strong><LocaleText value={"STRATEGIC OBJECTIVES"}/></strong></span><b><LocaleText value={complete}/><LocaleText value={"/"}/><LocaleText value={objectives.length}/></b></button>
  {!collapsed&&<><div className="playtest-progress"><i style={{width:`${complete/objectives.length*100}%`}}/></div><div className="objective-list">{objectives.map((o)=><div key={o.id} className={o.done?'done':''}><span><LocaleText value={o.done?'✓':'○'}/></span><p><LocaleText value={o.label}/></p></div>)}</div><footer><LocaleText value={"Use these as a guided systems check, then free-play at 5× and watch the Living World react."}/></footer></>}
 </aside>;
}

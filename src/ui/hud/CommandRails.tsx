import { useMemo, useState, type ReactNode } from 'react';
import { MARKET_RESOURCES, getMarketBoard, resourceReserveDays, resourceStrategicStatus } from '../../store/marketSelectors';
import { useGameStore } from '../../store/gameStore';
import { BlocIcon, CouncilIcon, DiplomacyIcon, EmbassyIcon, IntelligenceIcon, ResourceIcon, TreasuryIcon, WorldIcon } from '../icons/GameIcons';
import { DraggableWindow } from '../windows/DraggableWindow';
import { MapModeBar } from './MapModeBar';
import {IndustrialMarketPanel} from '../panels/IndustrialMarketPanel';
import { ResourceCommandWindow } from '../panels/ResourceCommandWindow';

type ToolId='objectives'|'market'|'pulse'|'map'|'resources'|'sitrep'|'alerts'|'diplomacy';

function RailButton({active,badge,label,children,onClick}:{active:boolean;badge?:number|string;label:string;children:ReactNode;onClick:()=>void}){
 return <button className={active?'rail-button active':'rail-button'} onClick={onClick} aria-pressed={active} title={`${label} · ${active?'Open — click to close':'Closed — click to open'}`}><span>{children}</span>{badge!==undefined&&badge!==0&&<b>{badge}</b>}<small>{label}</small></button>;
}

export function CommandRails(){
 const state=useGameStore();
 const [open,setOpen]=useState<Set<ToolId>>(()=>new Set());
 const player=state.countries[state.playerCountryId];
 const board=getMarketBoard(state);
 const activeWars=Object.values(state.wars).filter(w=>w.status==='active');
 const activeTrades=Object.values(state.tradeDeals).filter(d=>d.active);
 const activeOps=Object.values(state.intelOperations).filter(o=>o.status==='active');
 const sanctions=Object.values(state.countries).filter(c=>c.globalSanctions);
 const offers=state.diplomaticOffers.filter(o=>o.expiresDay>=state.day);
 const embassies=Object.values(state.embassies).filter(e=>e.countryA===player.id||e.countryB===player.id);
 const objectives=useMemo(()=>[
  {label:'Establish a player trade flow',done:activeTrades.some(d=>d.buyerId===player.id||d.sellerId===player.id)},
  {label:'Resolve a covert operation',done:Object.values(state.intelOperations).some(o=>o.sourceCountryId===player.id&&o.status!=='active')},
  {label:'Unlock a technology',done:player.technology.unlocked.length>0},
  {label:'Join or form an alliance bloc',done:Object.values(state.blocs).some(b=>b.memberIds.includes(player.id))},
  {label:'Execute a combat round',done:Object.values(state.wars).some(w=>(w.attackerId===player.id||w.defenderId===player.id)&&w.rounds>0)},
  {label:'Reach Day 30',done:state.day>=30},
 ],[state.tradeDeals,state.intelOperations,state.blocs,state.wars,state.day,player.id,player.technology.unlocked.length]);
 const critical=MARKET_RESOURCES.map(resource=>({resource,status:resourceStrategicStatus(player,resource),days:resourceReserveDays(player,resource)})).filter(x=>x.status==='CRITICAL'||x.status==='IMPORT NEED');
 const toggle=(id:ToolId)=>setOpen(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});
 const close=(id:ToolId)=>setOpen(prev=>{const n=new Set(prev);n.delete(id);return n;});
 const done=objectives.filter(x=>x.done).length;

 return <>
  <nav className="command-rail command-rail-left" aria-label="World command tools">
   <RailButton active={open.has('objectives')} badge={`${done}/6`} label="GOALS" onClick={()=>toggle('objectives')}><CouncilIcon size={20}/></RailButton>
   <RailButton active={open.has('market')} badge={activeTrades.length} label="MARKET" onClick={()=>toggle('market')}><TreasuryIcon size={20}/></RailButton>
   <RailButton active={open.has('pulse')} badge={activeWars.length} label="WORLD" onClick={()=>toggle('pulse')}><BlocIcon size={20}/></RailButton>
   <RailButton active={open.has('map')} label="MAP" onClick={()=>toggle('map')}><WorldIcon size={20}/></RailButton>
   <RailButton active={open.has('resources')} badge={critical.length} label="SUPPLY" onClick={()=>toggle('resources')}><ResourceIcon resource={critical[0]?.resource??'oil'} size={20}/></RailButton>
  </nav>
  <nav className={`command-rail command-rail-right ${state.selectedCountryId?'country-open':'country-closed'}`} aria-label="Information tools">
   <RailButton active={open.has('diplomacy')} badge={offers.length+state.leadership.messages.filter(m=>!m.read).length} label="DIPLO" onClick={()=>toggle('diplomacy')}><DiplomacyIcon size={20}/></RailButton>
   <RailButton active={open.has('alerts')} badge={critical.length} label="ALERTS" onClick={()=>toggle('alerts')}><ResourceIcon resource={critical[0]?.resource??'oil'} size={20}/></RailButton>
   <RailButton active={open.has('sitrep')} badge={state.sitrep.length} label="LOG" onClick={()=>toggle('sitrep')}><IntelligenceIcon size={20}/></RailButton>
  </nav>

  {open.has('map')&&<div className="left-command-dock map-command-dock"><MapModeBar/></div>}
  {open.has('resources')&&<ResourceCommandWindow onClose={()=>close('resources')}/>}

  {open.has('objectives')&&<DraggableWindow id="objectives-window" kicker="CAMPAIGN / GUIDANCE" title="Strategic Objectives" initialX={88} initialY={170} width={470} onClose={()=>close('objectives')}>
   <div className="floating-progress"><span><b>{done}</b> of {objectives.length} complete</span><i><b style={{width:`${done/objectives.length*100}%`}}/></i></div>
   <div className="floating-objectives">{objectives.map((o,i)=><div className={o.done?'done':''} key={o.label}><b>{o.done?'✓':String(i+1).padStart(2,'0')}</b><span><strong>{o.label}</strong><small>{o.done?'Completed':'Active objective'}</small></span></div>)}</div>
  </DraggableWindow>}

  {open.has('market')&&<DraggableWindow id="market-window" kicker="GLOBAL ECONOMY" title="Global Commodity & Industrial Market" initialX={110} initialY={135} width={760} onClose={()=>close('market')}>
   <div className="floating-market">{board.map(item=><div key={item.resource}><ResourceIcon resource={item.resource} size={24}/><span><small>{item.resource.toUpperCase()}</small><strong>${item.price.toFixed(3)}</strong></span><em>WORLD PRICE</em></div>)}</div>
   <IndustrialMarketPanel/>
   <div className="floating-note">{activeTrades.length} active global trade flows · prices react to world production and strategic scarcity.</div>
  </DraggableWindow>}

  {open.has('pulse')&&<DraggableWindow id="pulse-window" kicker="LIVING WORLD" title="World Pulse" initialX={145} initialY={240} width={520} onClose={()=>close('pulse')}>
   <div className="pulse-summary"><span className={activeWars.length?'danger-card':''}><small>ACTIVE WARS</small><strong>{activeWars.length}</strong></span><span><small>TRADE FLOWS</small><strong>{activeTrades.length}</strong></span><span><small>ACTIVE OPS</small><strong>{activeOps.length}</strong></span><span><small>BLOCS</small><strong>{Object.values(state.blocs).length}</strong></span><span><small>SANCTIONED</small><strong>{sanctions.length}</strong></span></div>
   <div className="world-activity-list">{activeWars.slice(0,4).map(w=><div key={w.id}><b>WAR</b><span>{state.countries[w.attackerId]?.name} ↔ {state.countries[w.defenderId]?.name}</span><em>{w.progress.toFixed(0)}%</em></div>)}{activeOps.slice(0,4).map(o=><div key={o.id}><b>INTEL</b><span>{state.countries[o.sourceCountryId]?.name} → {state.countries[o.targetCountryId]?.name}</span><em>D{o.completeDay}</em></div>)}{!activeWars.length&&!activeOps.length&&<p>No major military or covert activity currently detected.</p>}</div>
  </DraggableWindow>}

  {open.has('diplomacy')&&<DraggableWindow id="diplomacy-window" kicker="FOREIGN MINISTRY" title="Diplomatic Inbox" initialX={window.innerWidth-650} initialY={150} width={590} onClose={()=>close('diplomacy')}>
   <section className="diplomatic-messages"><header><strong>LEADER CORRESPONDENCE</strong><button onClick={state.readDiplomaticMessages}>MARK READ</button></header>{state.leadership.messages.map(m=><article key={m.id} className={m.tone}><small>{m.kind.toUpperCase()} · DAY {m.day} · {m.read?'READ':'NEW'}</small><strong>{state.countries[m.senderId]?.name}</strong><p>{m.text}</p></article>)}{!state.leadership.messages.length&&<p>Friends and rivals may react to your birthday and national achievements.</p>}</section>
   <div className="diplomatic-summary"><span><EmbassyIcon size={22}/><i><small>ACTIVE EMBASSIES</small><strong>{embassies.length}</strong></i></span><span><DiplomacyIcon size={22}/><i><small>PENDING OFFERS</small><strong>{offers.length}</strong></i></span></div>
   <div className="diplomatic-offer-list">{offers.length?offers.map(offer=>{const sender=state.countries[offer.senderId];return <article key={offer.id}><header><b>{sender?.iso2??'--'}</b><span><small>{offer.type==='embassy'?'EMBASSY EXCHANGE':'TRADE FRAMEWORK'}</small><strong>{sender?.name??offer.senderId}</strong></span><em>D{offer.expiresDay-state.day}</em></header><p>{offer.message}</p><div><button onClick={()=>state.resolveDiplomaticOffer(offer.id,false)}>DECLINE</button><button className="primary" onClick={()=>state.resolveDiplomaticOffer(offer.id,true)}>ACCEPT</button></div></article>}):<div className="diplomatic-empty"><DiplomacyIcon size={30}/><strong>No pending diplomatic proposals</strong><span>Foreign governments will contact you when relations and strategic interests align.</span></div>}</div>
  </DraggableWindow>}

  {open.has('alerts')&&<DraggableWindow id="alerts-window" kicker="NATIONAL SECURITY" title="Resource Alerts" initialX={window.innerWidth-560} initialY={175} width={500} onClose={()=>close('alerts')}>
   <div className="resource-alert-list">{MARKET_RESOURCES.map(resource=>{const status=resourceStrategicStatus(player,resource),days=resourceReserveDays(player,resource);return <div key={resource} className={status==='CRITICAL'?'critical':''}><ResourceIcon resource={resource} size={22}/><span><strong>{resource.toUpperCase()}</strong><small>{status}</small></span><em>{days>365?'365+':Math.max(0,days).toFixed(0)} DAYS</em></div>})}</div>
  </DraggableWindow>}

  {open.has('sitrep')&&<DraggableWindow id="sitrep-window" kicker="COMMAND CHANNEL" title="SITREP Archive" initialX={window.innerWidth-600} initialY={220} width={540} onClose={()=>close('sitrep')}>
   <div className="sitrep-archive">{state.sitrep.map((line,i)=><div key={`${i}-${line}`}><b>{String(i+1).padStart(2,'0')}</b><span>{line}</span></div>)}</div>
  </DraggableWindow>}
 </>;
}

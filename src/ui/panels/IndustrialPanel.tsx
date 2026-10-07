import {useState} from 'react';
import {ReviewDialog} from './ReviewDialog';
import {investmentReview,constructionRefund} from '../../engine/systems/investmentReview';
import {AssetThumbnail} from '../icons/AssetThumbnail';
import type {CountryState} from '../../domain/game';
import type {FacilityKind,IndustrialGood} from '../../domain/industrial';
import {FACILITIES,GOODS,MINERALS,TANK_COMPONENTS} from '../../data/industrialCatalog';
import {goodStock} from '../../engine/systems/industrialEconomy';
import {useGameStore} from '../../store/gameStore';
import {IndustryIcon,ResourceIcon,TankIcon} from '../icons/GameIcons';

export function IndustrialPanel({country}:{country:CountryState}){
 const [pending,setPending]=useState<FacilityKind|null>(null),[cancelId,setCancelId]=useState<string|null>(null);
 const state=useGameStore(),n=state.industrialEconomy[country.id],own=country.id===state.playerCountryId;
 if(!n)return null;
 return <section className="industrial-command">
  <header className="industrial-heading"><IndustryIcon size={30}/><div><small>REAL ECONOMY / INDUSTRIAL DEVELOPMENT</small><h3>National Industry</h3><p>Invest in extraction, turn raw materials into components, secure supply through trade.</p></div></header>
  <div className="industrial-summary"><span><small>OPERATING COST / DAY</small><b>${n.lastCosts.toFixed(3)}B</b></span><span><small>TRADE BALANCE / TOTAL</small><b className={n.lastTradeBalance>=0?'positive':'negative'}>${n.lastTradeBalance.toFixed(3)}B</b></span><span><small>ACTIVE CONSTRUCTION</small><b>{n.projects.length}/6</b></span></div>
  {own&&state.day<state.leadership.celebrationUntilDay&&<div className="celebration-banner">PUBLIC CELEBRATION · +12% production · {state.leadership.celebrationUntilDay-state.day} days remaining</div>}
  <div className="industry-chain"><span>MINERAL EXTRACTION</span><i>→</i><span>METALS & COMPONENTS</span><i>→</i><span><TankIcon size={17}/> VEHICLE ASSEMBLY</span></div>
  <div className="industrial-stock-grid">{(Object.keys(GOODS) as IndustrialGood[]).map(good=><article key={good} data-good={good}><AssetThumbnail asset={good}/><small>{GOODS[good].label}</small><b>{goodStock(state,country.id,good).toFixed(1)}</b><span>{GOODS[good].unit}{n.lastOutput[good]!==undefined?` · +${n.lastOutput[good]?.toFixed(2)}/day`:''}</span></article>)}</div>
  <div className="subhead">MINERAL RESERVES <small>game estimates · finite deposits</small></div>
  <div className="mineral-reserves">{MINERALS.map(mineral=><div key={mineral}><span>{GOODS[mineral].label}</span><b>{n.deposits[mineral].toFixed(0)}</b><progress max={Math.max(100,n.potential[mineral]*2000)} value={n.deposits[mineral]}/></div>)}</div>
  <div className="subhead">FACILITIES & INVESTMENT</div>
  <div className="facility-grid">{(Object.entries(FACILITIES) as Array<[FacilityKind,typeof FACILITIES[FacilityKind]]>).map(([kind,d])=>{
   const techReady=!d.tech||country.technology.unlocked.includes(d.tech),canBuild=own&&techReady&&country.economy.treasury>=d.cost&&n.projects.length<6&&(!d.deposit||n.deposits[d.deposit]>0);
   const inputs=Object.entries(d.inputs).map(([good,amount])=>`${amount} ${GOODS[good as IndustrialGood].label}`).join(' + ');
   return <article key={kind} className="facility-card"><header><IndustryIcon size={20}/><strong>{d.label}</strong><b>×{n.facilities[kind]}</b></header><p>{d.description}</p><small>{inputs||'Local resource potential'}{d.output?` → ${GOODS[d.output].label}`:''}</small><div className="facility-status">{n.facilities[kind]?n.enabled[kind]?(n.bottlenecks[kind]??'Ready'):'Paused':'Not built'}</div><footer>{own&&<><button disabled={!canBuild} title={!techReady?`Research ${d.tech}`:d.description} onClick={()=>setPending(kind)}>{!techReady?'RESEARCH REQUIRED':`REVIEW BUILD $${d.cost}B`}<small>{d.days} days</small></button><button disabled={!n.facilities[kind]} onClick={()=>state.toggleFacility(kind)}>{n.enabled[kind]?'PAUSE':'RESUME'}</button></>}</footer></article>;
  })}</div>
  {n.projects.length>0&&<div className="construction-list">{n.projects.map(p=><div key={p.id}><strong>{FACILITIES[p.kind].label}</strong><span>{Math.max(0,p.readyDay-state.day)} days to completion</span>{own&&<button onClick={()=>setCancelId(p.id)}>CANCEL / REFUND</button>}</div>)}</div>}
  <div className="assembly-card"><TankIcon size={30}/><div><strong>Armored Vehicle Assembly</strong><p>{Object.entries(TANK_COMPONENTS).map(([good,amount])=>`${amount} ${GOODS[good as IndustrialGood].label}`).join(' + ')} → 1 vehicle</p><small>Requires Armored Vehicle Assembly research plus assigned military factories, steel, fuel and power. Buy components if you cannot manufacture them locally.</small></div><b>{country.technology.unlocked.includes('mil-armor-assembly')?'RESEARCH READY':'TECH LOCKED'}</b></div>
 {pending&&<ReviewDialog {...investmentReview(state,pending)} onCancel={()=>setPending(null)} onConfirm={()=>{state.buildFacility(pending);setPending(null)}} confirmLabel="CONFIRM CONSTRUCTION"/>}
 {cancelId&&<ReviewDialog title="Cancel construction?" summary="Refund is 80% of the remaining unbuilt investment. Completed construction cannot be cancelled." metrics={[["Refund",`$${constructionRefund(state,cancelId).toFixed(3)}B`]]} onCancel={()=>setCancelId(null)} onConfirm={()=>{state.cancelConstruction(cancelId);setCancelId(null)}} confirmLabel="CANCEL PROJECT"/>}
 </section>;
}

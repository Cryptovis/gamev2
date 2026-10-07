import {LocaleText,translateLive} from '../../i18n/localeText';
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
  <header className="industrial-heading"><IndustryIcon size={30}/><div><small><LocaleText value={"REAL ECONOMY / INDUSTRIAL DEVELOPMENT"}/></small><h3><LocaleText value={"National Industry"}/></h3><p><LocaleText value={"Invest in extraction, turn raw materials into components, secure supply through trade."}/></p></div></header>
  <div className="industrial-summary"><span><small><LocaleText value={"OPERATING COST / DAY"}/></small><b><LocaleText value={"$"}/><LocaleText value={n.lastCosts.toFixed(3)}/><LocaleText value={"B"}/></b></span><span><small><LocaleText value={"TRADE BALANCE / TOTAL"}/></small><b className={n.lastTradeBalance>=0?'positive':'negative'}><LocaleText value={"$"}/><LocaleText value={n.lastTradeBalance.toFixed(3)}/><LocaleText value={"B"}/></b></span><span><small><LocaleText value={"ACTIVE CONSTRUCTION"}/></small><b><LocaleText value={n.projects.length}/><LocaleText value={"/6"}/></b></span></div>
  {own&&state.day<state.leadership.celebrationUntilDay&&<div className="celebration-banner"><LocaleText value={"PUBLIC CELEBRATION · +12% production · "}/><LocaleText value={state.leadership.celebrationUntilDay-state.day}/><LocaleText value={" days remaining"}/></div>}
  <div className="industry-chain"><span><LocaleText value={"MINERAL EXTRACTION"}/></span><i><LocaleText value={"→"}/></i><span><LocaleText value={"METALS & COMPONENTS"}/></span><i><LocaleText value={"→"}/></i><span><TankIcon size={17}/><LocaleText value={" VEHICLE ASSEMBLY"}/></span></div>
  <div className="industrial-stock-grid">{(Object.keys(GOODS) as IndustrialGood[]).map(good=><article key={good} data-good={good}><AssetThumbnail asset={good}/><small><LocaleText value={GOODS[good].label}/></small><b><LocaleText value={goodStock(state,country.id,good).toFixed(1)}/></b><span><LocaleText value={GOODS[good].unit}/><LocaleText value={n.lastOutput[good]!==undefined?` · +${n.lastOutput[good]?.toFixed(2)}/day`:''}/></span></article>)}</div>
  <div className="subhead"><LocaleText value={"MINERAL RESERVES "}/><small><LocaleText value={"game estimates · finite deposits"}/></small></div>
  <div className="mineral-reserves">{MINERALS.map(mineral=><div key={mineral}><span><LocaleText value={GOODS[mineral].label}/></span><b><LocaleText value={n.deposits[mineral].toFixed(0)}/></b><progress max={Math.max(100,n.potential[mineral]*2000)} value={n.deposits[mineral]}/></div>)}</div>
  <div className="subhead"><LocaleText value={"FACILITIES & INVESTMENT"}/></div>
  <div className="facility-grid">{(Object.entries(FACILITIES) as Array<[FacilityKind,typeof FACILITIES[FacilityKind]]>).map(([kind,d])=>{
   const techReady=!d.tech||country.technology.unlocked.includes(d.tech),canBuild=own&&techReady&&country.economy.treasury>=d.cost&&n.projects.length<6&&(!d.deposit||n.deposits[d.deposit]>0);
   const inputs=Object.entries(d.inputs).map(([good,amount])=>`${amount} ${GOODS[good as IndustrialGood].label}`).join(' + ');
   return <article key={kind} className="facility-card"><header><IndustryIcon size={20}/><strong><LocaleText value={d.label}/></strong><b><LocaleText value={"×"}/><LocaleText value={n.facilities[kind]}/></b></header><p><LocaleText value={d.description}/></p><small><LocaleText value={inputs||'Local resource potential'}/><LocaleText value={d.output?` → ${GOODS[d.output].label}`:''}/></small><div className="facility-status"><LocaleText value={n.facilities[kind]?n.enabled[kind]?(n.bottlenecks[kind]??'Ready'):'Paused':'Not built'}/></div><footer>{own&&<><button disabled={!canBuild} title={translateLive(!techReady?`Research ${d.tech}`:d.description)} onClick={()=>setPending(kind)}><LocaleText value={!techReady?'RESEARCH REQUIRED':`REVIEW BUILD $${d.cost}B`}/><small><LocaleText value={d.days}/><LocaleText value={" days"}/></small></button><button disabled={!n.facilities[kind]} onClick={()=>state.toggleFacility(kind)}><LocaleText value={n.enabled[kind]?'PAUSE':'RESUME'}/></button></>}</footer></article>;
  })}</div>
  {n.projects.length>0&&<div className="construction-list">{n.projects.map(p=><div key={p.id}><strong><LocaleText value={FACILITIES[p.kind].label}/></strong><span><LocaleText value={Math.max(0,p.readyDay-state.day)}/><LocaleText value={" days to completion"}/></span>{own&&<button onClick={()=>setCancelId(p.id)}><LocaleText value={"CANCEL / REFUND"}/></button>}</div>)}</div>}
  <div className="assembly-card"><TankIcon size={30}/><div><strong><LocaleText value={"Armored Vehicle Assembly"}/></strong><p><LocaleText value={Object.entries(TANK_COMPONENTS).map(([good,amount])=>`${amount} ${GOODS[good as IndustrialGood].label}`).join(' + ')}/><LocaleText value={" → 1 vehicle"}/></p><small><LocaleText value={"Requires Armored Vehicle Assembly research plus assigned military factories, steel, fuel and power. Buy components if you cannot manufacture them locally."}/></small></div><b><LocaleText value={country.technology.unlocked.includes('mil-armor-assembly')?'RESEARCH READY':'TECH LOCKED'}/></b></div>
 {pending&&<ReviewDialog {...investmentReview(state,pending)} onCancel={()=>setPending(null)} onConfirm={()=>{state.buildFacility(pending);setPending(null)}} confirmLabel="CONFIRM CONSTRUCTION"/>}
 {cancelId&&<ReviewDialog title={translateLive("Cancel construction?")} summary="Refund is 80% of the remaining unbuilt investment. Completed construction cannot be cancelled." metrics={[["Refund",`$${constructionRefund(state,cancelId).toFixed(3)}B`]]} onCancel={()=>setCancelId(null)} onConfirm={()=>{state.cancelConstruction(cancelId);setCancelId(null)}} confirmLabel="CANCEL PROJECT"/>}
 </section>;
}

import { useMemo, useState, type CSSProperties } from 'react';
import type { CountryState, WarState } from '../../domain/game';
import { calculateSupplyNetwork } from '../../engine/systems/supplyNetwork';
import { FuelIcon, FoodIcon, PowerIcon, SteelIcon } from '../icons/GameIcons';
import { CommandWindow } from './CommandWindow';

type SupplyTab='network'|'reserves'|'front';
const pct=(n:number)=>Math.max(0,Math.min(100,n));

function Ring({value,label}:{value:number;label:string}){return <div className="supply-ring" style={{'--ring':`${pct(value)}%`} as CSSProperties}><div><strong>{value.toFixed(0)}%</strong><small>{label}</small></div></div>;}

export function SupplyCommandWindow({country,war,onClose}:{country:CountryState;war?:WarState;onClose:()=>void}){
 const [tab,setTab]=useState<SupplyTab>('network');
 const side=war?(war.attackerId===country.id?'attacker':'defender'):'home';
 const terrain=war?.terrain??'plains';
 const supply=useMemo(()=>calculateSupplyNetwork(country,terrain,side),[country,terrain,side]);
 const frontSupply=war?(war.attackerId===country.id?war.attackerSupply:war.defenderSupply):supply.supplyScore;
 const exhaustion=war?(war.attackerId===country.id?war.attackerExhaustion:war.defenderExhaustion):0;
 return <CommandWindow kicker="LOGISTICS / SUPPLY COMMAND" title={`${country.name} Supply Network`} subtitle={war?`${terrain.toUpperCase()} theatre · active front logistics`:'National strategic logistics picture'} onClose={onClose} wide>
  <div className="command-subtabs">{(['network','reserves','front'] as SupplyTab[]).map((id)=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{id.toUpperCase()}</button>)}</div>
  <div className="supply-summary"><Ring value={supply.supplyScore} label="DELIVERY"/><Ring value={supply.logisticsEfficiency} label="LOGISTICS"/><Ring value={supply.infrastructure} label="INFRA"/><div className={`supply-bottleneck ${supply.bottleneck!=='none'?'warning':''}`}><small>PRIMARY BOTTLENECK</small><strong>{supply.bottleneck.toUpperCase()}</strong><span>Front demand {supply.frontDemand.toFixed(0)}/100</span></div></div>
  {tab==='network'&&<div className="supply-network-view"><svg viewBox="0 0 900 210" className="supply-flow-svg" aria-label="Supply network flow">
    <defs><linearGradient id="supplyLine" x1="0" x2="1"><stop stopColor="#4da8c4"/><stop offset="1" stopColor="#d4ad52"/></linearGradient></defs>
    {supply.stages.slice(0,-1).map((stage,i)=>{const next=supply.stages[i+1];const x1=115+i*220,x2=115+(i+1)*220;return <g key={stage.id}><line x1={x1} y1="88" x2={x2} y2="88" stroke="#193546" strokeWidth="14" strokeLinecap="round"/><line x1={x1} y1="88" x2={x1+(x2-x1)*Math.min(stage.value,next.value)/100} y2="88" stroke="url(#supplyLine)" strokeWidth="8" strokeLinecap="round"/></g>})}
    {supply.stages.map((stage,i)=>{const x=115+i*220;return <g key={stage.id} transform={`translate(${x} 88)`}><circle r="38" fill="#081b28" stroke={stage.value<40?'#c96566':'#588aa0'} strokeWidth="2"/><text textAnchor="middle" y="-3" className="supply-svg-value">{stage.value.toFixed(0)}%</text><text textAnchor="middle" y="16" className="supply-svg-label">{stage.label}</text><text textAnchor="middle" y="75" className="supply-svg-detail">{stage.detail}</text></g>})}
  </svg><div className="supply-doctrine"><div><small>THROUGHPUT</small><strong>{supply.throughput.toFixed(1)}%</strong></div><div><small>TERRAIN FACTOR</small><strong>{(supply.terrainFactor*100).toFixed(0)}%</strong></div><div><small>FRONT DELIVERY</small><strong>{frontSupply.toFixed(1)}%</strong></div><div><small>EXHAUSTION</small><strong>{exhaustion.toFixed(1)}%</strong></div></div></div>}
  {tab==='reserves'&&<div className="reserve-command-grid">
    <div className="reserve-command-card"><FuelIcon size={28}/><span><small>FUEL RESERVE</small><strong>{country.processedResources.fuel.toFixed(1)}</strong><em>{supply.fuelDays.toFixed(1)} operational days</em></span><i><b style={{width:`${pct(supply.fuelDays/45*100)}%`}}/></i></div>
    <div className="reserve-command-card"><SteelIcon size={28}/><span><small>STEEL RESERVE</small><strong>{country.processedResources.steel.toFixed(1)}</strong><em>{supply.steelDays.toFixed(1)} replacement days</em></span><i><b style={{width:`${pct(supply.steelDays/60*100)}%`}}/></i></div>
    <div className="reserve-command-card"><FoodIcon size={28}/><span><small>FOOD RESERVE</small><strong>{country.resources.food.toFixed(0)}</strong><em>{supply.foodDays.toFixed(1)} civilian days</em></span><i><b style={{width:`${pct(supply.foodDays/75*100)}%`}}/></i></div>
    <div className="reserve-command-card"><PowerIcon size={28}/><span><small>GRID POWER</small><strong>{country.processedResources.electricity.toFixed(1)}</strong><em>supports industrial throughput</em></span><i><b style={{width:`${pct(country.processedResources.electricity)}%`}}/></i></div>
  </div>}
  {tab==='front'&&<div className="front-command-view"><div className="front-command-hero"><small>{war?'ACTIVE THEATRE':'MOBILIZATION READINESS'}</small><strong>{war?terrain.toUpperCase():'NO ACTIVE FRONT'}</strong><p>{war?'Front delivery compares strategic reserves, transport efficiency, terrain and current force demand.':'This is the supply capacity available if the country mobilizes under normal terrain assumptions.'}</p></div><div className="front-bars">{[['Front supply',frontSupply],['Logistics',supply.logisticsEfficiency],['Infrastructure',supply.infrastructure],['Reserve factor',supply.reserveFactor*100],['Demand pressure',supply.frontDemand]].map(([label,value])=><div key={String(label)}><span>{label}</span><i><b className={Number(value)<40?'danger-bar':''} style={{width:`${pct(Number(value))}%`}}/></i><strong>{Number(value).toFixed(0)}%</strong></div>)}</div></div>}
 </CommandWindow>;
}

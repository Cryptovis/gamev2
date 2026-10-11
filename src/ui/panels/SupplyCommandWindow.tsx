import {LocaleText,translateLive} from '../../i18n/localeText';
import {ReviewDialog} from './ReviewDialog';
import {InfrastructureIcon} from '../icons/InfrastructureIcon';
import {AssetThumbnail} from '../icons/AssetThumbnail';
import { useMemo, useState, type CSSProperties } from 'react';
import type { CountryState, InfrastructureAsset, WarState } from '../../domain/game';
import { calculateSupplyNetwork } from '../../engine/systems/supplyNetwork';
import { infrastructureInvestmentCost, infrastructureInvestmentRule } from '../../engine/systems/infrastructure';
import { formatCostB } from '../../engine/systems/policyPressure';
import { useGameStore } from '../../store/gameStore';
import { FuelIcon, FoodIcon, PowerIcon, SteelIcon } from '../icons/GameIcons';
import { CommandWindow } from './CommandWindow';

type SupplyTab='network'|'infrastructure'|'reserves'|'front';
const pct=(n:number)=>Math.max(0,Math.min(100,n));

function Ring({value,label}:{value:number;label:string}){
 return <div className="supply-ring" style={{'--ring':pct(value)+'%'} as CSSProperties}><div><strong><LocaleText value={value.toFixed(0)}/><LocaleText value={"%"}/></strong><small><LocaleText value={label}/></small></div></div>;
}

export function SupplyCommandWindow({country,war,onClose}:{country:CountryState;war?:WarState;onClose:()=>void}){
 const [investment,setInvestment]=useState<InfrastructureAsset|null>(null);
 const [tab,setTab]=useState<SupplyTab>('network');
 const state=useGameStore();
 const infra=state.infrastructure[country.id];
 const isPlayer=country.id===state.playerCountryId;
 const side=war?(war.attackerId===country.id?'attacker':'defender'):'home';
 const terrain=war?.terrain??'plains';
 const supply=useMemo(()=>calculateSupplyNetwork(country,terrain,side,infra),[country,terrain,side,infra]);
 const frontSupply=war?(war.attackerId===country.id?war.attackerSupply:war.defenderSupply):supply.supplyScore;
 const exhaustion=war?(war.attackerId===country.id?war.attackerExhaustion:war.defenderExhaustion):0;

 return <CommandWindow kicker="LOGISTICS / SUPPLY COMMAND" title={`${translateLive(country.name)} · ${translateLive('Supply Network')}`} subtitle={war?terrain.toUpperCase()+' theatre · active front logistics':'National strategic logistics picture'} onClose={onClose} wide className="national-supply-window">
  <div className="command-subtabs">{(['network','infrastructure','reserves','front'] as SupplyTab[]).map((id)=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><LocaleText value={id[0].toUpperCase()+id.slice(1)}/></button>)}</div>

  <div className="supply-summary">
   <Ring value={supply.supplyScore} label="Delivery"/>
   <Ring value={supply.logisticsEfficiency} label="LOGISTICS"/>
   <Ring value={supply.infrastructure} label="INFRA"/>
   <div className={'supply-bottleneck '+(supply.bottleneck!=='none'?'warning':'')}><small><LocaleText value={"PRIMARY BOTTLENECK"}/></small><strong><LocaleText value={supply.bottleneck.toUpperCase()}/></strong><span><LocaleText value={"Front demand "}/><LocaleText value={supply.frontDemand.toFixed(0)}/><LocaleText value={"/100"}/></span></div>
  </div>

  {tab==='network'&&<div className="supply-network-view">
   <svg viewBox="0 0 900 210" className="supply-flow-svg" aria-label={translateLive("Supply network flow")}>
    <defs><linearGradient id="supplyLine" x1="0" x2="1"><stop stopColor="#4da8c4"/><stop offset="1" stopColor="#d4ad52"/></linearGradient></defs>
    {supply.stages.slice(0,-1).map((stage,i)=>{const next=supply.stages[i+1];const x1=115+i*220,x2=115+(i+1)*220;return <g key={stage.id}><line x1={x1} y1="88" x2={x2} y2="88" stroke="#193546" strokeWidth="14" strokeLinecap="round"/><line x1={x1} y1="88" x2={x1+(x2-x1)*Math.min(stage.value,next.value)/100} y2="88" stroke="url(#supplyLine)" strokeWidth="8" strokeLinecap="round"/></g>})}
    {supply.stages.map((stage,i)=>{const x=115+i*220;return <g key={stage.id} transform={'translate('+x+' 88)'}><circle r="38" fill="#081b28" stroke={stage.value<40?'#c96566':'#588aa0'} strokeWidth="2"/><text textAnchor="middle" y="-3" className="supply-svg-value"><LocaleText value={stage.value.toFixed(0)}/><LocaleText value={"%"}/></text><text textAnchor="middle" y="16" className="supply-svg-label"><LocaleText value={stage.label}/></text><text textAnchor="middle" y="75" className="supply-svg-detail"><LocaleText value={stage.detail}/></text></g>})}
   </svg>
   <div className="supply-doctrine"><div><small><LocaleText value={"THROUGHPUT"}/></small><strong><LocaleText value={supply.throughput.toFixed(1)}/><LocaleText value={"%"}/></strong></div><div><small><LocaleText value={"TERRAIN FACTOR"}/></small><strong><LocaleText value={(supply.terrainFactor*100).toFixed(0)}/><LocaleText value={"%"}/></strong></div><div><small><LocaleText value={"FRONT DELIVERY"}/></small><strong><LocaleText value={frontSupply.toFixed(1)}/><LocaleText value={"%"}/></strong></div><div><small><LocaleText value={"EXHAUSTION"}/></small><strong><LocaleText value={exhaustion.toFixed(1)}/><LocaleText value={"%"}/></strong></div></div>
  </div>}

  {tab==='infrastructure'&&<div className="infrastructure-command-view">
   <div className="infrastructure-summary">
    <span><small><LocaleText value={"NATIONAL THROUGHPUT"}/></small><strong><LocaleText value={(infra?.throughput??supply.infrastructure).toFixed(0)}/><LocaleText value={"%"}/></strong></span>
    <span><small><LocaleText value={"MAINTENANCE / DAY"}/></small><strong><LocaleText value={infra?'$'+infra.maintenance.toFixed(3)+'B':'N/A'}/></strong></span>
    <span><small><LocaleText value={"BOTTLENECK"}/></small><strong><LocaleText value={(infra?.bottleneck??supply.bottleneck).toUpperCase()}/></strong></span>
   </div>
   <div className="infrastructure-grid">{([
    ['roads','Road Network',infra?.roads??supply.infrastructure],
    ['rail','Rail Network',infra?.rail??supply.infrastructure],
    ['ports','Port Capacity',infra?.ports??0],
    ['hubs','Supply Hubs',infra?.hubs??supply.logisticsEfficiency],
   ] as [InfrastructureAsset,string,number][]).map(([asset,label,value])=>{
    const rule=infrastructureInvestmentRule(asset),cost=infrastructureInvestmentCost(state,country.id,asset);
    const disabled=!isPlayer||(asset==='ports'&&(infra?.ports??0)<=0)||country.economy.treasury<cost||value>=100;
    return <article key={asset} data-infrastructure={asset}>
     <header><InfrastructureIcon asset={asset}/><span><small><LocaleText value={label.toUpperCase()}/></small><strong><LocaleText value={value.toFixed(0)}/><LocaleText value={"%"}/></strong></span><em><LocaleText value={asset==='ports'&&(infra?.ports??0)<=0?'LANDLOCKED':'ACTIVE'}/></em></header>
     <i><b style={{width:pct(value)+'%'}}/></i>
     <p><LocaleText value={asset==='roads'?'Road quality affects domestic movement and last-mile supply.':asset==='rail'?'Rail capacity supports heavy strategic transport and wartime reinforcement.':asset==='ports'?'Ports support maritime logistics and overseas access.':'Supply hubs organize depots, reserves and front distribution.'}/></p>
     {isPlayer&&<button disabled={disabled} onClick={()=>setInvestment(asset)}><LocaleText value={"INVEST +"}/><LocaleText value={rule.gain}/> <small><LocaleText value={'-'+formatCostB(cost)}/></small></button>}
    </article>;
   })}</div>
   <p className="supply-investment-note"><LocaleText value={"Infrastructure consumes daily maintenance. Underfunded networks degrade slowly; AI states also invest in weak transport links during monthly strategic reviews."}/></p>
  </div>}

  {tab==='reserves'&&<div className="reserve-command-grid">
   <div className="reserve-command-card"><FuelIcon size={28}/><span><small><LocaleText value={"FUEL RESERVE"}/></small><strong><LocaleText value={country.processedResources.fuel.toFixed(1)}/></strong><em><LocaleText value={supply.fuelDays.toFixed(1)}/><LocaleText value={" operational days"}/></em></span><i><b style={{width:pct(supply.fuelDays/45*100)+'%'}}/></i></div>
   <div className="reserve-command-card"><SteelIcon size={28}/><span><small><LocaleText value={"STEEL RESERVE"}/></small><strong><LocaleText value={country.processedResources.steel.toFixed(1)}/></strong><em><LocaleText value={supply.steelDays.toFixed(1)}/><LocaleText value={" replacement days"}/></em></span><i><b style={{width:pct(supply.steelDays/60*100)+'%'}}/></i></div>
   <div className="reserve-command-card"><AssetThumbnail asset="food" size={48}/><span><small><LocaleText value={"FOOD RESERVE"}/></small><strong><LocaleText value={country.resources.food.toFixed(0)}/></strong><em><LocaleText value={supply.foodDays.toFixed(1)}/><LocaleText value={" civilian days"}/></em></span><i><b style={{width:pct(supply.foodDays/75*100)+'%'}}/></i></div>
   <div className="reserve-command-card"><PowerIcon size={28}/><span><small><LocaleText value={"GRID POWER"}/></small><strong><LocaleText value={country.processedResources.electricity.toFixed(1)}/></strong><em><LocaleText value={"supports industrial throughput"}/></em></span><i><b style={{width:pct(country.processedResources.electricity)+'%'}}/></i></div>
  </div>}

  {tab==='front'&&<div className="front-command-view">
   <div className="front-command-hero"><small><LocaleText value={war?'ACTIVE THEATRE':'MOBILIZATION READINESS'}/></small><strong><LocaleText value={war?terrain.toUpperCase():'NO ACTIVE FRONT'}/></strong><p><LocaleText value={war?'Front delivery compares strategic reserves, transport efficiency, terrain and current force demand.':'This is the supply capacity available if the country mobilizes under normal terrain assumptions.'}/></p></div>
   <div className="front-bars">{[['Front supply',frontSupply],['Logistics',supply.logisticsEfficiency],['Infrastructure',supply.infrastructure],['Reserve factor',supply.reserveFactor*100],['Demand pressure',supply.frontDemand]].map(([label,value])=><div key={String(label)}><span><LocaleText value={label}/></span><i><b className={Number(value)<40?'danger-bar':''} style={{width:pct(Number(value))+'%'}}/></i><strong><LocaleText value={Number(value).toFixed(0)}/><LocaleText value={"%"}/></strong></div>)}</div>
  </div>}
 {investment&&(()=>{const rule=infrastructureInvestmentRule(investment),cost=infrastructureInvestmentCost(state,country.id,investment),before=infra[investment],after=Math.min(100,before+rule.gain),additional=(after-before)*.00022*(investment==='ports'?.7:1);return <ReviewDialog title={translateLive("Invest in "+rule.label)} summary="Improve national delivery capacity. Maintenance is charged daily." metrics={[["Investment",formatCostB(cost)],["Treasury after",`$${(country.economy.treasury-cost).toFixed(3)}B`],["Capacity",`${before.toFixed(1)} → ${after.toFixed(1)}%`],["Additional daily maintenance",`$${additional.toFixed(4)}B`]]} onCancel={()=>setInvestment(null)} onConfirm={()=>{state.investInfrastructure(investment);setInvestment(null)}}/>;})()}
 </CommandWindow>;
}

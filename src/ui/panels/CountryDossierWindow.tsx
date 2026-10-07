import {useGameStore} from '../../store/gameStore';
import { useMemo, useState } from 'react';
import type { CountryState } from '../../domain/game';
import { calculateEconomicHealth, calculateIndustrialOutput, calculateMilitaryPower, calculateResourcePressure } from '../../store/selectors';
import { ReligionGlyph } from '../icons/GameIcons';
import { CommandWindow } from './CommandWindow';

type DossierTab='power'|'economy'|'society';
const clamp=(v:number)=>Math.max(0,Math.min(100,v));
function Radar({values}:{values:{label:string;value:number}[]}){
 const size=260,c=size/2,r=92,point=(i:number,value:number)=>{const a=-Math.PI/2+i*Math.PI*2/values.length,rr=r*clamp(value)/100;return [c+Math.cos(a)*rr,c+Math.sin(a)*rr]};
 const poly=values.map((v,i)=>point(i,v.value).join(',')).join(' ');
 return <svg viewBox={`0 0 ${size} ${size}`} className="dossier-radar">{[.25,.5,.75,1].map((scale)=><polygon key={scale} points={values.map((_,i)=>point(i,scale*100).join(',')).join(' ')} className="radar-grid"/>)}{values.map((v,i)=>{const [x,y]=point(i,100);return <g key={v.label}><line x1={c} y1={c} x2={x} y2={y} className="radar-axis"/><text x={c+(x-c)*1.18} y={c+(y-c)*1.18} textAnchor="middle" className="radar-label">{v.label}</text></g>})}<polygon points={poly} className="radar-value"/></svg>;
}
export function CountryDossierWindow({country,onClose}:{country:CountryState;onClose:()=>void}){
 const state=useGameStore();
 const [tab,setTab]=useState<DossierTab>('power');
 const radar=useMemo(()=>[
  {label:'ECON',value:calculateEconomicHealth(country)},
  {label:'MIL',value:country.military.assessment.capability},
  {label:'IND',value:clamp(calculateIndustrialOutput(country)*1.4)},
  {label:'STAB',value:country.politics.stability},
  {label:'LOG',value:country.military.logistics},
  {label:'TECH',value:country.military.technology},
 ],[country]);
 return <CommandWindow kicker="STRATEGIC DOSSIER" title={country.name} subtitle={`${country.politics.regime.replaceAll('_',' ')} · ${country.region||'Global'} · population ${(country.demographics.population/1e6).toFixed(1)}M`} onClose={onClose} wide>
   <div className="command-subtabs">{(['power','economy','society'] as DossierTab[]).map((id)=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{id.toUpperCase()}</button>)}</div>
   {tab==='power'&&<div className="dossier-power"><Radar values={radar}/><div className="dossier-score-stack"><div><small>COMPOSITE MILITARY POWER</small><strong>{calculateMilitaryPower(country).toLocaleString()}</strong></div><div><small>CONVENTIONAL CAPABILITY</small><strong>{country.military.assessment.capability.toFixed(1)}</strong></div><div><small>READINESS / LOGISTICS</small><strong>{country.military.readiness.toFixed(0)} / {country.military.logistics.toFixed(0)}</strong></div><div><small>TECHNOLOGY</small><strong>{country.military.technology.toFixed(0)}</strong></div></div></div>}
   {tab==='economy'&&<div className="dossier-economy-grid"><div><small>GDP</small><strong>${country.economy.gdp.toFixed(1)}B</strong></div><div><small>ECONOMIC HEALTH</small><strong>{calculateEconomicHealth(country)}%</strong></div><div><small>INDUSTRIAL OUTPUT</small><strong>{calculateIndustrialOutput(country)}</strong></div><div><small>RESOURCE PRESSURE</small><strong>{calculateResourcePressure(country)}%</strong></div><div><small>FACTORIES</small><strong>{country.industry.factories}</strong></div><div><small>REFINERIES</small><strong>{country.industry.refineries}</strong></div><div><small>MINES</small><strong>{country.industry.mines}</strong></div><div><small>POWER CAPACITY</small><strong>{country.industry.powerCapacity.toFixed(0)}</strong></div></div>}
   {tab==='society'&&<div className="dossier-society"><div className="religious-shares"><small>RELIGIOUS COMPOSITION · GAME ESTIMATES</small>{Object.entries(state.world.religiousShares[country.id]??{}).map(([r,v])=><span key={r}>{r.replaceAll('_',' ')}: {(v??0).toFixed(2)}%</span>)}</div><div className="dossier-identity"><ReligionGlyph religion={country.society.dominantReligion} size={44}/><span><small>DOMINANT RELIGION</small><strong>{country.society.dominantReligion.replaceAll('_',' ')}</strong></span><span><small>IDEOLOGY</small><strong>{country.society.ideology.replaceAll('_',' ')}</strong></span></div><div className="front-bars">{[['Stability',country.politics.stability],['Approval',country.politics.approval],['Cohesion',country.society.cohesion],['Secularization',country.society.secularization],['Ideology pressure',country.society.influencePressure.ideology]].map(([label,value])=><div key={String(label)}><span>{label}</span><i><b style={{width:`${Number(value)}%`}}/></i><strong>{Number(value).toFixed(0)}%</strong></div>)}</div></div>}
 </CommandWindow>;
}

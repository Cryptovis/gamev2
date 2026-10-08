import { useEffect, useRef, useState } from 'react';
import { Chart, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js';
import type { EconomicPoint } from '../../engine/systems/economicHistory';
import { LocaleText, translateLive } from '../../i18n/localeText';
import { useGameStore } from '../../store/gameStore';
Chart.register(LineController,LineElement,PointElement,CategoryScale,LinearScale,Tooltip,Filler);
const metrics={gdp:'GDP',treasury:'Treasury',inflation:'Inflation',treasuryChange:'Net treasury change'} as const;
export function EconomicTrends() {
  const history=useGameStore(s=>s.world.economicHistory),language=useGameStore(s=>s.playerProfile.language);
  const [metric,setMetric]=useState<keyof typeof metrics>('gdp'),[days,setDays]=useState(30),[table,setTable]=useState(false);
  const canvas=useRef<HTMLCanvasElement>(null),chart=useRef<Chart<'line'>>(null);
  const points=history?.points.filter(p=>p.day>history.points.at(-1)!.day-days)??[];
  useEffect(()=>{
    if(!canvas.current||points.length<2||table)return;
    chart.current=new Chart(canvas.current,{type:'line',data:{labels:points.map(p=>`${translateLive('Day')} ${p.day}`),datasets:[{label:`${translateLive(metrics[metric])} (${metric==='inflation'?'%':'USD B'})`,data:points.map(p=>p[metric]),borderColor:'#e1bc70',backgroundColor:'rgba(225,188,112,.12)',fill:true,pointRadius:points.length>30?0:2,tension:.2}]},options:{responsive:true,maintainAspectRatio:false,animation:matchMedia('(prefers-reduced-motion: reduce)').matches?false:{duration:350},scales:{x:{ticks:{color:'#bac9cc',maxTicksLimit:5},grid:{display:false}},y:{ticks:{color:'#bac9cc'},grid:{color:'rgba(180,200,205,.12)'}}}}});
    return ()=>{chart.current?.destroy();chart.current=null;};
  },[history,metric,days,table,language]);
  const format=(p:EconomicPoint)=>p[metric].toLocaleString(language,{maximumFractionDigits:metric==='treasuryChange'?3:2});
  return <section className="economic-trends" data-testid="economic-trends"><h3><LocaleText value="Economic history"/></h3><p><LocaleText value="Recorded daily observations. Old saves begin at the migration day; earlier values are not reconstructed."/></p><div className="economic-chart-controls"><select aria-label={translateLive('Economic metric')} value={metric} onChange={e=>setMetric(e.target.value as keyof typeof metrics)}>{Object.entries(metrics).map(([key,label])=><option key={key} value={key}>{translateLive(label)}</option>)}</select><select aria-label={translateLive('History range')} value={days} onChange={e=>setDays(Number(e.target.value))}>{[30,90,180].map(n=><option key={n} value={n}>{n} {translateLive('days')}</option>)}</select><button aria-pressed={table} onClick={()=>setTable(!table)}><LocaleText value={table?'Show chart':'Show data table'}/></button></div>
    {points.length<2?<p role="status"><LocaleText value="Advance a campaign day to record the next observation."/></p>:table?<div className="economic-table-scroll"><table><caption>{translateLive(metrics[metric])} · {metric==='inflation'?'%':'USD B'}</caption><thead><tr><th><LocaleText value="Day"/></th><th>{translateLive(metrics[metric])}</th></tr></thead><tbody>{[...points].reverse().map(p=><tr key={p.day}><td>{p.day}</td><td>{format(p)}</td></tr>)}</tbody></table></div>:<div className="economic-chart"><canvas ref={canvas} role="img" aria-label={`${translateLive(metrics[metric])} · ${points.length} ${translateLive('Recorded days')}`}/></div>}
    {points.length>0&&<div className="economic-trend-summary"><LocaleText value="Latest observation"/>: {format(points.at(-1)!)} {metric==='inflation'?'%':'USD B'} · {points.length} <LocaleText value="Recorded days"/></div>}
  </section>;
}

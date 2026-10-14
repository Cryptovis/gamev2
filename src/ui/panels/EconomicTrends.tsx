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
  const ready=points.length>=2&&!table;
  // Create the chart once per canvas mount; per-tick history changes update it in place below.
  useEffect(()=>{
    if(!canvas.current||!ready)return;
    chart.current=new Chart<'line'>(canvas.current,{type:'line',data:{labels:[],datasets:[{label:'',data:[],borderColor:'#e1bc70',backgroundColor:'rgba(225,188,112,.12)',fill:true,pointRadius:2,tension:.2}]},options:{responsive:true,maintainAspectRatio:false,animation:matchMedia('(prefers-reduced-motion: reduce)').matches?false:{duration:350},scales:{x:{ticks:{color:'#bac9cc',maxTicksLimit:5},grid:{display:false}},y:{ticks:{color:'#bac9cc'},grid:{color:'rgba(180,200,205,.12)'}}}}});
    // Canvas text cannot inherit CSS; follow the same semantic palette as its card.
    const applyPalette=()=>{
      const current=chart.current;if(!current)return;
      const style=getComputedStyle(document.documentElement),ink=style.getPropertyValue('--ink-muted').trim(),focus=style.getPropertyValue('--focus').trim();
      for(const key of ['x','y']){const axis=current.options.scales?.[key];if(axis){axis.ticks={...axis.ticks,color:ink};axis.grid={...axis.grid,color:style.getPropertyValue('--border').trim()};}}
      current.data.datasets[0].borderColor=focus;
      current.data.datasets[0].backgroundColor=/^#[0-9a-f]{6}$/i.test(focus)?`${focus}20`:style.getPropertyValue('--surface-inset').trim();
      current.update('none');
    };
    applyPalette();
    const themeObserver=new MutationObserver(applyPalette);themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    return ()=>{themeObserver.disconnect();chart.current?.destroy();chart.current=null;};
  },[ready]);
  useEffect(()=>{
    const current=chart.current;if(!current||!ready)return;
    const dataset=current.data.datasets[0];
    current.data.labels=points.map(p=>`${translateLive('Day')} ${p.day}`);
    dataset.label=`${translateLive(metrics[metric])} (${metric==='inflation'?'%':'USD B'})`;
    dataset.data=points.map(p=>p[metric]);
    dataset.pointRadius=points.length>30?0:2;
    current.update('none');
  },[ready,history,metric,days,language]);
  const format=(p:EconomicPoint)=>p[metric].toLocaleString(language,{maximumFractionDigits:metric==='treasuryChange'?3:2});
  return <section className="economic-trends" data-testid="economic-trends"><h3><LocaleText value="Economic history"/></h3><p><LocaleText value="Recorded daily observations. Old saves begin at the migration day; earlier values are not reconstructed."/></p><div className="economic-chart-controls"><select aria-label={translateLive('Economic metric')} value={metric} onChange={e=>setMetric(e.target.value as keyof typeof metrics)}>{Object.entries(metrics).map(([key,label])=><option key={key} value={key}>{translateLive(label)}</option>)}</select><select aria-label={translateLive('History range')} value={days} onChange={e=>setDays(Number(e.target.value))}>{[30,90,180].map(n=><option key={n} value={n}>{n} {translateLive('days')}</option>)}</select><button aria-pressed={table} onClick={()=>setTable(!table)}><LocaleText value={table?'Show chart':'Show data table'}/></button></div>
    {points.length<2?<p role="status"><LocaleText value="Advance a campaign day to record the next observation."/></p>:table?<div className="economic-table-scroll"><table><caption>{translateLive(metrics[metric])} · {metric==='inflation'?'%':'USD B'}</caption><thead><tr><th><LocaleText value="Day"/></th><th>{translateLive(metrics[metric])}</th></tr></thead><tbody>{[...points].reverse().map(p=><tr key={p.day}><td>{p.day}</td><td>{format(p)}</td></tr>)}</tbody></table></div>:<div className="economic-chart"><canvas ref={canvas} role="img" aria-label={`${translateLive(metrics[metric])} · ${points.length} ${translateLive('Recorded days')}`}/></div>}
    {points.length>0&&<div className="economic-trend-summary"><LocaleText value="Latest observation"/>: {format(points.at(-1)!)} {metric==='inflation'?'%':'USD B'} · {points.length} <LocaleText value="Recorded days"/></div>}
  </section>;
}

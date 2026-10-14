import { useEffect, useRef } from 'react';
import { Chart, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js';
import { translateLive } from '../../i18n/localeText';
import { money } from '../formatMoney';
Chart.register(LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler);

export interface CommodityChartProps {
  /** Daily closes, oldest first, already cut to the chosen range. */
  closes: number[];
  firstDay: number;
  label: string;
  language: string;
  /** Average cost of the player's holding, drawn as a dashed line. */
  avgCost?: number;
  fundamental: number;
  /** Days on which a shock started, marked on the price line. */
  shockDays: number[];
  rising: boolean;
}

/** Canvas labels use the same semantic palette as the enclosing exchange card. */
function applyPalette(current:Chart<'line'>,rising:boolean){
  const style=getComputedStyle(document.documentElement),color=(key:string)=>style.getPropertyValue(key).trim();
  for(const key of ['x','y']){const axis=current.options.scales?.[key];if(axis){axis.ticks={...axis.ticks,color:color('--ink-muted')};axis.grid={...axis.grid,color:color('--border')};}}
  const [price,cost,fair]=current.data.datasets,tone=color(rising?'--success':'--danger');
  price.borderColor=tone;price.backgroundColor=/^#[0-9a-f]{6}$/i.test(tone)?`${tone}20`:color('--surface-inset');price.pointBackgroundColor=color('--focus');
  cost.borderColor=color('--focus');fair.borderColor=color('--ink-muted');
}

/** Lazily loaded Chart.js price chart (same approach as EconomicTrends): created once, updated in place. */
export default function CommodityPriceChart({ closes, firstDay, label, language, avgCost, fundamental, shockDays, rising }: CommodityChartProps) {
  const canvas = useRef<HTMLCanvasElement>(null), chart = useRef<Chart<'line'>>(null),direction=useRef(rising);
  direction.current=rising;
  useEffect(() => {
    if (!canvas.current) return;
    chart.current = new Chart<'line'>(canvas.current, {
      type: 'line',
      data: { labels: [], datasets: [
        { label: '', data: [], borderColor: '#e1bc70', backgroundColor: 'rgba(225,188,112,.12)', fill: true, pointRadius: 0, borderWidth: 2, tension: 0.15 },
        { label: '', data: [], borderColor: 'rgba(113,201,232,.85)', borderDash: [6, 4], pointRadius: 0, borderWidth: 1.5, fill: false },
        { label: '', data: [], borderColor: 'rgba(186,201,204,.45)', borderDash: [2, 4], pointRadius: 0, borderWidth: 1, fill: false },
      ] },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 300 },
        interaction: { mode: 'index', intersect: false },
        plugins: { tooltip: { callbacks: { label: (item) => `${item.dataset.label}: ${money(Number(item.raw), language)}` } } },
        scales: {
          x: { ticks: { color: '#bac9cc', maxTicksLimit: 6 }, grid: { display: false } },
          y: { ticks: { color: '#bac9cc', callback: (v) => money(Number(v), language) }, grid: { color: 'rgba(180,200,205,.12)' } },
        },
      },
    });
    const repaint=()=>{const current=chart.current;if(current){applyPalette(current,direction.current);current.update('none');}};
    repaint();
    const observer=new MutationObserver(repaint);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    return () => { observer.disconnect();chart.current?.destroy(); chart.current = null; };
  }, [language]);
  useEffect(() => {
    const current = chart.current;
    if (!current) return;
    const shocks = new Set(shockDays);
    const [price, cost, fair] = current.data.datasets;
    current.data.labels = closes.map((_, i) => `${translateLive('Day')} ${firstDay + i}`);
    price.label = label;
    price.data = closes;

    price.pointRadius = closes.map((_, i) => (shocks.has(firstDay + i) ? 4 : 0));

    cost.label = translateLive('Average cost');
    cost.data = avgCost ? closes.map(() => avgCost) : [];
    fair.label = translateLive('Fundamental');
    fair.data = closes.map(() => fundamental);
    applyPalette(current,rising);
    current.update('none');
  }, [closes, firstDay, label, avgCost, fundamental, shockDays, rising, language]);
  return <canvas ref={canvas} role="img" aria-label={`${label} · ${closes.length} ${translateLive('days')}`} />;
}

import { useLayoutEffect, useRef, useState } from 'react';
import { useWorldView } from '../../store/useWorldView';
import { LocaleText, translateLive } from '../../i18n/localeText';
import { worldRankings, type RankingKind } from '../../engine/systems/worldRankings';
import { flagEmoji } from '../../data/countryThemes';
import { money } from '../formatMoney';
import { RANKING_HINTS } from '../hints/registry';
import { DraggableWindow } from '../windows/DraggableWindow';
import { SectionMenu } from '../windows/SectionMenu';
import { CommandArt } from '../icons/CommandArt';
export function WorldRankingsWindow() {
    const s = useWorldView(), [kind, setKind] = useState<RankingKind>('military');
    const [limit,setLimit]=useState(20),tableRef=useRef<HTMLDivElement>(null);
    // Measure actual translated rows: the viewport shows ten, while further pages remain scrollable.
    useLayoutEffect(()=>{
        const wrap=tableRef.current;if(!wrap)return;
        const measure=()=>{
            const table=wrap.querySelector('table');if(!table)return;
            const head=table.querySelector('thead')?.getBoundingClientRect().height??0;
            const height=Array.from(table.querySelectorAll('tbody tr')).slice(0,10).reduce((sum,row)=>sum+row.getBoundingClientRect().height,head);
            wrap.style.height=`${Math.ceil(height)}px`;
        };
        measure();const observer=new ResizeObserver(measure);observer.observe(wrap.querySelector('table')!);
        return()=>observer.disconnect();
    },[kind,limit,s.playerProfile.language]);
    const activeWars=Object.values(s.wars).filter(w=>w.status==='active');
    const rows = worldRankings(s, kind), rank = rows.findIndex(r => r.country.id === s.playerCountryId) + 1;
    const items = [{ id: 'military', label: 'Military ranking', icon: <CommandArt kind="military"/> }, { id: 'financial', label: 'Financial ranking', icon: <CommandArt kind="economy"/> }, { id: 'diplomacy', label: 'Diplomacy ranking', icon: <CommandArt kind="diplomacy"/> }];
    const labels = kind === 'military' ? ['Military power', 'Personnel', 'Readiness'] : kind === 'financial' ? ['GDP', 'Treasury', 'Debt / GDP', 'Credit rating'] : ['Diplomatic score', 'Reputation', 'Council influence', 'Allies'];
    return <DraggableWindow expanded id="pulse-window" kicker="LIVING WORLD" title={translateLive('World rankings')} initialX={0} initialY={110} width={940} onClose={s.closeWorkspace} hint={RANKING_HINTS[kind]}>
  <section className="world-activity"><h3><LocaleText value="World activities"/></h3><div className="world-activity-stats">{[['Active wars',activeWars.length],['Active trade flows',Object.values(s.tradeDeals).filter(d=>d.active).length],['Active operations',Object.values(s.intelOperations).filter(o=>o.status==='active').length],['Alliance blocs',Object.keys(s.blocs).length],['Sanctioned countries',Object.values(s.countries).filter(c=>c.globalSanctions).length]].map(([label,count])=><span key={label}><LocaleText value={label}/><b>{count}</b></span>)}</div>{activeWars.length>0&&<div className="world-active-wars">{activeWars.map(w=><button key={w.id} onClick={()=>s.openWarWindow(w.id)}><LocaleText value={s.countries[w.attackerId]?.name}/> → <LocaleText value={s.countries[w.defenderId]?.name}/></button>)}</div>}</section>
  <SectionMenu items={items} selected={kind} onSelect={id => {if(tableRef.current)tableRef.current.scrollTop=0;setKind(id as RankingKind);setLimit(20);}} contentId="world-ranking-content" label="World ranking sections"/>
  <section id="world-ranking-content"><div className="ranking-summary"><span><LocaleText value="Countries"/> <b>{rows.length}</b></span><span><LocaleText value="Your rank"/> <b>#{rank}</b></span><span><LocaleText value="Active wars"/> <b>{Object.values(s.wars).filter(w => w.status === 'active').length}</b></span></div>
  <div ref={tableRef} className="ranking-table-wrap" tabIndex={0} aria-label={translateLive("World rankings")} onScroll={e=>{const node=e.currentTarget;if(node.clientHeight>0&&node.scrollHeight-node.scrollTop-node.clientHeight<80)setLimit(Math.min(rows.length,limit+20));}}><table className="ranking-table"><thead><tr><th>#</th><th><LocaleText value="Country"/></th>{labels.map(label => <th key={label}><LocaleText value={label}/></th>)}</tr></thead><tbody>{rows.slice(0,limit).map((r, i) => <tr key={r.country.id} className={r.country.id === s.playerCountryId ? 'player-row' : ''}><td>{i + 1}</td><td><button onClick={() => { s.selectCountry(r.country.id); }}><span aria-hidden="true">{flagEmoji(r.country.iso2)}</span> <LocaleText value={r.country.name}/></button></td>{(kind === 'military' ? [r.score.toFixed(0), r.country.military.personnel.toLocaleString(s.playerProfile.language), `${r.country.military.readiness.toFixed(0)}%`] : kind === 'financial' ? [money(r.country.economy.gdp, s.playerProfile.language), money(r.country.economy.treasury, s.playerProfile.language), `${r.debtRatio.toFixed(1)}%`, r.rating.grade] : [r.score.toFixed(1), r.country.diplomacy.reputation.toFixed(1), r.influence.toFixed(1), r.allies]).map((value, j) => <td key={j}>{value}</td>)}</tr>)}</tbody></table></div></section>
 </DraggableWindow>;
}

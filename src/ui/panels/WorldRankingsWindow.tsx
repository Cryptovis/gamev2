import { useState } from 'react';
import { useWorldView } from '../../store/useWorldView';
import { LocaleText, translateLive } from '../../i18n/localeText';
import { worldRankings, type RankingKind } from '../../engine/systems/worldRankings';
import { flagEmoji } from '../../data/countryThemes';
import { money } from '../formatMoney';
import { DraggableWindow } from '../windows/DraggableWindow';
import { SectionMenu } from '../windows/SectionMenu';
import { CommandArt } from '../icons/CommandArt';
export function WorldRankingsWindow() {
    const s = useWorldView(), [kind, setKind] = useState<RankingKind>('military');
    const rows = worldRankings(s, kind), rank = rows.findIndex(r => r.country.id === s.playerCountryId) + 1;
    const items = [{ id: 'military', label: 'Military ranking', icon: <CommandArt kind="military"/> }, { id: 'financial', label: 'Financial ranking', icon: <CommandArt kind="economy"/> }, { id: 'diplomacy', label: 'Diplomacy ranking', icon: <CommandArt kind="diplomacy"/> }];
    const labels = kind === 'military' ? ['Military power', 'Personnel', 'Readiness'] : kind === 'financial' ? ['GDP', 'Treasury', 'Debt / GDP', 'Credit rating'] : ['Diplomatic score', 'Reputation', 'Council influence', 'Allies'];
    return <DraggableWindow id="pulse-window" kicker="LIVING WORLD" title={translateLive('World rankings')} initialX={0} initialY={150} width={860} onClose={s.closeWorkspace}>
  <SectionMenu items={items} selected={kind} onSelect={id => setKind(id as RankingKind)} contentId="world-ranking-content" label="World ranking sections"/>
  <section id="world-ranking-content"><div className="ranking-summary"><span><LocaleText value="Countries"/> <b>{rows.length}</b></span><span><LocaleText value="Your rank"/> <b>#{rank}</b></span><span><LocaleText value="Active wars"/> <b>{Object.values(s.wars).filter(w => w.status === 'active').length}</b></span></div>
  <p className="data-note"><LocaleText value={kind === 'military' ? 'Sorted by current military power; readiness and equipment change the score.' : kind === 'financial' ? 'Sorted by GDP. Credit ratings reflect simulated finances and repayment history.' : 'Score combines reputation (60%), council influence (30%) and up to 10 allied partners.'}/></p>
  <div className="ranking-table-wrap"><table className="ranking-table"><thead><tr><th>#</th><th><LocaleText value="Country"/></th>{labels.map(label => <th key={label}><LocaleText value={label}/></th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={r.country.id} className={r.country.id === s.playerCountryId ? 'player-row' : ''}><td>{i + 1}</td><td><button onClick={() => { s.closeWorkspace(); s.selectCountry(r.country.id); }}><span aria-hidden="true">{flagEmoji(r.country.iso2)}</span> <LocaleText value={r.country.name}/></button></td>{(kind === 'military' ? [r.score.toFixed(0), r.country.military.personnel.toLocaleString(s.playerProfile.language), `${r.country.military.readiness.toFixed(0)}%`] : kind === 'financial' ? [money(r.country.economy.gdp, s.playerProfile.language), money(r.country.economy.treasury, s.playerProfile.language), `${r.debtRatio.toFixed(1)}%`, r.rating.grade] : [r.score.toFixed(1), r.country.diplomacy.reputation.toFixed(1), r.influence.toFixed(1), r.allies]).map((value, j) => <td key={j}>{value}</td>)}</tr>)}</tbody></table></div></section>
 </DraggableWindow>;
}

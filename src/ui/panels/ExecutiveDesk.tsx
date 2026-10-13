import { useEffect, useMemo, useState } from 'react';
import { LocaleText, translateLive } from '../../i18n/localeText';
import { flagEmoji } from '../../data/countryThemes';
import { useGameStore } from '../../store/gameStore';
import { useWorldView } from '../../store/useWorldView';
import { money } from '../formatMoney';
import { DraggableWindow } from '../windows/DraggableWindow';
import { ReviewDialog } from './ReviewDialog';
import { AssetThumbnail } from '../icons/AssetThumbnail';
import { CivicArt } from '../icons/CivicArt';
import { CommandArt } from '../icons/CommandArt';
import { deskCounts, deskNews, deskOffers, deskOperations, deskWars, DESK_TABS, type DeskCountdown, type DeskOffer, type DeskTab } from './executiveDeskModel';

const TAB_META: Record<DeskTab, { icon: string; label: string; empty: string }> = {
  diplomacy: { icon: '✉️', label: 'Diplomacy', empty: 'No proposals are waiting for your answer.' },
  war: { icon: '🪖', label: 'Wars', empty: 'Your country is at peace.' },
  intel: { icon: '🕵️', label: 'Intelligence & crises', empty: 'No covert operation is running.' },
};
const OPERATION_LABEL = { gather_intelligence: 'Gather Intelligence', influence_campaign: 'Influence Campaign', sabotage_industry: 'Sabotage Industry', counter_network: 'Counter Network' } as const;

function Countdown({ value, kind }: { value: DeskCountdown; kind: 'expiry' | 'result' }) {
  const text = kind === 'expiry'
    ? value.lastDay ? 'Last day' : value.daysLeft === 1 ? 'Time left: 1 day' : `Time left: ${value.daysLeft} days`
    : value.lastDay ? 'Result today' : value.daysLeft === 1 ? 'Result in 1 day' : `Result in ${value.daysLeft} days`;
  return <span className={`desk-countdown${value.urgent ? ' urgent' : ''}`} data-days={value.daysLeft}><LocaleText value={text} /> <span aria-hidden="true">⏳</span></span>;
}

/**
 * Phase 6.2: the executive desk. Three tabs gather proposals with their expiry countdown, the player's wars and
 * running operations, and the matching news. Accepting a proposal is reviewed (shared fee) and declining is
 * immediate; both send the typed `diplomacy/resolveLetter` command. The desk keeps no state of its own.
 */
export function ExecutiveDesk({ onClose }: { onClose: () => void }) {
  const state = useWorldView();
  const [tab, setTab] = useState<DeskTab>('diplomacy');
  const navigation = useGameStore(s => s.navigation);
  useEffect(() => { if (navigation?.intent?.kind === 'diplomatic-inbox' && navigation.intent.tab === 'offers') setTab('diplomacy'); }, [navigation]);
  const [review, setReview] = useState<DeskOffer | null>(null);
  const counts = useMemo(() => deskCounts(state), [state]);
  const offers = useMemo(() => deskOffers(state), [state]);
  const wars = useMemo(() => deskWars(state), [state]);
  const operations = useMemo(() => deskOperations(state), [state]);
  const news = useMemo(() => deskNews(state, tab), [state, tab]);
  const language = state.playerProfile.language;
  const player = state.countries[state.playerCountryId];
  const name = (id: string) => state.countries[id]?.name ?? id;
  const flag = (id: string) => flagEmoji(state.countries[id]?.iso2 ?? '');

  const tabEmpty = (tab === 'diplomacy' && !offers.length) || (tab === 'war' && !wars.length) || (tab === 'intel' && !operations.length);
  return <DraggableWindow id="desk-window" kicker="EXECUTIVE OFFICE" title={translateLive('Executive Desk')} initialX={window.innerWidth - 690} initialY={130} width={630} expanded onClose={onClose}>
    <div className="executive-desk">
      <div className="desk-tabs" role="tablist" aria-label={translateLive('Executive Desk')}>
        {DESK_TABS.map((id) => <button key={id} role="tab" id={`desk-tab-${id}`} aria-selected={tab === id} aria-controls="desk-panel" data-desk-tab={id} onClick={() => setTab(id)}>
          <span aria-hidden="true">{TAB_META[id].icon}</span><LocaleText value={TAB_META[id].label} />{counts[id] > 0 && <b>{counts[id]}</b>}
        </button>)}
      </div>

      <div id="desk-panel" role="tabpanel" aria-labelledby={`desk-tab-${tab}`} className="desk-panel">
        {tab === 'diplomacy' && offers.map((offer) => <article key={offer.id} className={`desk-card${offer.countdown.urgent ? ' urgent' : ''}`} data-letter-id={offer.id}>
          <div className="desk-card-art">{offer.kind === 'embassy' ? <AssetThumbnail asset="embassy" size={72} /> : <CivicArt kind="trade" size={72} />}</div>
          <div className="desk-card-body">
            <header><span className="desk-flag" aria-hidden="true">{flag(offer.senderId)}</span><div><small><LocaleText value={offer.kind === 'embassy' ? 'EMBASSY EXCHANGE' : 'TRADE FRAMEWORK'} /></small><h4><LocaleText value={name(offer.senderId)} /></h4></div><Countdown value={offer.countdown} kind="expiry" /></header>
            <p><LocaleText value={offer.message} /></p>
            <p className="desk-card-cost"><LocaleText value="Your share" />: <b>{money(offer.playerShareB, language)}</b> · <LocaleText value="Partner share" />: <b>{money(offer.partnerShareB, language)}</b></p>
            <div className="desk-card-actions">
              <button className="desk-decline" onClick={() => state.dispatchWithReceipt(offer.decline)}><LocaleText value="Decline" /></button>
              <button className="desk-accept" disabled={!offer.affordable} title={offer.affordable ? undefined : translateLive('Insufficient treasury for the fee if accepted.')} onClick={() => setReview(offer)}><LocaleText value="Accept" /></button>
            </div>
          </div>
        </article>)}

        {tab === 'war' && wars.map((war) => <article key={war.id} className="desk-card tone-war" data-war-id={war.id}>
          <div className="desk-card-art"><CommandArt kind="war" size={72} /></div>
          <div className="desk-card-body">
            <header><span className="desk-flag" aria-hidden="true">{flag(war.enemyId)}</span><div><small><LocaleText value={war.defending ? 'DEFENDING' : 'ATTACKING'} /></small><h4><LocaleText value={name(war.enemyId)} /></h4></div></header>
            <div className="desk-front"><span><LocaleText value="FRONT PROGRESS" /></span><strong className={war.front >= 0 ? 'positive' : 'negative'}>{war.front >= 0 ? '+' : ''}{war.front.toFixed(1)}</strong><i aria-hidden="true"><b style={{ width: `${(war.front + 100) / 2}%` }} /></i></div>
            <p><LocaleText value="Rounds" />: {war.rounds} · <LocaleText value="Day" /> {war.startedDay}</p>
            <div className="desk-card-actions"><button className="desk-accept" onClick={() => state.openWarWindow(war.id)}><LocaleText value="OPEN WAR COMMAND" /></button></div>
          </div>
        </article>)}

        {tab === 'intel' && operations.map((op) => <article key={op.id} className="desk-card tone-intel" data-operation-id={op.id}>
          <div className="desk-card-art"><CommandArt kind="intel" size={72} /></div>
          <div className="desk-card-body">
            <header><span className="desk-flag" aria-hidden="true">{flag(op.targetId)}</span><div><small><LocaleText value={OPERATION_LABEL[op.type]} /></small><h4><LocaleText value={name(op.targetId)} /></h4></div><Countdown value={op.countdown} kind="result" /></header>
          </div>
        </article>)}

        {tabEmpty && <p className="desk-empty"><LocaleText value={TAB_META[tab].empty} /></p>}

        <section className="desk-news" aria-label={translateLive('Latest reports')}>
          <h4><LocaleText value="Latest reports" /></h4>
          {news.length ? <ol>{news.map((item) => <li key={item.id}><small>{item.day !== null ? <><LocaleText value="Day" /> {item.day} · </> : null}<LocaleText value={item.category} /></small><span><LocaleText value={item.text} /></span></li>)}</ol>
            : <p className="desk-empty"><LocaleText value="No reports in this section yet." /></p>}
        </section>
      </div>
      {player && <p className="desk-footnote"><LocaleText value="Proposals expire on their last day. Declining is free; accepting shares the setup fee with the sender." /></p>}
    </div>
    {review && <ReviewDialog title="Accept shared proposal" summary="Both countries pay half of the diplomatic setup fee. This opens the agreement; goods still require separate priced shipments."
      metrics={[['Your share', money(review.playerShareB, language)], ['Partner share', money(review.partnerShareB, language)], ['Treasury after', money((player?.economy.treasury ?? 0) - review.playerShareB, language)]]}
      allowed={review.affordable} onCancel={() => setReview(null)}
      onConfirm={(commandId) => { state.dispatchWithReceipt({ ...review.accept, commandId }); setReview(null); }} />}
  </DraggableWindow>;
}

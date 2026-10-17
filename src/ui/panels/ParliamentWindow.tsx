import { useState } from 'react';
import type { GameCommand } from '../../domain/commands';
import type { ParliamentEntry, StrikeLevel, TalksOffer } from '../../domain/parliament';
import type { FactionKey } from '../../domain/politics';
import { BLOC_LABEL, LOYAL_SATISFACTION, PARTNER_PATIENCE_DAYS } from '../../engine/systems/parliamentSeats';
import { parliamentView, type ActionStatus, type BlocView, type ParliamentView } from '../../engine/systems/parliament';
import { STRIKE_START, type GrievanceKey, type StrikeRisk } from '../../engine/systems/parliamentStrikes';
import { formatCostB } from '../../engine/systems/policyPressure';
import { formatLive, LocaleText, translateLive } from '../../i18n/localeText';
import { useGameStore } from '../../store/gameStore';
import { useStoreView } from '../../store/useStoreView';
import { CommandWindow } from './CommandWindow';
import { ReviewDialog } from './ReviewDialog';
import { HEMICYCLE_HEIGHT, HEMICYCLE_ORDER, HEMICYCLE_WIDTH, SEAT_RADIUS, hemicycleLayout } from './hemicycle';

/**
 * Phase 9.8: the Parliament window. The chamber (a seating chart, the cabinet's majority and the mandate it gives), the
 * five blocs (each with the actions the engine allows), and the strike panel (risk, effects, causes and the talks
 * dialog). Every number comes from `parliamentView`; every action is a typed command, and a button that cannot be used
 * carries the engine's own reason.
 */
const LEVEL_TEXT: Record<StrikeLevel, string> = { none: 'No strike', local: 'Local strikes', sectoral: 'Sectoral strikes', general: 'General strike' };
const RISK_TEXT: Record<StrikeRisk, string> = { calm: 'Calm', rising: 'Tension rising', danger: 'Strike danger', striking: 'On strike' };
const DRIVER_TEXT: Record<GrievanceKey, string> = {
  unions: 'The unions are unhappy', approval: 'The government is unpopular', inflation: 'Prices are running away',
  unemployment: 'Too many people are jobless', welfare: 'Welfare has been cut', austerity: 'Austerity in the budget', wages: 'Civil wages are unpaid',
};
const OFFER_TEXT: Record<TalksOffer, { name: string; detail: string }> = {
  agreement: { name: 'Collective agreement', detail: 'Pay a settlement and sign a deal that holds for four months. Prices rise a little.' },
  shorterHours: { name: 'Shorter working hours', detail: 'A shorter week for everyone. Business objects and output stays slightly lower.' },
  wageSubsidy: { name: 'Wage subsidy', detail: 'The treasury tops up wages every day for six months.' },
  crackdown: { name: 'Police crackdown', detail: 'Break the strike by force. The street and the liberals will not forgive it.' },
};
const HISTORY_TEXT: Record<ParliamentEntry['kind'], string> = {
  seated: 'A new chamber was seated', partnerLeft: '{0} left the cabinet', partnerJoined: '{0} joined the cabinet', motion: 'A vote of no confidence was tabled',
  survived: 'The government survived a confidence vote', resigned: 'The cabinet resigned after losing a vote', snap: 'A snap election was called',
  strike: 'Strikes broke out', general: 'A general strike began', agreement: 'Talks with the unions: {0}', riot: 'Riots in the streets',
};
type Dispatch = (command: GameCommand) => void;

const why = (status: ActionStatus) => (status.allowed ? undefined : formatLive(status.reason, (status.args ?? []).map(translateLive)));
const pct = (value: number) => `${Math.max(0, Math.min(100, value))}%`;
const percent = (fraction: number) => `${Math.round(fraction * 100)}%`;

export function ParliamentIcon({ size = 24 }: { size?: number }) {
  return (
    <svg className="parliament-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20h18M5 20v-8M9.5 20v-8M14.5 20v-8M19 20v-8M3 12l9-7 9 7" /><circle cx="12" cy="9.2" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Hemicycle({ view }: { view: ParliamentView }) {
  const blocs = HEMICYCLE_ORDER.map(key => view.blocs.find(b => b.key === key)!);
  const dots = hemicycleLayout(blocs.map(b => b.seats));
  return (
    <svg className="hemicycle" data-testid="hemicycle" viewBox={`0 0 ${HEMICYCLE_WIDTH} ${HEMICYCLE_HEIGHT}`} role="img"
      aria-label={formatLive('Chamber of {0} seats. The cabinet holds {1}.', [String(view.totalSeats), String(view.cabinetSeats)])}>
      {dots.map((dot, i) => {
        const bloc = blocs[dot.group];
        const state = bloc.inCabinet ? 'cabinet' : bloc.supportUntil !== null ? 'support' : 'opposition';
        return <circle key={i} className={`seat bloc-${bloc.key} is-${state}`} data-bloc={bloc.key} data-state={state} cx={dot.x} cy={dot.y} r={SEAT_RADIUS} />;
      })}
    </svg>
  );
}

function Chamber({ view, onSnap }: { view: ParliamentView; onSnap: () => void }) {
  const need = view.majority;
  const short = view.reliable < need;
  return (
    <section className="par-panel par-chamber" aria-labelledby="par-h-chamber" data-testid="parliament-chamber">
      <h3 id="par-h-chamber"><LocaleText value="The chamber" /></h3>
      {view.cabinet === 'caretaker' && <p className="par-alert is-risk" role="alert" data-testid="parliament-caretaker"><LocaleText value="The cabinet has resigned. A caretaker government rules until the election." /></p>}
      {view.motion && <p className="par-alert is-risk" role="alert" data-testid="parliament-motion">{formatLive('A vote of no confidence is due in {0} days.', [String(view.motion.daysLeft)])}</p>}
      {!view.electoral && <p className="par-note" data-testid="parliament-appointed"><LocaleText value="The assembly is appointed. This regime does not answer to a free vote." /></p>}
      <Hemicycle view={view} />
      <ul className="par-legend" aria-label={translateLive('Seats by bloc')}>
        {HEMICYCLE_ORDER.map(key => {
          const b = view.blocs.find(x => x.key === key)!;
          return (
            <li key={key} className={`bloc-${key}`}>
              <i className="swatch" aria-hidden="true" /><span><LocaleText value={BLOC_LABEL[key]} /></span><b data-testid={`bloc-seats-${key}`}>{b.seats}</b>
            </li>
          );
        })}
      </ul>
      <div className="par-majority" data-testid="parliament-majority">
        <div className="par-majority-head">
          <span><LocaleText value="Reliable votes for the government" /></span>
          <b data-testid="parliament-reliable" className={short ? 'is-short' : ''}>{view.reliable} / {need}</b>
        </div>
        <div className="par-meter" role="meter" aria-valuemin={0} aria-valuemax={view.totalSeats} aria-valuenow={view.reliable} aria-label={translateLive('Reliable votes for the government')}>
          <span className="par-fill" style={{ width: pct((view.reliable / view.totalSeats) * 100) }} />
          <span className="par-tick" style={{ left: pct((need / view.totalSeats) * 100) }} aria-hidden="true" />
        </div>
        <small data-testid="parliament-cabinet-seats">{formatLive('The cabinet holds {0} seats on paper. Backing parties add {1}.', [String(view.cabinetSeats), String(view.supportSeats)])}</small>
      </div>
      {view.electoral && (
        <p className={`par-mandate ${view.mandate.ok ? 'is-ok' : 'is-blocked'}`} data-testid="parliament-mandate" data-ok={view.mandate.ok}>
          {view.mandate.reason === 'caretaker' ? <LocaleText value="A caretaker cabinet cannot declare war or reform taxes." />
            : view.mandate.ok ? <LocaleText value="The chamber backs the government. War and tax reform can pass." />
              : formatLive('The government holds {0} of the {1} votes it needs. War and tax reform are blocked.', [String(view.mandate.seats), String(view.mandate.needed)])}
        </p>
      )}
      {view.electoral && view.electionDays !== null && (
        <div className="par-election" data-testid="parliament-election">
          <span>{formatLive('Next election in {0} days', [String(view.electionDays)])}</span>
          {view.winChance !== null && <small>{formatLive('Expected vote {0}%, chance of winning {1}', [String(view.governmentShare), percent(view.winChance)])}</small>}
          <button type="button" className="quiet" data-testid="parliament-snap" disabled={!view.snap.allowed} title={why(view.snap)} onClick={onSnap}><LocaleText value="Call a snap election" /></button>
        </div>
      )}
      {view.lastVote && <small data-testid="parliament-lastvote">{formatLive('Last confidence vote: {0} for, {1} against', [String(view.lastVote.ayes), String(view.lastVote.noes)])}</small>}
    </section>
  );
}

function BlocCard({ bloc, view, dispatch }: { bloc: BlocView; view: ParliamentView; dispatch: Dispatch }) {
  const fire = (type: 'parliament/inviteBloc' | 'parliament/dismissBloc' | 'parliament/courtSupport' | 'parliament/concede', faction: FactionKey) => dispatch({ type, faction } as GameCommand);
  const key = bloc.key;
  return (
    <article className={`par-bloc bloc-${key}`} data-testid={`bloc-card-${key}`} data-cabinet={bloc.inCabinet} aria-labelledby={`par-bloc-${key}`}>
      <header>
        <i className="swatch" aria-hidden="true" />
        <h4 id={`par-bloc-${key}`}><LocaleText value={BLOC_LABEL[key]} /></h4>
        <span className="par-seats"><b>{bloc.seats}</b> <small><LocaleText value="seats" /></small></span>
      </header>
      <div className="par-badges">
        {bloc.lead && <span className="par-badge is-lead"><LocaleText value="Premier" /></span>}
        {bloc.inCabinet && !bloc.lead && <span className="par-badge is-cabinet"><LocaleText value="In the cabinet" /></span>}
        {bloc.supportUntil !== null && <span className="par-badge is-support">{formatLive('Backs the government until day {0}', [String(bloc.supportUntil)])}</span>}
        {bloc.concession && <span className="par-badge is-concession"><LocaleText value="Courted" /></span>}
      </div>
      <div className="par-satisfaction">
        <span><LocaleText value="Satisfaction" /></span><b>{Math.round(bloc.satisfaction)}</b>
        <div className="par-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(bloc.satisfaction)} aria-label={translateLive('Satisfaction')}>
          <span className="par-fill" style={{ width: pct(bloc.satisfaction) }} />
          <span className="par-tick" style={{ left: pct(LOYAL_SATISFACTION) }} aria-hidden="true" />
        </div>
      </div>
      <small>{formatLive('{0}% of the country, {1}% of the chamber', [String(bloc.strength), String(bloc.share)])}</small>
      {bloc.inCabinet && !bloc.lead && bloc.unhappyDays > 0 && (
        <small className="par-warn" data-testid={`bloc-unhappy-${key}`}>{formatLive('Close to walking out: {0} of {1} days', [String(bloc.unhappyDays), String(PARTNER_PATIENCE_DAYS)])}</small>
      )}
      {view.electoral && (
        <div className="par-actions">
          {bloc.inCabinet ? (
            <button type="button" className="quiet" data-testid={`bloc-dismiss-${key}`} disabled={!bloc.dismiss.allowed} title={why(bloc.dismiss)} onClick={() => fire('parliament/dismissBloc', key)}><LocaleText value="Drop from the cabinet" /></button>
          ) : (
            <>
              <button type="button" data-testid={`bloc-invite-${key}`} disabled={!bloc.invite.allowed} title={why(bloc.invite)} onClick={() => fire('parliament/inviteBloc', key)}><LocaleText value="Invite to the cabinet" /></button>
              <button type="button" data-testid={`bloc-court-${key}`} disabled={!bloc.court.allowed} title={why(bloc.court)} onClick={() => fire('parliament/courtSupport', key)}><LocaleText value="Buy their support" /><b>{formatCostB(bloc.court.costB)}</b></button>
            </>
          )}
          <button type="button" className="quiet" data-testid={`bloc-concede-${key}`} disabled={!view.bargain.allowed} title={why(view.bargain)} onClick={() => fire('parliament/concede', key)}><LocaleText value="Make concessions" /><b>{formatCostB(view.bargain.costB)}</b></button>
        </div>
      )}
    </article>
  );
}

function Strikes({ view, onTalks }: { view: ParliamentView; onTalks: () => void }) {
  const s = view.strike;
  const open = s.talks.some(t => t.allowed);
  return (
    <section className={`par-panel par-strikes risk-${s.risk}`} aria-labelledby="par-h-strike" data-testid="strike-card" data-level={s.level}>
      <h3 id="par-h-strike"><LocaleText value="Unions and strikes" /></h3>
      <p className="par-risk" data-testid="strike-risk"><b><LocaleText value={RISK_TEXT[s.risk]} /></b><span data-testid="strike-level"><LocaleText value={LEVEL_TEXT[s.level]} /></span></p>
      <div className="par-unrest">
        <div className="par-majority-head"><span><LocaleText value="Grievance" /></span><b data-testid="strike-unrest">{Math.round(s.unrest)}</b></div>
        <div className="par-meter strike-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(s.unrest)} aria-label={translateLive('Grievance')}>
          <span className="par-fill" style={{ width: pct(s.unrest) }} />
          {Object.values(STRIKE_START).map(at => <span key={at} className="par-tick" style={{ left: pct(at) }} aria-hidden="true" />)}
        </div>
        <small data-testid="strike-forecast">
          {s.daysToStrike !== null ? formatLive('At this pace the next stage of strikes begins in about {0} days.', [String(s.daysToStrike)])
            : s.dailyChange < -0.05 ? translateLive('Grievance is falling.') : translateLive('Grievance is holding steady.')}
        </small>
      </div>
      <dl className="par-effects" data-testid="strike-effects">
        <div><dt><LocaleText value="Factory output" /></dt><dd data-testid="strike-effect-output">{percent(s.effect.output)}</dd></div>
        <div><dt><LocaleText value="Trade flow" /></dt><dd data-testid="strike-effect-logistics">{percent(s.effect.logistics)}</dd></div>
        <div><dt><LocaleText value="Tax revenue lost" /></dt><dd data-testid="strike-effect-tax">{percent(s.effect.taxLoss)}</dd></div>
        <div><dt><LocaleText value="Public disorder" /></dt><dd data-testid="strike-disorder">{Math.round(s.disorder)}</dd></div>
      </dl>
      {s.drivers.length > 0 ? (
        <ul className="par-drivers" aria-label={translateLive('What is pushing the unions')}>
          {s.drivers.map(d => (
            <li key={d.key} data-testid={`strike-driver-${d.key}`}><span><LocaleText value={DRIVER_TEXT[d.key]} /></span><i style={{ width: pct(Math.min(100, d.perDay * 120)) }} aria-hidden="true" /></li>
          ))}
        </ul>
      ) : <small><LocaleText value="Nothing is pushing the unions toward the picket line." /></small>}
      {s.agreementUntil !== null && <small className="par-note" data-testid="strike-agreement">{formatLive('A collective agreement holds until day {0}.', [String(s.agreementUntil)])}</small>}
      {s.subsidyUntil !== null && <small className="par-note" data-testid="strike-subsidy">{formatLive('The wage subsidy is paid until day {0}.', [String(s.subsidyUntil)])}</small>}
      <button type="button" className="par-primary" data-testid="strike-open-talks" disabled={!open} title={open ? undefined : why({ allowed: false, reason: s.talks[0]?.reason ?? 'The unions have no complaint to bring to the table.', args: s.talks[0]?.args, costB: 0 })} onClick={onTalks}>
        <LocaleText value="Open talks with the unions" />
      </button>
    </section>
  );
}

function TalksDialog({ view, dispatch, onClose }: { view: ParliamentView; dispatch: Dispatch; onClose: () => void }) {
  const first = view.strike.talks.find(t => t.allowed)?.offer ?? 'agreement';
  const [offer, setOffer] = useState<TalksOffer>(first);
  const chosen = view.strike.talks.find(t => t.offer === offer)!;
  return (
    <ReviewDialog
      title="Talks with the unions"
      summary="Choose what to put on the table. Each further offer within a year is less effective."
      confirmLabel="MAKE THE OFFER"
      allowed={chosen.allowed}
      onCancel={onClose}
      onConfirm={() => { dispatch({ type: 'parliament/negotiate', offer }); onClose(); }}
      warnings={offer === 'crackdown' ? ['A crackdown costs approval and the liberals, and it can feed the disorder.'] : []}
    >
      <div className="par-talks" role="radiogroup" aria-label={translateLive('Offers')} data-testid="talks-dialog">
        {view.strike.talks.map(t => (
          <button key={t.offer} type="button" role="radio" aria-checked={t.offer === offer} className={`par-offer ${t.offer === offer ? 'is-chosen' : ''}`} data-testid={`talks-option-${t.offer}`} disabled={!t.allowed} title={why(t)} onClick={() => setOffer(t.offer)}>
            <strong><LocaleText value={OFFER_TEXT[t.offer].name} /></strong>
            <span><LocaleText value={OFFER_TEXT[t.offer].detail} /></span>
            <small>{formatLive('Grievance -{0}', [String(t.relief)])}{t.costB > 0 ? ` · ${formatCostB(t.costB)}` : ''}</small>
          </button>
        ))}
      </div>
    </ReviewDialog>
  );
}

function History({ view }: { view: ParliamentView }) {
  if (view.history.length === 0) return null;
  return (
    <section className="par-panel par-history" aria-labelledby="par-h-history">
      <h3 id="par-h-history"><LocaleText value="Record" /></h3>
      <ol data-testid="parliament-history">
        {view.history.map((h, i) => (
          <li key={`${h.day}-${i}`}>
            <small>{formatLive('Day {0}', [String(h.day)])}</small>
            <span>{formatLive(HISTORY_TEXT[h.kind], [h.detail ? translateLive(BLOC_LABEL[h.detail as FactionKey] ?? (OFFER_TEXT[h.detail as TalksOffer]?.name ?? LEVEL_TEXT[h.detail as StrikeLevel] ?? h.detail)) : ''])}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Opens from the player's country panel. */
export function ParliamentWindow({ onClose }: { onClose: () => void }) {
  const view = useStoreView(s => parliamentView(s, s.playerCountryId));
  const dispatch = useGameStore(s => s.dispatch);
  const [talks, setTalks] = useState(false);
  const [snap, setSnap] = useState(false);
  return (
    <CommandWindow kicker="DOMESTIC // PARLIAMENT" title="Parliament" subtitle="Seats, coalition and the unions" onClose={onClose} wide className="parliament-window">
      <div data-testid="parliament-window">
        {!view.ready ? (
          <p className="par-empty" data-testid="parliament-waiting"><LocaleText value="The chamber meets after the first day of the campaign." /></p>
        ) : (
          <div className="par-grid">
            <div className="par-col">
              <Chamber view={view} onSnap={() => setSnap(true)} />
              <div className="par-blocs" data-testid="parliament-blocs">{HEMICYCLE_ORDER.map(key => <BlocCard key={key} bloc={view.blocs.find(b => b.key === key)!} view={view} dispatch={dispatch} />)}</div>
            </div>
            <div className="par-col">
              <Strikes view={view} onTalks={() => setTalks(true)} />
              <History view={view} />
            </div>
          </div>
        )}
        {talks && <TalksDialog view={view} dispatch={dispatch} onClose={() => setTalks(false)} />}
        {snap && (
          <ReviewDialog
            title="Call a snap election"
            summary="The country votes within a month. A win resets the electoral clock; a defeat ends your government."
            warnings={['If the opposition wins, the campaign is lost.']}
            confirmLabel="CALL THE ELECTION"
            onCancel={() => setSnap(false)}
            onConfirm={() => { dispatch({ type: 'parliament/snapElection' }); setSnap(false); }}
          />
        )}
      </div>
    </CommandWindow>
  );
}

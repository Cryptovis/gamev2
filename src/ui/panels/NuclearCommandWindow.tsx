import { useState, type ReactNode } from 'react';
import type { GameCommand } from '../../domain/commands';
import { ENRICH_LEVELS, LEVEL_ASSAY, type EnrichLevel, type FeedSource, type IaeaStatus } from '../../domain/nuclear';
import { BLOCK_SIZE, MAX_BLOCKS_PER_SITE, WARHEAD_KG } from '../../engine/systems/nuclearEnrichment';
import { ASSEMBLY_BATCH, ASSEMBLY_MAX_LEVEL, BUILD_BASE, DETERRENCE_SHIELD, LOW_DETERRENCE, SURVIVAL } from '../../engine/systems/nuclearForces';
import { nuclearView, type NuclearBlock, type NuclearView, type SiteView } from '../../engine/systems/nuclear';
import { formatCostB } from '../../engine/systems/policyPressure';
import { formatLive, LocaleText, translateLive } from '../../i18n/localeText';
import { useGameStore } from '../../store/gameStore';
import { useStoreView } from '../../store/useStoreView';
import { CommandWindow } from './CommandWindow';
import { ReviewDialog } from './ReviewDialog';

/**
 * Phase 9.7: Nuclear Command. Three columns: enrichment (cascades and the assay ladder), strategic forces (warheads, the
 * triad, deterrence) and the IAEA (safeguards rating, suspicion, the case). Every number comes from `nuclearView`; every
 * action is a typed command, and the buttons are disabled with the engine's own reason.
 */
export const BLOCK_TEXT: Record<NuclearBlock, string> = {
  no_tech: 'Research Civil Nuclear Infrastructure first',
  no_funds: 'Not enough funds',
  site_limit: 'The site limit is reached',
  no_site: 'No such site',
  block_limit: 'The hall is at full size',
  no_assembly: 'Needs a warhead assembly line',
  assembly_max: 'The assembly line is at its highest level',
  assembling: 'The assembly line is being expanded',
  no_material: 'Not enough weapons-grade material',
  rest: 'The assembly line is resting between batches',
  no_launcher: 'No ballistic missile submarines',
  treaty_left: 'The state has left the treaty',
  treaty_party: 'Only a treaty party can do this',
  feed: 'That feed is not below the target assay',
  wgu_declared: 'A declared site cannot enrich to weapons grade',
  already: 'Already done',
  no_hidden: 'The site is already declared',
  in_progress: 'Work is already in progress',
};
/** Beyond three years the estimate is not worth printing. */
const LONG_HIDDEN_DAYS = 1095;
const FEEDS: FeedSource[] = ['natural', 'leu', 'heu'];
const LEVEL_NAME: Record<EnrichLevel, string> = { leu: 'Reactor fuel', heu: 'Research and naval fuel', wgu: 'Weapons grade' };
const FEED_NAME: Record<FeedSource, string> = { natural: 'Natural uranium', leu: 'Reactor fuel', heu: 'Research fuel' };
const STATUS_NAME: Record<IaeaStatus, string> = {
  compliant: 'In good standing', queried: 'Under question', noncompliant: 'In non-compliance', referred: 'Referred to the Security Council',
  sanctioned: 'Under Security Council sanctions', withdrawn: 'Outside the treaty',
};
type Dispatch = (command: GameCommand) => void;
const pct = (value: number, max: number) => `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
const kg = (value: number) => (value >= 100 ? Math.round(value).toLocaleString('en-US') : value.toFixed(1));
const reason = (block: NuclearBlock | null) => (block ? translateLive(BLOCK_TEXT[block]) : undefined);

export function NuclearIcon({ size = 24 }: { size?: number }) {
  return (
    <svg className="nuclear-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="9.5" ry="3.8" /><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(120 12 12)" />
    </svg>
  );
}

/** Centrifuge dial: the ring fills with halls that are running and shows halls still being built as a lighter arc. */
function CascadeDial({ blocks, queued }: { blocks: number; queued: number }) {
  const radius = 26, circumference = 2 * 3.14159265 * radius;
  const arc = (count: number) => (count / MAX_BLOCKS_PER_SITE) * circumference;
  return (
    <svg className="cascade-dial" viewBox="0 0 64 64" role="img" aria-label={translateLive('Centrifuge halls')}>
      <circle className="dial-track" cx="32" cy="32" r={radius} />
      <circle className="dial-queued" cx="32" cy="32" r={radius} strokeDasharray={`${arc(blocks + queued)} ${circumference}`} transform="rotate(-90 32 32)" />
      <circle className="dial-run" cx="32" cy="32" r={radius} strokeDasharray={`${arc(blocks)} ${circumference}`} transform="rotate(-90 32 32)" />
      <text x="32" y="31" textAnchor="middle" className="dial-number">{Math.round(blocks * BLOCK_SIZE).toLocaleString('en-US')}</text>
      <text x="32" y="42" textAnchor="middle" className="dial-unit">{translateLive('machines')}</text>
    </svg>
  );
}

/** The assay ladder: natural uranium, then three stages. Each stage shows what is held and which cascades aim at it. */
function AssayLadder({ view }: { view: NuclearView }) {
  const stops: Array<{ key: string; label: string; assay: string; amount: string; sites: string[] }> = [
    { key: 'natural', label: 'Natural uranium', assay: '0.71%', amount: `${kg(view.uraniumKg)} kg`, sites: [] },
    ...ENRICH_LEVELS.map(level => ({
      key: level, label: LEVEL_NAME[level], assay: `${(LEVEL_ASSAY[level] * 100).toFixed(level === 'leu' ? 2 : 0)}%`,
      amount: `${kg(view.program.stock[level])} kg`, sites: view.sites.filter(s => s.site.target === level).map(s => s.site.id),
    })),
  ];
  return (
    <ol className="assay-ladder" data-testid="nuclear-ladder" aria-label={translateLive('Enrichment stages')}>
      {stops.map(stop => (
        <li key={stop.key} data-stage={stop.key} className={stop.sites.length ? 'is-aimed' : ''}>
          <span className="stage-assay">{stop.assay}</span>
          <span className="stage-label"><LocaleText value={stop.label} /></span>
          <b className="stage-amount" data-testid={`nuclear-stock-${stop.key}`}>{stop.amount}</b>
          {stop.key === 'wgu' && <small>{formatLive('{0} warheads worth', [String(Math.floor(view.program.stock.wgu / WARHEAD_KG))])}</small>}
          {stop.sites.length > 0 && <span className="stage-sites">{stop.sites.map(id => <i key={id}>{id}</i>)}</span>}
        </li>
      ))}
    </ol>
  );
}

function SiteCard({ view, entry, dispatch }: { view: NuclearView; entry: SiteView; dispatch: Dispatch }) {
  const { site } = entry;
  const hidden = site.kind === 'clandestine' && !site.exposed;
  const badge = site.exposed ? 'Exposed' : hidden ? 'Hidden' : 'Declared';
  const cost = site.kind === 'clandestine' && !site.exposed ? view.costs.blockHidden : view.costs.block;
  return (
    <article className={`nuclear-site ${site.exposed ? 'is-exposed' : hidden ? 'is-hidden' : ''}`} data-testid={`nuclear-site-${site.id}`}>
      <header>
        <CascadeDial blocks={entry.blocks} queued={entry.queuedBlocks} />
        <div>
          <h4>{formatLive('Site {0}', [site.id])}</h4>
          <span className={`site-badge badge-${badge.toLowerCase()}`} data-testid={`nuclear-site-${site.id}-kind`}><LocaleText value={badge} /></span>
        </div>
      </header>
      <dl className="site-figures">
        <div><dt><LocaleText value="Separative work" /></dt><dd>{entry.swuPerDay.toFixed(1)} <small><LocaleText value="SWU a day" /></small></dd></div>
        <div><dt><LocaleText value="Output" /></dt><dd data-testid={`nuclear-site-${site.id}-output`}>{entry.kgPerDay.toFixed(2)} <small><LocaleText value="kg a day" /></small></dd></div>
        <div><dt><LocaleText value="Feed per kilogram" /></dt><dd>{entry.perKg ? entry.perKg.feedKg.toFixed(1) : '-'} <small>kg</small></dd></div>
        {entry.daysPerWarhead !== null && <div><dt><LocaleText value="Time to one warhead" /></dt><dd data-testid={`nuclear-site-${site.id}-warhead`}>{Math.ceil(entry.daysPerWarhead)} <small><LocaleText value="days" /></small></dd></div>}
        {entry.concealment !== null && <div><dt><LocaleText value="Concealment" /></dt><dd>{Math.round(entry.concealment)}%</dd></div>}
      </dl>
      <div className="chip-row" role="group" aria-label={translateLive('Target assay')}>
        {ENRICH_LEVELS.map(level => {
          const options = FEEDS.filter(feed => entry.configure[`${level}:${feed}`] === null);
          const first = entry.configure[`${level}:${site.feed}`] ?? null;
          return (
            <button key={level} type="button" className="chip" aria-pressed={site.target === level} data-testid={`site-target-${site.id}-${level}`} disabled={options.length === 0} title={reason(options.length === 0 ? first : null)}
              onClick={() => dispatch({ type: 'nuclear/configureSite', siteId: site.id, target: level, feed: options.includes(site.feed) ? site.feed : options[0] })}>
              <LocaleText value={LEVEL_NAME[level]} />
            </button>
          );
        })}
      </div>
      <div className="chip-row" role="group" aria-label={translateLive('Feed')}>
        {FEEDS.map(feed => {
          const block = entry.configure[`${site.target}:${feed}`] ?? null;
          return <button key={feed} type="button" className="chip" aria-pressed={site.feed === feed} data-testid={`site-feed-${site.id}-${feed}`} disabled={block !== null} title={reason(block)} onClick={() => dispatch({ type: 'nuclear/configureSite', siteId: site.id, target: site.target, feed })}><LocaleText value={FEED_NAME[feed]} /></button>;
        })}
      </div>
      <footer className="site-actions">
        <button type="button" data-testid={`site-expand-${site.id}`} disabled={entry.block.expand !== null} title={reason(entry.block.expand)} onClick={() => dispatch({ type: 'nuclear/expandSite', siteId: site.id })}>
          <LocaleText value="Add 1,000 centrifuges" /> <b>{formatCostB(cost)}</b>
        </button>
        {site.kind === 'clandestine' && <button type="button" data-testid={`site-declare-${site.id}`} disabled={entry.block.declare !== null} title={reason(entry.block.declare)} onClick={() => dispatch({ type: 'nuclear/declareSite', siteId: site.id })}><LocaleText value="Declare to the IAEA" /></button>}
        <button type="button" className="quiet" data-testid={`site-dismantle-${site.id}`} onClick={() => dispatch({ type: 'nuclear/dismantleSite', siteId: site.id })}><LocaleText value="Dismantle" /></button>
      </footer>
    </article>
  );
}

function Enrichment({ view, dispatch }: { view: NuclearView; dispatch: Dispatch }) {
  return (
    <section className="nuclear-column" data-testid="nuclear-enrichment" aria-labelledby="nuclear-h-enrich">
      <h3 id="nuclear-h-enrich"><LocaleText value="Enrichment" /></h3>
      <AssayLadder view={view} />
      <div className="site-list">
        {view.sites.length === 0 && <p className="nuclear-empty"><LocaleText value="No cascades yet. A declared site is safeguarded; a hidden one is not, and the agency will look for it." /></p>}
        {view.sites.map(entry => <SiteCard key={entry.site.id} view={view} entry={entry} dispatch={dispatch} />)}
      </div>
      <div className="build-row">
        <button type="button" data-testid="nuclear-build-declared" disabled={view.block.siteDeclared !== null} title={reason(view.block.siteDeclared)} onClick={() => dispatch({ type: 'nuclear/buildSite', kind: 'declared' })}>
          <LocaleText value="Build a declared site" /> <b>{formatCostB(view.costs.block)}</b>
        </button>
        <button type="button" className="hidden-site" data-testid="nuclear-build-hidden" disabled={view.block.siteHidden !== null} title={reason(view.block.siteHidden)} onClick={() => dispatch({ type: 'nuclear/buildSite', kind: 'clandestine' })}>
          <LocaleText value="Build a hidden site" /> <b>{formatCostB(view.costs.blockHidden)}</b>
        </button>
      </div>
      <small className="build-note">{formatLive('A hall of 1,000 machines takes {0} days to build.', [String(BUILD_BASE.centrifuges.days)])}</small>
    </section>
  );
}

function Leg({ id, label, count, capacity, survival, extra }: { id: string; label: string; count: number; capacity: number; survival: number; extra?: ReactNode }) {
  return (
    <li data-testid={`leg-${id}`}>
      <span className="leg-name"><LocaleText value={label} /></span>
      <b className="leg-count" data-testid={`leg-${id}-count`}>{count}</b>
      <span className="leg-meter" aria-hidden="true"><i style={{ width: pct(survival * 100, 100) }} /></span>
      <small>{formatLive('{0} warheads carried, {1}% survive a first strike', [String(capacity), String(Math.round(survival * 100))])}</small>
      {extra}
    </li>
  );
}

function Forces({ view, dispatch }: { view: NuclearView; dispatch: Dispatch }) {
  const [count, setCount] = useState(1);
  const { program, force } = view;
  const batch = Math.max(1, Math.min(count, view.assembleMax || 1));
  const atSea = program.delivery.ssbn > 0 ? Math.min(1, program.patrol / program.delivery.ssbn) : 0;
  const build = (kind: 'icbm' | 'ssbn' | 'bomber', label: string, block: NuclearBlock | null, cost: number) => (
    <button type="button" data-testid={`build-${kind}`} disabled={block !== null} title={reason(block)} onClick={() => dispatch({ type: 'nuclear/buildDelivery', kind })}>
      <LocaleText value={label} /> <b>{formatCostB(cost)}</b> <small>{formatLive('{0} days', [String(BUILD_BASE[kind].days)])}</small>
    </button>
  );
  return (
    <section className="nuclear-column" data-testid="nuclear-forces" aria-labelledby="nuclear-h-forces">
      <h3 id="nuclear-h-forces"><LocaleText value="Strategic forces" /></h3>
      <div className="warhead-counter">
        <b data-testid="nuclear-warheads">{program.warheads.toLocaleString('en-US')}</b>
        <span><LocaleText value="warheads" /></span>
      </div>
      <div className="deterrence" data-testid="nuclear-deterrence" data-value={Math.round(force.deterrence)}>
        <header><span><LocaleText value="Deterrence" /></span><b>{Math.round(force.deterrence)}</b></header>
        <div className="meter"><i style={{ width: pct(force.deterrence, 100) }} /><u className="mark-low" style={{ left: `${LOW_DETERRENCE}%` }} /><u className="mark-shield" style={{ left: `${DETERRENCE_SHIELD}%` }} /></div>
        <small><LocaleText value="From 50, a state cannot be attacked by one with almost no deterrent." /></small>
        <small>{formatLive('Force readiness {0}%', [String(Math.round(force.readiness))])}</small>
      </div>
      <ul className="triad" aria-label={translateLive('The strategic triad')}>
        <Leg id="icbm" label="Missiles in hardened silos" count={program.delivery.icbm} capacity={Math.round(force.byLeg.icbm)} survival={SURVIVAL.icbm} />
        <Leg id="ssbn" label="Ballistic missile submarines" count={program.delivery.ssbn} capacity={Math.round(force.byLeg.ssbn)} survival={atSea * SURVIVAL.ssbnPatrol + (1 - atSea) * SURVIVAL.ssbnPort} extra={
          <span className="patrol" role="group" aria-label={translateLive('Boats on patrol')}>
            <button type="button" aria-label={translateLive('Fewer on patrol')} data-testid="patrol-minus" disabled={view.block.patrol !== null || program.patrol <= 0} onClick={() => dispatch({ type: 'nuclear/setPatrol', count: program.patrol - 1 })}>-</button>
            <span data-testid="patrol-count">{formatLive('{0} on patrol', [String(program.patrol)])}</span>
            <button type="button" aria-label={translateLive('More on patrol')} data-testid="patrol-plus" disabled={view.block.patrol !== null || program.patrol >= program.delivery.ssbn} onClick={() => dispatch({ type: 'nuclear/setPatrol', count: program.patrol + 1 })}>+</button>
          </span>} />
        <Leg id="bombers" label="Strategic bombers" count={program.delivery.bombers} capacity={Math.round(force.byLeg.bombers)} survival={SURVIVAL.bombers} />
      </ul>
      <div className="build-row">
        {build('icbm', 'Silo missile', view.block.icbm, view.costs.icbm)}
        {build('ssbn', 'Submarine', view.block.ssbn, view.costs.ssbn)}
        {build('bomber', 'Bomber', view.block.bomber, view.costs.bomber)}
      </div>
      <div className="assembly" data-testid="nuclear-assembly">
        <header>
          <span><LocaleText value="Warhead assembly line" /></span>
          <span className="pips" data-level={program.assembly} aria-label={formatLive('Level {0} of {1}', [String(program.assembly), String(ASSEMBLY_MAX_LEVEL)])}>{Array.from({ length: ASSEMBLY_MAX_LEVEL }, (_, i) => <i key={i} className={i < program.assembly ? 'on' : ''} />)}</span>
        </header>
        <div className="build-row">
          <button type="button" data-testid="nuclear-assembly-build" disabled={view.block.assembly !== null} title={reason(view.block.assembly)} onClick={() => dispatch({ type: 'nuclear/buildAssembly' })}>
            <LocaleText value="Expand the line" /> <b>{formatCostB(view.costs.assembly)}</b>
          </button>
        </div>
        <div className="assemble-row">
          <label><LocaleText value="Warheads in this batch" />
            <input type="number" min={1} max={Math.max(1, ASSEMBLY_BATCH[program.assembly] ?? 1)} value={batch} data-testid="nuclear-assemble-count" onChange={e => setCount(Math.max(1, Math.floor(Number(e.target.value) || 1)))} />
          </label>
          <button type="button" data-testid="nuclear-assemble" disabled={view.block.assemble !== null || view.assembleMax < 1} title={reason(view.block.assemble) ?? (view.restDays > 0 ? formatLive('Ready in {0} days', [String(view.restDays)]) : undefined)} onClick={() => dispatch({ type: 'nuclear/assembleWarheads', count: batch })}>
            <LocaleText value="Assemble warheads" /> <b>{formatCostB(view.costs.warhead * batch)}</b>
          </button>
        </div>
        <small>{formatLive('Each core needs {0} kg of weapons-grade material.', [String(WARHEAD_KG)])}</small>
      </div>
      <p className="upkeep" data-testid="nuclear-upkeep">{formatLive('Upkeep above the standing defence budget: {0} a year', [formatCostB(view.upkeepYearly)])}</p>
    </section>
  );
}

function CaseTimeline({ view }: { view: NuclearView }) {
  const c = view.iaea.case;
  if (!c) return null;
  const steps: Array<{ key: string; label: string; day: number; done: boolean }> = [
    { key: 'exposed', label: c.cause === 'exposure' ? 'Sites exposed' : 'Left the treaty', day: c.openedDay, done: true },
    { key: 'board', label: 'Board of Governors', day: c.boardDay, done: c.stage !== 'exposed' },
    { key: 'unsc', label: 'Security Council vote', day: c.unscDay, done: c.stage === 'closed' },
  ];
  return (
    <ol className="case-timeline" data-testid="iaea-case" data-stage={c.stage}>
      {steps.map(step => <li key={step.key} className={step.done ? 'done' : ''}><span><LocaleText value={step.label} /></span><small>{formatLive('Day {0}', [String(step.day)])}</small></li>)}
      {c.outcome && <li className={`outcome outcome-${c.outcome}`} data-testid="iaea-outcome"><LocaleText value={c.outcome === 'sanctions' ? 'Sanctions imposed' : c.outcome === 'vetoed' ? 'Vetoed by a permanent member' : 'The vote failed'} />{c.vetoedBy ? ` (${c.vetoedBy})` : ''}</li>}
    </ol>
  );
}

function Iaea({ view, dispatch }: { view: NuclearView; dispatch: Dispatch }) {
  const [confirm, setConfirm] = useState(false);
  const { iaea } = view;
  return (
    <section className="nuclear-column iaea-card" data-testid="iaea-card" aria-labelledby="nuclear-h-iaea" data-status={iaea.status}>
      <h3 id="nuclear-h-iaea"><LocaleText value="IAEA safeguards" /></h3>
      <p className={`iaea-status status-${iaea.status}`} data-testid="iaea-status"><LocaleText value={STATUS_NAME[iaea.status]} /></p>
      {view.sanctioned && <p className="iaea-alert" role="alert"><LocaleText value="Global sanctions are in force. Trade with this country is closed." /></p>}
      {view.hiddenSites > 0 && <p className="iaea-alert is-risk" role="alert" data-testid="iaea-hidden-alert"><LocaleText value="Hidden enrichment is running. If the agency finds it, relations, reputation and trade are at stake." /></p>}
      <div className="gauge" data-testid="iaea-compliance" data-value={Math.round(iaea.compliance)}>
        <header><span><LocaleText value="Compliance rating" /></span><b>{Math.round(iaea.compliance)}</b></header>
        <div className="meter"><i style={{ width: pct(iaea.compliance, 100) }} /></div>
      </div>
      <div className="gauge risk" data-testid="iaea-suspicion" data-value={Math.round(iaea.suspicion)}>
        <header><span><LocaleText value="Exposure risk" /></span><b>{Math.round(iaea.suspicion)}</b></header>
        <div className="meter"><i style={{ width: pct(iaea.suspicion, 100) }} /></div>
        {view.exposureInDays !== null && (
          <small data-testid="iaea-exposure-days">
            {view.exposureInDays > LONG_HIDDEN_DAYS ? translateLive('At this rate hidden work stays hidden for years.') : formatLive('At this rate hidden work is found in about {0} days.', [String(Math.ceil(view.exposureInDays))])}
          </small>
        )}
      </div>
      <dl className="iaea-facts">
        <div><dt><LocaleText value="Next snap inspection" /></dt><dd data-testid="iaea-inspection">{view.inspectionInDays === null ? '-' : formatLive('in {0} days', [String(view.inspectionInDays)])}</dd></div>
        <div><dt><LocaleText value="World scrutiny" /></dt><dd>{Math.round(view.scrutiny * 100)}%</dd></div>
      </dl>
      <CaseTimeline view={view} />
      {iaea.findings.length > 0 && (
        <ul className="findings" aria-label={translateLive('Recent findings')}>
          {iaea.findings.slice(0, 4).map((f, i) => <li key={`${f.day}-${i}`}><small>{formatLive('Day {0}', [String(f.day)])}</small> <LocaleText value={FINDING_TEXT[f.kind]} /></li>)}
        </ul>
      )}
      <div className="iaea-actions">
        <button type="button" data-testid="iaea-protocol" aria-pressed={iaea.additionalProtocol} disabled={view.block.protocol !== null} title={reason(view.block.protocol)} onClick={() => dispatch({ type: 'nuclear/setProtocol', enabled: !iaea.additionalProtocol })}>
          <LocaleText value={iaea.additionalProtocol ? 'Additional protocol: on' : 'Accept the additional protocol'} />
        </button>
        <button type="button" className="danger" data-testid="iaea-withdraw" disabled={view.block.withdraw !== null} title={reason(view.block.withdraw)} onClick={() => setConfirm(true)}><LocaleText value="Leave the treaty" /></button>
      </div>
      {confirm && (
        <ReviewDialog
          title="Leave the non-proliferation treaty"
          summary="Safeguards end and every site is in the open. Every country will hold this against you, and the Security Council will vote within a month."
          warnings={['Reputation and relations with every state fall.', 'A friendly permanent member can still veto sanctions.']}
          confirmLabel="LEAVE THE TREATY"
          onCancel={() => setConfirm(false)}
          onConfirm={() => { dispatch({ type: 'nuclear/withdrawTreaty' }); setConfirm(false); }}
        />
      )}
    </section>
  );
}

const FINDING_TEXT: Record<string, string> = {
  clean: 'Inspection found nothing', queried: 'Inspectors raised questions', exposed: 'Undeclared sites found', declared: 'A site was declared',
  withdrawn: 'The treaty was left', sanctions: 'Sanctions imposed', vetoed: 'Sanctions vetoed', board: 'Referred to the Security Council',
};

/** Opens from the player's country panel. */
export function NuclearCommandWindow({ onClose }: { onClose: () => void }) {
  const view = useStoreView(s => nuclearView(s, s.playerCountryId));
  const dispatch = useGameStore(s => s.dispatch);
  return (
    <CommandWindow kicker="STRATEGIC // NUCLEAR COMMAND" title="Nuclear Command" subtitle="Enrichment, strategic forces and IAEA safeguards" onClose={onClose} wide className="nuclear-window">
      <div data-testid="nuclear-window">
        {!view.eligible ? (
          <p className="nuclear-locked" data-testid="nuclear-locked"><LocaleText value="Research Civil Nuclear Infrastructure to open an enrichment programme." /></p>
        ) : (
          <div className="nuclear-grid">
            <Enrichment view={view} dispatch={dispatch} />
            <Forces view={view} dispatch={dispatch} />
            <Iaea view={view} dispatch={dispatch} />
          </div>
        )}
      </div>
    </CommandWindow>
  );
}

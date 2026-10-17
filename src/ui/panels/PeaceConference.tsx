import { useState } from 'react';
import { createPortal } from 'react-dom';
import { flagEmoji } from '../../data/countryThemes';
import { REGION_IDS, type DemandId, type RegionId } from '../../domain/peace';
import { pendingVictory } from '../../engine/systems/victory';
import { ARMOR_CAPS, FLEET_CAPS, REPARATION_TIERS, REPARATION_YEARS, annexId, demandCost, disarmId, dmzId, parseDemand, reparationsId, PUPPET_ID, type DemandBlock, type DemandCheck } from '../../engine/systems/peaceDemands';
import { conferenceView, pendingPeace, treatyPreview, type ConferenceView } from '../../engine/systems/peaceTreaty';
import { REGION_TEMPLATES } from '../../engine/systems/peaceRegions';
import { formatLive, LocaleText, translateLive } from '../../i18n/localeText';
import { useGameStore } from '../../store/gameStore';
import { useWorldView } from '../../store/useWorldView';
import { ManagedDialog } from '../windows/ManagedDialog';
import { WINDOW_LAYERS } from '../windows/useWindowLifecycle';
import { ScoreLines } from './WarScorePanel';

/**
 * Phase 9.6: the peace table (Barış Masası). Everything shown is read from the engine (conferenceView, treatyPreview);
 * every action is a typed command. The table opens after the victory scroll, and the clock stays paused while it is open.
 */
export function PeaceConference() {
  const key = useGameStore(s => {
    if (pendingVictory(s)) return null;
    const pending = pendingPeace(s);
    if (!pending) return null;
    // A lost campaign already shows its own ending; the imposed terms need no second window over it.
    if (pending.kind === 'notice') return s.campaignStatus === 'active' ? `notice:${pending.treatyId}` : null;
    return `table:${pending.warId}`;
  });
  if (!key) return null;
  const [kind, id] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
  return kind === 'table' ? <PeaceTable warId={id} /> : <PeaceNotice treatyId={id} />;
}

const TRIGGER_TITLE = { victory: 'Victory on the battlefield', surrender: 'Unconditional surrender', collapse: 'Total state collapse', armistice: 'Armistice' } as const;

const REGION_NAME: Record<RegionId, string> = {
  capital: 'Capital region', heartland: 'Heartland', industrial: 'Industrial belt', resource: 'Resource belt', frontier_a: 'Northern frontier', frontier_b: 'Eastern frontier',
};

const BLOCK_TEXT: Record<DemandBlock, string> = {
  unknown: 'Unavailable',
  taken: 'Already under foreign control',
  not_occupied: 'Your forces have not reached it',
  no_puppet_for_defender: 'Only an attacker can install a puppet government',
  puppet_conflict: 'Cannot be combined with taking every region',
  already_ceded: 'Already ceded',
  over_budget: 'Not enough war score',
};

const TIER_TEXT = { light: 'Light tribute', standard: 'Standard tribute', heavy: 'Heavy tribute' } as const;

/** One demand as a sentence for the ledger and the notice. */
export function termText(id: DemandId): string {
  const demand = parseDemand(id);
  if (!demand) return id;
  switch (demand.kind) {
    case 'annex': return formatLive('Annex the {0}', [REGION_NAME[demand.region]]);
    case 'puppet': return translateLive('Install a puppet government');
    case 'dmz': return formatLive('Demilitarized zone: {0}', [REGION_NAME[demand.zone]]);
    case 'reparations': return formatLive('Reparations, {0} years, {1}', [String(demand.years), TIER_TEXT[demand.tier]]);
    case 'disarm': return formatLive(demand.target === 'armor' ? 'Cap armour at {0}%' : 'Cap the fleet at {0}%', [String(demand.cap)]);
  }
}

const money = (billions: number) => (billions >= 100 ? `$${Math.round(billions)}B` : billions >= 10 ? `$${billions.toFixed(1)}B` : `$${billions.toFixed(2)}B`);
const count = (n: number) => Math.round(n).toLocaleString();

function PeaceTable({ warId }: { warId: string }) {
  const s = useWorldView();
  const dispatch = useGameStore(state => state.dispatch);
  const view = conferenceView(s, warId);
  if (!view) return null;
  const { conference, winner, loser, score, budget, left, spent } = view;
  const war = s.wars[warId];
  const preview = treatyPreview(s, conference);
  const check = (id: DemandId) => view.checks.find(c => c.id === id);
  const toggle = (id: DemandId) => dispatch({ type: 'peace/toggle', warId, demand: id });
  const allies = war && war.defenderId === winner.id ? (war.defenderAllies ?? []).map(id => s.countries[id]).filter(Boolean) : [];

  return createPortal(
    <div className="peace-backdrop">
      <ManagedDialog key={warId} className="peace-table" label="Peace conference" layer={WINDOW_LAYERS.modal} testId="peace-table">
        <header className="peace-head">
          <div>
            <small><LocaleText value={TRIGGER_TITLE[conference.trigger]} /></small>
            <h1><LocaleText value="Peace conference" /></h1>
            <p className="peace-subtitle"><LocaleText value="Barış Masası" /></p>
          </div>
          <p className="peace-parties" aria-label={translateLive('Parties')}>
            <b>{flagEmoji(winner.iso2)}</b> <LocaleText value={winner.name} />
            <span aria-hidden="true"> ⟷ </span>
            <b>{flagEmoji(loser.iso2)}</b> <LocaleText value={loser.name} />
          </p>
        </header>

        <div className="peace-body">
          <aside className="peace-victors" aria-label={translateLive('Victors')}>
            <h2><LocaleText value="Victors" /></h2>
            <article className="delegation is-lead">
              <span className="delegation-flag" aria-hidden="true">{flagEmoji(winner.iso2)}</span>
              <h3><LocaleText value={winner.name} /></h3>
              <p className="delegation-score" data-testid="peace-budget"><b>{budget}</b> <small><LocaleText value="War score" /></small></p>
              <p className="delegation-turn"><LocaleText value="Your bid" /></p>
            </article>
            <ScoreLines score={score} />
            {allies.length > 0 && (
              <div className="delegation-allies">
                <h3><LocaleText value="Allied delegations" /></h3>
                <ul>{allies.map(ally => <li key={ally.id}><b>{flagEmoji(ally.iso2)}</b> <LocaleText value={ally.name} /></li>)}</ul>
              </div>
            )}
          </aside>

          <section className="peace-demands" aria-label={translateLive('Demands')}>
            <article className="delegation is-loser">
              <span className="delegation-flag" aria-hidden="true">{flagEmoji(loser.iso2)}</span>
              <div>
                <h2><LocaleText value={loser.name} /></h2>
                <p><LocaleText value="The defeated" /></p>
              </div>
              <dl>
                <dt><LocaleText value="Economy" /></dt><dd>{money(loser.economy.gdp)}</dd>
                <dt><LocaleText value="Population" /></dt><dd>{count(loser.demographics.population)}</dd>
                <dt><LocaleText value="Tanks" /></dt><dd>{count(loser.military.tanks)}</dd>
                <dt><LocaleText value="Warships" /></dt><dd>{count(loser.military.warships)}</dd>
              </dl>
            </article>

            <fieldset className="demand-group" data-group="territory">
              <legend><LocaleText value="Territory" /></legend>
              <div className="region-grid">
                {REGION_IDS.map(region => (
                  <DemandTile key={region} id={annexId(region)} view={view} onToggle={toggle} title={REGION_NAME[region]} note={formatLive('{0}% of output', [String(Math.round(REGION_TEMPLATES[region].output * 100))])} occupied={view.occupied.includes(region)} />
                ))}
              </div>
            </fieldset>

            <fieldset className="demand-group" data-group="government">
              <legend><LocaleText value="Government" /></legend>
              <DemandTile id={PUPPET_ID} view={view} onToggle={toggle} title="Install a puppet government" note="The country keeps its name but answers to you" occupied wide />
            </fieldset>

            <fieldset className="demand-group" data-group="border">
              <legend><LocaleText value="Demilitarized zones" /></legend>
              <div className="region-grid two">
                {(['frontier_a', 'frontier_b'] as const).map(zone => (
                  <DemandTile key={zone} id={dmzId(zone)} view={view} onToggle={toggle} title={REGION_NAME[zone]} note="No deployments; no attack on you for five years" occupied />
                ))}
              </div>
            </fieldset>

            <Reparations view={view} onToggle={toggle} check={check} />

            <fieldset className="demand-group" data-group="disarm">
              <legend><LocaleText value="Disarmament" /></legend>
              <div className="cap-rows">
                <CapRow label="Armoured divisions" ids={ARMOR_CAPS.map(cap => disarmId('armor', cap))} view={view} onToggle={toggle} />
                <CapRow label="Naval fleet" ids={FLEET_CAPS.map(cap => disarmId('fleet', cap))} view={view} onToggle={toggle} />
              </div>
            </fieldset>
          </section>

          <aside className="peace-ledger" aria-label={translateLive('Treaty')}>
            <h2><LocaleText value="Treaty" /></h2>
            <div className="points-gauge" role="meter" aria-label={translateLive('War score spent')} aria-valuemin={0} aria-valuemax={budget} aria-valuenow={spent} data-testid="peace-gauge">
              <i style={{ width: `${budget > 0 ? Math.min(100, (spent / budget) * 100) : 0}%` }} />
              <span><b data-testid="peace-spent">{spent}</b> / {budget}</span>
            </div>
            <p className="points-left"><LocaleText value="Points left" />: <b data-testid="peace-left">{left}</b></p>
            {conference.selected.length === 0 ? (
              <p className="ledger-empty"><LocaleText value="No terms yet. Choose what the defeated must give." /></p>
            ) : (
              <ol className="ledger-terms" data-testid="peace-terms">
                {conference.selected.map(id => (
                  <li key={id}>
                    <span>{termText(id)}</span>
                    <b>{demandCost(loser, id)}</b>
                    <button type="button" aria-label={formatLive('Remove: {0}', [termText(id)])} onClick={() => toggle(id)}>×</button>
                  </li>
                ))}
              </ol>
            )}
            <ul className="ledger-effects" data-testid="peace-effects">
              {preview.regions.length > 0 && <li>{formatLive('{0} loses {1} of its economy and {2} people', [loser.name, `${Math.round(preview.gdpShare * 100)}%`, count(preview.populationMoved)])}</li>}
              {preview.fullAnnexation && preview.regions.length > 0 && <li><LocaleText value="Every region is taken: the country is annexed." /></li>}
              {preview.puppet && <li>{formatLive('{0} becomes a controlled state', [loser.name])}</li>}
              {preview.tributeYears > 0 && <li>{formatLive('Tribute: {0} a month for {1} years', [money(preview.monthlyTributeB), String(preview.tributeYears)])}</li>}
              {preview.armorCap !== null && <li>{formatLive('Armour limited to {0} tanks', [count(preview.armorCap)])}</li>}
              {preview.fleetCap !== null && <li>{formatLive('Fleet limited to {0} ships', [count(preview.fleetCap)])}</li>}
              {preview.dmzZones.length > 0 && <li>{formatLive('{0} demilitarized zones', [String(preview.dmzZones.length)])}</li>}
            </ul>
            <div className="ledger-actions">
              <button type="button" className="seal-button" data-testid="peace-conclude" disabled={conference.selected.length === 0} onClick={() => dispatch({ type: 'peace/conclude', warId })}>
                <LocaleText value="Conclude treaty" />
              </button>
              <button type="button" className="plain-button" data-testid="peace-waive" onClick={() => dispatch({ type: 'peace/waive', warId })}>
                <LocaleText value="Make peace without terms" />
              </button>
              <small><LocaleText value="The treaty is signed as written and cannot be changed afterwards." /></small>
            </div>
          </aside>
        </div>
      </ManagedDialog>
    </div>,
    document.body,
  );
}

interface TileProps {
  id: DemandId;
  view: ConferenceView;
  onToggle: (id: DemandId) => void;
  title: string;
  note: string;
  occupied: boolean;
  wide?: boolean;
}

/** A single demand on the table: its cost, whether the war score and the front allow it, and why not. */
function DemandTile({ id, view, onToggle, title, note, occupied, wide }: TileProps) {
  const check = view.checks.find(c => c.id === id);
  const taken = check?.block === 'already_ceded';
  const selected = !!check?.selected;
  const blocked = !!check && !check.allowed && !selected;
  const state = taken ? 'taken' : selected ? 'selected' : !occupied || check?.block === 'not_occupied' ? 'locked' : blocked ? 'blocked' : 'open';
  return (
    <button
      type="button"
      className={`demand-tile state-${state}${wide ? ' is-wide' : ''}`}
      data-testid={`demand-${id}`}
      data-state={state}
      aria-pressed={selected}
      disabled={blocked || taken}
      title={blocked && check?.block ? translateLive(BLOCK_TEXT[check.block]) : undefined}
      onClick={() => onToggle(id)}
    >
      <span className="tile-title"><LocaleText value={title} /></span>
      <span className="tile-note"><LocaleText value={taken ? 'Ceded' : check?.block === 'not_occupied' ? BLOCK_TEXT.not_occupied : note} /></span>
      <b className="tile-cost" aria-label={formatLive('Costs {0} war score', [String(check?.cost ?? 0)])}>{check?.cost ?? 0}</b>
    </button>
  );
}

function Reparations({ view, onToggle, check }: { view: ConferenceView; onToggle: (id: DemandId) => void; check: (id: DemandId) => DemandCheck | undefined }) {
  const current = view.conference.selected.map(parseDemand).find((d): d is Extract<NonNullable<ReturnType<typeof parseDemand>>, { kind: 'reparations' }> => d?.kind === 'reparations');
  const [years, setYears] = useState<number>(current?.years ?? 2);
  const [tier, setTier] = useState<(typeof REPARATION_TIERS)[number]>(current?.tier ?? 'standard');
  const id = reparationsId(years, tier);
  const entry = check(id);
  const selected = !!entry?.selected;
  const cost = entry?.cost ?? 0;
  return (
    <fieldset className="demand-group" data-group="reparations">
      <legend><LocaleText value="War reparations" /></legend>
      <div className="reparation-row" role="group" aria-label={translateLive('Years of tribute')}>
        {REPARATION_YEARS.map(y => (
          <button key={y} type="button" className="chip" aria-pressed={years === y} data-testid={`reparation-years-${y}`} onClick={() => setYears(y)}>{y}</button>
        ))}
        <small><LocaleText value="years" /></small>
      </div>
      <div className="reparation-row" role="group" aria-label={translateLive('Size of tribute')}>
        {REPARATION_TIERS.map(t => (
          <button key={t} type="button" className="chip wide" aria-pressed={tier === t} data-testid={`reparation-tier-${t}`} onClick={() => setTier(t)}>
            <LocaleText value={TIER_TEXT[t]} />
          </button>
        ))}
      </div>
      <button
        type="button"
        className={`demand-tile state-${selected ? 'selected' : entry && !entry.allowed ? 'blocked' : 'open'} is-wide`}
        data-testid={`demand-${id}`}
        aria-pressed={selected}
        disabled={!selected && !!entry && !entry.allowed}
        title={entry && !entry.allowed && !selected && entry.block ? translateLive(BLOCK_TEXT[entry.block]) : undefined}
        onClick={() => onToggle(id)}
      >
        <span className="tile-title">{termText(id)}</span>
        <span className="tile-note"><LocaleText value={selected ? 'On the table' : 'Paid monthly out of the treasury'} /></span>
        <b className="tile-cost">{cost}</b>
      </button>
    </fieldset>
  );
}

function CapRow({ label, ids, view, onToggle }: { label: string; ids: DemandId[]; view: ConferenceView; onToggle: (id: DemandId) => void }) {
  return (
    <div className="cap-row" role="group" aria-label={translateLive(label)}>
      <span><LocaleText value={label} /></span>
      {ids.map(id => {
        const entry = view.checks.find(c => c.id === id);
        const demand = parseDemand(id);
        const selected = !!entry?.selected;
        const blocked = !!entry && !entry.allowed && !selected;
        return (
          <button key={id} type="button" className={`chip cap-chip${selected ? ' is-on' : ''}`} data-testid={`demand-${id}`} aria-pressed={selected} disabled={blocked} title={blocked && entry?.block ? translateLive(BLOCK_TEXT[entry.block]) : undefined} onClick={() => onToggle(id)}>
            {demand?.kind === 'disarm' ? `${demand.cap}%` : id}
            <b>{entry?.cost ?? 0}</b>
          </button>
        );
      })}
    </div>
  );
}

/** Terms dictated by another government. The player reads them and acknowledges; nothing can be changed. */
function PeaceNotice({ treatyId }: { treatyId: string }) {
  const s = useWorldView();
  const dispatch = useGameStore(state => state.dispatch);
  const treaty = s.world.peace?.treaties.find(t => t.id === treatyId);
  if (!treaty) return null;
  const winner = s.countries[treaty.winnerId];
  const loser = s.countries[treaty.loserId];
  const playerLost = treaty.loserId === s.playerCountryId;
  return createPortal(
    <div className="peace-backdrop">
      <ManagedDialog key={treatyId} className="peace-table is-notice" label="Peace imposed" layer={WINDOW_LAYERS.modal} testId="peace-notice">
        <header className="peace-head">
          <div>
            <small><LocaleText value={TRIGGER_TITLE[treaty.trigger]} /></small>
            <h1><LocaleText value={playerLost ? 'Peace imposed on you' : 'Peace imposed'} /></h1>
          </div>
          <p className="peace-parties"><b>{flagEmoji(winner?.iso2 ?? '')}</b> <LocaleText value={winner?.name ?? ''} /><span aria-hidden="true"> ⟷ </span><b>{flagEmoji(loser?.iso2 ?? '')}</b> <LocaleText value={loser?.name ?? ''} /></p>
        </header>
        <div className="notice-body">
          {treaty.terms.length === 0 ? (
            <p><LocaleText value="The war ended without terms." /></p>
          ) : (
            <ol className="ledger-terms" data-testid="notice-terms">{treaty.terms.map(id => <li key={id}><span>{termText(id)}</span></li>)}</ol>
          )}
          <div className="ledger-actions">
            <button type="button" className="seal-button" data-testid="peace-acknowledge" onClick={() => dispatch({ type: 'peace/acknowledge', treatyId })}>
              <LocaleText value="Acknowledge" />
            </button>
          </div>
        </div>
      </ManagedDialog>
    </div>,
    document.body,
  );
}

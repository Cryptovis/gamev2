import { useState } from 'react';
import type { TaskAsset, TaskMission } from '../../domain/taskGroups';
import { LocaleText, translateLive } from '../../i18n/localeText';
import { useWorldView } from '../../store/useWorldView';
import { taskGroupPreview, taskGroupSummary } from '../../engine/systems/taskGroups';
import '../styles/taskGroups.css';

const MISSION_LABEL: Record<TaskMission, string> = {
  airSuperiority: 'Air superiority', closeAirSupport: 'Close air support', interdiction: 'Interdiction',
  shoreSupport: 'Shore support', blockade: 'Blockade', convoyEscort: 'Convoy escort',
};
const MISSION_HINT: Record<TaskMission, string> = {
  airSuperiority: 'Wins the air: superiority multiplies combat power, up to the mountain defensive edge.',
  closeAirSupport: 'Strikes the front: up to +12% combat power.',
  interdiction: 'Hits supply lines: up to −15% enemy front supply; enemy fighters halve it.',
  shoreSupport: "Naval gunfire on a coastal front adds the warships' combat power.",
  blockade: 'Closes enemy ports: up to −12% enemy front supply and intercepts unescorted cargo; escorts halve it.',
  convoyEscort: 'Protects your cargo and halves an enemy blockade.',
};
const ASSET_LABEL: Record<TaskAsset, string> = { fighters: 'Fighters', bombers: 'Bombers', warships: 'Warships' };
/** Signed percentage; no sign on a zero effect. */
const pct = (v: number, sign: '+' | '−') => v * 100 >= 0.05 ? `${sign}${(v * 100).toFixed(1)}%` : '0.0%';

/**
 * Phase 4 task groups for the player's side of a war. Every number shown comes from engine previews
 * (`taskGroupSummary`, `taskGroupPreview`); changes go through the typed `war/assignTaskGroup` command.
 * The enemy's assignment is never shown, only the effects the player's side observes.
 */
export function TaskGroupsPanel({ warId }: { warId: string }) {
  const s = useWorldView();
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const summary = taskGroupSummary(s, warId, s.playerCountryId);
  const w = s.wars[warId];
  if (!w || w.status !== 'active') return null;
  if (!summary) return <section className="task-groups" aria-label={translateLive('Task groups')}><p className="muted"><LocaleText value="This war uses the fixed share of aircraft and warships (saved before task groups)." /></p></section>;
  return (
    <section className="task-groups" aria-label={translateLive('Task groups')}>
      <header>
        <h3><LocaleText value="Task groups" /></h3>
      </header>
      <dl className="task-groups-effects">
        <div><dt><LocaleText value="Air superiority" /></dt><dd>{summary.airSuperiority >= 0 ? '+' : ''}{summary.airSuperiority.toFixed(0)}</dd></div>
        <div><dt><LocaleText value="Close air support power" /></dt><dd>{pct(summary.closeAirSupport, '+')}</dd></div>
        <div><dt><LocaleText value="Our interdiction" /></dt><dd>{pct(summary.interdiction, '−')}</dd></div>
        <div><dt><LocaleText value="Our blockade" /></dt><dd>{pct(summary.blockade, '−')}</dd></div>
        <div className={summary.supplyCut > 0 ? 'task-groups-alert' : undefined}><dt><LocaleText value="Enemy cut to our supply" /></dt><dd>{pct(summary.supplyCut, '−')}</dd></div>
      </dl>
      {summary.cargoAtRisk && <p className="task-groups-warning" role="status"><LocaleText value="Incoming cargo runs an enemy blockade without escorts." /></p>}
      <ul className="task-groups-rows">
        {summary.rows.map((row) => {
          const key = `${row.mission}|${row.asset}`, draft = drafts[key] ?? row.current;
          const preview = taskGroupPreview(s, warId, s.playerCountryId, row.mission, row.asset, draft);
          const changed = draft !== row.current;
          const setDraft = (value: number) => setDrafts((d) => ({ ...d, [key]: Math.max(0, Math.min(row.max, Math.round(Number.isFinite(value) ? value : 0))) }));
          return (
            <li key={key} className={row.current > 0 ? 'active' : undefined}>
              <div className="task-groups-name">
                <strong><LocaleText value={MISSION_LABEL[row.mission]} /></strong>
                <small><LocaleText value={ASSET_LABEL[row.asset]} /></small>
                <p><LocaleText value={MISSION_HINT[row.mission]} /></p>
              </div>
              <dl className="task-groups-counts">
                <div><dt><LocaleText value="Ready" /></dt><dd>{row.ready.toLocaleString()}</dd></div>
                <div><dt><LocaleText value="Preparing" /></dt><dd>{row.preparing.toLocaleString()}</dd></div>
                <div><dt><LocaleText value="Available" /></dt><dd>{row.max.toLocaleString()}</dd></div>
              </dl>
              <div className="task-groups-control">
                <input type="number" min={0} max={row.max} step={1} value={draft} aria-label={`${translateLive(MISSION_LABEL[row.mission])} · ${translateLive(ASSET_LABEL[row.asset])}`} onChange={(e) => setDraft(Number(e.target.value))} />
                <button disabled={!changed || !preview.allowed} onClick={() => { s.assignTaskGroup(warId, row.mission, row.asset, draft); setDrafts((d) => { const { [key]: _, ...rest } = d; return rest; }); }}>
                  <LocaleText value={draft < row.current ? 'Recall' : 'Assign'} />
                </button>
              </div>
              <p className="task-groups-status">
                {row.nextReadyDay !== null && <><LocaleText value={`On station from day ${row.nextReadyDay}`} /> · </>}
                {changed && preview.allowed && draft > row.current && <><LocaleText value={`On station from day ${preview.readyDay}`} /> · </>}
                {!row.reach.allowed && row.reach.reason ? <LocaleText value={row.reach.reason} /> : <LocaleText value={`Base: ${s.countries[row.reach.baseId]?.name ?? row.reach.baseId}`} />}
                {changed && !preview.allowed && preview.reasons[0] && <> · <LocaleText value={preview.reasons[0]} /></>}
                {row.asset !== 'warships' && changed && preview.allowed && <> · <LocaleText value="Fuel per offensive round" />: {preview.fuelPerRound.toFixed(2)}</>}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

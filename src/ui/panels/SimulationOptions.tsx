import { useEffect } from 'react';
import { formatLive, LocaleText, translateLive } from '../../i18n/localeText';
import { frameHealth, LONG_FRAME_MS } from '../../sim/perfMonitor';
import { useSimulationStats, watchFrames, type SimPreference } from '../../sim/simulationStats';
import { setSimulationPreference } from '../../sim/storeSimulation';

const MODES: { value: SimPreference; label: string; hint: string }[] = [
  { value: 'auto', label: 'Automatic', hint: 'Use a Web Worker when this browser supports one.' },
  { value: 'worker', label: 'Web Worker', hint: 'Always compute the campaign days off the main thread.' },
  { value: 'main', label: 'Main thread', hint: 'Compute the days in the page itself, as before.' },
];

const ms = (n: number) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10).toString();
const REASONS = ['The simulation worker failed.', 'The simulation worker did not start.', 'The simulation worker stopped answering.', 'The simulation kept diverging from the interface.'];

/** Options: where the daily simulation runs, and how it is keeping up. Preferences and readouts only; no game command. */
export function SimulationOptions() {
  const preference = useSimulationStats(s => s.preference);
  const stats = useSimulationStats(s => s.stats);
  const frame = useSimulationStats(s => s.frame);
  useEffect(() => watchFrames(), []);

  const health = frameHealth(frame);
  const workerAvailable = typeof Worker === 'function';
  const statusKey = stats === null
    ? preference === 'main' ? 'main-chosen' : !workerAvailable ? 'unsupported' : 'waiting'
    : stats.mode === 'direct' ? 'fallback' : stats.status === 'starting' ? 'starting' : stats.mode === 'worker' ? 'worker' : 'main-host';
  const status: Record<string, string> = {
    'main-chosen': 'Computing the days on the main thread, as you chose.',
    unsupported: 'This browser cannot run a worker, so the days are computed on the main thread.',
    waiting: 'The worker starts with the first campaign day.',
    starting: 'Starting the simulation worker…',
    worker: 'Computing the days in a Web Worker. Map and windows stay responsive.',
    'main-host': 'Computing the days on the main thread through the worker protocol.',
    fallback: 'The worker was dropped; the days are computed on the main thread.',
  };

  return <fieldset className="appearance-options system-options simulation-options" data-testid="sim-options">
    <legend><LocaleText value="Simulation thread"/></legend>
    <div role="group" aria-label={translateLive('Simulation thread')} className="sys-modes">
      {MODES.map(m => <button type="button" key={m.value} data-testid={`sim-mode-${m.value}`} aria-pressed={preference === m.value} title={translateLive(m.hint)} onClick={() => setSimulationPreference(m.value)}><LocaleText value={m.label}/></button>)}
    </div>
    <p className="sys-status" role="status" aria-live="polite" data-testid="sim-status" data-state={statusKey} data-mode={stats?.mode ?? preference} data-health={health}>
      <span className="sys-badge" data-kind={statusKey === 'fallback' ? 'warn' : statusKey === 'worker' ? 'good' : 'plain'} aria-hidden="true"/>
      <span><LocaleText value={status[statusKey]}/></span>
    </p>
    {stats?.reason && <small className="sys-reason" data-testid="sim-reason">{REASONS.includes(stats.reason) ? <LocaleText value={stats.reason}/> : stats.reason}</small>}

    <dl className="sys-metrics" data-testid="sim-metrics">
      <div><dt><LocaleText value="Computing a day"/></dt><dd data-testid="sim-metric-tick">{stats && stats.tickMs.count ? formatLive('{0} ms · slowest {1} ms', [ms(stats.tickMs.p50), ms(stats.tickMs.max)]) : '—'}</dd></div>
      <div><dt><LocaleText value="Round trip"/></dt><dd data-testid="sim-metric-roundtrip">{stats && stats.roundTripMs.count ? formatLive('{0} ms · slowest {1} ms', [ms(stats.roundTripMs.p50), ms(stats.roundTripMs.max)]) : '—'}</dd></div>
      <div><dt><LocaleText value="Applying the result"/></dt><dd data-testid="sim-metric-apply">{stats && stats.applyMs.count ? formatLive('{0} ms · slowest {1} ms', [ms(stats.applyMs.p50), ms(stats.applyMs.max)]) : '—'}</dd></div>
      <div><dt><LocaleText value="Commands waiting"/></dt><dd data-testid="sim-metric-queue">{stats?.queueDepth ?? 0}</dd></div>
      <div><dt><LocaleText value="Days computed"/></dt><dd data-testid="sim-metric-days">{stats?.completed ?? 0}</dd></div>
      <div><dt title={translateLive('Clock beats skipped because the previous day was still being computed.')}><LocaleText value="Skipped beats"/></dt><dd data-testid="sim-metric-skipped">{stats?.skipped ?? 0}</dd></div>
      <div><dt title={translateLive('Results thrown away because the game changed while a day was being computed.')}><LocaleText value="Discarded days"/></dt><dd data-testid="sim-metric-discarded">{(stats?.conflicts ?? 0) + (stats?.divergences ?? 0)}</dd></div>
      <div><dt><LocaleText value="State reloads"/></dt><dd data-testid="sim-metric-reloads">{stats?.resyncs ?? 0}</dd></div>
      <div><dt><LocaleText value="Frame rate"/></dt><dd data-testid="sim-metric-fps">{frame && frame.frames ? formatLive('{0} FPS', [String(frame.fps)]) : '—'}</dd></div>
      <div><dt><LocaleText value="Longest frame"/></dt><dd data-testid="sim-metric-worst">{frame && frame.frames ? formatLive('{0} ms', [ms(frame.worstMs)]) : '—'}</dd></div>
      <div><dt title={formatLive('Frames longer than {0} ms, which show as a stutter.', [String(LONG_FRAME_MS)])}><LocaleText value="Stutters"/></dt><dd data-testid="sim-metric-stutters">{frame?.longFrames ?? 0}</dd></div>
    </dl>
    <p className="sys-health" data-testid="sim-health" data-health={health}>
      <span className="sys-badge" data-kind={health === 'smooth' ? 'good' : health === 'measuring' ? 'plain' : 'warn'} aria-hidden="true"/>
      <LocaleText value={health === 'smooth' ? 'The screen is keeping up.' : health === 'busy' ? 'The screen is working hard.' : health === 'stalled' ? 'The screen is stalling.' : 'Measuring the screen…'}/>
    </p>
  </fieldset>;
}

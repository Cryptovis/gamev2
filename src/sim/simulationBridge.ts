// Phase 9.9: the controller that keeps the UI's state and the simulation core's mirror in step.
//
// The UI stays the owner of the state: commands still apply instantly, so clicks feel the same. What moves off the main
// thread is the daily tick. Each clock beat the bridge sends the commands the mirror has not seen (the queue) and asks for
// one day; the core answers with a patch of what the day changed, which the bridge applies and commits.
//
// Safety rules, because two copies of a game can drift:
//  - a state change that did not come through a tracked command (a loaded save, a direct engine call) is noticed by
//    reference and answered with a full reload of the mirror;
//  - a digest of both sides is compared before and after every tick; a mismatch drops the tick and reloads;
//  - commands issued while a tick is in flight are replayed on top of its result, in order, so the order is always
//    "everything queued before the dispatch, then the day, then what the player did meanwhile";
//  - a tick that cannot be reconciled is dropped, never merged (a lost day is harmless, a corrupted one is not);
//  - repeated divergence, a worker error or a silent worker degrades the bridge to plain main-thread ticks for good.

import type { GameCommand } from '../domain/commands';
import type { GameState } from '../domain/game';
import { executeCommandResult } from '../engine/commands';
import type { SimResponse, SimulationHost } from './protocol';
import { RollingWindow, type WindowSummary } from './perfMonitor';
import { GAME_KEYS, UI_KEYS, applyPatch, simKeysEqual, stateDigest } from './stateSync';

export type SimStatus = 'starting' | 'running' | 'degraded' | 'stopped';
export type TickOutcome = 'dispatched' | 'skipped' | 'direct';

export interface SimStats {
  /** Where the daily tick runs right now. 'direct' means the bridge gave up on its host and ticks on the main thread. */
  mode: 'worker' | 'main' | 'direct';
  status: SimStatus;
  reason: string | null;
  dispatched: number;
  completed: number;
  /** Clock beats dropped because the previous day was still being computed (backpressure). */
  skipped: number;
  /** Results discarded because the UI changed the state behind the bridge's back while the day was in flight. */
  conflicts: number;
  divergences: number;
  /** Full state reloads sent to the mirror. */
  resyncs: number;
  directTicks: number;
  /** Commands waiting for the next dispatch, plus those issued during the flight. */
  queueDepth: number;
  inFlight: boolean;
  tickMs: WindowSummary;
  roundTripMs: WindowSummary;
  applyMs: WindowSummary;
}

export interface BridgeDeps {
  host: SimulationHost;
  getState: () => GameState;
  /** Writes simulation keys into the store. */
  commit: (partial: Partial<GameState>) => void;
  /** One day on the main thread: the fallback path. */
  directTick: () => void;
  now?: () => number;
  /** Called after anything that changes the stats. */
  onStats?: (stats: SimStats) => void;
  /** The worker must say hello within this long, or the bridge falls back. */
  handshakeMs?: number;
  /** A day in flight longer than this means the worker is stuck. */
  watchdogMs?: number;
  /** Divergences tolerated before giving up on the host. */
  maxDivergences?: number;
}

const UI = new Set<string>(UI_KEYS);

export class SimulationBridge {
  private epoch = 0;
  private batchId = 0;
  private tracked: GameState | null = null;
  private log: GameCommand[] = [];
  private needsLoad = true;
  private everLoaded = false;
  private inflight: { id: number; epoch: number; sentState: GameState; sentAt: number } | null = null;
  private status: SimStatus = 'starting';
  private reason: string | null = null;
  private counters = { dispatched: 0, completed: 0, skipped: 0, conflicts: 0, divergences: 0, resyncs: 0, directTicks: 0 };
  private tickWindow = new RollingWindow();
  private tripWindow = new RollingWindow();
  private applyWindow = new RollingWindow();
  private readonly startedAt: number;
  private readonly now: () => number;
  private off: () => void;

  constructor(private readonly deps: BridgeDeps) {
    this.now = deps.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : 0));
    this.startedAt = this.now();
    this.off = deps.host.listen(message => this.onMessage(message));
  }

  get stats(): SimStats {
    const mode = this.status === 'degraded' || this.status === 'stopped' ? 'direct' : this.deps.host.kind;
    return {
      mode, status: this.status, reason: this.reason, ...this.counters,
      queueDepth: this.log.length, inFlight: this.inflight !== null,
      tickMs: this.tickWindow.summary(), roundTripMs: this.tripWindow.summary(), applyMs: this.applyWindow.summary(),
    };
  }
  private publish() { this.deps.onStats?.(this.stats); }

  /** Called by the store for every command it applies. `prev` and `next` are the states before and after. */
  recordCommand(prev: GameState, next: GameState, command: GameCommand): void {
    if (this.status !== 'running' || next === prev) return;
    if (!this.tracked || !simKeysEqual(prev, this.tracked)) { this.needsLoad = true; this.tracked = null; return; }
    this.log.push(command);
    this.tracked = next;
  }

  /** One clock beat. */
  requestTick(): TickOutcome {
    const now = this.now();
    if (this.status === 'starting' && now - this.startedAt > (this.deps.handshakeMs ?? 4000)) this.degrade('The simulation worker did not start.');
    if (this.status !== 'running') return this.direct();
    if (this.inflight) {
      if (now - this.inflight.sentAt > (this.deps.watchdogMs ?? 15000)) { this.degrade('The simulation worker stopped answering.'); return this.direct(); }
      this.counters.skipped++; this.publish();
      return 'skipped';
    }
    const current = this.deps.getState();
    if (this.needsLoad || !this.tracked || !simKeysEqual(current, this.tracked)) {
      this.epoch++;
      this.deps.host.post({ type: 'load', epoch: this.epoch, state: current });
      this.tracked = current; this.log = []; this.needsLoad = false;
      if (this.everLoaded) this.counters.resyncs++;
      this.everLoaded = true;
    }
    const commands = this.log; this.log = [];
    const id = ++this.batchId;
    this.deps.host.post({ type: 'batch', epoch: this.epoch, id, commands, ticks: 1, selectedCountryId: current.selectedCountryId, expectDigest: stateDigest(current) });
    this.inflight = { id, epoch: this.epoch, sentState: current, sentAt: now };
    this.counters.dispatched++; this.publish();
    return 'dispatched';
  }

  private direct(): TickOutcome { this.counters.directTicks++; this.deps.directTick(); this.publish(); return 'direct'; }

  private degrade(reason: string) {
    if (this.status === 'degraded' || this.status === 'stopped') return;
    this.status = 'degraded'; this.reason = reason;
    this.inflight = null; this.tracked = null; this.log = [];
    this.off(); this.deps.host.terminate();
    this.publish();
  }

  /** Stops listening and shuts the host down. */
  dispose() { this.off(); this.deps.host.terminate(); this.status = 'stopped'; this.inflight = null; this.publish(); }

  private resync() { this.needsLoad = true; this.tracked = null; this.log = []; }

  private onMessage(message: SimResponse) {
    switch (message.type) {
      case 'ready': if (this.status === 'starting') { this.status = 'running'; this.publish(); } return;
      case 'error': this.degrade(message.message || 'The simulation worker failed.'); return;
      case 'pong': case 'loaded': return;
      case 'result': this.onResult(message); return;
    }
  }

  private onResult(message: Extract<SimResponse, { type: 'result' }>) {
    const flight = this.inflight;
    if (!flight || message.id !== flight.id || message.epoch !== flight.epoch) return; // an answer to something we already abandoned
    this.inflight = null;
    if (message.status !== 'ok') {
      this.resync();
      if (message.status === 'diverged' && ++this.counters.divergences >= (this.deps.maxDivergences ?? 3)) this.degrade('The simulation kept diverging from the interface.');
      this.publish();
      return;
    }
    const arrived = this.now();
    const current = this.deps.getState();
    // Something outside the tracked commands touched the state while the day was being computed. The result describes a
    // world that no longer exists: drop it.
    if (!this.tracked || !simKeysEqual(current, this.tracked)) { this.counters.conflicts++; this.resync(); this.publish(); return; }
    let next = applyPatch(flight.sentState, message.patch);
    if (stateDigest(next) !== message.postDigest) {
      this.counters.divergences++; this.resync();
      if (this.counters.divergences >= (this.deps.maxDivergences ?? 3)) this.degrade('The simulation kept diverging from the interface.');
      this.publish();
      return;
    }
    // What the player did while the day was computed happens after that day.
    for (const command of this.log) next = executeCommandResult(next, command).state;
    const partial: Record<string, unknown> = {};
    for (const key of GAME_KEYS) {
      const changed = UI.has(key) ? next[key] !== flight.sentState[key] : next[key] !== current[key];
      if (changed) partial[key] = next[key];
    }
    this.deps.commit(partial as Partial<GameState>);
    this.tracked = next;
    this.counters.completed++;
    this.tickWindow.push(message.timings.tickMs); this.tripWindow.push(arrived - flight.sentAt); this.applyWindow.push(this.now() - arrived);
    this.publish();
  }
}

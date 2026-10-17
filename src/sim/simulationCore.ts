// Phase 9.9: the simulation core. It owns a mirror of the game and turns requests into responses. It knows nothing about
// Workers: simWorker.ts is a thin shell around it, and the main-thread host and the tests drive it directly, so the worker
// and the fallback run exactly the same code.

import type { GameState } from '../domain/game';
import { executeCommandResult } from '../engine/commands';
import { PROTOCOL_VERSION, type SimRequest, type SimResponse } from './protocol';
import { diffState, stateDigest } from './stateSync';

export class SimulationCore {
  private mirror: GameState | null = null;
  private epoch = -1;
  constructor(private readonly now: () => number = () => (typeof performance !== 'undefined' ? performance.now() : 0)) {}

  /** The mirror, for tests. */
  get state(): GameState | null { return this.mirror; }

  hello(): SimResponse { return { type: 'ready', version: PROTOCOL_VERSION }; }

  handle(request: SimRequest): SimResponse {
    try {
      switch (request.type) {
        case 'ping': return { type: 'pong', id: request.id };
        case 'load':
          this.mirror = request.state; this.epoch = request.epoch;
          return { type: 'loaded', epoch: request.epoch, digest: stateDigest(request.state) };
        case 'batch': return this.batch(request);
      }
    } catch (error) {
      // A throw would leave the mirror half-updated; drop it so the next dispatch reloads from the UI's copy.
      this.mirror = null; this.epoch = -1;
      const id = request.type === 'batch' || request.type === 'ping' ? request.id : undefined;
      return { type: 'error', epoch: request.type === 'ping' ? undefined : request.epoch, id, message: error instanceof Error ? error.message : String(error) };
    }
  }

  private batch(request: Extract<SimRequest, { type: 'batch' }>): SimResponse {
    if (!this.mirror || request.epoch !== this.epoch) return { type: 'result', epoch: request.epoch, id: request.id, status: 'no-mirror' };
    let state: GameState = this.mirror.selectedCountryId === request.selectedCountryId ? this.mirror : { ...this.mirror, selectedCountryId: request.selectedCountryId };
    const t0 = this.now();
    let applied = 0;
    for (const command of request.commands) {
      const result = executeCommandResult(state, command);
      if (result.state !== state) applied++;
      state = result.state;
    }
    const workerDigest = stateDigest(state);
    // The UI's state and the mirror disagree: ticking now would only spread the error. Let the controller reload.
    if (workerDigest !== request.expectDigest) { this.mirror = null; this.epoch = -1; return { type: 'result', epoch: request.epoch, id: request.id, status: 'diverged', workerDigest }; }

    const t1 = this.now();
    const before = state;
    let ticksRun = 0;
    for (let i = 0; i < request.ticks; i++) {
      const day = state.day;
      state = executeCommandResult(state, { type: 'time/advanceDay' }).state;
      if (state.day === day) break; // a decision or the end of the campaign holds the clock
      ticksRun++;
    }
    const t2 = this.now();
    const patch = diffState(before, state);
    const postDigest = stateDigest(state);
    const t3 = this.now();
    this.mirror = state;
    return { type: 'result', epoch: request.epoch, id: request.id, status: 'ok', patch, postDigest, ticksRun, commandsApplied: applied, timings: { commandsMs: t1 - t0, tickMs: t2 - t1, diffMs: t3 - t2 } };
  }
}

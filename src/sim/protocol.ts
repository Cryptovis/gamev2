// Phase 9.9: the messages between the UI thread and the simulation worker. Plain data only, so every message survives
// structured cloning and can be recorded and replayed in a test.

import type { GameCommand } from '../domain/commands';
import type { GameState } from '../domain/game';
import type { StatePatch } from './stateSync';

export const PROTOCOL_VERSION = 1;

export type SimRequest =
  /** Replace the worker's mirror with this state. Starts a new epoch; anything still in flight for the old epoch is ignored. */
  | { type: 'load'; epoch: number; state: GameState }
  /**
   * One dispatch: the commands the UI applied since the mirror was last in step, in the order it applied them, then
   * `ticks` days. `expectDigest` is the UI's digest of its own state after those commands; the worker refuses to tick if
   * its mirror disagrees.
   */
  | { type: 'batch'; epoch: number; id: number; commands: GameCommand[]; ticks: number; selectedCountryId: string | null; expectDigest: string }
  | { type: 'ping'; id: number };

export interface BatchTimings {
  /** Milliseconds the worker spent applying the queued commands. */
  commandsMs: number;
  /** Milliseconds the worker spent in the daily tick(s). */
  tickMs: number;
  /** Milliseconds the worker spent diffing the result. */
  diffMs: number;
}

export type SimResponse =
  | { type: 'ready'; version: number }
  | { type: 'pong'; id: number }
  | { type: 'loaded'; epoch: number; digest: string }
  | { type: 'result'; epoch: number; id: number; status: 'ok'; patch: StatePatch; postDigest: string; ticksRun: number; commandsApplied: number; timings: BatchTimings }
  | { type: 'result'; epoch: number; id: number; status: 'diverged'; workerDigest: string }
  | { type: 'result'; epoch: number; id: number; status: 'no-mirror' }
  | { type: 'error'; epoch?: number; id?: number; message: string };

/** The seam between the controller and wherever the engine runs: a real Worker, or the same core on the main thread. */
export interface SimulationHost {
  readonly kind: 'worker' | 'main';
  post(message: SimRequest): void;
  /** Returns the unsubscribe function. */
  listen(handler: (message: SimResponse) => void): () => void;
  terminate(): void;
}

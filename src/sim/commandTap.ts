// Phase 9.9: the store reports every command it applies here, so the simulation bridge can queue it for the worker's mirror.
// A module of its own so the store and the bridge never import each other.

import type { GameCommand } from '../domain/commands';
import type { GameState } from '../domain/game';

type Tap = (prev: GameState, next: GameState, command: GameCommand) => void;
let tap: Tap | null = null;

export function setCommandTap(next: Tap | null) { tap = next; }

/** Passes `next` through unchanged after telling the tap. */
export function noteCommand(prev: GameState, next: GameState, command: GameCommand): GameState {
  if (tap && next !== prev) tap(prev, next, command);
  return next;
}

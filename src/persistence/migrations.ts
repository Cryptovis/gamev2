import type { GameState } from '../domain/game';

export const CURRENT_SCHEMA_VERSION = 7;

export function canLoadSave(state: GameState | null | undefined): state is GameState {
  return Boolean(state && state.schemaVersion === CURRENT_SCHEMA_VERSION && state.blocs && state.council);
}

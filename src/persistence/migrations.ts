import type { GameState } from '../domain/game';

export const CURRENT_SCHEMA_VERSION = 12;

export function canLoadSave(state: GameState | null | undefined): state is GameState {
  return Boolean(state && state.schemaVersion === CURRENT_SCHEMA_VERSION && state.blocs && state.council && state.intelOperations && state.intelligenceLedger && state.culturalInfluence && state.playerProfile && state.preferredSpeed && state.mapPresentation && state.advisorCooldownUntil !== undefined && state.embassies && state.diplomaticOffers && state.production && state.infrastructure);
}

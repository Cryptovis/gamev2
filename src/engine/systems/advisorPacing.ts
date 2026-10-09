import type { GameState } from '../../domain/game';

// Audit E3 (0.88): the resource advisor and the contextual advice each had their own cooldowns, so together they
// paused the game ~40 times a year. They now share one gap: after any advisor pop-up, neither may open another
// for ADVISOR_GLOBAL_GAP_DAYS. Events are separate and keep their own cadence.

/** Minimum days between two advisor pop-ups of any kind (caps them at about 12 a year). */
export const ADVISOR_GLOBAL_GAP_DAYS = 30;

/** Day of the last advisor pop-up, or -Infinity when none was recorded (new games and saves before 0.88). */
export function lastAdvisorPopupDay(state: GameState): number {
  return state.world.living?.advice.lastPopupDay ?? -Infinity;
}

export function advisorPopupAllowed(state: GameState): boolean {
  return state.day - lastAdvisorPopupDay(state) >= ADVISOR_GLOBAL_GAP_DAYS;
}

/** Records a pop-up shown today. The living-world record exists after the first tick; without it nothing is stored. */
export function recordAdvisorPopup(state: GameState): GameState {
  const living = state.world.living;
  if (!living) return state;
  return { ...state, world: { ...state.world, living: { ...living, advice: { ...living.advice, lastPopupDay: state.day } } } };
}

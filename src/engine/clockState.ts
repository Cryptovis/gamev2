import type { GameState } from '../domain/game';
import { campaignInterval } from './clock';
import { pendingVictory } from './systems/victory';

/** Store state: the game plus the UI's open action receipt, which also holds the clock. */
export type ClockState = GameState & { actionReceipt?: unknown };

/** True while a dialog, notice or ended campaign holds the campaign clock. */
export function clockBlocked(s: ClockState): boolean {
  return !!s.activeEvent || !!s.activeAdvisor || !!s.world.living?.advice.active || !!s.world.living?.notice || !!pendingVictory(s) || !!s.actionReceipt || s.campaignStatus !== 'active';
}

/** An automatic assault in the player's war runs the clock at the war pace. */
export function playerAutoWar(s: GameState): boolean {
  return Object.values(s.wars).some((w) => w.autoAssault && w.status === 'active' && (w.attackerId === s.playerCountryId || w.defenderId === s.playerCountryId));
}

/**
 * Milliseconds between campaign days right now, or null when the clock is stopped. Shared by the simulation clock
 * (useGameClock) and render clocks that interpolate within a day (map flights), so both agree on the pace.
 */
export function activeClockInterval(s: ClockState): number | null {
  return campaignInterval(s.speed, playerAutoWar(s), clockBlocked(s), s.world.tutorial.active);
}

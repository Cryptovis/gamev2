import type { CasualtySnapshot, GameState, WarState } from '../../domain/game';
import type { RegionId } from '../../domain/peace';
import { relationFor } from './diplomacy';
import { BLOCKADE_MAX, hasTaskGroups, missionEffects } from './taskGroups';
import { occupiedRegions, regionsValue, type WarSide } from './peaceRegions';

/**
 * Phase 9.6: war score. Pure and derived: it reads the war, the two countries and the world, and stores nothing.
 * Each line has a ceiling; together they reach 120. A surrender or collapse lifts the winner to at least
 * CAPITULATION_FLOOR, which is enough to take the whole country.
 */
export type WarScoreKey = 'casualties' | 'divisions' | 'occupation' | 'capital' | 'blockade' | 'embargo' | 'air' | 'attrition';

export interface WarScoreLine {
  key: WarScoreKey;
  points: number;
  max: number;
}

export interface WarScoreBreakdown {
  side: WarSide;
  winnerId: string;
  loserId: string;
  lines: WarScoreLine[];
  /** Sum of the lines. */
  subtotal: number;
  /** True when the loser surrendered or collapsed, which sets the floor. */
  capitulated: boolean;
  /** Whole points the winner can spend. */
  total: number;
  occupied: RegionId[];
  /** Divisions (or their equivalents) destroyed on the other side. */
  divisionsDestroyed: number;
}

export const CAPITULATION_FLOOR = 100;
export const WAR_SCORE_MAX = 120;

const LINE_MAX: Record<WarScoreKey, number> = { casualties: 22, divisions: 12, occupation: 42, capital: 10, blockade: 8, embargo: 8, air: 10, attrition: 8 };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round1 = (value: number) => Math.round(value * 10) / 10;

/** Army divisions destroyed: manpower, armour, guns, aircraft and ships lost are converted at fixed rates. */
export function divisionsDestroyed(losses: CasualtySnapshot): number {
  return Math.floor(losses.personnel / 10000) + Math.floor(losses.tanks / 120) + Math.floor(losses.artillery / 200) + Math.floor((losses.fighters + losses.bombers) / 15) + Math.floor(losses.warships / 3);
}

/** Other governments that have put sanctions on `targetId`, plus Global Council sanctions: the economic pressure on it. */
export function embargoPressure(state: GameState, targetId: string, belligerents: readonly string[]): number {
  const target = state.countries[targetId];
  if (!target) return 0;
  let partners = 0;
  for (const other of Object.values(state.countries)) {
    if (other.id === targetId || other.annexedBy || belligerents.includes(other.id)) continue;
    if (relationFor(other, targetId).sanctions) partners += 1;
  }
  return partners + (target.globalSanctions ? 3 : 0);
}

export function warScore(state: GameState, war: WarState, side: WarSide): WarScoreBreakdown {
  const winnerId = side === 'attacker' ? war.attackerId : war.defenderId;
  const loserId = side === 'attacker' ? war.defenderId : war.attackerId;
  const enemy = state.countries[loserId];
  const enemyLosses = side === 'attacker' ? war.defenderLosses : war.attackerLosses;
  const enemyExhaustion = side === 'attacker' ? war.defenderExhaustion : war.attackerExhaustion;
  const enemyStart = (side === 'attacker' ? war.defenderStartPersonnel : war.attackerStartPersonnel) ?? ((enemy?.military.personnel ?? 0) + enemyLosses.personnel);

  const capitulated = winnerFor(war) === side;
  const occupied = occupiedRegions(war, side, capitulated);
  const lossShare = enemyStart > 0 ? enemyLosses.personnel / enemyStart : 0;
  const destroyed = divisionsDestroyed(enemyLosses);
  const airLead = (side === 'attacker' ? war.airSuperiority : -war.airSuperiority) / 100;
  const blockade = hasTaskGroups(war) ? missionEffects(state, war)[side].blockade / BLOCKADE_MAX : 0;
  const embargo = embargoPressure(state, loserId, [war.attackerId, war.defenderId, ...(war.defenderAllies ?? [])]);

  const raw: Record<WarScoreKey, number> = {
    casualties: lossShare * 220,
    divisions: destroyed * 0.6,
    occupation: regionsValue(occupied) * LINE_MAX.occupation,
    capital: occupied.includes('capital') ? LINE_MAX.capital : 0,
    blockade: blockade * LINE_MAX.blockade,
    embargo: embargo * 1.2,
    air: Math.max(0, airLead) * LINE_MAX.air,
    attrition: (enemyExhaustion / 100) * LINE_MAX.attrition,
  };
  const lines = (Object.keys(LINE_MAX) as WarScoreKey[]).map(key => ({ key, max: LINE_MAX[key], points: round1(clamp(raw[key], 0, LINE_MAX[key])) }));
  const subtotal = round1(lines.reduce((sum, line) => sum + line.points, 0));
  return { side, winnerId, loserId, lines, subtotal, capitulated, total: Math.floor(capitulated ? Math.max(CAPITULATION_FLOOR, subtotal) : subtotal), occupied, divisionsDestroyed: destroyed };
}

/** The side that ended the war on top, if it has ended decisively. */
export function winnerFor(war: WarState): WarSide | null {
  if (war.status === 'victory') return 'attacker';
  if (war.status === 'defeat') return 'defender';
  return null;
}

/** Both sides' scores, for the war inspection view. */
export function warScoreBoard(state: GameState, war: WarState): Record<WarSide, WarScoreBreakdown> {
  return { attacker: warScore(state, war, 'attacker'), defender: warScore(state, war, 'defender') };
}

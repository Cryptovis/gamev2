// 0.88 track E (audit E2): factions, contested elections and regime pressure.
// Every field is optional on PoliticsState, so saves from before 0.88 load unchanged and the
// engine creates this state lazily on the first tick (see src/engine/systems/factions.ts).

export type FactionKey = 'business' | 'labour' | 'security' | 'traditional' | 'liberal';
export const FACTION_KEYS: readonly FactionKey[] = ['business', 'labour', 'security', 'traditional', 'liberal'];

/** Responses to a regime crisis in a country without elections. */
export type CrisisOption = 'concede' | 'crackdown' | 'reform';

export interface RegimeCrisis {
  openedDay: number;
  /** Day the crisis is decided: coup, mass unrest or survival. */
  deadlineDay: number;
  /** The government's answer, if it gave one. A crisis left unanswered weighs much heavier at the deadline. */
  response?: CrisisOption;
  /** Player only: the warning dialog was closed without an answer (the crisis stays open). */
  acknowledged?: boolean;
}

export interface ElectionRecord {
  day: number;
  /** Government vote share in percent; the opposition took the rest. */
  governmentShare: number;
  won: boolean;
}

export interface FactionState {
  /** Political weight of each faction in percent; the five weights sum to 100. */
  strength: Record<FactionKey, number>;
  /** How satisfied each faction is with the government, 0–100; drifts toward the policy-driven target. */
  satisfaction: Record<FactionKey, number>;
  /** Regime pressure 0–100 in countries without elections; a crisis opens at REGIME_CRISIS_PRESSURE. */
  pressure: number;
  /** Consecutive election wins of the current government (incumbency fatigue). */
  terms: number;
  /** A new or re-elected government enjoys a short honeymoon until this day. */
  honeymoonUntil?: number;
  /** Active concession to one faction (one at a time). */
  concession?: { faction: FactionKey; untilDay: number };
  lastElection?: ElectionRecord;
  crisis?: RegimeCrisis;
  /** Day the last crisis closed; a new one cannot open during the cooldown. */
  lastCrisisDay?: number;
  /** Crisis responses within the last year; each further response is less effective. */
  responseStreak?: number;
  lastResponseDay?: number;
}

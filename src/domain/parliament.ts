/**
 * Phase 9.8: the living parliament (Meclis), the five domestic blocs and the strike engine (Genel Grev).
 *
 * The blocs are the 0.88 factions (factions.ts): business, labour, security, traditional and liberal. This phase gives
 * them seats in a 200-seat chamber, lets the government govern through a coalition, and adds votes of no confidence,
 * cabinet resignations and snap elections. A separate grievance meter turns unhappy unions, inflation, austerity and
 * unpaid wages into strikes that can grow into a general strike.
 *
 * Everything is optional on `WorldState.parliament`: a save without it simply has no chamber yet, and the engine
 * creates a country's record on its first daily pass.
 */
import type { FactionKey } from './politics';

export const CHAMBER_SEATS = 200;
export const MAJORITY_SEATS = 101;

export type CabinetStatus = 'governing' | 'caretaker';
export type StrikeLevel = 'none' | 'local' | 'sectoral' | 'general';
export const STRIKE_LEVELS: readonly StrikeLevel[] = ['none', 'local', 'sectoral', 'general'];

/** What the government can offer the unions. */
export type TalksOffer = 'agreement' | 'shorterHours' | 'wageSubsidy' | 'crackdown';
export const TALKS_OFFERS: readonly TalksOffer[] = ['agreement', 'shorterHours', 'wageSubsidy', 'crackdown'];

export interface NoConfidenceMotion {
  openedDay: number;
  voteDay: number;
}

export interface VoteRecord {
  day: number;
  /** Seats that backed the government (loyal coalition and confidence-and-supply partners). */
  ayes: number;
  noes: number;
  survived: boolean;
}

export interface ParliamentEntry {
  day: number;
  kind: 'seated' | 'partnerLeft' | 'partnerJoined' | 'motion' | 'survived' | 'resigned' | 'snap' | 'strike' | 'general' | 'agreement' | 'riot';
  /** Free detail: a bloc key or a level name. */
  detail?: string;
}

export interface StrikeState {
  level: StrikeLevel;
  /** Day the current strike began; absent while there is none. */
  startedDay?: number;
  /** Days the current level has lasted. */
  levelDays: number;
  /** Public disorder 0-100: protests that turn into riots once the general strike drags on. */
  disorder: number;
  /** A collective agreement holds the unions quiet until this day. */
  agreementUntil?: number;
  /** A wage subsidy is paid every day until this day. */
  subsidyUntil?: number;
  /** Shorter working hours remain in force until this day (a lasting productivity cost). */
  hoursUntil?: number;
  lastTalksDay?: number;
  /** Offers made within the last year; each further one is less effective. */
  talksStreak?: number;
  lastRiotDay?: number;
}

export interface CountryParliament {
  seats: Record<FactionKey, number>;
  seatedDay: number;
  /** Blocs in government; the first one holds the premiership. */
  coalition: FactionKey[];
  /** Confidence-and-supply partners outside the cabinet: bloc -> last day of the agreement. */
  support: Partial<Record<FactionKey, number>>;
  /** Consecutive days each coalition partner has been unhappy enough to think about leaving. */
  unhappyDays: Record<FactionKey, number>;
  /** Consecutive days the government has lacked a reliable majority. */
  minorityDays: number;
  cabinetFormedDay: number;
  cabinet: CabinetStatus;
  motion?: NoConfidenceMotion;
  /** No new motion until this day. */
  motionCooldownUntil?: number;
  lastVote?: VoteRecord;
  /** Unions' grievance 0-100; strikes begin when it reaches the thresholds in parliamentStrikes.ts. */
  unrest: number;
  strike: StrikeState;
  history: ParliamentEntry[];
}

export interface ParliamentState {
  countries: Record<string, CountryParliament>;
}

export type ParliamentCommand =
  | { type: 'parliament/inviteBloc'; faction: FactionKey }
  | { type: 'parliament/dismissBloc'; faction: FactionKey }
  | { type: 'parliament/courtSupport'; faction: FactionKey }
  | { type: 'parliament/concede'; faction: FactionKey }
  | { type: 'parliament/negotiate'; offer: TalksOffer }
  | { type: 'parliament/snapElection' };

export const emptyParliament = (): ParliamentState => ({ countries: {} });

/**
 * Phase 9.6: the peace conference (Barış Masası). A war that ends in a decisive result, a surrender, an armistice or a
 * collapse no longer hands the loser to the winner at once. The winner's war score is spent on demands at a table, and a
 * concluded treaty is applied once, deterministically. Everything here is optional on `WorldState.peace`: saves without
 * it simply have no conferences, treaties or obligations.
 */

/** The six parts every country is divided into for peace talks (see engine/systems/peaceRegions.ts). */
export type RegionId = 'capital' | 'heartland' | 'industrial' | 'resource' | 'frontier_a' | 'frontier_b';
export const REGION_IDS: readonly RegionId[] = ['capital', 'heartland', 'industrial', 'resource', 'frontier_a', 'frontier_b'];
export const FRONTIER_REGIONS: readonly RegionId[] = ['frontier_a', 'frontier_b'];

export type DemandKind = 'annex' | 'puppet' | 'dmz' | 'reparations' | 'disarm';

/** How a war reached the table. */
export type PeaceTrigger = 'victory' | 'surrender' | 'armistice' | 'collapse';

export type ReparationTier = 'light' | 'standard' | 'heavy';
export type DisarmTarget = 'armor' | 'fleet';

/**
 * A demand is a string so it can be stored, compared and sent in a command without a second schema:
 *   annex:<region>              take one region of the loser
 *   puppet                      install a satellite government (the loser becomes a controlled state)
 *   dmz:<frontier_a|frontier_b> forbid the loser from deploying on that frontier and from attacking the winner
 *   reparations:<1-5>:<tier>    monthly tribute for that many years
 *   disarm:<armor|fleet>:<pct>  cap the loser's tanks or warships at that percentage of today's strength
 */
export type DemandId = string;

export interface PeaceConference {
  warId: string;
  winnerId: string;
  loserId: string;
  trigger: PeaceTrigger;
  openedDay: number;
  /** War score the winner holds when the table opens (the capitulation floor is already applied). */
  score: number;
  /** Demands the winner has put on the table, in the order chosen. */
  selected: DemandId[];
  status: 'open' | 'concluded' | 'waived';
  /** Day it was closed. */
  closedDay?: number;
  /** True when a government other than the player dictated the terms. */
  imposed?: boolean;
}

export type PeaceObligation =
  | { id: string; kind: 'reparations'; payerId: string; payeeId: string; tier: ReparationTier; startDay: number; endDay: number; nextDay: number; paid: number }
  | { id: string; kind: 'dmz'; bound: string; beneficiary: string; zone: RegionId; startDay: number; endDay: number }
  | { id: string; kind: 'disarm'; bound: string; beneficiary: string; target: DisarmTarget; cap: number; startDay: number; endDay: number };

export interface PeaceTreaty {
  id: string;
  warId: string;
  day: number;
  winnerId: string;
  loserId: string;
  trigger: PeaceTrigger;
  terms: DemandId[];
  scoreSpent: number;
  imposed: boolean;
  /** Player has read the notice (only imposed treaties that involve the player need reading). */
  read: boolean;
}

/** An AI government on the losing side asks the player for an armistice. */
export interface ArmisticeOffer {
  warId: string;
  fromId: string;
  day: number;
  /** An open offer lapses on this day; a declined one blocks a new request until it. */
  expiresDay: number;
  status: 'open' | 'declined';
}

export interface PeaceState {
  conferences: Record<string, PeaceConference>;
  /** Armistice requests by war id. Absent until the first request. */
  offers?: Record<string, ArmisticeOffer>;
  treaties: PeaceTreaty[];
  obligations: PeaceObligation[];
  /** loser id -> region -> the country that now holds it. */
  cessions: Record<string, Partial<Record<RegionId, string>>>;
}

export const emptyPeace = (): PeaceState => ({ conferences: {}, treaties: [], obligations: [], cessions: {} });

/** Days a conference waits for the winner before its current demands are signed as they stand. */
export const CONFERENCE_PATIENCE_DAYS = 30;
/** Days an armistice request stays open, and the quiet period after the player declines one. */
export const ARMISTICE_OFFER_DAYS = 20;
export const ARMISTICE_QUIET_DAYS = 30;
/** Length of a DMZ or disarmament clause. */
export const CLAUSE_DAYS = 1825;

// Phase 9.8: seats, the lead bloc and coalition arithmetic. Pure functions of a country's factions; nothing here
// reads the clock or draws random numbers.

import type { CountryState, IdeologyType } from '../../domain/game';
import { CHAMBER_SEATS, MAJORITY_SEATS, type CountryParliament } from '../../domain/parliament';
import { FACTION_KEYS, type FactionKey, type FactionState } from '../../domain/politics';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// ---- Tunables ---------------------------------------------------------------------------------------------

/** A bloc this satisfied is loyal; below it a bloc's seats count for proportionally less when the chamber votes. */
export const LOYAL_SATISFACTION = 45;
/** A new cabinet recruits partners until it holds this many seats beyond a bare majority, so one cooling partner does not topple it. */
export const COALITION_CUSHION = 8;
/** A bloc must be at least this satisfied to accept a seat in the cabinet. */
export const PARTNER_MIN_SATISFACTION = 42;
/** A coalition partner this unhappy starts counting days toward walking out. */
export const PARTNER_QUIT_SATISFACTION = 32;
/** Days of unhappiness before the partner leaves the cabinet. */
export const PARTNER_PATIENCE_DAYS = 20;

export const BLOC_LABEL: Record<FactionKey, string> = {
  business: 'Industrialists', labour: 'Organised labour', security: 'Military and nationalists', traditional: 'Traditionalists', liberal: 'Civil technocrats',
};

/** How naturally each ideology leads a government through each bloc. */
const AFFINITY: Record<IdeologyType, Partial<Record<FactionKey, number>>> = {
  pluralist: { business: 1.2, liberal: 1.3 },
  state_centric: { security: 1.4, business: 1.1 },
  state_socialist: { labour: 1.5 },
  royalist: { traditional: 1.3, security: 1.2 },
  religious_state: { traditional: 1.6 },
};

/** The bloc that holds the premiership: the strongest bloc once the national ideology has weighed in. */
export function leadBloc(c: Pick<CountryState, 'society'>, strength: Record<FactionKey, number>): FactionKey {
  const affinity = AFFINITY[c.society.ideology] ?? {};
  let best = FACTION_KEYS[0], top = -1;
  for (const k of FACTION_KEYS) {
    const score = strength[k] * (affinity[k] ?? 1);
    if (score > top) { top = score; best = k; }
  }
  return best;
}

/**
 * Seats won at an election. A bloc's weight is its structural strength, lifted by how content it is; the lead bloc is
 * also carried by national approval and stability. Largest-remainder rounding keeps the chamber at exactly 200.
 */
export function allocateSeats(c: Pick<CountryState, 'politics'>, f: FactionState, lead: FactionKey): Record<FactionKey, number> {
  const mood = 1 + clamp((c.politics.approval - 50) / 100, -0.5, 0.5) * 0.6 + clamp((c.politics.stability - 50) / 100, -0.5, 0.5) * 0.3;
  const weight = {} as Record<FactionKey, number>;
  let total = 0;
  for (const k of FACTION_KEYS) {
    weight[k] = Math.max(0.5, f.strength[k]) * (0.6 + 0.8 * clamp(f.satisfaction[k], 0, 100) / 100) * (k === lead ? mood : 1);
    total += weight[k];
  }
  const seats = {} as Record<FactionKey, number>;
  const rest: { key: FactionKey; frac: number }[] = [];
  let used = 0;
  for (const k of FACTION_KEYS) {
    const exact = (weight[k] / total) * CHAMBER_SEATS;
    seats[k] = Math.floor(exact);
    used += seats[k];
    rest.push({ key: k, frac: exact - seats[k] });
  }
  rest.sort((a, b) => b.frac - a.frac || FACTION_KEYS.indexOf(a.key) - FACTION_KEYS.indexOf(b.key));
  for (let i = 0; used < CHAMBER_SEATS; i++, used++) seats[rest[i % rest.length].key] += 1;
  return seats;
}

// ---- Coalition arithmetic -----------------------------------------------------------------------------------

export const seatsOf = (seats: Record<FactionKey, number>, blocs: readonly FactionKey[]) => blocs.reduce((sum, k) => sum + seats[k], 0);

/** Seats the cabinet blocs hold on paper. */
export const governmentSeats = (p: CountryParliament) => seatsOf(p.seats, p.coalition);

/** Blocs with a live confidence-and-supply agreement that are not in the cabinet. */
export const supportBlocs = (p: CountryParliament, day: number): FactionKey[] =>
  FACTION_KEYS.filter(k => !p.coalition.includes(k) && (p.support[k] ?? -1) >= day);

/** How reliably a bloc votes with the government: 1 when content, fading toward 0 as satisfaction falls. */
export const loyalty = (satisfaction: number) => clamp(satisfaction / LOYAL_SATISFACTION, 0, 1);

/** Seats that will really vote for the government: the cabinet and its supply partners, weighted by loyalty. */
export function reliableSeats(p: CountryParliament, f: FactionState, day: number): number {
  const blocs = [...p.coalition, ...supportBlocs(p, day)];
  return Math.round(blocs.reduce((sum, k) => sum + p.seats[k] * loyalty(f.satisfaction[k]), 0));
}

export const hasMajority = (seats: number) => seats >= MAJORITY_SEATS;

/** A bloc that would join a cabinet today. */
export const willingPartner = (f: FactionState, k: FactionKey) => f.satisfaction[k] >= PARTNER_MIN_SATISFACTION;

/** Partners to approach, best first: content blocs, then the large ones. */
export function rankedPartners(p: Pick<CountryParliament, 'seats' | 'coalition'>, f: FactionState): FactionKey[] {
  return FACTION_KEYS
    .filter(k => !p.coalition.includes(k) && willingPartner(f, k))
    .sort((a, b) => (f.satisfaction[b] + p.seats[b] * 0.4) - (f.satisfaction[a] + p.seats[a] * 0.4) || FACTION_KEYS.indexOf(a) - FACTION_KEYS.indexOf(b));
}

/** The lead bloc plus the best partners until the cabinet commands a majority with a cushion (or no willing partner is left). */
export function formCoalition(seats: Record<FactionKey, number>, f: FactionState, lead: FactionKey): FactionKey[] {
  const coalition: FactionKey[] = [lead];
  while (seatsOf(seats, coalition) < MAJORITY_SEATS + COALITION_CUSHION) {
    const next = rankedPartners({ seats, coalition }, f)[0];
    if (!next) break;
    coalition.push(next);
  }
  return coalition;
}

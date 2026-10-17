// Phase 9.8: the living parliament. Seats, coalition government, confidence-and-supply deals, votes of no confidence,
// cabinet resignations and snap elections, plus the strike engine's daily pass and the player's and the AI's commands.
// The blocs and their satisfaction come from factions.ts; elections are still held there, and this module reseats the
// chamber after each one. Pure functions of GameState; every roll is a threshold on state, so no seed is consumed.

import type { CountryState, GameState } from '../../domain/game';
import {
  CHAMBER_SEATS, MAJORITY_SEATS, emptyParliament, type CountryParliament, type ParliamentCommand, type ParliamentEntry,
  type ParliamentState, type StrikeLevel, type StrikeState, type TalksOffer,
} from '../../domain/parliament';
import { FACTION_KEYS, type FactionKey, type FactionState } from '../../domain/politics';
import type { LeaderModifiers } from './leaderPerks';
import { applyConcession, concessionStatus, factionsFor, isElectoral, winProbability, expectedGovernmentShare, coalitionSupport } from './factions';
import {
  PARTNER_PATIENCE_DAYS, PARTNER_QUIT_SATISFACTION, allocateSeats, formCoalition, governmentSeats, hasMajority, leadBloc,
  rankedPartners, reliableSeats, supportBlocs, willingPartner, BLOC_LABEL,
} from './parliamentSeats';
import {
  AGREEMENT_DAYS, AGREEMENT_INFLATION, DISORDER_UNREST_LEVEL, HOURS_DAYS, HOURS_PRODUCTIVITY_COST, RIOT_DISORDER, RIOT_INTERVAL,
  STRIKE_EFFECT, SUBSIDY_DAYS, emptyStrike, grievanceChange, grievanceDrivers, nextDisorder, strikeLevelFor, strikeRisk,
  subsidyDailyB, talksMultiplier, talksOptions, type GrievanceDriver, type StrikeEffect, type StrikeRisk, type TalksPreview,
} from './parliamentStrikes';
import { formatCostB, scaledCostB } from './policyPressure';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round1 = (value: number) => Math.round(value * 10) / 10;

// ---- Tunables ---------------------------------------------------------------------------------------------

/** Days a government can lack a reliable majority before the opposition tables a motion of no confidence. */
export const MOTION_GRACE_DAYS = 10;
/** Days between the motion and the vote, during which the government can still rebuild a majority. */
export const MOTION_DAYS = 10;
/** After a motion is survived, no new one for this long. */
export const MOTION_COOLDOWN_DAYS = 90;
/** Days of campaign after a resignation or a called snap election. */
export const SNAP_CAMPAIGN_DAYS = 30;
/** A snap election can only be called with at least this long left on the clock. */
export const SNAP_MIN_DAYS = 60;
/** Confidence-and-supply agreement: cost at the reference GDP, duration, and the goodwill it buys. */
export const SUPPORT_BASE_COST_B = 3;
export const SUPPORT_DAYS = 120;
export const SUPPORT_GOODWILL = 6;
/** Satisfaction a bloc needs before it will even talk about supporting the government. */
export const SUPPORT_MIN_SATISFACTION = PARTNER_QUIT_SATISFACTION;
export const DISMISS_SNUB = 6;
/** A tax change bigger than this many points is a reform that needs the chamber. */
export const TAX_REFORM_STEP = 4;
const HISTORY_LIMIT = 12;

// ---- State ------------------------------------------------------------------------------------------------

export const parliamentOf = (state: GameState): ParliamentState => state.world.parliament ?? emptyParliament();
export const recordOf = (state: GameState, id: string): CountryParliament | undefined => state.world.parliament?.countries[id];

function withRecord(state: GameState, id: string, record: CountryParliament): GameState {
  const parliament = parliamentOf(state);
  return { ...state, world: { ...state.world, parliament: { countries: { ...parliament.countries, [id]: record } } } };
}

const zeroCounters = (): Record<FactionKey, number> => ({ business: 0, labour: 0, security: 0, traditional: 0, liberal: 0 });
const note = (state: GameState, text: string): GameState => ({ ...state, sitrep: [text, ...state.sitrep].slice(0, 12) });
const entry = (p: CountryParliament, day: number, kind: ParliamentEntry['kind'], detail?: string): ParliamentEntry[] =>
  [{ day, kind, ...(detail ? { detail } : {}) }, ...p.history].slice(0, HISTORY_LIMIT);

/** A government that answers to its own chamber: independent and not annexed. */
export const governs = (c: CountryState) => !c.annexedBy && !c.controllerCountryId;

/** Seats, lead bloc and coalition as an election leaves them. */
function seated(c: CountryState, f: FactionState, day: number, previous?: CountryParliament): CountryParliament {
  const lead = leadBloc(c, f.strength);
  const seats = allocateSeats(c, f, lead);
  return {
    seats, seatedDay: day, coalition: formCoalition(seats, f, lead), support: {}, unhappyDays: zeroCounters(), minorityDays: 0,
    cabinetFormedDay: day, cabinet: 'governing', unrest: previous?.unrest ?? 0, strike: previous?.strike ?? emptyStrike(),
    lastVote: previous?.lastVote, history: [{ day, kind: 'seated' as const }, ...(previous?.history ?? [])].slice(0, HISTORY_LIMIT),
  };
}

// ---- Mandate: what the chamber must allow ---------------------------------------------------------------

export type MandateReason = 'ok' | 'caretaker' | 'minority';
export interface Mandate { required: boolean; ok: boolean; seats: number; needed: number; reason: MandateReason }

/** Whether the government can push through a major decree (a declaration of war, a tax reform) today. */
export function mandateFor(state: GameState, id: string): Mandate {
  const c = state.countries[id], p = recordOf(state, id);
  const open: Mandate = { required: false, ok: true, seats: 0, needed: MAJORITY_SEATS, reason: 'ok' };
  if (!c || !p || !isElectoral(c.politics.regime) || !governs(c)) return open;
  const seats = reliableSeats(p, factionsFor(c), state.day);
  if (p.cabinet === 'caretaker') return { required: true, ok: false, seats, needed: MAJORITY_SEATS, reason: 'caretaker' };
  return { required: true, ok: hasMajority(seats), seats, needed: MAJORITY_SEATS, reason: hasMajority(seats) ? 'ok' : 'minority' };
}

export function mandateReason(m: Mandate): string {
  if (m.reason === 'caretaker') return 'A caretaker cabinet cannot pass major decrees until the election.';
  if (m.reason === 'minority') return `The chamber will not pass this: the government holds ${m.seats} of the ${m.needed} seats it needs.`;
  return 'The chamber backs the government.';
}

/** A tax reform (a big step in either direction) needs the chamber; small adjustments never do. */
export function taxReformBlock(state: GameState, id: string, rate: number): string | null {
  const c = state.countries[id];
  if (!c || Math.abs(rate - c.economy.taxRate) <= TAX_REFORM_STEP) return null;
  const m = mandateFor(state, id);
  return m.ok ? null : mandateReason(m);
}

// ---- Strike effects the rest of the engine reads ---------------------------------------------------------

const levelOf = (state: GameState, id: string): StrikeLevel => state.world.parliament?.countries[id]?.strike.level ?? 'none';
export const strikeEffectOf = (state: GameState, id: string): StrikeEffect => STRIKE_EFFECT[levelOf(state, id)];

/** Leader modifiers with the strike's drag on factory output and tax revenue applied; the same object when no strike runs. */
export function strikePerks(state: GameState, id: string, perks: Readonly<LeaderModifiers>): Readonly<LeaderModifiers> {
  const level = levelOf(state, id);
  if (level === 'none') return perks;
  const effect = STRIKE_EFFECT[level];
  return { ...perks, factory: perks.factory * effect.output, tax: perks.tax * (1 - effect.taxLoss) };
}

/** Share of contracted trade that still moves between two countries while either is on strike. */
export function strikeLogistics(state: GameState, a: string, b: string): number {
  return Math.min(strikeEffectOf(state, a).logistics, strikeEffectOf(state, b).logistics);
}

// ---- Shared actions (same costs and rules for the player and the AI) -------------------------------------

/** `reason` is an English template with {0}, {1} holes filled from `args`, so the window can translate it. */
export interface ActionStatus { allowed: boolean; reason: string; costB: number; args?: string[] }
const OK = 'Available.';
/** The English sentence of a status, for sitrep lines. */
export const fillReason = (reason: string, args: readonly string[] = []) => reason.replace(/\{(\d)\}/g, (_, i) => args[Number(i)] ?? '');
const refusal = (reason: string, costB: number, ...args: string[]): ActionStatus => ({ allowed: false, reason, costB, ...(args.length ? { args } : {}) });

function governingElectoral(c: CountryState, p: CountryParliament | undefined): string | null {
  if (!p) return 'The chamber has not met yet.';
  if (!governs(c)) return 'A controlled government has no chamber of its own.';
  if (!isElectoral(c.politics.regime)) return 'This regime has no free vote: the assembly is appointed.';
  if (p.cabinet === 'caretaker') return 'A caretaker cabinet cannot change its coalition before the election.';
  return null;
}

export function inviteStatus(c: CountryState, p: CountryParliament | undefined, faction: FactionKey): ActionStatus {
  const f = factionsFor(c), blocked = governingElectoral(c, p);
  if (blocked) return refusal(blocked, 0);
  if (p!.coalition.includes(faction)) return { allowed: false, reason: 'Already in the cabinet.', costB: 0 };
  if (!willingPartner(f, faction)) return refusal('{0} will not join a government they distrust.', 0, BLOC_LABEL[faction]);
  return { allowed: true, reason: OK, costB: 0 };
}

export function dismissStatus(c: CountryState, p: CountryParliament | undefined, faction: FactionKey): ActionStatus {
  const blocked = governingElectoral(c, p);
  if (blocked) return refusal(blocked, 0);
  if (!p!.coalition.includes(faction)) return { allowed: false, reason: 'Not in the cabinet.', costB: 0 };
  if (p!.coalition[0] === faction) return { allowed: false, reason: 'The premier\'s own bloc cannot be dismissed.', costB: 0 };
  return { allowed: true, reason: OK, costB: 0 };
}

export function supportStatus(c: CountryState, p: CountryParliament | undefined, faction: FactionKey, day: number): ActionStatus {
  const f = factionsFor(c), costB = scaledCostB(c, SUPPORT_BASE_COST_B), blocked = governingElectoral(c, p);
  if (blocked) return refusal(blocked, costB);
  if (p!.coalition.includes(faction)) return { allowed: false, reason: 'Already in the cabinet.', costB };
  if ((p!.support[faction] ?? -1) >= day) return refusal('Already backing the government until day {0}.', costB, String(p!.support[faction]));
  if (f.satisfaction[faction] < SUPPORT_MIN_SATISFACTION) return refusal('{0} are too hostile to bargain with.', costB, BLOC_LABEL[faction]);
  if (c.economy.treasury < costB) return { allowed: false, reason: 'Insufficient treasury.', costB };
  return { allowed: true, reason: OK, costB };
}

export function bargainStatus(c: CountryState, p: CountryParliament | undefined, day: number): ActionStatus {
  const status = concessionStatus(c, day), costB = status.costB, f = factionsFor(c);
  const blocked = governingElectoral(c, p);
  if (blocked) return refusal(blocked, costB);
  if (f.concession && f.concession.untilDay >= day) return refusal('A concession is already running until day {0}.', costB, String(f.concession.untilDay));
  return status.allowed ? { allowed: true, reason: OK, costB } : refusal(status.reason, costB);
}

export function snapStatus(c: CountryState, p: CountryParliament | undefined): ActionStatus {
  const blocked = governingElectoral(c, p);
  if (blocked) return refusal(blocked, 0);
  if (p!.motion) return { allowed: false, reason: 'A vote of no confidence is already pending.', costB: 0 };
  if (c.politics.electionDaysRemaining <= SNAP_MIN_DAYS) return { allowed: false, reason: 'The election is already close.', costB: 0 };
  return { allowed: true, reason: OK, costB: 0 };
}

/** Joins a bloc to the cabinet. */
function inviteBloc(p: CountryParliament, faction: FactionKey, day: number): CountryParliament {
  const support = { ...p.support }; delete support[faction];
  return { ...p, coalition: [...p.coalition, faction], support, unhappyDays: { ...p.unhappyDays, [faction]: 0 }, minorityDays: 0, history: entry(p, day, 'partnerJoined', faction) };
}

/** Buys a confidence-and-supply agreement and some goodwill. */
function courtSupport(c: CountryState, p: CountryParliament, faction: FactionKey, day: number): { c: CountryState; p: CountryParliament } {
  const f = factionsFor(c), costB = scaledCostB(c, SUPPORT_BASE_COST_B);
  const satisfaction = { ...f.satisfaction, [faction]: clamp(f.satisfaction[faction] + SUPPORT_GOODWILL, 0, 100) };
  return {
    c: { ...c, economy: { ...c.economy, treasury: c.economy.treasury - costB }, politics: { ...c.politics, factions: { ...f, satisfaction } } },
    p: { ...p, support: { ...p.support, [faction]: day + SUPPORT_DAYS } },
  };
}

function applyTalks(c: CountryState, p: CountryParliament, offer: TalksOffer, day: number): { c: CountryState; p: CountryParliament } {
  const f = factionsFor(c), strike = p.strike, m = talksMultiplier(strike, day), s = { ...f.satisfaction };
  const preview = talksOptions(c, strike, p.unrest, day).find(o => o.offer === offer)!;
  let economy = { ...c.economy, treasury: c.economy.treasury - preview.costB };
  let approval = c.politics.approval, stability = c.politics.stability, reputation = c.diplomacy.reputation;
  let unrest = p.unrest - preview.relief, disorder = strike.disorder;
  const next: StrikeState = { ...strike, lastTalksDay: day, talksStreak: (strike.lastTalksDay !== undefined && day - strike.lastTalksDay < 365 ? strike.talksStreak ?? 0 : 0) + 1 };
  if (offer === 'agreement') {
    s.labour = clamp(s.labour + 8 * m, 0, 100);
    economy = { ...economy, inflation: clamp(economy.inflation + AGREEMENT_INFLATION, -2, 80) };
    next.agreementUntil = day + AGREEMENT_DAYS;
  } else if (offer === 'shorterHours') {
    s.labour = clamp(s.labour + 8 * m, 0, 100); s.business = clamp(s.business - 8, 0, 100);
    economy = { ...economy, productivity: Math.max(40, economy.productivity - HOURS_PRODUCTIVITY_COST) };
    next.hoursUntil = day + HOURS_DAYS;
  } else if (offer === 'wageSubsidy') {
    s.labour = clamp(s.labour + 5 * m, 0, 100); s.business = clamp(s.business - 4, 0, 100);
    next.subsidyUntil = day + SUBSIDY_DAYS;
  } else {
    approval -= 4; stability += 2; reputation -= 3; disorder = clamp(disorder + 10, 0, 100);
    s.labour = clamp(s.labour - 12, 0, 100); s.liberal = clamp(s.liberal - 8, 0, 100);
  }
  next.disorder = disorder;
  return {
    c: {
      ...c, economy, diplomacy: { ...c.diplomacy, reputation: clamp(reputation, 0, 100) },
      politics: { ...c.politics, approval: clamp(approval, 0, 100), stability: clamp(stability, 0, 100), factions: { ...f, satisfaction: s } },
    },
    p: { ...p, unrest: clamp(unrest, 0, 100), strike: next, history: entry(p, day, 'agreement', offer) },
  };
}

/** The government calls the country to the polls early; the cabinet keeps governing through the campaign. */
function callSnap(c: CountryState, p: CountryParliament, day: number): { c: CountryState; p: CountryParliament } {
  return {
    c: { ...c, politics: { ...c.politics, approval: clamp(c.politics.approval - 1, 0, 100), electionDaysRemaining: Math.min(c.politics.electionDaysRemaining, SNAP_CAMPAIGN_DAYS) } },
    p: { ...p, history: entry(p, day, 'snap') },
  };
}

// ---- Daily pass -------------------------------------------------------------------------------------------

interface Outcome { c: CountryState; p: CountryParliament; news: string[]; pause: boolean }

/** After an election the chamber is reseated and a cabinet formed. */
function reseatAfterElection(c: CountryState, p: CountryParliament, day: number, out: Outcome, label: string): CountryParliament {
  const f = factionsFor(c);
  if ((f.lastElection?.day ?? -1) <= p.seatedDay) return p;
  const next = seated(c, f, day, p);
  out.news.push(`PARLIAMENT // ${label}: a new chamber is seated. ${BLOC_LABEL[next.coalition[0]]} lead a cabinet of ${next.coalition.length} bloc${next.coalition.length > 1 ? 's' : ''} with ${governmentSeats(next)} of ${CHAMBER_SEATS} seats.`);
  return next;
}

/** The AI repairs its coalition the way the player can: invite a willing bloc, else buy a supply deal if it can afford one. */
function aiBuildMajority(c: CountryState, p: CountryParliament, day: number): { c: CountryState; p: CountryParliament } {
  const f = factionsFor(c);
  if (hasMajority(reliableSeats(p, f, day))) return { c, p };
  const partner = rankedPartners(p, f)[0];
  if (partner && inviteStatus(c, p, partner).allowed) return { c, p: inviteBloc(p, partner, day) };
  const target = FACTION_KEYS.filter(k => supportStatus(c, p, k, day).allowed).sort((a, b) => p.seats[b] - p.seats[a])[0];
  if (target && c.economy.treasury >= supportStatus(c, p, target, day).costB * 4) return courtSupport(c, p, target, day);
  return { c, p };
}

function coalitionPass(out: Outcome, day: number, player: boolean) {
  let { c, p } = out;
  if (!isElectoral(c.politics.regime)) return;
  const f = factionsFor(c), unhappy = { ...p.unhappyDays };
  let coalition = p.coalition, history = p.history;
  for (const k of p.coalition.slice(1)) {
    unhappy[k] = f.satisfaction[k] < PARTNER_QUIT_SATISFACTION ? unhappy[k] + 1 : Math.max(0, unhappy[k] - 2);
    if (unhappy[k] >= PARTNER_PATIENCE_DAYS) {
      coalition = coalition.filter(x => x !== k); unhappy[k] = 0;
      history = [{ day, kind: 'partnerLeft' as const, detail: k }, ...history].slice(0, HISTORY_LIMIT);
      out.news.push(`PARLIAMENT // ${BLOC_LABEL[k]} walked out of the ${c.name} cabinet.`);
      if (player) out.pause = true;
    }
  }
  p = { ...p, coalition, unhappyDays: unhappy, history };
  if (!player && p.cabinet === 'governing') ({ c, p } = aiBuildMajority(c, p, day));
  const reliable = reliableSeats(p, factionsFor(c), day);
  out.c = c; out.p = { ...p, minorityDays: hasMajority(reliable) ? 0 : p.minorityDays + 1 };
}

function motionPass(out: Outcome, day: number, player: boolean) {
  const { c } = out; let p = out.p;
  if (!isElectoral(c.politics.regime) || p.cabinet !== 'governing') return;
  const f = factionsFor(c);
  if (!p.motion && p.minorityDays >= MOTION_GRACE_DAYS && day >= (p.motionCooldownUntil ?? 0)) {
    p = { ...p, motion: { openedDay: day, voteDay: day + MOTION_DAYS }, history: entry(p, day, 'motion') };
    out.news.push(`PARLIAMENT // The opposition tabled a motion of no confidence in the ${c.name} government. The vote is in ${MOTION_DAYS} days.`);
    if (player) out.pause = true;
  } else if (p.motion && day >= p.motion.voteDay) {
    const ayes = reliableSeats(p, f, day), survived = hasMajority(ayes);
    const lastVote = { day, ayes, noes: CHAMBER_SEATS - ayes, survived };
    if (survived) {
      p = { ...p, motion: undefined, motionCooldownUntil: day + MOTION_COOLDOWN_DAYS, minorityDays: 0, lastVote, history: entry(p, day, 'survived') };
      out.c = { ...c, politics: { ...c.politics, approval: clamp(c.politics.approval + 2, 0, 100) } };
      out.news.push(`PARLIAMENT // The ${c.name} government survived the vote of no confidence, ${ayes} to ${lastVote.noes}.`);
    } else {
      p = { ...p, motion: undefined, cabinet: 'caretaker', lastVote, history: entry(p, day, 'resigned') };
      out.c = { ...c, politics: { ...c.politics, stability: clamp(c.politics.stability - 4, 0, 100), approval: clamp(c.politics.approval - 3, 0, 100), electionDaysRemaining: Math.min(c.politics.electionDaysRemaining, SNAP_CAMPAIGN_DAYS) } };
      out.news.push(`PARLIAMENT // The ${c.name} government lost the vote of no confidence, ${ayes} to ${lastVote.noes}. The cabinet resigned and a snap election follows.`);
    }
    if (player) out.pause = true;
  }
  out.p = p;
}

/** The AI answers a strike the way the player can: pay if it is rich, subsidise if it can, else break it. */
function aiTalksChoice(c: CountryState, p: CountryParliament, day: number): TalksOffer | null {
  if (p.strike.level === 'none' && p.unrest < 40) return null;
  const options = talksOptions(c, p.strike, p.unrest, day), can = (o: TalksOffer) => options.find(x => x.offer === o)!;
  if (can('agreement').allowed && c.economy.treasury >= can('agreement').costB * 4) return 'agreement';
  if (can('wageSubsidy').allowed && c.economy.treasury > c.economy.gdp * 0.02) return 'wageSubsidy';
  if (can('shorterHours').allowed && p.strike.level !== 'none') return 'shorterHours';
  return p.strike.level === 'general' || p.strike.level === 'sectoral' ? (can('crackdown').allowed ? 'crackdown' : null) : null;
}

function strikePass(out: Outcome, day: number, player: boolean) {
  let { c, p } = out;
  const f = factionsFor(c);
  if (!player) {
    const offer = aiTalksChoice(c, p, day);
    if (offer) ({ c, p } = applyTalks(c, p, offer, day));
  }
  const before = p.strike;
  const unrest = clamp(p.unrest + grievanceChange(c, f, before, day), 0, 100);
  const level = strikeLevelFor(unrest, before.level);
  let strike: StrikeState = { ...before, disorder: nextDisorder(before.disorder, level, unrest) };
  let history = p.history;
  const levels: StrikeLevel[] = ['none', 'local', 'sectoral', 'general'];
  if (level !== before.level) {
    const rising = levels.indexOf(level) > levels.indexOf(before.level);
    strike = { ...strike, level, levelDays: 0, startedDay: level === 'none' ? undefined : before.startedDay ?? day };
    if (rising) {
      history = [{ day, kind: level === 'general' ? ('general' as const) : ('strike' as const), detail: level }, ...history].slice(0, HISTORY_LIMIT);
      const verb = level === 'local' ? 'Local strikes broke out' : level === 'sectoral' ? 'The strikes spread across whole industries' : 'The unions called a general strike';
      if (player || level === 'general') out.news.push(`STRIKE // ${verb} in ${c.name}. Output, trade and tax revenue are falling.`);
      if (player) out.pause = true;
    } else if (player) out.news.push(level === 'none' ? `STRIKE // The strikes in ${c.name} have ended.` : `STRIKE // The strikes in ${c.name} are easing.`);
  } else strike = { ...strike, levelDays: before.levelDays + 1 };

  let { politics, economy } = c;
  if (strike.subsidyUntil !== undefined && strike.subsidyUntil >= day) {
    if (economy.treasury > 0) economy = { ...economy, treasury: economy.treasury - subsidyDailyB(c) };
    else strike = { ...strike, subsidyUntil: undefined };
  }
  if (strike.disorder >= DISORDER_UNREST_LEVEL) politics = { ...politics, stability: clamp(politics.stability - (strike.disorder - DISORDER_UNREST_LEVEL) * 0.004, 0, 100), approval: clamp(politics.approval - 0.03, 0, 100) };
  if (strike.disorder >= RIOT_DISORDER && day - (strike.lastRiotDay ?? -Infinity) >= RIOT_INTERVAL) {
    strike = { ...strike, lastRiotDay: day };
    politics = { ...politics, stability: clamp(politics.stability - 3, 0, 100), approval: clamp(politics.approval - 2, 0, 100) };
    history = [{ day, kind: 'riot' as const }, ...history].slice(0, HISTORY_LIMIT);
    out.news.push(`UNREST // Riots broke out in the streets of ${c.name}.`);
    if (player) out.pause = true;
  }
  if (strike.level === 'general' && !isElectoral(politics.regime) && politics.factions) {
    politics = { ...politics, factions: { ...politics.factions, pressure: clamp(politics.factions.pressure + 0.2, 0, 100) } };
  }
  out.c = { ...c, economy, politics }; out.p = { ...p, unrest, strike, history };
}

/** Daily parliament and strike pass for every self-governing country (called from tick.ts right after the elections). */
export function processParliament(state: GameState): GameState {
  const day = state.day, countries = { ...state.countries }, records = { ...parliamentOf(state).countries };
  let speed = state.speed;
  const news: string[] = [];
  for (const id of Object.keys(countries).sort()) {
    let c = countries[id];
    if (!governs(c)) continue;
    const player = id === state.playerCountryId;
    let p = records[id];
    const out: Outcome = { c, p: p ?? seated(c, factionsFor(c), day), news: [], pause: false };
    if (p) out.p = reseatAfterElection(c, p, day, out, c.name);
    coalitionPass(out, day, player);
    motionPass(out, day, player);
    strikePass(out, day, player);
    countries[id] = out.c; records[id] = out.p;
    if (player) { news.push(...out.news); if (out.pause) speed = 0; }
    else news.push(...out.news.filter(n => n.startsWith('STRIKE') || n.includes('resigned')));
  }
  const sitrep = news.length ? [...news.reverse(), ...state.sitrep].slice(0, 12) : state.sitrep;
  return { ...state, countries, speed, sitrep, world: { ...state.world, parliament: { countries: records } } };
}

// ---- Player commands ---------------------------------------------------------------------------------------

export function applyParliamentCommand(state: GameState, command: ParliamentCommand): GameState {
  const c = state.countries[state.playerCountryId];
  if (!c) return state;
  const day = state.day;
  const p = recordOf(state, c.id);
  const done = (next: { c: CountryState; p: CountryParliament }, text: string) =>
    note(withRecord({ ...state, countries: { ...state.countries, [c.id]: next.c } }, c.id, next.p), text);
  const refuse = (status: ActionStatus) => note(state, `PARLIAMENT // ${fillReason(status.reason, status.args)}`);
  switch (command.type) {
    case 'parliament/inviteBloc': {
      const status = inviteStatus(c, p, command.faction);
      if (!status.allowed) return refuse(status);
      return note(withRecord(state, c.id, inviteBloc(p!, command.faction, day)), `PARLIAMENT // ${BLOC_LABEL[command.faction]} joined the cabinet.`);
    }
    case 'parliament/dismissBloc': {
      const status = dismissStatus(c, p, command.faction);
      if (!status.allowed) return refuse(status);
      const f = factionsFor(c), faction = command.faction;
      const satisfaction = { ...f.satisfaction, [faction]: clamp(f.satisfaction[faction] - DISMISS_SNUB, 0, 100) };
      const next = { ...p!, coalition: p!.coalition.filter(k => k !== faction), unhappyDays: { ...p!.unhappyDays, [faction]: 0 }, history: entry(p!, day, 'partnerLeft', faction) };
      return done({ c: { ...c, politics: { ...c.politics, factions: { ...f, satisfaction } } }, p: next }, `PARLIAMENT // ${BLOC_LABEL[faction]} were dropped from the cabinet.`);
    }
    case 'parliament/courtSupport': {
      const status = supportStatus(c, p, command.faction, day);
      if (!status.allowed) return refuse(status);
      return done(courtSupport(c, p!, command.faction, day), `PARLIAMENT // ${BLOC_LABEL[command.faction]} agreed to back the government for ${SUPPORT_DAYS} days (${formatCostB(status.costB)}).`);
    }
    case 'parliament/concede': {
      const status = bargainStatus(c, p, day);
      if (!status.allowed) return refuse(status);
      const bargained = applyConcession(c, day, command.faction);
      if (!bargained) return refuse(status);
      return done({ c: bargained, p: { ...p!, unhappyDays: { ...p!.unhappyDays, [command.faction]: 0 } } }, `PARLIAMENT // Concessions to ${BLOC_LABEL[command.faction]} (${formatCostB(status.costB)}).`);
    }
    case 'parliament/negotiate': {
      if (!p) return note(state, 'PARLIAMENT // The chamber has not met yet.');
      const preview = talksOptions(c, p.strike, p.unrest, day).find(o => o.offer === command.offer);
      if (!preview?.allowed) return note(state, `STRIKE // ${preview ? fillReason(preview.reason, preview.args) : 'Talks are not possible.'}`);
      return done(applyTalks(c, p, command.offer, day), `STRIKE // ${TALKS_LABEL[command.offer]} offered to the unions.`);
    }
    case 'parliament/snapElection': {
      const status = snapStatus(c, p);
      if (!status.allowed) return refuse(status);
      return done(callSnap(c, p!, day), `PARLIAMENT // A snap election was called. The country votes in ${Math.min(c.politics.electionDaysRemaining, SNAP_CAMPAIGN_DAYS)} days.`);
    }
  }
}

export const TALKS_LABEL: Record<TalksOffer, string> = {
  agreement: 'A collective agreement', shorterHours: 'Shorter working hours', wageSubsidy: 'A wage subsidy', crackdown: 'A police crackdown',
};

// ---- Preview for the window --------------------------------------------------------------------------------

export interface BlocView {
  key: FactionKey;
  seats: number;
  /** Share of the chamber, percent. */
  share: number;
  satisfaction: number;
  strength: number;
  inCabinet: boolean;
  lead: boolean;
  /** Last day of a confidence-and-supply agreement, if one runs. */
  supportUntil: number | null;
  unhappyDays: number;
  willing: boolean;
  concession: boolean;
  invite: ActionStatus;
  dismiss: ActionStatus;
  court: ActionStatus;
}

export interface ParliamentView {
  ready: boolean;
  electoral: boolean;
  cabinet: 'governing' | 'caretaker';
  blocs: BlocView[];
  totalSeats: number;
  majority: number;
  /** Seats of the cabinet on paper, and the seats that will really vote for it. */
  cabinetSeats: number;
  reliable: number;
  supportSeats: number;
  mandate: Mandate;
  minorityDays: number;
  motion: { daysLeft: number } | null;
  lastVote: CountryParliament['lastVote'] | null;
  electionDays: number | null;
  winChance: number | null;
  governmentShare: number | null;
  coalitionSupport: number;
  bargain: ActionStatus;
  snap: ActionStatus;
  strike: {
    level: StrikeLevel;
    risk: StrikeRisk;
    unrest: number;
    disorder: number;
    levelDays: number;
    effect: StrikeEffect;
    drivers: GrievanceDriver[];
    dailyChange: number;
    daysToStrike: number | null;
    agreementUntil: number | null;
    subsidyUntil: number | null;
    talks: TalksPreview[];
  };
  history: ParliamentEntry[];
}

const OPEN_ACTION: ActionStatus = { allowed: false, reason: 'The chamber has not met yet.', costB: 0 };

/** Everything the Parliament window shows. The record is created on the first daily pass; before it, the view is empty. */
export function parliamentView(state: GameState, id: string): ParliamentView {
  const c = state.countries[id], p = c ? recordOf(state, id) : undefined, day = state.day;
  const f = c ? factionsFor(c) : undefined;
  const electoral = !!c && isElectoral(c.politics.regime);
  const calm = { level: 'none' as StrikeLevel, risk: 'calm' as StrikeRisk, unrest: 0, disorder: 0, levelDays: 0, effect: STRIKE_EFFECT.none, drivers: [], dailyChange: 0, daysToStrike: null, agreementUntil: null, subsidyUntil: null, talks: [] };
  if (!c || !p || !f) {
    return { ready: false, electoral, cabinet: 'governing', blocs: [], totalSeats: CHAMBER_SEATS, majority: MAJORITY_SEATS, cabinetSeats: 0, reliable: 0, supportSeats: 0, mandate: { required: false, ok: true, seats: 0, needed: MAJORITY_SEATS, reason: 'ok' }, minorityDays: 0, motion: null, lastVote: null, electionDays: null, winChance: null, governmentShare: null, coalitionSupport: 0, bargain: OPEN_ACTION, snap: OPEN_ACTION, strike: calm, history: [] };
  }
  const supports = supportBlocs(p, day);
  const blocs: BlocView[] = FACTION_KEYS.map(key => ({
    key, seats: p.seats[key], share: round1((p.seats[key] / CHAMBER_SEATS) * 100), satisfaction: round1(f.satisfaction[key]), strength: round1(f.strength[key]),
    inCabinet: p.coalition.includes(key), lead: p.coalition[0] === key, supportUntil: supports.includes(key) ? p.support[key]! : null, unhappyDays: p.unhappyDays[key],
    willing: willingPartner(f, key), concession: !!f.concession && f.concession.untilDay >= day && f.concession.faction === key,
    invite: inviteStatus(c, p, key), dismiss: dismissStatus(c, p, key), court: supportStatus(c, p, key, day),
  }));
  const drivers = grievanceDrivers(c, f), change = grievanceChange(c, f, p.strike, day);
  const nextLevelAt = p.strike.level === 'none' ? 50 : p.strike.level === 'local' ? 70 : p.strike.level === 'sectoral' ? 88 : null;
  const daysToStrike = nextLevelAt !== null && change > 0.001 ? Math.ceil((nextLevelAt - p.unrest) / change) : null;
  const elected = electoral ? { share: expectedGovernmentShare(c) } : null;
  return {
    ready: true, electoral, cabinet: p.cabinet, blocs, totalSeats: CHAMBER_SEATS, majority: MAJORITY_SEATS,
    cabinetSeats: governmentSeats(p), reliable: reliableSeats(p, f, day), supportSeats: supports.reduce((sum, k) => sum + p.seats[k], 0),
    mandate: mandateFor(state, id), minorityDays: p.minorityDays, motion: p.motion ? { daysLeft: Math.max(0, p.motion.voteDay - day) } : null, lastVote: p.lastVote ?? null,
    electionDays: electoral ? c.politics.electionDaysRemaining : null, winChance: elected ? winProbability(elected.share) : null, governmentShare: elected ? round1(elected.share) : null,
    coalitionSupport: round1(coalitionSupport(c)), bargain: bargainStatus(c, p, day), snap: snapStatus(c, p),
    strike: {
      level: p.strike.level, risk: strikeRisk(p.unrest, p.strike.level), unrest: round1(p.unrest), disorder: round1(p.strike.disorder), levelDays: p.strike.levelDays,
      effect: STRIKE_EFFECT[p.strike.level], drivers, dailyChange: Math.round(change * 100) / 100, daysToStrike,
      agreementUntil: (p.strike.agreementUntil ?? -1) >= day ? p.strike.agreementUntil! : null, subsidyUntil: (p.strike.subsidyUntil ?? -1) >= day ? p.strike.subsidyUntil! : null,
      talks: talksOptions(c, p.strike, p.unrest, day),
    },
    history: p.history,
  };
}

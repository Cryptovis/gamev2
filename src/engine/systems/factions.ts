// 0.88 track E (audit E2): factions, contested elections and regime pressure.
//
// Every country carries five factions whose satisfaction follows its policies (tax, prices, jobs, welfare,
// ministry budgets, war). The government's coalition support is faction satisfaction weighted by faction
// strength. Democracies and republics hold seeded election contests; autocracies, monarchies and theocracies
// accumulate regime pressure that opens a crisis, which a coup or mass unrest can end. The player and the AI
// run through the same functions, costs and thresholds; only the player sees warnings and chooses responses.
// Everything is a pure function of GameState and the seeded RNG; nothing here reads the clock.

import type { CountryState, GameState, RegimeType } from '../../domain/game';
import { FACTION_KEYS, type CrisisOption, type FactionKey, type FactionState, type RegimeCrisis } from '../../domain/politics';
import { nextRandom } from '../rng';
import { normalizedMinistryShare } from './ministries';
import { formatCostB, scaledCostB } from './policyPressure';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round1 = (value: number) => Math.round(value * 10) / 10;

// ---- Tunables --------------------------------------------------------------------------------------------

/** Share of the gap to the target satisfaction closed per day (half-life ≈ 23 days). */
export const SATISFACTION_DRIFT = 0.03;
/** Share of the gap to the structural faction strength closed per day. */
export const STRENGTH_DRIFT = 0.002;
/** Days between elections. */
export const ELECTION_INTERVAL = 1460;
/** Half-width of the seeded election swing in vote-share points (triangular distribution). */
export const ELECTION_SWING = 6;
/** Vote-share points a government loses per consecutive term already won (capped). */
export const TERM_FATIGUE = 3;
export const MAX_TERM_FATIGUE = 9;
/** Days of honeymoon after an election win, a change of government or a coup. */
export const HONEYMOON_DAYS = 90;
export const HONEYMOON_BONUS = 6;
/** Legitimacy below which regime pressure builds in countries without elections. */
export const LEGITIMACY_FLOOR = 45;
/** Regime pressure at which a crisis opens; days the government then has before the crisis is decided. */
export const REGIME_CRISIS_PRESSURE = 50;
export const CRISIS_DAYS = 45;
export const CRISIS_COOLDOWN = 60;
/** Pressure added at the deadline when the government never answered the crisis. */
export const IGNORED_CRISIS_PENALTY = 20;
/** Security-faction satisfaction at which the security forces stay loyal and a coup becomes far less likely. */
export const LOYAL_SECURITY = 60;
export const LOYAL_SECURITY_FACTOR = 0.25;
/** Concession: GDP-scaled cost, duration and satisfaction bonus to one faction. */
export const CONCESSION_BASE_COST_B = 5;
export const CONCESSION_DAYS = 180;
export const CONCESSION_BONUS = 15;
/** Crisis responses ($B at the reference GDP; scaled with GDP like every other domestic action). */
export const CRISIS_OPTION_BASE_COST_B: Record<CrisisOption, number> = { concede: 6, crackdown: 0, reform: 4 };

export const FACTION_LABEL: Record<FactionKey, string> = {
  business: 'Business', labour: 'Labour', security: 'Security forces', traditional: 'Traditionalists', liberal: 'Urban liberals',
};
export const CRISIS_OPTION_LABEL: Record<CrisisOption, string> = {
  concede: 'Concessions to the security forces', crackdown: 'Crackdown', reform: 'Political reforms',
};

export function isElectoral(regime: RegimeType): boolean {
  return regime === 'democracy' || regime === 'republic';
}

// ---- Structure and satisfaction --------------------------------------------------------------------------

const zeroRecord = (): Record<FactionKey, number> => ({ business: 0, labour: 0, security: 0, traditional: 0, liberal: 0 });

/** Structural faction weights (sum 100) from wealth, ideology, religion, regime and military size. */
export function structuralStrength(c: CountryState): Record<FactionKey, number> {
  const income = (c.economy.gdp * 1e9) / Math.max(1, c.demographics.population);
  const rich = clamp((Math.log10(Math.max(1, income)) - 3) / 2, 0, 1);
  const ideology = c.society.ideology, regime = c.politics.regime;
  const raw: Record<FactionKey, number> = {
    business: 18 + rich * 10 + (ideology === 'pluralist' ? 4 : ideology === 'state_socialist' ? -6 : 0),
    labour: 22 - rich * 6 + (ideology === 'state_socialist' ? 8 : 0) + clamp(c.economy.unemployment, 0, 30) * 0.3,
    security: 14 + c.military.assessment.capability * 0.08 + (regime === 'autocracy' ? 10 : regime === 'monarchy' ? 5 : regime === 'theocracy' ? 4 : 0),
    traditional: 12 + (100 - c.society.secularization) * 0.12 + (ideology === 'religious_state' ? 10 : ideology === 'royalist' ? 6 : 0),
    liberal: 10 + c.society.secularization * 0.1 + rich * 8 + (ideology === 'pluralist' ? 6 : 0) + (isElectoral(regime) ? 4 : 0),
  };
  const total = FACTION_KEYS.reduce((sum, k) => sum + Math.max(1, raw[k]), 0);
  const out = zeroRecord();
  for (const k of FACTION_KEYS) out[k] = (Math.max(1, raw[k]) / total) * 100;
  return out;
}

/**
 * Satisfaction each faction is heading toward under the current policies. Neutral policies (22% tax, the
 * default cabinet split, single-digit inflation and unemployment, no war) land every faction in the mid-50s.
 */
export function satisfactionTargets(c: CountryState, f: Pick<FactionState, 'concession' | 'honeymoonUntil'>, day: number, atWar: boolean): Record<FactionKey, number> {
  const share = (k: Parameters<typeof normalizedMinistryShare>[1]) => normalizedMinistryShare(c, k) * 100;
  const tax = c.economy.taxRate, inflation = c.economy.inflation, unemployment = c.economy.unemployment;
  const welfare = c.demographics.welfare ?? 55, war = atWar ? 1 : 0;
  const mood = (c.politics.approval - 55) * 0.2;
  const electoral = isElectoral(c.politics.regime);
  const t: Record<FactionKey, number> = {
    business: 58 - (tax - 22) * 1.5 - Math.max(0, inflation - 6) * 1.5 + (share('economy') - 22) * 0.7 - war * 6 + mood,
    labour: 56 - Math.max(0, unemployment - 6) * 2.2 - Math.max(0, inflation - 5) * 1.0 + (welfare - 55) * 0.4 + (share('society') - 13) * 0.9 - Math.max(0, tax - 30) * 0.5 + mood,
    security: 56 + (share('defense') - 20) * 1.2 + (share('interior') - 15) * 0.5 + (c.military.readiness - 60) * 0.2 + war * 4 + (c.politics.stability - 60) * 0.15 + mood * 0.5,
    traditional: 56 + (c.society.cohesion - 60) * 0.3 - Math.max(0, c.society.secularization - 60) * 0.15 + (share('society') - 13) * 0.4 + (share('interior') - 15) * 0.3
      - Math.max(0, inflation - 8) * 0.8 + (c.politics.regime === 'monarchy' || c.politics.regime === 'theocracy' ? 4 : 0) + mood,
    liberal: 56 + (share('science') - 18) * 0.7 + (share('society') - 13) * 0.4 - (share('interior') - 15) * 0.6 - Math.max(0, share('intelligence') - 12) * 0.4
      - Math.max(0, unemployment - 8) * 0.8 + (c.diplomacy.reputation - 50) * 0.12 - war * 5 + (electoral ? 3 : -6) + mood,
  };
  const honeymoon = (f.honeymoonUntil ?? 0) > day ? HONEYMOON_BONUS : 0;
  for (const k of FACTION_KEYS) {
    const concession = f.concession && f.concession.untilDay >= day && f.concession.faction === k ? CONCESSION_BONUS : 0;
    t[k] = clamp(t[k] + honeymoon + concession, 5, 95);
  }
  return t;
}

/** Faction state a country starts with (and gets lazily when a pre-0.88 save is loaded). */
export function initialFactions(c: CountryState): FactionState {
  return { strength: structuralStrength(c), satisfaction: satisfactionTargets(c, {}, 0, false), pressure: 0, terms: 0 };
}

/** The country's faction state, or the one it would start with. Read-only; never mutates. */
export function factionsFor(c: CountryState): FactionState {
  return c.politics.factions ?? initialFactions(c);
}

export function factionSatisfaction(c: CountryState): Record<FactionKey, number> {
  return factionsFor(c).satisfaction;
}

/** Government coalition support 0–100: faction satisfaction weighted by faction strength. */
export function coalitionSupport(c: CountryState): number {
  const f = factionsFor(c);
  return FACTION_KEYS.reduce((sum, k) => sum + f.strength[k] * f.satisfaction[k], 0) / 100;
}

/** Points the coalition adds to (or takes from) the stability target in politics.ts; 0 before factions exist. */
export function coalitionStabilityEffect(c: CountryState): number {
  return c.politics.factions ? clamp((coalitionSupport(c) - 50) * 0.08, -4, 4) : 0;
}

/** Legitimacy 0–100 of a government without elections: approval, stability and the loyalty of the security forces. */
export function legitimacy(c: CountryState): number {
  return c.politics.approval * 0.35 + c.politics.stability * 0.4 + factionsFor(c).satisfaction.security * 0.25;
}

/** Daily change of regime pressure at the given legitimacy. */
export function pressureChange(legit: number): number {
  return legit < LEGITIMACY_FLOOR ? (LEGITIMACY_FLOOR - legit) * 0.025 : -(0.1 + (legit - LEGITIMACY_FLOOR) * 0.01);
}

/** Base probability that a crisis ends in a coup at this pressure (see crisisCoupChance). */
export function coupChance(effectivePressure: number): number {
  return clamp((effectivePressure - 40) / 25, 0, 1);
}

/**
 * Coup chance when a crisis is decided. Loyal security forces (satisfaction ≥ LOYAL_SECURITY) cut it to a quarter,
 * but only for a government that answered the crisis; an ignored crisis also adds IGNORED_CRISIS_PENALTY pressure.
 */
export function crisisCoupChance(pressure: number, securitySatisfaction: number, answered: boolean): number {
  if (!answered) return coupChance(pressure + IGNORED_CRISIS_PENALTY);
  return coupChance(pressure) * (securitySatisfaction >= LOYAL_SECURITY ? LOYAL_SECURITY_FACTOR : 1);
}

/** One day of faction drift, structural strength drift and regime pressure. */
export function advanceFactions(c: CountryState, f: FactionState, day: number, atWar: boolean): FactionState {
  const target = satisfactionTargets(c, f, day, atWar), base = structuralStrength(c);
  const satisfaction = zeroRecord(), strength = zeroRecord();
  for (const k of FACTION_KEYS) {
    satisfaction[k] = clamp(f.satisfaction[k] + (target[k] - f.satisfaction[k]) * SATISFACTION_DRIFT, 0, 100);
    strength[k] = f.strength[k] + (base[k] - f.strength[k]) * STRENGTH_DRIFT;
  }
  const next: FactionState = { ...f, satisfaction, strength };
  if (next.concession && next.concession.untilDay < day) delete next.concession;
  next.pressure = isElectoral(c.politics.regime) ? 0 : clamp(f.pressure + pressureChange(legitimacy({ ...c, politics: { ...c.politics, factions: next } })), 0, 100);
  return next;
}

// ---- Elections ------------------------------------------------------------------------------------------

/** Expected government vote share (percent) before the seeded swing. */
export function expectedGovernmentShare(c: CountryState): number {
  const f = factionsFor(c);
  const welfare = c.demographics.welfare ?? 55;
  const economy = clamp(-Math.max(0, c.economy.inflation - 6) * 0.35 - Math.max(0, c.economy.unemployment - 8) * 0.35 + (welfare - 55) * 0.08, -5, 3);
  const fatigue = Math.min(MAX_TERM_FATIGUE, f.terms * TERM_FATIGUE);
  return clamp(50 + (c.politics.approval - 50) * 0.5 + (coalitionSupport(c) - 50) * 0.35 + economy - fatigue, 5, 95);
}

/** Chance that a triangular swing on [-S, S] keeps the government above 50% given its expected share. */
export function winProbability(expectedShare: number, swing = ELECTION_SWING): number {
  const m = expectedShare - 50;
  if (m >= swing) return 1;
  if (m <= -swing) return 0;
  return m >= 0 ? 1 - (swing - m) ** 2 / (2 * swing * swing) : (swing + m) ** 2 / (2 * swing * swing);
}

export interface ElectionForecast { daysRemaining: number; governmentShare: number; oppositionShare: number; winChance: number }
/** Next election forecast for a democracy or republic; null for regimes without elections. */
export function electionForecast(state: GameState, countryId: string): ElectionForecast | null {
  const c = state.countries[countryId];
  if (!c || !isElectoral(c.politics.regime)) return null;
  const share = expectedGovernmentShare(c);
  return { daysRemaining: c.politics.electionDaysRemaining, governmentShare: round1(share), oppositionShare: round1(100 - share), winChance: winProbability(share) };
}

/** Stable per-country offset so AI elections spread over the four-year cycle instead of all falling on one day. */
export function electionOffset(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0;
  return 1 + (h % ELECTION_INTERVAL);
}

/** Reversal after a change of government: factions the old government neglected are courted, and vice versa. */
function newGovernmentFactions(f: FactionState, day: number, securityFloor = 0): FactionState {
  const satisfaction = zeroRecord(), strength = { ...f.strength };
  for (const k of FACTION_KEYS) {
    satisfaction[k] = clamp(50 + (50 - f.satisfaction[k]) * 0.6, 0, 100);
    strength[k] = Math.max(1, strength[k] + (50 - f.satisfaction[k]) * 0.05);
  }
  satisfaction.security = Math.max(satisfaction.security, securityFloor);
  const total = FACTION_KEYS.reduce((sum, k) => sum + strength[k], 0);
  for (const k of FACTION_KEYS) strength[k] = (strength[k] / total) * 100;
  return { ...f, satisfaction, strength, terms: 0, pressure: 0, honeymoonUntil: day + HONEYMOON_DAYS, concession: undefined, crisis: undefined };
}

// ---- Concessions and crisis responses (same rules for the player and the AI) ----------------------------

export interface ActionStatus { allowed: boolean; reason: string; costB: number }

export function concessionStatus(c: CountryState, day: number): ActionStatus {
  const costB = scaledCostB(c, CONCESSION_BASE_COST_B), f = factionsFor(c);
  if (c.controllerCountryId) return { allowed: false, reason: 'A controlled government cannot bargain with factions.', costB };
  if (f.concession && f.concession.untilDay >= day) return { allowed: false, reason: `A concession to ${FACTION_LABEL[f.concession.faction]} runs until day ${f.concession.untilDay}.`, costB };
  if (c.economy.treasury < costB) return { allowed: false, reason: 'Insufficient treasury.', costB };
  return { allowed: true, reason: 'Available.', costB };
}

/** Pays the concession and courts one faction for CONCESSION_DAYS. Returns null when not allowed. */
export function applyConcession(c: CountryState, day: number, faction: FactionKey): CountryState | null {
  const status = concessionStatus(c, day);
  if (!status.allowed || !FACTION_KEYS.includes(faction)) return null;
  const f = factionsFor(c);
  const satisfaction = { ...f.satisfaction, [faction]: clamp(f.satisfaction[faction] + 5, 0, 100) };
  return {
    ...c,
    economy: { ...c.economy, treasury: c.economy.treasury - status.costB },
    politics: { ...c.politics, factions: { ...f, satisfaction, concession: { faction, untilDay: day + CONCESSION_DAYS } } },
  };
}

/** Effect multiplier of a crisis response: each further response within a year achieves less. */
export function crisisResponseMultiplier(f: FactionState, day: number): number {
  const streak = f.lastResponseDay !== undefined && day - f.lastResponseDay < 365 ? f.responseStreak ?? 0 : 0;
  return 0.6 ** streak;
}

export interface CrisisOptionPreview extends ActionStatus { option: CrisisOption; pressureRelief: number }
export function crisisOptions(c: CountryState, day: number): CrisisOptionPreview[] {
  const f = factionsFor(c), m = crisisResponseMultiplier(f, day), open = !!f.crisis && !f.crisis.response;
  const relief: Record<CrisisOption, number> = { concede: 35, crackdown: 25, reform: 20 };
  return (['concede', 'crackdown', 'reform'] as const).map((option) => {
    const costB = CRISIS_OPTION_BASE_COST_B[option] > 0 ? scaledCostB(c, CRISIS_OPTION_BASE_COST_B[option]) : 0;
    const allowed = open && c.economy.treasury >= costB;
    return { option, costB, pressureRelief: round1(relief[option] * m), allowed, reason: !open ? 'No open regime crisis awaits an answer.' : allowed ? 'Available.' : 'Insufficient treasury.' };
  });
}

/** Applies a crisis response. Returns null when there is no unanswered crisis or the treasury cannot pay. */
export function applyCrisisResponse(c: CountryState, day: number, option: CrisisOption): CountryState | null {
  const preview = crisisOptions(c, day).find((o) => o.option === option);
  const f = factionsFor(c);
  if (!preview?.allowed || !f.crisis) return null;
  const m = crisisResponseMultiplier(f, day), s = { ...f.satisfaction };
  let approval = c.politics.approval, stability = c.politics.stability, reputation = c.diplomacy.reputation;
  let concession = f.concession;
  if (option === 'concede') {
    s.security = clamp(s.security + 20 * m, 0, 100);
    concession = { faction: 'security', untilDay: day + CONCESSION_DAYS };
  } else if (option === 'crackdown') {
    approval -= 4; stability += 3; reputation -= 5;
    s.liberal = clamp(s.liberal - 20, 0, 100); s.labour = clamp(s.labour - 8, 0, 100);
  } else {
    approval += 4 * m; stability -= 2;
    s.liberal = clamp(s.liberal + 15 * m, 0, 100); s.labour = clamp(s.labour + 8 * m, 0, 100); s.security = clamp(s.security - 6, 0, 100);
  }
  const streak = (f.lastResponseDay !== undefined && day - f.lastResponseDay < 365 ? f.responseStreak ?? 0 : 0) + 1;
  const crisis: RegimeCrisis = { ...f.crisis, response: option };
  return {
    ...c,
    economy: { ...c.economy, treasury: c.economy.treasury - preview.costB },
    diplomacy: { ...c.diplomacy, reputation: clamp(reputation, 0, 100) },
    politics: {
      ...c.politics, approval: clamp(approval, 0, 100), stability: clamp(stability, 0, 100),
      factions: { ...f, satisfaction: s, concession, pressure: clamp(f.pressure - preview.pressureRelief, 0, 100), crisis, responseStreak: streak, lastResponseDay: day },
    },
  };
}

/** The AI answers a crisis the same way the player can: it buys the army's loyalty if rich, reforms if it can pay, else cracks down. */
export function aiCrisisChoice(c: CountryState, day: number): CrisisOption {
  const options = crisisOptions(c, day), cost = (o: CrisisOption) => options.find((x) => x.option === o)!.costB;
  if (c.economy.treasury >= cost('concede') * 3) return 'concede';
  if (c.economy.treasury >= cost('reform') * 3) return 'reform';
  return 'crackdown';
}

export interface CoupRisk {
  legitimacy: number;
  pressure: number;
  dailyChange: number;
  crisis: RegimeCrisis | null;
  daysToDeadline: number | null;
  /** Coup chance if the crisis were decided with the pressure projected to the deadline (0 outside a crisis). */
  coupChanceAtDeadline: number;
  securityLoyal: boolean;
}
/** Regime pressure and coup risk for an autocracy, monarchy or theocracy; null for electoral regimes. */
export function coupRisk(state: GameState, countryId: string): CoupRisk | null {
  const c = state.countries[countryId];
  if (!c || isElectoral(c.politics.regime)) return null;
  const f = factionsFor(c), legit = legitimacy(c), daily = pressureChange(legit);
  const crisis = f.crisis ?? null, days = crisis ? Math.max(0, crisis.deadlineDay - state.day) : null;
  const projected = clamp(f.pressure + daily * (days ?? 0), 0, 100);
  const securityLoyal = f.satisfaction.security >= LOYAL_SECURITY;
  return { legitimacy: round1(legit), pressure: round1(f.pressure), dailyChange: Math.round(daily * 100) / 100, crisis, daysToDeadline: days, coupChanceAtDeadline: crisis ? crisisCoupChance(projected, f.satisfaction.security, !!crisis.response) : 0, securityLoyal };
}

// ---- Daily processing -----------------------------------------------------------------------------------

function activeWarCountries(state: GameState): Set<string> {
  const ids = new Set<string>();
  for (const war of Object.values(state.wars)) if (war.status === 'active') { ids.add(war.attackerId); ids.add(war.defenderId); }
  return ids;
}

/** AI courting: before an election when its coalition is weak, and when regime pressure builds. Same costs as the player. */
function aiCourting(c: CountryState, day: number): CountryState {
  const f = factionsFor(c), cost = concessionStatus(c, day);
  if (!cost.allowed || c.economy.treasury < cost.costB * 4) return c;
  if (isElectoral(c.politics.regime)) {
    if (c.politics.electionDaysRemaining > 120 || coalitionSupport(c) >= 52) return c;
    const target = [...FACTION_KEYS].sort((a, b) => f.strength[b] * (100 - f.satisfaction[b]) - f.strength[a] * (100 - f.satisfaction[a]))[0];
    return applyConcession(c, day, target) ?? c;
  }
  return f.pressure >= 30 ? applyConcession(c, day, 'security') ?? c : c;
}

const regimeAfterCoup = (regime: RegimeType): RegimeType => (regime === 'monarchy' || regime === 'theocracy' ? 'autocracy' : regime);

/**
 * Faction drift, elections and regime crises for every country (called once per day from tick.ts processElection).
 * Seeded rolls are drawn in country order and the seed is threaded back into the state.
 */
export function processPoliticalLayer(state: GameState): GameState {
  const day = state.day, atWar = activeWarCountries(state), countries = { ...state.countries };
  let seed = state.simulationSeed, campaignStatus = state.campaignStatus, speed = state.speed;
  const news: string[] = [];
  let campaignEnd: string | null = null;
  const roll = () => { const r = nextRandom(seed); seed = r.seed; return r.value; };

  for (const id of Object.keys(countries)) {
    let c = countries[id];
    if (c.annexedBy) continue;
    const player = id === state.playerCountryId;
    let f: FactionState;
    if (c.politics.factions) f = c.politics.factions;
    else {
      f = initialFactions(c);
      // Stagger AI elections over the cycle (all countries open the campaign on the same 1,460-day clock).
      if (!player && isElectoral(c.politics.regime)) c = { ...c, politics: { ...c.politics, electionDaysRemaining: electionOffset(id) } };
    }
    f = advanceFactions(c, f, day, atWar.has(id));
    c = { ...c, politics: { ...c.politics, factions: f } };

    if (!c.controllerCountryId) {
      if (!player) c = aiCourting(c, day);
      if (isElectoral(c.politics.regime)) {
        if (c.politics.electionDaysRemaining <= 0) {
          const expected = expectedGovernmentShare(c);
          const share = clamp(expected + (roll() + roll() - 1) * ELECTION_SWING, 1, 99);
          const gov = share.toFixed(1), opp = (100 - share).toFixed(1), won = share > 50;
          f = factionsFor(c);
          const record = { day, governmentShare: round1(share), won };
          if (won) {
            c = { ...c, politics: { ...c.politics, electionDaysRemaining: ELECTION_INTERVAL, approval: Math.min(100, c.politics.approval + 2), factions: { ...f, terms: f.terms + 1, honeymoonUntil: day + HONEYMOON_DAYS, lastElection: record } } };
            news.push(`ELECTION // ${c.name} government re-elected with ${gov}% of the vote (opposition ${opp}%).`);
          } else if (player) {
            c = { ...c, politics: { ...c.politics, factions: { ...f, lastElection: record } } };
            campaignStatus = 'lost'; speed = 0;
            campaignEnd = `CAMPAIGN LOST // The government lost the election: ${gov}% against the opposition's ${opp}%.`;
          } else {
            const nf = newGovernmentFactions(f, day);
            const goal = c.ai.strategicGoal === 'grow_economy' ? 'stabilize' : 'grow_economy';
            c = {
              ...c,
              economy: { ...c.economy, taxRate: c.economy.taxRate + clamp(20 - c.economy.taxRate, -3, 3) },
              politics: { ...c.politics, electionDaysRemaining: ELECTION_INTERVAL, approval: clamp(50 + (100 - share - 50) * 0.6 + 4, 45, 70), stability: clamp(c.politics.stability - 3, 0, 100), factions: { ...nf, lastElection: record } },
              ai: { ...c.ai, strategicGoal: goal, goalProgress: 0 },
            };
            news.push(`ELECTION // ${c.name}: the opposition won with ${opp}% of the vote (government ${gov}%). A new government takes office.`);
          }
        }
      } else {
        f = factionsFor(c);
        if (!f.crisis && f.pressure >= REGIME_CRISIS_PRESSURE && day - (f.lastCrisisDay ?? -Infinity) >= CRISIS_COOLDOWN) {
          c = { ...c, politics: { ...c.politics, factions: { ...f, crisis: { openedDay: day, deadlineDay: day + CRISIS_DAYS } } } };
          if (player) {
            speed = 0;
            news.push(`REGIME // Security services warn of a plot against the government. Respond within ${CRISIS_DAYS} days.`);
          } else {
            c = applyCrisisResponse(c, day, aiCrisisChoice(c, day)) ?? c;
            news.push(`REGIME // ${c.name} faces a regime crisis.`);
          }
        } else if (f.crisis && day >= f.crisis.deadlineDay) {
          const closed: FactionState = { ...f, crisis: undefined, lastCrisisDay: day };
          const chance = crisisCoupChance(f.pressure, f.satisfaction.security, !!f.crisis.response);
          if (chance > 0 && roll() < chance) {
            if (player) {
              c = { ...c, politics: { ...c.politics, factions: closed } };
              campaignStatus = 'lost'; speed = 0;
              campaignEnd = `CAMPAIGN LOST // Military officers seized power in ${c.name}. The regime crisis was not contained.`;
            } else {
              c = {
                ...c,
                politics: { ...c.politics, regime: regimeAfterCoup(c.politics.regime), approval: 50, stability: clamp(c.politics.stability - 10, 20, 100), factions: { ...newGovernmentFactions(f, day, 70), lastCrisisDay: day } },
                ai: { ...c.ai, strategicGoal: 'stabilize', goalProgress: 0 },
              };
              news.push(`COUP // Military officers seized power in ${c.name}; the new leadership promises order.`);
            }
          } else if (chance > 0) {
            // The regime held, but not quietly: the street pays for it.
            c = { ...c, politics: { ...c.politics, approval: clamp(c.politics.approval - 4, 0, 100), stability: clamp(c.politics.stability - 8, 0, 100), factions: { ...closed, pressure: clamp(f.pressure - 15, 0, 100) } } };
            news.push(`UNREST // Mass protests shook ${c.name}; the security forces stayed loyal.`);
          } else {
            c = { ...c, politics: { ...c.politics, factions: { ...closed, pressure: clamp(f.pressure - 10, 0, 100) } } };
            if (player) news.push('REGIME // The regime crisis has passed. The government survived.');
          }
        }
      }
    }
    countries[id] = c;
  }
  // Newest first; the end of the campaign always leads the report.
  if (campaignEnd) news.push(campaignEnd);
  return { ...state, countries, simulationSeed: seed, campaignStatus, speed, sitrep: news.length ? [...news.reverse(), ...state.sitrep].slice(0, 12) : state.sitrep };
}

// ---- Player commands ------------------------------------------------------------------------------------

const note = (state: GameState, message: string): GameState => ({ ...state, sitrep: [message, ...state.sitrep].slice(0, 12) });

export function grantConcession(state: GameState, faction: FactionKey): GameState {
  const p = state.countries[state.playerCountryId];
  if (!p) return state;
  const updated = applyConcession(p, state.day, faction);
  if (!updated) return note(state, `POLITICS // Concession unavailable: ${concessionStatus(p, state.day).reason}`);
  return note({ ...state, countries: { ...state.countries, [p.id]: updated } }, `POLITICS // Concession to ${FACTION_LABEL[faction]} for ${CONCESSION_DAYS} days (${formatCostB(concessionStatus(p, state.day).costB)}).`);
}

export function respondToCrisis(state: GameState, option: CrisisOption): GameState {
  const p = state.countries[state.playerCountryId];
  if (!p) return state;
  const updated = applyCrisisResponse(p, state.day, option);
  if (!updated) return note(state, 'REGIME // This response is not available.');
  return note({ ...state, countries: { ...state.countries, [p.id]: updated } }, `REGIME // Crisis response ordered: ${CRISIS_OPTION_LABEL[option]}.`);
}

/** Closes the player's crisis warning without answering; the crisis stays open until its deadline. */
export function acknowledgeCrisis(state: GameState): GameState {
  const p = state.countries[state.playerCountryId], f = p?.politics.factions;
  if (!p || !f?.crisis || f.crisis.acknowledged) return state;
  return { ...state, countries: { ...state.countries, [p.id]: { ...p, politics: { ...p.politics, factions: { ...f, crisis: { ...f.crisis, acknowledged: true } } } } } };
}

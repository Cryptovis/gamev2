// Phase 9.8: the strike engine. A grievance meter (0-100) rises with unhappy unions, a hated government, inflation,
// joblessness, austerity and unpaid civil wages, and falls when the country is calm or the unions are bought off.
// Crossing a threshold starts a local strike; unaddressed, the meter keeps creeping up and the strike grows into a
// sectoral and then a general strike. Strikes cut factory output, trade logistics and tax revenue, and a long general
// strike breeds riots. Pure functions of a country, its factions and its strike state; no random numbers.

import type { CountryState } from '../../domain/game';
import { STRIKE_LEVELS, type StrikeLevel, type StrikeState, type TalksOffer } from '../../domain/parliament';
import type { FactionState } from '../../domain/politics';
import { pow } from '../detMath';
import { normalizedMinistryShare } from './ministries';
import { scaledCostB } from './policyPressure';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round1 = (value: number) => Math.round(value * 10) / 10;

// ---- Tunables ---------------------------------------------------------------------------------------------

/** Grievance at which each level of strike begins. */
export const STRIKE_START: Record<Exclude<StrikeLevel, 'none'>, number> = { local: 50, sectoral: 70, general: 88 };
/** A strike eases one level once grievance is this far under the level's start threshold. */
export const STRIKE_EASE_MARGIN = 15;
/** Daily creep of grievance while any strike goes unanswered. */
export const STRIKE_MOMENTUM = 0.12;
/** Daily grievance relief when nothing is pushing it up. */
export const CALM_RELIEF = 0.3;

/** Union satisfaction under which unions press, public approval under which the street joins, and so on. */
export const UNION_FLOOR = 45;
export const APPROVAL_FLOOR = 40;
export const INFLATION_CEILING = 12;
export const UNEMPLOYMENT_CEILING = 14;
export const WELFARE_FLOOR = 40;
/** Share of the budget (percent) for the society ministry under which spending counts as austerity. */
export const AUSTERITY_SOCIETY_SHARE = 9;
export const UNPAID_WAGES_PRESSURE = 0.6;

export interface StrikeEffect { output: number; logistics: number; taxLoss: number }
/** Multipliers on factory output and trade flow, and the share of tax revenue lost, for each level. */
export const STRIKE_EFFECT: Record<StrikeLevel, StrikeEffect> = {
  none: { output: 1, logistics: 1, taxLoss: 0 },
  local: { output: 0.92, logistics: 0.95, taxLoss: 0.03 },
  sectoral: { output: 0.75, logistics: 0.8, taxLoss: 0.1 },
  general: { output: 0.4, logistics: 0.45, taxLoss: 0.25 },
};

export const DISORDER_UNREST_LEVEL = 50;
export const RIOT_DISORDER = 80;
export const RIOT_INTERVAL = 30;

export const TALKS_COOLDOWN = 14;
/** Grievance must be at least this high before talks are worth opening. */
export const TALKS_MIN_UNREST = 15;
export const AGREEMENT_DAYS = 120;
export const SUBSIDY_DAYS = 180;
/** Daily wage subsidy as a share of GDP. */
export const SUBSIDY_DAILY_GDP = 0.00004;
export const HOURS_DAYS = 365;
export const HOURS_PRODUCTIVITY_COST = 2;
export const AGREEMENT_BASE_COST_B = 4;
export const AGREEMENT_INFLATION = 0.4;

export const emptyStrike = (): StrikeState => ({ level: 'none', levelDays: 0, disorder: 0 });

// ---- Grievance ------------------------------------------------------------------------------------------

export type GrievanceKey = 'unions' | 'approval' | 'inflation' | 'unemployment' | 'welfare' | 'austerity' | 'wages';
export interface GrievanceDriver { key: GrievanceKey; perDay: number }

/** What is pushing the unions toward the picket line today, in grievance points per day. */
export function grievanceDrivers(c: CountryState, f: FactionState): GrievanceDriver[] {
  const out: GrievanceDriver[] = [];
  const add = (key: GrievanceKey, perDay: number) => { if (perDay > 0) out.push({ key, perDay: Math.round(perDay * 1000) / 1000 }); };
  add('unions', (UNION_FLOOR - f.satisfaction.labour) * 0.04);
  add('approval', (APPROVAL_FLOOR - c.politics.approval) * 0.02);
  add('inflation', (c.economy.inflation - INFLATION_CEILING) * 0.03);
  add('unemployment', (c.economy.unemployment - UNEMPLOYMENT_CEILING) * 0.015);
  add('welfare', (WELFARE_FLOOR - (c.demographics.welfare ?? 55)) * 0.015);
  add('austerity', (AUSTERITY_SOCIETY_SHARE - normalizedMinistryShare(c, 'society') * 100) * 0.03);
  add('wages', c.economy.treasury <= 0 ? UNPAID_WAGES_PRESSURE : 0);
  return out;
}

const active = (until: number | undefined, day: number) => until !== undefined && until >= day;

/** Net daily change of grievance: the drivers, the momentum of a running strike, and whatever relief is in force. */
export function grievanceChange(c: CountryState, f: FactionState, strike: StrikeState, day: number): number {
  const push = grievanceDrivers(c, f).reduce((sum, d) => sum + d.perDay, 0);
  let change = push > 0.05 ? push : -CALM_RELIEF;
  if (strike.level !== 'none') change += STRIKE_MOMENTUM;
  if (active(strike.agreementUntil, day)) change = Math.min(change, 0) - 0.4;
  if (active(strike.subsidyUntil, day)) change -= 0.2;
  return change;
}

/** The level a given grievance leads to, with hysteresis: strikes start at the thresholds and ease 15 points lower. */
export function strikeLevelFor(unrest: number, current: StrikeLevel): StrikeLevel {
  const rising: StrikeLevel = unrest >= STRIKE_START.general ? 'general' : unrest >= STRIKE_START.sectoral ? 'sectoral' : unrest >= STRIKE_START.local ? 'local' : 'none';
  let level = STRIKE_LEVELS.indexOf(rising) > STRIKE_LEVELS.indexOf(current) ? rising : current;
  while (level !== 'none' && unrest < STRIKE_START[level] - STRIKE_EASE_MARGIN) level = STRIKE_LEVELS[STRIKE_LEVELS.indexOf(level) - 1];
  return level;
}

export type StrikeRisk = 'calm' | 'rising' | 'danger' | 'striking';
/** One word for the indicator in the window. */
export function strikeRisk(unrest: number, level: StrikeLevel): StrikeRisk {
  if (level !== 'none') return 'striking';
  return unrest >= STRIKE_START.local - 10 ? 'danger' : unrest >= 20 ? 'rising' : 'calm';
}

/** Public disorder after a day: general strikes stir it, calm drains it. */
export function nextDisorder(disorder: number, level: StrikeLevel, unrest: number): number {
  const change = level === 'general' ? 0.9 : level === 'sectoral' ? (unrest >= 80 ? 0.15 : -0.2) : level === 'local' ? -0.3 : -0.6;
  return clamp(disorder + change, 0, 100);
}

/** Daily cost of the wage subsidy in $B. */
export const subsidyDailyB = (c: CountryState) => c.economy.gdp * SUBSIDY_DAILY_GDP;

// ---- Talks ----------------------------------------------------------------------------------------------

export interface TalksPreview { offer: TalksOffer; allowed: boolean; reason: string; args?: string[]; costB: number; relief: number }

/** Each further offer within a year is 30 percent less effective. */
export function talksMultiplier(strike: StrikeState, day: number): number {
  const streak = strike.lastTalksDay !== undefined && day - strike.lastTalksDay < 365 ? strike.talksStreak ?? 0 : 0;
  return pow(0.7, streak);
}

const BASE_RELIEF: Record<TalksOffer, number> = { agreement: 30, shorterHours: 22, wageSubsidy: 12, crackdown: 18 };

export function talksOptions(c: CountryState, strike: StrikeState, unrest: number, day: number): TalksPreview[] {
  const m = talksMultiplier(strike, day);
  const cooldown = strike.lastTalksDay !== undefined ? Math.max(0, strike.lastTalksDay + TALKS_COOLDOWN - day) : 0;
  return (['agreement', 'shorterHours', 'wageSubsidy', 'crackdown'] as const).map(offer => {
    const costB = offer === 'agreement' ? scaledCostB(c, AGREEMENT_BASE_COST_B) : 0;
    let reason = 'Available.', args: string[] | undefined;
    if (c.controllerCountryId) reason = 'A controlled government cannot negotiate.';
    else if (cooldown > 0) { reason = 'The unions will talk again in {0} days.'; args = [String(cooldown)]; }
    else if (unrest < TALKS_MIN_UNREST) reason = 'The unions have no complaint to bring to the table.';
    else if (costB > 0 && c.economy.treasury < costB) reason = 'Insufficient treasury.';
    else if (offer === 'agreement' && active(strike.agreementUntil, day)) reason = 'A collective agreement is already in force.';
    else if (offer === 'shorterHours' && active(strike.hoursUntil, day)) reason = 'Working hours were already cut this year.';
    else if (offer === 'wageSubsidy' && active(strike.subsidyUntil, day)) reason = 'A wage subsidy is already being paid.';
    else if (offer === 'wageSubsidy' && c.economy.treasury <= 0) reason = 'Insufficient treasury.';
    return { offer, allowed: reason === 'Available.', reason, ...(args ? { args } : {}), costB, relief: round1(BASE_RELIEF[offer] * m) };
  });
}

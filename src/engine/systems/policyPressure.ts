import type { CountryState, GameState } from '../../domain/game';
import { changeRelations, embassyRelationBonus, relationFor } from './diplomacy';

// Audit C4/C15 (0.87): GDP-scaled action costs, repeat fatigue (diminishing returns) and cooldowns.
// The same functions serve the player, the AI and every UI preview, so nobody re-implements the formulas.

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** GDP ($B) at which a base cost is charged unchanged: the default player's (Türkiye's) opening GDP. */
export const COST_REFERENCE_GDP_B = 1300;
/** A microstate still pays 2% of the base cost; the largest economies pay at most 20×. */
export const MIN_COST_SCALE = 0.02;
export const MAX_COST_SCALE = 20;

/** Multiplier applied to a flat base cost for a country of this size. */
export function costScale(country: Pick<CountryState, 'economy'> | undefined): number {
  const gdp = country?.economy.gdp;
  if (gdp === undefined || !Number.isFinite(gdp)) return 1;
  return clamp(gdp / COST_REFERENCE_GDP_B, MIN_COST_SCALE, MAX_COST_SCALE);
}

/** A base cost ($B, calibrated for a 1,300B economy) scaled to the payer's GDP, rounded to $1M. */
export function scaledCostB(country: Pick<CountryState, 'economy'> | undefined, baseB: number): number {
  if (baseB <= 0) return 0;
  return Math.max(0.001, Math.round(baseB * costScale(country) * 1000) / 1000);
}

/** Display form used in notes and dialogs, e.g. "$4B", "$0.35B", "$0.004B". */
export function formatCostB(costB: number): string {
  const digits = costB >= 100 ? 0 : costB >= 10 ? 1 : costB >= 1 ? 2 : 3;
  return `$${Number(costB.toFixed(digits))}B`;
}

export type FatigueRecord = { value: number; day: number };

/**
 * Repeatable actions. Uses of actions in the same pool tire the public together: an action's own past uses
 * count fully, other pool members' uses count at POOL_SPILLOVER. Fatigue halves every `halfLifeDays`.
 * `cooldownDays` is the minimum gap between two uses of the same action (0 = only the action's own rule applies).
 */
export const ACTION_RULES = {
  'society/religiousOutreach': { pool: 'public', halfLifeDays: 30, cooldownDays: 14 },
  'activity/festival': { pool: 'public', halfLifeDays: 30, cooldownDays: 0 },
  'activity/sports': { pool: 'public', halfLifeDays: 30, cooldownDays: 0 },
  'activity/food_relief': { pool: 'public', halfLifeDays: 30, cooldownDays: 0 },
  'program/jobs': { pool: 'public', halfLifeDays: 30, cooldownDays: 0 },
  'society/civicCampaign': { pool: 'civic', halfLifeDays: 30, cooldownDays: 14 },
  'program/health': { pool: 'civic', halfLifeDays: 30, cooldownDays: 0 },
  'development/economicResearch': { pool: 'development', halfLifeDays: 60, cooldownDays: 30 },
  'program/education': { pool: 'development', halfLifeDays: 60, cooldownDays: 0 },
  'development/militaryResearch': { pool: 'military', halfLifeDays: 60, cooldownDays: 30 },
  'development/intelligenceResearch': { pool: 'intelligence', halfLifeDays: 60, cooldownDays: 30 },
} as const satisfies Record<string, { pool: string; halfLifeDays: number; cooldownDays: number }>;
export type DomesticAction = keyof typeof ACTION_RULES;
/** "Improve relations" is tracked per target: `relations/<countryId>`. */
export type PressureAction = DomesticAction | `relations/${string}`;
export const RELATION_MISSION_RULE = { halfLifeDays: 60, cooldownDays: 30 };
export const POOL_SPILLOVER = 0.5;

function ruleFor(action: string): { pool: string; halfLifeDays: number; cooldownDays: number } {
  if (action.startsWith('relations/')) return { pool: action, ...RELATION_MISSION_RULE };
  return ACTION_RULES[action as DomesticAction] ?? { pool: action, halfLifeDays: 30, cooldownDays: 0 };
}
const recordKey = (countryId: string, action: string) => `${countryId}|${action}`;
const decayed = (record: FatigueRecord, day: number, halfLifeDays: number) => record.value * 0.5 ** (Math.max(0, day - record.day) / halfLifeDays);

/** Accumulated fatigue for this country's next use of `action` (0 = fresh). */
export function actionFatigue(state: GameState, countryId: string, action: PressureAction): number {
  const pool = ruleFor(action).pool, prefix = `${countryId}|`;
  let total = 0;
  for (const [key, record] of Object.entries(state.world.actionFatigue ?? {})) {
    if (!key.startsWith(prefix)) continue;
    const other = key.slice(prefix.length), rule = ruleFor(other);
    if (rule.pool !== pool) continue;
    total += decayed(record, state.day, rule.halfLifeDays) * (other === action ? 1 : POOL_SPILLOVER);
  }
  return total;
}

/** Share of the full effect the next use delivers: 1 when fresh, 1/(1+fatigue) after repeated use. */
export function actionEffectMultiplier(state: GameState, countryId: string, action: PressureAction): number {
  return 1 / (1 + actionFatigue(state, countryId, action));
}

/** Days until this action may be used again by this country (0 = available). */
export function actionCooldownDays(state: GameState, countryId: string, action: PressureAction): number {
  const record = state.world.actionFatigue?.[recordKey(countryId, action)];
  if (!record) return 0;
  return Math.max(0, ruleFor(action).cooldownDays - (state.day - record.day));
}

/** Records one use: adds a unit of fatigue and restarts the cooldown. Faded records are dropped. */
export function recordActionUse(state: GameState, countryId: string, action: PressureAction): GameState {
  const current = state.world.actionFatigue ?? {}, key = recordKey(countryId, action);
  const kept: Record<string, FatigueRecord> = {};
  for (const [k, record] of Object.entries(current)) {
    const rule = ruleFor(k.slice(k.indexOf('|') + 1));
    if (k === key || decayed(record, state.day, rule.halfLifeDays) >= 0.01 || state.day - record.day < rule.cooldownDays) kept[k] = record;
  }
  const own = current[key];
  kept[key] = { value: (own ? decayed(own, state.day, ruleFor(action).halfLifeDays) : 0) + 1, day: state.day };
  return { ...state, world: { ...state.world, actionFatigue: kept } };
}

export interface ActionPreview { costB: number; multiplier: number; cooldownDays: number; affordable: boolean }
/** Everything a dialog needs to show before the action runs. */
export function actionPreview(state: GameState, countryId: string, action: PressureAction, baseCostB: number): ActionPreview {
  const country = state.countries[countryId], costB = scaledCostB(country, baseCostB);
  return { costB, multiplier: actionEffectMultiplier(state, countryId, action), cooldownDays: actionCooldownDays(state, countryId, action), affordable: !!country && country.economy.treasury >= costB };
}

/** Base costs ($B at the reference GDP) of one-off actions without their own rule table. */
export const BASE_COST_B = {
  diplomaticMission: 2, nonAggression: 4, alliance: 10, strategicBloc: 20,
  economicResearch: 8, militaryResearch: 12, intelligenceResearch: 7,
  religiousOutreach: 4, civicCampaign: 4, politicalCampaign: 5, worldOutreach: 2,
} as const;

/** Relation points a fresh diplomatic mission adds before embassy bonus and fatigue. */
export const RELATION_MISSION_GAIN = 10;

export interface MissionStatus { allowed: boolean; reason: string; costB: number; gain: number; cooldownDays: number }
/** Whether `actorId` can send a diplomatic mission to `targetId` now, its cost and expected relation gain. */
export function diplomaticMissionStatus(state: GameState, actorId: string, targetId: string): MissionStatus {
  const actor = state.countries[actorId], target = state.countries[targetId], action = `relations/${targetId}` as const;
  const costB = scaledCostB(actor, BASE_COST_B.diplomaticMission), cooldownDays = actionCooldownDays(state, actorId, action);
  const gain = Math.max(1, Math.round(RELATION_MISSION_GAIN * embassyRelationBonus(state, actorId, targetId) * actionEffectMultiplier(state, actorId, action)));
  const result = (allowed: boolean, reason: string): MissionStatus => ({ allowed, reason, costB, gain, cooldownDays });
  if (!actor || !target || actorId === targetId) return result(false, 'Choose another country.');
  if (relationFor(actor, targetId).status === 'war') return result(false, 'No diplomatic mission can be sent during a war.');
  if (cooldownDays > 0) return result(false, 'A diplomatic mission to this country was sent recently.');
  if (actor.economy.treasury < costB) return result(false, 'Insufficient treasury for diplomatic mission.');
  return result(true, 'Mission available.');
}

/** Pays the GDP-scaled fee, adds goodwill reduced by repeat fatigue and starts the per-target cooldown. */
export function sendDiplomaticMission(state: GameState, actorId: string, targetId: string): GameState {
  const status = diplomaticMissionStatus(state, actorId, targetId);
  if (!status.allowed) return state;
  const actor = state.countries[actorId];
  let next: GameState = { ...state, countries: { ...state.countries, [actorId]: { ...actor, economy: { ...actor.economy, treasury: actor.economy.treasury - status.costB } } } };
  next = changeRelations(next, actorId, targetId, status.gain);
  return recordActionUse(next, actorId, `relations/${targetId}`);
}

/**
 * Public-mood gains (approval, stability, cohesion) from paid programmes shrink near the top of the scale:
 * full effect up to 50, half at 75, nothing at 100. Spending alone cannot hold a country at 100.
 */
export function headroomFactor(current: number): number {
  return clamp((100 - current) / 50, 0, 1);
}
/** `current` raised by `base × multiplier`, damped by `headroomFactor`, capped at 100. */
export function publicGain(current: number, base: number, multiplier = 1): number {
  return Math.min(100, current + base * multiplier * headroomFactor(current));
}

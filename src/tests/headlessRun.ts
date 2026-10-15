import type {GameState} from '../domain/game';
import {tickGame} from '../engine/tick';
import {resolveEvent} from '../engine/systems/events';
import {dismissVictory, pendingVictory} from '../engine/systems/victory';

/**
 * Headless "no player action" helpers shared by the long-run and replay tests.
 * The player only acknowledges whatever would pause the clock: events take their first option;
 * advisor/notice/tutorial pop-ups and victory scrolls are dismissed.
 */
export function acknowledge(state: GameState): GameState {
  let s = state;
  if (s.activeEvent) s = resolveEvent(s, s.activeEvent.options[0].id);
  for (let victory = pendingVictory(s); victory; victory = pendingVictory(s)) s = dismissVictory(s, victory.warId);
  const living = s.world.living;
  return {
    ...s,
    activeEvent: null,
    activeAdvisor: null,
    world: { ...s.world, tutorial: { ...s.world.tutorial, active: false }, living: living ? { ...living, advice: { ...living.advice, active: null }, notice: undefined } : living },
  };
}

/** Advances `days` ticks without mutating `state`. */
export function runDays(state: GameState, days: number): GameState {
  let s = state;
  for (let day = 0; day < days; day++) s = tickGame(acknowledge(s));
  return s;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/**
 * Rebuilds every plain-object map with its keys in reverse insertion order. Arrays keep their element order
 * (their elements are rebuilt); class instances, Maps and Sets are returned untouched.
 */
export function reverseKeyOrder<T>(value: T): T {
  if (Array.isArray(value)) return value.map(reverseKeyOrder) as unknown as T;
  if (!isPlainObject(value)) return value;
  const rebuilt: Record<string, unknown> = {};
  for (const key of Object.keys(value).reverse()) rebuilt[key] = reverseKeyOrder(value[key]);
  return rebuilt as T;
}

/**
 * Exact structural comparison that returns readable paths instead of a wall of diff. Primitives compare with
 * Object.is, so a last-bit float difference (or -0 vs 0) is a difference. Like toEqual, a key that is undefined on one
 * side and absent on the other is equal (JSON export drops undefined properties). Maps, Sets, Dates and other
 * non-plain objects only match by identity, so they can never hide a difference. Keys are visited sorted so the
 * report never depends on key order.
 */
export function firstDifferences(a: unknown, b: unknown, limit = 12, path = 'state', out: string[] = []): string[] {
  if (out.length >= limit || Object.is(a, b)) return out;
  const structural = (v: unknown) => Array.isArray(v) || isPlainObject(v);
  if (!structural(a) || !structural(b) || Array.isArray(a) !== Array.isArray(b)) {
    out.push(`${path}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
    return out;
  }
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
  for (const key of [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()) {
    firstDifferences(left[key], right[key], limit, `${path}.${key}`, out);
    if (out.length >= limit) break;
  }
  return out;
}

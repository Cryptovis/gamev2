// Phase 9.9: how a worker's mirror of the game and the UI's copy stay equal without shipping the whole state every day.
// Everything here is a pure function of plain data, so the same code runs in the worker, on the main thread and in tests.

import type { GameState } from '../domain/game';

/** Every top-level key of GameState. Typed as a Record so adding a key to GameState fails to compile until it is listed here. */
const KEY_SET: Record<keyof GameState, true> = {
  schemaVersion: true, simulationSeed: true, day: true, speed: true, preferredSpeed: true, campaignStatus: true, playerProfile: true,
  playerCountryId: true, selectedCountryId: true, mapMode: true, mapPresentation: true, mapNotice: true, countries: true, tradeDeals: true,
  wars: true, blocs: true, council: true, intelOperations: true, intelligenceLedger: true, culturalInfluence: true, activeEvent: true,
  eventCooldownUntil: true, activeAdvisor: true, advisorCooldownUntil: true, embassies: true, diplomaticOffers: true, production: true,
  infrastructure: true, industrialEconomy: true, industrialContracts: true, leadership: true, world: true, lastAiDay: true,
  lastStrategicReviewDay: true, sitrep: true,
};
export const GAME_KEYS = Object.keys(KEY_SET) as (keyof GameState)[];

/**
 * Keys the player moves with the mouse and the daily tick only ever passes through. The UI may change them while a tick is
 * in flight without that counting as a conflict. (selectedCountryId is still sent with each batch because integration
 * can rewrite it.)
 */
export const UI_KEYS: readonly (keyof GameState)[] = ['selectedCountryId', 'mapMode', 'mapPresentation', 'mapNotice'];
const UI_SET = new Set<string>(UI_KEYS);
export const SIM_KEYS: readonly (keyof GameState)[] = GAME_KEYS.filter(k => !UI_SET.has(k));

/** True when every simulation key is the very same object in both states: no mutation reached either one outside the tracked paths. */
export function simKeysEqual(a: GameState, b: GameState): boolean {
  for (const k of SIM_KEYS) if (a[k] !== b[k]) return false;
  return true;
}

// ---- Patches ------------------------------------------------------------------------------------------------

/**
 * The difference between two states, two levels deep. A record-valued key (countries, world, wars, ...) is described one
 * entry at a time, so a tick that touches the player's economy ships that country, not the other 194 and not the rest of
 * the world object. Arrays and primitives travel whole.
 */
export interface StatePatch {
  /** [key, subKey, value]. A null subKey replaces the whole key. */
  set: [string, string | null, unknown][];
  /** [key, subKey]: the entry no longer exists. */
  del: [string, string][];
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export function diffState(prev: GameState, next: GameState): StatePatch {
  const patch: StatePatch = { set: [], del: [] };
  for (const key of GAME_KEYS) {
    const a = prev[key] as unknown, b = next[key] as unknown;
    if (a === b) continue;
    if (isRecord(a) && isRecord(b)) {
      for (const sub of Object.keys(b)) if (a[sub] !== b[sub] || !(sub in a)) patch.set.push([key, sub, b[sub]]);
      for (const sub of Object.keys(a)) if (!(sub in b)) patch.del.push([key, sub]);
    } else patch.set.push([key, null, b]);
  }
  return patch;
}

export const patchIsEmpty = (patch: StatePatch) => patch.set.length === 0 && patch.del.length === 0;

/** The keys a patch touches. */
export const patchKeys = (patch: StatePatch): Set<string> => new Set([...patch.set.map(([k]) => k), ...patch.del.map(([k]) => k)]);

/** A new state: untouched keys and untouched entries keep their identity, so selectors and memoised views stay valid. */
export function applyPatch(base: GameState, patch: StatePatch): GameState {
  const out = { ...base } as Record<string, unknown>;
  const copied = new Set<string>();
  const own = (key: string) => {
    if (!copied.has(key)) { out[key] = { ...(out[key] as Record<string, unknown>) }; copied.add(key); }
    return out[key] as Record<string, unknown>;
  };
  for (const [key, sub, value] of patch.set) { if (sub === null) out[key] = value; else own(key)[sub] = value; }
  for (const [key, sub] of patch.del) delete own(key)[sub];
  return out as unknown as GameState;
}

// ---- Digest -------------------------------------------------------------------------------------------------

/** FNV-1a over 32-bit words; small, fast and identical in every JS engine. */
class Fold {
  h = 0x811c9dc5;
  word(n: number) { this.h = Math.imul(this.h ^ (n | 0), 0x01000193); }
  num(n: unknown) {
    const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 10000) : 0x7ff0_0001;
    this.word(v); this.word(Math.floor(v / 4294967296));
  }
  str(s: unknown) {
    const t = typeof s === 'string' ? s : '';
    this.word(t.length);
    for (let i = 0; i < t.length; i++) this.word(t.charCodeAt(i));
  }
}

/**
 * A cheap fingerprint of the numbers that matter every day. Two states with different digests have certainly diverged; two
 * with the same digest are equal for all practical purposes. It reads a handful of fields per country, so it costs
 * well under a millisecond for 195 countries and is safe to compute on the main thread every tick.
 */
export function stateDigest(s: GameState): string {
  const f = new Fold();
  f.num(s.day); f.num(s.simulationSeed); f.num(s.speed); f.str(s.campaignStatus); f.num(s.lastAiDay); f.num(s.eventCooldownUntil);
  f.num(s.sitrep.length); f.str(s.sitrep[0]);
  f.num(Object.keys(s.wars).length); f.num(Object.keys(s.tradeDeals).length); f.num(Object.keys(s.blocs).length);
  f.num(s.world.commandIds?.length ?? 0); f.num(s.world.journal?.length ?? 0);
  f.str(s.activeEvent ? 'event' : ''); f.str(s.activeAdvisor ? 'advisor' : '');
  for (const id of Object.keys(s.countries).sort()) {
    const c = s.countries[id];
    f.str(id);
    f.num(c.economy.treasury); f.num(c.economy.gdp); f.num(c.economy.debt); f.num(c.economy.inflation); f.num(c.economy.unemployment);
    f.num(c.demographics.population); f.num(c.politics.approval); f.num(c.politics.stability);
    f.num(c.resources.food); f.num(c.resources.oil);
  }
  return (f.h >>> 0).toString(16).padStart(8, '0');
}

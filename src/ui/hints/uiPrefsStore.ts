import {create} from 'zustand';
import {persist,type PersistStorage,type StorageValue} from 'zustand/middleware';

/**
 * UI preferences only. Nothing here is game state: it never touches GameCommand,
 * the game store, the engine or save files, and it needs no save-schema change.
 * (Keep it that way: do not import the game store or the engine from this file.)
 */
export interface UiPrefsData {
  hintsEnabled: boolean;
  seenHints: Record<string, true>;
  dismissedHints: Record<string, true>;
}
export interface UiPrefsActions {
  markSeen: (id: string) => void;
  dismiss: (id: string) => void;
  undismiss: (id: string) => void;
  resetHints: () => void;
  setHintsEnabled: (enabled: boolean) => void;
}
export type UiPrefsState = UiPrefsData & UiPrefsActions;

export const UI_PREFS_KEY = 'ron.uiPrefs';
export const UI_PREFS_VERSION = 1;
export const DEFAULT_UI_PREFS: UiPrefsData = {hintsEnabled: true, seenHints: {}, dismissedHints: {}};

const flagRecord = (value: unknown): Record<string, true> => {
  const out: Record<string, true> = {};
  if (value && typeof value === 'object' && !Array.isArray(value))
    for (const [key, flag] of Object.entries(value as Record<string, unknown>)) if (flag === true) out[key] = true;
  return out;
};

/** Accepts anything (old, partial or corrupt) and returns valid preferences. */
export function sanitizeUiPrefs(value: unknown): UiPrefsData {
  const raw = value && typeof value === 'object' ? (value as Partial<Record<keyof UiPrefsData, unknown>>) : {};
  return {
    hintsEnabled: typeof raw.hintsEnabled === 'boolean' ? raw.hintsEnabled : DEFAULT_UI_PREFS.hintsEnabled,
    seenHints: flagRecord(raw.seenHints),
    dismissedHints: flagRecord(raw.dismissedHints),
  };
}

/** Fallback used whenever localStorage is unavailable (private mode, blocked, quota, throwing). */
const memory = new Map<string, string>();

/** Persist storage that never throws: every localStorage access is guarded, with an in-memory fallback. */
export const safePrefsStorage: PersistStorage<UiPrefsData> = {
  getItem: name => {
    let raw: string | null | undefined;
    try { raw = globalThis.localStorage?.getItem(name); } catch { raw = undefined; }
    if (raw == null) raw = memory.get(name) ?? null;
    if (raw == null) return null;
    try {
      const parsed = JSON.parse(raw) as {state?: unknown; version?: unknown} | null;
      if (!parsed || typeof parsed !== 'object' || !parsed.state || typeof parsed.state !== 'object') return null;
      return {state: sanitizeUiPrefs(parsed.state), version: typeof parsed.version === 'number' ? parsed.version : 0};
    } catch { return null; }
  },
  setItem: (name, value: StorageValue<UiPrefsData>) => {
    const raw = JSON.stringify(value);
    memory.set(name, raw);
    try { globalThis.localStorage?.setItem(name, raw); } catch { /* memory copy keeps this session consistent */ }
  },
  removeItem: name => {
    memory.delete(name);
    try { globalThis.localStorage?.removeItem(name); } catch { /* nothing to remove */ }
  },
};

export const useUiPrefsStore = create<UiPrefsState>()(persist(
  set => ({
    ...DEFAULT_UI_PREFS,
    markSeen: id => set(state => (state.seenHints[id] ? state : {seenHints: {...state.seenHints, [id]: true as const}})),
    dismiss: id => set(state => (state.dismissedHints[id] ? state : {dismissedHints: {...state.dismissedHints, [id]: true as const}})),
    undismiss: id => set(state => {
      if (!state.dismissedHints[id]) return state;
      const {[id]: _removed, ...rest} = state.dismissedHints;
      return {dismissedHints: rest};
    }),
    resetHints: () => set({seenHints: {}, dismissedHints: {}}),
    setHintsEnabled: enabled => set({hintsEnabled: enabled}),
  }),
  {
    name: UI_PREFS_KEY,
    version: UI_PREFS_VERSION,
    storage: safePrefsStorage,
    partialize: state => ({hintsEnabled: state.hintsEnabled, seenHints: state.seenHints, dismissedHints: state.dismissedHints}),
    // Future prefs versions migrate here; until then anything stored is re-validated.
    migrate: persisted => sanitizeUiPrefs(persisted),
  },
));

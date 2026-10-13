import { create } from 'zustand';

/**
 * playtest.17 (Phase 6.3): map "desk" preferences. Presentation only: kept in this browser (`trp-map-desk-v1`),
 * never in a save, and never read by the simulation.
 */
export interface MapDeskSettings {
  /** 18° desk tilt of the flat map (desktop widths only). */
  tilt: boolean;
  /** Natural Earth hillshade layer under the labels. */
  relief: boolean;
  /** Miniature capital pins with round flags. */
  pins: boolean;
}
export const MAP_DESK_KEY = 'trp-map-desk-v1';
export const DEFAULT_MAP_DESK: MapDeskSettings = { tilt: true, relief: true, pins: true };

/** Reads stored settings; bad JSON, a non-object, or a wrongly typed field falls back to the default for that field. */
export function parseMapDesk(raw: string | null): MapDeskSettings {
  if (!raw) return DEFAULT_MAP_DESK;
  try {
    const v = JSON.parse(raw) as Partial<Record<keyof MapDeskSettings, unknown>> | null;
    if (!v || typeof v !== 'object') return DEFAULT_MAP_DESK;
    const d = DEFAULT_MAP_DESK;
    return {
      tilt: typeof v.tilt === 'boolean' ? v.tilt : d.tilt,
      relief: typeof v.relief === 'boolean' ? v.relief : d.relief,
      pins: typeof v.pins === 'boolean' ? v.pins : d.pins,
    };
  } catch { return DEFAULT_MAP_DESK; }
}
function read(): MapDeskSettings {
  try { return parseMapDesk(localStorage.getItem(MAP_DESK_KEY)); } catch { return DEFAULT_MAP_DESK; }
}
function write(s: MapDeskSettings) {
  try { localStorage.setItem(MAP_DESK_KEY, JSON.stringify(s)); } catch { /* private mode or blocked storage: keep in memory */ }
}

const pick = (s: MapDeskSettings): MapDeskSettings => ({ tilt: s.tilt, relief: s.relief, pins: s.pins });
export const useMapDesk = create<MapDeskSettings & { set: (patch: Partial<MapDeskSettings>) => void }>((set, get) => ({
  ...read(),
  set: (patch) => {
    const clean: Partial<MapDeskSettings> = {};
    for (const key of ['tilt', 'relief', 'pins'] as const) if (typeof patch[key] === 'boolean') clean[key] = patch[key];
    write({ ...pick(get()), ...clean });
    set(clean);
  },
}));

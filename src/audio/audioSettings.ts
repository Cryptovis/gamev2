import { create } from 'zustand';
import type { SoundChannel } from '../presentation/battleEffects';

/**
 * Phase 5: sound and effect preferences. Presentation only: kept in this browser (`trp-audio-v1`), never in a save,
 * and never read by the simulation.
 */
export interface AudioSettings {
  muted: boolean;
  master: number;
  channels: Record<SoundChannel, number>;
  /** Fewer, shorter visual effects: every round shows one summary. */
  lowEffects: boolean;
}
export const AUDIO_SETTINGS_KEY = 'trp-audio-v1';
export const DEFAULT_AUDIO_SETTINGS: AudioSettings = { muted: false, master: 0.8, channels: { ui: 0.6, war: 0.8, ambient: 0.35 }, lowEffects: false };

const unit = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback);
/** Reads stored settings; anything missing or malformed falls back to the defaults. */
export function parseAudioSettings(raw: string | null): AudioSettings {
  if (!raw) return DEFAULT_AUDIO_SETTINGS;
  try {
    const v = JSON.parse(raw) as Partial<AudioSettings> & { channels?: Partial<Record<SoundChannel, number>> };
    const d = DEFAULT_AUDIO_SETTINGS;
    return {
      muted: typeof v.muted === 'boolean' ? v.muted : d.muted,
      master: unit(v.master, d.master),
      channels: { ui: unit(v.channels?.ui, d.channels.ui), war: unit(v.channels?.war, d.channels.war), ambient: unit(v.channels?.ambient, d.channels.ambient) },
      lowEffects: typeof v.lowEffects === 'boolean' ? v.lowEffects : d.lowEffects,
    };
  } catch { return DEFAULT_AUDIO_SETTINGS; }
}
function read(): AudioSettings {
  try { return parseAudioSettings(localStorage.getItem(AUDIO_SETTINGS_KEY)); } catch { return DEFAULT_AUDIO_SETTINGS; }
}
function write(s: AudioSettings) {
  try { localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(s)); } catch { /* private mode or blocked storage: keep in memory */ }
}

interface AudioSettingsStore extends AudioSettings {
  setMuted: (muted: boolean) => void;
  setMaster: (value: number) => void;
  setChannel: (channel: SoundChannel, value: number) => void;
  setLowEffects: (value: boolean) => void;
}
const pick = (s: AudioSettings): AudioSettings => ({ muted: s.muted, master: s.master, channels: s.channels, lowEffects: s.lowEffects });
export const useAudioSettings = create<AudioSettingsStore>((set, get) => {
  const update = (patch: Partial<AudioSettings>) => { const next = { ...pick(get()), ...patch }; write(next); set(patch); };
  return {
    ...read(),
    setMuted: (muted) => update({ muted }),
    setMaster: (value) => update({ master: unit(value, get().master) }),
    setChannel: (channel, value) => update({ channels: { ...get().channels, [channel]: unit(value, get().channels[channel]) } }),
    setLowEffects: (lowEffects) => update({ lowEffects }),
  };
});
export const audioSettingsNow = (): AudioSettings => pick(useAudioSettings.getState());

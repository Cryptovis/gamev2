import { CUE_CHANNEL, type AmbientTrack, type SoundCue } from '../presentation/battleEffects';
import { audioSettingsNow, type AudioSettings } from './audioSettings';

/**
 * Phase 5 (0.90.0-playtest.14): the one place that plays sound.
 *
 * - Howler.js is loaded with a dynamic import on the first user interaction (browser autoplay rule), so it is not in
 *   the initial bundle. Until then, and whenever the library or a file fails to load, every call is a silent no-op:
 *   sound can never stop or slow the game.
 * - Separate volumes for UI, war and ambience, a master volume and mute (audioSettings, stored in this browser only).
 * - At most `MAX_CONCURRENT` effects at once; extra cues are dropped, not queued.
 * - A cue with an event id plays at most once (replays, rerenders, saves and reloads in the same tab do not repeat it).
 * - The service reads presentation settings only; it never reads or writes game state.
 */

export const MAX_CONCURRENT = 4;
export const PLAYED_MEMORY = 600;
const AMBIENT_FADE_MS = 1500;

export interface SoundHandle {
  play(volume: number, onEnd: () => void): void;
  setVolume(volume: number): void;
  fadeOut(ms: number): void;
  stop(): void;
}
export interface AudioBackend {
  create(name: string, urls: string[], loop: boolean, onError: () => void): SoundHandle;
  setMuted(muted: boolean): void;
}
export type AudioState = 'locked' | 'loading' | 'ready' | 'unavailable';

/** Howler-backed sounds. Each Howl is created on first use; load or play errors mark that sound as broken. */
export async function loadHowlerBackend(): Promise<AudioBackend> {
  const { Howl, Howler } = await import('howler');
  return {
    create(_name, urls, loop, onError) {
      const howl = new Howl({ src: urls, loop, preload: true, html5: false, onloaderror: onError, onplayerror: onError });
      let current: number | null = null;
      return {
        play(volume, onEnd) {
          const id = howl.play();
          current = typeof id === 'number' ? id : null;
          if (current === null) { onEnd(); return; }
          howl.volume(volume, current);
          howl.once('end', onEnd, current);
          howl.once('stop', onEnd, current);
        },
        setVolume(volume) { if (current !== null) howl.volume(volume, current); },
        fadeOut(ms) { if (current === null) return; const id = current; howl.fade(howl.volume(id) as number, 0, ms, id); howl.once('fade', () => howl.stop(id), id); },
        stop() { howl.stop(); },
      };
    },
    setMuted(muted) { Howler.mute(muted); },
  };
}

function assetBase(): string {
  const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  return `${base.replace(/\/?$/, '/')}assets/audio/`;
}
/** Opus in WebM first, MP3 for browsers without Opus. */
export const soundUrls = (name: string, base = assetBase()) => [`${base}${name}.webm`, `${base}${name}.mp3`];

export interface AudioService {
  readonly state: () => AudioState;
  /** Called on the first user gesture; safe to call repeatedly. */
  unlock(): Promise<void>;
  /** Plays a cue; returns whether it started. `eventId` makes it play at most once. */
  play(cue: SoundCue, eventId?: string): boolean;
  /** Marks an event as heard without playing it (e.g. events that happened while effects were summarised). */
  markPlayed(eventId: string): void;
  setAmbient(track: AmbientTrack | null): void;
  applySettings(): void;
  readonly activeEffects: () => number;
}

export function createAudioService(loadBackend: () => Promise<AudioBackend> = loadHowlerBackend, settings: () => AudioSettings = audioSettingsNow, base?: string): AudioService {
  let state: AudioState = 'locked', backend: AudioBackend | null = null, loading: Promise<void> | null = null, active = 0;
  const handles = new Map<string, SoundHandle>(), broken = new Set<string>(), played: string[] = [], playedSet = new Set<string>();
  let wantedAmbient: AmbientTrack | null = null, ambient: { track: AmbientTrack; handle: SoundHandle } | null = null;

  const remember = (id: string) => {
    if (playedSet.has(id)) return;
    played.push(id); playedSet.add(id);
    while (played.length > PLAYED_MEMORY) playedSet.delete(played.shift()!);
  };
  const handle = (name: string, loop: boolean): SoundHandle | null => {
    if (!backend || broken.has(name)) return null;
    let h = handles.get(name);
    if (!h) {
      try { h = backend.create(name, soundUrls(name, base), loop, () => { broken.add(name); }); } catch { broken.add(name); return null; }
      handles.set(name, h);
    }
    return h;
  };
  const ambientVolume = (s: AudioSettings) => (s.muted ? 0 : s.master * s.channels.ambient);
  const syncAmbient = () => {
    if (state !== 'ready') return;
    const s = settings(), volume = ambientVolume(s);
    if (ambient && (ambient.track !== wantedAmbient || volume <= 0)) { try { ambient.handle.fadeOut(AMBIENT_FADE_MS); } catch { /* ignore */ } ambient = null; }
    if (!wantedAmbient || volume <= 0) return;
    if (ambient) { try { ambient.handle.setVolume(volume); } catch { /* ignore */ } return; }
    const h = handle(wantedAmbient, true);
    if (!h) return;
    try { h.play(volume, () => { /* loops until faded */ }); ambient = { track: wantedAmbient, handle: h }; } catch { broken.add(wantedAmbient); }
  };

  return {
    state: () => state,
    activeEffects: () => active,
    unlock() {
      if (loading) return loading;
      state = 'loading';
      loading = loadBackend().then((b) => {
        backend = b; state = 'ready';
        try { b.setMuted(settings().muted); } catch { /* ignore */ }
        syncAmbient();
      }, () => { state = 'unavailable'; backend = null; });
      return loading;
    },
    play(cue, eventId) {
      if (eventId) { if (playedSet.has(eventId)) return false; remember(eventId); }
      if (state !== 'ready') return false;
      const s = settings(), volume = s.muted ? 0 : s.master * s.channels[CUE_CHANNEL[cue]];
      if (volume <= 0 || active >= MAX_CONCURRENT) return false;
      const h = handle(cue, false);
      if (!h) return false;
      active++;
      let ended = false;
      try { h.play(volume, () => { if (!ended) { ended = true; active = Math.max(0, active - 1); } }); } catch { broken.add(cue); active = Math.max(0, active - 1); return false; }
      return true;
    },
    markPlayed: remember,
    setAmbient(track) { wantedAmbient = track; syncAmbient(); },
    applySettings() {
      if (state !== 'ready' || !backend) return;
      try { backend.setMuted(settings().muted); } catch { /* ignore */ }
      syncAmbient();
    },
  };
}

/** The game's audio service (one per tab). */
export const audio = createAudioService();

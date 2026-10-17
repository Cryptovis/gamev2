import type { AmbientMood } from './ambientMood';
import type { AudioSettings } from './audioSettings';
import type { SynthContext, SynthGain, SynthOscillator } from './synth';

// Phase 10.0: the adaptive ambience bed. A quiet procedural drone (no sound files) whose pitch, beating, brightness
// and slow swell follow the mood. It sits under the existing ambient track and the effects, follows the mute, master
// and ambience settings, and fails silently: if anything throws, the bed switches itself off and the game goes on.

interface Voice { ratio: number; kind: 'sine' | 'triangle'; level: number }
export interface MoodVoicing {
  root: number;
  voices: readonly Voice[];
  /** Low-pass cutoff in Hz: lower is darker. */
  filter: number;
  /** Beating between the voices, in cents. */
  detune: number;
  /** Slow swell: speed in Hz and depth as a share of the level. */
  swellHz: number;
  swellDepth: number;
  /** Loudness of the bed at this mood, before the settings. */
  level: number;
}

export const VOICINGS: Record<AmbientMood, MoodVoicing> = {
  peace: { root: 110, voices: [{ ratio: 1, kind: 'sine', level: 1 }, { ratio: 1.5, kind: 'triangle', level: 0.55 }, { ratio: 2, kind: 'sine', level: 0.4 }], filter: 900, detune: 4, swellHz: 0.06, swellDepth: 0.15, level: 0.5 },
  tension: { root: 98, voices: [{ ratio: 1, kind: 'sine', level: 1 }, { ratio: 1.189, kind: 'triangle', level: 0.6 }, { ratio: 1.5, kind: 'triangle', level: 0.4 }], filter: 700, detune: 7, swellHz: 0.12, swellDepth: 0.25, level: 0.56 },
  crisis: { root: 87.31, voices: [{ ratio: 1, kind: 'sine', level: 1 }, { ratio: 1.414, kind: 'triangle', level: 0.7 }, { ratio: 1.498, kind: 'triangle', level: 0.45 }], filter: 520, detune: 12, swellHz: 0.22, swellDepth: 0.4, level: 0.62 },
  war: { root: 73.42, voices: [{ ratio: 1, kind: 'sine', level: 1 }, { ratio: 1.059, kind: 'triangle', level: 0.7 }, { ratio: 1.5, kind: 'triangle', level: 0.5 }], filter: 420, detune: 16, swellHz: 0.3, swellDepth: 0.5, level: 0.7 },
};

/** Seconds a change of mood takes to settle, so the music slides rather than jumps. */
export const MOOD_GLIDE_S = 3;
const FADE_S = 1.2;
/** The bed stays well under the ambient track and the effects. */
const BED_SHARE = 0.55;

export interface MoodBedDeps {
  context: () => SynthContext | null;
  settings: () => AudioSettings;
}
export interface MoodBed {
  /** Whether the bed should be sounding at all (a campaign is running and adaptive ambience is on). */
  setActive(active: boolean): void;
  setMood(mood: AmbientMood): void;
  /** Called after a gesture: creates and resumes the context. */
  unlock(): Promise<void>;
  applySettings(): void;
  readonly mood: () => AmbientMood;
  readonly running: () => boolean;
  readonly failed: () => boolean;
  dispose(): void;
}

export const bedVolume = (s: AudioSettings, v: MoodVoicing) => (s.muted ? 0 : s.master * s.channels.ambient * BED_SHARE * v.level);

export function createMoodBed(deps: MoodBedDeps): MoodBed {
  let mood: AmbientMood = 'peace', active = false, failed = false, ctx: SynthContext | null = null;
  let master: SynthGain | null = null, swell: SynthGain | null = null, swellOsc: SynthOscillator | null = null, swellDepth: SynthGain | null = null;
  let oscs: { osc: SynthOscillator; gain: SynthGain; index: number }[] = [], filter: ReturnType<SynthContext['createBiquadFilter']> | null = null;

  const fail = () => { failed = true; teardown(); };
  function teardown() {
    for (const n of [...oscs.map(o => o.osc), swellOsc]) { try { n?.stop(); } catch { /* already stopped */ } }
    for (const n of [master, swell, swellDepth, filter, ...oscs.map(o => o.gain), ...oscs.map(o => o.osc), swellOsc]) { try { n?.disconnect(); } catch { /* ignore */ } }
    oscs = []; master = swell = swellDepth = null; swellOsc = null; filter = null;
  }
  function build() {
    if (failed || master) return;
    ctx = deps.context();
    if (!ctx) { failed = true; return; }
    const c = ctx, v = VOICINGS[mood];
    master = c.createGain(); master.gain.value = 0;
    swell = c.createGain(); swell.gain.value = 1;
    filter = c.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = v.filter; filter.Q.value = 0.7;
    swellOsc = c.createOscillator(); swellOsc.type = 'sine'; swellOsc.frequency.value = v.swellHz;
    swellDepth = c.createGain(); swellDepth.gain.value = v.swellDepth * 0.5;
    swellOsc.connect(swellDepth); swellDepth.connect(swell.gain);
    filter.connect(swell); swell.connect(master); master.connect(c.destination);
    v.voices.forEach((voice, index) => {
      const osc = c.createOscillator(), gain = c.createGain();
      osc.type = voice.kind; osc.frequency.value = v.root * voice.ratio; osc.detune.value = index === 0 ? 0 : (index % 2 ? 1 : -1) * v.detune;
      gain.gain.value = voice.level * 0.33;
      osc.connect(gain); gain.connect(filter!);
      osc.start();
      oscs.push({ osc, gain, index });
    });
    swellOsc.start();
  }
  function glide() {
    if (!ctx || !master || !filter || !swellOsc || !swellDepth) return;
    const t = ctx.currentTime, v = VOICINGS[mood], tc = MOOD_GLIDE_S / 3;
    for (const { osc, index } of oscs) {
      osc.frequency.setTargetAtTime(v.root * v.voices[index].ratio, t, tc);
      osc.detune.setTargetAtTime(index === 0 ? 0 : (index % 2 ? 1 : -1) * v.detune, t, tc);
    }
    for (const { gain, index } of oscs) gain.gain.setTargetAtTime(v.voices[index].level * 0.33, t, tc);
    filter.frequency.setTargetAtTime(v.filter, t, tc);
    swellOsc.frequency.setTargetAtTime(v.swellHz, t, tc);
    swellDepth.gain.setTargetAtTime(v.swellDepth * 0.5, t, tc);
  }
  function level() {
    if (!ctx || !master) return;
    const target = active ? bedVolume(deps.settings(), VOICINGS[mood]) : 0;
    master.gain.setTargetAtTime(target, ctx.currentTime, FADE_S / 3);
  }
  function sync() {
    if (failed) return;
    try {
      if (!active && !master) return;
      if (active) { build(); if (failed) return; glide(); }
      level();
    } catch { fail(); }
  }

  return {
    setActive(next) { if (next === active) return; active = next; if (!ctx && next) return; sync(); },
    setMood(next) { if (next === mood) return; mood = next; if (ctx && master) sync(); },
    async unlock() {
      if (failed) return;
      try {
        ctx = ctx ?? deps.context();
        if (!ctx) { failed = true; return; }
        if (ctx.state === 'suspended') await ctx.resume();
        sync();
      } catch { fail(); }
    },
    applySettings() { sync(); },
    mood: () => mood,
    running: () => !!master && active,
    failed: () => failed,
    dispose() { active = false; teardown(); try { void ctx?.close(); } catch { /* ignore */ } ctx = null; },
  };
}

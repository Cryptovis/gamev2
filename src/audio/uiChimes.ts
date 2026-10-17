import type { AudioSettings } from './audioSettings';
import type { SynthContext } from './synth';

// Phase 10.0: light interface sounds made with the Web Audio API (no sound files): a soft tick for tabs, a two-note
// chime for a critical event, a falling pair for an alert, a low hum for a darkening mood. They follow the mute,
// master and interface-volume settings, are rate-limited, and fail silently.

export type ChimeKind = 'tab' | 'toggle' | 'event' | 'alert' | 'crisis';

interface Note { hz: number; at: number; length: number; peak: number }
export const CHIMES: Record<ChimeKind, readonly Note[]> = {
  tab: [{ hz: 880, at: 0, length: 0.07, peak: 0.5 }],
  toggle: [{ hz: 660, at: 0, length: 0.06, peak: 0.45 }, { hz: 990, at: 0.05, length: 0.08, peak: 0.4 }],
  event: [{ hz: 523.25, at: 0, length: 0.5, peak: 0.6 }, { hz: 783.99, at: 0.14, length: 0.7, peak: 0.5 }],
  alert: [{ hz: 698.46, at: 0, length: 0.3, peak: 0.6 }, { hz: 466.16, at: 0.16, length: 0.6, peak: 0.6 }],
  crisis: [{ hz: 130.81, at: 0, length: 1.1, peak: 0.55 }, { hz: 138.59, at: 0.02, length: 1.1, peak: 0.4 }],
};

/** Shortest gap between two chimes of any kind, and between two of the same kind, in seconds of audio-clock time. */
export const MIN_GAP_S = 0.04;
export const SAME_KIND_GAP_S = 0.25;
export const MAX_CHIMES = 3;
/** Chimes are quiet next to the recorded interface clicks. */
const CHIME_SHARE = 0.35;

export const chimeVolume = (s: AudioSettings) => (s.muted ? 0 : s.master * s.channels.ui * CHIME_SHARE);

export interface Chimes {
  /** Plays a chime; returns whether it started. */
  play(kind: ChimeKind): boolean;
  unlock(): Promise<void>;
  readonly failed: () => boolean;
}

export function createChimes(deps: { context: () => SynthContext | null; settings: () => AudioSettings }): Chimes {
  let ctx: SynthContext | null = null, failed = false, lastAny = -1, active = 0;
  const lastKind: Partial<Record<ChimeKind, number>> = {};
  return {
    async unlock() {
      if (failed) return;
      try {
        ctx = ctx ?? deps.context();
        if (!ctx) { failed = true; return; }
        if (ctx.state === 'suspended') await ctx.resume();
      } catch { failed = true; }
    },
    play(kind) {
      if (failed || !ctx || ctx.state !== 'running') return false;
      const volume = chimeVolume(deps.settings());
      if (volume <= 0 || active >= MAX_CHIMES) return false;
      const now = ctx.currentTime;
      if (lastAny >= 0 && now - lastAny < MIN_GAP_S) return false;
      const k = lastKind[kind];
      if (k !== undefined && now - k < SAME_KIND_GAP_S) return false;
      try {
        const notes = CHIMES[kind], out = ctx.createGain();
        out.gain.value = volume;
        out.connect(ctx.destination);
        let end = now;
        for (const n of notes) {
          const osc = ctx.createOscillator(), env = ctx.createGain();
          osc.type = 'sine'; osc.frequency.value = n.hz;
          env.gain.value = 0;
          const t0 = now + n.at;
          env.gain.setValueAtTime(0, t0);
          env.gain.setTargetAtTime(n.peak, t0, 0.004);
          env.gain.setTargetAtTime(0, t0 + 0.012, n.length / 4);
          osc.connect(env); env.connect(out);
          osc.start(t0); osc.stop(t0 + n.length + 0.05);
          end = Math.max(end, t0 + n.length + 0.05);
        }
        lastAny = now; lastKind[kind] = now; active++;
        // The audio clock is not a timer; free the slot from a timer so a stalled clock cannot lock chimes out.
        setTimeout(() => { active = Math.max(0, active - 1); try { out.disconnect(); } catch { /* ignore */ } }, Math.ceil((end - now) * 1000) + 120);
        return true;
      } catch { failed = true; return false; }
    },
    failed: () => failed,
  };
}

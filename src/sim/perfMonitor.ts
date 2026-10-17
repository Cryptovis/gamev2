// Phase 9.9: the numbers behind the simulation-thread indicator. Plain arithmetic over a rolling window; nothing here
// touches the DOM, so the tests feed it timestamps directly.

export interface WindowSummary { count: number; last: number; mean: number; p50: number; p95: number; max: number }

/** The most recent `capacity` samples, with percentiles on demand. */
export class RollingWindow {
  private samples: number[] = [];
  constructor(private readonly capacity = 120) {}
  push(value: number) {
    if (!Number.isFinite(value)) return;
    this.samples.push(value);
    if (this.samples.length > this.capacity) this.samples.shift();
  }
  clear() { this.samples = []; }
  summary(): WindowSummary {
    const n = this.samples.length;
    if (!n) return { count: 0, last: 0, mean: 0, p50: 0, p95: 0, max: 0 };
    const sorted = [...this.samples].sort((a, b) => a - b);
    const at = (q: number) => sorted[Math.min(n - 1, Math.max(0, Math.ceil(q * n) - 1))];
    return { count: n, last: this.samples[n - 1], mean: sorted.reduce((s, v) => s + v, 0) / n, p50: at(0.5), p95: at(0.95), max: sorted[n - 1] };
  }
}

/** A frame longer than this is visible as a stutter at 60 FPS (three missed frames). */
export const LONG_FRAME_MS = 50;
/** The budget for one frame at 60 FPS. */
export const FRAME_BUDGET_MS = 1000 / 60;

export interface FrameSummary { frames: number; fps: number; worstMs: number; longFrames: number; p95Ms: number }

/** Measures the main thread from requestAnimationFrame timestamps: if the worker keeps the thread free, frames stay near 16.7 ms. */
export class FrameMeter {
  private deltas = new RollingWindow(180);
  private last: number | null = null;
  private longCount = 0;
  private frames = 0;
  private handle: number | null = null;
  /** Feed one rAF timestamp (milliseconds). The first call only sets the origin. */
  record(timestamp: number) {
    if (this.last !== null) {
      const delta = timestamp - this.last;
      // A hidden tab pauses rAF for seconds; that is not jank.
      if (delta > 0 && delta < 1000) { this.deltas.push(delta); this.frames++; if (delta > LONG_FRAME_MS) this.longCount++; }
    }
    this.last = timestamp;
  }
  summary(): FrameSummary {
    const w = this.deltas.summary();
    return { frames: this.frames, fps: w.mean > 0 ? Math.round(10000 / w.mean) / 10 : 0, worstMs: w.max, longFrames: this.longCount, p95Ms: w.p95 };
  }
  reset() { this.deltas.clear(); this.last = null; this.longCount = 0; this.frames = 0; }
  /** Starts sampling in a browser. Returns false where there is no requestAnimationFrame (vitest, SSR). */
  start(): boolean {
    if (this.handle !== null) return true;
    if (typeof requestAnimationFrame !== 'function') return false;
    const loop = (t: number) => { this.record(t); this.handle = requestAnimationFrame(loop); };
    this.handle = requestAnimationFrame(loop);
    return true;
  }
  stop() { if (this.handle !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.handle); this.handle = null; this.last = null; }
}

export type FrameHealth = 'measuring' | 'smooth' | 'busy' | 'stalled';

/** One word for the indicator. Smooth means the main thread is keeping up with the screen; stalled means players would see it freeze. */
export function frameHealth(frame: FrameSummary | null): FrameHealth {
  if (!frame || frame.frames < 30) return 'measuring';
  if (frame.fps >= 55 && frame.worstMs <= LONG_FRAME_MS * 2) return 'smooth';
  if (frame.fps >= 30) return 'busy';
  return 'stalled';
}

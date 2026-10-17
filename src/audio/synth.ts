// Phase 10.0: a small, dependency-free slice of the Web Audio API, so the procedural layers can be tested with a fake
// context and never touch a real device in a headless run. A real AudioContext satisfies these shapes.

export interface SynthParam {
  value: number;
  setValueAtTime(value: number, time: number): unknown;
  setTargetAtTime(target: number, time: number, timeConstant: number): unknown;
  cancelScheduledValues(time: number): unknown;
}
export interface SynthNode { connect(destination: unknown): unknown; disconnect(): void }
export interface SynthOscillator extends SynthNode { type: string; frequency: SynthParam; detune: SynthParam; start(time?: number): void; stop(time?: number): void }
export interface SynthGain extends SynthNode { gain: SynthParam }
export interface SynthFilter extends SynthNode { type: string; frequency: SynthParam; Q: SynthParam }
export interface SynthContext {
  readonly currentTime: number;
  readonly state: string;
  readonly destination: unknown;
  createOscillator(): SynthOscillator;
  createGain(): SynthGain;
  createBiquadFilter(): SynthFilter;
  resume(): Promise<void>;
  close(): Promise<void>;
}

export type SynthContextFactory = () => SynthContext | null;

/** The browser's AudioContext, or null where there is none (headless runs, old browsers). */
export function browserSynthContext(): SynthContext | null {
  try {
    const g = globalThis as unknown as { AudioContext?: new () => SynthContext; webkitAudioContext?: new () => SynthContext };
    const Ctor = g.AudioContext ?? g.webkitAudioContext;
    return Ctor ? new Ctor() : null;
  } catch { return null; }
}

/** One shared context per tab, created on the first call after a user gesture. */
export function sharedContext(create: SynthContextFactory = browserSynthContext): () => SynthContext | null {
  let ctx: SynthContext | null = null, failed = false;
  return () => {
    if (ctx || failed) return ctx;
    ctx = create();
    if (!ctx) failed = true;
    return ctx;
  };
}

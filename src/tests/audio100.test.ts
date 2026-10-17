import { describe, expect, it } from 'vitest';
import { CALM_INPUT, MOODS, THRESHOLDS, moodFor, moodRank, pressures, type AmbientMood, type MoodInput } from '../audio/ambientMood';
import { DEFAULT_AUDIO_SETTINGS, type AudioSettings } from '../audio/audioSettings';
import { MOOD_GLIDE_S, VOICINGS, bedVolume, createMoodBed } from '../audio/moodBed';
import { sharedContext, type SynthContext, type SynthParam } from '../audio/synth';
import { CHIMES, MAX_CHIMES, SAME_KIND_GAP_S, chimeVolume, createChimes } from '../audio/uiChimes';
import { clearPendingScenario, readPendingScenario, setPendingScenario } from '../scenarios/scenarioSelection';

/** A recording stand-in for AudioContext: no device, no clock, just what was asked of it. */
function fakeContext(opts: { state?: string; throwOn?: 'createGain' | 'createOscillator' } = {}) {
  const log = { oscillators: 0, gains: 0, started: 0, stopped: 0, targets: [] as { name: string; value: number }[], resumed: 0, closed: 0 };
  let now = 0;
  const param = (name: string, initial = 0): SynthParam => {
    const p = { value: initial, setValueAtTime: () => p, setTargetAtTime: (v: number) => { log.targets.push({ name, value: v }); return p; }, cancelScheduledValues: () => p };
    return p;
  };
  const node = () => ({ connect: () => undefined, disconnect: () => undefined });
  const ctx: SynthContext & { advance(s: number): void; state: string } = {
    get currentTime() { return now; },
    state: opts.state ?? 'running',
    destination: {},
    createOscillator() { if (opts.throwOn === 'createOscillator') throw new Error('no oscillator'); log.oscillators++; return { ...node(), type: 'sine', frequency: param('freq'), detune: param('detune'), start: () => { log.started++; }, stop: () => { log.stopped++; } }; },
    createGain() { if (opts.throwOn === 'createGain') throw new Error('no gain'); log.gains++; return { ...node(), gain: param('gain') }; },
    createBiquadFilter() { return { ...node(), type: 'lowpass', frequency: param('cutoff'), Q: param('q') }; },
    async resume() { log.resumed++; ctx.state = 'running'; },
    async close() { log.closed++; },
    advance(s: number) { now += s; },
  };
  return { ctx, log };
}
const settings = (patch: Partial<AudioSettings> = {}): AudioSettings => ({ ...DEFAULT_AUDIO_SETTINGS, ...patch });
const lastGain = (log: ReturnType<typeof fakeContext>['log']) => [...log.targets].reverse().find(t => t.name === 'gain')!;

describe('10.0 ambient mood', () => {
  it('is calm for a calm country', () => expect(moodFor(CALM_INPUT).mood).toBe('peace'));
  it('is tense with one pressure and a crisis with two', () => {
    expect(moodFor({ ...CALM_INPUT, inflation: 14 }).mood).toBe('tension');
    expect(moodFor({ ...CALM_INPUT, inflation: 14, stability: 30 }).mood).toBe('crisis');
    expect(moodFor({ ...CALM_INPUT, iaea: 'referred', parliamentUnrest: 80 }).mood).toBe('crisis');
  });
  it('lets a war override everything', () => {
    expect(moodFor({ ...CALM_INPUT, atWar: true }).mood).toBe('war');
    expect(moodFor({ ...CALM_INPUT, atWar: true, inflation: 40, stability: 5 }).mood).toBe('war');
  });
  it('names each pressure', () => {
    expect(pressures({ ...CALM_INPUT, inflation: 20 })).toEqual(['inflation']);
    expect(pressures({ ...CALM_INPUT, stability: 20 })).toEqual(['stability']);
    expect(pressures({ ...CALM_INPUT, strike: 'general' })).toEqual(['chamber']);
    expect(pressures({ ...CALM_INPUT, strike: 'local' })).toEqual([]);
    expect(pressures({ ...CALM_INPUT, iaea: 'noncompliant' })).toEqual(['iaea']);
    for (const iaea of ['compliant', 'queried', 'withdrawn'] as const) expect(pressures({ ...CALM_INPUT, iaea })).toEqual([]);
  });
  it('does not flutter at a threshold (hysteresis)', () => {
    let held: ReturnType<typeof pressures> = [];
    const moods: AmbientMood[] = [];
    for (const inflation of [11, 12.5, 11, 10, 9.5, 8.9, 10]) {
      const r = moodFor({ ...CALM_INPUT, inflation }, held); held = r.pressures; moods.push(r.mood);
    }
    expect(moods).toEqual(['peace', 'tension', 'tension', 'tension', 'tension', 'peace', 'peace']);
    expect(THRESHOLDS.inflation.leave).toBeLessThan(THRESHOLDS.inflation.enter);
  });
  it('orders the moods from light to dark', () => {
    expect(MOODS.map(moodRank)).toEqual([0, 1, 2, 3]);
  });
  it('is a pure function', () => {
    const input: MoodInput = { ...CALM_INPUT, inflation: 30, stability: 10, strike: 'general', iaea: 'sanctioned' };
    expect(JSON.stringify(moodFor(input))).toBe(JSON.stringify(moodFor({ ...input })));
  });
});

describe('10.0 the mood bed', () => {
  it('makes no sound and creates nothing until it is active and unlocked', async () => {
    const { ctx, log } = fakeContext();
    const bed = createMoodBed({ context: () => ctx, settings: () => settings() });
    bed.setMood('crisis');
    expect(log.oscillators).toBe(0);
    await bed.unlock();
    expect(log.oscillators).toBe(0);
    expect(bed.running()).toBe(false);
  });
  it('builds three voices and a swell once active, and fades in to the setting', async () => {
    const { ctx, log } = fakeContext();
    const bed = createMoodBed({ context: () => ctx, settings: () => settings() });
    await bed.unlock();
    bed.setActive(true);
    expect(log.oscillators).toBe(4);
    expect(log.started).toBe(4);
    expect(bed.running()).toBe(true);
    expect(lastGain(log).value).toBeCloseTo(bedVolume(settings(), VOICINGS.peace), 9);
  });
  it('glides to the new mood and gets louder as it darkens', async () => {
    const { ctx, log } = fakeContext();
    const bed = createMoodBed({ context: () => ctx, settings: () => settings() });
    await bed.unlock(); bed.setActive(true);
    const peace = lastGain(log).value;
    log.targets.length = 0;
    bed.setMood('war');
    expect(bed.mood()).toBe('war');
    expect(log.targets.filter(t => t.name === 'freq').map(t => t.value)).toContain(VOICINGS.war.root);
    expect(log.targets.find(t => t.name === 'cutoff')!.value).toBe(VOICINGS.war.filter);
    expect(lastGain(log).value).toBeGreaterThan(peace);
    expect(MOOD_GLIDE_S).toBeGreaterThan(1);
  });
  it('voices get darker and rougher with each mood', () => {
    const order = MOODS.map(m => VOICINGS[m]);
    for (let i = 1; i < order.length; i++) {
      expect(order[i].filter).toBeLessThan(order[i - 1].filter);
      expect(order[i].detune).toBeGreaterThan(order[i - 1].detune);
      expect(order[i].root).toBeLessThan(order[i - 1].root);
    }
  });
  it('follows mute, master and ambience volume', async () => {
    let s = settings();
    const { ctx, log } = fakeContext();
    const bed = createMoodBed({ context: () => ctx, settings: () => s });
    await bed.unlock(); bed.setActive(true);
    s = settings({ muted: true }); bed.applySettings();
    expect(lastGain(log).value).toBe(0);
    s = settings({ master: 0.4, channels: { ...DEFAULT_AUDIO_SETTINGS.channels, ambient: 0.5 } }); bed.applySettings();
    expect(lastGain(log).value).toBeCloseTo(0.4 * 0.5 * 0.55 * VOICINGS.peace.level, 9);
    s = settings({ channels: { ...DEFAULT_AUDIO_SETTINGS.channels, ambient: 0 } }); bed.applySettings();
    expect(lastGain(log).value).toBe(0);
  });
  it('fades out when deactivated and stays quiet', async () => {
    const { ctx, log } = fakeContext();
    const bed = createMoodBed({ context: () => ctx, settings: () => settings() });
    await bed.unlock(); bed.setActive(true); bed.setActive(false);
    expect(lastGain(log).value).toBe(0);
    expect(bed.running()).toBe(false);
  });
  it('resumes a suspended context on unlock', async () => {
    const { ctx, log } = fakeContext({ state: 'suspended' });
    const bed = createMoodBed({ context: () => ctx, settings: () => settings() });
    await bed.unlock();
    expect(log.resumed).toBe(1);
  });
  it('switches itself off without throwing when there is no audio device', async () => {
    const bed = createMoodBed({ context: () => null, settings: () => settings() });
    await bed.unlock(); bed.setActive(true); bed.setMood('war'); bed.applySettings();
    expect(bed.failed()).toBe(true);
    expect(bed.running()).toBe(false);
  });
  it('switches itself off when the audio graph throws', async () => {
    for (const throwOn of ['createGain', 'createOscillator'] as const) {
      const { ctx } = fakeContext({ throwOn });
      const bed = createMoodBed({ context: () => ctx, settings: () => settings() });
      await bed.unlock();
      expect(() => bed.setActive(true)).not.toThrow();
      expect(bed.failed()).toBe(true);
      expect(() => { bed.setMood('crisis'); bed.applySettings(); bed.dispose(); }).not.toThrow();
    }
  });
  it('closes the context on dispose', async () => {
    const { ctx, log } = fakeContext();
    const bed = createMoodBed({ context: () => ctx, settings: () => settings() });
    await bed.unlock(); bed.setActive(true); bed.dispose();
    expect(log.closed).toBe(1);
    expect(log.stopped).toBeGreaterThanOrEqual(4);
  });
  it('shares one context between its users', () => {
    let made = 0;
    const get = sharedContext(() => { made++; return fakeContext().ctx; });
    expect(get()).toBe(get());
    expect(made).toBe(1);
    const none = sharedContext(() => null);
    expect(none()).toBeNull(); expect(none()).toBeNull();
  });
});

describe('10.0 interface chimes', () => {
  const ready = async (s: AudioSettings = settings()) => {
    const f = fakeContext(); const chimes = createChimes({ context: () => f.ctx, settings: () => s });
    await chimes.unlock();
    return { ...f, chimes };
  };
  it('plays nothing before the first gesture', () => {
    const f = fakeContext({ state: 'suspended' });
    const chimes = createChimes({ context: () => f.ctx, settings: () => settings() });
    expect(chimes.play('tab')).toBe(false);
    expect(f.log.oscillators).toBe(0);
  });
  it('plays one oscillator per note', async () => {
    const { chimes, log } = await ready();
    expect(chimes.play('event')).toBe(true);
    expect(log.oscillators).toBe(CHIMES.event.length);
  });
  it('is silent when muted or when the interface volume is zero', async () => {
    for (const s of [settings({ muted: true }), settings({ channels: { ...DEFAULT_AUDIO_SETTINGS.channels, ui: 0 } }), settings({ master: 0 })]) {
      const { chimes, log } = await ready(s);
      expect(chimes.play('alert')).toBe(false);
      expect(log.oscillators).toBe(0);
    }
    expect(chimeVolume(settings())).toBeGreaterThan(0);
    expect(chimeVolume(settings({ muted: true }))).toBe(0);
  });
  it('rate-limits the same kind and caps how many sound at once', async () => {
    const { chimes, ctx } = await ready();
    expect(chimes.play('tab')).toBe(true);
    ctx.advance(0.05);
    expect(chimes.play('tab')).toBe(false);
    ctx.advance(SAME_KIND_GAP_S);
    expect(chimes.play('tab')).toBe(true);
    const kinds = ['toggle', 'event', 'alert', 'crisis'] as const;
    let started = 0;
    for (const k of kinds) { ctx.advance(0.1); if (chimes.play(k)) started++; }
    expect(started + 2).toBeLessThanOrEqual(MAX_CHIMES + 2);
    expect(started).toBeLessThan(kinds.length);
  });
  it('has a quiet, short voice for every kind', () => {
    for (const notes of Object.values(CHIMES)) for (const n of notes) { expect(n.peak).toBeLessThanOrEqual(0.7); expect(n.length).toBeLessThanOrEqual(1.2); expect(n.hz).toBeGreaterThan(100); }
  });
  it('gives up quietly when the audio graph throws', async () => {
    const f = fakeContext({ throwOn: 'createGain' });
    const chimes = createChimes({ context: () => f.ctx, settings: () => settings() });
    await chimes.unlock();
    expect(chimes.play('event')).toBe(false);
    expect(chimes.failed()).toBe(true);
    expect(chimes.play('tab')).toBe(false);
  });
  it('gives up quietly with no audio device', async () => {
    const chimes = createChimes({ context: () => null, settings: () => settings() });
    await chimes.unlock();
    expect(chimes.failed()).toBe(true);
    expect(chimes.play('tab')).toBe(false);
  });
});

describe('10.0 the scenario hand-off', () => {
  it('holds a choice until it is cleared', () => {
    clearPendingScenario();
    expect(readPendingScenario()).toBeNull();
    setPendingScenario({ scenarioId: 'resource-crisis', countryId: 'EGY' });
    expect(readPendingScenario()).toEqual({ scenarioId: 'resource-crisis', countryId: 'EGY' });
    clearPendingScenario();
    expect(readPendingScenario()).toBeNull();
  });
  it('refuses an unknown scenario and ignores a repeat', () => {
    clearPendingScenario();
    setPendingScenario({ scenarioId: 'nope' as never, countryId: null });
    expect(readPendingScenario()).toBeNull();
    setPendingScenario({ scenarioId: 'modern-2026', countryId: null });
    const first = readPendingScenario();
    setPendingScenario({ scenarioId: 'modern-2026', countryId: null });
    expect(readPendingScenario()).toBe(first);
    clearPendingScenario();
  });
});

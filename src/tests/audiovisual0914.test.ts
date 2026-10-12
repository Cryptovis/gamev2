import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import type { GameState } from '../domain/game';
import type { TacticalRoundEvent } from '../domain/tactical';
import { resolveStandingRound, startTacticalBattle } from '../engine/systems/tactical';
import { playbackFrames, playbackUnits } from '../engine/systems/tacticalPlayback';
import { BALANCE_SEEDS, SCENARIOS, scenarioState } from './warBalanceHarness';
import { CUE_CHANNEL, effectAt, shouldSummarize, summarizeRound, type SoundCue } from '../presentation/battleEffects';
import { DEFAULT_AUDIO_SETTINGS, parseAudioSettings, type AudioSettings } from '../audio/audioSettings';
import { MAX_CONCURRENT, createAudioService, soundUrls, type AudioBackend } from '../audio/audioService';

/** A tactical battle with several resolved rounds (both sides on the planner). */
function battle(seed = BALANCE_SEEDS[0], rounds = 6) {
  const setup = scenarioState(SCENARIOS.find((s) => s.name === 'attacker 1.5× forces')!, seed);
  let state: GameState = startTacticalBattle({ ...setup.state, playerCountryId: setup.attackerId }, setup.warId);
  for (let r = 0; r < rounds; r++) state = resolveStandingRound({ ...state, day: state.day + 1 }, setup.warId);
  return { state, warId: setup.warId, events: state.wars[setup.warId].tactical!.events };
}
const deepFreeze = <T,>(o: T): T => { if (o && typeof o === 'object') { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); } return o; };

describe('Phase 5 battle effects — presentation only', () => {
  it('derives effects and summaries without changing the game state, fuel, losses or the RNG', () => {
    const { state, warId, events } = battle();
    expect(events.length).toBeGreaterThan(2);
    const before = JSON.stringify(state);
    deepFreeze(state);
    for (const event of events) {
      for (let step = 1; step <= playbackFrames(event); step++) effectAt(warId, event, step, playbackUnits(event, step - 1));
      summarizeRound(warId, event);
      // Effects on, off or skipped: the final playback frame is exactly the recorded result.
      expect(playbackUnits(event, playbackFrames(event))).toEqual(event.units);
    }
    expect(JSON.stringify(state)).toBe(before);
  });

  it('a round played with effects, summarised or skipped continues identically', () => {
    const a = battle(BALANCE_SEEDS[1], 4), b = battle(BALANCE_SEEDS[1], 4);
    // "Watching" b: every effect of every round; a: nothing.
    for (const e of b.events) { for (let s = 1; s <= playbackFrames(e); s++) effectAt(b.warId, e, s, playbackUnits(e, s - 1)); summarizeRound(b.warId, e); }
    const next = (x: typeof a) => resolveStandingRound({ ...x.state, day: x.state.day + 1 }, x.warId);
    expect(JSON.stringify(next(b))).toBe(JSON.stringify(next(a)));
  });

  it('effect ids are stable and every effect comes from a recorded action', () => {
    const { warId, events } = battle();
    const e = events.at(-1)!;
    const ids = Array.from({ length: e.actions.length }, (_, i) => effectAt(warId, e, i + 1, playbackUnits(e, i))!.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe(`${warId}:${e.round}:1`);
    expect(effectAt(warId, e, 0, e.beforeUnits)).toBeNull();
    expect(effectAt(warId, e, e.actions.length + 1, e.units)).toBeNull();
    e.actions.forEach((a, i) => expect(effectAt(warId, e, i + 1, playbackUnits(e, i))!.kind).toBe(a.kind));
  });

  it('bombardment sounds follow the recorded hit; summaries carry at most two cues', () => {
    const event: TacticalRoundEvent = { ...battle().events[0], actions: [
      { kind: 'bombard', side: 'attacker', unitId: 'attacker-artillery-1', target: 3, hit: true },
      { kind: 'bombard', side: 'defender', unitId: 'defender-artillery-1', target: 5, hit: false },
      { kind: 'capture', side: 'attacker', objective: 3 },
      { kind: 'lost', side: 'defender', unitId: 'defender-infantry-1' },
    ] };
    expect(effectAt('W', event, 1, event.beforeUnits)!.sounds).toEqual(['artillery-fire', 'impact']);
    expect(effectAt('W', event, 2, event.beforeUnits)!.sounds).toEqual(['artillery-fire', 'impact-distant']);
    const s = summarizeRound('W', event);
    expect(s).toMatchObject({ bombardments: 2, hits: 1, captures: { attacker: 1, defender: 0 }, groupsLost: { attacker: 0, defender: 1 } });
    expect(s.sounds).toEqual(['capture', 'impact']);
  });

  it('summarises at 4× playback, the 5× clock, low effects or reduced motion', () => {
    const base = { playbackSpeed: 1, campaignSpeed: 0, lowEffects: false, reducedMotion: false };
    expect(shouldSummarize(base)).toBe(false);
    expect(shouldSummarize({ ...base, playbackSpeed: 2 })).toBe(false);
    expect(shouldSummarize({ ...base, playbackSpeed: 4 })).toBe(true);
    expect(shouldSummarize({ ...base, campaignSpeed: 5 })).toBe(true);
    expect(shouldSummarize({ ...base, lowEffects: true })).toBe(true);
    expect(shouldSummarize({ ...base, reducedMotion: true })).toBe(true);
  });
});

/** Fake backend that records calls; `fail` makes the library load fail. */
function fakeBackend(opts: { createThrows?: boolean } = {}) {
  const calls: { name: string; volume: number; end: () => void }[] = [];
  const ambient: string[] = [];
  let muted = false;
  const backend: AudioBackend = {
    create(name, urls, loop) {
      if (opts.createThrows) throw new Error('decode');
      expect(urls[0]).toMatch(/\.webm$/); expect(urls[1]).toMatch(/\.mp3$/);
      return {
        play(volume, onEnd) { if (loop) ambient.push(`play:${name}`); else calls.push({ name, volume, end: onEnd }); },
        setVolume(v) { ambient.push(`volume:${name}:${v.toFixed(2)}`); },
        fadeOut() { ambient.push(`fade:${name}`); },
        stop() { /* not used */ },
      };
    },
    setMuted(m) { muted = m; },
  };
  return { backend, calls, ambient, isMuted: () => muted };
}

describe('Phase 5 audio service', () => {
  it('stays silent until the first gesture, then plays each event once', async () => {
    const f = fakeBackend();
    const svc = createAudioService(async () => f.backend, () => DEFAULT_AUDIO_SETTINGS, '/x/');
    expect(svc.state()).toBe('locked');
    expect(svc.play('ui-click')).toBe(false);
    await svc.unlock();
    expect(svc.state()).toBe('ready');
    expect(svc.play('radio-chirp', 'W:1:report')).toBe(true);
    expect(svc.play('radio-chirp', 'W:1:report')).toBe(false);
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0].volume).toBeCloseTo(DEFAULT_AUDIO_SETTINGS.master * DEFAULT_AUDIO_SETTINGS.channels.war, 9);
  });

  it('limits concurrent effects and frees a slot when one ends', async () => {
    const f = fakeBackend(), svc = createAudioService(async () => f.backend, () => DEFAULT_AUDIO_SETTINGS);
    await svc.unlock();
    for (let i = 0; i < MAX_CONCURRENT + 3; i++) svc.play('impact');
    expect(f.calls).toHaveLength(MAX_CONCURRENT);
    expect(svc.activeEffects()).toBe(MAX_CONCURRENT);
    f.calls[0].end(); f.calls[0].end();
    expect(svc.activeEffects()).toBe(MAX_CONCURRENT - 1);
    expect(svc.play('impact')).toBe(true);
  });

  it('respects mute and channel volume', async () => {
    let s: AudioSettings = { ...DEFAULT_AUDIO_SETTINGS, muted: true };
    const f = fakeBackend(), svc = createAudioService(async () => f.backend, () => s);
    await svc.unlock();
    expect(f.isMuted()).toBe(true);
    expect(svc.play('ui-click')).toBe(false);
    s = { ...DEFAULT_AUDIO_SETTINGS, channels: { ...DEFAULT_AUDIO_SETTINGS.channels, ui: 0 } };
    svc.applySettings();
    expect(f.isMuted()).toBe(false);
    expect(svc.play('ui-click')).toBe(false);
    expect(svc.play('war-alarm')).toBe(true);
  });

  it('a missing library or broken file never throws and leaves the game silent', async () => {
    const svc = createAudioService(async () => { throw new Error('offline'); }, () => DEFAULT_AUDIO_SETTINGS);
    await svc.unlock();
    expect(svc.state()).toBe('unavailable');
    expect(svc.play('war-alarm', 'W:declared')).toBe(false);
    svc.setAmbient('ambient-war'); svc.applySettings();
    const broken = createAudioService(async () => fakeBackend({ createThrows: true }).backend, () => DEFAULT_AUDIO_SETTINGS);
    await broken.unlock();
    expect(broken.play('impact')).toBe(false);
    expect(() => broken.setAmbient('ambient-command')).not.toThrow();
  });

  it('events heard before unlocking are not replayed later; ambience switches with a fade', async () => {
    const f = fakeBackend(), svc = createAudioService(async () => f.backend, () => DEFAULT_AUDIO_SETTINGS);
    svc.play('war-alarm', 'W:declared');
    svc.setAmbient('ambient-command');
    await svc.unlock();
    expect(svc.play('war-alarm', 'W:declared')).toBe(false);
    expect(f.ambient).toEqual(['play:ambient-command']);
    svc.setAmbient('ambient-war');
    expect(f.ambient).toEqual(['play:ambient-command', 'fade:ambient-command', 'play:ambient-war']);
    svc.setAmbient(null);
    expect(f.ambient.at(-1)).toBe('fade:ambient-war');
  });

  it('stored settings are clamped and malformed values fall back to defaults', () => {
    expect(parseAudioSettings(null)).toEqual(DEFAULT_AUDIO_SETTINGS);
    expect(parseAudioSettings('{bad')).toEqual(DEFAULT_AUDIO_SETTINGS);
    const s = parseAudioSettings(JSON.stringify({ muted: true, master: 4, channels: { ui: -1, war: 'x' }, lowEffects: 1 }));
    expect(s).toEqual({ muted: true, master: 1, channels: { ui: 0, war: DEFAULT_AUDIO_SETTINGS.channels.war, ambient: DEFAULT_AUDIO_SETTINGS.channels.ambient }, lowEffects: false });
  });
});

describe('Phase 5 assets and boundaries', () => {
  const manifest = readFileSync('docs/ASSET_MANIFEST.md', 'utf8');
  it('every sound cue and ambience has WebM and MP3 files, and every audio/terrain file is in the manifest', () => {
    const cues = Object.keys(CUE_CHANNEL) as SoundCue[];
    for (const name of [...cues, 'ambient-command', 'ambient-war']) for (const url of soundUrls(name, 'public/assets/audio/')) expect(existsSync(url)).toBe(true);
    for (const dir of ['public/assets/audio', 'public/assets/terrain']) for (const file of readdirSync(dir)) expect(manifest).toContain(file);
  });

  it('audio and effect modules never import simulation code that changes state', () => {
    for (const file of ['src/audio/audioService.ts', 'src/audio/audioSettings.ts', 'src/audio/AudioDirector.tsx', 'src/presentation/battleEffects.ts', 'src/ui/panels/BattleFxLayer.tsx']) {
      const src = readFileSync(file, 'utf8');
      const engineImports = [...src.matchAll(/from '([^']*engine[^']*)'/g)].map((m) => m[1]);
      expect(engineImports.filter((p) => !/engine\/systems\/tactical$/.test(p))).toEqual([]);
      expect(src).not.toMatch(/dispatch\(|setState\(|Math\.random|Date\.now/);
    }
  });
});

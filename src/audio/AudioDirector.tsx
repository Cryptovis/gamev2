import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { CAMPAIGN_SUMMARY_SPEED, roundReportCue, warAlarmCue, type AmbientTrack } from '../presentation/battleEffects';
import { audio } from './audioService';
import { useAudioSettings } from './audioSettings';
import { chimes, moodBed, unlockAdaptiveAudio, useAdaptiveAudio } from './adaptiveAudio';
import { moodFor, moodRank, type AmbientMood, type MoodInput, type Pressure } from './ambientMood';

/** Rounds of an auto-resolved war that share one radio report at the 5× clock (effects summarised). */
export const AUTO_REPORT_EVERY = 5;
const CLICK_GAP_MS = 45;

/**
 * Phase 5: turns game events into sound through the audio service. Reads a few narrow store values (never writes):
 * the player's wars (id, rounds, status), the clock speed and whether a campaign is running. Wars present when a
 * save is opened do not sound an alarm; each war alarm, round report and outcome plays once (event ids).
 */
export function AudioDirector() {
  const playerWars = useGameStore((s) => Object.values(s.wars).filter((w) => w.attackerId === s.playerCountryId || w.defenderId === s.playerCountryId).map((w) => `${w.id}|${w.rounds}|${w.status}|${w.attackerId === s.playerCountryId ? 'a' : 'd'}`).join(';'));
  const speed = useGameStore((s) => s.speed);
  const playing = useGameStore((s) => s.campaignStatus === 'active' && s.playerProfile.setupComplete);
  const settings = useAudioSettings();
  const adaptive = useAdaptiveAudio((s) => s.adaptive);
  // Narrow figures about the player's own country; the mood is worked out from these and nothing else.
  const inflation = useGameStore((s) => s.countries[s.playerCountryId]?.economy.inflation ?? 0);
  const stability = useGameStore((s) => s.countries[s.playerCountryId]?.politics.stability ?? 70);
  const unrest = useGameStore((s) => s.world.parliament?.countries[s.playerCountryId]?.unrest ?? 0);
  const strike = useGameStore((s) => s.world.parliament?.countries[s.playerCountryId]?.strike.level ?? 'none');
  const iaea = useGameStore((s) => s.world.nuclear?.iaea[s.playerCountryId]?.status ?? 'compliant');
  const eventId = useGameStore((s) => s.activeEvent?.id ?? null);
  const seen = useRef<Map<string, { rounds: number; status: string }> | null>(null);

  // Autoplay rule: the audio library loads on the first gesture. UI clicks and confirmations sound from then on.
  useEffect(() => {
    let last = 0;
    const unlock = () => { void audio.unlock(); void unlockAdaptiveAudio().then(() => moodBed.applySettings()); };
    const click = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.('button,[role="tab"],summary,select');
      if (!el || (el as HTMLButtonElement).disabled) return;
      const now = e.timeStamp;
      if (now - last < CLICK_GAP_MS) return;
      last = now;
      if (el.getAttribute('role') === 'tab' && useAdaptiveAudio.getState().adaptive && chimes.play('tab')) return;
      audio.play(el.closest('.confirm,[data-guide="review-confirm"],.tactical-commit') ? 'ui-confirm' : 'ui-click');
    };
    window.addEventListener('pointerdown', unlock, { capture: true });
    window.addEventListener('keydown', unlock, { capture: true });
    window.addEventListener('click', click, { capture: true });
    return () => { window.removeEventListener('pointerdown', unlock, { capture: true }); window.removeEventListener('keydown', unlock, { capture: true }); window.removeEventListener('click', click, { capture: true }); };
  }, []);

  useEffect(() => { audio.applySettings(); moodBed.applySettings(); }, [settings.muted, settings.master, settings.channels]);

  const atWar = playerWars.split(';').some((row) => row.split('|')[2] === 'active');
  useEffect(() => {
    const track: AmbientTrack | null = !playing ? null : atWar ? 'ambient-war' : 'ambient-command';
    audio.setAmbient(track);
  }, [playing, atWar]);

  // Phase 10.0: the adaptive bed follows the mood; a darkening mood is announced once, never at load.
  const lastMood = useRef<AmbientMood | null>(null), held = useRef<Pressure[]>([]);
  useEffect(() => {
    const input: MoodInput = { atWar, inflation, stability, parliamentUnrest: unrest, strike, iaea };
    const { mood, pressures } = moodFor(input, held.current);
    held.current = pressures;
    useAdaptiveAudio.getState().publish(mood, pressures);
    moodBed.setMood(mood);
    moodBed.setActive(false);
    const before = lastMood.current;
    lastMood.current = mood;
    if (adaptive && playing && before !== null && moodRank(mood) > moodRank(before) && mood !== 'war') chimes.play('crisis');
  }, [atWar, inflation, stability, unrest, strike, iaea, playing, adaptive]);

  const seenEvent = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (seenEvent.current === undefined) { seenEvent.current = eventId; return; }
    if (eventId && eventId !== seenEvent.current && adaptive) chimes.play('event');
    seenEvent.current = eventId;
  }, [eventId, adaptive]);

  useEffect(() => {
    const rows = playerWars ? playerWars.split(';').map((row) => { const [id, rounds, status, side] = row.split('|'); return { id, rounds: Number(rounds), status, attacker: side === 'a' }; }) : [];
    if (!seen.current) {
      // Opening a save: what is already there is not news.
      seen.current = new Map(rows.map((r) => [r.id, { rounds: r.rounds, status: r.status }]));
      for (const r of rows) audio.markPlayed(warAlarmCue(r.id).id);
      return;
    }
    const summarised = speed >= CAMPAIGN_SUMMARY_SPEED;
    for (const r of rows) {
      const before = seen.current.get(r.id);
      if (!before && r.status === 'active') { const a = warAlarmCue(r.id); audio.play(a.cue, a.id); }
      if (before && r.rounds > before.rounds && r.status === 'active') {
        // At 5×, auto-resolved rounds are reported once per AUTO_REPORT_EVERY rounds; otherwise once per round.
        const report = summarised ? { id: `${r.id}:auto:${Math.floor(r.rounds / AUTO_REPORT_EVERY)}`, cue: 'radio-chirp' as const } : roundReportCue(r.id, r.rounds);
        audio.play(report.cue, report.id);
      }
      if (before && before.status === 'active' && r.status !== 'active') {
        // The player's outcome: an attacker's victory is the defender's loss; a withdrawal is a radio report.
        const won = r.attacker ? r.status === 'victory' : r.status === 'defeat' || r.status === 'withdrawn';
        audio.play(r.status === 'withdrawn' && r.attacker ? 'radio-chirp' : won ? 'capture' : 'unit-lost', `${r.id}:end`);
      }
      seen.current.set(r.id, { rounds: r.rounds, status: r.status });
    }
  }, [playerWars, speed]);

  return null;
}

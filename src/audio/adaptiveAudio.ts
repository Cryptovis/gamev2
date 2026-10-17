import { create } from 'zustand';
import type { AmbientMood, Pressure } from './ambientMood';
import { createMoodBed, type MoodBed } from './moodBed';
import { audioSettingsNow } from './audioSettings';
import { createChimes, type Chimes } from './uiChimes';
import { sharedContext } from './synth';

// Phase 10.0: the one place the adaptive layers are created and shared. `adaptive` is a presentation preference kept in
// this browser (ron-audio-adaptive-v1), separate from the 9.14 audio settings so their stored shape does not change.

export const ADAPTIVE_KEY = 'ron-audio-adaptive-v1';

function readAdaptive(): boolean {
  return false;
}

interface AdaptiveStore {
  adaptive: boolean;
  setAdaptive(on: boolean): void;
  /** What the director last decided; the Options panel reads it to say what the ambience is following. */
  mood: AmbientMood;
  pressures: Pressure[];
  publish(mood: AmbientMood, pressures: Pressure[]): void;
}

export const useAdaptiveAudio = create<AdaptiveStore>((set) => ({
  adaptive: false,
  setAdaptive(_on) { set({ adaptive: false }); },
  mood: 'peace',
  pressures: [],
  publish(mood, pressures) { set((s) => (s.mood === mood && s.pressures.join() === pressures.join() ? s : { mood, pressures })); },
}));

const context = sharedContext();
export const moodBed: MoodBed = createMoodBed({ context, settings: audioSettingsNow });
export const chimes: Chimes = createChimes({ context, settings: audioSettingsNow });

/** Called on the first gesture, next to the audio service's own unlock. */
export async function unlockAdaptiveAudio(): Promise<void> {
  await Promise.all([moodBed.unlock(), chimes.unlock()]);
}

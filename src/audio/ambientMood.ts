// Phase 10.0: the mood of the ambience. A pure function of a few figures about the player's country; it reads no
// clock and draws no random numbers. The audio layer follows it, so a tense chamber, a worsening inflation rate or an
// IAEA case darkens the soundscape, and an active war darkens it further.

export type AmbientMood = 'peace' | 'tension' | 'crisis' | 'war';
export const MOODS: readonly AmbientMood[] = ['peace', 'tension', 'crisis', 'war'];

export interface MoodInput {
  atWar: boolean;
  inflation: number;
  stability: number;
  /** Unions' grievance, 0-100, from the parliament layer (0 when the chamber has not met). */
  parliamentUnrest: number;
  /** The strike level now in force. */
  strike: 'none' | 'local' | 'sectoral' | 'general';
  /** The IAEA's standing for the player's state, or 'compliant' when there is no record. */
  iaea: 'compliant' | 'queried' | 'noncompliant' | 'referred' | 'sanctioned' | 'withdrawn';
}

/** Entering and leaving thresholds differ, so a figure hovering at a line does not make the music flutter. */
export const THRESHOLDS = {
  inflation: { enter: 12, leave: 9 },
  stability: { enter: 35, leave: 42 },
  unrest: { enter: 70, leave: 60 },
} as const;

export const CALM_INPUT: MoodInput = { atWar: false, inflation: 3, stability: 70, parliamentUnrest: 0, strike: 'none', iaea: 'compliant' };

/** The pressures currently on the country, named so the Options panel can say why the mood changed. */
export type Pressure = 'inflation' | 'stability' | 'chamber' | 'iaea';

export function pressures(input: MoodInput, previous: readonly Pressure[] = []): Pressure[] {
  const has = (p: Pressure) => previous.includes(p);
  const out: Pressure[] = [];
  const high = (value: number, t: { enter: number; leave: number }, up: boolean, held: boolean) =>
    up ? (held ? value > t.leave : value >= t.enter) : (held ? value < t.leave : value <= t.enter);
  if (high(input.inflation, THRESHOLDS.inflation, true, has('inflation'))) out.push('inflation');
  if (high(input.stability, THRESHOLDS.stability, false, has('stability'))) out.push('stability');
  if (input.strike === 'sectoral' || input.strike === 'general' || high(input.parliamentUnrest, THRESHOLDS.unrest, true, has('chamber'))) out.push('chamber');
  if (input.iaea === 'noncompliant' || input.iaea === 'referred' || input.iaea === 'sanctioned') out.push('iaea');
  return out;
}

/** One pressure is tension; two or more is a crisis; a war overrides both. */
export function moodFor(input: MoodInput, previous: readonly Pressure[] = []): { mood: AmbientMood; pressures: Pressure[] } {
  if (input.atWar) return { mood: 'war', pressures: pressures(input, previous) };
  const list = pressures(input, previous);
  return { mood: list.length >= 2 ? 'crisis' : list.length === 1 ? 'tension' : 'peace', pressures: list };
}

/** How dark the mood is, 0 to 3; used to decide whether a change is worth a cue. */
export const moodRank = (m: AmbientMood) => MOODS.indexOf(m);

import type { TacticalAction, TacticalRoundEvent, TacticalSide, TacticalUnit } from '../domain/tactical';

/**
 * Phase 5 (0.90.0-playtest.14): presentation of resolved battle rounds.
 *
 * Pure functions of a recorded `TacticalRoundEvent`. They never resolve combat, never touch `GameState` and never use
 * randomness or the clock, so showing, summarising or skipping effects cannot change casualties, fuel or the RNG.
 * Every effect and sound cue carries a stable id (war, round, step) so the audio service plays it at most once.
 */

/** Sound files in public/assets/audio (see docs/ASSET_MANIFEST.md). */
export type SoundCue =
  | 'ui-click' | 'ui-confirm' | 'war-alarm' | 'radio-chirp' | 'artillery-fire' | 'impact' | 'impact-distant' | 'capture' | 'unit-lost';
export type AmbientTrack = 'ambient-command' | 'ambient-war';
export type SoundChannel = 'ui' | 'war' | 'ambient';
export const CUE_CHANNEL: Record<SoundCue, SoundChannel> = {
  'ui-click': 'ui', 'ui-confirm': 'ui', 'war-alarm': 'war', 'radio-chirp': 'war', 'artillery-fire': 'war', impact: 'war',
  'impact-distant': 'war', capture: 'war', 'unit-lost': 'war',
};

export type EffectKind = 'move' | 'blocked' | 'bombard' | 'recon' | 'casualties' | 'lost' | 'capture' | 'contest' | 'defend' | 'reserve';
export interface BattleEffect {
  /** `${warId}:${round}:${step}` — stable across replays, saves and reloads. */
  id: string;
  step: number;
  kind: EffectKind;
  side: TacticalSide;
  /** Board cells: where the effect starts and where it lands (same cell for in-place effects). */
  from: number | undefined;
  to: number | undefined;
  hit?: boolean;
  amount?: number;
  sounds: SoundCue[];
}

const cellOf = (units: readonly TacticalUnit[], id?: string) => units.find((u) => u.id === id)?.cell;

/** Sound cues of one recorded action. Movement and stance changes are silent; the radio covers the round. */
export function actionSounds(action: TacticalAction): SoundCue[] {
  switch (action.kind) {
    case 'bombard': return ['artillery-fire', action.hit ? 'impact' : 'impact-distant'];
    case 'lost': return ['unit-lost'];
    case 'capture': return ['capture'];
    default: return [];
  }
}

/**
 * The effect drawn for step `step` (1-based, as in tacticalPlayback). `units` are the units before that step, used
 * only to find where an in-place action happens.
 */
export function effectAt(warId: string, event: TacticalRoundEvent, step: number, units: readonly TacticalUnit[]): BattleEffect | null {
  const action = event.actions[step - 1];
  if (!action) return null;
  const own = cellOf(units, action.unitId) ?? cellOf(event.beforeUnits, action.unitId);
  let from: number | undefined = own, to: number | undefined = own;
  switch (action.kind) {
    case 'move': case 'blocked': from = action.from ?? own; to = action.to; break;
    case 'bombard': case 'recon': to = action.target; break;
    case 'capture': case 'contest': from = to = action.objective; break;
  }
  return { id: `${warId}:${event.round}:${step}`, step, kind: action.kind as EffectKind, side: action.side, from, to, hit: action.hit, amount: action.amount, sounds: actionSounds(action) };
}

export interface RoundSummary {
  id: string;
  moves: number;
  bombardments: number;
  hits: number;
  captures: Record<TacticalSide, number>;
  groupsLost: Record<TacticalSide, number>;
  personnelLost: Record<TacticalSide, number>;
  frontChange: number;
  /** At most two cues for the whole round, most significant first. */
  sounds: SoundCue[];
}

/** One summary for a whole round, used when effects are summarised (fast playback, low effects, reduced motion). */
export function summarizeRound(warId: string, event: TacticalRoundEvent): RoundSummary {
  const by = (kind: TacticalAction['kind']) => event.actions.filter((a) => a.kind === kind);
  const count = (kind: TacticalAction['kind'], side: TacticalSide) => by(kind).filter((a) => a.side === side).length;
  const captures = { attacker: count('capture', 'attacker'), defender: count('capture', 'defender') };
  const groupsLost = { attacker: count('lost', 'attacker'), defender: count('lost', 'defender') };
  const bombards = by('bombard');
  const sounds: SoundCue[] = [];
  if (captures.attacker + captures.defender > 0) sounds.push('capture');
  else if (groupsLost.attacker + groupsLost.defender > 0) sounds.push('unit-lost');
  if (bombards.length) sounds.push(bombards.some((a) => a.hit) ? 'impact' : 'impact-distant');
  sounds.push('radio-chirp');
  return {
    id: `${warId}:${event.round}:summary`,
    moves: by('move').length,
    bombardments: bombards.length,
    hits: bombards.filter((a) => a.hit).length,
    captures, groupsLost,
    personnelLost: { attacker: event.attackerLosses.personnel, defender: event.defenderLosses.personnel },
    frontChange: event.progressAfter - event.progressBefore,
    sounds: sounds.slice(0, 2),
  };
}

export interface EffectOptions {
  /** Playback speed multiplier (1, 2, 4). */
  playbackSpeed: number;
  /** Campaign clock speed (0–4; 4 is 5×). */
  campaignSpeed?: number;
  lowEffects: boolean;
  reducedMotion: boolean;
}
/** Fast playback, a 5× campaign clock, low effects or reduced motion show one summary instead of every step. */
export const PLAYBACK_SUMMARY_SPEED = 4;
export const CAMPAIGN_SUMMARY_SPEED = 4;
export function shouldSummarize(o: EffectOptions): boolean {
  return o.reducedMotion || o.lowEffects || o.playbackSpeed >= PLAYBACK_SUMMARY_SPEED || (o.campaignSpeed ?? 0) >= CAMPAIGN_SUMMARY_SPEED;
}

/** Cue for a newly resolved round when it is not replayed step by step: the radio report. */
export const roundReportCue = (warId: string, round: number) => ({ id: `${warId}:${round}:report`, cue: 'radio-chirp' as SoundCue });
/** Cue for a war that involves the player, once per war. */
export const warAlarmCue = (warId: string) => ({ id: `${warId}:declared`, cue: 'war-alarm' as SoundCue });

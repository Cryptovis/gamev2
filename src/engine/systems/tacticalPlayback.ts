import type { TacticalAction, TacticalRoundEvent, TacticalUnit } from '../../domain/tactical';

/**
 * HD War playback (0.86). Playback only replays a recorded round's action timeline; it never resolves combat,
 * so watching, pausing or skipping cannot change casualties.
 */

/** Steps in a recorded round. Rounds migrated from 0.83/0.84 have no timeline and play as a single step. */
export function playbackFrames(event: TacticalRoundEvent): number {
  return Math.max(1, event.actions.length);
}

/** Units after the first `step` actions. The final step is exactly the recorded result. */
export function playbackUnits(event: TacticalRoundEvent, step: number): TacticalUnit[] {
  if (step >= playbackFrames(event)) return event.units;
  const units = event.beforeUnits.map(u => ({ ...u }));
  for (const action of event.actions.slice(0, Math.max(0, step))) {
    const unit = units.find(u => u.id === action.unitId);
    if (!unit) continue;
    if (action.kind === 'move' && action.to !== undefined) unit.cell = action.to;
    if (action.kind === 'casualties') unit.remaining = Math.max(0, unit.remaining - (action.amount ?? 0));
    if (action.kind === 'lost') unit.remaining = 0;
  }
  return units;
}

/** The action applied by `step` (the one to highlight), if any. */
export function playbackAction(event: TacticalRoundEvent, step: number): TacticalAction | undefined {
  return step > 0 ? event.actions[step - 1] : undefined;
}

/** Board cell where an action's effect is drawn. */
export function actionCell(action: TacticalAction, units: TacticalUnit[]): number | undefined {
  switch (action.kind) {
    case 'move': case 'blocked': return action.to;
    case 'bombard': case 'recon': return action.target;
    case 'capture': case 'contest': return action.objective;
    default: return units.find(u => u.id === action.unitId)?.cell;
  }
}

export const PLAYBACK_STEP_MS = 750;
export const PLAYBACK_SPEEDS: readonly number[] = [1, 2, 4];

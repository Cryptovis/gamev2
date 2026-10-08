import type { GameState } from '../domain/game';
import { useGameStore } from '../store/gameStore';

/**
 * Builds the write for one autosave checkpoint. It captures the intended campaign and day,
 * not whichever state is current after the async import.
 * Kept out of useAutosave.ts: vite.config.ts serves that file without the TypeScript transform
 * (StackBlitz workaround), so it must stay free of TypeScript-only syntax.
 */
export const autosaveWrite = (snapshot: GameState, owner: string) => async () => {
  const { saveGame, autosaveId } = await import('../persistence/saveGame');
  if (useGameStore.getState().world.campaignId !== snapshot.world.campaignId) throw new Error('Autosave checkpoint superseded');
  await saveGame(snapshot, autosaveId(snapshot.world.campaignId), `Autosave · Day ${snapshot.day}`, owner);
};

import type { GameSpeed } from "../domain/game";

export const TICK_INTERVAL_BY_SPEED: Record<GameSpeed, number | null> = {
  0: null,
  1: 15_000,
  2: 7_000,
  3: 3_000,
  5: 1_000,
};

export const campaignInterval = (
  speed: GameSpeed,
  autoWar = false,
  blocked = false,
  tutorial = false,
): number | null =>
  blocked || tutorial || speed === 0
    ? null
    : autoWar
      ? 2000
      : TICK_INTERVAL_BY_SPEED[speed];
export const getTickIntervalMs = (speed: GameSpeed) =>
  TICK_INTERVAL_BY_SPEED[speed];

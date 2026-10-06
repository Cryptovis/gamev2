import type { GameSpeed } from '../domain/game';

export const TICK_INTERVAL_BY_SPEED: Record<GameSpeed, number | null> = {
  0: null,
  1: 15_000,
  2: 7_000,
  3: 3_000,
  5: 1_000,
};

export const getTickIntervalMs = (speed: GameSpeed) => TICK_INTERVAL_BY_SPEED[speed];

import { describe, expect, it } from 'vitest';
import { getTickIntervalMs } from '../engine/clock';

describe('game clock', () => {
  it('keeps pause deterministic', () => expect(getTickIntervalMs(0)).toBeNull());
  it('uses the modern grand-strategy pacing', () => {
    expect(getTickIntervalMs(1)).toBe(15_000);
    expect(getTickIntervalMs(2)).toBe(7_000);
    expect(getTickIntervalMs(3)).toBe(3_000);
    expect(getTickIntervalMs(5)).toBe(1_000);
  });
});

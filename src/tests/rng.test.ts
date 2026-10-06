import { describe, expect, it } from 'vitest';
import { nextRandom } from '../engine/rng';

describe('deterministic rng', () => {
  it('replays the same sequence from the same seed', () => {
    const a = nextRandom(123456);
    const b = nextRandom(123456);
    expect(a).toEqual(b);
  });
});

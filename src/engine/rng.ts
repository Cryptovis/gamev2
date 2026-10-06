/**
 * Tiny deterministic PRNG scaffold for future events, AI and combat.
 * Keeping randomness seed-driven makes saves/replays testable and multiplayer-ready.
 */
export function nextRandom(seed: number): { seed: number; value: number } {
  const nextSeed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return { seed: nextSeed, value: nextSeed / 0x1_0000_0000 };
}

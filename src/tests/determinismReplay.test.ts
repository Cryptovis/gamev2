// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import {beforeAll, describe, expect, it} from 'vitest';
import {makeInitialState} from '../data/initialState';
import type {GameState} from '../domain/game';
import {compareIds, sortedEntries, sortedKeys, sortedValues} from '../engine/order';
import {db} from '../persistence/database';
import {migrateSave} from '../persistence/migrations';
import {loadSave, saveGame} from '../persistence/saveGame';
import {snapshotGame} from '../persistence/snapshot';
import {firstDifferences, reverseKeyOrder, runDays} from './headlessRun';

/**
 * Phase 9 / Stage 1b.1: the game must end in exactly the same state however it got there.
 * Comparison is on snapshotGame() (everything a save keeps) and is exact: a last-bit float difference
 * is a failure, because it compounds into different seeded-random branches later.
 */
const DAYS = 120, HALF = 60, LEGACY_DAYS = 30;
const same = (actual: GameState, expected: GameState) => expect(firstDifferences(snapshotGame(actual), snapshotGame(expected))).toEqual([]);

let atHalf: GameState, continuous: GameState;
beforeAll(() => {
  atHalf = runDays(makeInitialState(), HALF);
  continuous = runDays(atHalf, DAYS - HALF);
}, 120_000);

describe('replay determinism (120 headless days, default campaign)', () => {
  it('1. two independent continuous runs end in exactly the same state', () => {
    same(runDays(makeInitialState(), DAYS), continuous);
    expect(continuous.day).toBe(DAYS + 1);
  }, 60_000);

  it('2. saving at day 60 and loading through the real save chain changes nothing', async () => {
    const record = await saveGame(atHalf, 'determinism-replay', 'Determinism replay', 'guest');
    try {
      const loaded = await loadSave('determinism-replay');
      expect(loaded).not.toBeNull();
      same(runDays(loaded!, DAYS - HALF), continuous);
    } finally {
      await db.saves.delete(record.id);
    }
  }, 60_000);

  it('3. a JSON export/import round-trip at day 60 changes nothing', () => {
    const imported = migrateSave(JSON.parse(JSON.stringify(snapshotGame(atHalf))));
    expect(imported).not.toBeNull();
    same(runDays(imported!, DAYS - HALF), continuous);
  }, 60_000);

  it('4a. reversing key order really reverses it (so test 4 cannot pass vacuously)', () => {
    const reversed = reverseKeyOrder(snapshotGame(atHalf));
    expect(Object.keys(reversed.countries)).toEqual(Object.keys(atHalf.countries).reverse());
    expect(Object.keys(reversed.world)).toEqual(Object.keys(atHalf.world).reverse());
    expect(firstDifferences(reversed, snapshotGame(atHalf))).toEqual([]);
  });

  /**
   * KNOWN FAILURE (Stage 1b.1 stop rule): the simulation is not key-order invariant.
   * Measured at abc862c, reversing every map's key order at day 0 and stepping both runs side by side:
   *   - tick 1  diverges: world.commodities.baseline.* (float sums over countries; worldSupply() walks
   *             activeCountries(), which iterates Object.values(countries)).
   *   - after sorting activeCountries(), tick 6 diverges: world.living.listings[*].unitPrice
   *             (industrialMarket.industrialPrice sums Object.keys(countries).reduce(...)).
   * Each fix moves the first divergence only a few days later. A static survey finds ~106 candidate
   * sites in ~46 engine files, far past the 15-site stop rule, and the starting country order is not sorted
   * (AFG, ALB, DZA, AGO, ...), so canonicalising on sorted ids would change every trajectory. That is a
   * design decision for Stage 1b follow-ups, not a local fix. When the engine becomes order-invariant this
   * test starts passing, vitest reports "expected to fail", and `.fails` must be removed.
   */
  it.fails('4. KNOWN FAILURE: reversing every map\'s key order at day 60 changes nothing', () => {
    const reversed = {...atHalf, ...reverseKeyOrder(snapshotGame(atHalf))};
    same(runDays(reversed, DAYS - HALF), continuous);
  }, 60_000);

  it('5. a Schema 12 save migrated twice and run 30 days ends in exactly the same state', () => {
    // Same recipe as organizationMigration099.test.ts: a fresh snapshot downgraded to the Schema 12 shape.
    const legacy12 = (): GameState => {
      const s: Partial<GameState> = snapshotGame(makeInitialState());
      s.schemaVersion = 12;
      delete s.industrialEconomy;
      delete s.industrialContracts;
      delete s.leadership;
      delete s.world;
      return s as GameState;
    };
    const first = migrateSave(legacy12()), second = migrateSave(legacy12());
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    const a = runDays(first!, LEGACY_DAYS), b = runDays(second!, LEGACY_DAYS);
    same(a, b);
    expect(a.day).toBe(first!.day + LEGACY_DAYS);
  }, 60_000);
});

describe('src/engine/order.ts', () => {
  const record = {b: 2, a: 1, B: 3, '10': 4, '9': 5, é: 6};
  it('orders ids by code unit, independent of insertion order and locale', () => {
    expect(sortedKeys(record)).toEqual(['10', '9', 'B', 'a', 'b', 'é']);
    expect(sortedKeys(reverseKeyOrder(record))).toEqual(sortedKeys(record));
    expect(['é', 'e', 'z'].sort(compareIds)).toEqual(['e', 'z', 'é']);
  });
  it('returns entries and values in the same canonical order without touching the input', () => {
    const before = Object.keys(record);
    expect(sortedEntries(record).map(([key]) => key)).toEqual(sortedKeys(record));
    expect(sortedValues(record)).toEqual([4, 5, 3, 1, 2, 6]);
    expect(Object.keys(record)).toEqual(before);
  });
});

import {describe, expect, it} from 'vitest';
import * as det from '../engine/detMath';
import {UNARY_NAMES, powInputs, ulpDistance, unaryInputs, type UnaryName} from './detMathCorpus';

/**
 * Stage 1b.2: detMath is a pure-JavaScript fdlibm 5.3 port. V8 ports the same code, so on V8 the results must be
 * bit-identical to the native functions (Object.is, so -0 and the last bit both count). That is what lets the engine
 * move to detMath without changing any V8 trajectory, while JavaScriptCore now returns the same bits too.
 */
const same = (a: number, b: number) => Object.is(a, b) || (Number.isNaN(a) && Number.isNaN(b));

describe.each(UNARY_NAMES)('detMath.%s is bit-identical to the native function on V8', (name: UnaryName) => {
  it('matches on edge values, realistic arguments and the whole finite range', () => {
    const native = Math[name] as (x: number) => number;
    const inputs = unaryInputs(name);
    const bad = inputs.filter(x => !same(det[name](x), native(x))).slice(0, 5).map(x => `${name}(${x}): ${det[name](x)} vs ${native(x)}`);
    expect(inputs.length).toBeGreaterThan(4000);
    expect(bad).toEqual([]);
  });
});

describe('detMath.pow', () => {
  /**
   * Measured against Node 22 (V8 12.4): the fdlibm pow differs from the native Math.pow in the last bit on about 4% of
   * inputs, so the engine's pow call sites are NOT migrated yet (migrating them would shift V8 trajectories).
   * This test pins the port to within 1 ulp and reports the mismatch rate.
   */
  it('is within 1 ulp of the native pow and exact on every special value', () => {
    const pairs = powInputs();
    let mismatches = 0, worst = 0;
    for (const [x, y] of pairs) {
      const mine = det.pow(x, y), native = Math.pow(x, y);
      if (same(mine, native)) continue;
      mismatches++;
      worst = Math.max(worst, ulpDistance(mine, native));
      if (!Number.isFinite(mine) || !Number.isFinite(native)) expect({x, y, mine}).toEqual({x, y, mine: native});
    }
    console.info(`detMath.pow vs native pow: ${mismatches}/${pairs.length} last-bit mismatches (${((100 * mismatches) / pairs.length).toFixed(2)}%), worst ${worst} ulp`);
    expect(worst).toBeLessThanOrEqual(1);
  });
  it('is exact for the integer-exponent and half-power shortcuts', () => {
    for (const x of [0, 0.25, 1, 1.5, 3, 7.25, 1e10]) {
      expect(det.pow(x, 2)).toBe(x * x);
      expect(det.pow(x, 0.5)).toBe(Math.sqrt(x));
    }
    expect(det.pow(-8, 3)).toBe(-512);
    expect(det.pow(-8, 2)).toBe(64);
    expect(det.pow(-8, 0.5)).toBeNaN();
    expect(det.pow(1, Infinity)).toBeNaN();
  });
});

describe('detMath special values', () => {
  it('follows the IEEE/JavaScript conventions', () => {
    expect(det.exp(-Infinity)).toBe(0);
    expect(det.exp(Infinity)).toBe(Infinity);
    expect(det.exp(710)).toBe(Infinity);
    expect(det.exp(-746)).toBe(0);
    expect(det.log(0)).toBe(-Infinity);
    expect(det.log(-1)).toBeNaN();
    expect(det.log10(1000)).toBe(3);
    expect(Object.is(det.sin(-0), -0)).toBe(true);
    expect(det.sin(Infinity)).toBeNaN();
    expect(det.cos(NaN)).toBeNaN();
    expect(det.asin(2)).toBeNaN();
    expect(det.asin(1)).toBe(Math.PI / 2);
  });
  it('reduces arguments far beyond 2^20*pi/2 with the full Payne-Hanek path', () => {
    for (const x of [1e6, 1e9, 1e15, 1e22, 1e100, 1e300, Number.MAX_VALUE]) {
      expect(det.sin(x)).toBe(Math.sin(x));
      expect(det.cos(-x)).toBe(Math.cos(-x));
    }
  });
});

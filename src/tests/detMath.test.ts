import {describe, expect, it} from 'vitest';
import * as det from '../engine/detMath';
import {detMathCorpusHash} from './crossEngineProbe';
import {UNARY_NAMES, powInputs, ulpDistance, unaryInputs, type UnaryName} from './detMathCorpus';

/**
 * detMath is its own reference. A pure-JavaScript fdlibm 5.3 port returns the same bits in every engine, so the contract
 * is a golden hash of its outputs over a seeded corpus (also checked in Chromium and WebKit by
 * e2e/crossEngineDeterminism.spec.ts). Native Math.* is only a sanity bound: a platform may round a native function
 * differently in the last bit, which is exactly why the engine no longer uses them.
 */
const GOLDEN_CORPUS_HASH = 'e0c61d5eaa86c6aa937e997fb23f9466bf35698f9a5e5002723f11b9b59ecce1';
const same = (a: number, b: number) => Object.is(a, b) || (Number.isNaN(a) && Number.isNaN(b));

describe('detMath golden pin', () => {
  it('returns exactly the committed bits over the seeded corpus (change only with the corpus or the algorithm)', async () => {
    expect(await detMathCorpusHash()).toBe(GOLDEN_CORPUS_HASH);
  });
});

describe.each(UNARY_NAMES)('detMath.%s stays within 1 ulp of the native function', (name: UnaryName) => {
  it('is exact on special values and within 1 ulp everywhere else', () => {
    const native = Math[name] as (x: number) => number;
    const inputs = unaryInputs(name);
    let mismatches = 0, worst = 0;
    for (const x of inputs) {
      const mine = det[name](x), ref = native(x);
      if (same(mine, ref)) continue;
      mismatches++;
      worst = Math.max(worst, ulpDistance(mine, ref));
      if (!Number.isFinite(mine) || !Number.isFinite(ref) || mine === 0 || ref === 0) expect({x, mine}).toEqual({x, mine: ref});
    }
    console.info(`detMath.${name} vs native: ${mismatches}/${inputs.length} last-bit mismatches, worst ${worst} ulp`);
    expect(inputs.length).toBeGreaterThan(4000);
    expect(worst).toBeLessThanOrEqual(1);
  });
});

describe('detMath.pow', () => {
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
      expect(ulpDistance(det.sin(x), Math.sin(x))).toBeLessThanOrEqual(1);
      expect(ulpDistance(det.cos(-x), Math.cos(-x))).toBeLessThanOrEqual(1);
    }
  });
});

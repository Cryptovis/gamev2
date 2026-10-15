import {describe, expect, it} from 'vitest';
import {countRiskyMath} from './engineMathCounts';

/**
 * Ratchet: the engine may only ever use fewer cross-engine-risky math calls, never more.
 * Stage 1b.1 measured 29 Math.* calls and 6 `**` operators. Stage 1b.2 moved every exp/log/log10/sin/cos/asin site to
 * src/engine/detMath.ts and turned `x ** 2` into `x * x`. What remains is pow, which is held back until it can be replaced
 * without shifting V8 trajectories; as each file reaches zero, delete its line here.
 * Paths are relative to src/engine/.
 */
const MATH_BASELINE: Record<string, number> = {
  // Math.pow sites held back in Stage 1b.2: Node's pow is not bit-identical to fdlibm 5.3 (see detMath.test.ts).
  'systems/commodityExchange.ts': 4,
  'systems/warfare.ts': 1,
  'systems/tacticalPlanner.ts': 1,
};
const POWER_BASELINE: Record<string, number> = {
  'systems/factions.ts': 1,
  'systems/policyPressure.ts': 1,
};
const total = (baseline: Record<string, number>) => Object.values(baseline).reduce((sum, n) => sum + n, 0);

const sources = import.meta.glob<string>('../engine/**/*.ts', {query: '?raw', import: 'default', eager: true});
const counts = Object.entries(sources).map(([path, source]) => ({file: path.replace('../engine/', ''), ...countRiskyMath(source)}));

describe('engine math ratchet (cross-engine determinism)', () => {
  it('reads the engine sources', () => {
    expect(counts.length).toBeGreaterThan(50);
    expect(counts.map(c => c.file)).toContain('tick.ts');
  });

  it('records the baseline: only the 6 pow-dependent Math.* calls and 2 ** operators remain', () => {
    expect(total(MATH_BASELINE)).toBe(6);
    expect(total(POWER_BASELINE)).toBe(2);
  });

  it('detMath.ts itself uses no risky native function', () => {
    expect(counts.find(c => c.file === 'detMath.ts')).toMatchObject({math: 0, power: 0});
  });

  it('no engine file uses more risky Math.* calls than its baseline, and no new file uses any', () => {
    const over = counts.filter(c => c.math > (MATH_BASELINE[c.file] ?? 0)).map(c => `${c.file}: ${c.math} Math.* calls, baseline ${MATH_BASELINE[c.file] ?? 0}`);
    expect(over).toEqual([]);
  });

  it('no engine file uses more ** operators than its baseline, and no new file uses any', () => {
    const over = counts.filter(c => c.power > (POWER_BASELINE[c.file] ?? 0)).map(c => `${c.file}: ${c.power} ** operators, baseline ${POWER_BASELINE[c.file] ?? 0}`);
    expect(over).toEqual([]);
  });

  it('every baseline entry still names an engine file', () => {
    const files = new Set(counts.map(c => c.file));
    expect([...Object.keys(MATH_BASELINE), ...Object.keys(POWER_BASELINE)].filter(file => !files.has(file))).toEqual([]);
  });

  it('asks for the baseline to be lowered when calls were removed (never fails)', () => {
    const lowered = counts.flatMap(c => [
      ...(c.math < (MATH_BASELINE[c.file] ?? 0) ? [`${c.file}: Math.* ${c.math} < baseline ${MATH_BASELINE[c.file]}`] : []),
      ...(c.power < (POWER_BASELINE[c.file] ?? 0) ? [`${c.file}: ** ${c.power} < baseline ${POWER_BASELINE[c.file]}`] : []),
    ]);
    if (lowered.length) console.warn(`Engine math ratchet: lower these baselines in engineMathRatchet.test.ts:\n${lowered.join('\n')}`);
    expect(true).toBe(true);
  });
});

describe('countRiskyMath', () => {
  it('counts every risky Math function and the power operator', () => {
    const code = 'Math.pow(a,2); Math.exp(x); Math.log(x); Math.log10(x); Math.sin(x); Math.cos(x); Math.atan2(y,x); Math.hypot(a,b); Math.cbrt(x); y = x ** 2; y **= 3;';
    expect(countRiskyMath(code)).toEqual({math: 9, power: 2});
  });
  it('ignores functions IEEE-754 pins exactly', () => {
    expect(countRiskyMath('Math.sqrt(x); Math.min(a,b); Math.max(a,b); Math.floor(x); Math.round(x); Math.abs(x); Math.imul(a,b); Math.trunc(x);')).toEqual({math: 0, power: 0});
  });
  it('ignores line comments, block comments and JSDoc, but not URLs in code', () => {
    const code = ['// Math.exp(x) and 2 ** 3', '/** Math.pow(a,b)', ' * uses ** here */', 'const url = "https://example.com"; /* Math.sin(x) */', 'const y = Math.exp(1); // Math.log(1)'].join('\n');
    expect(countRiskyMath(code)).toEqual({math: 1, power: 0});
  });
});

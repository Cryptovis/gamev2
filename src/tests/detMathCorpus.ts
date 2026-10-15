import {nextRandom} from '../engine/rng';

/** Seeded input corpora for src/engine/detMath.ts, shared by the unit test and the cross-engine probe. */
export const UNARY_NAMES = ['exp', 'log', 'log10', 'sin', 'cos', 'asin'] as const;
export type UnaryName = (typeof UNARY_NAMES)[number];

const view = new DataView(new ArrayBuffer(8));
export const bitsOf = (x: number): string => { view.setFloat64(0, x); return view.getUint32(0).toString(16).padStart(8, '0') + view.getUint32(4).toString(16).padStart(8, '0'); };
/** Distance in units in the last place between two finite doubles; Infinity if either is not finite. */
export function ulpDistance(a: number, b: number): number {
  if (Object.is(a, b)) return 0;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Infinity;
  const ordered = (x: number) => { view.setFloat64(0, x); const n = view.getBigUint64(0); return n >> 63n ? -(n & ((1n << 63n) - 1n)) : n; };
  const d = ordered(a) - ordered(b);
  return Number(d < 0n ? -d : d);
}

const stream = (seed: number) => { let s = seed; return () => { const r = nextRandom(s); s = r.seed; return r.value; }; };
/** A random finite double over the whole exponent range, both signs. */
const anyFinite = (rnd: () => number): number => {
  view.setUint32(0, Math.floor(rnd() * 0x7ff00000) >>> 0);
  view.setUint32(4, Math.floor(rnd() * 0x100000000) >>> 0);
  const x = view.getFloat64(0);
  return rnd() < 0.5 ? -x : x;
};
const EDGE = [0, -0, Infinity, -Infinity, NaN, Number.MIN_VALUE, -Number.MIN_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE, 1, -1, 1 + Number.EPSILON, 1 - Number.EPSILON, 0.5, 2, 10, Math.PI, -Math.PI, Math.PI / 2, Math.PI / 4, 3 * Math.PI / 4, 709.78, -745.2, 2 ** -1022, 2 ** -1074 * 3];
const REALISTIC: Record<UnaryName, (rnd: () => number) => number> = {
  exp: rnd => rnd() * 40 - 20,
  log: rnd => rnd() * 1e4 + 1e-9,
  log10: rnd => rnd() * 1e12 + 1e-9,
  sin: rnd => rnd() * 2 * Math.PI * 1000,
  cos: rnd => rnd() * 2 * Math.PI * 1000,
  asin: rnd => rnd() * 2 - 1,
};

export const SAMPLES = 2000;

export function unaryInputs(name: UnaryName): number[] {
  const rnd = stream(0x5eed + UNARY_NAMES.indexOf(name));
  const huge = name === 'sin' || name === 'cos' ? Array.from({length: 500}, () => rnd() * 2 ** Math.floor(rnd() * 1000)) : [];
  return [...EDGE, ...Array.from({length: SAMPLES}, () => REALISTIC[name](rnd)), ...Array.from({length: SAMPLES}, () => anyFinite(rnd)), ...huge];
}

export function powInputs(): Array<[number, number]> {
  const rnd = stream(0xb0b);
  const pairs: Array<[number, number]> = [];
  for (const a of EDGE) for (const b of EDGE) pairs.push([a, b]);
  for (let i = 0; i < SAMPLES; i++) pairs.push([rnd() * 10, rnd() * 6 - 3]);
  for (let i = 0; i < SAMPLES; i++) pairs.push([anyFinite(rnd), anyFinite(rnd)]);
  // The engine's real argument shapes.
  for (let i = 0; i < SAMPLES; i++) pairs.push([0.5, (rnd() * 400) / (1 + Math.floor(rnd() * 60))]); // half-life decay
  for (let i = 0; i < SAMPLES; i++) pairs.push([rnd() * 5 + 0.01, -rnd() * 2]); // x ** -elasticity
  for (let i = 0; i < SAMPLES; i++) pairs.push([rnd() * 3 + 0.01, rnd() * 1.5]); // ratio ** elasticity
  for (let n = 0; n < 60; n++) pairs.push([0.6, n]); // 0.6 ** streak
  return pairs;
}

/*
 * Deterministic elementary functions for the simulation.
 *
 * IEEE-754 fixes the result of + - * / and sqrt exactly, but the exp, log, pow, sin, cos and asin that a JavaScript
 * engine ships may round differently in the last bit (V8 uses fdlibm ports, JavaScriptCore the platform libm).
 * A last-bit difference compounds through a seeded simulation into a different game. This module is a pure
 * JavaScript port of Sun's fdlibm 5.3, which V8 itself ports, built from + - * / Math.sqrt Math.abs Math.floor
 * and one Float64Array/Int32Array pair for the exponent/mantissa words, so every engine returns the same bits.
 *
 * Ported from fdlibm 5.3: e_exp.c, e_log.c, e_log10.c, e_pow.c, e_asin.c, s_sin.c, s_cos.c, k_sin.c, k_cos.c,
 * e_rem_pio2.c, k_rem_pio2.c (precision 2 only, which is all e_rem_pio2.c uses) and s_scalbn.c.
 * Where V8 deviates from fdlibm 5.3 (exp scales by multiplying a power of two) this follows V8, so the results
 * also match Node and Chrome. The arguments are never narrowed: huge arguments take the full Payne-Hanek path.
 *
 * ====================================================
 * Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
 *
 * Developed at SunSoft, a Sun Microsystems, Inc. business.
 * Permission to use, copy, modify, and distribute this
 * software is freely granted, provided that this notice
 * is preserved.
 * ====================================================
 *
 * Do not call the engine's native transcendental functions in this file; src/tests/engineMathRatchet.test.ts
 * counts them and requires zero.
 */

// ---- word access --------------------------------------------------------------------------------------------
const buf = new Float64Array(1);
const words = new Int32Array(buf.buffer);
buf[0] = 1;
if (words[1] !== 0x3ff00000 || words[0] !== 0) throw new Error('detMath: little-endian word order required');
const HI = 1, LO = 0;

const hiWord = (x: number): number => { buf[0] = x; return words[HI]; };
const loWord = (x: number): number => { buf[0] = x; return words[LO] >>> 0; };
const setHi = (x: number, hi: number): number => { buf[0] = x; words[HI] = hi; return buf[0]; };
const setLo = (x: number, lo: number): number => { buf[0] = x; words[LO] = lo; return buf[0]; };
const fromWords = (hi: number, lo: number): number => { words[HI] = hi; words[LO] = lo; return buf[0]; };

// ---- scalbn (s_scalbn.c) ------------------------------------------------------------------------------------
const TWO54 = 1.80143985094819840000e+16, TWOM54 = 5.55111512312578270212e-17, HUGE = 1.0e+300, TINY = 1.0e-300;

function scalbn(x: number, n: number): number {
  let hx = hiWord(x);
  const lx = loWord(x);
  let k = (hx & 0x7ff00000) >> 20;
  if (k === 0) {
    if ((lx | (hx & 0x7fffffff)) === 0) return x;
    x *= TWO54;
    hx = hiWord(x);
    k = ((hx & 0x7ff00000) >> 20) - 54;
    if (n < -50000) return TINY * x;
  }
  if (k === 0x7ff) return x + x;
  k += n;
  if (k > 0x7fe) return HUGE * (hx < 0 ? -HUGE : HUGE);
  if (k > 0) return setHi(x, (hx & 0x800fffff) | (k << 20));
  if (k <= -54) return n > 50000 ? HUGE * (hx < 0 ? -HUGE : HUGE) : TINY * (hx < 0 ? -TINY : TINY);
  k += 54;
  return setHi(x, (hx & 0x800fffff) | (k << 20)) * TWOM54;
}

// ---- exp (e_exp.c, V8 scaling) ------------------------------------------------------------------------------
const O_THRESHOLD = 7.09782712893383973096e+02, U_THRESHOLD = -7.45133219101941108420e+02, TWOM1000 = 9.33263618503218878990e-302;
const LN2_HI = [6.93147180369123816490e-01, -6.93147180369123816490e-01], LN2_LO = [1.90821492927058770002e-10, -1.90821492927058770002e-10];
const INVLN2 = 1.44269504088896338700e+00, TWO1023 = 8.98846567431158e+307;
const EP1 = 1.66666666666666019037e-01, EP2 = -2.77777777770155933842e-03, EP3 = 6.61375632143793436117e-05;
const EP4 = -1.65339022054652515390e-06, EP5 = 4.13813679705723846039e-08;

export function exp(x: number): number {
  if (x === 1) return 2.718281828459045; // V8 returns Math.E exactly; fdlibm is 1 ulp off here
  let hx = hiWord(x);
  const xsb = (hx >>> 31) & 1;
  hx &= 0x7fffffff;
  if (hx >= 0x40862e42) {
    if (hx >= 0x7ff00000) {
      if (((hx & 0xfffff) | loWord(x)) !== 0) return x + x;
      return xsb === 0 ? x : 0;
    }
    if (x > O_THRESHOLD) return HUGE * HUGE;
    if (x < U_THRESHOLD) return TWOM1000 * TWOM1000;
  }
  let hi = 0, lo = 0, k = 0;
  if (hx > 0x3fd62e42) {
    if (hx < 0x3ff0a2b2) {
      hi = x - LN2_HI[xsb]; lo = LN2_LO[xsb]; k = 1 - xsb - xsb;
    } else {
      k = (INVLN2 * x + (xsb === 0 ? 0.5 : -0.5)) | 0;
      const t = k;
      hi = x - t * LN2_HI[0];
      lo = t * LN2_LO[0];
    }
    x = hi - lo;
  } else if (hx < 0x3e300000) {
    if (HUGE + x > 1) return 1 + x;
  }
  const t = x * x;
  const twopk = k >= -1021 ? fromWords(0x3ff00000 + (k << 20), 0) : fromWords(0x3ff00000 + ((k + 1000) << 20), 0);
  const c = x - t * (EP1 + t * (EP2 + t * (EP3 + t * (EP4 + t * EP5))));
  if (k === 0) return 1 - ((x * c) / (c - 2) - x);
  const y = 1 - ((lo - (x * c) / (2 - c)) - hi);
  if (k >= -1021) return k === 1024 ? y * 2 * TWO1023 : y * twopk;
  return y * twopk * TWOM1000;
}

// ---- log (e_log.c) ------------------------------------------------------------------------------------------
const LN2_HI_L = 6.93147180369123816490e-01, LN2_LO_L = 1.90821492927058770002e-10;
const LG1 = 6.666666666666735130e-01, LG2 = 3.999999999940941908e-01, LG3 = 2.857142874366239149e-01, LG4 = 2.222219843214978396e-01;
const LG5 = 1.818357216161805012e-01, LG6 = 1.531383769920937332e-01, LG7 = 1.479819860511658591e-01;

export function log(x: number): number {
  let hx = hiWord(x);
  const lx = loWord(x);
  let k = 0;
  if (hx < 0x00100000) {
    if (((hx & 0x7fffffff) | lx) === 0) return -Infinity;
    if (hx < 0) return NaN;
    k -= 54; x *= TWO54;
    hx = hiWord(x);
  }
  if (hx >= 0x7ff00000) return x + x;
  k += (hx >> 20) - 1023;
  hx &= 0x000fffff;
  let i = (hx + 0x95f64) & 0x100000;
  x = setHi(x, hx | (i ^ 0x3ff00000));
  k += i >> 20;
  const f = x - 1.0;
  if ((0x000fffff & (2 + hx)) < 3) {
    if (f === 0) {
      if (k === 0) return 0;
      const dk = k;
      return dk * LN2_HI_L + dk * LN2_LO_L;
    }
    const R = f * f * (0.5 - 0.33333333333333333 * f);
    if (k === 0) return f - R;
    const dk = k;
    return dk * LN2_HI_L - ((R - dk * LN2_LO_L) - f);
  }
  const s = f / (2.0 + f);
  const dk = k;
  const z = s * s;
  i = hx - 0x6147a;
  const w = z * z;
  const j = 0x6b851 - hx;
  const t1 = w * (LG2 + w * (LG4 + w * LG6));
  const t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)));
  i |= j;
  const R = t2 + t1;
  if (i > 0) {
    const hfsq = 0.5 * f * f;
    if (k === 0) return f - (hfsq - s * (hfsq + R));
    return dk * LN2_HI_L - ((hfsq - (s * (hfsq + R) + dk * LN2_LO_L)) - f);
  }
  if (k === 0) return f - s * (f - R);
  return dk * LN2_HI_L - ((s * (f - R) - dk * LN2_LO_L) - f);
}

// ---- log10 (e_log10.c) --------------------------------------------------------------------------------------
const IVLN10 = 4.34294481903251816668e-01, LOG10_2HI = 3.01029995663611771306e-01, LOG10_2LO = 3.69423907715893078616e-13;

export function log10(x: number): number {
  let hx = hiWord(x);
  const lx = loWord(x);
  let k = 0;
  if (hx < 0x00100000) {
    if (((hx & 0x7fffffff) | lx) === 0) return -Infinity;
    if (hx < 0) return NaN;
    k -= 54; x *= TWO54;
    hx = hiWord(x);
  }
  if (hx >= 0x7ff00000) return x + x;
  if (hx === 0x3ff00000 && lx === 0) return 0;
  k += (hx >> 20) - 1023;
  const i = k < 0 ? 1 : 0;
  hx = (hx & 0x000fffff) | ((0x3ff - i) << 20);
  const y = k + i;
  x = setHi(x, hx);
  const z = y * LOG10_2LO + IVLN10 * log(x);
  return z + y * LOG10_2HI;
}

// ---- sin / cos kernels (k_sin.c, k_cos.c) -------------------------------------------------------------------
const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04;
const S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05;
const C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;

function kernelSin(x: number, y: number, iy: number): number {
  const ix = hiWord(x) & 0x7fffffff;
  if (ix < 0x3e400000 && (x | 0) === 0) return x;
  const z = x * x;
  const v = z * x;
  const r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  if (iy === 0) return x + v * (S1 + z * r);
  return x - ((z * (0.5 * y - v * r) - y) - v * S1);
}

function kernelCos(x: number, y: number): number {
  const ix = hiWord(x) & 0x7fffffff;
  if (ix < 0x3e400000 && (x | 0) === 0) return 1;
  const z = x * x;
  const r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  if (ix < 0x3fd33333) return 1 - (0.5 * z - (z * r - x * y));
  const qx = ix > 0x3fe90000 ? 0.28125 : fromWords(ix - 0x00200000, 0);
  const hz = 0.5 * z - qx;
  const a = 1 - qx;
  return a - (hz - (z * r - x * y));
}

// ---- argument reduction (k_rem_pio2.c with prec = 2, e_rem_pio2.c) ------------------------------------------
// 66 x 24 bits of 2/pi, and pi/2 in 24-bit pieces.
const TWO_OVER_PI = [
  0xA2F983, 0x6E4E44, 0x1529FC, 0x2757D1, 0xF534DD, 0xC0DB62, 0x95993C, 0x439041, 0xFE5163, 0xABDEBB, 0xC561B7, 0x246E3A,
  0x424DD2, 0xE00649, 0x2EEA09, 0xD1921C, 0xFE1DEB, 0x1CB129, 0xA73EE8, 0x8235F5, 0x2EBB44, 0x84E99C, 0x7026B4, 0x5F7E41,
  0x3991D6, 0x398353, 0x39F49C, 0x845F8B, 0xBDF928, 0x3B1FF8, 0x97FFDE, 0x05980F, 0xEF2F11, 0x8B5A0A, 0x6D1F6D, 0x367ECF,
  0x27CB09, 0xB74F46, 0x3F669E, 0x5FEA2D, 0x7527BA, 0xC7EBE5, 0xF17B3D, 0x0739F7, 0x8A5292, 0xEA6BFB, 0x5FB11F, 0x8D5D08,
  0x560330, 0x46FC7B, 0x6BABF0, 0xCFBC20, 0x9AF436, 0x1DA9E3, 0x91615E, 0xE61B08, 0x659985, 0x5F14A0, 0x68408D, 0xFFD880,
  0x4D7327, 0x310606, 0x1556CA, 0x73A8C9, 0x60E27B, 0xC08C6B,
];
const PIO2 = [
  1.57079625129699707031e+00, 7.54978941586159635335e-08, 5.39030252995776476554e-15, 3.28200341580791294123e-22,
  1.27065575308067607349e-29, 1.22933308981111328932e-36, 2.73370053816464559624e-44, 2.16741683877804819444e-51,
];
const TWO24 = 1.67772160000000000000e+07, TWON24 = 5.96046447753906250000e-08;
const JK = 4; // init_jk[2]

/** Returns n mod 8 and leaves the two-word remainder in `remainder`. */
const remainder = new Float64Array(2);

function kernelRemPio2(x: number[], e0: number, nx: number): number {
  const jp = JK;
  const jx = nx - 1;
  let jv = ((e0 - 3) / 24) | 0;
  if (jv < 0) jv = 0;
  let q0 = e0 - 24 * (jv + 1);
  const f = new Float64Array(20), fq = new Float64Array(20), q = new Float64Array(20), iq = new Int32Array(20);

  let j = jv - jx;
  const m = jx + JK;
  for (let i = 0; i <= m; i++, j++) f[i] = j < 0 ? 0 : TWO_OVER_PI[j];
  for (let i = 0; i <= JK; i++) {
    let fw = 0;
    for (let jj = 0; jj <= jx; jj++) fw += x[jj] * f[jx + i - jj];
    q[i] = fw;
  }

  let jz = JK, z = 0, n = 0, ih = 0;
  recompute: for (;;) {
    // distill q[] into iq[] reversingly
    z = q[jz];
    for (let i = 0, jj = jz; jj > 0; i++, jj--) {
      const fw = ((TWON24 * z) | 0);
      iq[i] = (z - TWO24 * fw) | 0;
      z = q[jj - 1] + fw;
    }
    // compute n
    z = scalbn(z, q0);
    z -= 8.0 * Math.floor(z * 0.125);
    n = z | 0;
    z -= n;
    ih = 0;
    if (q0 > 0) {
      const i = iq[jz - 1] >> (24 - q0);
      n += i;
      iq[jz - 1] -= i << (24 - q0);
      ih = iq[jz - 1] >> (23 - q0);
    } else if (q0 === 0) ih = iq[jz - 1] >> 23;
    else if (z >= 0.5) ih = 2;

    if (ih > 0) {
      n += 1;
      let carry = 0;
      for (let i = 0; i < jz; i++) {
        const v = iq[i];
        if (carry === 0) {
          if (v !== 0) { carry = 1; iq[i] = 0x1000000 - v; }
        } else iq[i] = 0xffffff - v;
      }
      if (q0 > 0) {
        if (q0 === 1) iq[jz - 1] &= 0x7fffff;
        else if (q0 === 2) iq[jz - 1] &= 0x3fffff;
      }
      if (ih === 2) {
        z = 1 - z;
        if (carry !== 0) z -= scalbn(1, q0);
      }
    }

    // check if recomputation is needed
    if (z === 0) {
      let acc = 0;
      for (let i = jz - 1; i >= JK; i--) acc |= iq[i];
      if (acc === 0) {
        let k = 1;
        while (iq[JK - k] === 0) k++;
        for (let i = jz + 1; i <= jz + k; i++) {
          f[jx + i] = TWO_OVER_PI[jv + i];
          let fw = 0;
          for (let jj = 0; jj <= jx; jj++) fw += x[jj] * f[jx + i - jj];
          q[i] = fw;
        }
        jz += k;
        continue recompute;
      }
    }
    break;
  }

  // chop off zero terms
  if (z === 0) {
    jz -= 1; q0 -= 24;
    while (iq[jz] === 0) { jz--; q0 -= 24; }
  } else {
    z = scalbn(z, -q0);
    if (z >= TWO24) {
      const fw = ((TWON24 * z) | 0);
      iq[jz] = (z - TWO24 * fw) | 0;
      jz += 1; q0 += 24;
      iq[jz] = fw;
    } else iq[jz] = z | 0;
  }

  // convert integer "bit" chunk to floating-point value
  let fw = scalbn(1, q0);
  for (let i = jz; i >= 0; i--) { q[i] = fw * iq[i]; fw *= TWON24; }

  // compute PIo2[0..jp] * q[jz..0]
  for (let i = jz; i >= 0; i--) {
    fw = 0;
    for (let k = 0; k <= jp && k <= jz - i; k++) fw += PIO2[k] * q[i + k];
    fq[jz - i] = fw;
  }

  // compress fq[] into y[] (prec 2)
  fw = 0;
  for (let i = jz; i >= 0; i--) fw += fq[i];
  remainder[0] = ih === 0 ? fw : -fw;
  fw = fq[0] - fw;
  for (let i = 1; i <= jz; i++) fw += fq[i];
  remainder[1] = ih === 0 ? fw : -fw;
  return n & 7;
}

const NPIO2_HW = [
  0x3ff921fb, 0x400921fb, 0x4012d97c, 0x401921fb, 0x401f6a7a, 0x4022d97c, 0x4025fdbb, 0x402921fb, 0x402c463a, 0x402f6a7a, 0x4031475c,
  0x4032d97c, 0x40346b9c, 0x4035fdbb, 0x40378fdb, 0x403921fb, 0x403ab41b, 0x403c463a, 0x403dd85a, 0x403f6a7a, 0x40407e4c, 0x4041475c,
  0x4042106c, 0x4042d97c, 0x4043a28c, 0x40446b9c, 0x404534ac, 0x4045fdbb, 0x4046c6cb, 0x40478fdb, 0x404858eb, 0x404921fb,
];
const INVPIO2 = 6.36619772367581382433e-01, PIO2_1 = 1.57079632673412561417e+00, PIO2_1T = 6.07710050650619224932e-11;
const PIO2_2 = 6.07710050630396597660e-11, PIO2_2T = 2.02226624879595063154e-21, PIO2_3 = 2.02226624871116645580e-21, PIO2_3T = 8.47842766036889956997e-32;

/** Returns n (the quadrant count, signed) and leaves the reduced argument in `remainder`. */
function remPio2(x: number): number {
  const hx = hiWord(x);
  const ix = hx & 0x7fffffff;
  if (ix <= 0x3fe921fb) { remainder[0] = x; remainder[1] = 0; return 0; }
  if (ix < 0x4002d97c) {
    if (hx > 0) {
      let z = x - PIO2_1;
      if (ix !== 0x3ff921fb) {
        remainder[0] = z - PIO2_1T;
        remainder[1] = (z - remainder[0]) - PIO2_1T;
      } else {
        z -= PIO2_2;
        remainder[0] = z - PIO2_2T;
        remainder[1] = (z - remainder[0]) - PIO2_2T;
      }
      return 1;
    }
    let z = x + PIO2_1;
    if (ix !== 0x3ff921fb) {
      remainder[0] = z + PIO2_1T;
      remainder[1] = (z - remainder[0]) + PIO2_1T;
    } else {
      z += PIO2_2;
      remainder[0] = z + PIO2_2T;
      remainder[1] = (z - remainder[0]) + PIO2_2T;
    }
    return -1;
  }
  if (ix <= 0x413921fb) {
    let t = Math.abs(x);
    const n = (t * INVPIO2 + 0.5) | 0;
    const fn = n;
    let r = t - fn * PIO2_1;
    let w = fn * PIO2_1T;
    let y0: number;
    if (n < 32 && ix !== NPIO2_HW[n - 1]) {
      y0 = r - w;
    } else {
      const j = ix >> 20;
      y0 = r - w;
      let i = j - ((hiWord(y0) >> 20) & 0x7ff);
      if (i > 16) {
        t = r;
        w = fn * PIO2_2;
        r = t - w;
        w = fn * PIO2_2T - ((t - r) - w);
        y0 = r - w;
        i = j - ((hiWord(y0) >> 20) & 0x7ff);
        if (i > 49) {
          t = r;
          w = fn * PIO2_3;
          r = t - w;
          w = fn * PIO2_3T - ((t - r) - w);
          y0 = r - w;
        }
      }
    }
    const y1 = (r - y0) - w;
    if (hx < 0) { remainder[0] = -y0; remainder[1] = -y1; return -n; }
    remainder[0] = y0; remainder[1] = y1;
    return n;
  }
  if (ix >= 0x7ff00000) { remainder[0] = remainder[1] = x - x; return 0; }
  // all other (large) arguments: z = scalbn(|x|, ilogb(x) - 23)
  const e0 = (ix >> 20) - 1046;
  let z = fromWords(ix - (e0 << 20), loWord(x));
  const tx = [0, 0, 0];
  for (let i = 0; i < 2; i++) {
    tx[i] = z | 0;
    z = (z - tx[i]) * TWO24;
  }
  tx[2] = z;
  let nx = 3;
  while (tx[nx - 1] === 0) nx--;
  const n = kernelRemPio2(tx, e0, nx);
  if (hx < 0) { remainder[0] = -remainder[0]; remainder[1] = -remainder[1]; return -n; }
  return n;
}

export function sin(x: number): number {
  const ix = hiWord(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kernelSin(x, 0, 0);
  if (ix >= 0x7ff00000) return x - x;
  const n = remPio2(x);
  const y0 = remainder[0], y1 = remainder[1];
  switch (n & 3) {
    case 0: return kernelSin(y0, y1, 1);
    case 1: return kernelCos(y0, y1);
    case 2: return -kernelSin(y0, y1, 1);
    default: return -kernelCos(y0, y1);
  }
}

export function cos(x: number): number {
  const ix = hiWord(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kernelCos(x, 0);
  if (ix >= 0x7ff00000) return x - x;
  const n = remPio2(x);
  const y0 = remainder[0], y1 = remainder[1];
  switch (n & 3) {
    case 0: return kernelCos(y0, y1);
    case 1: return -kernelSin(y0, y1, 1);
    case 2: return -kernelCos(y0, y1);
    default: return kernelSin(y0, y1, 1);
  }
}

// ---- asin (e_asin.c) ----------------------------------------------------------------------------------------
const PIO2_HI = 1.57079632679489655800e+00, PIO2_LO = 6.12323399573676603587e-17, PIO4_HI = 7.85398163397448278999e-01;
const PS0 = 1.66666666666666657415e-01, PS1 = -3.25565818622400915405e-01, PS2 = 2.01212532134862925881e-01;
const PS3 = -4.00555345006794114027e-02, PS4 = 7.91534994289814532176e-04, PS5 = 3.47933107596021167570e-05;
const QS1 = -2.40339491173441421878e+00, QS2 = 2.02094576023350569471e+00, QS3 = -6.88283971605453293030e-01, QS4 = 7.70381505559019352791e-02;

export function asin(x: number): number {
  const hx = hiWord(x);
  const ix = hx & 0x7fffffff;
  if (ix >= 0x3ff00000) {
    if (((ix - 0x3ff00000) | loWord(x)) === 0) return x * PIO2_HI + x * PIO2_LO;
    return NaN;
  }
  if (ix < 0x3fe00000) {
    if (ix < 0x3e400000 && HUGE + x > 1) return x;
    const t = x * x;
    const p = t * (PS0 + t * (PS1 + t * (PS2 + t * (PS3 + t * (PS4 + t * PS5)))));
    const q = 1 + t * (QS1 + t * (QS2 + t * (QS3 + t * QS4)));
    return x + x * (p / q);
  }
  let w = 1 - Math.abs(x);
  let t = w * 0.5;
  let p = t * (PS0 + t * (PS1 + t * (PS2 + t * (PS3 + t * (PS4 + t * PS5)))));
  let q = 1 + t * (QS1 + t * (QS2 + t * (QS3 + t * QS4)));
  const s = Math.sqrt(t);
  if (ix >= 0x3fef3333) {
    w = p / q;
    t = PIO2_HI - (2.0 * (s + s * w) - PIO2_LO);
  } else {
    w = setLo(s, 0);
    const c = (t - w * w) / (s + w);
    const r = p / q;
    p = 2.0 * s * r - (PIO2_LO - 2.0 * c);
    q = PIO4_HI - 2.0 * w;
    t = PIO4_HI - (p - q);
  }
  return hx > 0 ? t : -t;
}

// ---- pow (e_pow.c) ------------------------------------------------------------------------------------------
const BP = [1.0, 1.5], DP_H = [0.0, 5.84962487220764160156e-01], DP_L = [0.0, 1.35003920212974897128e-08];
const TWO53 = 9007199254740992.0;
const L1 = 5.99999999999994648725e-01, L2 = 4.28571428578550184252e-01, L3 = 3.33333329818377432918e-01;
const L4 = 2.72728123808534006489e-01, L5 = 2.30660745775561754067e-01, L6 = 2.06975017800338417784e-01;
const P1 = 1.66666666666666019037e-01, P2 = -2.77777777770155933842e-03, P3 = 6.61375632143793436117e-05;
const P4 = -1.65339022054652515390e-06, P5 = 4.13813679705723846039e-08;
const LG2_ = 6.93147180559945286227e-01, LG2_H = 6.93147182464599609375e-01, LG2_L = -1.90465429995776804525e-09;
const OVT = 8.0085662595372944372e-17;
const CP = 9.61796693925975554329e-01, CP_H = 9.61796700954437255859e-01, CP_L = -7.02846165095275826516e-09;
const IVLN2 = 1.44269504088896338700e+00, IVLN2_H = 1.44269502162933349609e+00, IVLN2_L = 1.92596299112661746887e-08;

export function pow(x: number, y: number): number {
  const hx = hiWord(x), lx = loWord(x);
  const hy = hiWord(y), ly = loWord(y);
  let ix = hx & 0x7fffffff;
  const iy = hy & 0x7fffffff;

  if ((iy | ly) === 0) return 1; // x^0
  if (ix > 0x7ff00000 || (ix === 0x7ff00000 && lx !== 0) || iy > 0x7ff00000 || (iy === 0x7ff00000 && ly !== 0)) return x + y;

  // yisint: 0 = not an integer, 1 = odd integer, 2 = even integer (only matters for x < 0)
  let yisint = 0;
  if (hx < 0) {
    if (iy >= 0x43400000) yisint = 2;
    else if (iy >= 0x3ff00000) {
      const k = (iy >> 20) - 0x3ff;
      if (k > 20) {
        const j = ly >>> (52 - k);
        if (((j << (52 - k)) >>> 0) === ly) yisint = 2 - (j & 1);
      } else if (ly === 0) {
        const j = iy >> (20 - k);
        if ((j << (20 - k)) === iy) yisint = 2 - (j & 1);
      }
    }
  }

  if (ly === 0) {
    if (iy === 0x7ff00000) {
      if (((ix - 0x3ff00000) | lx) === 0) return y - y;
      if (ix >= 0x3ff00000) return hy >= 0 ? y : 0;
      return hy < 0 ? -y : 0;
    }
    if (iy === 0x3ff00000) return hy < 0 ? 1 / x : x;
    if (hy === 0x40000000) return x * x;
    if (hy === 0x3fe00000 && hx >= 0) return Math.sqrt(x);
  }

  let ax = Math.abs(x);
  if (lx === 0 && (ix === 0x7ff00000 || ix === 0 || ix === 0x3ff00000)) {
    let z = ax;
    if (hy < 0) z = 1 / z;
    if (hx < 0) {
      if (((ix - 0x3ff00000) | yisint) === 0) z = (z - z) / (z - z);
      else if (yisint === 1) z = -z;
    }
    return z;
  }

  let n = (hx >> 31) + 1;
  if ((n | yisint) === 0) return (x - x) / (x - x); // (negative)^(non-integer)
  let s = 1;
  if ((n | (yisint - 1)) === 0) s = -1; // (negative)^(odd integer)

  let t1: number, t2: number;
  if (iy > 0x41e00000) { // |y| > 2^31
    if (iy > 0x43f00000) { // |y| > 2^64: must over/underflow
      if (ix <= 0x3fefffff) return hy < 0 ? HUGE * HUGE : TINY * TINY;
      if (ix >= 0x3ff00000) return hy > 0 ? HUGE * HUGE : TINY * TINY;
    }
    if (ix < 0x3fefffff) return hy < 0 ? s * HUGE * HUGE : s * TINY * TINY;
    if (ix > 0x3ff00000) return hy > 0 ? s * HUGE * HUGE : s * TINY * TINY;
    // |1 - x| <= 2^-20: log(x) by x - x^2/2 + x^3/3 - x^4/4
    const t = ax - 1;
    const w = (t * t) * (0.5 - t * (0.3333333333333333333333 - t * 0.25));
    const u = IVLN2_H * t;
    const v = t * IVLN2_L - w * IVLN2;
    t1 = setLo(u + v, 0);
    t2 = v - (t1 - u);
  } else {
    n = 0;
    if (ix < 0x00100000) { ax *= TWO53; n -= 53; ix = hiWord(ax); }
    n += (ix >> 20) - 0x3ff;
    const j = ix & 0x000fffff;
    ix = j | 0x3ff00000;
    let k: number;
    if (j <= 0x3988e) k = 0;
    else if (j < 0xbb67a) k = 1;
    else { k = 0; n += 1; ix -= 0x00100000; }
    ax = setHi(ax, ix);

    // ss = s_h + s_l = (x - 1)/(x + 1) or (x - 1.5)/(x + 1.5)
    const u = ax - BP[k];
    const v = 1 / (ax + BP[k]);
    const ss = u * v;
    const sH = setLo(ss, 0);
    const tH0 = fromWords(((ix >> 1) | 0x20000000) + 0x00080000 + (k << 18), 0);
    const tL0 = ax - (tH0 - BP[k]);
    const sL = v * ((u - sH * tH0) - sH * tL0);
    // log(ax)
    let s2 = ss * ss;
    let r = s2 * s2 * (L1 + s2 * (L2 + s2 * (L3 + s2 * (L4 + s2 * (L5 + s2 * L6)))));
    r += sL * (sH + ss);
    s2 = sH * sH;
    const tH = setLo(3.0 + s2 + r, 0);
    const tL = r - ((tH - 3.0) - s2);
    // u + v = ss * (1 + ...)
    const u2 = sH * tH;
    const v2 = sL * tH + tL * ss;
    // 2/(3 log 2) * (ss + ...)
    const pH = setLo(u2 + v2, 0);
    const pL = v2 - (pH - u2);
    const zH = CP_H * pH;
    const zL = CP_L * pH + pL * CP + DP_L[k];
    // log2(ax) = n + dp_h + z_h + z_l
    const t = n;
    t1 = setLo(((zH + zL) + DP_H[k]) + t, 0);
    t2 = zL - (((t1 - t) - DP_H[k]) - zH);
  }

  // split y into y1 + y2 and compute (y1 + y2) * (t1 + t2)
  const y1 = setLo(y, 0);
  let pL = (y - y1) * t1 + y * t2;
  let pH = y1 * t1;
  let z = pL + pH;
  let j = hiWord(z);
  const i0 = loWord(z) | 0;
  if (j >= 0x40900000) {
    if (((j - 0x40900000) | i0) !== 0) return s * HUGE * HUGE;
    if (pL + OVT > z - pH) return s * HUGE * HUGE;
  } else if ((j & 0x7fffffff) >= 0x4090cc00) {
    if (((j - 0xc090cc00) | i0) !== 0) return s * TINY * TINY;
    if (pL <= z - pH) return s * TINY * TINY;
  }

  // 2^(p_h + p_l)
  const i = j & 0x7fffffff;
  let k = (i >> 20) - 0x3ff;
  n = 0;
  if (i > 0x3fe00000) {
    n = j + (0x00100000 >> (k + 1));
    k = ((n & 0x7fffffff) >> 20) - 0x3ff;
    const t = fromWords(n & ~(0x000fffff >> k), 0);
    n = ((n & 0x000fffff) | 0x00100000) >> (20 - k);
    if (j < 0) n = -n;
    pH -= t;
  }
  let t = setLo(pL + pH, 0);
  const u = t * LG2_H;
  const v = (pL - (t - pH)) * LG2_ + t * LG2_L;
  z = u + v;
  const w = v - (z - u);
  t = z * z;
  const t3 = z - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
  const r = (z * t3) / (t3 - 2) - (w + z * w);
  z = 1 - (r - z);
  j = hiWord(z);
  j += n << 20;
  if ((j >> 20) <= 0) z = scalbn(z, n);
  else z = setHi(z, j);
  return s * z;
}

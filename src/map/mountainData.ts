// Phase 9.5 stage 2: the world's great mountain chains as ridge spines, and a deterministic generator that scatters
// stylised peaks along them. Presentation data only. Spines are hand-entered [lon, lat] waypoints along each chain's crest
// (good to a few tens of km, plenty for a stylised map); the same seed always yields the same peaks, so the relief never
// shimmers between frames, sessions or machines.
export type LonLat = [number, number];
export interface Chain { id: string; spine: LonLat[]; /** half width of the range, degrees */ half: number; /** 1..3: height class of the crest */ tier: 1 | 2 | 3; /** stations per degree of spine */ density: number; rows: number }
export interface Peak { lon: number; lat: number; tier: 1 | 2 | 3; /** 0..1 level-of-detail rank: the peak shows once zoom detail exceeds it */ rank: number; /** 0.8..1.25 */ size: number; chain: string }

export const CHAINS: Chain[] = [
  { id: 'Alps', spine: [[6.5, 44.2], [6.9, 45.9], [8.0, 46.0], [9.5, 46.5], [11.0, 46.4], [12.5, 46.6], [14.2, 46.7], [15.6, 47.3]], half: 0.7, tier: 3, density: 3.4, rows: 3 },
  { id: 'Himalaya', spine: [[74.6, 35.2], [76.0, 33.4], [78.0, 31.6], [81.0, 30.2], [84.0, 28.5], [86.9, 27.9], [89.0, 27.6], [92.0, 27.8], [95.5, 28.5], [97.4, 28.3]], half: 0.9, tier: 3, density: 3.0, rows: 3 },
  { id: 'Karakoram', spine: [[73.4, 36.6], [75.4, 36.2], [77.0, 35.7], [78.6, 35.3]], half: 0.55, tier: 3, density: 3.2, rows: 2 },
  { id: 'Hindu Kush', spine: [[70.2, 36.6], [71.8, 36.0], [73.4, 35.5]], half: 0.5, tier: 2, density: 3.0, rows: 2 },
  { id: 'Tian Shan', spine: [[71.0, 41.0], [74.5, 41.4], [78.0, 42.0], [81.5, 42.3], [85.0, 43.0], [88.0, 43.4]], half: 0.55, tier: 2, density: 2.4, rows: 2 },
  { id: 'Rockies', spine: [[-125.0, 59.0], [-122.0, 56.5], [-118.5, 53.5], [-115.5, 51.0], [-113.6, 48.5], [-111.5, 45.5], [-110.4, 43.4], [-108.0, 40.6], [-106.0, 38.6], [-105.6, 36.0]], half: 0.9, tier: 2, density: 1.7, rows: 3 },
  { id: 'Cascades-Sierra', spine: [[-121.8, 48.6], [-121.6, 45.6], [-121.3, 43.0], [-120.8, 40.6], [-119.6, 38.0], [-118.4, 36.0]], half: 0.45, tier: 2, density: 2.0, rows: 2 },
  { id: 'Andes', spine: [[-71.0, 8.6], [-72.8, 6.0], [-74.6, 4.2], [-77.2, 1.5], [-78.5, -1.0], [-78.6, -4.5], [-76.6, -9.0], [-75.0, -12.0], [-72.0, -14.6], [-69.6, -16.6], [-68.2, -18.2], [-68.6, -21.0], [-69.0, -24.0], [-69.6, -28.0], [-70.0, -32.6], [-71.0, -36.0], [-71.8, -40.0], [-72.6, -44.0], [-73.3, -48.0], [-73.5, -52.4]], half: 0.8, tier: 3, density: 1.9, rows: 3 },
  { id: 'Taurus', spine: [[29.6, 37.0], [32.0, 36.8], [34.4, 37.3], [36.6, 37.8], [38.6, 38.2], [41.0, 38.6], [43.2, 38.2]], half: 0.4, tier: 2, density: 3.0, rows: 2 },
  { id: 'Caucasus', spine: [[37.6, 44.5], [40.6, 43.6], [42.4, 43.3], [44.6, 42.6], [46.8, 42.2], [48.6, 41.8]], half: 0.42, tier: 3, density: 3.4, rows: 2 },
  { id: 'Pyrenees', spine: [[-1.8, 43.1], [0.0, 42.7], [1.8, 42.5], [3.2, 42.4]], half: 0.3, tier: 2, density: 3.2, rows: 2 },
  { id: 'Zagros', spine: [[45.6, 35.6], [47.6, 33.8], [49.6, 32.0], [51.6, 30.2], [54.6, 28.0]], half: 0.55, tier: 2, density: 2.0, rows: 2 },
  { id: 'Carpathians', spine: [[17.8, 49.2], [20.2, 49.4], [22.8, 48.6], [24.8, 47.6], [25.6, 46.0], [24.4, 45.4], [22.4, 45.4]], half: 0.4, tier: 1, density: 2.6, rows: 2 },
];

// mulberry32 over a string hash: tiny, fast, identical on every platform.
function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const RAD = Math.PI / 180;
const km = (a: LonLat, b: LonLat) => Math.hypot((b[0] - a[0]) * Math.cos(((a[1] + b[1]) / 2) * RAD), b[1] - a[1]);

/** Points at equal spacing along a spine polyline (degrees), with the local unit tangent. */
export function stations(spine: LonLat[], perDegree: number): { p: LonLat; t: LonLat }[] {
  const out: { p: LonLat; t: LonLat }[] = [], step = 1 / perDegree;
  let travelled = 0, next = 0;
  for (let i = 0; i < spine.length - 1; i++) {
    const a = spine[i], b = spine[i + 1], len = km(a, b);
    if (len < 1e-9) continue;
    const tx = (b[0] - a[0]) / len, ty = (b[1] - a[1]) / len;
    while (next <= travelled + len) {
      const f = (next - travelled) / len;
      out.push({ p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], t: [tx, ty] });
      next += step;
    }
    travelled += len;
  }
  return out;
}

export function generatePeaks(chains: Chain[] = CHAINS): Peak[] {
  const peaks: Peak[] = [];
  for (const chain of chains) {
    const rnd = seeded(`ron-relief-${chain.id}`);
    const list = stations(chain.spine, chain.density);
    list.forEach(({ p, t }) => {
      for (let row = 0; row < chain.rows; row++) {
        if (rnd() < 0.16) continue; // gaps keep the range from looking like a comb
        const across = (rnd() * 2 - 1) * chain.half * (row === 0 ? 0.45 : 1), along = (rnd() - 0.5) / chain.density;
        const nx = -t[1], ny = t[0];
        const lon = p[0] + nx * across / Math.max(0.2, Math.cos(p[1] * RAD)) + t[0] * along, lat = p[1] + ny * across + t[1] * along;
        const centre = 1 - Math.abs(across) / chain.half; // 1 on the crest, 0 on the flank
        const lift = centre * 1.15 + (rnd() - 0.5) * 0.9;
        const tier = Math.max(1, Math.min(chain.tier, Math.round(chain.tier - 1.6 + lift))) as 1 | 2 | 3;
        const rank = tier === 3 ? rnd() * 0.45 : tier === 2 ? 0.12 + rnd() * 0.6 : 0.4 + rnd() * 0.6;
        peaks.push({ lon, lat, tier, rank, size: 0.8 + rnd() * 0.45, chain: chain.id });
      }
    });
  }
  return peaks;
}
export const PEAKS: Peak[] = generatePeaks();

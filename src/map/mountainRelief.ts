// Phase 9.5 stage 2: turns the peak list into four SVG path strings (lit face, shaded face, snow, shaded snow) for the
// current camera. Pure and cheap: one projection per candidate peak, then plain string building. Whole ranges are four
// <path> elements in total, so relief costs the compositor almost nothing however many peaks are on screen.
import type { Peak, LonLat } from './mountainData';

export interface ReliefView {
  /** Screen position of a lon/lat, or null on the far side of a globe. */
  project: (p: LonLat) => [number, number] | null;
  /** On-screen pixels per degree of longitude at the equator (sets level of detail and peak size). */
  pixelsPerDegree: number;
  /** Optional: the globe centre [lon, lat] for limb foreshortening. */
  globeCenter?: LonLat;
  width?: number;
  height?: number;
}
export interface ReliefPaths { lit: string; shade: string; snow: string; snowShade: string; count: number }

const RAD = Math.PI / 180;
export const RELIEF_MIN_PPD = 5.5;

/** 0 (nothing shows) to 1 (every peak shows): detail grows with zoom. */
export function reliefDetail(ppd: number): number {
  return Math.max(0, Math.min(1, (ppd - RELIEF_MIN_PPD) / (16 - RELIEF_MIN_PPD)));
}
/** Peak scale in pixels: grows with zoom, bounded so peaks never swallow the map or vanish. */
export function reliefScale(ppd: number): number {
  return Math.max(0.6, Math.min(2.3, ppd / 9));
}
const SNOW_FRACTION = { 1: 0, 2: 0.3, 3: 0.42 } as const;
const BASE_HEIGHT = { 1: 5.2, 2: 7.6, 3: 10.4 } as const;

const f = (n: number) => (Math.round(n * 10) / 10).toString();

/** One peak as up to four sub-paths. Light falls from the upper left, so the left face is lit. */
export function peakShape(x: number, y: number, h: number, tier: 1 | 2 | 3): { lit: string; shade: string; snow: string; snowShade: string } {
  const w = h * 0.92, apexX = x + w * 0.04, ridgeX = x + w * 0.1, left = x - w / 2, right = x + w / 2;
  const lit = `M${f(left)} ${f(y)}L${f(apexX)} ${f(y - h)}L${f(ridgeX)} ${f(y)}z`;
  const shade = `M${f(ridgeX)} ${f(y)}L${f(apexX)} ${f(y - h)}L${f(right)} ${f(y)}z`;
  const frac = SNOW_FRACTION[tier];
  if (frac === 0) return { lit, shade, snow: '', snowShade: '' };
  const capY = y - h * (1 - frac);
  // Edge points of the cap on both faces: lerp from apex to base corners.
  const lx = apexX + (left - apexX) * frac, rx = apexX + (right - apexX) * frac, mx = apexX + (ridgeX - apexX) * frac;
  const snow = `M${f(lx)} ${f(capY)}L${f(apexX)} ${f(y - h)}L${f(mx)} ${f(capY)}L${f((lx + mx) / 2)} ${f(capY - h * 0.08)}z`;
  const snowShade = `M${f(mx)} ${f(capY)}L${f(apexX)} ${f(y - h)}L${f(rx)} ${f(capY)}L${f((rx + mx) / 2 + w * 0.02)} ${f(capY - h * 0.1)}z`;
  return { lit, shade, snow, snowShade };
}

export function reliefPaths(peaks: readonly Peak[], view: ReliefView): ReliefPaths {
  const out: ReliefPaths = { lit: '', shade: '', snow: '', snowShade: '', count: 0 };
  const detail = reliefDetail(view.pixelsPerDegree);
  if (detail <= 0) return out;
  const scale = reliefScale(view.pixelsPerDegree), W = view.width ?? 1200, H = view.height ?? 700, pad = 30;
  const visible: { x: number; y: number; h: number; tier: 1 | 2 | 3 }[] = [];
  for (const peak of peaks) {
    // Main summits show as soon as there is any detail; lesser peaks fill in as the camera comes closer.
    if (peak.tier < 3 && peak.rank > detail) continue;
    if (peak.tier === 3 && peak.rank > detail * 1.6 + 0.1) continue;
    const p = view.project([peak.lon, peak.lat]);
    if (!p || p[0] < -pad || p[0] > W + pad || p[1] < -pad || p[1] > H + pad) continue;
    let fore = 1;
    if (view.globeCenter) {
      const [lo, la] = [peak.lon * RAD, peak.lat * RAD], [co, ca] = [view.globeCenter[0] * RAD, view.globeCenter[1] * RAD];
      const c = Math.sin(la) * Math.sin(ca) + Math.cos(la) * Math.cos(ca) * Math.cos(lo - co);
      if (c < 0.12) continue;
      fore = 0.5 + 0.5 * c; // peaks near the limb are seen edge-on, so they shrink in height
    }
    visible.push({ x: p[0], y: p[1], h: BASE_HEIGHT[peak.tier] * peak.size * scale * fore, tier: peak.tier });
  }
  // Painter's order: southern (lower on screen) peaks overlap northern ones.
  visible.sort((a, b) => a.y - b.y || a.x - b.x);
  for (const v of visible) {
    const s = peakShape(v.x, v.y, v.h, v.tier);
    out.lit += s.lit; out.shade += s.shade; out.snow += s.snow; out.snowShade += s.snowShade;
  }
  out.count = visible.length;
  return out;
}

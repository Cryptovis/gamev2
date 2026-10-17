// Phase 9.5 stage 2: where a war is being fought, as geometry. Pure view model: reads country outlines and war records,
// never changes either. The front of a land war is the stretch of border the two countries share; an overseas war gets a
// short beachhead on the defender's coast facing the attacker. Results are cached per country pair because outlines never change.
import type { WarState } from '../domain/game';

export type LonLat = [number, number];
export type Ring = LonLat[];

/** Outer rings of a GeoJSON Polygon or MultiPolygon geometry (holes are ignored: borders never run through a lake). */
export function outerRings(geometry: { type: string; coordinates: any } | null | undefined): Ring[] {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates[0] as Ring];
  if (geometry.type === 'MultiPolygon') return (geometry.coordinates as any[]).map((poly) => poly[0] as Ring);
  return [];
}

const CELL = 0.5;
const key = (x: number, y: number) => `${Math.floor(x / CELL)}:${Math.floor(y / CELL)}`;
const dist = (a: LonLat, b: LonLat) => Math.hypot((a[0] - b[0]) * Math.cos(((a[1] + b[1]) / 2) * Math.PI / 180), a[1] - b[1]);

/** Spatial hash of every vertex of the rings, so "is any B vertex within eps of this A vertex" is a 9-cell lookup. */
function hashVertices(rings: Ring[]): Map<string, LonLat[]> {
  const grid = new Map<string, LonLat[]>();
  for (const ring of rings) for (const v of ring) { const k = key(v[0], v[1]); const cell = grid.get(k); if (cell) cell.push(v); else grid.set(k, [v]); }
  return grid;
}
function nearestIn(grid: Map<string, LonLat[]>, v: LonLat, reach: number): number {
  let best = Infinity;
  const cx = Math.floor(v[0] / CELL), cy = Math.floor(v[1] / CELL), r = Math.ceil(reach / CELL);
  for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
    const cell = grid.get(`${cx + dx}:${cy + dy}`);
    if (cell) for (const w of cell) { const d = dist(v, w); if (d < best) best = d; }
  }
  return best;
}

/** Border tolerance in degrees: the bundled outlines are coarse, so neighbours' vertices only roughly coincide. */
export const BORDER_EPS = 0.45;
/** Shortest run of border vertices that counts as a front, in vertices. */
const MIN_RUN = 2;

/** Runs of A's boundary that lie within eps of B, in A's own ring order. Longest first. */
export function sharedBorder(a: Ring[], b: Ring[], eps = BORDER_EPS): LonLat[][] {
  const grid = hashVertices(b), runs: LonLat[][] = [];
  for (const ring of a) {
    let run: LonLat[] = [];
    const flush = () => { if (run.length >= MIN_RUN) runs.push(run); run = []; };
    for (let i = 0; i < ring.length; i++) { if (nearestIn(grid, ring[i], eps) <= eps) run.push(ring[i]); else flush(); }
    flush();
  }
  return runs.sort((p, q) => q.length - p.length);
}

const RAD = Math.PI / 180;
const unit = (v: LonLat): [number, number, number] => { const c = Math.cos(v[1] * RAD); return [c * Math.cos(v[0] * RAD), c * Math.sin(v[0] * RAD), Math.sin(v[1] * RAD)]; };
const sample = (rings: Ring[], max: number): LonLat[] => { const all = rings.flat(), stride = Math.max(1, Math.ceil(all.length / max)); return all.filter((_, i) => i % stride === 0); };

/** Defender-coast vertices nearest to the attacker, great-circle: the landing zone of an overseas war (a short polyline). */
export function beachhead(attacker: Ring[], defender: Ring[], span = 4): LonLat[][] {
  const att = sample(attacker, 300).map(unit);
  let best = -2, ring: Ring | null = null, at = 0;
  for (const r of defender) for (let i = 0; i < r.length; i += Math.max(1, Math.ceil(r.length / 400))) {
    const u = unit(r[i]);
    for (const w of att) { const dot = u[0] * w[0] + u[1] * w[1] + u[2] * w[2]; if (dot > best) { best = dot; ring = r; at = i; } }
  }
  if (!ring) return [];
  const out: LonLat[] = [];
  for (let k = -span; k <= span; k++) out.push(ring[(at + k + ring.length * 4) % ring.length]);
  return [out];
}

const cache = new Map<string, { kind: 'border' | 'beachhead'; lines: LonLat[][] }>();
export function frontGeometry(attackerId: string, defenderId: string, rings: Record<string, Ring[]>): { kind: 'border' | 'beachhead'; lines: LonLat[][] } | null {
  const a = rings[attackerId], d = rings[defenderId];
  if (!a || !d || !a.length || !d.length) return null;
  const id = `${attackerId}>${defenderId}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const border = sharedBorder(d, a);
  const result = border.length ? { kind: 'border' as const, lines: border.slice(0, 3) } : { kind: 'beachhead' as const, lines: beachhead(a, d) };
  cache.set(id, result);
  return result;
}
export function clearFrontCache() { cache.clear(); }

/** 1..5: the share of the two armies that this side fields, spread over five steps. Both sides at parity read as 3. */
export function troopLevels(attackerPersonnel: number, defenderPersonnel: number): { attacker: number; defender: number } {
  const a = Math.max(0, attackerPersonnel), d = Math.max(0, defenderPersonnel), total = a + d;
  if (total <= 0) return { attacker: 1, defender: 1 };
  const level = (share: number) => Math.max(1, Math.min(5, 1 + Math.round(share * 4)));
  return { attacker: level(a / total), defender: level(d / total) };
}

/** A war is "under assault" while its last combat round is at most two days old (or it opened that recently). */
export function underAssault(war: Pick<WarState, 'status' | 'lastCombatDay' | 'startedDay'>, day: number): boolean {
  return war.status === 'active' && day - Math.max(war.lastCombatDay, war.startedDay) <= 2;
}

// FNV-1a: stable, tiny and identical everywhere, so effects sit in the same places on every machine.
export function hash01(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

/** `count` points spread along the polylines (screen space), chosen deterministically from the war id. */
export function pointsAlong(lines: [number, number][][], count: number, seed: string): { x: number; y: number; nx: number; ny: number }[] {
  const segs: { a: [number, number]; b: [number, number]; len: number }[] = [];
  let total = 0;
  for (const line of lines) for (let i = 0; i < line.length - 1; i++) { const len = Math.hypot(line[i + 1][0] - line[i][0], line[i + 1][1] - line[i][1]); if (len > 0.01) { segs.push({ a: line[i], b: line[i + 1], len }); total += len; } }
  if (!segs.length || count <= 0) return [];
  const out: { x: number; y: number; nx: number; ny: number }[] = [];
  for (let k = 0; k < count; k++) {
    let at = ((k + 0.25 + hash01(`${seed}:${k}`) * 0.5) / count) * total;
    for (const s of segs) {
      if (at <= s.len) { const t = at / s.len, dx = (s.b[0] - s.a[0]) / s.len, dy = (s.b[1] - s.a[1]) / s.len; out.push({ x: s.a[0] + (s.b[0] - s.a[0]) * t, y: s.a[1] + (s.b[1] - s.a[1]) * t, nx: -dy, ny: dx }); break; }
      at -= s.len;
    }
  }
  return out;
}

/**
 * Screen polylines from geographic ones: hidden (far side of the globe) vertices split a line into visible runs, and so
 * does a step longer than `jump` pixels (a flat-map line crossing the antimeridian would otherwise streak across the map).
 */
export function projectLines(lines: LonLat[][], project: (p: LonLat) => [number, number] | null, jump = Infinity): [number, number][][] {
  const out: [number, number][][] = [];
  for (const line of lines) {
    let run: [number, number][] = [];
    const flush = () => { if (run.length > 1) out.push(run); run = []; };
    for (const v of line) {
      const p = project(v);
      if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) { flush(); continue; }
      const last = run[run.length - 1];
      if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) > jump) flush();
      run.push(p);
    }
    flush();
  }
  return out;
}
export const linesToPath = (lines: [number, number][][]) => lines.map((l) => 'M' + l.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')).join('');

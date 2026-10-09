/**
 * 0.89 flight rendering maths, independent of d3 so it can be unit-tested. Positions are [longitude, latitude] in
 * degrees; screen points are SVG user units. Nothing here decides game outcomes: it only places aircraft drawn from
 * `world.flights`.
 */
export type LonLat = [number, number];
export type ScreenPoint = [number, number];

const RAD = Math.PI / 180;

function toVector([lon, lat]: LonLat): [number, number, number] {
  const cosLat = Math.cos(lat * RAD);
  return [cosLat * Math.cos(lon * RAD), cosLat * Math.sin(lon * RAD), Math.sin(lat * RAD)];
}

function toLonLat([x, y, z]: [number, number, number]): LonLat {
  return [Math.atan2(y, x) / RAD, Math.atan2(z, Math.hypot(x, y)) / RAD];
}

/** Central angle between two points, in radians (0 … π). */
export function angularDistance(a: LonLat, b: LonLat): number {
  const [ax, ay, az] = toVector(a), [bx, by, bz] = toVector(b);
  const dot = Math.max(-1, Math.min(1, ax * bx + ay * by + az * bz));
  return Math.acos(dot);
}

/** Point a fraction `t` (0–1) of the way along the great circle from `a` to `b` (spherical interpolation). */
export function greatCirclePoint(a: LonLat, b: LonLat, t: number): LonLat {
  const k = Math.max(0, Math.min(1, t)), omega = angularDistance(a, b);
  if (omega < 1e-9) return [a[0], a[1]];
  const va = toVector(a), vb = toVector(b), sin = Math.sin(omega);
  const wa = Math.sin((1 - k) * omega) / sin, wb = Math.sin(k * omega) / sin;
  return toLonLat([wa * va[0] + wb * vb[0], wa * va[1] + wb * vb[1], wa * va[2] + wb * vb[2]]);
}

/** `segments + 1` evenly spaced points on the great circle from `a` to `b`, endpoints included. */
export function greatCircleArc(a: LonLat, b: LonLat, segments = 32): LonLat[] {
  const n = Math.max(1, Math.round(segments));
  return Array.from({ length: n + 1 }, (_, i) => greatCirclePoint(a, b, i / n));
}

/** Initial compass bearing from `a` towards `b` in degrees (0 = north, 90 = east), for tests and tooltips. */
export function initialBearing(a: LonLat, b: LonLat): number {
  const lat1 = a[1] * RAD, lat2 = b[1] * RAD, dLon = (b[0] - a[0]) * RAD;
  const y = Math.sin(dLon) * Math.cos(lat2), x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

/** Screen heading in degrees for an icon drawn nose-right: 0 = right, 90 = down (SVG rotate convention). */
export function screenHeading(from: ScreenPoint, to: ScreenPoint): number {
  return Math.atan2(to[1] - from[1], to[0] - from[0]) / RAD;
}

/** True when `point` is on the visible hemisphere of a globe centred on `center`. */
export function visibleOnGlobe(point: LonLat, center: LonLat): boolean {
  return angularDistance(point, center) <= Math.PI / 2;
}

/**
 * Campaign time for rendering: the simulation day plus the fraction of the current day that has elapsed on the
 * render clock. The fraction is clamped below 1 so the picture never runs ahead of the simulation.
 */
export function renderDay(day: number, fraction: number): number {
  const f = Number.isFinite(fraction) ? Math.max(0, Math.min(0.999, fraction)) : 0;
  return day + f;
}

/**
 * SVG path data for an arc projected point by point. `project` returns null for hidden points (far side of the globe,
 * clipped); the line breaks there, and also where consecutive points jump further than `maxJump` (a flat map's
 * antimeridian seam), so no stroke crosses the whole map.
 */
export function arcPathData(points: LonLat[], project: (p: LonLat) => ScreenPoint | null, maxJump = 400): string {
  let d = '', previous: ScreenPoint | null = null;
  for (const point of points) {
    const p = project(point);
    if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) { previous = null; continue; }
    const jump = previous ? Math.hypot(p[0] - previous[0], p[1] - previous[1]) : 0;
    d += `${previous && jump <= maxJump ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    previous = p;
  }
  return d;
}

export interface AircraftPlacement { point: ScreenPoint; heading: number; position: LonLat }

/**
 * Where to draw an aircraft at progress `t`: its screen point and the heading of the route there (measured from a
 * point slightly behind to slightly ahead, so the nose follows the curved arc). Null when the aircraft is hidden.
 */
export function placeAircraft(a: LonLat, b: LonLat, t: number, project: (p: LonLat) => ScreenPoint | null): AircraftPlacement | null {
  const position = greatCirclePoint(a, b, t), point = project(position);
  if (!point || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) return null;
  const step = 0.02;
  const behind = project(greatCirclePoint(a, b, Math.max(0, t - step))), ahead = project(greatCirclePoint(a, b, Math.min(1, t + step)));
  const from = t + step > 1 ? behind ?? point : point, to = t + step > 1 ? point : ahead ?? point;
  const heading = from[0] === to[0] && from[1] === to[1] ? screenHeading(project(a) ?? point, project(b) ?? point) : screenHeading(from, to);
  return { point, heading, position };
}

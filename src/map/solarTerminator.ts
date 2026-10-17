// Phase 9.5 stage 1: astronomical day/night. Pure functions only; nothing here reads or writes game state, so the engine
// trajectory is untouched. The date comes from the campaign calendar, the hour of day from the viewer's UTC clock.
export type LonLat = [number, number];
const RAD = Math.PI / 180;

/** Day of the year (1..366) of an ISO date string 'YYYY-MM-DD' (UTC, so it is timezone independent). */
export function dayOfYear(isoDate: string): number {
  const t = Date.parse(`${isoDate}T00:00:00Z`);
  if (!Number.isFinite(t)) return 1;
  const year = new Date(t).getUTCFullYear();
  return Math.round((t - Date.UTC(year, 0, 1)) / 86400000) + 1;
}

/** Solar declination in degrees (Cooper's approximation, accurate to about half a degree). */
export function solarDeclination(n: number): number {
  return 23.44 * Math.sin(RAD * (360 / 365) * (284 + n));
}

/** Equation of time in minutes (Spencer-style fit, within about a minute). */
export function equationOfTime(n: number): number {
  const b = RAD * (360 / 364) * (n - 81);
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/** The point on Earth where the sun is directly overhead, as [lon, lat]. */
export function subsolarPoint(isoDate: string, hourUtc: number): LonLat {
  const n = dayOfYear(isoDate);
  let lon = -15 * (hourUtc - 12) - equationOfTime(n) / 4;
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  return [lon, solarDeclination(n)];
}

/** Antipode of a [lon, lat] point: the centre of the night hemisphere. */
export function antipode(p: LonLat): LonLat {
  return [p[0] > 0 ? p[0] - 180 : p[0] + 180, -p[1]];
}

/** Great-circle distance in degrees. */
export function angularDistanceDeg(a: LonLat, b: LonLat): number {
  const [l1, p1] = [a[0] * RAD, a[1] * RAD], [l2, p2] = [b[0] * RAD, b[1] * RAD];
  const c = Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(l1 - l2);
  return Math.acos(Math.max(-1, Math.min(1, c))) / RAD;
}

/**
 * How dark it is at a point, 0 (day) to 1 (full night). Sun elevation 0 degrees is the terminator; the ramp runs through
 * civil and nautical twilight (to minus 12 degrees), so a city's lights fade in as the evening deepens instead of popping.
 */
export function nightFactor(point: LonLat, sun: LonLat): number {
  const elevation = 90 - angularDistanceDeg(point, sun);
  if (elevation >= 0) return 0;
  return Math.min(1, -elevation / 12);
}

/**
 * Bands of the night shade as circles around the antisolar point. A circle of radius r has its edge at sun elevation r - 90,
 * so 96 is a soft penumbra on the day side, 90 is the terminator itself and 84 / 78 are civil and nautical twilight.
 */
export const NIGHT_BANDS = [
  { radius: 96, className: 'night-band-penumbra' },
  { radius: 90, className: 'night-band-terminator' },
  { radius: 84, className: 'night-band-civil' },
  { radius: 78, className: 'night-band-deep' },
] as const;

/** Phase 9.8: layout of the semicircular seating chart. Drawing only; the seat counts come from the engine. */
export interface SeatDot { x: number; y: number; group: number }

/** The blocs from left to right across the chamber. */
export const HEMICYCLE_ORDER = ['labour', 'liberal', 'business', 'traditional', 'security'] as const;

export const HEMICYCLE_WIDTH = 400;
export const HEMICYCLE_HEIGHT = 210;
export const SEAT_RADIUS = 6;
const CENTER_X = 200, CENTER_Y = 200, INNER = 82, OUTER = 190, ROWS = 7;

/**
 * Seats in concentric rows (more seats on the outer rows), then handed out from the left wing to the right one so that
 * each group fills a wedge. `counts[g]` seats go to group g; the dots always sum to the total.
 */
export function hemicycleLayout(counts: readonly number[]): SeatDot[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  const radii = Array.from({ length: ROWS }, (_, i) => INNER + ((OUTER - INNER) * i) / (ROWS - 1));
  const radiusSum = radii.reduce((a, b) => a + b, 0);
  const perRow = radii.map(r => Math.floor((total * r) / radiusSum));
  for (let i = ROWS - 1, left = total - perRow.reduce((a, b) => a + b, 0); left > 0; i = (i + ROWS - 1) % ROWS, left--) perRow[i] += 1;
  const dots: { x: number; y: number; angle: number }[] = [];
  radii.forEach((radius, row) => {
    const n = perRow[row];
    for (let j = 0; j < n; j++) {
      const angle = n === 1 ? Math.PI / 2 : Math.PI * (1 - j / (n - 1));
      dots.push({ x: CENTER_X + radius * Math.cos(angle), y: CENTER_Y - radius * Math.sin(angle), angle });
    }
  });
  dots.sort((a, b) => b.angle - a.angle || b.y - a.y);
  const groupOf: number[] = [];
  counts.forEach((count, group) => { for (let i = 0; i < count; i++) groupOf.push(group); });
  return dots.map((d, i) => ({ x: Math.round(d.x * 10) / 10, y: Math.round(d.y * 10) / 10, group: groupOf[i] }));
}

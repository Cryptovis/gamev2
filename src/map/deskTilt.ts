/**
 * playtest.17 (Phase 6.3): pointer mapping for the 18° desk tilt. Pure maths, no DOM.
 * CSS perspective cannot be represented by `getScreenCTM()`, so clicks are un-projected analytically.
 * The perspective is set on `.world-map` and the SVG fills it, so the "box" is `.world-map`'s client rect.
 */
export const DESK_TILT = { degrees: 18, perspective: 1600, scale: 1.12, originX: 0.5, originY: 1, perspectiveX: 0.5, perspectiveY: 0.4 };
export type DeskTilt = typeof DESK_TILT;

/** Element-local point (px, relative to the untransformed SVG box) for a point on screen (px, relative to the same box). */
export function untilt(X: number, Y: number, boxW: number, boxH: number, t: DeskTilt = DESK_TILT): [number, number] {
  const th = t.degrees * Math.PI / 180, c = Math.cos(th), s = Math.sin(th), d = t.perspective;
  const cx = boxW * t.originX, cy = boxH * t.originY, ox = boxW * t.perspectiveX, oy = boxH * t.perspectiveY;
  const v = d * ((Y - oy) - (cy - oy)) / (d * c + (Y - oy) * s);   // scaled offset below the origin, before rotation
  const k = d / (d - v * s);                                        // perspective factor at that depth
  const u = (X - ox) / k + ox - cx;
  return [cx + u / t.scale, cy + v / t.scale];
}

/** Inverse of untilt (for tests and for placing DOM overlays). */
export function tilt(x: number, y: number, boxW: number, boxH: number, t: DeskTilt = DESK_TILT): [number, number] {
  const th = t.degrees * Math.PI / 180, d = t.perspective, cx = boxW * t.originX, cy = boxH * t.originY, ox = boxW * t.perspectiveX, oy = boxH * t.perspectiveY;
  const u = (x - cx) * t.scale, v = (y - cy) * t.scale, X1 = cx + u, Y1 = cy + v * Math.cos(th), Z1 = v * Math.sin(th), k = d / (d - Z1);
  return [ox + (X1 - ox) * k, oy + (Y1 - oy) * k];
}

/** SVG viewBox point (1200×700, preserveAspectRatio xMidYMid meet) from element-local pixels. */
export function toViewBox(x: number, y: number, boxW: number, boxH: number): [number, number] {
  const k = Math.min(boxW / 1200, boxH / 700), ox = (boxW - 1200 * k) / 2, oy = (boxH - 700 * k) / 2;
  return [(x - ox) / k, (y - oy) / k];
}

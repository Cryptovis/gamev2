// Phase 9.5 stage 1: major river courses as [lon, lat] waypoints, hand-digitised from gazetteer positions of well-known
// towns and confluences along each river (source to mouth). They are cartographic approximations at world scale, not survey
// data: good to roughly 10 to 30 km, which is under a pixel at the zoom levels the game offers. Natural Earth
// ne_50m_rivers_lake_centerlines can replace this file when a build environment with network access is available.
// Presentation data only; never read by the engine.
export type River = { id: string; points: [number, number][] };

export const RIVERS: River[] = [
  { id: 'Danube', points: [[8.5, 47.95], [9.99, 48.4], [11.42, 48.76], [12.1, 49.02], [13.47, 48.57], [14.29, 48.31], [16.38, 48.22], [17.11, 48.14], [18.75, 47.8], [19.04, 47.5], [18.9, 46.6], [18.68, 45.99], [19.85, 45.25], [20.45, 44.82], [22.5, 44.67], [22.87, 43.99], [24.9, 43.7], [25.95, 43.85], [27.27, 44.12], [28.03, 44.33], [27.97, 45.27], [28.05, 45.43], [28.8, 45.18], [29.67, 45.16]] },
  { id: 'Rhine', points: [[9.5, 47.5], [8.6, 47.65], [7.59, 47.56], [7.8, 48.58], [8.3, 49.0], [8.46, 49.49], [8.27, 50.0], [7.6, 50.36], [7.1, 50.73], [6.96, 50.94], [6.77, 51.23], [6.73, 51.45], [6.2, 51.83], [5.85, 51.85], [4.9, 51.95], [4.1, 51.95], [4.0, 51.98]] },
  { id: 'Nile', points: [[33.2, 0.43], [32.9, 1.7], [31.4, 2.2], [32.0, 3.6], [31.6, 4.85], [31.6, 6.2], [30.7, 8.0], [31.65, 9.53], [32.7, 13.17], [32.5, 15.6], [33.97, 17.68], [33.33, 19.53], [31.85, 18.55], [30.48, 19.17], [31.3, 21.8], [32.9, 24.1], [32.65, 25.7], [31.2, 27.2], [31.25, 30.05], [30.4, 31.45]] },
  { id: 'Tigris', points: [[39.4, 38.5], [40.2, 37.9], [42.2, 37.33], [43.13, 36.35], [43.5, 34.93], [43.88, 34.2], [44.38, 33.3], [45.8, 32.5], [47.15, 31.85], [47.43, 31.0]] },
  { id: 'Euphrates', points: [[38.75, 38.8], [38.5, 37.5], [38.0, 36.82], [39.0, 35.95], [40.15, 35.33], [40.93, 34.45], [42.38, 34.13], [43.3, 33.42], [43.78, 33.35], [44.42, 32.48], [45.28, 31.3], [46.25, 31.05], [47.43, 31.0], [47.78, 30.52], [48.5, 29.95]] },
  { id: 'Amazon', points: [[-73.55, -4.5], [-73.25, -3.75], [-69.95, -4.22], [-67.94, -3.1], [-66.1, -2.52], [-64.7, -3.35], [-63.14, -4.08], [-60.0, -3.1], [-56.75, -2.63], [-55.5, -1.9], [-54.7, -2.43], [-52.6, -1.5], [-51.1, -0.2], [-50.3, 0.0]] },
  { id: 'Yangtze', points: [[97.0, 33.0], [99.1, 30.0], [99.95, 26.9], [101.7, 26.6], [104.65, 28.77], [106.55, 29.56], [111.3, 30.7], [112.2, 30.35], [114.3, 30.58], [116.0, 29.7], [117.05, 30.5], [118.78, 32.07], [119.45, 32.2], [121.9, 31.4]] },
  { id: 'Mississippi', points: [[-95.2, 47.24], [-93.5, 47.2], [-93.25, 44.98], [-91.25, 43.8], [-90.65, 42.5], [-90.57, 41.52], [-91.4, 39.93], [-90.18, 38.63], [-89.17, 37.0], [-90.07, 35.15], [-90.88, 32.35], [-91.4, 31.56], [-91.2, 30.45], [-90.05, 29.95], [-89.2, 29.0]] },
  { id: 'Volga', points: [[32.5, 57.25], [35.9, 56.86], [39.9, 57.62], [44.0, 56.33], [47.25, 56.13], [49.1, 55.8], [48.4, 54.3], [49.4, 53.5], [50.1, 53.2], [46.0, 51.55], [44.5, 48.7], [48.0, 46.35], [49.0, 45.8]] },
];

/**
 * Catmull-Rom densification in lon/lat space: turns the waypoint polyline into a gently meandering curve so a river does not
 * read as a chain of straight great-circle chords. Pure; the result is cached by the caller.
 */
export function smoothRiver(points: [number, number][], steps = 4): [number, number][] {
  if (points.length < 3) return points.slice();
  const out: [number, number][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

export const RIVER_FEATURES = RIVERS.map((r) => ({
  type: 'Feature' as const,
  properties: { id: r.id },
  geometry: { type: 'LineString' as const, coordinates: smoothRiver(r.points) },
}));

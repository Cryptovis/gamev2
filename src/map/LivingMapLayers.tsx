// Phase 9.5 stage 1: the living geographic map. Three presentation-only layers drawn on top of the Blue Marble surface:
//   ShelfHalo     turquoise continental-shelf glow along every coastline
//   RiverLayer    the major river vectors
//   NightLayer    astronomical day/night shade plus city lights
// They reuse the country paths and the projection WorldMap already computed each frame, add no raster work and no timers
// beyond one 60 second clock tick, so panning and rotation cost stays within the existing budget.
import { useEffect, useMemo, useState } from 'react';
import { geoCircle, type GeoPath, type GeoProjection } from 'd3-geo';
import { RIVER_FEATURES } from './riverData';
import { NIGHT_CITIES } from './nightCities';
import { NIGHT_BANDS, antipode, nightFactor, subsolarPoint, type LonLat } from './solarTerminator';

const W = 1200;
const H = 700;

/** Hour of day (UTC, fractional) used for the sun. Refreshes once a minute; window.__RON_SUN_HOUR pins it for tests. */
export function currentSunHour(now: Date = new Date()): number {
  const pinned = typeof window !== 'undefined' ? (window as unknown as { __RON_SUN_HOUR?: unknown }).__RON_SUN_HOUR : undefined;
  if (typeof pinned === 'number' && Number.isFinite(pinned)) return pinned;
  return now.getUTCHours() + now.getUTCMinutes() / 60;
}
export function useSunHour(): number {
  const [hour, setHour] = useState(() => currentSunHour());
  useEffect(() => {
    const id = window.setInterval(() => setHour(currentSunHour()), 60000);
    return () => window.clearInterval(id);
  }, []);
  return hour;
}

/** Shelf glow: three non-scaling strokes (about 8, 5.5 and 3 px) of the land outline, masked so only the sea side shows. */
export function ShelfHalo({ landPath, transform }: { landPath: string; transform?: string }) {
  if (!landPath) return null;
  return (
    <g className="shelf-halo-layer" data-layer="shelf-halo" pointerEvents="none" aria-hidden="true" transform={transform}>
      <defs>
        <mask id="shelf-sea-mask" maskUnits="userSpaceOnUse" x={-W} y={-H} width={W * 3} height={H * 3}>
          <rect x={-W} y={-H} width={W * 3} height={H * 3} fill="#fff" />
          {/* The black stroke also closes the hairline seams between neighbouring countries. */}
          <path d={landPath} fill="#000" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
        </mask>
      </defs>
      <g mask="url(#shelf-sea-mask)">
        <path d={landPath} className="shelf-halo shelf-halo-wide" />
        <path d={landPath} className="shelf-halo shelf-halo-mid" />
        <path d={landPath} className="shelf-halo shelf-halo-near" />
      </g>
    </g>
  );
}

export function RiverLayer({ path, transform }: { path: GeoPath; transform?: string }) {
  const d = useMemo(() => path({ type: 'FeatureCollection', features: RIVER_FEATURES } as any) ?? '', [path]);
  if (!d) return null;
  return (
    <g className="river-layer" data-layer="rivers" data-river-count={RIVER_FEATURES.length} pointerEvents="none" aria-hidden="true" transform={transform}>
      <path d={d} className="river-glow" />
      <path d={d} className="river-line" />
    </g>
  );
}

export function NightLayer({
  path,
  projection,
  project,
  date,
  hour,
  transform,
}: {
  path: GeoPath;
  projection: GeoProjection;
  /** Screen position of a lon/lat, or null when it is on the far side of the globe. */
  project: (p: LonLat) => [number, number] | null;
  date: string;
  hour: number;
  transform?: string;
}) {
  const sun = useMemo(() => subsolarPoint(date, hour), [date, hour]);
  const night = useMemo(() => antipode(sun), [sun]);
  const bands = useMemo(
    () => NIGHT_BANDS.map((b) => ({ ...b, d: path(geoCircle().center(night).radius(b.radius).precision(3)() as any) ?? '' })),
    [path, night, projection],
  );
  const lights = useMemo(() => {
    const out: { id: string; x: number; y: number; weight: number; level: number }[] = [];
    for (const city of NIGHT_CITIES) {
      const level = nightFactor(city.position, sun);
      if (level <= 0) continue;
      const p = project(city.position);
      if (p) out.push({ id: city.id, x: p[0], y: p[1], weight: city.weight, level });
    }
    return out;
  }, [project, sun]);
  return (
    <>
      <g className="night-layer" data-layer="night" data-sun-lon={sun[0].toFixed(2)} data-sun-lat={sun[1].toFixed(2)} pointerEvents="none" aria-hidden="true" transform={transform}>
        {bands.map((b) => (b.d ? <path key={b.className} d={b.d} className={`night-band ${b.className}`} /> : null))}
      </g>
      <g className="night-lights-layer" data-layer="night-lights" data-lit-cities={lights.length} pointerEvents="none" aria-hidden="true">
        <defs>
          <radialGradient id="night-light-glow">
            <stop offset="0" className="night-glow-stop-core" />
            <stop offset=".35" className="night-glow-stop-mid" />
            <stop offset="1" className="night-glow-stop-edge" />
          </radialGradient>
        </defs>
        {lights.map((l) => (
          <g key={l.id} className={`night-light weight-${l.weight}`} data-city={l.id} transform={`translate(${l.x.toFixed(1)},${l.y.toFixed(1)})`} opacity={Math.min(1, 0.25 + l.level * 0.75)}>
            <circle className="night-light-glow" r={4 + l.weight * 3.5} fill="url(#night-light-glow)" />
            <circle className="night-light-core" r={0.9 + l.weight * 0.35} />
          </g>
        ))}
      </g>
    </>
  );
}

// Phase 9.5 stage 2: presentation-only world layers (alpine relief, trade lanes, frontlines, combat effects).
// Everything is derived from the map camera and read-only game state; nothing here writes to the store or the engine.
import { useEffect, useMemo, useRef, useState } from 'react';
import { CargoPlaneShape } from '../ui/icons/AircraftIcons';
import { pointAt, type TradeRoute } from './tradeRoutes';
import { PEAKS } from './mountainData';
import { reliefPaths } from './mountainRelief';
import type { LonLat } from './mountainData';
import type { WarFront } from './frontlinesView';

export function MountainRelief({ project, pixelsPerDegree, globeCenter }: { project: (p: LonLat) => [number, number] | null; pixelsPerDegree: number; globeCenter?: LonLat }) {
  const paths = useMemo(() => reliefPaths(PEAKS, { project, pixelsPerDegree, globeCenter }), [project, pixelsPerDegree, globeCenter?.[0], globeCenter?.[1]]);
  if (!paths.count) return null;
  return (
    <g className="mountain-layer" data-layer="mountains" data-peaks={paths.count} pointerEvents="none" aria-hidden="true">
      <path className="peak-lit" d={paths.lit} />
      <path className="peak-shade" d={paths.shade} />
      {paths.snow && <path className="peak-snow" d={paths.snow} />}
      {paths.snowShade && <path className="peak-snow-shade" d={paths.snowShade} />}
    </g>
  );
}

/** Glowing dashed front bands in both belligerents' colours, with troop-density chevrons on each side. */
export function FrontlineLayer({ fronts }: { fronts: WarFront[] }) {
  if (!fronts.length) return null;
  return (
    <g className="frontline-layer" data-layer="frontlines" data-fronts={fronts.length} pointerEvents="none" aria-hidden="true">
      {fronts.map((f) => (
        <g key={f.id} className={`frontline kind-${f.kind}${f.mine ? ' is-mine' : ''}`} data-war={f.id} data-attacker-level={f.levels.attacker} data-defender-level={f.levels.defender}>
          <path d={f.path} className="front-glow" />
          <path d={f.path} className="front-atk" style={{ stroke: f.attackerColor }} />
          <path d={f.path} className="front-def" style={{ stroke: f.defenderColor }} />
          {f.attackerPips && <path d={f.attackerPips} className="front-pips front-pips-atk" style={{ stroke: f.attackerColor }} />}
          {f.defenderPips && <path d={f.defenderPips} className="front-pips front-pips-def" style={{ stroke: f.defenderColor }} />}
        </g>
      ))}
    </g>
  );
}

const SPARKS = [[-9, -7], [8, -9], [11, 3], [-10, 5], [2, -12], [-3, 10]] as const;
/** Artillery flash, sparks and smoke at the points of an assault. Pure CSS animation: no React renders per frame. */
export function CombatFx({ fronts }: { fronts: WarFront[] }) {
  const points = fronts.flatMap((f) => f.fx.map((p, i) => ({ ...p, key: `${f.id}:${i}`, war: f.id })));
  if (!points.length) return null;
  return (
    <g className="combat-fx-layer" data-layer="combat-fx" data-fx={points.length} pointerEvents="none" aria-hidden="true">
      {points.map((p) => (
        <g key={p.key} className="combat-fx" data-war={p.war} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${p.size})`} style={{ ['--fx-delay' as string]: `${p.delay}s` }}>
          <circle className="fx-smoke fx-smoke-a" r="4" cx="-3" cy="-2" />
          <circle className="fx-smoke fx-smoke-b" r="5" cx="3" cy="-4" />
          <circle className="fx-smoke fx-smoke-c" r="3.5" cx="0" cy="-6" />
          <circle className="fx-flash" r="5" />
          <circle className="fx-core" r="2" />
          {SPARKS.map(([dx, dy], i) => <circle key={i} className="fx-spark" r="0.9" style={{ ['--dx' as string]: `${dx}px`, ['--dy' as string]: `${dy}px`, animationDelay: `calc(var(--fx-delay) + ${i * 0.11}s)` }} />)}
        </g>
      ))}
    </g>
  );
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)'), update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

export const SHIP_SPEED = 14, AIR_SPEED = 30;
const carrierKey = (route: TradeRoute, k: number) => `${route.id}#${k}`;
const carrierDistance = (route: TradeRoute, k: number, seconds: number) =>
  route.phase * route.total + (k * route.total) / Math.max(1, route.carriers) + seconds * (route.mode === 'sea' ? SHIP_SPEED : AIR_SPEED);

/** Top-down container ship, bow to the right. */
function ShipShape() {
  return (
    <>
      <path className="ship-hull" d="M-6.4 -2.3L3.6 -2.3 6.8 0 3.6 2.3-6.4 2.3z" />
      <rect className="ship-box ship-box-a" x="-4.8" y="-1.5" width="2.4" height="3" />
      <rect className="ship-box ship-box-b" x="-2" y="-1.5" width="2.2" height="3" />
      <rect className="ship-bridge" x="1" y="-1.3" width="1.6" height="2.6" />
    </>
  );
}

/** Sea lanes and air corridors for active trade, with moving carriers; sanctioned routes are dashed red with an interception marker. */
export function TradeLayer({ routes }: { routes: TradeRoute[] }) {
  const reduced = useReducedMotion();
  const nodes = useRef(new Map<string, SVGGElement>());
  const latest = useRef(routes);
  latest.current = routes;
  const place = (route: TradeRoute, k: number, seconds: number) => {
    const at = pointAt(route, carrierDistance(route, k, seconds));
    return at ? `translate(${at.x.toFixed(1)} ${at.y.toFixed(1)}) rotate(${at.heading.toFixed(1)})` : 'translate(-99 -99)';
  };
  useEffect(() => {
    if (reduced || !routes.some((r) => r.carriers > 0)) return;
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      if (!document.hidden) {
        const seconds = (now - start) / 1000;
        for (const route of latest.current) for (let k = 0; k < route.carriers; k++) nodes.current.get(carrierKey(route, k))?.setAttribute('transform', place(route, k, seconds));
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [reduced, routes]);
  if (!routes.length) return null;
  return (
    <g className="trade-layer" data-layer="trade" data-routes={routes.length} data-sea={routes.filter((r) => r.mode === 'sea').length} data-air={routes.filter((r) => r.mode === 'air').length} data-sanctioned={routes.filter((r) => r.sanctioned).length} pointerEvents="none" aria-hidden="true">
      <defs>
        <g id="blockade-marker">
          <circle className="blockade-ring" r="7" />
          <path className="blockade-ship" d="M-4 1.4L4 1.4 2.8 3.4 -2.8 3.4z M-1 1.4V-2.4h2.2v3.8z" />
          <path className="blockade-bar" d="M-4.8 -4.8L4.8 4.8" />
        </g>
      </defs>
      {routes.map((r) => (
        <g key={r.id} className={`trade-route mode-${r.mode}${r.sanctioned ? ' is-sanctioned' : ''}${r.mine ? ' is-mine' : ''}`} data-route={r.id}>
          <path d={r.path} className="trade-glow" />
          <path d={r.path} className="trade-line" />
        </g>
      ))}
      {routes.map((r) => Array.from({ length: r.carriers }, (_, k) => (
        <g key={carrierKey(r, k)} ref={(el) => { if (el) nodes.current.set(carrierKey(r, k), el); else nodes.current.delete(carrierKey(r, k)); }} className={`trade-carrier carrier-${r.mode}${r.mine ? ' is-mine' : ''}`} data-carrier={r.mode} transform={place(r, k, reduced ? 0 : 0)}>
          {r.mode === 'sea' ? <g transform="scale(1.3)"><ShipShape /></g> : <g transform="scale(.6)"><CargoPlaneShape /></g>}
        </g>
      )))}
      {routes.filter((r) => r.marker).map((r) => (
        <use key={`${r.id}!`} href="#blockade-marker" className="blockade" data-blockade={r.id} transform={`translate(${r.marker![0].toFixed(1)} ${r.marker![1].toFixed(1)})`} />
      ))}
    </g>
  );
}

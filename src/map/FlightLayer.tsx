import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { Flight } from '../domain/flights';
import { activeClockInterval } from '../engine/clockState';
import { countryPosition, flightProgress } from '../engine/systems/flights';
import { translateLive } from '../i18n/localeText';
import { useGameStore } from '../store/gameStore';
import { AircraftGlyph, AircraftShape } from '../ui/icons/AircraftIcons';
import { arcPathData, greatCircleArc, placeAircraft, renderDay, type LonLat, type ScreenPoint } from './flightPath';
import { etaDays, playerFlightsInTransit, recentlyLanded } from './flightPresentation';
import '../ui/styles/flights.css';

/**
 * 0.89 flight layer. Reads `world.flights` only and never decides outcomes. Aircraft move along great-circle arcs by
 * `flightProgress` on a render day = simulation day + the elapsed fraction of the current day on the render clock,
 * so they glide while time runs and stop when the clock stops. Only this layer re-renders per animation frame.
 */

export type FlightProjector = (position: LonLat) => ScreenPoint | null;

/** Icon scale: the shapes are ~18 units long, drawn at roughly 14–16 px regardless of map zoom. */
const ICON_SCALE = { diplomatic: 0.78, cargo: 0.9 } as const;
/** Minimum time between render-clock commits; ~30 fps is smooth for slow aircraft and cheap. */
const FRAME_MS = 33;

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const canMatchMedia = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => canMatchMedia() && window.matchMedia(REDUCED_MOTION).matches);
  useEffect(() => {
    if (!canMatchMedia()) return;
    const query = window.matchMedia(REDUCED_MOTION), update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

/**
 * Render clock: fraction (0–0.999) of the current campaign day that has elapsed while the simulation clock runs.
 * Resets when the day advances; frozen while paused, blocked or with reduced motion.
 */
function useRenderDay(animate: boolean): number {
  const day = useGameStore((s) => s.day);
  const interval = useGameStore(activeClockInterval);
  const fractionRef = useRef(0);
  const fractionDayRef = useRef(day);
  const [fraction, setFraction] = useState(0);

  useEffect(() => { fractionRef.current = 0; fractionDayRef.current = day; setFraction(0); }, [day]);

  useEffect(() => {
    if (!animate || interval === null) return;
    let frame = 0, last = performance.now(), committed = last;
    const step = (now: number) => {
      fractionRef.current = Math.min(0.999, fractionRef.current + Math.max(0, now - last) / interval);
      last = now;
      if (now - committed >= FRAME_MS) { committed = now; setFraction(fractionRef.current); }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [animate, interval]);

  // The first render of a new day still holds the old fraction until the reset effect runs; ignore it.
  return renderDay(day, animate && fractionDayRef.current === day ? fraction : 0);
}

interface Route { flight: Flight; from: LonLat; to: LonLat; d: string; player: boolean }

function FlightLayerView({ project }: { project: FlightProjector }) {
  const list = useGameStore((s) => s.world.flights);
  const playerId = useGameStore((s) => s.playerCountryId);
  const countries = useGameStore((s) => s.countries);
  useGameStore((s) => s.playerProfile.language); // re-render tooltips when the language changes
  const reducedMotion = usePrefersReducedMotion();
  const enroute = useMemo(() => (list ?? []).filter((f) => f.status === 'enroute'), [list]);
  const day = useRenderDay(!reducedMotion && enroute.length > 0);
  const simulationDay = Math.floor(day);

  // Arcs depend on the camera and the flight list, not on the render clock.
  const routes = useMemo<Route[]>(() => enroute.flatMap((flight) => {
    const from = countryPosition(flight.fromId), to = countryPosition(flight.toId);
    if (!from || !to) return [];
    return [{ flight, from, to, d: arcPathData(greatCircleArc(from, to, 40), project), player: flight.fromId === playerId || flight.toId === playerId }];
  }), [enroute, project, playerId]);

  const landings = useMemo(() => recentlyLanded(list, simulationDay).flatMap((flight) => {
    const position = countryPosition(flight.toId), point = position ? project(position) : null;
    return point ? [{ flight, point }] : [];
  }), [list, simulationDay, project]);

  if (!routes.length && !landings.length) return null;
  const name = (id: string) => translateLive(countries[id]?.name ?? id);

  return <g className={`flight-layer${reducedMotion ? ' reduced-motion' : ''}`} aria-label={translateLive('Flights in transit')}>
    <g className="flight-routes" pointerEvents="none">
      {routes.map(({ flight, d, player }, index) => !d ? null : <g key={`${flight.id}-${index}`} className={`flight-route flight-${flight.kind}${player ? ' is-player' : ''}`}>
        <path d={d} className="flight-route-glow"/>
        <path d={d} className="flight-route-line"/>
      </g>)}
    </g>
    <g className="flight-landings" pointerEvents="none">
      {landings.map(({ flight, point }, index) => <g key={`${flight.id}-${index}`} className={`flight-landing flight-${flight.kind}`} transform={`translate(${point[0].toFixed(1)} ${point[1].toFixed(1)})`}>
        <circle r={3} className="flight-landing-core"/>
        <circle r={4} className="flight-landing-ring"/>
      </g>)}
    </g>
    <g className="flight-aircraft-layer">
      {routes.map(({ flight, from, to, player }, index) => {
        const origin = project(from);
        const placed = placeAircraft(from, to, flightProgress(flight, day), project);
        const eta = etaDays(flight, simulationDay);
        const summary = `${translateLive(flight.label)} · ${name(flight.fromId)} → ${name(flight.toId)} · ${translateLive(`Arrives day ${flight.arriveDay}`)}${eta > 0 ? ` (${translateLive(eta === 1 ? 'Arrives tomorrow' : `Arrives in ${eta} days`)})` : ''}`;
        return <g key={`${flight.id}-${index}`} className={`flight-${flight.kind}${player ? ' is-player' : ''}`}>
          {origin && <circle className="flight-origin" cx={origin[0]} cy={origin[1]} r={2.2} pointerEvents="none"/>}
          {placed && <g className="flight-aircraft" role="img" aria-label={summary} transform={`translate(${placed.point[0].toFixed(1)} ${placed.point[1].toFixed(1)})`}>
            <title>{summary}</title>
            <circle className="flight-hit-target" r={9}/>
            {/* The shadow falls the same way whatever the heading, as if lit from the upper left. */}
            <g transform={`translate(1.2 1.8) rotate(${placed.heading.toFixed(1)}) scale(${ICON_SCALE[flight.kind]})`} className="aircraft-shadow"><AircraftShape kind={flight.kind}/></g>
            <g transform={`rotate(${placed.heading.toFixed(1)}) scale(${ICON_SCALE[flight.kind]})`} className="aircraft-shape"><AircraftShape kind={flight.kind}/></g>
          </g>}
        </g>;
      })}
    </g>
  </g>;
}
export const FlightLayer = memo(FlightLayerView);

/** Compact HUD chip listing the player's aircraft in the air with their ETA, from engine data. */
function FlightTransitView() {
  const list = useGameStore((s) => s.world.flights);
  const playerId = useGameStore((s) => s.playerCountryId);
  const day = useGameStore((s) => s.day);
  const countries = useGameStore((s) => s.countries);
  useGameStore((s) => s.playerProfile.language);
  const [open, setOpen] = useState(false);
  const transit = useMemo(() => playerFlightsInTransit(list, playerId), [list, playerId]);
  if (!transit.length) return null;
  const name = (id: string) => translateLive(countries[id]?.name ?? id);
  const leading = transit[0].kind;
  return <div className="flight-transit">
    <button type="button" className="flight-transit-toggle" aria-expanded={open} aria-label={`${translateLive('In transit')}: ${transit.length}`} title={translateLive('In transit')} onClick={() => setOpen((v) => !v)}>
      <AircraftGlyph kind={leading} size={16}/><span>{transit.length}</span>
    </button>
    {open && <div className="flight-transit-list" role="list" aria-label={translateLive('In transit')}>
      <strong>{translateLive('In transit')}</strong>
      {transit.slice(0, 8).map((flight) => {
        const eta = etaDays(flight, day);
        return <div key={flight.id} role="listitem" className={`flight-transit-item flight-${flight.kind}`}>
          <AircraftGlyph kind={flight.kind} size={15}/>
          <span><b>{translateLive(flight.label)}</b><small>{name(flight.fromId)} → {name(flight.toId)}</small></span>
          <em>{translateLive(eta <= 0 ? 'Arrives today' : eta === 1 ? 'Arrives tomorrow' : `Arrives in ${eta} days`)}</em>
        </div>;
      })}
    </div>}
  </div>;
}
export const FlightTransit = memo(FlightTransitView);

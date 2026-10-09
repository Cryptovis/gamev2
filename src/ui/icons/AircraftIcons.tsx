import type { FlightKind } from '../../domain/flights';

/**
 * 0.89 aircraft drawn as plain vector shapes (no livery or brand). Both point nose-right (+x), centred on the origin,
 * about 18 units long, so a map layer can translate, rotate and scale them as one group.
 */

/** Slim business jet: swept wings, T-tail and two rear engine pods. Used for diplomatic flights. */
export function BusinessJetShape() {
  return <>
    <path d="M1.6 -0.9 L-2.6 -6.4 L-4.1 -6.4 L-2.4 -0.9Z M1.6 0.9 L-2.6 6.4 L-4.1 6.4 L-2.4 0.9Z" className="aircraft-wing"/>
    <path d="M-5.6 -0.6 L-7.6 -3.3 L-8.6 -3.3 L-7.5 -0.6Z M-5.6 0.6 L-7.6 3.3 L-8.6 3.3 L-7.5 0.6Z" className="aircraft-wing"/>
    <rect x="-6.1" y="-2.15" width="2.8" height="1.1" rx="0.55" className="aircraft-engine"/>
    <rect x="-6.1" y="1.05" width="2.8" height="1.1" rx="0.55" className="aircraft-engine"/>
    <path d="M8.6 0 C7.6 -1.05 5 -1.15 -5.2 -1.05 L-8 -0.45 L-8 0.45 L-5.2 1.05 C5 1.15 7.6 1.05 8.6 0Z" className="aircraft-body"/>
    <path d="M7.1 -0.45 L5.9 -0.6 L5.9 0.6 L7.1 0.45Z" className="aircraft-glass"/>
  </>;
}

/** Wide high-wing freighter: straight wings, four engines and a broad fuselage. Used for cargo flights. */
export function CargoPlaneShape() {
  return <>
    <path d="M2.4 -1.8 L0.2 -9.2 L-1.9 -9.2 L-1.6 -1.8Z M2.4 1.8 L0.2 9.2 L-1.9 9.2 L-1.6 1.8Z" className="aircraft-wing"/>
    <path d="M-6 -1.1 L-7.9 -4.6 L-9.2 -4.6 L-8.4 -1.1Z M-6 1.1 L-7.9 4.6 L-9.2 4.6 L-8.4 1.1Z" className="aircraft-wing"/>
    <ellipse cx="1.9" cy="-4.2" rx="1.5" ry="0.65" className="aircraft-engine"/>
    <ellipse cx="1.2" cy="-6.9" rx="1.5" ry="0.65" className="aircraft-engine"/>
    <ellipse cx="1.9" cy="4.2" rx="1.5" ry="0.65" className="aircraft-engine"/>
    <ellipse cx="1.2" cy="6.9" rx="1.5" ry="0.65" className="aircraft-engine"/>
    <path d="M8.6 0 C8.2 -1.9 5.6 -2.1 -4.4 -2.05 L-8.9 -0.8 L-8.9 0.8 L-4.4 2.05 C5.6 2.1 8.2 1.9 8.6 0Z" className="aircraft-body"/>
    <path d="M7.6 -0.7 L6.5 -0.95 L6.5 0.95 L7.6 0.7Z" className="aircraft-glass"/>
  </>;
}

export function AircraftShape({ kind }: { kind: FlightKind }) {
  return kind === 'diplomatic' ? <BusinessJetShape/> : <CargoPlaneShape/>;
}

/** Standalone inline icon (HUD lists, news lines). Drawn nose-up-right like a departing aircraft. */
export function AircraftGlyph({ kind, size = 14, title }: { kind: FlightKind; size?: number; title?: string }) {
  return <svg className={`aircraft-glyph aircraft-${kind}`} width={size} height={size} viewBox="-10 -10 20 20" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
    <g transform="rotate(-35)"><AircraftShape kind={kind}/></g>
  </svg>;
}

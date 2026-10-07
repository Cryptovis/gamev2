import { geoCentroid } from 'd3-geo';
import { MICROSTATE_POINTS } from '../data/microstates';
import type { CountryMapFeature } from './mapSelection';

export type MapPoint = [number, number];

export function countryMapAnchor(id: string, feature?: CountryMapFeature): MapPoint | null {
  const point = MICROSTATE_POINTS[id] ?? (feature ? geoCentroid(feature as never) : null);
  if (!point || !point.every(Number.isFinite) || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90) return null;
  return point;
}

export function microstateVisible(zoom: number, flat: boolean, selected: boolean, hovered: boolean, player = false) {
  return selected || hovered || player || zoom >= (flat ? 2.6 : 1.55);
}

export function nearestMapMarker<T extends { id: string; point: MapPoint }>(markers: T[], point: MapPoint, radius = 12): T | null {
  let closest: T | null = null;
  let distance = radius;
  for (const marker of markers) {
    const next = Math.hypot(marker.point[0] - point[0], marker.point[1] - point[1]);
    if (next <= distance) { closest = marker; distance = next; }
  }
  return closest;
}

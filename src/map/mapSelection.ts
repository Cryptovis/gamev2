import { geoContains } from 'd3-geo';

export type CountryMapFeature = {
  type: 'Feature';
  geometry: unknown;
  properties: { iso_a3?: string; name?: string };
};

export function findCountryAtGeoPoint(
  features: CountryMapFeature[],
  selectableCountryIds: Set<string>,
  point: [number, number],
) {
  for (const feature of features) {
    const id = String(feature.properties?.iso_a3 ?? '');
    if (!id || !selectableCountryIds.has(id)) continue;
    if (geoContains(feature as never, point)) return id;
  }
  return null;
}

export type MapMode = 'political' | 'relations' | 'diplomacy' | 'resources' | 'military' | 'religion' | 'ideology';
export type MapPresentation = 'political' | 'geographic';

export interface MapCountrySelection {
  iso2: string;
  name: string;
}

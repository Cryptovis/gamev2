import type { MinistryKey } from '../domain/game';

export interface MinistryDefinition {
  id: MinistryKey;
  name: string;
  shortName: string;
  description: string;
  accent: string;
  art: string;
}

export const MINISTRY_DEFINITIONS: MinistryDefinition[] = [
  { id: 'economy', name: 'Ministry of Economy', shortName: 'ECONOMY', description: 'Productivity, industrial utilization and fiscal resilience.', accent: '#d7b35a', art: '/assets/visual-pack-1/ministry-economy.svg' },
  { id: 'defense', name: 'Ministry of Defense', shortName: 'DEFENSE', description: 'Readiness, logistics and force sustainment.', accent: '#c76d63', art: '/assets/visual-pack-1/ministry-defense.svg' },
  { id: 'science', name: 'Science & Education Directorate', shortName: 'SCIENCE', description: 'Generates research points and long-run productivity.', accent: '#68b8d5', art: '/assets/visual-pack-1/ministry-science.svg' },
  { id: 'intelligence', name: 'National Intelligence Service', shortName: 'INTEL', description: 'Network strength, counter-intelligence and confidence.', accent: '#8a7bd1', art: '/assets/visual-pack-1/ministry-intelligence.svg' },
  { id: 'interior', name: 'Ministry of Interior', shortName: 'INTERIOR', description: 'Stability, institutional control and crisis response.', accent: '#6c9d82', art: '/assets/visual-pack-1/ministry-interior.svg' },
  { id: 'society', name: 'Social & Cultural Affairs', shortName: 'SOCIETY', description: 'Cohesion, public confidence and ideological resilience.', accent: '#b77ea4', art: '/assets/visual-pack-1/ministry-society.svg' },
];

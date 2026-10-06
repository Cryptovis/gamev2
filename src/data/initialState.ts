import { initialCountries } from './countries';
import type { GameState } from '../domain/game';
import { createInitialProductionMap } from '../engine/systems/production';

export const makeInitialState = (): GameState => {
  const countries=structuredClone(initialCountries);
  return ({
  schemaVersion: 11,
  simulationSeed: 0xA17E5EED,
  day: 1,
  speed: 0,
  preferredSpeed: 1,
  campaignStatus: 'active',
  playerProfile: { commanderName: 'Commander', avatarId: 'avatar-01', language: 'en', setupComplete: false },
  playerCountryId: 'TUR',
  selectedCountryId: 'TUR',
  mapMode: 'political',
  mapPresentation: 'political',
  mapNotice: 'Living Diplomacy 0.71 online — embassies, diplomatic offers and pressure-based domestic agenda enabled.',
  countries,
  tradeDeals: {},
  wars: {},
  blocs: {},
  council: { influenceByCountry: { TUR: 28 }, history: [] },
  intelOperations: {},
  intelligenceLedger: { TUR: 100 },
  culturalInfluence: {},
  activeEvent: null,
  eventCooldownUntil: 12,
  activeAdvisor: null,
  advisorCooldownUntil: 7,
  embassies: {},
  diplomaticOffers: [],
  production: createInitialProductionMap(countries),
  lastAiDay: 1,
  lastStrategicReviewDay: 1,
  sitrep: [
    'AlpyX Production & Industry 0.72 online.',
    'Strategic AI, covert operations and influence networks loaded alongside Strategic Command systems.',
  ],
  });
};

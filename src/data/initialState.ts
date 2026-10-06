import { initialCountries } from './countries';
import type { GameState } from '../domain/game';
import { createInitialProductionMap } from '../engine/systems/production';
import { createInitialInfrastructureMap } from '../engine/systems/infrastructure';

export const makeInitialState = (): GameState => {
  const countries=structuredClone(initialCountries);
  return ({
  schemaVersion: 12,
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
  mapNotice: 'Cartography & Interaction 0.73.1 online — decluttered map labels, microstate fixes and strategic confirmations enabled.',
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
  infrastructure: createInitialInfrastructureMap(countries),
  lastAiDay: 1,
  lastStrategicReviewDay: 1,
  sitrep: [
    'AlpyX Cartography & Interaction 0.73.1 online.',
    'Strategic AI, covert operations and influence networks loaded alongside Strategic Command systems.',
  ],
  });
};

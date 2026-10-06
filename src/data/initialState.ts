import { initialCountries } from './countries';
import type { GameState } from '../domain/game';

export const makeInitialState = (): GameState => ({
  schemaVersion: 7,
  simulationSeed: 0xA17E5EED,
  day: 1,
  speed: 0,
  campaignStatus: 'active',
  playerCountryId: 'TUR',
  selectedCountryId: 'TUR',
  mapMode: 'political',
  mapNotice: 'Strategic Command 0.4 online — ministries, technology, processed industry, blocs and global council enabled.',
  countries: structuredClone(initialCountries),
  tradeDeals: {},
  wars: {},
  blocs: {},
  council: { influenceByCountry: { TUR: 28 }, history: [] },
  activeEvent: null,
  eventCooldownUntil: 12,
  lastAiDay: 1,
  sitrep: [
    'AlpyX Strategic Command 0.40 online.',
    'Cabinet, technology tree, resource processing, alliance blocs and Global Council v1 loaded.',
  ],
});

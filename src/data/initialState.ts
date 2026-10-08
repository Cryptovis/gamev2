import {createWorld} from '../engine/systems/worldInstitutions';
import { initialCountries } from './countries';
import type { GameState } from '../domain/game';
import { createInitialProductionMap } from '../engine/systems/production';
import { createIndustrialMap } from '../engine/systems/industrialEconomy';
import { createLeadership } from '../engine/systems/leadership';
import { createInitialInfrastructureMap } from '../engine/systems/infrastructure';

export const makeInitialState = (): GameState => {
  const countries=structuredClone(initialCountries);
  const state:GameState=({
  schemaVersion: 14,
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
  mapNotice: 'The Real President 0.81 — economy, people and diplomacy.',
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
  industrialEconomy: createIndustrialMap(countries),
  industrialContracts: {},
  leadership:createLeadership(countries.TUR.economy.gdp),
  world:createWorld(countries,'TUR'),
  lastAiDay: 1,
  lastStrategicReviewDay: 1,
  sitrep: [
    'The Real President 0.81 online.',
    'Strategic AI, covert operations and influence networks loaded alongside Strategic Command systems.',
  ],
  });
 return state;
};

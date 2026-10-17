import type { GameState } from '../domain/game';

/** The persisted fields of a game, by reference. snapshotGame clones them; the cloud envelope serialises them directly. */
export function pickSnapshot(state: GameState): GameState {
  return {
    schemaVersion: state.schemaVersion,
    simulationSeed: state.simulationSeed,
    day: state.day,
    speed: state.speed,
    preferredSpeed: state.preferredSpeed,
    campaignStatus: state.campaignStatus,
    playerProfile: state.playerProfile,
    playerCountryId: state.playerCountryId,
    selectedCountryId: state.selectedCountryId,
    mapMode: state.mapMode,
    mapPresentation: state.mapPresentation,
    mapNotice: state.mapNotice,
    countries: state.countries,
    tradeDeals: state.tradeDeals,
    wars: state.wars,
    blocs: state.blocs,
    council: state.council,
    intelOperations: state.intelOperations,
    intelligenceLedger: state.intelligenceLedger,
    culturalInfluence: state.culturalInfluence,
    activeEvent: state.activeEvent,
    eventCooldownUntil: state.eventCooldownUntil,
    activeAdvisor: state.activeAdvisor,
    advisorCooldownUntil: state.advisorCooldownUntil,
    embassies: state.embassies,
    diplomaticOffers: state.diplomaticOffers,
    production: state.production,
    infrastructure: state.infrastructure,
    industrialEconomy:state.industrialEconomy,
    industrialContracts:state.industrialContracts,
    leadership:state.leadership,
    world:state.world,
    lastAiDay: state.lastAiDay,
    lastStrategicReviewDay: state.lastStrategicReviewDay,
    sitrep: state.sitrep,
  };
}

export function snapshotGame(state: GameState): GameState {
  return structuredClone(pickSnapshot(state));
}

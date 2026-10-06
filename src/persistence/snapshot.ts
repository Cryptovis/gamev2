import type { GameState } from '../domain/game';

export function snapshotGame(state: GameState): GameState {
  return structuredClone({
    schemaVersion: state.schemaVersion,
    simulationSeed: state.simulationSeed,
    day: state.day,
    speed: state.speed,
    campaignStatus: state.campaignStatus,
    playerCountryId: state.playerCountryId,
    selectedCountryId: state.selectedCountryId,
    mapMode: state.mapMode,
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
    lastAiDay: state.lastAiDay,
    lastStrategicReviewDay: state.lastStrategicReviewDay,
    sitrep: state.sitrep,
  });
}

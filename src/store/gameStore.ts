import { create } from 'zustand';
import { makeInitialState } from '../data/initialState';
import type { GameCommand } from '../domain/commands';
import type { CouncilResolutionType, GameSpeed, GameState, IntelOperationType, MinistryKey, TradeResource } from '../domain/game';
import type { MapMode } from '../domain/map';
import { applyGameCommand } from '../engine/commands';

interface GameActions {
  dispatch: (command: GameCommand) => void;
  setSpeed: (speed: GameSpeed) => void;
  selectCountry: (countryId: string | null) => void;
  selectCountryByMapFeatureId: (featureId: string | number | null) => void;
  setMapMode: (mode: MapMode) => void;
  setMapNotice: (message: string | null) => void;
  advanceDay: () => void;
  setTaxRate: (rate: number) => void;
  improveRelations: (targetCountryId: string) => void;
  signTradePact: (targetCountryId: string) => void;
  signNonAggression: (targetCountryId: string) => void;
  signAlliance: (targetCountryId: string) => void;
  formBloc: (targetCountryId: string) => void;
  inviteToBloc: (targetCountryId: string) => void;
  toggleEmbargo: (targetCountryId: string) => void;
  createImport: (targetCountryId: string, resource: TradeResource) => void;
  cancelTrade: (dealId: string) => void;
  declareWar: (targetCountryId: string) => void;
  assault: (warId: string) => void;
  setAutoAssault: (warId: string, enabled: boolean) => void;
  withdraw: (warId: string) => void;
  economicResearch: () => void;
  militaryResearch: () => void;
  intelligenceResearch: () => void;
  religiousOutreach: () => void;
  civicCampaign: () => void;
  setMinistryAllocation: (ministry: MinistryKey, value: number) => void;
  unlockTechnology: (technologyId: string) => void;
  proposeCouncilResolution: (resolutionType: CouncilResolutionType, targetCountryId: string) => void;
  launchIntelOperation: (operationType: IntelOperationType, targetCountryId: string) => void;
  resolveEvent: (optionId: string) => void;
  pushSitrep: (message: string) => void;
  saveMessage: string | null;
  setSaveMessage: (message: string | null) => void;
  saveNow: () => Promise<void>;
  loadLatest: () => Promise<boolean>;
  resetGame: () => void;
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...makeInitialState(),
  saveMessage: null,
  dispatch: (command) => set((state) => applyGameCommand(state, command)),
  setSpeed: (speed) => set((state) => applyGameCommand(state, { type: 'clock/setSpeed', speed })),
  selectCountry: (selectedCountryId) => set({ selectedCountryId }),
  selectCountryByMapFeatureId: (featureId) => set((state) => {
    const id = String(featureId ?? '');
    const match = state.countries[id] ?? Object.values(state.countries).find((country) => country.mapNumericId === id);
    return match
      ? { selectedCountryId: match.id, mapNotice: `${match.name} selected — live simulation data loaded.` }
      : { mapNotice: `Map feature selected. No sovereign-state profile is attached to this geometry.` };
  }),
  setMapMode: (mapMode) => set({ mapMode }),
  setMapNotice: (mapNotice) => set({ mapNotice }),
  advanceDay: () => set((state) => applyGameCommand(state, { type: 'time/advanceDay' })),
  setTaxRate: (rate) => set((state) => applyGameCommand(state, { type: 'economy/setTaxRate', rate })),
  improveRelations: (targetCountryId) => set((state) => applyGameCommand(state, { type: 'diplomacy/improveRelations', targetCountryId })),
  signTradePact: (targetCountryId) => set((state) => applyGameCommand(state, { type: 'diplomacy/signTradePact', targetCountryId })),
  signNonAggression: (targetCountryId) => set((state) => applyGameCommand(state, { type: 'diplomacy/signNonAggression', targetCountryId })),
  signAlliance: (targetCountryId) => set((state) => applyGameCommand(state, { type: 'diplomacy/signAlliance', targetCountryId })),
  formBloc: (targetCountryId) => set((state) => applyGameCommand(state, { type: 'diplomacy/formBloc', targetCountryId })),
  inviteToBloc: (targetCountryId) => set((state) => applyGameCommand(state, { type: 'diplomacy/inviteToBloc', targetCountryId })),
  toggleEmbargo: (targetCountryId) => set((state) => applyGameCommand(state, { type: 'diplomacy/toggleEmbargo', targetCountryId })),
  createImport: (targetCountryId, resource: TradeResource) => set((state) => applyGameCommand(state, { type: 'trade/createImport', targetCountryId, resource })),
  cancelTrade: (dealId) => set((state) => applyGameCommand(state, { type: 'trade/cancel', dealId })),
  declareWar: (targetCountryId) => set((state) => applyGameCommand(state, { type: 'military/declareWar', targetCountryId })),
  assault: (warId) => set((state) => applyGameCommand(state, { type: 'military/assault', warId })),
  setAutoAssault: (warId, enabled) => set((state) => applyGameCommand(state, { type: 'military/setAutoAssault', warId, enabled })),
  withdraw: (warId) => set((state) => applyGameCommand(state, { type: 'military/withdraw', warId })),
  economicResearch: () => set((state) => applyGameCommand(state, { type: 'development/economicResearch' })),
  militaryResearch: () => set((state) => applyGameCommand(state, { type: 'development/militaryResearch' })),
  intelligenceResearch: () => set((state) => applyGameCommand(state, { type: 'development/intelligenceResearch' })),
  religiousOutreach: () => set((state) => applyGameCommand(state, { type: 'society/religiousOutreach' })),
  civicCampaign: () => set((state) => applyGameCommand(state, { type: 'society/civicCampaign' })),
  setMinistryAllocation: (ministry, value) => set((state) => applyGameCommand(state, { type: 'ministry/setAllocation', ministry, value })),
  unlockTechnology: (technologyId) => set((state) => applyGameCommand(state, { type: 'technology/unlock', technologyId })),
  proposeCouncilResolution: (resolutionType, targetCountryId) => set((state) => applyGameCommand(state, { type: 'council/propose', resolutionType, targetCountryId })),
  launchIntelOperation: (operationType, targetCountryId) => set((state) => applyGameCommand(state, { type: 'intelligence/launch', operationType, targetCountryId })),
  resolveEvent: (optionId) => set((state) => applyGameCommand(state, { type: 'event/resolve', optionId })),
  pushSitrep: (message) => set((state) => ({ sitrep: [message, ...state.sitrep].slice(0, 12) })),
  setSaveMessage: (saveMessage) => set({ saveMessage }),
  saveNow: async () => {
    const { saveGame } = await import('../persistence/saveGame');
    await saveGame(get(), 'manual', `Manual Save · Day ${get().day}`);
    set({ saveMessage: `Saved Day ${get().day}` });
  },
  loadLatest: async () => {
    const { loadMostRecentSave } = await import('../persistence/saveGame');
    const loaded = await loadMostRecentSave();
    if (!loaded) { set({ saveMessage: 'No save found' }); return false; }
    set({ ...loaded, speed: 0, saveMessage: `Loaded Day ${loaded.day}` });
    return true;
  },
  resetGame: () => set({ ...makeInitialState(), saveMessage: 'New campaign started' }),
}));

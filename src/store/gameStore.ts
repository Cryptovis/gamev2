import { create } from 'zustand';
import { makeInitialState } from '../data/initialState';
import type { GameCommand } from '../domain/commands';
import type { CouncilResolutionType, EquipmentType, GameLanguage, GameSpeed, GameState, InfrastructureAsset, IntelOperationType, MinistryKey, TradeResource } from '../domain/game';
import type { StrategicActionKind } from '../domain/interaction';
import type { MapMode, MapPresentation } from '../domain/map';
import { applyGameCommand } from '../engine/commands';
import { acceptAdvisorContract, acceptAdvisorTradePact, dismissAdvisor } from '../engine/systems/advisor';
import { makeLongTermImportContract } from '../engine/systems/trade';
import { embassyFor, openEmbassy } from '../engine/systems/diplomacy';
import { resolveDiplomaticOffer } from '../engine/systems/diplomaticOffers';

interface GameActions {
  startCampaign: (config:{commanderName:string;countryId:string;avatarId:string;language:GameLanguage})=>void;
  setPlayerAvatar: (avatarId:string)=>void;
  setLanguage: (language:GameLanguage)=>void;
  resolveAdvisor: (decision:'dismiss'|'pact'|1|3|5|10)=>void;
  createLongTermContract: (targetCountryId:string,resource:TradeResource,years:1|3|5|10)=>void;
  dispatch: (command: GameCommand) => void;
  setSpeed: (speed: GameSpeed) => void;
  selectCountry: (countryId: string | null) => void;
  selectCountryByMapFeatureId: (featureId: string | number | null) => void;
  setMapMode: (mode: MapMode) => void;
  setMapPresentation: (mode: MapPresentation) => void;
  mapProjection: 'globe'|'flat';
  setMapProjection: (mode:'globe'|'flat')=>void;
  mapControlCommand: {action:'zoomIn'|'zoomOut'|'focus'|'reset';nonce:number}|null;
  issueMapControl: (action:'zoomIn'|'zoomOut'|'focus'|'reset')=>void;
  confirmationSkips: Partial<Record<StrategicActionKind,boolean>>;
  setConfirmationSkip: (kind:StrategicActionKind,skip:boolean)=>void;
  setMapNotice: (message: string | null) => void;
  advanceDay: () => void;
  setTaxRate: (rate: number) => void;
  setMilitaryFactoryShare: (share:number)=>void;
  setProductionFactories: (equipment:EquipmentType,factories:number)=>void;
  deployEquipment: (equipment:EquipmentType)=>void;
  investInfrastructure: (asset:InfrastructureAsset)=>void;
  improveRelations: (targetCountryId: string) => void;
  giftTreasury: (targetCountryId:string,amountB:1|5|10)=>void;
  giftResource: (targetCountryId:string,resource:TradeResource)=>void;
  openEmbassyWith: (targetCountryId:string)=>void;
  resolveDiplomaticOffer: (offerId:string,accept:boolean)=>void;
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
  mapProjection: 'globe',
  mapControlCommand: null,
  confirmationSkips: {},
  startCampaign: ({commanderName,countryId,avatarId,language}) => set(() => {
    const fresh=makeInitialState();
    const chosen=fresh.countries[countryId] ? countryId : 'TUR';
    const country=fresh.countries[chosen];
    return {...fresh,mapProjection:'globe',mapControlCommand:null,confirmationSkips:{},playerCountryId:chosen,selectedCountryId:chosen,playerProfile:{commanderName:commanderName.trim()||'Commander',avatarId,language,setupComplete:true},council:{influenceByCountry:{[chosen]:28},history:[]},intelligenceLedger:{[chosen]:100},mapNotice:`${country.name} command established.`,sitrep:[`${commanderName.trim()||'Commander'} assumed national command of ${country.name}.`,...fresh.sitrep],saveMessage:'Campaign initialized'};
  }),
  setPlayerAvatar: (avatarId) => set((state)=>({playerProfile:{...state.playerProfile,avatarId}})),
  setLanguage: (language) => set((state)=>({playerProfile:{...state.playerProfile,language}})),
  resolveAdvisor: (decision) => set((state)=>decision==='dismiss'?dismissAdvisor(state):decision==='pact'?acceptAdvisorTradePact(state):acceptAdvisorContract(state,decision)),
  createLongTermContract: (targetCountryId,resource,years) => set((state)=>{const contract=makeLongTermImportContract(state,state.playerCountryId,targetCountryId,resource,years);return contract?{tradeDeals:{...state.tradeDeals,[contract.id]:contract},sitrep:[`TRADE // ${years}-year ${resource.toUpperCase()} contract opened with ${state.countries[targetCountryId].name}.`,...state.sitrep].slice(0,12)}:{};}),
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
  setMapPresentation: (mapPresentation) => set({ mapPresentation }),
  setMapProjection: (mapProjection) => set({ mapProjection }),
  issueMapControl: (action) => set((state)=>({mapControlCommand:{action,nonce:(state.mapControlCommand?.nonce??0)+1}})),
  setConfirmationSkip: (kind,skip) => set((state)=>({confirmationSkips:{...state.confirmationSkips,[kind]:skip}})),
  setMapNotice: (mapNotice) => set({ mapNotice }),
  advanceDay: () => set((state) => applyGameCommand(state, { type: 'time/advanceDay' })),
  setTaxRate: (rate) => set((state) => applyGameCommand(state, { type: 'economy/setTaxRate', rate })),
  setMilitaryFactoryShare: (share) => set((state)=>applyGameCommand(state,{type:'production/setMilitaryShare',share})),
  setProductionFactories: (equipment,factories) => set((state)=>applyGameCommand(state,{type:'production/setFactories',equipment,factories})),
  deployEquipment: (equipment) => set((state)=>applyGameCommand(state,{type:'production/deploy',equipment})),
  investInfrastructure: (asset) => set((state)=>applyGameCommand(state,{type:'infrastructure/invest',asset})),
  improveRelations: (targetCountryId) => set((state) => applyGameCommand(state, { type: 'diplomacy/improveRelations', targetCountryId })),
  giftTreasury: (targetCountryId,amountB) => set((state)=>applyGameCommand(state,{type:'diplomacy/giftTreasury',targetCountryId,amountB})),
  giftResource: (targetCountryId,resource) => set((state)=>applyGameCommand(state,{type:'diplomacy/giftResource',targetCountryId,resource})),
  openEmbassyWith: (targetCountryId) => set((state)=>{
    const player=state.countries[state.playerCountryId],target=state.countries[targetCountryId];
    if(!player||!target||embassyFor(state,player.id,target.id)||player.economy.treasury<3)return {};
    const opened=openEmbassy(state,player.id,target.id,1);
    return {...opened,countries:{...opened.countries,[player.id]:{...opened.countries[player.id],economy:{...opened.countries[player.id].economy,treasury:opened.countries[player.id].economy.treasury-3}}},sitrep:[`EMBASSY // Diplomatic mission opened with ${target.name}. Establishment cost $3B.`,...opened.sitrep].slice(0,12)};
  }),
  resolveDiplomaticOffer: (offerId,accept) => set((state)=>resolveDiplomaticOffer(state,offerId,accept)),
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
  resetGame: () => set({ ...makeInitialState(), mapProjection:'globe', mapControlCommand:null, confirmationSkips:{}, saveMessage: 'New campaign started' }),
}));

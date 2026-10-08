import {recordEconomicHistory} from '../engine/systems/economicHistory';
import {buildPlant,togglePlant,cancelPowerProject} from '../engine/systems/energy';
import type {PlantKind} from '../domain/energy';
import {sovereignId} from '../domain/sovereignty';
import {postCredit,acceptCredit,cancelCredit,expansion} from '../engine/systems/sovereignCredit';
import {beginIntegration,prepareIntegration} from '../engine/systems/integration';
import {dismissVictory} from '../engine/systems/victory';
import {activeCountries} from '../domain/sovereignty';
import {processExchange,postListing,buyListing,cancelListing,moveBankGold,startActivity,recruitPersonnel,dismissAdvice,restoreAdvice,withLiving,living,requestDiplomacy,diplomaticProposalStatus,resolveIncomingLetter} from '../engine/systems/livingEconomy';
import type {ExchangeGood,ActivityKind,AdviceKind} from '../domain/living';
import type {InstitutionId,VoteChoice} from '../domain/world';
import type {ReligionType} from '../domain/game';
import {createWorld,applyMembership,proposeAttack,voteWorld,startOutreach} from '../engine/systems/worldInstitutions';
import {cancelConstruction} from '../engine/systems/investmentReview';
import type {ReviewContent} from '../ui/panels/ReviewDialog';
import {createGovernance,buildCampus,hirePilots,manageOccupation,fundPoliticalCampaign,acceptElectionOffer,type OccupationAction} from '../engine/systems/governance';
import type {CampusKind} from '../domain/governance';
import {startProgram,type ProgramKind} from '../engine/systems/nationalPrograms';
import {create} from 'zustand';
import {clampSensitivity,readZoomSensitivity} from '../map/cameraControls';
import {makeInitialState} from '../data/initialState';
import type { GameCommand } from '../domain/commands';
import type { CouncilResolutionType, EquipmentType, GameLanguage, GameSpeed, GameState, InfrastructureAsset, IntelOperationType, MinistryKey, TradeResource } from '../domain/game';
import {canAutoApprove,type StrategicActionKind} from '../domain/interaction';
import type {FacilityKind,IndustrialGood} from '../domain/industrial';
import {buildFacility} from '../engine/systems/industrialEconomy';
import {placeIndustrialOrder} from '../engine/systems/industrialMarket';
import {createLeadership,validBirthDate} from '../engine/systems/leadership';
import type { MapMode, MapPresentation } from '../domain/map';
import {applyGameCommand,executeCommandResult} from '../engine/commands';
import {acceptAdvisorContract,acceptAdvisorTradePact,dismissAdvisor} from '../engine/systems/advisor';
import {makeLongTermImportContract} from '../engine/systems/trade';

import {resolveDiplomaticOffer} from '../engine/systems/diplomaticOffers';

interface GameActions {
 startTactical:(id:string,commandId?:string)=>void;
 commitTactical:(id:string,expectedRound:number,orders:import('../domain/tactical').TacticalOrder[],commandId?:string)=>void;
 cancelPowerProject:(id:string,commandId?:string)=>void;
 buildPlant:(kind:PlantKind,commandId?:string)=>void;
 togglePlant:(kind:PlantKind)=>void;
 postCredit:(kind:'lend'|'borrow',principal:number,apr:number,days:90|180|365,commandId?:string)=>void;
 acceptCredit:(id:string,commandId?:string)=>void;cancelCredit:(id:string,commandId?:string)=>void;
 prepareIntegration:(id:string,kind:'language'|'ideology'|'services',commandId?:string)=>void;
 beginIntegration:(id:string,commandId?:string)=>void;dismissVictory:(id:string)=>void;
 postListing:(good:ExchangeGood,quantity:number,price:number,commandId?:string)=>void;
 buyListing:(id:string,quantity:number,commandId?:string)=>void;
 cancelListing:(id:string,commandId?:string)=>void;
 moveBankGold:(tonnes:number,direction:'release'|'deposit',commandId?:string)=>void;
 startActivity:(kind:ActivityKind,commandId?:string)=>void;
 recruitPersonnel:(count:number,commandId?:string)=>void;
 dismissAdvice:(kind:AdviceKind,disable?:boolean)=>void;
 restoreAdvice:()=>void;
 dismissLivingNotice:()=>void;
 requestDiplomacy:(id:string,kind:'embassy'|'trade_pact',years:1|3|5|10,commandId?:string)=>void;
 resolveIncomingLetter:(id:string,accept:boolean,commandId?:string)=>void;
 readLetters:()=>void;

 buildCampus:(kind:CampusKind,commandId?:string)=>void;
 hirePilots:(count:number,commandId?:string)=>void;
 manageOccupation:(id:string,action:OccupationAction,value?:string,commandId?:string)=>void;
 fundPoliticalCampaign:(id:string,commandId?:string)=>void;
 acceptElectionOffer:(id:string,commandId?:string)=>void;
 startProgram:(kind:ProgramKind,commandId?:string)=>void;
 activeTool:string|null;
 openTool:(tool:string|null)=>void;
 closeWorkspace:()=>void;
 warWindowId:string|null;
 openWarWindow:(id:string|null)=>void;
 actionReceipt:ReviewContent|null;
 showReceipt:(content:ReviewContent|null)=>void;
 cancelConstruction:(id:string,commandId?:string)=>void;
 applyMembership:(id:InstitutionId,commandId?:string)=>void;
 proposeAttack:(id:string,commandId?:string)=>void;
 voteWorld:(id:string,choice:VoteChoice)=>void;
 startOutreach:(id:string,religion:ReligionType,commandId?:string)=>void;
 setTutorial:(step:number,active:boolean)=>void;
 navigation:{panel:string;countryId:string;nonce:number}|null;
 navigate:(panel:string,countryId?:string)=>void;
  buildFacility:(kind:FacilityKind,commandId?:string)=>void;
  toggleFacility:(kind:FacilityKind)=>void;
  placeIndustrialOrder:(partnerId:string,good:IndustrialGood,quantity:number,direction:'buy'|'sell',years:0|1|3|5|10,commandId?:string)=>void;
  cancelIndustrialContract:(id:string)=>void;
  readDiplomaticMessages:()=>void;
  startCampaign: (config:{commanderName:string;countryId:string;avatarId:string;language:GameLanguage;nationalityCountryId?:string;birthDate?:string|null})=>void;
  setLeaderIdentity:(nationalityCountryId:string,birthDate:string|null)=>void;
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
  mapZoomSensitivity:number;
  setMapZoomSensitivity:(value:number)=>void;
  mapLabelScale: number;
  setMapLabelScale: (scale:number)=>void;
  mapProjection: 'globe'|'flat';
  setMapProjection: (mode:'globe'|'flat')=>void;
  mapControlCommand: {action:'zoomIn'|'zoomOut'|'focus'|'home'|'reset';nonce:number}|null;
  issueMapControl: (action:'zoomIn'|'zoomOut'|'focus'|'home'|'reset')=>void;
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
  unlockTechnology: (technologyId: string,commandId?:string) => void;
  cancelResearch:(commandId?:string)=>void;
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

function commandWithReceipt(state:GameState,command:GameCommand):GameState & {actionReceipt:ReviewContent}{const result=executeCommandResult(state,command);return {...result.state,actionReceipt:{title:result.status==='applied'?'Command completed':result.status==='duplicate'?'Command already applied':'Command unavailable',summary:result.message,metrics:[['Treasury',`$${result.state.countries[state.playerCountryId].economy.treasury.toFixed(3)}B`]]}};}
function livingReceipt(s:GameState,n:GameState,title:string,summary:string){return {...n,actionReceipt:{title:n===s?'Decision unavailable':title,summary:n===s?'Check budget, stock, diplomatic access, limits and cooldown.':summary}};}
function governanceReceipt(s:GameState,n:GameState){return {...n,actionReceipt:{title:n===s?'Decision unavailable':'Decision executed',summary:n===s?'Requirements changed; check the budget, cooldown and ownership.':n.sitrep[0]}}}
export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...makeInitialState(),
  startTactical:(warId,commandId)=>set(s=>commandWithReceipt(s,{type:'tactical/start',warId,commandId})),
  commitTactical:(warId,expectedRound,orders,commandId)=>set(s=>commandWithReceipt(s,{type:'tactical/commit',warId,expectedRound,orders,commandId})),
  cancelPowerProject:(id,commandId)=>set(s=>commandWithReceipt(s,{...{type:'energy/cancel',id},commandId})),
  buildPlant:(kind,commandId)=>set(s=>commandWithReceipt(s,{...{type:'energy/build',kind},commandId})),
  togglePlant:(kind)=>set(s=>applyGameCommand(s,{type:'energy/toggle',kind})),
  saveMessage: null,
  buildCampus:(kind,commandId)=>set(s=>commandWithReceipt(s,{...{type:'campus/build',kind},commandId})),
  hirePilots:(count,commandId)=>set(s=>commandWithReceipt(s,{...{type:'pilots/hire',count},commandId})),
  manageOccupation:(id,action,value,commandId)=>set(s=>commandWithReceipt(s,{...{type:'occupation/manage',id,action,value},commandId})),
  fundPoliticalCampaign:(id,commandId)=>set(s=>commandWithReceipt(s,{...{type:'politics/campaign',id},commandId})),
  acceptElectionOffer:(id,commandId)=>set(s=>commandWithReceipt(s,{...{type:'politics/acceptElection',id},commandId})),
  startProgram:(kind,commandId)=>set(s=>commandWithReceipt(s,{...{type:'program/start',kind},commandId})),
  activeTool:null,warWindowId:null,openWarWindow:(warWindowId)=>set({warWindowId,selectedCountryId:null,activeTool:null}),
  closeWorkspace:()=>set({selectedCountryId:null,activeTool:null,warWindowId:null,navigation:null}),
  postCredit:(kind,principal,apr,days,commandId)=>set(s=>commandWithReceipt(s,{...{type:'credit/post',kind,principal,apr,days},commandId})),
  acceptCredit:(id,commandId)=>set(s=>commandWithReceipt(s,{...{type:'credit/accept',id},commandId})),
  cancelCredit:(id,commandId)=>set(s=>commandWithReceipt(s,{...{type:'credit/cancel',id},commandId})),
  prepareIntegration:(id,kind,commandId)=>set(s=>commandWithReceipt(s,{...{type:'integration/prepare',id,kind},commandId})),
  beginIntegration:(id,commandId)=>set(s=>commandWithReceipt(s,{...{type:'integration/begin',id},commandId})),
  dismissVictory:(id)=>set(s=>({...dismissVictory(s,id),warWindowId:null})),
  postListing:(good,quantity,price,commandId)=>set(s=>commandWithReceipt(s,{...{type:'exchange/post',good,quantity,price},commandId})),
  buyListing:(id,quantity,commandId)=>set(s=>commandWithReceipt(s,{...{type:'exchange/buy',id,quantity},commandId})),
  cancelListing:(id,commandId)=>set(s=>commandWithReceipt(s,{...{type:'exchange/cancel',id},commandId})),
  moveBankGold:(tonnes,direction,commandId)=>set(s=>commandWithReceipt(s,{...{type:'gold/move',tonnes,direction},commandId})),
  startActivity:(kind,commandId)=>set(s=>commandWithReceipt(s,{...{type:'activity/start',kind},commandId})),
  recruitPersonnel:(count,commandId)=>set(s=>commandWithReceipt(s,{...{type:'personnel/recruit',count},commandId})),
  dismissAdvice:(kind,disable=false)=>set(s=>dismissAdvice(s,kind,disable)),
  restoreAdvice:()=>set(s=>restoreAdvice(s)),
  dismissLivingNotice:()=>set(s=>withLiving(s,{...living(s),notice:null})),
  requestDiplomacy:(id,kind,years,commandId)=>set(s=>commandWithReceipt(s,{...{type:'diplomacy/request',id,kind,years},commandId})),
  resolveIncomingLetter:(id,accept,commandId)=>set(s=>commandWithReceipt(s,{...{type:'diplomacy/resolveLetter',id,accept},commandId})),
  readLetters:()=>set(s=>withLiving(s,{...living(s),letters:living(s).letters.map(x=>({...x,read:true}))})),
  openTool:(activeTool)=>set({activeTool,selectedCountryId:null,warWindowId:null,navigation:null}),
  actionReceipt:null,showReceipt:(actionReceipt)=>set({actionReceipt}),
  navigation:null,navigate:(panel,countryId)=>set(s=>({activeTool:['objectives','market','pulse','map','resources','sitrep','alerts','diplomacy-inbox','help','research','investment','governance','society','credit'].includes(panel)?(panel==='diplomacy-inbox'?'diplomacy':panel):null,warWindowId:null,selectedCountryId:['objectives','market','pulse','map','resources','sitrep','alerts','diplomacy-inbox','help','research','investment','governance','society','credit'].includes(panel)?null:countryId??s.playerCountryId,navigation:{panel,countryId:countryId??s.playerCountryId,nonce:(s.navigation?.nonce??0)+1},...(countryId?{mapControlCommand:{action:'focus' as const,nonce:(s.mapControlCommand?.nonce??0)+1}}:{})})),
  setTutorial:(step,active)=>set(s=>({world:{...s.world,tutorial:{...s.world.tutorial,step:Math.max(0,Math.min(9,step)),active,completed:!active,practiceProjectId:step===s.world.tutorial.step?s.world.tutorial.practiceProjectId:undefined}},speed:0})),
  cancelConstruction:(id,commandId)=>set(s=>commandWithReceipt(s,{...{type:'construction/cancel',id},commandId})),
  applyMembership:(id,commandId)=>set(s=>commandWithReceipt(s,{...{type:'world/membership',id},commandId})),
  proposeAttack:(id,commandId)=>set(s=>commandWithReceipt(s,{...{type:'world/attackProposal',id},commandId})),
  voteWorld:(id,choice)=>set(s=>applyGameCommand(s,{type:'world/vote',id,choice})),
  startOutreach:(id,religion,commandId)=>set(s=>commandWithReceipt(s,{...{type:'world/outreach',id,religion},commandId})),
  mapZoomSensitivity:readZoomSensitivity(),
  setMapZoomSensitivity:(value)=>{const zoom=clampSensitivity(value);try{localStorage.setItem('alpyx-map-zoom',String(zoom));}catch{}set({mapZoomSensitivity:zoom});},
  mapLabelScale: 1,
  setMapLabelScale: (scale) => set({mapLabelScale: Number.isFinite(scale)?Math.max(.85,Math.min(1.4,scale)):1}),
  mapProjection: 'globe',
  mapControlCommand: null,
  confirmationSkips: {},
  buildFacility:(kind,commandId)=>set(s=>commandWithReceipt(s,{...{type:'industry/build',kind},commandId})),
  toggleFacility:(kind)=>set(state=>{const id=state.playerCountryId,n=state.industrialEconomy[id];return {industrialEconomy:{...state.industrialEconomy,[id]:{...n,enabled:{...n.enabled,[kind]:!n.enabled[kind]}}}};}),
  placeIndustrialOrder:(partnerId,good,quantity,direction,years,commandId)=>set(s=>commandWithReceipt(s,{...{type:'industry/order',partnerId,good,quantity,direction,years},commandId})),
  cancelIndustrialContract:(id)=>set(state=>{const c=state.industrialContracts[id];return c&&(c.sellerId===state.playerCountryId||c.buyerId===state.playerCountryId)?{industrialContracts:{...state.industrialContracts,[id]:{...c,active:false}}}:{};}),
  readDiplomaticMessages:()=>set(state=>({leadership:{...state.leadership,messages:state.leadership.messages.map(m=>({...m,read:true}))}})),
  startCampaign: ({commanderName,countryId,avatarId,language,nationalityCountryId,birthDate}) => set(() => {
    const fresh=makeInitialState();
    const chosen=fresh.countries[countryId] ? countryId : 'TUR';
    const country=fresh.countries[chosen];
    const boot={...fresh,actionReceipt:null,navigation:null,activeTool:null,warWindowId:null,world:{...createWorld(fresh.countries,chosen),campaignId:crypto.randomUUID(),commandIds:[],journal:[],governance:createGovernance(fresh.countries),tutorial:{active:true,step:0,completed:false}},mapProjection:'globe',mapControlCommand:null,confirmationSkips:{},playerCountryId:chosen,selectedCountryId:chosen,leadership:createLeadership(country.economy.gdp),playerProfile:{commanderName:commanderName.trim()||'Commander',avatarId,language,setupComplete:true,nationalityCountryId:fresh.countries[nationalityCountryId??'']?nationalityCountryId:chosen,birthDate:birthDate&&validBirthDate(birthDate)?birthDate:null},council:{influenceByCountry:{[chosen]:28},history:[]},intelligenceLedger:{[chosen]:100},mapNotice:`${country.name} command established.`,sitrep:[`${commanderName.trim()||'Commander'} assumed national command of ${country.name}.`,...fresh.sitrep],saveMessage:'Campaign initialized'};let seeded=processExchange(boot,true);for(const id of ['FRA','DEU','USA','JPN','GBR'])if(id!==chosen)seeded=postCredit(seeded,'lend',1,3+Object.keys(expansion(seeded).creditOffers).length*.5,365,id);return recordEconomicHistory(seeded);
  }),
  setLeaderIdentity:(nationalityCountryId,birthDate)=>set(state=>state.countries[nationalityCountryId]&&(!birthDate||validBirthDate(birthDate))?{playerProfile:{...state.playerProfile,nationalityCountryId,birthDate}}:{}),
  setPlayerAvatar: (avatarId) => set((state)=>({playerProfile:{...state.playerProfile,avatarId}})),
  setLanguage: (language) => set((state)=>({playerProfile:{...state.playerProfile,language}})),
  resolveAdvisor: (decision) => set((state)=>decision==='dismiss'?dismissAdvisor(state):decision==='pact'?acceptAdvisorTradePact(state):acceptAdvisorContract(state,decision)),
  createLongTermContract: (targetCountryId,resource,years) => set((state)=>{const contract=makeLongTermImportContract(state,state.playerCountryId,targetCountryId,resource,years);return contract?{tradeDeals:{...state.tradeDeals,[contract.id]:contract},sitrep:[`TRADE // ${years}-year ${resource.toUpperCase()} contract opened with ${state.countries[targetCountryId].name}.`,...state.sitrep].slice(0,12)}:{};}),
  dispatch: (command) => set((state) => applyGameCommand(state, command)),
  setSpeed: (speed) => set((state) => applyGameCommand(state, { type: 'clock/setSpeed', speed })),
  selectCountry: (selectedCountryId) => set(s=>({ selectedCountryId:selectedCountryId?sovereignId(s.countries,selectedCountryId):null,activeTool:null,warWindowId:null,navigation:null })),
  selectCountryByMapFeatureId: (featureId) => set((state) => {
    const id = String(featureId ?? '');
    const match = state.countries[id] ?? activeCountries(state.countries).find((country) => country.mapNumericId === id);
    return match
      ? { selectedCountryId: match.id,activeTool:null,warWindowId:null,navigation:null, mapNotice: `${match.name} selected — live simulation data loaded.` }
      : { mapNotice: `Map feature selected. No sovereign-state profile is attached to this geometry.` };
  }),
  setMapMode: (mapMode) => set({ mapMode }),
  setMapPresentation: (mapPresentation) => set({ mapPresentation }),
  setMapProjection: (mapProjection) => set({ mapProjection }),
  issueMapControl: (action) => set((state)=>({mapControlCommand:{action,nonce:(state.mapControlCommand?.nonce??0)+1}})),
  setConfirmationSkip: (kind,skip) => set((state)=>({confirmationSkips:{...state.confirmationSkips,[kind]:skip && canAutoApprove(kind)}})),
  setMapNotice: (mapNotice) => set({ mapNotice }),
  advanceDay: () => set((state) => applyGameCommand(state, { type: 'time/advanceDay' })),
  setTaxRate: (rate) => set((state) => applyGameCommand(state, { type: 'economy/setTaxRate', rate })),
  setMilitaryFactoryShare: (share) => set((state)=>applyGameCommand(state,{type:'production/setMilitaryShare',share})),
  setProductionFactories: (equipment,factories) => set((state)=>applyGameCommand(state,{type:'production/setFactories',equipment,factories})),
  deployEquipment: (equipment) => set((state)=>commandWithReceipt(state,{type:'production/deploy',equipment})),
  investInfrastructure: (asset) => set((state)=>commandWithReceipt(state,{type:'infrastructure/invest',asset})),
  improveRelations: (targetCountryId) => set((state) => commandWithReceipt(state, { type: 'diplomacy/improveRelations', targetCountryId })),
  giftTreasury: (targetCountryId,amountB) => set((state)=>commandWithReceipt(state,{type:'diplomacy/giftTreasury',targetCountryId,amountB})),
  giftResource: (targetCountryId,resource) => set((state)=>commandWithReceipt(state,{type:'diplomacy/giftResource',targetCountryId,resource})),
  openEmbassyWith: (targetCountryId) => set(s=>{const n=requestDiplomacy(s,targetCountryId,'embassy');return {...n,actionReceipt:{title:n===s?'Proposal unavailable':'Proposal sent',summary:n===s?diplomaticProposalStatus(s,targetCountryId,'embassy').reason:'The reply arrives after three campaign days. Payment is charged only if accepted.'}};}),
  resolveDiplomaticOffer: (offerId,accept) => set((state)=>resolveDiplomaticOffer(state,offerId,accept)),
  signTradePact: (targetCountryId) => get().requestDiplomacy(targetCountryId,'trade_pact',1),
  signNonAggression: (targetCountryId) => set((state) => commandWithReceipt(state, { type: 'diplomacy/signNonAggression', targetCountryId })),
  signAlliance: (targetCountryId) => set((state) => commandWithReceipt(state, { type: 'diplomacy/signAlliance', targetCountryId })),
  formBloc: (targetCountryId) => set((state) => commandWithReceipt(state, { type: 'diplomacy/formBloc', targetCountryId })),
  inviteToBloc: (targetCountryId) => set((state) => commandWithReceipt(state, { type: 'diplomacy/inviteToBloc', targetCountryId })),
  toggleEmbargo: (targetCountryId) => set((state) => commandWithReceipt(state, { type: 'diplomacy/toggleEmbargo', targetCountryId })),
  createImport: (targetCountryId, resource: TradeResource) => set((state) => commandWithReceipt(state, { type: 'trade/createImport', targetCountryId, resource })),
  cancelTrade: (dealId) => set((state) => commandWithReceipt(state, { type: 'trade/cancel', dealId })),
  declareWar: (targetCountryId) => set((state) => {const next=applyGameCommand(state,{type:'military/declareWar',targetCountryId});const war=Object.values(next.wars).find(w=>w.status==='active'&&((w.attackerId===state.playerCountryId&&w.defenderId===targetCountryId)||(w.defenderId===state.playerCountryId&&w.attackerId===targetCountryId)));if(!war)return {actionReceipt:{title:'Decision unavailable',summary:'Select another country to prepare a military operation.'}};return {...next,actionReceipt:null,warWindowId:war?.id??null,selectedCountryId:null,activeTool:null};}),
  assault: (warId) => set((state) => applyGameCommand(state, { type: 'military/assault', warId })),
  setAutoAssault: (warId, enabled) => set((state) => {const war=state.wars[warId];if(!war||war.status!=='active'||(war.attackerId!==state.playerCountryId&&war.defenderId!==state.playerCountryId))return state;return {...applyGameCommand(state, { type: 'military/setAutoAssault', warId, enabled }),speed:enabled?3:state.warWindowId===warId?0:state.speed};}),
  withdraw: (warId) => set((state) => commandWithReceipt(state, { type: 'military/withdraw', warId })),
  economicResearch: () => set((state) => commandWithReceipt(state, { type: 'development/economicResearch' })),
  militaryResearch: () => set((state) => commandWithReceipt(state, { type: 'development/militaryResearch' })),
  intelligenceResearch: () => set((state) => commandWithReceipt(state, { type: 'development/intelligenceResearch' })),
  religiousOutreach: () => set((state) => commandWithReceipt(state, { type: 'society/religiousOutreach' })),
  civicCampaign: () => set((state) => commandWithReceipt(state, { type: 'society/civicCampaign' })),
  setMinistryAllocation: (ministry, value) => set((state) => applyGameCommand(state, { type: 'ministry/setAllocation', ministry, value })),
  unlockTechnology: (technologyId,commandId) => set((state) => commandWithReceipt(state, { type: 'technology/unlock', technologyId,commandId })),
  cancelResearch:(commandId)=>set(s=>commandWithReceipt(s,{type:'technology/cancel',commandId})),
  proposeCouncilResolution: (resolutionType, targetCountryId) => set((state) => commandWithReceipt(state, { type: 'council/propose', resolutionType, targetCountryId })),
  launchIntelOperation: (operationType, targetCountryId) => set((state) => commandWithReceipt(state, { type: 'intelligence/launch', operationType, targetCountryId })),
  resolveEvent: (optionId) => set((state) => applyGameCommand(state, { type: 'event/resolve', optionId })),
  pushSitrep: (message) => set((state) => ({ sitrep: [message, ...state.sitrep].slice(0, 12) })),
  setSaveMessage: (saveMessage) => set({ saveMessage }),
  saveNow: async () => {
    const snapshot=get();
    try {const {saveGame}=await import('../persistence/saveGame');await saveGame(snapshot,'manual',`Manual Save · Day ${snapshot.day}`);set({saveMessage:`Saved Day ${snapshot.day}`});}
    catch {set({saveMessage:'Save failed; try again'});}
  },
  loadLatest: async () => {
    try {
      const {loadMostRecentSave}=await import('../persistence/saveGame');const loaded=await loadMostRecentSave();
      if(!loaded){set({saveMessage:'No compatible save found'});return false;}
      set({...loaded,actionReceipt:null,navigation:null,activeTool:null,warWindowId:null,speed:0,confirmationSkips:{},mapControlCommand:null,saveMessage:`Loaded Day ${loaded.day}`});return true;
    }catch {set({saveMessage:'Save could not be loaded'});return false;}
  },
  resetGame: () => set({ ...makeInitialState(),actionReceipt:null,navigation:null,activeTool:null,warWindowId:null, mapProjection:'globe', mapControlCommand:null, confirmationSkips:{}, saveMessage: 'New campaign started' }),
}));

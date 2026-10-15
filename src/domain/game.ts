import type {WorldState} from './world';
import type { NationalIndustrialEconomy, IndustrialContract, LeadershipState } from './industrial';
import type { MapMode, MapPresentation } from './map';

export type GameSpeed = 0 | 1 | 2 | 3 | 5;
export type GameLanguage = 'en' | 'tr' | 'es' | 'zh' | 'ru';
export type RegimeType = 'republic' | 'democracy' | 'autocracy' | 'monarchy' | 'theocracy';
export type ReligionType = 'christianity' | 'catholic_christianity' | 'orthodox_christianity' | 'protestant_christianity' | 'islam' | 'hinduism' | 'buddhism' | 'judaism' | 'unaffiliated' | 'folk_or_mixed';
export type IdeologyType = 'pluralist' | 'state_centric' | 'state_socialist' | 'royalist' | 'religious_state';
export type RelationStatus = 'war' | 'hostile' | 'neutral' | 'friendly' | 'ally';
export type TreatyType = 'trade' | 'nonAggression' | 'alliance';
export type TradeResource = 'food' | 'oil' | 'iron' | 'uranium';
export type WarStatus = 'active' | 'victory' | 'defeat' | 'withdrawn';
export type BattlefieldTerrain = 'plains' | 'urban' | 'mountain' | 'forest' | 'desert' | 'coastal';
/** 'won' (0.88) is set when a campaign victory path completes; older saves only hold 'active' or 'lost'. */
export type CampaignStatus = 'active' | 'lost' | 'won';
export type EventKind = 'food_crisis' | 'inflation_shock' | 'war_weariness' | 'corruption_scandal' | 'fuel_crisis' | 'intelligence_breach' | 'earthquake' | 'health_crisis' | 'tax_protest' | 'reform_demand' | 'foreign_policy_backlash'
  // 0.88 data-driven catalogue (src/data/events.ts); saves before 0.88 only contain the kinds above.
  | 'investigation_findings' | 'corruption_trial' | 'tech_breakthrough' | 'tech_investment_boom' | 'grid_failure' | 'grid_modernization'
  | 'refugee_influx' | 'refugee_integration' | 'pandemic_outbreak' | 'pandemic_second_wave' | 'flood' | 'drought' | 'cyberattack'
  | 'banking_stress' | 'export_boom' | 'general_strike' | 'border_incident' | 'veterans_demands' | 'arms_export_offer' | 'summit_invitation' | 'energy_windfall';
export type MinistryKey = 'economy' | 'defense' | 'science' | 'intelligence' | 'interior' | 'society';
export type TechnologyCategory = 'economy' | 'industry' | 'military' | 'intelligence' | 'energy' | 'society' | 'education' | 'diplomacy';
export type CouncilResolutionType = 'sanctions' | 'ceasefire' | 'humanitarian_aid';
export type StrategicGoal = 'stabilize' | 'grow_economy' | 'rearm' | 'secure_resources' | 'expand_influence';
export type IntelOperationType = 'gather_intelligence' | 'influence_campaign' | 'sabotage_industry' | 'counter_network';
export type IntelOperationStatus = 'active' | 'success' | 'failed' | 'compromised';
export type EquipmentType = 'infantry_equipment' | 'artillery' | 'armor' | 'fighters' | 'logistics' | 'naval';
export type InfrastructureAsset = 'roads' | 'rail' | 'ports' | 'hubs';

export interface DemographicsState { population: number; workforce: number; growthRate: number; publicServicesBoost?:number; baseGrowthRate?:number; welfare?:number; birthsPerThousand?:number; deathsPerThousand?:number; netMigration?:number; lastNaturalChange?:number; }
export interface ResourceStockpile { food: number; oil: number; iron: number; uranium: number; }
export interface ResourceProduction { food: number; oil: number; iron: number; uranium: number; }
export interface ProcessedResources { fuel: number; steel: number; electricity: number; }
export interface EconomyState {
  /** Optional cross-border cash subledger; absence preserves pre-8.4 treasury-based settlement. */
  foreignReservesB?:number;
  /** Cumulative importer customs revenue, already included in treasury (never an extra asset). */
  tariffRevenueB?:number; gdp: number; treasury: number; debt: number; taxRate: number; inflation: number; unemployment: number; productivity: number; }
export interface IndustryState { factories: number; refineries: number; mines: number; powerCapacity: number; utilization: number; }
export interface PoliticsState { approval: number; stability: number; regime: RegimeType; electionDaysRemaining: number;
  /** 0.88 factions, contested elections and regime pressure (audit E2). Absent in older saves; created on the first tick. */
  factions?: import('./politics').FactionState; }
export interface SocietyState { dominantReligion: ReligionType; ideology: IdeologyType; cohesion: number; secularization: number; influencePressure: { ideology: number; religion: number }; }
export interface MilitaryAssessment { gfpRank: number | null; gfpIndex: number | null; capability: number; dataConfidence: 'gfp-2026' | 'estimated'; }
export interface MilitaryState { personnel: number; tanks: number; artillery: number; fighters: number; bombers: number; warships: number; readiness: number; morale: number; logistics: number; technology: number; assessment: MilitaryAssessment; }
export interface DiplomaticRelation { score: number; status: RelationStatus; treaties: TreatyType[]; sanctions: boolean; tradeStrainSinceDay?: number; allianceStrainSinceDay?: number; nonAggressionStrainSinceDay?: number; /** Day from which a rejected embassy/trade proposal may be repeated (AI-to-AI; the player's letters keep their own cooldown). */ proposalRetryDay?: Partial<Record<'embassy' | 'trade', number>>; }
export interface DiplomacyState { relations: Record<string, DiplomaticRelation>; reputation: number; }
export interface IntelligenceState { networkStrength: number; counterIntelligence: number; intelConfidence: number; }
export interface MinistryState { allocations: Record<MinistryKey, number>; efficiency: Record<MinistryKey, number>; }
export interface ResearchProject { id:string; technologyId:string; startedDay:number; lastProgressDay:number; workDone:number; requiredWork:number; cost:number; }
export interface TechnologyState { researchPoints: number; unlocked: string[]; project?:ResearchProject|null; }
export interface StrategicAIState { strategicGoal: StrategicGoal; goalProgress: number; threatFocus: string | null; lastGoalReviewDay: number; }
export interface IntelOperation { id: string; type: IntelOperationType; sourceCountryId: string; targetCountryId: string; startedDay: number; completeDay: number; status: IntelOperationStatus; successChance: number; resultSummary: string; }
export interface PlayerProfile { commanderName: string; avatarId: string; language: GameLanguage; setupComplete: boolean; nationalityCountryId?:string; birthDate?:string|null; }
export interface AdvisorPrompt { id: string; resource: TradeResource; supplierId: string; stage: 'pact' | 'contract'; createdDay: number; message: string; }
export type EmbassyLevel = 1 | 2 | 3 | 4;
export interface EmbassyMission { id:string; countryA:string; countryB:string; openedDay:number; level:EmbassyLevel; }
export type DiplomaticOfferType = 'embassy' | 'trade_pact';
export interface DiplomaticOffer { id:string; type:DiplomaticOfferType; senderId:string; receiverId:string; createdDay:number; expiresDay:number; message:string; }
export type EquipmentStockpile = Record<EquipmentType, number>;
export interface ProductionLine { id:string; equipment:EquipmentType; factories:number; efficiency:number; lastOutput:number; }
export interface ProductionInputUse { steel:number; fuel:number; electricity:number; treasury:number; }
export interface NationalInfrastructureState {
  roads:number;
  rail:number;
  ports:number;
  hubs:number;
  maintenance:number;
  throughput:number;
  bottleneck:'none'|'roads'|'rail'|'ports'|'hubs'|'power'|'fuel';
  lastInvestmentDay:number;
}
export interface NationalProductionState {
  militaryFactoryShare:number;
  lines:Record<EquipmentType,ProductionLine>;
  stockpile:EquipmentStockpile;
  lastDailyOutput:EquipmentStockpile;
  lastInputUse:ProductionInputUse;
  throughput:number;
  bottleneck:'none'|'steel'|'fuel'|'electricity'|'treasury'|'capacity'|'components'|'technology';
}

export interface CountryState {
  annexedBy?:string;
  id: string;
  name: string;
  iso2: string;
  mapName: string;
  mapNumericId: string;
  region: string;
  subregion: string;
  controllerCountryId: string | null;
  globalSanctions: boolean;
  /** Day the Global Council sanctions lapse (absent on legacy saves; set on first council review). */
  globalSanctionsUntil?: number;
  /** Player-only memory of the last day each event kind fired, for per-kind cooldowns. */
  eventLastFired?: Partial<Record<EventKind, number>>;
  /** 0.88 player-only event-chain flags: flag id -> day it was set; a later event in the chain reads it. */
  eventFlags?: Record<string, number>;
  demographics: DemographicsState;
  economy: EconomyState;
  resources: ResourceStockpile;
  resourceProduction: ResourceProduction;
  processedResources: ProcessedResources;
  industry: IndustryState;
  politics: PoliticsState;
  society: SocietyState;
  military: MilitaryState;
  diplomacy: DiplomacyState;
  intelligence: IntelligenceState;
  ministries: MinistryState;
  technology: TechnologyState;
  ai: StrategicAIState;
}

export interface TradeDeal {
  id: string; sellerId: string; buyerId: string; resource: TradeResource; quantityPerDay: number; pricePerUnit: number; active: boolean;
  contractType?: 'spot' | 'long_term'; startDay?: number; expiresDay?: number; deliveryIntervalDays?: number; nextDeliveryDay?: number; contractYears?: 1 | 3 | 5 | 10;
}
export interface CasualtySnapshot { personnel: number; tanks: number; artillery: number; fighters: number; bombers: number; warships: number; }
export interface WarState {
  tactical?: import('./tactical').TacticalBattle;
  id: string; attackerId: string; defenderId: string; startedDay: number; progress: number; rounds: number; autoAssault: boolean; status: WarStatus;
  terrain: BattlefieldTerrain; attackerSupply: number; defenderSupply: number; airSuperiority: number; attackerExhaustion: number; defenderExhaustion: number; lastCombatDay: number;
  attackerLosses: CasualtySnapshot; defenderLosses: CasualtySnapshot; lastReport: string;
  /** Personnel at declaration; the 8% collapse rule is measured against it. Absent in pre-0.84 saves. */
  attackerStartPersonnel?: number; defenderStartPersonnel?: number;
  /** 0.88: allies (alliance treaty or collective-security bloc) fighting on the defender's side. Absent in older saves. */
  defenderAllies?: string[];
  /** Phase 4: air and naval task groups of both sides. Absent in older saves: those wars keep the fixed 25% share. */
  taskGroups?: import('./taskGroups').TaskGroup[];
  /** Phase 4: last day each side's government reviewed its task groups (AI review spacing). */
  taskReviewDay?: Partial<Record<'attacker' | 'defender', number>>;
}

export interface EventOption { id: string; label: string; consequenceHint: string; }
export interface ActiveGameEvent { id: string; kind: EventKind; title: string; description: string; triggeredDay: number; options: EventOption[];
  /** 0.88: the foreign country an event concerns (border incident, arms offer); absent for domestic events and older saves. */
  subjectCountryId?: string; }

export interface AllianceBloc {
  id: string;
  name: string;
  leaderId: string;
  memberIds: string[];
  cohesion: number;
  doctrine: 'collective_security' | 'economic_union' | 'regional_compact';
}

export interface CouncilResolution {
  id: string;
  type: CouncilResolutionType;
  proposerId: string;
  targetCountryId: string;
  supportPercent: number;
  passed: boolean;
  day: number;
  summary: string;
}

export interface GlobalCouncilState {
  influenceByCountry: Record<string, number>;
  history: CouncilResolution[];
}

export interface GameState {
  schemaVersion: number;
  simulationSeed: number;
  day: number;
  speed: GameSpeed;
  preferredSpeed: Exclude<GameSpeed, 0>;
  campaignStatus: CampaignStatus;
  playerProfile: PlayerProfile;
  playerCountryId: string;
  selectedCountryId: string | null;
  mapMode: MapMode;
  mapPresentation: MapPresentation;
  mapNotice: string | null;
  countries: Record<string, CountryState>;
  tradeDeals: Record<string, TradeDeal>;
  wars: Record<string, WarState>;
  blocs: Record<string, AllianceBloc>;
  council: GlobalCouncilState;
  intelOperations: Record<string, IntelOperation>;
  intelligenceLedger: Record<string, number>;
  culturalInfluence: Record<string, number>;
  activeEvent: ActiveGameEvent | null;
  eventCooldownUntil: number;
  activeAdvisor: AdvisorPrompt | null;
  advisorCooldownUntil: number;
  embassies: Record<string, EmbassyMission>;
  diplomaticOffers: DiplomaticOffer[];
  production: Record<string, NationalProductionState>;
  infrastructure: Record<string, NationalInfrastructureState>;
  industrialEconomy:Record<string,NationalIndustrialEconomy>;
  industrialContracts:Record<string,IndustrialContract>;
  leadership:LeadershipState;
  world:WorldState;
  lastAiDay: number;
  lastStrategicReviewDay: number;
  sitrep: string[];
}

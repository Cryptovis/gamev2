import type { MapMode } from './map';

export type GameSpeed = 0 | 1 | 2 | 3 | 5;
export type RegimeType = 'republic' | 'democracy' | 'autocracy' | 'monarchy' | 'theocracy';
export type ReligionType = 'christianity' | 'catholic_christianity' | 'orthodox_christianity' | 'protestant_christianity' | 'islam' | 'hinduism' | 'buddhism' | 'judaism' | 'unaffiliated' | 'folk_or_mixed';
export type IdeologyType = 'pluralist' | 'state_centric' | 'state_socialist' | 'royalist' | 'religious_state';
export type RelationStatus = 'war' | 'hostile' | 'neutral' | 'friendly' | 'ally';
export type TreatyType = 'trade' | 'nonAggression' | 'alliance';
export type TradeResource = 'food' | 'oil' | 'iron' | 'uranium';
export type WarStatus = 'active' | 'victory' | 'defeat' | 'withdrawn';
export type BattlefieldTerrain = 'plains' | 'urban' | 'mountain' | 'forest' | 'desert' | 'coastal';
export type CampaignStatus = 'active' | 'lost';
export type EventKind = 'food_crisis' | 'inflation_shock' | 'war_weariness' | 'corruption_scandal' | 'fuel_crisis' | 'intelligence_breach';
export type MinistryKey = 'economy' | 'defense' | 'science' | 'intelligence' | 'interior' | 'society';
export type TechnologyCategory = 'economy' | 'industry' | 'military' | 'intelligence' | 'energy' | 'society';
export type CouncilResolutionType = 'sanctions' | 'ceasefire' | 'humanitarian_aid';
export type StrategicGoal = 'stabilize' | 'grow_economy' | 'rearm' | 'secure_resources' | 'expand_influence';
export type IntelOperationType = 'gather_intelligence' | 'influence_campaign' | 'sabotage_industry' | 'counter_network';
export type IntelOperationStatus = 'active' | 'success' | 'failed' | 'compromised';

export interface DemographicsState { population: number; workforce: number; growthRate: number; }
export interface ResourceStockpile { food: number; oil: number; iron: number; uranium: number; }
export interface ResourceProduction { food: number; oil: number; iron: number; uranium: number; }
export interface ProcessedResources { fuel: number; steel: number; electricity: number; }
export interface EconomyState { gdp: number; treasury: number; debt: number; taxRate: number; inflation: number; unemployment: number; productivity: number; }
export interface IndustryState { factories: number; refineries: number; mines: number; powerCapacity: number; utilization: number; }
export interface PoliticsState { approval: number; stability: number; regime: RegimeType; electionDaysRemaining: number; }
export interface SocietyState { dominantReligion: ReligionType; ideology: IdeologyType; cohesion: number; secularization: number; influencePressure: { ideology: number; religion: number }; }
export interface MilitaryAssessment { gfpRank: number | null; gfpIndex: number | null; capability: number; dataConfidence: 'gfp-2026' | 'estimated'; }
export interface MilitaryState { personnel: number; tanks: number; artillery: number; fighters: number; bombers: number; warships: number; readiness: number; morale: number; logistics: number; technology: number; assessment: MilitaryAssessment; }
export interface DiplomaticRelation { score: number; status: RelationStatus; treaties: TreatyType[]; sanctions: boolean; }
export interface DiplomacyState { relations: Record<string, DiplomaticRelation>; reputation: number; }
export interface IntelligenceState { networkStrength: number; counterIntelligence: number; intelConfidence: number; }
export interface MinistryState { allocations: Record<MinistryKey, number>; efficiency: Record<MinistryKey, number>; }
export interface TechnologyState { researchPoints: number; unlocked: string[]; }
export interface StrategicAIState { strategicGoal: StrategicGoal; goalProgress: number; threatFocus: string | null; lastGoalReviewDay: number; }
export interface IntelOperation { id: string; type: IntelOperationType; sourceCountryId: string; targetCountryId: string; startedDay: number; completeDay: number; status: IntelOperationStatus; successChance: number; resultSummary: string; }

export interface CountryState {
  id: string;
  name: string;
  iso2: string;
  mapName: string;
  mapNumericId: string;
  region: string;
  subregion: string;
  controllerCountryId: string | null;
  globalSanctions: boolean;
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

export interface TradeDeal { id: string; sellerId: string; buyerId: string; resource: TradeResource; quantityPerDay: number; pricePerUnit: number; active: boolean; }
export interface CasualtySnapshot { personnel: number; tanks: number; artillery: number; fighters: number; bombers: number; warships: number; }
export interface WarState {
  id: string; attackerId: string; defenderId: string; startedDay: number; progress: number; rounds: number; autoAssault: boolean; status: WarStatus;
  terrain: BattlefieldTerrain; attackerSupply: number; defenderSupply: number; airSuperiority: number; attackerExhaustion: number; defenderExhaustion: number; lastCombatDay: number;
  attackerLosses: CasualtySnapshot; defenderLosses: CasualtySnapshot; lastReport: string;
}

export interface EventOption { id: string; label: string; consequenceHint: string; }
export interface ActiveGameEvent { id: string; kind: EventKind; title: string; description: string; triggeredDay: number; options: EventOption[]; }

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
  campaignStatus: CampaignStatus;
  playerCountryId: string;
  selectedCountryId: string | null;
  mapMode: MapMode;
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
  lastAiDay: number;
  lastStrategicReviewDay: number;
  sitrep: string[];
}

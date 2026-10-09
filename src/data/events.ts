import type { CountryState, EventKind, GameState, WarState } from '../domain/game';

// Event catalogue (audit E3). Each definition is plain data plus pure functions of an EventContext that the
// engine (src/engine/systems/events.ts) builds from GameState. Effects are declarative, so the engine computes
// both the consequence hint the player sees and the change it applies from the same numbers.
// Money is a base $B for a 1,300B economy; the engine scales it with the payer's GDP (scaledCostB).

export type EventCategory = 'economy' | 'society' | 'politics' | 'diplomacy' | 'disaster' | 'technology' | 'energy' | 'military' | 'health';

/** Derived facts about the player's situation; computed once per check by the engine. */
export interface EventContext {
  state: GameState;
  player: CountryState;
  day: number;
  /** Active war the player fights, if any. */
  war: WarState | undefined;
  /** Personnel lost on both sides of that war. */
  casualties: number;
  /** Relations marked hostile or at war. */
  hostileCount: number;
  /** Partners holding an alliance treaty with the player. */
  allies: number;
  foodReserveDays: number;
  foodPerMillion: number;
  /** Food reserve days below which resources.ts declares a shortage. */
  shortageReserveDays: number;
  oilReserveDays: number;
  /** Player covert operations exposed in the last five days. */
  compromisedOps: number;
  /** Electricity coverage in percent (100 when the energy system has no record). */
  energyCoverage: number;
  /** Active wars in the player's region that the player is not part of. */
  regionalWars: number;
  /** A player war ended within the last 180 days. */
  recentWarEnded: boolean;
  /** Lowest-scored foreign relation that is not at war (border incident subject). */
  rival: { id: string; score: number } | undefined;
  /** Best foreign partner with relations of at least 20 and no sanctions (arms offer subject). */
  partner: { id: string; score: number } | undefined;
  /** Days since an event-chain flag was set, or undefined when it is not set. */
  flagAge: (flag: string) => number | undefined;
}

/** Declarative consequences. Stat changes are additive and clamped by the engine. */
export interface EventEffects {
  /** Base cost in $B (GDP-scaled). Negative values are revenue. */
  costB?: number;
  approval?: number;
  stability?: number;
  reputation?: number;
  cohesion?: number;
  inflation?: number;
  taxRate?: number;
  unemployment?: number;
  utilization?: number;
  morale?: number;
  readiness?: number;
  militaryTechnology?: number;
  counterIntelligence?: number;
  researchPoints?: number;
  /** Relation change with the event's subject country. */
  subjectRelations?: number;
  food?: number;
  fuel?: number;
  electricity?: number;
  /** Chain flags this choice opens (a later event reads them). */
  setFlags?: string[];
  /** Chain flags this choice closes. */
  clearFlags?: string[];
}

export interface EventOptionDefinition {
  id: string;
  label: string;
  /** Sitrep line after the choice is made. */
  summary: string;
  effects: EventEffects;
}

export interface EventDefinition {
  kind: EventKind;
  category: EventCategory;
  /** Emergencies are checked daily and fire whenever their condition holds; agenda events are weekly weighted draws. */
  tier: 'emergency' | 'agenda';
  /** Kicker shown above the event artwork. */
  label: string;
  /** Existing scene used by the event artwork. */
  artwork: EventKind;
  title: string;
  /** May contain {0}, replaced by the subject country's name. */
  description: string;
  /** Days before this kind may fire again (agenda events; defaults to EVENT_KIND_COOLDOWN). */
  cooldownDays?: number;
  /** Hard gate: the event is impossible unless this holds. */
  condition?: (ctx: EventContext) => boolean;
  /** Pressure 0–100: sets both how likely an agenda event is and its share of the weighted draw. */
  weight: (ctx: EventContext) => number;
  /** Foreign country the event concerns; the event is skipped when this returns undefined. */
  subject?: (ctx: EventContext) => string | undefined;
  options: EventOptionDefinition[];
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
/** True when a chain flag has been set for at least `days` days. */
const flagReady = (ctx: EventContext, flag: string, days: number) => (ctx.flagAge(flag) ?? -1) >= days;

/** Food per million people below which the reserve crisis fires; resources.ts flags shortage at 0.15. */
export const FOOD_CRISIS_PER_MILLION = 0.3;

/** Chain flags. */
export const EVENT_FLAGS = {
  investigation: 'investigation_open',
  trial: 'trial_pending',
  techBoom: 'tech_boom',
  gridInquiry: 'grid_inquiry',
  refugees: 'refugees_hosted',
  pandemic: 'pandemic_risk',
} as const;

const definitions: EventDefinition[] = [
  // ── Emergencies (checked daily, in this order) ──
  {
    kind: 'food_crisis', category: 'economy', tier: 'emergency', label: 'SUPPLY CRISIS', artwork: 'food_crisis',
    title: 'Strategic Food Reserve Crisis',
    description: 'National food reserves have fallen below the emergency threshold. Supply chains are beginning to strain.',
    // Fires ahead of the resources.ts shortage (reserve days < shortage days) or when the per-capita stock is critically thin.
    condition: (ctx) => ctx.foodReserveDays < ctx.shortageReserveDays * 2 || ctx.foodPerMillion < FOOD_CRISIS_PER_MILLION,
    weight: () => 100,
    options: [
      { id: 'imports', label: 'Emergency Imports', summary: 'Emergency food imports secured.', effects: { costB: 10, food: 120 } },
      { id: 'ration', label: 'Introduce Rationing', summary: 'Rationing program introduced.', effects: { approval: -2, stability: -1, food: 35 } },
    ],
  },
  {
    kind: 'fuel_crisis', category: 'energy', tier: 'emergency', label: 'ENERGY SECURITY', artwork: 'fuel_crisis',
    title: 'National Fuel Emergency',
    description: 'Military and industrial fuel reserves have fallen to operationally dangerous levels. Refinery output cannot meet current demand.',
    condition: (ctx) => ctx.player.processedResources.fuel < 12 && ctx.player.military.readiness > 55,
    weight: () => 100,
    options: [
      { id: 'fuel_imports', label: 'Emergency Fuel Purchases', summary: 'Emergency refined-fuel purchases arrived.', effects: { costB: 9, fuel: 35 } },
      { id: 'priority', label: 'Prioritize Military Allocation', summary: 'Fuel allocation was diverted toward military readiness.', effects: { fuel: 12, utilization: -5 } },
    ],
  },
  {
    kind: 'intelligence_breach', category: 'politics', tier: 'emergency', label: 'COVERT CRISIS', artwork: 'intelligence_breach',
    title: 'Intelligence Network Exposed',
    description: 'A recent covert operation has been publicly linked to your government. Opposition parties and foreign diplomats are demanding answers.',
    condition: (ctx) => ctx.compromisedOps > 0,
    weight: () => 100,
    options: [
      { id: 'deny', label: 'Issue Formal Denial', summary: 'Government issued a formal denial amid continued scrutiny.', effects: { reputation: -3, approval: -1 } },
      { id: 'reform', label: 'Order Internal Review', summary: 'An internal intelligence review was ordered.', effects: { costB: 4, counterIntelligence: 5, reputation: 1 } },
    ],
  },

  // ── 0.84 public agenda (pressure formulas unchanged) ──
  {
    kind: 'inflation_shock', category: 'economy', tier: 'agenda', label: 'ECONOMIC SHOCK', artwork: 'inflation_shock',
    title: 'Cost of Living Shock',
    description: 'Rapid price growth is squeezing households and eroding confidence in the government.',
    weight: (ctx) => clamp((ctx.player.economy.inflation - 7) * 6, 0, 95),
    options: [
      { id: 'subsidize', label: 'Targeted Subsidies', summary: 'Targeted household subsidies announced.', effects: { costB: 8, approval: 2 } },
      { id: 'tighten', label: 'Fiscal Tightening', summary: 'Fiscal tightening package enacted.', effects: { inflation: -1.2, approval: -2 } },
    ],
  },
  {
    kind: 'war_weariness', category: 'military', tier: 'agenda', label: 'WAR HOME FRONT', artwork: 'war_weariness',
    title: 'War Weariness',
    description: 'Mounting casualties are dominating national media and public debate.',
    condition: (ctx) => !!ctx.war,
    weight: (ctx) => clamp(ctx.casualties / 250 + Math.max(0, 60 - ctx.player.military.morale), 0, 95),
    options: [
      { id: 'address', label: 'Address the Nation', summary: 'National address steadied public morale.', effects: { costB: 3, approval: 1, morale: 2 } },
      { id: 'mobilize', label: 'Double Down on Mobilization', summary: 'Full mobilization order issued.', effects: { approval: -3, readiness: 4 } },
    ],
  },
  {
    kind: 'tax_protest', category: 'economy', tier: 'agenda', label: 'DOMESTIC PRESSURE', artwork: 'tax_protest',
    title: 'Tax Burden Protests',
    description: 'Business groups and households are organizing demonstrations against the current tax burden and cost of government.',
    weight: (ctx) => clamp((ctx.player.economy.taxRate - 28) * 4 + Math.max(0, 55 - ctx.player.politics.approval), 0, 95),
    options: [
      { id: 'tax_relief', label: 'Temporary Tax Relief', summary: 'Temporary tax relief announced.', effects: { taxRate: -3, approval: 3 } },
      { id: 'hold_tax', label: 'Defend Fiscal Policy', summary: 'Government defended the current fiscal framework.', effects: { stability: -2 } },
    ],
  },
  {
    kind: 'reform_demand', category: 'politics', tier: 'agenda', label: 'REFORM AGENDA', artwork: 'reform_demand',
    title: 'Public Reform Campaign',
    description: 'Civil society groups are demanding institutional reforms, transparency measures and stronger public accountability.',
    weight: (ctx) => clamp(Math.max(0, 52 - ctx.player.politics.approval) * 2 + Math.max(0, 60 - ctx.player.politics.stability), 0, 90),
    options: [
      { id: 'reform_package', label: 'Launch Reform Package', summary: 'Institutional reform package launched.', effects: { costB: 6, approval: 3, stability: 2, cohesion: 1 } },
      { id: 'delay_reform', label: 'Delay the Agenda', summary: 'Reform agenda delayed.', effects: { approval: -2, stability: -1 } },
    ],
  },
  {
    kind: 'health_crisis', category: 'health', tier: 'agenda', label: 'PUBLIC HEALTH', artwork: 'health_crisis',
    title: 'Public Health Capacity Alert',
    description: 'Hospitals and local health services report mounting capacity pressure. The issue is beginning to dominate public debate.',
    weight: (ctx) => clamp(Math.max(0, 7 - ctx.player.economy.treasury / Math.max(1, ctx.player.demographics.population / 10_000_000)) * 8 + Math.max(0, 50 - ctx.player.politics.stability), 0, 82),
    options: [
      { id: 'health_fund', label: 'Emergency Health Funding', summary: 'Emergency health funding approved.', effects: { costB: 7, approval: 2, stability: 1 } },
      { id: 'targeted_health', label: 'Target Hotspots', summary: 'Targeted health response deployed.', effects: { costB: 3, approval: 1 } },
    ],
  },
  {
    kind: 'foreign_policy_backlash', category: 'diplomacy', tier: 'agenda', label: 'FOREIGN POLICY', artwork: 'foreign_policy_backlash',
    title: 'Foreign Policy Backlash',
    description: 'Opposition figures and civic groups are questioning recent external alignments and the diplomatic cost of current partnerships.',
    weight: (ctx) => clamp(ctx.hostileCount * 9 + Math.max(0, 50 - ctx.player.diplomacy.reputation), 0, 86),
    options: [
      { id: 'defend_policy', label: 'Defend the Strategy', summary: 'Government publicly defended its foreign-policy doctrine.', effects: { approval: -1, reputation: 1 } },
      { id: 'review_policy', label: 'Order Foreign Policy Review', summary: 'Foreign-policy review commissioned.', effects: { costB: 2, approval: 1, reputation: 2 } },
    ],
  },
  {
    kind: 'corruption_scandal', category: 'politics', tier: 'agenda', label: 'POLITICAL CRISIS', artwork: 'corruption_scandal',
    title: 'Procurement Scandal',
    description: 'Investigative journalists allege irregularities in a major defense procurement contract.',
    // Chain A starts here; the scandal waits while its investigation is still running.
    condition: (ctx) => ctx.flagAge(EVENT_FLAGS.investigation) === undefined && ctx.flagAge(EVENT_FLAGS.trial) === undefined,
    weight: () => 18,
    options: [
      { id: 'investigate', label: 'Open Independent Investigation', summary: 'Independent investigation launched.', effects: { costB: 5, approval: 3, stability: 2, setFlags: [EVENT_FLAGS.investigation] } },
      { id: 'cover', label: 'Contain the Story', summary: 'The scandal was contained at a political cost.', effects: { approval: -4, stability: -3 } },
    ],
  },
  {
    kind: 'earthquake', category: 'disaster', tier: 'agenda', label: 'NATURAL DISASTER', artwork: 'earthquake',
    title: 'Major Earthquake',
    description: 'A destructive earthquake has struck a populated region. Emergency services are requesting immediate national support.',
    weight: () => 3,
    options: [
      { id: 'disaster_relief', label: 'Mobilize National Relief', summary: 'National disaster-relief mobilization launched.', effects: { costB: 8, approval: 3, stability: 2 } },
      { id: 'local_response', label: 'Delegate Regional Response', summary: 'Regional authorities assumed primary disaster response.', effects: { costB: 3, stability: -2 } },
    ],
  },

  // ── 0.88 chain A: investigation → findings → trial ──
  {
    kind: 'investigation_findings', category: 'politics', tier: 'agenda', label: 'POLITICAL CRISIS', artwork: 'corruption_scandal',
    title: 'Investigation Findings Delivered',
    description: 'The independent investigators have traced the procurement irregularities to senior officials. How the report is handled will shape the government\'s credibility.',
    condition: (ctx) => flagReady(ctx, EVENT_FLAGS.investigation, 30),
    weight: () => 60,
    options: [
      { id: 'publish_findings', label: 'Publish the Full Report', summary: 'The investigation report was published in full.', effects: { approval: 2, stability: -2, reputation: 2, clearFlags: [EVENT_FLAGS.investigation], setFlags: [EVENT_FLAGS.trial] } },
      { id: 'seal_findings', label: 'Keep the Report Sealed', summary: 'The investigation report was sealed.', effects: { approval: -3, reputation: -1, clearFlags: [EVENT_FLAGS.investigation] } },
    ],
  },
  {
    kind: 'corruption_trial', category: 'politics', tier: 'agenda', label: 'POLITICAL CRISIS', artwork: 'corruption_scandal',
    title: 'Procurement Trial',
    description: 'Prosecutors are ready to bring the officials named in the report to trial. The verdict will be watched at home and abroad.',
    condition: (ctx) => flagReady(ctx, EVENT_FLAGS.trial, 45),
    weight: () => 60,
    options: [
      { id: 'full_trial', label: 'Let the Courts Proceed', summary: 'The procurement trial went ahead in open court.', effects: { costB: 2, approval: 4, stability: 2, reputation: 2, clearFlags: [EVENT_FLAGS.trial] } },
      { id: 'plea_deal', label: 'Accept Plea Agreements', summary: 'Plea agreements returned part of the stolen funds.', effects: { costB: -3, approval: 1, stability: 1, clearFlags: [EVENT_FLAGS.trial] } },
      { id: 'pardon', label: 'Pardon the Officials', summary: 'The accused officials were pardoned.', effects: { approval: -5, stability: 2, reputation: -3, clearFlags: [EVENT_FLAGS.trial] } },
    ],
  },

  // ── Chain B: breakthrough → investment boom ──
  {
    kind: 'tech_breakthrough', category: 'technology', tier: 'agenda', label: 'TECHNOLOGY', artwork: 'reform_demand',
    title: 'National Research Breakthrough',
    description: 'A national laboratory reports a breakthrough with civilian and military uses. Ministries are competing to decide what happens next.',
    cooldownDays: 180,
    condition: (ctx) => ctx.flagAge(EVENT_FLAGS.techBoom) === undefined,
    weight: (ctx) => clamp(3 + ctx.player.technology.unlocked.length * 1.2 + ctx.player.ministries.allocations.science * 0.1, 0, 30),
    options: [
      { id: 'commercialize', label: 'Fund Commercialization', summary: 'Commercialization grants were awarded.', effects: { costB: 4, researchPoints: 20, setFlags: [EVENT_FLAGS.techBoom] } },
      { id: 'defense_use', label: 'Assign to Defense Programmes', summary: 'The breakthrough was classified for defense programmes.', effects: { costB: 3, militaryTechnology: 2, readiness: 1 } },
      { id: 'open_science', label: 'Publish as Open Science', summary: 'The research was published openly.', effects: { reputation: 2, researchPoints: 10 } },
    ],
  },
  {
    kind: 'tech_investment_boom', category: 'technology', tier: 'agenda', label: 'TECHNOLOGY', artwork: 'inflation_shock',
    title: 'Technology Investment Boom',
    description: 'Start-ups built on the commercialized research are attracting record private investment. Investors ask how the state will treat the sector.',
    condition: (ctx) => flagReady(ctx, EVENT_FLAGS.techBoom, 60),
    weight: () => 50,
    options: [
      { id: 'tech_zones', label: 'Create Technology Zones', summary: 'Technology zones were created.', effects: { costB: 5, unemployment: -0.6, researchPoints: 15, approval: 1, clearFlags: [EVENT_FLAGS.techBoom] } },
      { id: 'tax_windfall', label: 'Tax the Windfall', summary: 'A windfall levy was applied to the technology sector.', effects: { costB: -4, approval: -1, clearFlags: [EVENT_FLAGS.techBoom] } },
    ],
  },

  // ── Chain C: grid failure → modernization inquiry ──
  {
    kind: 'grid_failure', category: 'energy', tier: 'agenda', label: 'ENERGY SECURITY', artwork: 'fuel_crisis',
    title: 'Power Grid Failure',
    description: 'A cascading failure has left several provinces without electricity. Hospitals and factories are running on backup power.',
    cooldownDays: 120,
    condition: (ctx) => ctx.flagAge(EVENT_FLAGS.gridInquiry) === undefined,
    weight: (ctx) => clamp(2 + (100 - ctx.energyCoverage) * 1.5, 0, 60),
    options: [
      { id: 'emergency_generation', label: 'Rent Emergency Generators', summary: 'Emergency generators restored critical supply.', effects: { costB: 4, electricity: 15, approval: 1, setFlags: [EVENT_FLAGS.gridInquiry] } },
      { id: 'rolling_blackouts', label: 'Schedule Rolling Blackouts', summary: 'Rolling blackouts were scheduled.', effects: { approval: -2, utilization: -4, setFlags: [EVENT_FLAGS.gridInquiry] } },
    ],
  },
  {
    kind: 'grid_modernization', category: 'energy', tier: 'agenda', label: 'ENERGY SECURITY', artwork: 'fuel_crisis',
    title: 'Grid Inquiry Report',
    description: 'The inquiry into the blackout blames decades of underinvestment in transmission lines and asks for a modernization programme.',
    condition: (ctx) => flagReady(ctx, EVENT_FLAGS.gridInquiry, 45),
    weight: () => 50,
    options: [
      { id: 'grid_upgrade', label: 'Fund Grid Modernization', summary: 'A grid modernization programme was funded.', effects: { costB: 8, utilization: 3, stability: 1, electricity: 10, clearFlags: [EVENT_FLAGS.gridInquiry] } },
      { id: 'grid_defer', label: 'Defer the Investment', summary: 'Grid investment was deferred.', effects: { approval: -1, clearFlags: [EVENT_FLAGS.gridInquiry] } },
    ],
  },

  // ── Chain D: refugee influx → integration ──
  {
    kind: 'refugee_influx', category: 'society', tier: 'agenda', label: 'HUMANITARIAN', artwork: 'foreign_policy_backlash',
    title: 'Refugees at the Border',
    description: 'Fighting in the region has driven families to the border. Aid agencies ask the government to open humanitarian corridors.',
    cooldownDays: 180,
    condition: (ctx) => ctx.regionalWars > 0 && ctx.flagAge(EVENT_FLAGS.refugees) === undefined,
    weight: (ctx) => clamp(ctx.regionalWars * 12, 0, 45),
    options: [
      { id: 'open_corridors', label: 'Open Humanitarian Corridors', summary: 'Humanitarian corridors were opened.', effects: { costB: 3, reputation: 3, cohesion: -1, setFlags: [EVENT_FLAGS.refugees] } },
      { id: 'restrict_entry', label: 'Restrict Entry', summary: 'Border entry was restricted.', effects: { approval: 1, reputation: -2 } },
      { id: 'fund_camps', label: 'Fund Camps Abroad', summary: 'Refugee camps abroad received national funding.', effects: { costB: 2, reputation: 1 } },
    ],
  },
  {
    kind: 'refugee_integration', category: 'society', tier: 'agenda', label: 'HUMANITARIAN', artwork: 'reform_demand',
    title: 'Refugee Integration Test',
    description: 'Months after the corridors opened, local councils report pressure on schools and housing. The government must decide how refugees settle.',
    condition: (ctx) => flagReady(ctx, EVENT_FLAGS.refugees, 90),
    weight: () => 45,
    options: [
      { id: 'integration_programme', label: 'Language and Jobs Programme', summary: 'A language and jobs programme was launched.', effects: { costB: 3, cohesion: 2, unemployment: -0.2, clearFlags: [EVENT_FLAGS.refugees] } },
      { id: 'temporary_status', label: 'Keep Temporary Status Only', summary: 'Refugees kept temporary status only.', effects: { cohesion: -2, approval: 1, clearFlags: [EVENT_FLAGS.refugees] } },
    ],
  },

  // ── Chain E: outbreak → second wave ──
  {
    kind: 'pandemic_outbreak', category: 'health', tier: 'agenda', label: 'PUBLIC HEALTH', artwork: 'health_crisis',
    title: 'Novel Virus Outbreak',
    description: 'Doctors report clusters of a fast-spreading respiratory virus. Epidemiologists warn that the next weeks decide its course.',
    cooldownDays: 365,
    condition: (ctx) => ctx.flagAge(EVENT_FLAGS.pandemic) === undefined,
    weight: (ctx) => clamp(2 + Math.max(0, 50 - ctx.player.politics.stability) * 0.2, 0, 10),
    options: [
      { id: 'early_containment', label: 'Early Containment Measures', summary: 'Early containment measures slowed the outbreak.', effects: { costB: 4, approval: -1, utilization: -3, stability: 1 } },
      { id: 'monitor', label: 'Monitor and Advise', summary: 'Health authorities issued advice and kept monitoring.', effects: { approval: 1, setFlags: [EVENT_FLAGS.pandemic] } },
    ],
  },
  {
    kind: 'pandemic_second_wave', category: 'health', tier: 'agenda', label: 'PUBLIC HEALTH', artwork: 'health_crisis',
    title: 'Second Infection Wave',
    description: 'The virus is spreading again and hospitals are filling. Advisers want a decision before the health system is overwhelmed.',
    condition: (ctx) => flagReady(ctx, EVENT_FLAGS.pandemic, 30),
    weight: () => 60,
    options: [
      { id: 'national_lockdown', label: 'Nationwide Lockdown', summary: 'A nationwide lockdown was imposed.', effects: { costB: 6, approval: -2, utilization: -6, stability: 1, clearFlags: [EVENT_FLAGS.pandemic] } },
      { id: 'vaccination_drive', label: 'Accelerated Vaccination Drive', summary: 'An accelerated vaccination drive began.', effects: { costB: 9, approval: 2, stability: 2, clearFlags: [EVENT_FLAGS.pandemic] } },
    ],
  },

  // ── Stand-alone events ──
  {
    kind: 'flood', category: 'disaster', tier: 'agenda', label: 'NATURAL DISASTER', artwork: 'earthquake',
    title: 'Severe Flooding',
    description: 'Days of torrential rain have burst river banks. Towns are cut off and farmland is under water.',
    cooldownDays: 240,
    weight: () => 3,
    options: [
      { id: 'flood_relief', label: 'Deploy National Relief', summary: 'National flood relief was deployed.', effects: { costB: 6, approval: 2, stability: 1 } },
      { id: 'flood_local', label: 'Leave It to Local Budgets', summary: 'Local authorities handled the flood response.', effects: { stability: -2, food: -20 } },
    ],
  },
  {
    kind: 'drought', category: 'disaster', tier: 'agenda', label: 'NATURAL DISASTER', artwork: 'food_crisis',
    title: 'Prolonged Drought',
    description: 'A dry season has stretched into months. Reservoirs are low and farmers warn of a poor harvest.',
    cooldownDays: 240,
    weight: (ctx) => clamp(1.5 + Math.max(0, 365 - ctx.foodReserveDays) / 20, 0, 20),
    options: [
      { id: 'irrigation_fund', label: 'Emergency Irrigation Fund', summary: 'An emergency irrigation fund was opened.', effects: { costB: 5, food: 40 } },
      { id: 'water_rationing', label: 'Water Rationing', summary: 'Water rationing was introduced.', effects: { approval: -1, food: 15 } },
    ],
  },
  {
    kind: 'cyberattack', category: 'technology', tier: 'agenda', label: 'CYBER SECURITY', artwork: 'intelligence_breach',
    title: 'Cyberattack on Public Services',
    description: 'Hackers have disrupted tax, customs and hospital systems. Security services suspect a foreign state.',
    cooldownDays: 120,
    weight: (ctx) => clamp(2 + ctx.hostileCount * 4 + Math.max(0, 50 - ctx.player.intelligence.counterIntelligence) / 4, 0, 35),
    options: [
      { id: 'harden_networks', label: 'Harden State Networks', summary: 'State networks were hardened.', effects: { costB: 3, counterIntelligence: 4 } },
      { id: 'attribute_publicly', label: 'Attribute the Attack Publicly', summary: 'The government publicly attributed the attack.', effects: { approval: 1, reputation: -1, counterIntelligence: 1 } },
    ],
  },
  {
    kind: 'banking_stress', category: 'economy', tier: 'agenda', label: 'ECONOMIC SHOCK', artwork: 'inflation_shock',
    title: 'Banking Sector Stress',
    description: 'Depositors are queueing at a large bank after reports of bad loans. Regulators fear contagion across the sector.',
    cooldownDays: 180,
    weight: (ctx) => clamp((ctx.player.economy.debt / Math.max(1, ctx.player.economy.gdp) * 100 - 70) * 0.8 + Math.max(0, ctx.player.economy.inflation - 8) * 3, 0, 60),
    options: [
      { id: 'deposit_guarantee', label: 'Guarantee All Deposits', summary: 'All bank deposits were guaranteed.', effects: { costB: 7, stability: 2 } },
      { id: 'bail_in', label: 'Impose Losses on Bondholders', summary: 'Bank bondholders absorbed the losses.', effects: { approval: -2, reputation: -1, inflation: -0.5 } },
    ],
  },
  {
    kind: 'export_boom', category: 'economy', tier: 'agenda', label: 'ECONOMY', artwork: 'inflation_shock',
    title: 'Export Boom',
    description: 'Strong foreign demand has lifted export orders to a record. Tax receipts are running ahead of forecast.',
    cooldownDays: 180,
    weight: (ctx) => clamp(2 + (ctx.player.economy.inflation < 6 ? 2 : 0) + ctx.allies * 1.5, 0, 15),
    options: [
      { id: 'bank_windfall', label: 'Bank the Windfall', summary: 'Extra export revenue was banked.', effects: { costB: -5 } },
      { id: 'cut_consumer_tax', label: 'Cut Consumer Taxes', summary: 'Consumer taxes were cut temporarily.', effects: { approval: 2, inflation: 0.3 } },
    ],
  },
  {
    kind: 'general_strike', category: 'society', tier: 'agenda', label: 'DOMESTIC PRESSURE', artwork: 'tax_protest',
    title: 'General Strike',
    description: 'Unions have called a general strike over wages and jobs. Ports, rail and factories are slowing down.',
    cooldownDays: 120,
    weight: (ctx) => clamp((ctx.player.economy.unemployment - 8) * 5 + Math.max(0, ctx.player.economy.inflation - 8) * 3 + Math.max(0, 45 - ctx.player.politics.approval), 0, 70),
    options: [
      { id: 'wage_deal', label: 'Negotiate a Wage Deal', summary: 'A wage deal ended the strike.', effects: { costB: 5, approval: 2, inflation: 0.4 } },
      { id: 'mediate', label: 'Appoint a Mediator', summary: 'A mediator brokered a partial settlement.', effects: { costB: 2, approval: 1, utilization: -1 } },
      { id: 'hold_firm', label: 'Refuse Concessions', summary: 'The government refused concessions.', effects: { approval: -2, stability: -2, utilization: -3 } },
    ],
  },
  {
    kind: 'border_incident', category: 'military', tier: 'agenda', label: 'MILITARY', artwork: 'war_weariness',
    title: 'Border Incident',
    description: 'Patrols from {0} crossed into contested territory and exchanged fire with border guards. Both capitals are under pressure to respond.',
    cooldownDays: 120,
    subject: (ctx) => ctx.rival && ctx.rival.score < -20 ? ctx.rival.id : undefined,
    weight: (ctx) => clamp(ctx.rival ? (-ctx.rival.score - 20) / 2 : 0, 0, 35),
    options: [
      { id: 'de_escalate', label: 'Open a Hotline', summary: 'A military hotline was opened to defuse the incident.', effects: { approval: -1, subjectRelations: 8, reputation: 1 } },
      { id: 'show_of_force', label: 'Reinforce the Border', summary: 'Border units were reinforced.', effects: { costB: 2, readiness: 3, approval: 2, subjectRelations: -10 } },
    ],
  },
  {
    kind: 'veterans_demands', category: 'military', tier: 'agenda', label: 'WAR HOME FRONT', artwork: 'war_weariness',
    title: 'Veterans Demand Support',
    description: 'Returning soldiers are protesting delays in pensions, medical care and jobs after the recent war.',
    cooldownDays: 180,
    condition: (ctx) => ctx.recentWarEnded && !ctx.war,
    weight: () => 30,
    options: [
      { id: 'veterans_fund', label: 'Create a Veterans Fund', summary: 'A veterans fund was created.', effects: { costB: 4, approval: 2, morale: 3 } },
      { id: 'promise_review', label: 'Promise a Review', summary: 'Veterans were promised a review.', effects: { approval: -1, morale: -2 } },
    ],
  },
  {
    kind: 'arms_export_offer', category: 'military', tier: 'agenda', label: 'MILITARY', artwork: 'war_weariness',
    title: 'Arms Export Request',
    description: '{0} has asked to buy armoured vehicles and air-defence systems from national manufacturers.',
    cooldownDays: 240,
    subject: (ctx) => ctx.partner?.id,
    weight: (ctx) => (ctx.partner ? clamp(2 + ctx.player.military.technology / 40, 0, 6) : 0),
    options: [
      { id: 'approve_sale', label: 'Approve the Sale', summary: 'The arms sale was approved.', effects: { costB: -3, reputation: -1, subjectRelations: 6 } },
      { id: 'decline_sale', label: 'Decline the Request', summary: 'The arms request was declined.', effects: { reputation: 1, subjectRelations: -3 } },
    ],
  },
  {
    kind: 'summit_invitation', category: 'diplomacy', tier: 'agenda', label: 'FOREIGN POLICY', artwork: 'foreign_policy_backlash',
    title: 'Summit Invitation',
    description: 'The government has been invited to co-host an international summit on trade and security.',
    cooldownDays: 240,
    weight: (ctx) => clamp(2 + Math.max(0, ctx.player.diplomacy.reputation - 50) * 0.4 + ctx.allies * 2, 0, 25),
    options: [
      { id: 'host_summit', label: 'Co-host the Summit', summary: 'The government co-hosted the summit.', effects: { costB: 2, reputation: 4, approval: 1 } },
      { id: 'send_envoy', label: 'Send an Envoy', summary: 'An envoy represented the government at the summit.', effects: { reputation: 1 } },
    ],
  },
  {
    kind: 'energy_windfall', category: 'energy', tier: 'agenda', label: 'ENERGY SECURITY', artwork: 'fuel_crisis',
    title: 'Energy Export Windfall',
    description: 'High world prices have pushed national oil revenues far above budget. Parliament is debating how to use them.',
    cooldownDays: 240,
    condition: (ctx) => ctx.oilReserveDays >= 9999 && ctx.player.resourceProduction.oil > 0.5,
    weight: () => 8,
    options: [
      { id: 'sovereign_fund', label: 'Save in a Sovereign Fund', summary: 'Oil revenue was saved in a sovereign fund.', effects: { costB: -6, stability: 1 } },
      { id: 'fuel_price_cut', label: 'Cut Fuel Prices', summary: 'Domestic fuel prices were cut.', effects: { approval: 3, inflation: -0.4, fuel: -5 } },
    ],
  },
];

/** Compile-time list of every EventKind; `satisfies` fails the build when a kind is added without a listing. */
export const ALL_EVENT_KINDS = Object.keys({
  food_crisis: 1, inflation_shock: 1, war_weariness: 1, corruption_scandal: 1, fuel_crisis: 1, intelligence_breach: 1, earthquake: 1, health_crisis: 1,
  tax_protest: 1, reform_demand: 1, foreign_policy_backlash: 1, investigation_findings: 1, corruption_trial: 1, tech_breakthrough: 1,
  tech_investment_boom: 1, grid_failure: 1, grid_modernization: 1, refugee_influx: 1, refugee_integration: 1, pandemic_outbreak: 1,
  pandemic_second_wave: 1, flood: 1, drought: 1, cyberattack: 1, banking_stress: 1, export_boom: 1, general_strike: 1, border_incident: 1,
  veterans_demands: 1, arms_export_offer: 1, summit_invitation: 1, energy_windfall: 1,
} satisfies Record<EventKind, 1>) as EventKind[];

/** Every event kind, keyed for lookup. Kinds from older saves resolve through the same table (tests check completeness). */
export const EVENT_CATALOGUE: Record<EventKind, EventDefinition> = Object.fromEntries(definitions.map((d) => [d.kind, d])) as Record<EventKind, EventDefinition>;
export const EVENT_DEFINITIONS: readonly EventDefinition[] = definitions;

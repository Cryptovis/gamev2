/** Serializable Phase 8 contracts. Chair is an office, not an additional voting tier. */
export const ORGANIZATION_IDS = ['nato','csto','sco','imf','worldBank','wto','opecPlus','un','g20','wef','eu','asean','oic','bricsPlus'] as const;
export type OrganizationId = typeof ORGANIZATION_IDS[number];
export const P5_COUNTRY_IDS = ['USA','RUS','CHN','GBR','FRA'] as const;
export type MembershipTier = 'Observer' | 'Member' | 'PermanentCouncil' | 'Chair';
export type MembershipStatus = 'active' | 'suspended' | 'withdrawalPending';
export interface Membership {
  countryId: string;
  tier: Exclude<MembershipTier,'Chair'>;
  offices: Array<{role:'Chair';bodyId:string;untilDay:number}>;
  status: MembershipStatus;
  joinedDay: number;
  duesArrearsB: number;
}
export interface Rational { numerator: number; denominator: number }
export type VotingRule =
  | {kind:'oneCountryOneVote';threshold:Rational;quorum:Rational;denominator:'eligible'|'presentVoting';comparison?:'atLeast'|'greaterThan'}
  | {kind:'securityCouncil';minimumYes:9;vetoCountryIds:string[];procedural:boolean}
  | {kind:'weighted';basis:'gdp'|'quota';threshold:Rational;denominator:'eligibleWeight'|'castWeight';weightSnapshotId:string}
  | {kind:'consensus';objectionsBlock:true;deadlinePolicy:'expire'}
  | {kind:'unanimity';abstention:'blocks'|'allowed';quorum:Rational}
  | {kind:'doubleMajority';states:Rational;population:Rational;blockingMinorityCount:number};
export interface OrganizationBodyState {
  id: string;
  kind: 'assembly' | 'council' | 'board' | 'forum' | 'legacy';
  memberIds: string[];
  permanentMemberIds: string[];
  votingRule: VotingRule;
  /** Integer quota vote units; absent until a charter supplies an approved snapshot. */
  voteWeights?: Record<string,number>;
}
export interface OrganizationState {
  id: OrganizationId;
  charterVersion: number;
  memberships: Record<string,Membership>;
  bodies: Record<string,OrganizationBodyState>;
  standingByCountry: Record<string,number>;
  availableFundsB: number;
  committedFundsB: number;
}
export interface ElectorateSnapshot {
  eligibleCountryIds: string[];
  weights: Record<string,number>;
  populationByCountry: Record<string,number>;
  totalWeight: number;
  totalPopulation: number;
}
export type SanctionMeasure = {scope:'arms'|'trade'|'finance';intensity:number;enforcement:number};
export type Exemption = {scope:'food'|'medicine'|'humanitarian';countryIds:string[]};
export interface FinancingTerms {apr:number;termDays:number;graceDays:number;denomination:'USD'|'SDR'}
export interface ReformCondition {kind:'fiscalBalance'|'taxRate'|'subsidyShare';threshold:number;reviewDay:number}
export interface DefenseCommitment {countryId:string;personnel:number;equipmentB:number;fundingB:number;readyDay:number}
export interface PeacekeepingMandate {countryIds:string[];personnel:number;fundingB:number;durationDays:number;consentRequired:boolean}
export interface TradeRemedy {targetId:string;commodity:string;tariffRate:number;maximumValueB:number;durationDays:number}
export interface InvestmentCommitment {countryId:string;amountB:number;readyDay:number}
export interface IntegrationAgreement {countryIds:string[];tariffReduction:number;freeMovement:boolean;durationDays:number}
export interface CurrencySwapAgreement {countryA:string;countryB:string;limitB:number;durationDays:number}
export type ResolutionPayload =
  | {kind:'admission';applicantId:string;tier:'Observer'|'Member'}
  | {kind:'membershipDiscipline';targetId:string;action:'suspend'|'expel';grounds:string}
  | {kind:'sanctions';targetId:string;measures:SanctionMeasure[];durationDays:number;exemptions:Exemption[]}
  | {kind:'finance';borrowerId:string;programId:string;principalB:number;terms:FinancingTerms;conditions:ReformCondition[]}
  | {kind:'oilQuota';quotas:Record<string,number>;durationDays:number}
  | {kind:'defenseResponse';incidentId:string;commitments:DefenseCommitment[]}
  | {kind:'peacekeeping';conflictId:string;mandate:PeacekeepingMandate}
  | {kind:'tradeRemedy';disputeId:string;remedy:TradeRemedy}
  | {kind:'investmentCompact';commitments:InvestmentCommitment[]}
  | {kind:'marketIntegration';agreement:IntegrationAgreement}
  | {kind:'localCurrencySwap';agreement:CurrencySwapAgreement};
export interface Resolution {
  id:string;organizationId:OrganizationId;bodyId:string;proposerId:string;payload:ResolutionPayload;
  phase:'draft'|'debate'|'voting'|'adopted'|'rejected'|'implementing'|'expired'|'revoked'|'failed';
  openedDay:number;closesDay:number;effectiveDay:number;
  ruleSnapshot:VotingRule;electorate:ElectorateSnapshot;ballots:Record<string,'yes'|'no'|'abstain'>;
  outcome?:VotingOutcome;
  execution:{status:'pending'|'applied'|'failed';effectIds:string[];reason?:string};
}
/** Snapshot of legacy sanctions; the legacy engine remains authoritative in Slice 8.1. */
export interface LegacySanctionEffect {
  id:string;kind:'legacySanctions';issuer:'legacyCouncil';targetId:string;
  startsDay:number;endsDay:number;status:'active';
}
export interface OrganizationFinancingRecord {
  id:string;organizationId:OrganizationId;borrowerId:string;principalB:number;
  outstandingB:number;committedB:number;terms:FinancingTerms;status:'active'|'paused'|'closed';
}
export interface OrganizationsState {
  catalogVersion:number;
  byId:Record<OrganizationId,OrganizationState>;
  resolutions:Record<string,Resolution>;
  effects:Record<string,unknown>;
  financing:Record<string,unknown>;
  nextSequence:number;
  lastProcessedDay:number;
}

export interface VotingOutcome {
  passed:boolean;reason:string;yesCount:number;noCount:number;abstainCount:number;vetoedBy?:string[];
}
export interface OrganizationSanctionEffect {
  id:string;kind:'organizationSanctions';organizationId:OrganizationId;bodyId:string;sourceResolutionId:string;targetId:string;
  startsDay:number;endsDay:number;measures:SanctionMeasure[];exemptions:Exemption[];status:'active'|'expired';
}
export type FoundationalResolutionPayload=Extract<ResolutionPayload,{kind:'admission'|'membershipDiscipline'|'sanctions'}>;
export type OrganizationCommand=(
  | {type:'organization/proposeResolution';organizationId:OrganizationId;bodyId:string;payload:FoundationalResolutionPayload}
  | {type:'organization/castBallot';resolutionId:string;choice:'yes'|'no'|'abstain'}
) & {commandId?:string};

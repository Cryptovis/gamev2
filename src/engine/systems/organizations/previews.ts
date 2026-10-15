import type {GameState} from '../../../domain/game';
import type {OrganizationCommand,OrganizationId,ExecutableResolutionPayload,Resolution,VotingRule,OrganizationFinancingRecord} from '../../../domain/organizations';
import {validateOrganizationCommand,ORGANIZATION_VOTING_DAYS} from './validation';
import {evaluateVotingOutcome} from './voting';
import {activeOilQuota,constrainedOilOutput} from './quotas';
import {financingRecords} from './financing';

export const ORGANIZATION_LABELS:Record<OrganizationId,string>={un:'United Nations (UN)',nato:'NATO',csto:'CSTO',sco:'SCO',imf:'International Monetary Fund (IMF)',worldBank:'World Bank',wto:'World Trade Organization (WTO)',opecPlus:'OPEC+',g20:'G20',wef:'World Economic Forum (WEF)',eu:'European Union (EU)',asean:'ASEAN',oic:'OIC · Islamic Development Bank (IDB)',bricsPlus:'BRICS+ · New Development Bank (NDB)'};
export const BODY_LABELS:Record<string,string>={plenary:'Plenary assembly',securityCouncil:'Security Council',financeBoard:'Financial board',legacyAssembly:'Legacy assembly',legacySecurity:'Legacy security body'};
export const bodyLabel=(id:string)=>BODY_LABELS[id]??'Other body';
const pct=(n:number,d:number)=>`${(n/d*100).toFixed(1)}%`;
export function votingRuleView(rule:VotingRule):{label:string;metrics:string[][]}{
 switch(rule.kind){
  case 'oneCountryOneVote':return {label:'One country, one vote',metrics:[['Quorum',pct(rule.quorum.numerator,rule.quorum.denominator)],['Vote threshold',pct(rule.threshold.numerator,rule.threshold.denominator)],['Denominator',rule.denominator==='eligible'?'Eligible votes':'Cast votes']]};
  case 'securityCouncil':return {label:'Security Council',metrics:[['Required yes votes',String(rule.minimumYes)],['Veto',rule.procedural?'Procedural vote: no veto':'P5 no vote blocks adoption']]};
  case 'weighted':return {label:rule.basis==='quota'?'Quota-weighted vote':'GDP-weighted vote',metrics:[['Vote threshold',pct(rule.threshold.numerator,rule.threshold.denominator)],['Denominator',rule.denominator==='eligibleWeight'?'Eligible weight':'Cast weight']]};
  case 'consensus':return {label:'Consensus',metrics:[['Voting requirement','Every country must respond; any no blocks']]};
  case 'unanimity':return {label:'Unanimity',metrics:[['Voting requirement',rule.abstention==='allowed'?'Abstention allowed':'Every eligible country must vote yes']]};
  case 'doubleMajority':return {label:'Double majority',metrics:[['State threshold',pct(rule.states.numerator,rule.states.denominator)],['Population threshold',pct(rule.population.numerator,rule.population.denominator)],['Blocking minority',String(rule.blockingMinorityCount)]]};
 }
}
export function resolutionVotingView(r:Resolution){
 const outcome=evaluateVotingOutcome(r.ruleSnapshot,r.electorate,r.ballots);
 const castWeight=Object.entries(r.ballots).reduce((n,[id,choice])=>n+(choice==='abstain'?0:r.electorate.weights[id]??0),0);
 const yesWeight=Object.entries(r.ballots).reduce((n,[id,choice])=>n+(choice==='yes'?r.electorate.weights[id]??0:0),0);
 return {...outcome,castWeight,yesWeight,totalWeight:r.electorate.totalWeight,rule:votingRuleView(r.ruleSnapshot)};
}
export function financingFacilityView(state:GameState,f:OrganizationFinancingRecord){
 const l=f.lifecycle;
 return {dailyInterestB:f.outstandingB*(f.terms.apr/100)/365,accruedInterestB:l?.accruedInterestB??0,
  nextServiceDay:l?Math.min(l.nextServiceDay,l.maturityDay):null,maturityDay:l?.maturityDay??null,
  treasuryB:state.countries[f.borrowerId].economy.treasury,canRepay:f.borrowerId===state.playerCountryId&&!!l&&f.status!=='closed',
  debtServiceB:l?(state.day>=l.maturityDay?f.outstandingB+l.accruedInterestB:l.accruedInterestB):0};
}
export function quotaDeviationView(state:GameState,deviation:number,countryId=state.playerCountryId){
 const effect=activeOilQuota(state,countryId),capacity=Math.max(0,state.countries[countryId]?.resourceProduction.oil??0),maxDeviation=capacity*.1;
 const output=effect?Math.min(capacity,effect.quotas[countryId]+deviation):capacity;
 const excess=effect?Math.max(0,output-effect.quotas[countryId]):0;
 return {effect,capacity,maxDeviation,output,currentOutput:constrainedOilOutput(state,countryId),standingPenalty:effect?Math.min(2,excess/Math.max(.001,effect.quotas[countryId])*2):0,
  allowed:!!effect&&Number.isFinite(deviation)&&deviation>=0&&deviation<=maxDeviation};
}
const REASONS:Record<string,string>={
 invalidCommand:'Enter valid values for every required field.',invalidActor:'Only an independent country in an active campaign may act.',duplicateCommand:'This command has already been applied.',
 quotaDeviation:'An active quota is required; deviation cannot exceed ten percent of capacity.',hardwareTransfer:'A trade pact, alliance, available stock and unblocked access are required.',
 financingAccess:'Only the borrower can manage this outstanding facility.',invalidRepayment:'Payment must fit treasury, outstanding principal and accrued interest.',votingClosed:'Voting has closed.',ineligibleVoter:'Your country is not in the frozen electorate.',duplicateBallot:'This is already your recorded ballot.',unsupportedPayload:'This action is not available under the current charter.',
 invalidDeadline:'Choose a valid deadline.',proposalAccess:'Active voting membership and access to this body are required.',financeConsentOrBoard:'The borrower must request financing from the financial board.',
 borrowerMembership:'The borrower must be an active member.',financingDefault:'Settle outstanding arrears before requesting new finance.',financialRestriction:'Financial sanctions block this facility.',insufficientCapital:'The institution has insufficient available capital.',
 invalidFinanceTerms:'Check tranche, reform dates, term and funding conditions.',duplicateProgram:'Choose a new financing program identifier.',financingCapacity:'The financing archive is full.',
 economicAuthority:'This organization or body cannot authorize that action.',invalidParticipants:'Choose valid independent participants.',participantMembership:'Every participant must be an active member.',invalidQuota:'Enter a finite nonnegative daily quota.',invalidRemedy:'Choose a valid target, commodity and countermeasure cap.',activeDispute:'An active countermeasure already covers this dispute or commodity.',participantConsent:'Participating countries must consent.',invalidSwap:'Choose two members and a limit within five percent of the smaller GDP.',activeSwap:'An active swap already covers this pair.',
 invalidTarget:'Choose a valid independent target.',protectedOrMissingMember:'Permanent seats are protected; other targets must already be members.',alreadyMember:'The country already has active membership.',invalidExemption:'Choose known countries for exemptions.',resolutionCapacity:'Too many proposals are open or retained.',duplicateProposal:'An equivalent proposal is already open.',sequenceCollision:'The resolution sequence is unavailable.',influence:'Insufficient diplomatic influence.',electorateUnavailable:'The body does not have a valid voting electorate.'
};
export const organizationReason=(reason:string)=>reason==='allowed'?'Ready for review':REASONS[reason]??'This action is unavailable under the current rules.';
/** Shared visible terms for proposals, ballots and resolution cards. */
export function resolutionPayloadMetrics(state:GameState,payload:Resolution['payload']):string[][] {
 const metrics:string[][]=[];
   if(payload.kind==='finance')metrics.push(['Borrower',state.countries[payload.borrowerId]?.name??payload.borrowerId],['Principal ($B)',String(payload.principalB)],['APR (%)',String(payload.terms.apr)],['Term (days)',String(payload.terms.termDays)],['Initial tranche ($B)',String(payload.initialTrancheB??payload.principalB)]);
   else if(payload.kind==='sanctions')metrics.push(['Target',state.countries[payload.targetId]?.name??payload.targetId],['Sanction scope',payload.measures.map(m=>m.scope==='arms'?'Arms embargo':m.scope==='trade'?'Trade embargo':'Financial restriction').join(' · ')]);
   else if(payload.kind==='oilQuota')for(const [id,value] of Object.entries(payload.quotas))metrics.push([state.countries[id]?.name??id,String(value)]);
   else if(payload.kind==='localCurrencySwap')metrics.push(['Swap partner',state.countries[payload.agreement.countryB]?.name??payload.agreement.countryB],['Settlement limit ($B)',String(payload.agreement.limitB)],['Duration (days)',String(payload.agreement.durationDays)]);
   else if(payload.kind==='admission')metrics.push(['Target',state.countries[payload.applicantId]?.name??payload.applicantId],['Membership tier',payload.tier]);
   else if(payload.kind==='membershipDiscipline')metrics.push(['Target',state.countries[payload.targetId]?.name??payload.targetId],['Discipline action',payload.action==='suspend'?'Suspend membership':'Expel member']);
   else if(payload.kind==='tradeRemedy')metrics.push(['Target',state.countries[payload.remedy.targetId]?.name??payload.remedy.targetId],['Commodity',payload.remedy.commodity.replaceAll('_',' ')],['Tariff rate (%)',(payload.remedy.tariffRate*100).toFixed(1)],['Countermeasure cap ($B)',String(payload.remedy.maximumValueB)],['Duration (days)',String(payload.remedy.durationDays)]);
   else if(payload.kind==='marketIntegration'){
    metrics.push(['Friction reduction (%)',(payload.agreement.tariffReduction*100).toFixed(1)],['Free movement authorization',payload.agreement.freeMovement?'Yes':'No'],['Duration (days)',String(payload.agreement.durationDays)]);
    for(const id of payload.agreement.countryIds)metrics.push(['Participating members',state.countries[id]?.name??id]);
   }
   if(payload.kind==='sanctions')metrics.push(['Duration (days)',String(payload.durationDays)],['Humanitarian exemptions',payload.exemptions.length?'Humanitarian':'No exemptions']);
   if(payload.kind==='oilQuota')metrics.push(['Duration (days)',String(payload.durationDays)]);
   if(payload.kind==='finance'){
    metrics.push(['Funding type',payload.fundingKind==='grant'?'Grant':'Loan'],['Grace period (days)',String(payload.terms.graceDays)],['Annual fiscal adjustment ($B)',String(payload.fiscalAdjustmentB??0)]);
    for(const c of payload.conditions)metrics.push(['Reform condition',c.kind==='taxRate'?'Minimum tax rate (%)':c.kind==='fiscalBalance'?'Minimum fiscal balance ($B/day)':'Maximum social budget share (0–1)'],['Condition threshold',String(c.threshold)],['Review day',String(c.reviewDay)]);
   }
 return metrics;
}
export function previewOrganizationCommand(state:GameState,command:OrganizationCommand){
 const status=validateOrganizationCommand(state,command),actor=state.countries[state.playerCountryId];
 const metrics:string[][]=[['Influence fee',String(status.fee)],['Influence after',((state.council.influenceByCountry[actor.id]??0)-status.fee).toFixed(1)]];
 switch(command.type){
  case 'organization/proposeResolution':{
   metrics.push(['Organization',ORGANIZATION_LABELS[command.organizationId]],['Decision body',bodyLabel(command.bodyId)],['Proposal type',PAYLOAD_LABELS[command.payload.kind]],['Voting closes on day',String(state.day+ORGANIZATION_VOTING_DAYS)]);
   metrics.push(...resolutionPayloadMetrics(state,command.payload));
   break;
  }
  case 'organization/castBallot':{
   const r=state.world.organizations.resolutions[command.resolutionId];
   metrics.push(['Resolution',command.resolutionId],['Ballot',command.choice==='yes'?'Yes':command.choice==='no'?'No':'Abstain'],['Voting closes on day',String(r?.closesDay??0)]);
   if(r)metrics.push(['Organization',ORGANIZATION_LABELS[r.organizationId]],...resolutionPayloadMetrics(state,r.payload),...votingRuleView(r.ruleSnapshot).metrics);
   break;
  }
  case 'organization/repayOrganizationFinancing':metrics.push(['Principal payment ($B)',String(command.principalB)],['Interest payment ($B)',String(command.interestB)],['Treasury after ($B)',(actor.economy.treasury-command.principalB-command.interestB).toFixed(4)]);break;
  case 'organization/setOilQuotaDeviation':{const p=quotaDeviationView(state,command.deviation);metrics.push(['Daily deviation',String(command.deviation)],['Projected daily extraction',p.output.toFixed(4)],['Daily standing penalty',p.standingPenalty.toFixed(2)]);break;}
  case 'organization/transferMilitaryHardware':metrics.push(['Recipient',state.countries[command.recipientId]?.name??command.recipientId],['Equipment',command.equipment==='armor'?'Armor':'Fighters'],['Quantity',String(command.quantity)],['Reserve after',String((state.production[actor.id]?.stockpile[command.equipment]??0)-command.quantity)]);break;
  case 'organization/cancelOrganizationFinancing':metrics.push(['Released commitment ($B)',String(financingRecords(state).find(f=>f.id===command.financingId)?.committedB??0)]);break;
 }
 return {...status,reasonText:organizationReason(status.reason),metrics};
}
export const PAYLOAD_LABELS:Record<ExecutableResolutionPayload['kind'],string>={admission:'Membership admission',membershipDiscipline:'Membership discipline',sanctions:'Scoped sanctions',finance:'Loan or grant',oilQuota:'Oil output quota',tradeRemedy:'Trade countermeasure',marketIntegration:'Regional market agreement',localCurrencySwap:'Local-currency swap'};
export function proposalKinds(id:OrganizationId):ExecutableResolutionPayload['kind'][] {
 const extra:Partial<Record<OrganizationId,ExecutableResolutionPayload['kind'][]>>={un:['sanctions'],imf:['finance'],worldBank:['finance'],oic:['finance'],bricsPlus:['finance','localCurrencySwap'],opecPlus:['oilQuota'],wto:['tradeRemedy'],eu:['marketIntegration'],asean:['marketIntegration']};
 return [...(extra[id]??[]),'admission','membershipDiscipline'];
}
export interface OrganizationProposalDraft {
 kind:ExecutableResolutionPayload['kind'];organizationId:OrganizationId;bodyId:string;targetId:string;partnerId:string;countryIds:string[];
 tier:'Observer'|'Member';discipline:'suspend'|'expel';scope:'arms'|'trade'|'finance';humanitarian:boolean;durationDays:number;
 principalB:number;initialTrancheB:number;apr:number;termDays:number;graceDays:number;fundingKind:'loan'|'grant';
 condition:'none'|'taxRate'|'fiscalBalance'|'subsidyShare';threshold:number;reviewInDays:number;fiscalAdjustmentB:number;
 quota:number;commodity:string;tariffRate:number;maximumValueB:number;tariffReduction:number;freeMovement:boolean;swapLimitB:number;
}
/** Typed form adapter; UI supplies inputs, all dates, bodies and simulation payload rules stay here. */
export function organizationProposalCommand(state:GameState,d:OrganizationProposalDraft):OrganizationCommand {
 let payload:ExecutableResolutionPayload;
 switch(d.kind){
  case 'admission':payload={kind:d.kind,applicantId:d.targetId,tier:d.tier};break;
  case 'membershipDiscipline':payload={kind:d.kind,targetId:d.targetId,action:d.discipline,grounds:'memberReview'};break;
  case 'sanctions':payload={kind:d.kind,targetId:d.targetId,measures:[{scope:d.scope,intensity:1,enforcement:1}],durationDays:d.durationDays,exemptions:d.humanitarian?[{scope:'humanitarian',countryIds:[]}]:[]};break;
  case 'finance':payload={kind:d.kind,borrowerId:state.playerCountryId,programId:`program-${state.world.organizations.nextSequence}`,principalB:d.principalB,initialTrancheB:d.initialTrancheB,fundingKind:d.fundingKind,
   terms:{apr:d.apr,termDays:d.termDays,graceDays:d.graceDays,denomination:'USD'},conditions:d.condition==='none'?[]:[{kind:d.condition,threshold:d.threshold,reviewDay:state.day+ORGANIZATION_VOTING_DAYS+d.reviewInDays}],...(d.fiscalAdjustmentB?{fiscalAdjustmentB:d.fiscalAdjustmentB}:{})};break;
  case 'oilQuota':payload={kind:d.kind,quotas:{[d.targetId]:d.quota},durationDays:d.durationDays};break;
  case 'tradeRemedy':payload={kind:d.kind,disputeId:`dispute-${state.world.organizations.nextSequence}`,remedy:{targetId:d.targetId,commodity:d.commodity,tariffRate:d.tariffRate,maximumValueB:d.maximumValueB,durationDays:d.durationDays}};break;
  case 'marketIntegration':payload={kind:d.kind,agreement:{countryIds:d.countryIds,tariffReduction:d.tariffReduction,freeMovement:d.freeMovement,durationDays:d.durationDays}};break;
  case 'localCurrencySwap':payload={kind:d.kind,agreement:{countryA:state.playerCountryId,countryB:d.partnerId,limitB:d.swapLimitB,durationDays:d.durationDays}};break;
 }
 return {type:'organization/proposeResolution',organizationId:d.organizationId,bodyId:d.kind==='finance'?'financeBoard':d.bodyId,payload};
}
export function initialProposalDraft(state:GameState,organizationId:OrganizationId='un'):OrganizationProposalDraft {
 return {kind:proposalKinds(organizationId)[0],organizationId,bodyId:'plenary',targetId:state.selectedCountryId&&state.selectedCountryId!==state.playerCountryId?state.selectedCountryId:Object.keys(state.countries).find(id=>id!==state.playerCountryId)??state.playerCountryId,partnerId:Object.keys(state.countries).find(id=>id!==state.playerCountryId)??state.playerCountryId,countryIds:[state.playerCountryId],
  tier:'Member',discipline:'suspend',scope:'arms',humanitarian:true,durationDays:30,principalB:1,initialTrancheB:1,apr:3,termDays:365,graceDays:30,fundingKind:'loan',condition:'none',threshold:30,reviewInDays:30,fiscalAdjustmentB:0,quota:0,commodity:'oil',tariffRate:.1,maximumValueB:1,tariffReduction:.5,freeMovement:false,swapLimitB:1};
}
export function economicEffectMetrics(effect:import('../../../domain/organizations').OrganizationEconomicEffect):string[][] {
 const dates=[['Starts on day',String(effect.startsDay)],['Ends on day',String(effect.endsDay)]];
 switch(effect.kind){
  case 'organizationOilQuota':return dates;
  case 'organizationTradeRemedy':return [...dates,['Tariff rate (%)',(effect.remedy.tariffRate*100).toFixed(1)],['Collected customs ($B)',effect.collectedB.toFixed(4)],['Remaining cap ($B)',Math.max(0,effect.remedy.maximumValueB-effect.collectedB).toFixed(4)]];
  case 'organizationMarketIntegration':return [...dates,['Friction reduction (%)',(effect.agreement.tariffReduction*100).toFixed(1)],['Free movement authorization',effect.agreement.freeMovement?'Yes':'No']];
  case 'organizationCurrencySwap':return [...dates,['Settlement limit ($B)',effect.agreement.limitB.toFixed(4)],['Used authorization ($B)',effect.usedB.toFixed(4)],['Remaining authorization ($B)',Math.max(0,effect.agreement.limitB-effect.usedB).toFixed(4)]];
 }
}

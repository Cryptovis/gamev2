import {financeAdoptionReason,financingPaymentReason} from './financing';
import {isOrganizationFinancing} from '../../../domain/organizationFinancingSchemas';
import {z} from 'zod';
import type {GameState} from '../../../domain/game';
import {ORGANIZATION_IDS,type OrganizationCommand,type OrganizationState,type OrganizationBodyState,type ElectorateSnapshot,type FoundationalResolutionPayload,type ExecutableResolutionPayload} from '../../../domain/organizations';
import {resolutionPayload as payloadSchema,votingRule as ruleSchema} from '../../../domain/organizationSchemas';
import {proposalInfluenceCost} from './influence';

export const ORGANIZATION_VOTING_DAYS=5;
const id=z.string().min(1);
const commandSchema=z.discriminatedUnion('type',[
  z.strictObject({type:z.literal('organization/proposeResolution'),organizationId:z.enum(ORGANIZATION_IDS),bodyId:id,payload:payloadSchema,commandId:id.optional()}),
  z.strictObject({type:z.literal('organization/repayOrganizationFinancing'),financingId:id,principalB:z.number().finite().nonnegative(),interestB:z.number().finite().nonnegative(),commandId:id.optional()}),
  z.strictObject({type:z.literal('organization/cancelOrganizationFinancing'),financingId:id,commandId:id.optional()}),
  z.strictObject({type:z.literal('organization/castBallot'),resolutionId:id,choice:z.enum(['yes','no','abstain']),commandId:id.optional()}),
]);
export interface OrganizationCommandStatus {allowed:boolean;reason:string;fee:number;electorate?:ElectorateSnapshot}
export function isFoundationalPayload(payload:{kind:string}):payload is FoundationalResolutionPayload {
  return payload.kind==='admission'||payload.kind==='membershipDiscipline'||payload.kind==='sanctions';
}
export function payloadTarget(payload:ExecutableResolutionPayload):string {
  return payload.kind==='finance'?payload.borrowerId:payload.kind==='admission'?payload.applicantId:payload.targetId;
}
export function snapshotElectorate(state:GameState,organization:OrganizationState,body:OrganizationBodyState):ElectorateSnapshot|null {
  if(!ruleSchema.safeParse(body.votingRule).success)return null;
  const eligibleCountryIds=body.memberIds.filter(id=>{
    const m=organization.memberships[id],c=state.countries[id];
    return c&&!c.annexedBy&&m?.status==='active'&&m.tier!=='Observer';
  }).slice().sort();
  if(!eligibleCountryIds.length||new Set(eligibleCountryIds).size!==eligibleCountryIds.length)return null;
  const weights:Record<string,number>={},populationByCountry:Record<string,number>={};
  for(const id of eligibleCountryIds){
    const c=state.countries[id],rule=body.votingRule;
    const weight=rule.kind==='weighted'?(rule.basis==='quota'?body.voteWeights?.[id]:Math.round(c.economy.gdp*1_000_000)):1;
    const population=Math.round(c.demographics.population);
    if(weight===undefined||!Number.isSafeInteger(weight)||weight<0||!Number.isSafeInteger(population)||population<0)return null;
    weights[id]=weight;populationByCountry[id]=population;
  }
  const totalWeight=Object.values(weights).reduce((a,b)=>a+b,0),totalPopulation=Object.values(populationByCountry).reduce((a,b)=>a+b,0);
  if(!Number.isSafeInteger(totalWeight)||!Number.isSafeInteger(totalPopulation))return null;
  if(body.votingRule.kind==='securityCouncil'&&(eligibleCountryIds.length!==15||body.votingRule.vetoCountryIds.some(id=>!eligibleCountryIds.includes(id))))return null;
  if(body.votingRule.kind==='weighted'&&!totalWeight||body.votingRule.kind==='doubleMajority'&&!totalPopulation)return null;
  return {eligibleCountryIds,weights,populationByCountry,totalWeight,totalPopulation};
}
export function validateOrganizationCommand(state:GameState,command:OrganizationCommand,actorId=state.playerCountryId):OrganizationCommandStatus {
  const refuse=(reason:string):OrganizationCommandStatus=>({allowed:false,reason,fee:0});
  if(!commandSchema.safeParse(command).success)return refuse('invalidCommand');
  const actor=Object.hasOwn(state.countries,actorId)?state.countries[actorId]:undefined;
  if(!actor||actor.annexedBy||state.campaignStatus!=='active')return refuse('invalidActor');
  if(command.commandId&&state.world.commandIds?.includes(command.commandId))return refuse('duplicateCommand');
  const organizations=state.world.organizations;
  if(command.type==='organization/repayOrganizationFinancing'){
    const reason=financingPaymentReason(state,command.financingId,command.principalB,command.interestB,actorId);
    return reason?refuse(reason):{allowed:true,reason:'allowed',fee:0};
  }
  if(command.type==='organization/cancelOrganizationFinancing'){
    const f=Object.hasOwn(organizations.financing,command.financingId)?organizations.financing[command.financingId]:undefined;
    return isOrganizationFinancing(f)&&f.lifecycle&&f.borrowerId===actorId&&['active','paused'].includes(f.status)&&f.committedB>0?
      {allowed:true,reason:'allowed',fee:0}:refuse('financingAccess');
  }
  if(command.type==='organization/castBallot'){
    const r=Object.hasOwn(organizations.resolutions,command.resolutionId)?organizations.resolutions[command.resolutionId]:undefined;
    if(!r||r.phase!=='voting'||state.day>=r.closesDay)return refuse('votingClosed');
    if(!r.electorate.eligibleCountryIds.includes(actorId))return refuse('ineligibleVoter');
    if(r.ballots[actorId]===command.choice)return refuse('duplicateBallot');
    return {allowed:true,reason:'allowed',fee:0};
  }
  if(!isFoundationalPayload(command.payload)&&command.payload.kind!=='finance')return refuse('unsupportedPayload');
  const closesDay=state.day+ORGANIZATION_VOTING_DAYS;
  if(!Number.isSafeInteger(closesDay)||command.payload.kind==='sanctions'&&!Number.isSafeInteger(closesDay+command.payload.durationDays))return refuse('invalidDeadline');
  const o=organizations.byId[command.organizationId],body=Object.hasOwn(o.bodies,command.bodyId)?o.bodies[command.bodyId]:undefined,membership=o.memberships[actorId];
  if(!membership||membership.status!=='active'||membership.tier==='Observer'||!body||body.kind==='legacy'||command.payload.kind!=='finance'&&!body.memberIds.includes(actorId))return refuse('proposalAccess');
  if(command.payload.kind==='finance'){
    if(actorId!==command.payload.borrowerId||command.bodyId!=='financeBoard'||body.kind!=='board'||['imf','worldBank'].includes(command.organizationId)&&(body.votingRule.kind!=='weighted'||body.votingRule.basis!=='quota'))return refuse('financeConsentOrBoard');
    const reason=financeAdoptionReason({...state,day:closesDay},command.organizationId,command.payload);
    if(reason)return refuse(reason);
  }
  const targetId=payloadTarget(command.payload),target=Object.hasOwn(state.countries,targetId)?state.countries[targetId]:undefined;
  if(!target||target.annexedBy)return refuse('invalidTarget');
  const targetMembership=o.memberships[targetId];
  if(command.payload.kind==='membershipDiscipline'&&(!targetMembership||targetMembership.tier==='PermanentCouncil'))return refuse('protectedOrMissingMember');
  if(command.payload.kind==='admission'&&(targetMembership?.tier==='PermanentCouncil'||targetMembership?.status==='active'&&targetMembership.tier==='Member'))return refuse('alreadyMember');
  if(command.payload.kind==='sanctions'&&command.payload.exemptions.some(e=>e.countryIds.some(id=>!Object.hasOwn(state.countries,id))))return refuse('invalidExemption');
  const open=Object.values(organizations.resolutions).filter(r=>r.phase==='voting'||r.phase==='debate');
  if(open.length>=64||open.filter(r=>r.proposerId===actorId).length>=4||Object.keys(organizations.resolutions).length>=1024)return refuse('resolutionCapacity');
  if(open.some(r=>r.organizationId===command.organizationId&&r.bodyId===command.bodyId&&(isFoundationalPayload(r.payload)||r.payload.kind==='finance')&&r.payload.kind===command.payload.kind&&payloadTarget(r.payload)===targetId))return refuse('duplicateProposal');
  if(!Number.isSafeInteger(organizations.nextSequence)||organizations.nextSequence<1||organizations.nextSequence>=Number.MAX_SAFE_INTEGER||Object.hasOwn(organizations.resolutions,`ORG-${organizations.nextSequence}`))return refuse('sequenceCollision');
  const influence=state.council.influenceByCountry[actorId]??0,fee=proposalInfluenceCost(command.payload);
  if(!Number.isFinite(influence)||influence<fee)return refuse('influence');
  const electorate=snapshotElectorate(state,o,body);
  if(!electorate)return refuse('electorateUnavailable');
  return {allowed:true,reason:'allowed',fee,electorate};
}

import type {GameState} from '../../../domain/game';
import type {Resolution,OrganizationState,OrganizationSanctionEffect} from '../../../domain/organizations';
import {evaluateVotingOutcome} from './voting';
import {recordResolutionStanding} from './influence';
import {isFoundationalPayload,payloadTarget} from './validation';
import {mirrorUnMembership} from './legacy';
import {processOrganizationAiVotes} from './ai';

function updateResolution(state:GameState,resolution:Resolution):GameState {
  const organizations=state.world.organizations;
  return {...state,world:{...state.world,organizations:{...organizations,resolutions:{...organizations.resolutions,[resolution.id]:resolution}}}};
}
function executeResolution(state:GameState,r:Resolution):GameState {
  const fail=(reason:string)=>updateResolution(state,{...r,phase:'failed',execution:{status:'failed',effectIds:[],reason}});
  if(!isFoundationalPayload(r.payload))return fail('unsupportedPayload');
  const targetId=payloadTarget(r.payload),country=state.countries[targetId];
  if(!country||country.annexedBy)return fail('invalidTarget');
  const organizations=state.world.organizations,o=organizations.byId[r.organizationId];
  if(r.payload.kind==='sanctions'){
    const id=`sanction:${r.id}`;
    if(Object.hasOwn(organizations.effects,id))return fail('effectCollision');
    const endsDay=r.effectiveDay+r.payload.durationDays;
    const effect:OrganizationSanctionEffect={id,kind:'organizationSanctions',organizationId:r.organizationId,bodyId:r.bodyId,sourceResolutionId:r.id,targetId,
      startsDay:r.effectiveDay,endsDay,measures:structuredClone(r.payload.measures),exemptions:structuredClone(r.payload.exemptions),status:state.day>=endsDay?'expired':'active'};
    const applied={...r,execution:{status:'applied' as const,effectIds:[id]}};
    return {...state,world:{...state.world,organizations:{...organizations,effects:{...organizations.effects,[id]:effect},resolutions:{...organizations.resolutions,[r.id]:applied}}}};
  }
  const old=o.memberships[targetId];
  if(old?.tier==='PermanentCouncil')return fail('protectedMember');
  let updated:OrganizationState;
  if(r.payload.kind==='admission'){
    const membership={countryId:targetId,tier:r.payload.tier,offices:old?.offices??[],status:'active' as const,joinedDay:old?.joinedDay??state.day,duesArrearsB:old?.duesArrearsB??0};
    const bodies={...o.bodies};
    if(membership.tier==='Member')bodies.plenary={...bodies.plenary,memberIds:[...new Set([...bodies.plenary.memberIds,targetId])].sort()};
    else for(const [id,body] of Object.entries(bodies))bodies[id]={...body,memberIds:body.memberIds.filter(id=>id!==targetId)};
    updated={...o,memberships:{...o.memberships,[targetId]:membership},bodies};
  }else if(!old)return fail('missingMember');
  else if(r.payload.action==='suspend')updated={...o,memberships:{...o.memberships,[targetId]:{...old,status:'suspended'}}};
  else{
    const memberships={...o.memberships};delete memberships[targetId];
    const bodies=Object.fromEntries(Object.entries(o.bodies).map(([id,body])=>[id,{...body,memberIds:body.memberIds.filter(id=>id!==targetId),
      ...(body.voteWeights?{voteWeights:Object.fromEntries(Object.entries(body.voteWeights).filter(([id])=>id!==targetId))}:{})}]));
    updated={...o,memberships,bodies};
  }
  let next={...state,world:{...state.world,organizations:{...organizations,byId:{...organizations.byId,[o.id]:updated}}}};
  if(o.id==='un')next=mirrorUnMembership(next,updated,targetId);
  return updateResolution(next,{...r,execution:{status:'applied',effectIds:[]}});
}
/** Close first, then activate due decisions; retries and save/resume cannot replay effects. */
export function processOrganizations(state:GameState):GameState {
  if(state.day<=state.world.organizations.lastProcessedDay)return state;
  let next=state;
  const ids=Object.values(state.world.organizations.resolutions).sort((a,b)=>a.closesDay-b.closesDay||(a.id<b.id?-1:a.id>b.id?1:0)).map(r=>r.id);
  for(const id of ids){
    let r=next.world.organizations.resolutions[id];
    if(r.phase==='voting'&&state.day>=r.closesDay){
      const outcome=evaluateVotingOutcome(r.ruleSnapshot,r.electorate,r.ballots);
      r={...r,phase:outcome.passed?'adopted':'rejected',outcome};
      next=updateResolution(next,r);
      const organizations=next.world.organizations,o=organizations.byId[r.organizationId];
      next={...next,world:{...next.world,organizations:{...organizations,byId:{...organizations.byId,[o.id]:recordResolutionStanding(o,r.proposerId,outcome.passed)}}}};
    }
    if(r.phase==='adopted'&&r.execution.status==='pending'&&state.day>=r.effectiveDay)next=executeResolution(next,r);
  }
  const organizations=next.world.organizations;
  let effects=organizations.effects;
  for(const [id,value] of Object.entries(effects))if(value&&typeof value==='object'&&'kind' in value&&value.kind==='organizationSanctions'){
    const e=value as OrganizationSanctionEffect;
    if(e.status==='active'&&state.day>=e.endsDay)effects={...effects,[id]:{...e,status:'expired'}};
  }
  next={...next,world:{...next.world,organizations:{...organizations,effects,lastProcessedDay:state.day}}};
  return processOrganizationAiVotes(next);
}

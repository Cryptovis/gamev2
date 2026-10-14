import type {GameState} from '../../../domain/game';
import type {OrganizationCommand,OrganizationId,FoundationalResolutionPayload,Resolution} from '../../../domain/organizations';
import {validateOrganizationCommand,ORGANIZATION_VOTING_DAYS} from './validation';

/** One command boundary for the player dispatcher and explicit AI actors. */
export function applyOrganizationCommand(state:GameState,command:OrganizationCommand,actorId=state.playerCountryId):GameState {
  const status=validateOrganizationCommand(state,command,actorId);
  if(!status.allowed)return state;
  const organizations=state.world.organizations;
  let next:GameState;
  if(command.type==='organization/proposeResolution'){
    const id=`ORG-${organizations.nextSequence}`;
    const r:Resolution={id,organizationId:command.organizationId,bodyId:command.bodyId,proposerId:actorId,payload:structuredClone(command.payload),phase:'voting',
      openedDay:state.day,closesDay:state.day+ORGANIZATION_VOTING_DAYS,effectiveDay:state.day+ORGANIZATION_VOTING_DAYS,
      ruleSnapshot:structuredClone(organizations.byId[command.organizationId].bodies[command.bodyId].votingRule),electorate:status.electorate!,ballots:{},execution:{status:'pending',effectIds:[]}};
    next={...state,council:{...state.council,influenceByCountry:{...state.council.influenceByCountry,[actorId]:(state.council.influenceByCountry[actorId]??0)-status.fee}},
      world:{...state.world,organizations:{...organizations,resolutions:{...organizations.resolutions,[id]:r},nextSequence:organizations.nextSequence+1}}};
  }else{
    const r=organizations.resolutions[command.resolutionId];
    next={...state,world:{...state.world,organizations:{...organizations,resolutions:{...organizations.resolutions,[r.id]:{...r,ballots:{...r.ballots,[actorId]:command.choice}}}}}};
  }
  return command.commandId?{...next,world:{...next.world,commandIds:[...(next.world.commandIds??[]),command.commandId].slice(-512)}}:next;
}
export function proposeResolution(state:GameState,organizationId:OrganizationId,bodyId:string,payload:FoundationalResolutionPayload,actorId=state.playerCountryId):GameState {
  return applyOrganizationCommand(state,{type:'organization/proposeResolution',organizationId,bodyId,payload},actorId);
}
export function castBallot(state:GameState,resolutionId:string,choice:'yes'|'no'|'abstain',actorId=state.playerCountryId):GameState {
  return applyOrganizationCommand(state,{type:'organization/castBallot',resolutionId,choice},actorId);
}

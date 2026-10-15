import type {ExecutableResolutionPayload,OrganizationState} from '../../../domain/organizations';
export function proposalInfluenceCost(payload:ExecutableResolutionPayload):number {
  return payload.kind==='sanctions'?8:5;
}
/** Standing changes are applied only when a vote closes, never on previews/retries. */
export function recordResolutionStanding(organization:OrganizationState,proposerId:string,passed:boolean):OrganizationState {
  const standing=organization.standingByCountry[proposerId]??0;
  return {...organization,standingByCountry:{...organization.standingByCountry,[proposerId]:Math.max(0,Math.min(100,standing+(passed?2:-1)))}};
}

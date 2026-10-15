import {isEconomicPayload,economicParticipants} from './economic';
import type {GameState} from '../../../domain/game';
import {nextRandom} from '../../rng';
import {applyOrganizationCommand} from './commands';
import {AI_RISK_PENALTY,financingRisk} from './financing';
import {validateOrganizationCommand,isFoundationalPayload,payloadTarget} from './validation';

/** AI casts at most one initial vote per eligible country/resolution through the shared boundary. */
export function processOrganizationAiVotes(state:GameState):GameState {
  let next=state;
  const resolutions=Object.values(state.world.organizations.resolutions).filter(r=>r.phase==='voting'&&state.day<r.closesDay).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  for(const r of resolutions)for(const id of r.electorate.eligibleCountryIds.slice().sort()){
    if(id===state.playerCountryId||Object.hasOwn(next.world.organizations.resolutions[r.id].ballots,id))continue;
    const command={type:'organization/castBallot',resolutionId:r.id,choice:'abstain'} as const;
    if(!validateOrganizationCommand(next,command,id).allowed)continue;
    const country=next.countries[id],relation=country.diplomacy.relations[r.proposerId]?.score??0;
    const target=isFoundationalPayload(r.payload)?payloadTarget(r.payload):isEconomicPayload(r.payload)?economicParticipants(r.payload)[0]:undefined;
    const targetRelation=target?(country.diplomacy.relations[target]?.score??0):0;
    const standing=next.world.organizations.byId[r.organizationId].standingByCountry[r.proposerId]??0;
    const risk=r.payload.kind==='finance'?financingRisk(next,r.payload):0;
    const inclination=Math.max(.1,Math.min(.9,.5+relation*.002+(r.payload.kind==='sanctions'?-targetRelation*.002:targetRelation*.001)+standing*.001-risk*AI_RISK_PENALTY));
    const random=nextRandom(next.simulationSeed);
    const choice=random.value>.95?'abstain':random.value<inclination?'yes':'no';
    const voted=applyOrganizationCommand(next,{...command,choice},id);
    if(voted!==next)next={...voted,simulationSeed:random.seed};
  }
  return next;
}

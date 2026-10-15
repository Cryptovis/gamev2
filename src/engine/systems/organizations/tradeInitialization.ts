import type {OrganizationsState} from '../../../domain/organizations';
/** Activate the scenario WTO once; preserve campaign membership decisions and existing bodies. */
export function initializeOrganizationTrade(source:OrganizationsState):OrganizationsState {
 if(source.tradeVersion===1)return source;
 const old=source.byId.wto,memberships={...old.memberships};
 const dormant=Object.values(memberships).every(m=>m.tier==='Observer')&&old.bodies.plenary.memberIds.length===0;
 if(dormant)for(const [id,m] of Object.entries(memberships))memberships[id]={...m,tier:'Member'};
 const body=dormant?{...old.bodies.plenary,memberIds:Object.keys(memberships).sort(),votingRule:{kind:'oneCountryOneVote' as const,threshold:{numerator:1,denominator:2},quorum:{numerator:1,denominator:2},denominator:'presentVoting' as const,comparison:'greaterThan' as const}}:old.bodies.plenary;
 return {...source,tradeVersion:1,byId:{...source.byId,wto:{...old,memberships,bodies:{...old.bodies,plenary:body}}}};
}

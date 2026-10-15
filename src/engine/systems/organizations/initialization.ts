import {initializeFinanceCapital} from './financeCapital';
import type {CountryState} from '../../../domain/game';
import type {WorldState} from '../../../domain/world';
import {ORGANIZATION_IDS,P5_COUNTRY_IDS,type OrganizationsState,type OrganizationState,type VotingRule,type Membership} from '../../../domain/organizations';
import {ORGANIZATION_CATALOG_VERSION,ORGANIZATION_DEFAULT_ROSTERS} from '../../../data/organizationCatalog';

const majority=():VotingRule=>({kind:'oneCountryOneVote',threshold:{numerator:1,denominator:2},quorum:{numerator:0,denominator:1},denominator:'presentVoting',comparison:'greaterThan'});
export function createOrganizations(countries:Record<string,CountryState>,legacyMembers:WorldState['members'],day=1):OrganizationsState {
  const known=(id:string)=>Object.hasOwn(countries,id);
  const ids=Object.keys(countries).sort();
  const byId={} as OrganizationsState['byId'];
  for(const id of ORGANIZATION_IDS){
    const observers=id==='imf'||id==='worldBank'||id==='wto'||id==='wef';
    const roster=id==='un'?[...legacyMembers.un,...legacyMembers.security,...P5_COUNTRY_IDS]:observers?ids:ORGANIZATION_DEFAULT_ROSTERS[id];
    const members=[...new Set(roster)].filter(known).sort();
    const memberships:Record<string,Membership>=Object.fromEntries(members.map(countryId=>[countryId,{
      countryId,tier:id==='un'&&P5_COUNTRY_IDS.some(p=>p===countryId)?'PermanentCouncil':observers?'Observer':'Member',
      offices:[],status:countries[countryId].annexedBy?'suspended':'active',joinedDay:0,duesArrearsB:0,
    }]));
    const votingRule:VotingRule=id==='imf'||id==='worldBank'
      ?{kind:'weighted',basis:'quota',threshold:{numerator:1,denominator:2},denominator:'castWeight',weightSnapshotId:`initial-${id}`}
      :id==='eu'?{kind:'doubleMajority',states:{numerator:55,denominator:100},population:{numerator:65,denominator:100},blockingMinorityCount:4}
      :['nato','csto','sco','asean','g20','bricsPlus','opecPlus'].includes(id)?{kind:'consensus',objectionsBlock:true,deadlinePolicy:'expire'}:majority();
    const organization:OrganizationState={id,charterVersion:1,memberships,
      bodies:{plenary:{id:'plenary',kind:'assembly',memberIds:observers?[]:members,permanentMemberIds:[],votingRule}},
      standingByCountry:Object.fromEntries(members.map(countryId=>[countryId,0])),availableFundsB:0,committedFundsB:0};
    if(id==='un'){
      const permanent:string[]=P5_COUNTRY_IDS.filter(known).slice().sort();
      const elected=[...new Set(legacyMembers.security)].filter(countryId=>known(countryId)&&!permanent.includes(countryId)).sort().slice(0,10);
      organization.bodies.securityCouncil={id:'securityCouncil',kind:'council',memberIds:[...permanent,...elected].sort(),permanentMemberIds:permanent,
        votingRule:{kind:'securityCouncil',minimumYes:9,vetoCountryIds:[...permanent],procedural:false}};
      for(const [bodyId,memberIds] of [['legacyAssembly',legacyMembers.un],['legacySecurity',legacyMembers.security]] as const)
        organization.bodies[bodyId]={id:bodyId,kind:'legacy',memberIds:[...memberIds],permanentMemberIds:[],votingRule:majority()};
    }
    byId[id]=organization;
  }
  return initializeFinanceCapital({catalogVersion:ORGANIZATION_CATALOG_VERSION,byId,resolutions:{},effects:{},financing:{},nextSequence:1,lastProcessedDay:day},countries);
}

import type {CountryState} from '../../../domain/game';
import type {OrganizationId,OrganizationsState,OrganizationBodyState} from '../../../domain/organizations';

export const FINANCE_POOLS:Partial<Record<OrganizationId,number>>={imf:250,worldBank:120,bricsPlus:50,oic:30};
/** Authored scenario voting units, NOT a claim to current legal IMF/IBRD quotas. */
const SCENARIO_BOARD_UNITS:Record<string,number>={USA:17,CHN:6,JPN:6,DEU:5,GBR:4,FRA:4,IND:3,RUS:3,BRA:2,CAN:2,ITA:2,SAU:2,TUR:1,ZAF:1,AUS:1};
/** Pure, one-time optional-data upgrade. Never replenish spent capital or rewrite old contracts. */
export function initializeFinanceCapital(source:OrganizationsState,countries:Record<string,CountryState>):OrganizationsState {
  if(source.financeVersion===1)return source;
  const byId={...source.byId};
  for(const id of ['imf','worldBank','bricsPlus','oic'] as const){
    const old=byId[id];
    const memberships={...old.memberships};
    // Activate only the dormant initial finance rosters; preserve authored membership decisions.
    if((id==='imf'||id==='worldBank')&&Object.values(memberships).every(m=>m.tier==='Observer'))
      for(const [countryId,m] of Object.entries(memberships))memberships[countryId]={...m,tier:'Member'};
    const memberIds=Object.keys(memberships).filter(countryId=>memberships[countryId].tier!=='Observer'&&countries[countryId]&&
      (id==='imf'||id==='worldBank'?Object.hasOwn(SCENARIO_BOARD_UNITS,countryId):true)).sort();
    const board:OrganizationBodyState={id:'financeBoard',kind:'board',memberIds,permanentMemberIds:[],
      votingRule:id==='imf'||id==='worldBank'?{kind:'weighted',basis:'quota',threshold:{numerator:1,denominator:2},denominator:'eligibleWeight',weightSnapshotId:`ron-finance-1-${id}`}:
        {kind:'oneCountryOneVote',threshold:{numerator:1,denominator:2},quorum:{numerator:1,denominator:2},denominator:'eligible',comparison:'greaterThan'},
      ...(id==='imf'||id==='worldBank'?{voteWeights:Object.fromEntries(memberIds.map(countryId=>[countryId,SCENARIO_BOARD_UNITS[countryId]]))}:{})};
    // Existing positive/committed pools are authored balances, not an invitation to mint another endowment.
    const hasContracts=Object.values(source.financing).some(f=>f&&typeof f==='object'&&'organizationId' in f&&f.organizationId===id);
    const availableFundsB=old.availableFundsB===0&&old.committedFundsB===0&&!hasContracts?FINANCE_POOLS[id]!:old.availableFundsB;
    byId[id]={...old,memberships,availableFundsB,bodies:{...old.bodies,financeBoard:old.bodies.financeBoard??board}};
  }
  return {...source,financeVersion:1,byId};
}

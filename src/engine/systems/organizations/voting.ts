import type {VotingRule,ElectorateSnapshot,VotingOutcome,Rational} from '../../../domain/organizations';
import {P5_COUNTRY_IDS} from '../../../domain/organizations';
import {votingRule as ruleSchema,electorate as electorateSchema} from '../../../domain/organizationSchemas';

/** Exact cross-products; BigInt is local arithmetic and never enters GameState. */
function reaches(value:number,total:number,threshold:Rational,strict=false):boolean {
  if(total<=0)return false;
  const a=BigInt(value)*BigInt(threshold.denominator),b=BigInt(total)*BigInt(threshold.numerator);
  return strict?a>b:a>=b;
}
export function evaluateVotingOutcome(rule:VotingRule,electorate:ElectorateSnapshot,ballots:Record<string,'yes'|'no'|'abstain'>):VotingOutcome {
  const parsedRule=ruleSchema.safeParse(rule),parsedElectorate=electorateSchema.safeParse(electorate);
  const empty:VotingOutcome={passed:false,reason:'invalidElectorate',yesCount:0,noCount:0,abstainCount:0};
  if(!parsedRule.success)return {...empty,reason:'invalidRule'};
  if(!parsedElectorate.success)return empty;
  const e=parsedElectorate.data,r=parsedRule.data,eligible=new Set(e.eligibleCountryIds);
  if(!eligible.size||e.eligibleCountryIds.some(id=>!Object.hasOwn(e.weights,id)||!Object.hasOwn(e.populationByCountry,id))
    ||[...Object.keys(e.weights),...Object.keys(e.populationByCountry)].some(id=>!eligible.has(id))
    ||Object.values(e.weights).reduce((a,b)=>a+b,0)!==e.totalWeight
    ||Object.values(e.populationByCountry).reduce((a,b)=>a+b,0)!==e.totalPopulation)return empty;
  if(!ballots||typeof ballots!=='object'||Array.isArray(ballots))return {...empty,reason:'invalidBallot'};
  const counts={yesCount:0,noCount:0,abstainCount:0};
  for(const id of e.eligibleCountryIds){
    const choice=Object.hasOwn(ballots,id)?ballots[id]:undefined;
    if(choice==='yes')counts.yesCount++;else if(choice==='no')counts.noCount++;else if(choice==='abstain')counts.abstainCount++;
  }
  const result=(passed:boolean,reason:string):VotingOutcome=>({passed,reason,...counts});
  if(!ballots||typeof ballots!=='object'||Object.entries(ballots).some(([id,choice])=>!eligible.has(id)||!['yes','no','abstain'].includes(choice)))return result(false,'invalidBallot');
  const {yesCount:Y,noCount:N,abstainCount:A}=counts,E=eligible.size;
  switch(r.kind){
    case 'oneCountryOneVote':
      if(!reaches(Y+N+A,E,r.quorum))return result(false,'quorum');
      return reaches(Y,r.denominator==='eligible'?E:Y+N,r.threshold,r.comparison==='greaterThan')?result(true,'passed'):result(false,'threshold');
    case 'securityCouncil':{
      if(E!==15)return result(false,'councilSeats');
      if(r.vetoCountryIds.some(id=>!P5_COUNTRY_IDS.some(p=>p===id)||!eligible.has(id)))return result(false,'invalidRule');
      const vetoedBy=r.procedural?[]:r.vetoCountryIds.filter(id=>ballots[id]==='no').sort();
      if(vetoedBy.length)return {...result(false,'veto'),vetoedBy};
      return Y>=r.minimumYes?result(true,'passed'):result(false,'minimumYes');
    }
    case 'consensus':
      if(N)return result(false,'objection');
      return Y+A===E?result(true,'passed'):result(false,'incompleteConsensus');
    case 'unanimity':
      if(!reaches(Y+N+A,E,r.quorum))return result(false,'quorum');
      return N===0&&Y>0&&(r.abstention==='allowed'?Y+A===E:Y===E)?result(true,'passed'):result(false,'unanimity');
    case 'doubleMajority':{
      if(!e.totalPopulation)return result(false,'population');
      if(!reaches(Y,E,r.states))return result(false,'stateThreshold');
      const population=e.eligibleCountryIds.reduce((sum,id)=>sum+(ballots[id]==='yes'?e.populationByCountry[id]:0),0);
      if(reaches(population,e.totalPopulation,r.population))return result(true,'passed');
      return E-Y<r.blockingMinorityCount?result(true,'insufficientBlockingMinority'):result(false,'populationThreshold');
    }
    case 'weighted':{
      const yes=e.eligibleCountryIds.reduce((sum,id)=>sum+(ballots[id]==='yes'?e.weights[id]:0),0);
      const no=e.eligibleCountryIds.reduce((sum,id)=>sum+(ballots[id]==='no'?e.weights[id]:0),0);
      return reaches(yes,r.denominator==='eligibleWeight'?e.totalWeight:yes+no,r.threshold)?result(true,'passed'):result(false,'weightThreshold');
    }
  }
}

import {z} from 'zod';
import {ORGANIZATION_IDS,P5_COUNTRY_IDS,type ResolutionPayload,type VotingRule} from '../domain/organizations';

const id=z.string().min(1),day=z.number().int().nonnegative(),money=z.number().finite().nonnegative();
const positiveDays=day.positive(),share=z.number().finite().min(0).max(1),score=z.number().finite().min(0).max(100);
const ids=z.array(id).refine(values=>new Set(values).size===values.length);
const organizationId=z.enum(ORGANIZATION_IDS);
const rational=z.strictObject({numerator:day,denominator:day.positive()}).refine(r=>r.numerator<=r.denominator);
const votingRule:z.ZodType<VotingRule>=z.discriminatedUnion('kind',[
  z.strictObject({kind:z.literal('oneCountryOneVote'),threshold:rational,quorum:rational,denominator:z.enum(['eligible','presentVoting']),comparison:z.enum(['atLeast','greaterThan']).optional()}),
  z.strictObject({kind:z.literal('securityCouncil'),minimumYes:z.literal(9),vetoCountryIds:ids.max(5),procedural:z.boolean()}),
  z.strictObject({kind:z.literal('weighted'),basis:z.enum(['gdp','quota']),threshold:rational,denominator:z.enum(['eligibleWeight','castWeight']),weightSnapshotId:id}),
  z.strictObject({kind:z.literal('consensus'),objectionsBlock:z.literal(true),deadlinePolicy:z.literal('expire')}),
  z.strictObject({kind:z.literal('unanimity'),abstention:z.enum(['blocks','allowed']),quorum:rational}),
  z.strictObject({kind:z.literal('doubleMajority'),states:rational,population:rational,blockingMinorityCount:day.positive()}),
]);
const membership=z.strictObject({countryId:id,tier:z.enum(['Observer','Member','PermanentCouncil']),
  offices:z.array(z.strictObject({role:z.literal('Chair'),bodyId:id,untilDay:day})),
  status:z.enum(['active','suspended','withdrawalPending']),joinedDay:day,duesArrearsB:money});
const body=z.strictObject({id,kind:z.enum(['assembly','council','board','forum','legacy']),memberIds:ids,permanentMemberIds:ids,votingRule});
const organization=z.strictObject({id:organizationId,charterVersion:day.positive(),memberships:z.record(id,membership),
  bodies:z.record(id,body),standingByCountry:z.record(id,score),availableFundsB:money,committedFundsB:money});
const terms=z.strictObject({apr:z.number().finite().min(0).max(100),termDays:positiveDays,graceDays:day,denomination:z.enum(['USD','SDR'])}).refine(t=>t.graceDays<=t.termDays);
const condition=z.strictObject({kind:z.enum(['fiscalBalance','taxRate','subsidyShare']),threshold:z.number().finite(),reviewDay:day});
const defense=z.strictObject({countryId:id,personnel:day,equipmentB:money,fundingB:money,readyDay:day});
const investment=z.strictObject({countryId:id,amountB:money,readyDay:day});
const resolutionPayload:z.ZodType<ResolutionPayload>=z.discriminatedUnion('kind',[
  z.strictObject({kind:z.literal('admission'),applicantId:id,tier:z.enum(['Observer','Member'])}),
  z.strictObject({kind:z.literal('membershipDiscipline'),targetId:id,action:z.enum(['suspend','expel']),grounds:id}),
  z.strictObject({kind:z.literal('sanctions'),targetId:id,measures:z.array(z.strictObject({scope:z.enum(['arms','trade','finance']),intensity:share,enforcement:share})).min(1),durationDays:positiveDays,
    exemptions:z.array(z.strictObject({scope:z.enum(['food','medicine','humanitarian']),countryIds:ids}))}),
  z.strictObject({kind:z.literal('finance'),borrowerId:id,programId:id,principalB:money.positive(),terms,conditions:z.array(condition)}),
  z.strictObject({kind:z.literal('oilQuota'),quotas:z.record(id,money),durationDays:positiveDays}),
  z.strictObject({kind:z.literal('defenseResponse'),incidentId:id,commitments:z.array(defense)}),
  z.strictObject({kind:z.literal('peacekeeping'),conflictId:id,mandate:z.strictObject({countryIds:ids,personnel:day,fundingB:money,durationDays:positiveDays,consentRequired:z.boolean()})}),
  z.strictObject({kind:z.literal('tradeRemedy'),disputeId:id,remedy:z.strictObject({targetId:id,commodity:id,tariffRate:share,maximumValueB:money,durationDays:positiveDays})}),
  z.strictObject({kind:z.literal('investmentCompact'),commitments:z.array(investment)}),
  z.strictObject({kind:z.literal('marketIntegration'),agreement:z.strictObject({countryIds:ids.min(2),tariffReduction:share,freeMovement:z.boolean(),durationDays:positiveDays})}),
  z.strictObject({kind:z.literal('localCurrencySwap'),agreement:z.strictObject({countryA:id,countryB:id,limitB:money.positive(),durationDays:positiveDays}).refine(a=>a.countryA!==a.countryB)}),
]);
const electorate=z.strictObject({eligibleCountryIds:ids,weights:z.record(id,day),populationByCountry:z.record(id,day),totalWeight:day,totalPopulation:day});
const resolution=z.strictObject({id,organizationId,bodyId:id,proposerId:id,payload:resolutionPayload,
  phase:z.enum(['draft','debate','voting','adopted','rejected','implementing','expired','revoked','failed']),openedDay:day,closesDay:day,effectiveDay:day,
  ruleSnapshot:votingRule,electorate,ballots:z.record(id,z.enum(['yes','no','abstain'])),
  execution:z.strictObject({status:z.enum(['pending','applied','failed']),effectIds:ids}),
}).refine(r=>r.closesDay>=r.openedDay&&r.effectiveDay>=r.closesDay);
const legacyEffect=z.strictObject({id,kind:z.literal('legacySanctions'),issuer:z.literal('legacyCouncil'),targetId:id,startsDay:day,endsDay:day,status:z.literal('active')}).refine(e=>e.endsDay>=e.startsDay);
const financing=z.strictObject({id,organizationId,borrowerId:id,principalB:money,outstandingB:money,committedB:money,terms,status:z.enum(['active','paused','closed'])}).refine(f=>f.outstandingB+f.committedB<=f.principalB);
const organizations=z.strictObject({catalogVersion:day.positive(),byId:z.record(organizationId,organization),resolutions:z.record(id,resolution),
  effects:z.record(id,legacyEffect),financing:z.record(id,financing),nextSequence:day.positive(),lastProcessedDay:day});

function payloadCountries(p:ResolutionPayload):string[] {
  switch(p.kind){
    case 'admission':return [p.applicantId];
    case 'membershipDiscipline':return [p.targetId];
    case 'sanctions':return [p.targetId,...p.exemptions.flatMap(e=>e.countryIds)];
    case 'finance':return [p.borrowerId];
    case 'oilQuota':return Object.keys(p.quotas);
    case 'defenseResponse':return p.commitments.map(c=>c.countryId);
    case 'peacekeeping':return p.mandate.countryIds;
    case 'tradeRemedy':return [p.remedy.targetId];
    case 'investmentCompact':return p.commitments.map(c=>c.countryId);
    case 'marketIntegration':return p.agreement.countryIds;
    case 'localCurrencySwap':return [p.agreement.countryA,p.agreement.countryB];
  }
}
/** Strict structural validation followed by identity, seat, date and snapshot checks. */
export function validOrganizations(value:unknown,countries:Record<string,unknown>,currentDay:number):boolean {
  const result=organizations.safeParse(value);
  if(!result.success)return false;
  const s=result.data,known=(countryId:string)=>Object.hasOwn(countries,countryId);
  const validRule=(rule:VotingRule,voters:string[])=>rule.kind!=='securityCouncil'||rule.vetoCountryIds.every(countryId=>
    P5_COUNTRY_IDS.some(p=>p===countryId)&&voters.includes(countryId));
  if(s.lastProcessedDay>currentDay)return false;
  for(const organizationId of ORGANIZATION_IDS){
    const o=s.byId[organizationId];
    if(o.id!==organizationId||!Object.hasOwn(o.bodies,'plenary'))return false;
    if(organizationId==='un'){
      const council=o.bodies.securityCouncil,rule=council?.votingRule;
      const permanent=P5_COUNTRY_IDS.filter(known);
      if(!council||!rule||rule.kind!=='securityCouncil'||council.permanentMemberIds.length!==permanent.length
        ||rule.vetoCountryIds.length!==permanent.length||permanent.some(countryId=>
        !council.permanentMemberIds.includes(countryId)||!rule.vetoCountryIds.includes(countryId)||o.memberships[countryId]?.tier!=='PermanentCouncil'))return false;
    }
    for(const [countryId,m] of Object.entries(o.memberships)){
      if(m.countryId!==countryId||!known(countryId)||m.joinedDay>currentDay)return false;
      if(new Set(m.offices.map(office=>office.bodyId)).size!==m.offices.length||m.offices.some(office=>!Object.hasOwn(o.bodies,office.bodyId)))return false;
    }
    if(Object.keys(o.standingByCountry).some(countryId=>!known(countryId)))return false;
    for(const [bodyId,b] of Object.entries(o.bodies)){
      if(b.id!==bodyId||b.memberIds.some(countryId=>!Object.hasOwn(o.memberships,countryId))
        ||b.permanentMemberIds.some(countryId=>!b.memberIds.includes(countryId)||o.memberships[countryId].tier!=='PermanentCouncil')
        ||!validRule(b.votingRule,b.memberIds))return false;
      if(b.kind!=='legacy'&&b.memberIds.some(countryId=>o.memberships[countryId].tier==='Observer'))return false;
      if(b.votingRule.kind==='securityCouncil'&&(organizationId!=='un'||b.memberIds.length>15))return false;
    }
  }
  for(const [effectId,e] of Object.entries(s.effects))if(e.id!==effectId||!known(e.targetId)||e.startsDay>currentDay)return false;
  for(const [financingId,f] of Object.entries(s.financing))if(f.id!==financingId||!known(f.borrowerId))return false;
  for(const [resolutionId,r] of Object.entries(s.resolutions)){
    const e=r.electorate,eligible=new Set(e.eligibleCountryIds);
    if(r.id!==resolutionId||!Object.hasOwn(s.byId[r.organizationId].bodies,r.bodyId)||!known(r.proposerId)||r.openedDay>currentDay
      ||!payloadCountries(r.payload).every(known)||!e.eligibleCountryIds.every(known)
      ||!validRule(r.ruleSnapshot,e.eligibleCountryIds))return false;
    if(Object.keys(r.ballots).some(countryId=>!eligible.has(countryId))||Object.keys(e.weights).some(countryId=>!eligible.has(countryId))
      ||Object.keys(e.populationByCountry).some(countryId=>!eligible.has(countryId))
      ||e.eligibleCountryIds.some(countryId=>!Object.hasOwn(e.weights,countryId)||!Object.hasOwn(e.populationByCountry,countryId)))return false;
    if(Object.values(e.weights).reduce((a,b)=>a+b,0)!==e.totalWeight||Object.values(e.populationByCountry).reduce((a,b)=>a+b,0)!==e.totalPopulation)return false;
    if(r.execution.effectIds.some(effectId=>!Object.hasOwn(s.effects,effectId)))return false;
  }
  return true;
}

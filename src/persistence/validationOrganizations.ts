import {organizationFinancingSchema} from '../domain/organizationFinancingSchemas';
import {votingRule,resolutionPayload,electorate,sanctionMeasure,sanctionExemption} from '../domain/organizationSchemas';
import {z} from 'zod';
import {ORGANIZATION_IDS,P5_COUNTRY_IDS,type ResolutionPayload,type VotingRule} from '../domain/organizations';

const id=z.string().min(1),day=z.number().int().nonnegative(),money=z.number().finite().nonnegative();
const score=z.number().finite().min(0).max(100);
const ids=z.array(id).refine(values=>new Set(values).size===values.length);
const organizationId=z.enum(ORGANIZATION_IDS);
const membership=z.strictObject({countryId:id,tier:z.enum(['Observer','Member','PermanentCouncil']),
  offices:z.array(z.strictObject({role:z.literal('Chair'),bodyId:id,untilDay:day})),
  status:z.enum(['active','suspended','withdrawalPending']),joinedDay:day,duesArrearsB:money});
const body=z.strictObject({id,kind:z.enum(['assembly','council','board','forum','legacy']),memberIds:ids,permanentMemberIds:ids,votingRule,voteWeights:z.record(id,day).optional()});
const organization=z.strictObject({id:organizationId,charterVersion:day.positive(),memberships:z.record(id,membership),
  bodies:z.record(id,body),standingByCountry:z.record(id,score),availableFundsB:money,committedFundsB:money});
const resolution=z.strictObject({id,organizationId,bodyId:id,proposerId:id,payload:resolutionPayload,
  phase:z.enum(['draft','debate','voting','adopted','rejected','implementing','expired','revoked','failed']),openedDay:day,closesDay:day,effectiveDay:day,
  ruleSnapshot:votingRule,electorate,ballots:z.record(id,z.enum(['yes','no','abstain'])),
  outcome:z.strictObject({passed:z.boolean(),reason:id,yesCount:day,noCount:day,abstainCount:day,vetoedBy:ids.optional()}).optional(),
  execution:z.strictObject({status:z.enum(['pending','applied','failed']),effectIds:ids,reason:id.optional()}),
}).refine(r=>r.closesDay>=r.openedDay&&r.effectiveDay>=r.closesDay);
const legacyEffect=z.strictObject({id,kind:z.literal('legacySanctions'),issuer:z.literal('legacyCouncil'),targetId:id,startsDay:day,endsDay:day,status:z.literal('active')}).refine(e=>e.endsDay>=e.startsDay);
const sanctionEffect=z.strictObject({id,kind:z.literal('organizationSanctions'),organizationId,bodyId:id,sourceResolutionId:id,targetId:id,
  startsDay:day,endsDay:day,measures:z.array(sanctionMeasure).min(1),exemptions:z.array(sanctionExemption),status:z.enum(['active','expired'])}).refine(e=>e.endsDay>e.startsDay);
const financing=organizationFinancingSchema;
const organizations=z.strictObject({catalogVersion:day.positive(),financeVersion:z.literal(1).optional(),byId:z.record(organizationId,organization),resolutions:z.record(id,resolution),
  effects:z.record(id,z.union([legacyEffect,sanctionEffect])),financing:z.record(id,financing),nextSequence:day.positive(),lastProcessedDay:day});

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
    if(s.financeVersion===1&&['imf','worldBank','bricsPlus','oic'].includes(organizationId)&&o.bodies.financeBoard?.kind!=='board')return false;
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
      if(b.voteWeights&&Object.keys(b.voteWeights).some(countryId=>!Object.hasOwn(o.memberships,countryId)))return false;
      if(b.id!==bodyId||b.memberIds.some(countryId=>!Object.hasOwn(o.memberships,countryId))
        ||b.permanentMemberIds.some(countryId=>!b.memberIds.includes(countryId)||o.memberships[countryId].tier!=='PermanentCouncil')
        ||!validRule(b.votingRule,b.memberIds))return false;
      if(b.kind!=='legacy'&&b.memberIds.some(countryId=>o.memberships[countryId].tier==='Observer'))return false;
      if(b.votingRule.kind==='securityCouncil'&&(organizationId!=='un'||b.memberIds.length>15))return false;
    }
  }
  for(const [effectId,e] of Object.entries(s.effects)){
    if(e.id!==effectId||!known(e.targetId)||e.startsDay>currentDay)return false;
    if(e.kind==='organizationSanctions'){
      const source=s.resolutions[e.sourceResolutionId];
      if(!source||source.organizationId!==e.organizationId||source.bodyId!==e.bodyId||source.payload.kind!=='sanctions'||source.payload.targetId!==e.targetId
        ||!source.execution.effectIds.includes(effectId)||source.execution.status!=='applied'||e.exemptions.some(x=>!x.countryIds.every(known)))return false;
    }
  }
  for(const [financingId,f] of Object.entries(s.financing)){
    if(f.id!==financingId||!known(f.borrowerId))return false;
    const l=f.lifecycle;
    if(l){
      const source=s.resolutions[l.sourceResolutionId];
      if(!source||source.payload.kind!=='finance'||source.organizationId!==f.organizationId||source.payload.borrowerId!==f.borrowerId||
        source.payload.principalB!==f.principalB||source.execution.status!=='applied'||!source.execution.effectIds.includes(f.id)||
        l.startedDay>currentDay||l.lastProcessedDay>currentDay||l.lastProcessedDay<l.startedDay)return false;
      const p=source.payload,initial=p.initialTrancheB??(p.conditions.length?p.principalB/2:p.principalB);
      if(source.bodyId!=='financeBoard'||f.id!==`financing:${source.id}`||!['imf','worldBank','bricsPlus','oic'].includes(f.organizationId)||
        l.startedDay<source.effectiveDay||l.maturityDay!==l.startedDay+f.terms.termDays||
        f.terms.apr!==p.terms.apr||f.terms.termDays!==p.terms.termDays||f.terms.graceDays!==p.terms.graceDays||f.terms.denomination!==p.terms.denomination||
        l.fiscalAdjustmentB!==(p.fiscalAdjustmentB??0)||l.fundingKind!==(p.fundingKind??'loan')||
        l.conditions.length!==p.conditions.length||l.conditions.some((c,i)=>c.kind!==p.conditions[i].kind||c.threshold!==p.conditions[i].threshold||c.reviewDay!==p.conditions[i].reviewDay)||
        Math.abs(l.disbursedB-initial-l.tranches.filter(t=>t.status==='paid').reduce((n,t)=>n+t.amountB,0))>1e-7||
        Math.abs(l.tranches.reduce((n,t)=>n+t.amountB,0)+initial-f.principalB)>1e-7||
        l.tranches.some(t=>!p.conditions.some(c=>c.reviewDay===t.reviewDay)))return false;
    }
  }
  for(const id of ORGANIZATION_IDS){
    const tracked=Object.values(s.financing).filter(f=>f.organizationId===id&&f.lifecycle).reduce((n,f)=>n+f.committedB,0);
    if(tracked>s.byId[id].committedFundsB+1e-7)return false;
  }
  for(const [resolutionId,r] of Object.entries(s.resolutions)){
    const e=r.electorate,eligible=new Set(e.eligibleCountryIds);
    if(r.id!==resolutionId||!Object.hasOwn(s.byId[r.organizationId].bodies,r.bodyId)||!known(r.proposerId)||r.openedDay>currentDay
      ||!payloadCountries(r.payload).every(known)||!e.eligibleCountryIds.every(known)
      ||!validRule(r.ruleSnapshot,e.eligibleCountryIds))return false;
    if(Object.keys(r.ballots).some(countryId=>!eligible.has(countryId))||Object.keys(e.weights).some(countryId=>!eligible.has(countryId))
      ||Object.keys(e.populationByCountry).some(countryId=>!eligible.has(countryId))
      ||e.eligibleCountryIds.some(countryId=>!Object.hasOwn(e.weights,countryId)||!Object.hasOwn(e.populationByCountry,countryId)))return false;
    if(Object.values(e.weights).reduce((a,b)=>a+b,0)!==e.totalWeight||Object.values(e.populationByCountry).reduce((a,b)=>a+b,0)!==e.totalPopulation)return false;
    if(r.execution.effectIds.some(effectId=>!Object.hasOwn(s.effects,effectId)&&!Object.hasOwn(s.financing,effectId)))return false;
    if(r.phase==='voting'&&r.execution.status!=='pending')return false;
    if(r.outcome&&(r.outcome.yesCount+r.outcome.noCount+r.outcome.abstainCount>e.eligibleCountryIds.length||r.outcome.vetoedBy?.some(id=>!P5_COUNTRY_IDS.some(p=>p===id)||!e.eligibleCountryIds.includes(id))))return false;
  }
  return true;
}

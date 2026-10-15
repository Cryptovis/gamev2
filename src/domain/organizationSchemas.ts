import {z} from 'zod';
import type {ResolutionPayload,VotingRule} from './organizations';

const id=z.string().min(1),day=z.number().int().nonnegative(),money=z.number().finite().nonnegative();
const positiveDays=day.positive(),share=z.number().finite().min(0).max(1);
const ids=z.array(id).refine(values=>new Set(values).size===values.length);
const rational=z.strictObject({numerator:day,denominator:day.positive()}).refine(r=>r.numerator<=r.denominator);
export const votingRule:z.ZodType<VotingRule>=z.discriminatedUnion('kind',[
  z.strictObject({kind:z.literal('oneCountryOneVote'),threshold:rational,quorum:rational,denominator:z.enum(['eligible','presentVoting']),comparison:z.enum(['atLeast','greaterThan']).optional()}),
  z.strictObject({kind:z.literal('securityCouncil'),minimumYes:z.literal(9),vetoCountryIds:ids.max(5),procedural:z.boolean()}),
  z.strictObject({kind:z.literal('weighted'),basis:z.enum(['gdp','quota']),threshold:rational,denominator:z.enum(['eligibleWeight','castWeight']),weightSnapshotId:id}),
  z.strictObject({kind:z.literal('consensus'),objectionsBlock:z.literal(true),deadlinePolicy:z.literal('expire')}),
  z.strictObject({kind:z.literal('unanimity'),abstention:z.enum(['blocks','allowed']),quorum:rational}),
  z.strictObject({kind:z.literal('doubleMajority'),states:rational,population:rational,blockingMinorityCount:day.positive()}),
]);
export const sanctionMeasure=z.strictObject({scope:z.enum(['arms','trade','finance']),intensity:share,enforcement:share});
export const sanctionExemption=z.strictObject({scope:z.enum(['food','medicine','humanitarian']),countryIds:ids});
export const terms=z.strictObject({apr:z.number().finite().min(0).max(100),termDays:positiveDays,graceDays:day,denomination:z.enum(['USD','SDR'])}).refine(t=>t.graceDays<=t.termDays);
export const reformCondition=z.strictObject({kind:z.enum(['fiscalBalance','taxRate','subsidyShare']),threshold:z.number().finite(),reviewDay:day});
const defense=z.strictObject({countryId:id,personnel:day,equipmentB:money,fundingB:money,readyDay:day});
const investment=z.strictObject({countryId:id,amountB:money,readyDay:day});
export const resolutionPayload:z.ZodType<ResolutionPayload>=z.discriminatedUnion('kind',[
  z.strictObject({kind:z.literal('admission'),applicantId:id,tier:z.enum(['Observer','Member'])}),
  z.strictObject({kind:z.literal('membershipDiscipline'),targetId:id,action:z.enum(['suspend','expel']),grounds:id}),
  z.strictObject({kind:z.literal('sanctions'),targetId:id,measures:z.array(sanctionMeasure).min(1),durationDays:positiveDays,
    exemptions:z.array(sanctionExemption)}),
  z.strictObject({kind:z.literal('finance'),borrowerId:id,programId:id,principalB:money.positive(),terms,conditions:z.array(reformCondition).max(32),initialTrancheB:money.optional(),fiscalAdjustmentB:money.optional(),fundingKind:z.enum(['loan','grant']).optional()}),
  z.strictObject({kind:z.literal('oilQuota'),quotas:z.record(id,money),durationDays:positiveDays}),
  z.strictObject({kind:z.literal('defenseResponse'),incidentId:id,commitments:z.array(defense)}),
  z.strictObject({kind:z.literal('peacekeeping'),conflictId:id,mandate:z.strictObject({countryIds:ids,personnel:day,fundingB:money,durationDays:positiveDays,consentRequired:z.boolean()})}),
  z.strictObject({kind:z.literal('tradeRemedy'),disputeId:id,remedy:z.strictObject({targetId:id,commodity:id,tariffRate:share,maximumValueB:money,durationDays:positiveDays})}),
  z.strictObject({kind:z.literal('investmentCompact'),commitments:z.array(investment)}),
  z.strictObject({kind:z.literal('marketIntegration'),agreement:z.strictObject({countryIds:ids.min(2),tariffReduction:share,freeMovement:z.boolean(),durationDays:positiveDays})}),
  z.strictObject({kind:z.literal('localCurrencySwap'),agreement:z.strictObject({countryA:id,countryB:id,limitB:money.positive(),durationDays:positiveDays}).refine(a=>a.countryA!==a.countryB)}),
]);
export const electorate=z.strictObject({eligibleCountryIds:ids,weights:z.record(id,day),populationByCountry:z.record(id,day),totalWeight:day,totalPopulation:day});

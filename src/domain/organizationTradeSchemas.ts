import {z} from 'zod';
import {ORGANIZATION_IDS,type OrganizationEconomicEffect} from './organizations';
const id=z.string().min(1),day=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),money=z.number().finite().nonnegative(),share=money.max(1);
const ids=z.array(id).min(2).refine(x=>new Set(x).size===x.length);
const common={id,organizationId:z.enum(ORGANIZATION_IDS),bodyId:id,sourceResolutionId:id,startsDay:day,endsDay:day,status:z.enum(['active','expired'])};
export const economicEffectSchema:z.ZodType<OrganizationEconomicEffect>=z.discriminatedUnion('kind',[
 z.strictObject({...common,kind:z.literal('organizationOilQuota'),quotas:z.record(id,money),allowedDeviationByCountry:z.record(id,money),lastStandingDay:day}),
 z.strictObject({...common,kind:z.literal('organizationTradeRemedy'),disputeId:id,remedy:z.strictObject({targetId:id,commodity:id,tariffRate:share,maximumValueB:money,durationDays:day.positive()}),collectedB:money}),
 z.strictObject({...common,kind:z.literal('organizationMarketIntegration'),agreement:z.strictObject({countryIds:ids,tariffReduction:share,freeMovement:z.boolean(),durationDays:day.positive()})}),
 z.strictObject({...common,kind:z.literal('organizationCurrencySwap'),agreement:z.strictObject({countryA:id,countryB:id,limitB:money.positive(),durationDays:day.positive()}),usedB:money,localBalanceByCountry:z.record(id,z.number().finite())}),
]).refine(e=>e.endsDay>e.startsDay&&(e.kind!=='organizationTradeRemedy'||e.collectedB<=e.remedy.maximumValueB+1e-8)&&
 (e.kind!=='organizationCurrencySwap'||e.agreement.countryA!==e.agreement.countryB&&e.usedB<=e.agreement.limitB+1e-8));

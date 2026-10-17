import {validOrganizations} from './validationOrganizations';
import {institutionWorld,institutionCouncil,validInstitutionReferences} from './validationWorld';
import {LEADER_ARCHETYPES} from '../data/leaderArchetypes';
import {valid0904Fields} from './validation0904';
import {valid088Fields} from './validation088';
import {validFlights} from './validation089';
import {validCommodityExchange} from './validation089H';
import {validPeaceState} from './validation096';
import {validNuclearState} from './validation097';
import {validParliamentState} from './validation098';
import {valid083State} from './validation083';
import {validFactionsInSave} from './validation088E';
import {z} from 'zod';
import {technologyById} from '../data/technologyTree';
const technologyId=z.string().refine(id=>!!technologyById[id]);
const number=z.number().finite();
const bag=z.record(z.string(),z.unknown());
const country=z.looseObject({id:z.string(),name:z.string(),iso2:z.string(),economy:z.looseObject({foreignReservesB:number.nonnegative().optional(),tariffRevenueB:number.nonnegative().optional(),gdp:number,treasury:number,debt:number,taxRate:number,inflation:number,unemployment:number,productivity:number}),demographics:z.looseObject({population:number,workforce:number,growthRate:number}),resources:z.object({food:number,oil:number,iron:number,uranium:number}),resourceProduction:z.object({food:number,oil:number,iron:number,uranium:number}),processedResources:z.object({fuel:number,steel:number,electricity:number}),industry:z.looseObject({factories:number,refineries:number,mines:number,powerCapacity:number,utilization:number}),politics:z.looseObject({approval:number,stability:number,regime:z.string(),electionDaysRemaining:number}),technology:z.looseObject({researchPoints:number,unlocked:z.array(z.string()),project:z.looseObject({id:z.string(),technologyId,startedDay:number,lastProgressDay:number,workDone:number.nonnegative(),requiredWork:number.positive(),cost:number.nonnegative()}).refine(p=>p.workDone<=p.requiredWork&&p.lastProgressDay>=p.startedDay).nullable().optional()}),society:bag,military:bag,diplomacy:z.looseObject({relations:bag.refine(relations=>Object.values(relations).every(r=>!r||typeof r!=='object'||!('tradeStrainSinceDay' in r)||r.tradeStrainSinceDay===undefined||(typeof r.tradeStrainSinceDay==='number'&&Number.isInteger(r.tradeStrainSinceDay)&&r.tradeStrainSinceDay>=0))),reputation:number}),intelligence:bag,ministries:z.looseObject({allocations:bag,efficiency:bag}),ai:bag});
const save=z.looseObject({schemaVersion:z.number().int(),simulationSeed:number,day:number.int().positive(),speed:z.union([z.literal(0),z.literal(1),z.literal(2),z.literal(3),z.literal(5)]),preferredSpeed:z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(5)]),campaignStatus:z.enum(['active','lost','won']),playerCountryId:z.string(),playerProfile:z.looseObject({commanderName:z.string(),avatarId:z.string(),language:z.enum(['en','tr','es','zh','ru']),setupComplete:z.boolean()}),countries:z.record(z.string(),country),world:institutionWorld.extend({tutorial:z.looseObject({active:z.boolean(),step:number.int().min(0).max(9),completed:z.boolean()}),energy:bag.optional(),campaignId:z.string().optional(),commandIds:z.array(z.string()).max(512).optional(),journal:z.array(z.object({id:z.string(),day:number,message:z.string(),kind:z.enum(['command','world','legacy'])})).max(200).optional()}),production:bag,infrastructure:bag,industrialEconomy:bag,industrialContracts:bag,leadership:bag.refine(l=>l.archetype===undefined||LEADER_ARCHETYPES.includes(l.archetype as typeof LEADER_ARCHETYPES[number])),tradeDeals:bag,wars:bag,blocs:bag,council:institutionCouncil,intelOperations:bag,intelligenceLedger:bag,culturalInfluence:bag,embassies:bag,diplomaticOffers:z.array(z.unknown()),sitrep:z.array(z.string()),mapPresentation:z.enum(['political','geographic']),advisorCooldownUntil:number});
export function validSaveShape(value:unknown):boolean {
 const result=save.safeParse(value);return result.success && (result.data.schemaVersion<18&&result.data.world.organizations===undefined||validOrganizations(result.data.world.organizations,result.data.countries,result.data.day)) && validInstitutionReferences(result.data) && valid0904Fields(value) && valid083State(value) && valid088Fields(value) && validFlights(value) && validCommodityExchange(value) && validPeaceState(value) && validNuclearState(value) && validParliamentState(value) && validFactionsInSave(result.data) && !!result.data.countries[result.data.playerCountryId] && Object.values(result.data.countries).every(c=>Object.values(c.diplomacy.relations).every(r=>!r||typeof r!=='object'||!('tradeStrainSinceDay' in r)||typeof r.tradeStrainSinceDay!=='number'||r.tradeStrainSinceDay<=result.data.day)) && Object.values(result.data.countries).every(c=>Object.values(c.diplomacy.relations).every(r=>validTreatyFields(r,result.data.day)));
}
/** Optional 0.87 relation fields (audit D8/D12): absent/undefined, or finite day numbers (strain days not in the future). */
function validTreatyFields(relation:unknown,day:number):boolean {
  if (!relation || typeof relation !== 'object') return true;
  const r = relation as Record<string, unknown>;
  const optionalDay = (value: unknown, latest: number) => value === undefined || (typeof value === 'number' && Number.isFinite(value) && value <= latest);
  const retry = r.proposalRetryDay;
  const retryValid = retry === undefined || (!!retry && typeof retry === 'object' && Object.values(retry).every((value) => optionalDay(value, Number.MAX_SAFE_INTEGER)));
  return optionalDay(r.allianceStrainSinceDay, day) && optionalDay(r.nonAggressionStrainSinceDay, day) && retryValid;
}

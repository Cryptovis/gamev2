import {z} from 'zod';
import {terms,reformCondition} from './organizationSchemas';
import {ORGANIZATION_IDS,type OrganizationFinancingRecord} from './organizations';
const day=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),money=z.number().finite().nonnegative();
export const financingLifecycle=z.strictObject({
  sourceResolutionId:z.string().min(1),startedDay:day,maturityDay:day,lastProcessedDay:day,nextServiceDay:day,
  accruedInterestB:money,interestPaidB:money,repaidPrincipalB:money,disbursedB:money,arrearsB:money,defaultRecorded:z.boolean(),
  fundingKind:z.enum(['loan','grant']),fiscalAdjustmentB:money,conditions:z.array(reformCondition).max(32),
  tranches:z.array(z.strictObject({reviewDay:day,amountB:money,status:z.enum(['pending','paid','cancelled'])})).max(32),
});
export const organizationFinancingSchema:z.ZodType<OrganizationFinancingRecord>=z.strictObject({
  id:z.string().min(1),organizationId:z.enum(ORGANIZATION_IDS),borrowerId:z.string().min(1),principalB:money,
  outstandingB:money,committedB:money,terms,status:z.enum(['active','paused','closed','defaulted','cancelled','expired']),lifecycle:financingLifecycle.optional(),
}).refine(f=>{
  const l=f.lifecycle,tolerance=1e-7;
  if(f.outstandingB+f.committedB>f.principalB+tolerance)return false;
  if(!l)return ['active','paused','closed'].includes(f.status);
  const pending=l.tranches.filter(t=>t.status==='pending').reduce((n,t)=>n+t.amountB,0);
  const paid=l.tranches.filter(t=>t.status==='paid').reduce((n,t)=>n+t.amountB,0);
  return l.maturityDay>l.startedDay&&l.lastProcessedDay>=l.startedDay&&l.nextServiceDay>=l.startedDay&&
    l.disbursedB<=f.principalB+tolerance&&l.repaidPrincipalB<=l.disbursedB+tolerance&&
    Math.abs(pending-f.committedB)<tolerance&&paid<=l.disbursedB+tolerance&&
    (l.fundingKind==='grant'?f.outstandingB===0&&l.accruedInterestB===0:Math.abs(l.disbursedB-l.repaidPrincipalB-f.outstandingB)<tolerance)&&
    l.tranches.every((t,i)=>t.reviewDay>l.startedDay&&t.reviewDay<l.maturityDay&&(i===0||t.reviewDay>l.tranches[i-1].reviewDay))&&
    l.arrearsB<=f.outstandingB+l.accruedInterestB+tolerance&&
    (f.status!=='closed'||f.committedB+f.outstandingB+l.accruedInterestB===0)&&
    (!['defaulted','cancelled','expired'].includes(f.status)||f.committedB===0);
});
export function isOrganizationFinancing(value:unknown):value is OrganizationFinancingRecord {
  return organizationFinancingSchema.safeParse(value).success;
}

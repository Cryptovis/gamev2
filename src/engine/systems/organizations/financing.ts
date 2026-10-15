import {hasFinancialRestriction} from './sanctions';
import type {GameState} from '../../../domain/game';
import type {FinancePayload,OrganizationFinancingRecord,Resolution,OrganizationId} from '../../../domain/organizations';
import {isOrganizationFinancing} from '../../../domain/organizationFinancingSchemas';
import {arrears} from '../sovereignCredit';
import {fiscalAccounts} from '../economy';
import {leaderModifiers} from '../leaderPerks';

const EPS=1e-8;
export const FINANCIAL_ORGANIZATIONS:readonly OrganizationId[]=['imf','worldBank','bricsPlus','oic'];
/** Stage 1b.3 lending gate. Every threshold is a share of the borrower's GDP so it binds the USA and a microstate alike. */
export const AGGRESSOR_GATED_LENDERS:readonly OrganizationId[]=['imf','worldBank'];
export const DEBT_SUSTAINABILITY_CEILING=1.5;
export const IMF_FLOOR_PRINCIPAL_GDP_SHARE=.01,IMF_FLOOR_ADJUSTMENT_GDP_SHARE=.2,IMF_FLOOR_ADJUSTMENT_PRINCIPAL_SHARE=.25,IMF_FLOOR_MAX_INITIAL_SHARE=.5;
/** Board risk: debt stress starts at 60% debt/GDP; the four weights sum to 1; AI inclination loses risk x AI_RISK_PENALTY. */
export const RISK_DEBT_STRESS_FLOOR=.6,RISK_WEIGHTS={debt:.4,aggressor:.3,default:.2,lax:.1} as const,AI_RISK_PENALTY=.4;
/** True when the country is the attacker in any active war. Defenders and their allies never are. */
export function isAggressor(state:GameState,countryId:string):boolean {
  return Object.values(state.wars).some(w=>w.status==='active'&&w.attackerId===countryId);
}
const lenderBlocksAggressor=(state:GameState,organizationId:OrganizationId,borrowerId:string)=>AGGRESSOR_GATED_LENDERS.includes(organizationId)&&isAggressor(state,borrowerId);
/** Austerity binds IMF programs that are running, and a repaid program until its original maturity. */
const imfAusterityCounts=(state:GameState,f:OrganizationFinancingRecord)=>f.organizationId==='imf'&&(['active','paused'].includes(f.status)||f.status==='closed'&&!!f.lifecycle&&state.day<f.lifecycle.maturityDay);
export function financingRecords(state:GameState):OrganizationFinancingRecord[] {
  return Object.values(state.world.organizations.financing).filter(isOrganizationFinancing).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
}
/** Build once per world tick rather than scanning/validating every contract for every country. */
export function organizationCountryAccounts(state:GameState):Record<string,{debtB:number;fiscalAdjustmentB:number}> {
  const result:Record<string,{debtB:number;fiscalAdjustmentB:number}>={};
  for(const f of financingRecords(state)){
    if(!f.lifecycle)continue;
    const row=result[f.borrowerId]??={debtB:0,fiscalAdjustmentB:0};
    row.debtB+=f.outstandingB+f.lifecycle.accruedInterestB;
    if(imfAusterityCounts(state,f))row.fiscalAdjustmentB+=f.lifecycle.fiscalAdjustmentB;
  }
  for(const [id,row] of Object.entries(result))row.fiscalAdjustmentB=Math.min(row.fiscalAdjustmentB,state.countries[id].economy.gdp*.2);
  return result;
}
export function organizationDebtB(state:GameState,countryId:string):number {
  return financingRecords(state).filter(f=>f.borrowerId===countryId&&f.lifecycle).reduce((n,f)=>n+f.outstandingB+f.lifecycle!.accruedInterestB,0);
}
export function organizationFiscalAdjustmentB(state:GameState,countryId:string):number {
  return Math.min(state.countries[countryId].economy.gdp*.2,financingRecords(state).filter(f=>f.borrowerId===countryId&&imfAusterityCounts(state,f)).reduce((n,f)=>n+(f.lifecycle?.fiscalAdjustmentB??0),0));
}
export function hasFinancingDefault(state:GameState,countryId:string):boolean {
  return arrears(state,countryId)>EPS||financingRecords(state).some(f=>f.borrowerId===countryId&&(f.status==='defaulted'||(f.lifecycle?.arrearsB??0)>EPS));
}
/** Review fiscalBalance is $B/day, taxRate is percent, subsidyShare is the social-ministry budget fraction. */
export function financingConditionsMet(state:GameState,f:OrganizationFinancingRecord,reviewDay=state.day):boolean {
  const c=state.countries[f.borrowerId];
  if(!c||c.annexedBy||lenderBlocksAggressor(state,f.organizationId,f.borrowerId))return false;
  const fiscal=fiscalAccounts(c,leaderModifiers(state,c.id),organizationDebtB(state,c.id),organizationFiscalAdjustmentB(state,c.id)).dailyBalance;
  const total=Object.values(c.ministries.allocations).reduce((a,b)=>a+b,0);
  const subsidyShare=total>0?c.ministries.allocations.society/total:0;
  return (f.lifecycle?.conditions??[]).filter(condition=>condition.reviewDay<=reviewDay).every(condition=>{
    const measured=condition.kind==='taxRate'?c.economy.taxRate:condition.kind==='fiscalBalance'?fiscal:subsidyShare;
    return Number.isFinite(measured)&&(condition.kind==='subsidyShare'?measured<=condition.threshold:measured>=condition.threshold);
  });
}
function put(state:GameState,f:OrganizationFinancingRecord):GameState {
  const o=state.world.organizations;
  return {...state,world:{...state.world,organizations:{...o,financing:{...o.financing,[f.id]:f}}}};
}
function standing(state:GameState,f:OrganizationFinancingRecord,penalty:number):GameState {
  const organizations=state.world.organizations,o=organizations.byId[f.organizationId];
  return {...state,world:{...state.world,organizations:{...organizations,byId:{...organizations.byId,[o.id]:{...o,standingByCountry:{...o.standingByCountry,[f.borrowerId]:Math.max(0,(o.standingByCountry[f.borrowerId]??0)-penalty)}}}}}};
}
function release(state:GameState,f:OrganizationFinancingRecord,status:OrganizationFinancingRecord['status']):GameState {
  const organizations=state.world.organizations,o=organizations.byId[f.organizationId];
  const next={...state,world:{...state.world,organizations:{...organizations,byId:{...organizations.byId,[o.id]:{...o,availableFundsB:o.availableFundsB+f.committedB,committedFundsB:Math.max(0,o.committedFundsB-f.committedB)}}}}};
  return put(next,{...f,status,committedB:0,lifecycle:f.lifecycle?{...f.lifecycle,tranches:f.lifecycle.tranches.map(t=>t.status==='pending'?{...t,status:'cancelled'}:t)}:undefined});
}
function disburse(state:GameState,f:OrganizationFinancingRecord,amountB:number):GameState {
  const organizations=state.world.organizations,o=organizations.byId[f.organizationId],c=state.countries[f.borrowerId],l=f.lifecycle!;
  const debt=l.fundingKind==='loan'?amountB:0;
  const next={...state,countries:{...state.countries,[c.id]:{...c,economy:{...c.economy,treasury:c.economy.treasury+amountB,debt:c.economy.debt+debt},
    politics:{...c.politics,stability:Math.min(100,c.politics.stability+Math.min(2,amountB/Math.max(1,c.economy.gdp)*20))}}},
    world:{...state.world,organizations:{...organizations,byId:{...organizations.byId,[o.id]:{...o,committedFundsB:Math.max(0,o.committedFundsB-amountB)}}}}};
  return put(next,{...f,committedB:Math.max(0,f.committedB-amountB),outstandingB:f.outstandingB+debt,lifecycle:{...l,disbursedB:l.disbursedB+amountB}});

}
/** IMF board floor for a loan; the proposal form and the validator both read it from here. */
export function imfConditionalityFloor(state:GameState,borrowerId:string,principalB:number):{minFiscalAdjustmentB:number;requiresFiscalCondition:boolean;maxInitialTrancheShare:number} {
  const gdp=state.countries[borrowerId]?.economy.gdp??0;
  if(!(gdp>0&&principalB>IMF_FLOOR_PRINCIPAL_GDP_SHARE*gdp))return {minFiscalAdjustmentB:0,requiresFiscalCondition:false,maxInitialTrancheShare:1};
  return {minFiscalAdjustmentB:Math.min(IMF_FLOOR_ADJUSTMENT_GDP_SHARE*gdp,IMF_FLOOR_ADJUSTMENT_PRINCIPAL_SHARE*principalB),requiresFiscalCondition:true,maxInitialTrancheShare:IMF_FLOOR_MAX_INITIAL_SHARE};
}
/** Debt/GDP after this loan: current debt, the undisbursed commitments of the borrower's other active loans, and the new principal. Grants add none. */
export function projectedDebtToGdp(state:GameState,p:FinancePayload):number {
  const c=state.countries[p.borrowerId];
  if(!c)return 0;
  const committed=financingRecords(state).filter(f=>f.borrowerId===p.borrowerId&&f.status==='active'&&f.lifecycle?.fundingKind==='loan').reduce((n,f)=>n+f.committedB,0);
  return (c.economy.debt+committed+(p.fundingKind==='grant'?0:p.principalB))/Math.max(1,c.economy.gdp);
}
/** Board risk in [0,1] used by AI votes and shown in the proposal preview. */
export function financingRisk(state:GameState,p:FinancePayload):number {
  const stress=Math.max(0,Math.min(1,(projectedDebtToGdp(state,p)-RISK_DEBT_STRESS_FLOOR)/(DEBT_SUSTAINABILITY_CEILING-RISK_DEBT_STRESS_FLOOR)));
  const defaulted=hasFinancingDefault(state,p.borrowerId)||financingRecords(state).some(f=>f.borrowerId===p.borrowerId&&f.lifecycle?.defaultRecorded);
  const lax=p.fundingKind!=='grant'&&p.conditions.length===0;
  return Math.max(0,Math.min(1,RISK_WEIGHTS.debt*stress+RISK_WEIGHTS.aggressor*(isAggressor(state,p.borrowerId)?1:0)+RISK_WEIGHTS.default*(defaulted?1:0)+RISK_WEIGHTS.lax*(lax?1:0)));
}
/** Rechecked at adoption: competing approvals cannot overdraw a capital reservoir. */
export function financeAdoptionReason(state:GameState,organizationId:OrganizationId,p:FinancePayload):string|null {
  const o=state.world.organizations.byId[organizationId],c=state.countries[p.borrowerId],m=o.memberships[p.borrowerId];
  if(!FINANCIAL_ORGANIZATIONS.includes(organizationId)||!c||c.annexedBy||m?.status!=='active'||m.tier==='Observer')return 'borrowerMembership';
  if(lenderBlocksAggressor(state,organizationId,c.id))return 'borrowerAggressor';
  if(hasFinancialRestriction(state,c.id))return 'financialRestriction';
  if(hasFinancingDefault(state,c.id))return 'financingDefault';
  if(p.principalB>o.availableFundsB)return 'insufficientCapital';
  const initial=p.initialTrancheB??(p.conditions.length?p.principalB/2:p.principalB);
  if(p.principalB>1e9||!(initial>0&&initial<=p.principalB)||p.terms.termDays>3650||!Number.isSafeInteger(state.day+p.terms.termDays)||
    (p.fiscalAdjustmentB??0)>c.economy.gdp*.2||(p.fiscalAdjustmentB??0)>0&&organizationId!=='imf'||p.terms.termDays<1||
    !Number.isFinite(c.economy.treasury+p.principalB)||!Number.isFinite(c.economy.debt+p.principalB)||
    p.conditions.some(x=>x.reviewDay<=state.day||x.reviewDay>=state.day+p.terms.termDays||x.kind==='taxRate'&&(x.threshold<0||x.threshold>60)||x.kind==='subsidyShare'&&(x.threshold<0||x.threshold>1))||
    initial<p.principalB&&!p.conditions.length||p.fundingKind==='grant'&&(organizationId==='imf'||p.terms.apr!==0))return 'invalidFinanceTerms';
  if(organizationId==='imf'){
    const floor=imfConditionalityFloor(state,c.id,p.principalB);
    if((p.fiscalAdjustmentB??0)<floor.minFiscalAdjustmentB-EPS||floor.requiresFiscalCondition&&!p.conditions.some(x=>x.kind==='fiscalBalance'||x.kind==='taxRate')||initial>p.principalB*floor.maxInitialTrancheShare+EPS)return 'imfConditionalityFloor';
  }
  if(p.fundingKind!=='grant'&&projectedDebtToGdp(state,p)>DEBT_SUSTAINABILITY_CEILING)return 'debtUnsustainable';
  if(financingRecords(state).some(f=>f.lifecycle&&f.organizationId===organizationId&&f.borrowerId===p.borrowerId&&
    state.world.organizations.resolutions[f.lifecycle.sourceResolutionId]?.payload.kind==='finance'&&
    (state.world.organizations.resolutions[f.lifecycle.sourceResolutionId].payload as FinancePayload).programId===p.programId))return 'duplicateProgram';
  if(Object.keys(state.world.organizations.financing).length>=1024)return 'financingCapacity';
  return null;
}
export function adoptOrganizationFinancing(state:GameState,r:Resolution & {payload:FinancePayload}):GameState {
  const board=state.world.organizations.byId[r.organizationId].bodies[r.bodyId];
  const authorized=r.bodyId==='financeBoard'&&board?.kind==='board'&&(!['imf','worldBank'].includes(r.organizationId)||r.ruleSnapshot.kind==='weighted'&&r.ruleSnapshot.basis==='quota');
  const reason=!authorized?'financeAuthority':r.proposerId!==r.payload.borrowerId?'financeConsent':financeAdoptionReason(state,r.organizationId,r.payload),id=`financing:${r.id}`,organizations=state.world.organizations;
  if(reason||Object.hasOwn(organizations.financing,id))return {...state,world:{...state.world,organizations:{...organizations,resolutions:{...organizations.resolutions,[r.id]:{...r,phase:'failed',execution:{status:'failed',effectIds:[],reason:reason??'financingCollision'}}}}}};
  const p=r.payload,o=organizations.byId[r.organizationId],initial=p.initialTrancheB??(p.conditions.length?p.principalB/2:p.principalB);
  const days=[...new Set(p.conditions.map(c=>c.reviewDay))].sort((a,b)=>a-b);
  let remaining=p.principalB-initial;
  const tranches=remaining>0?days.map((reviewDay,i)=>{const amountB=i===days.length-1?remaining:(p.principalB-initial)/days.length;remaining-=amountB;return {reviewDay,amountB,status:'pending' as const};}):[];
  const f:OrganizationFinancingRecord={id,organizationId:r.organizationId,borrowerId:p.borrowerId,principalB:p.principalB,outstandingB:0,committedB:p.principalB,terms:structuredClone(p.terms),status:'active',
    lifecycle:{sourceResolutionId:r.id,startedDay:state.day,maturityDay:state.day+p.terms.termDays,lastProcessedDay:state.day,nextServiceDay:state.day+Math.max(30,p.terms.graceDays),
      accruedInterestB:0,interestPaidB:0,repaidPrincipalB:0,disbursedB:0,arrearsB:0,defaultRecorded:false,fundingKind:p.fundingKind??'loan',fiscalAdjustmentB:p.fiscalAdjustmentB??0,conditions:structuredClone(p.conditions),tranches}};
  const reserved={...state,world:{...state.world,organizations:{...organizations,byId:{...organizations.byId,[o.id]:{...o,availableFundsB:o.availableFundsB-p.principalB,committedFundsB:o.committedFundsB+p.principalB}},
    resolutions:{...organizations.resolutions,[r.id]:{...r,execution:{status:'applied' as const,effectIds:[id]}}}}}};
  let next=disburse(put(reserved,f),f,initial);
  const current=next.world.organizations.financing[id] as OrganizationFinancingRecord;
  if(current.lifecycle!.fundingKind==='grant'&&current.committedB===0)next=put(next,{...current,status:'closed'});
  return next;
}
export function financingPaymentReason(state:GameState,id:string,principalB:number,interestB:number,actorId:string):string|null {
  const f=Object.hasOwn(state.world.organizations.financing,id)?state.world.organizations.financing[id]:undefined;
  if(!isOrganizationFinancing(f)||!f.lifecycle||f.borrowerId!==actorId||f.status==='closed')return 'financingAccess';
  if(!Number.isFinite(principalB)||!Number.isFinite(interestB)||principalB<0||interestB<0||principalB+interestB<=0||
    principalB>f.outstandingB||interestB>f.lifecycle.accruedInterestB||principalB+interestB>state.countries[actorId].economy.treasury)return 'invalidRepayment';
  return null;
}
/** Internal transfer; callers validate voluntary payments or cap scheduled service to available cash. */
export function payOrganizationFinancing(state:GameState,f:OrganizationFinancingRecord,principalB:number,interestB:number):GameState {
  const organizations=state.world.organizations,o=organizations.byId[f.organizationId],c=state.countries[f.borrowerId],l=f.lifecycle!,amount=principalB+interestB;
  const next={...state,countries:{...state.countries,[c.id]:{...c,economy:{...c.economy,treasury:c.economy.treasury-amount,debt:Math.max(0,c.economy.debt-amount)}}},
    world:{...state.world,organizations:{...organizations,byId:{...organizations.byId,[o.id]:{...o,availableFundsB:o.availableFundsB+amount}}}}};
  const outstandingB=Math.max(0,f.outstandingB-principalB),accruedInterestB=Math.max(0,l.accruedInterestB-interestB),arrearsB=state.day>=l.maturityDay?outstandingB+accruedInterestB:Math.max(0,l.arrearsB-interestB);
  const status=outstandingB+accruedInterestB+f.committedB===0?'closed':f.status==='defaulted'&&arrearsB<=EPS&&!arrears(state,c.id)?'active':f.status;
  return put(next,{...f,outstandingB,status,lifecycle:{...l,accruedInterestB,arrearsB,interestPaidB:l.interestPaidB+interestB,repaidPrincipalB:l.repaidPrincipalB+principalB}});
}
export function cancelOrganizationFinancing(state:GameState,id:string):GameState {
  const f=state.world.organizations.financing[id] as OrganizationFinancingRecord;
  return release(state,f,'cancelled');
}
function defaultFinancing(state:GameState,f:OrganizationFinancingRecord):GameState {
  let next=release(state,f,'defaulted');
  if(!f.lifecycle!.defaultRecorded){
    next=standing(next,f,10);const c=next.countries[f.borrowerId];
    next={...next,countries:{...next.countries,[c.id]:{...c,diplomacy:{...c.diplomacy,reputation:Math.max(0,c.diplomacy.reputation-5)}}}};
  }
  const current=next.world.organizations.financing[f.id] as OrganizationFinancingRecord;
  return put(next,{...current,lifecycle:{...current.lifecycle!,defaultRecorded:true}});
}
/** One ledger step per day, including paused/cancelled loans: cancellation never forgives disbursed debt. */
export function processOrganizationFinancing(state:GameState):GameState {
  let next=state;
  for(const original of financingRecords(state)){
    if(!original.lifecycle||original.status==='closed'||['cancelled','expired'].includes(original.status)&&original.outstandingB+original.lifecycle.accruedInterestB===0||original.lifecycle.lastProcessedDay>=state.day)continue;
    // Sequential days make catch-up deterministic, including service and review boundaries.
    for(let day=original.lifecycle.lastProcessedDay+1;day<=state.day;day++){
      let f=next.world.organizations.financing[original.id] as OrganizationFinancingRecord,l=f.lifecycle!;
      if(f.status==='closed')break;
      const dated={...next,day},interest=f.outstandingB*(f.terms.apr/100)/365,c=next.countries[f.borrowerId];
      f={...f,lifecycle:{...l,lastProcessedDay:day,accruedInterestB:l.accruedInterestB+interest}};
      next=put({...dated,countries:{...next.countries,[c.id]:{...c,economy:{...c.economy,debt:c.economy.debt+interest}}}},f);
      l=f.lifecycle!;
      if(!c||c.annexedBy||arrears(next,c.id)>EPS){next=defaultFinancing(next,f);continue;}
      if(day>=l.nextServiceDay||day>=l.maturityDay){
        const cash=Math.max(0,next.countries[c.id].economy.treasury),interestPaid=Math.min(cash,l.accruedInterestB),principalPaid=day>=l.maturityDay?Math.min(Math.max(0,cash-interestPaid),f.outstandingB):0;
        next=payOrganizationFinancing(next,f,principalPaid,interestPaid);f=next.world.organizations.financing[f.id] as OrganizationFinancingRecord;l=f.lifecycle!;
        const due=l.accruedInterestB+(day>=l.maturityDay?f.outstandingB:0);
        f={...f,lifecycle:{...l,nextServiceDay:day+30,arrearsB:due}};next=put(next,f);
        if(due>EPS){next=defaultFinancing(next,f);continue;}
      }
      if(day>=l.maturityDay){next=release(next,f,f.committedB>0?'expired':f.outstandingB+l.accruedInterestB===0?'closed':'expired');continue;}
      if(f.status==='defaulted'||f.status==='cancelled'||f.status==='expired')continue;
      for(let index=0;index<f.lifecycle!.tranches.length;index++){
        const t=f.lifecycle!.tranches[index];if(t.status!=='pending'||t.reviewDay>day)continue;
        if(!financingConditionsMet(next,f,day)){
          if(f.status!=='paused')next=standing(next,f,3);
          f={...f,status:'paused'};next=put(next,f);break;
        }
        const membership=next.world.organizations.byId[f.organizationId].memberships[f.borrowerId];
        if(membership?.status!=='active'||membership.tier==='Observer'){next=release(next,f,'cancelled');f=next.world.organizations.financing[f.id] as OrganizationFinancingRecord;break;}
        f={...f,status:'active',lifecycle:{...f.lifecycle!,tranches:f.lifecycle!.tranches.map((x,i)=>i===index?{...x,status:'paid'}:x)}};
        next=disburse(next,f,t.amountB);f=next.world.organizations.financing[f.id] as OrganizationFinancingRecord;
      }
      if(f.lifecycle!.fundingKind==='grant'&&f.committedB===0){next=put(next,{...f,status:'closed'});continue;}
      if(f.organizationId==='imf'&&['active','paused'].includes(f.status)){
        const borrower=next.countries[f.borrowerId],load=f.lifecycle!.fiscalAdjustmentB/Math.max(1,borrower.economy.gdp);
        next={...next,countries:{...next.countries,[borrower.id]:{...borrower,politics:{...borrower.politics,approval:Math.max(0,borrower.politics.approval-Math.min(1,load*2)),stability:Math.max(0,borrower.politics.stability-Math.min(.5,load))}}}};
      }
    }
    next={...next,day:state.day};
  }
  return next;
}

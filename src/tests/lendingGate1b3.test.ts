import {describe,it,expect} from 'vitest';
import {makeInitialState} from '../data/initialState';
import type {GameState,WarState} from '../domain/game';
import type {FinancePayload,OrganizationFinancingRecord,OrganizationId} from '../domain/organizations';
import {nextRandom} from '../engine/rng';
import {castBallot,proposeResolution,repayOrganizationFinancing} from '../engine/systems/organizations/commands';
import {processOrganizationAiVotes} from '../engine/systems/organizations/ai';
import {AI_RISK_PENALTY,DEBT_SUSTAINABILITY_CEILING,financingRisk,imfConditionalityFloor,isAggressor,organizationFiscalAdjustmentB,projectedDebtToGdp} from '../engine/systems/organizations/financing';
import {processOrganizations} from '../engine/systems/organizations/tick';
import {organizationReason} from '../engine/systems/organizations/previews';
import {validateOrganizationCommand} from '../engine/systems/organizations/validation';
import {recordEconomicHistory} from '../engine/systems/economicHistory';

/** Stage 1b.3: anti-war lending gate. Fixtures follow organizationFinancing099.test.ts. */
const payload=(overrides:Partial<FinancePayload>={}):FinancePayload=>({kind:'finance',borrowerId:'TUR',programId:'stabilization',principalB:10,
 terms:{apr:3.65,termDays:90,graceDays:30,denomination:'SDR'},initialTrancheB:4,
 conditions:[{kind:'taxRate',threshold:30,reviewDay:10},{kind:'taxRate',threshold:35,reviewDay:20}],...overrides});
function ready():GameState {
 const s=makeInitialState();s.playerCountryId='TUR';s.council.influenceByCountry.TUR=50;s.council.influenceByCountry.USA=50;
 s.countries.TUR.economy.taxRate=40;s.eventCooldownUntil=10000;s.advisorCooldownUntil=10000;
 s.world.organizations.byId.imf.standingByCountry.TUR=50;return recordEconomicHistory(s);
}
const reason=(s:GameState,p:FinancePayload,organizationId:OrganizationId='imf')=>validateOrganizationCommand(s,{type:'organization/proposeResolution',organizationId,bodyId:'financeBoard',payload:p},p.borrowerId).reason;
const request=(s:GameState,p=payload(),organizationId:OrganizationId='imf')=>proposeResolution(s,organizationId,'financeBoard',p,p.borrowerId);
function approve(s:GameState,id:string):GameState {
 const r=s.world.organizations.resolutions[id];expect(r).toBeDefined();
 for(const voter of r.electorate.eligibleCountryIds)s=castBallot(s,id,'yes',voter);
 return processOrganizations({...s,day:r.closesDay});
}
const at=(s:GameState,day:number)=>processOrganizations({...s,day});
const contract=(s:GameState,id='financing:ORG-1')=>s.world.organizations.financing[id] as OrganizationFinancingRecord;
const war=(attackerId:string,defenderId:string,status:WarState['status']='active'):WarState=>({id:`${attackerId}-${defenderId}`,attackerId,defenderId,startedDay:0,status} as WarState);
const withWar=(s:GameState,w:WarState):GameState=>({...s,wars:{...s.wars,[w.id]:w}});

describe('aggressor gate',()=>{
 it('is true only for the attacker of an active war',()=>{
  const s=withWar(ready(),war('TUR','GRC'));
  expect(isAggressor(s,'TUR')).toBe(true);expect(isAggressor(s,'GRC')).toBe(false);expect(isAggressor(ready(),'TUR')).toBe(false);
  expect(isAggressor(withWar(ready(),war('TUR','GRC','victory')),'TUR')).toBe(false);
 });
 it('refuses IMF and World Bank loans to an aggressor but not to a defender',()=>{
  expect(reason(ready(),payload())).toBe('allowed');
  const attacking=withWar(ready(),war('TUR','GRC'));
  expect(reason(attacking,payload())).toBe('borrowerAggressor');
  expect(reason(attacking,payload(),'worldBank')).toBe('borrowerAggressor');
  expect(request(attacking)).toBe(attacking);
  expect(reason(withWar(ready(),war('GRC','TUR')),payload())).toBe('allowed');
  expect(organizationReason('borrowerAggressor')).not.toBe(organizationReason('unknownReason'));
 });
 it('exempts BRICS+ and OIC, which are deliberately not gated',()=>{
  const s=ready(),brics=Object.values(s.world.organizations.byId.bricsPlus.memberships).find(m=>m.status==='active'&&m.tier!=='Observer'&&m.countryId!==s.playerCountryId)!.countryId;
  s.council.influenceByCountry[brics]=50;
  const attacking=withWar(s,war(brics,'GRC'));
  expect(isAggressor(attacking,brics)).toBe(true);
  expect(reason(attacking,payload({borrowerId:brics}),'bricsPlus')).not.toBe('borrowerAggressor');
 });
 it('rechecks at adoption: a war that starts while the vote is open fails the resolution',()=>{
  const proposed=request(ready()),warring=withWar(proposed,war('TUR','GRC'));
  const done=approve(warring,'ORG-1');
  expect(Object.keys(done.world.organizations.financing)).toHaveLength(0);
  expect(done.world.organizations.resolutions['ORG-1'].execution).toMatchObject({status:'failed',reason:'borrowerAggressor'});
 });
 it('withholds a review-day tranche while the borrower attacks, then releases it after the war ends',()=>{
  const adopted=approve(request(ready()),'ORG-1');
  expect(contract(adopted).lifecycle!.tranches.map(t=>t.status)).toEqual(['pending','pending']);
  const calm=at(adopted,11),warring=at(withWar(adopted,war('TUR','GRC')),11);
  expect(contract(calm).lifecycle!.tranches[0].status).toBe('paid');
  expect(contract(warring).lifecycle!.tranches[0].status).toBe('pending');
  expect(contract(warring).status).toBe('paused');
  const peace=withWar(warring,war('TUR','GRC','victory'));
  expect(contract(at(peace,12)).lifecycle!.tranches[0].status).toBe('paid');
 });
});

describe('IMF conditionality floor',()=>{
 it('exempts loans of 1% of GDP or less and scales with GDP above that',()=>{
  const s=ready(),gdp=s.countries.TUR.economy.gdp;
  expect(imfConditionalityFloor(s,'TUR',gdp*.01)).toEqual({minFiscalAdjustmentB:0,requiresFiscalCondition:false,maxInitialTrancheShare:1});
  expect(imfConditionalityFloor(s,'TUR',20)).toEqual({minFiscalAdjustmentB:5,requiresFiscalCondition:true,maxInitialTrancheShare:.5});
  expect(imfConditionalityFloor(s,'TUR',gdp*2).minFiscalAdjustmentB).toBe(gdp*.2);
  expect(imfConditionalityFloor(s,'USA',20).requiresFiscalCondition).toBe(false);
 });
 it('refuses an under-conditioned large IMF loan and accepts one built from the floor',()=>{
  const s=ready(),floor=imfConditionalityFloor(s,'TUR',20);
  const base=payload({principalB:20,initialTrancheB:8});
  expect(reason(s,base)).toBe('imfConditionalityFloor');
  expect(reason(s,{...base,fiscalAdjustmentB:floor.minFiscalAdjustmentB,initialTrancheB:15})).toBe('imfConditionalityFloor');
  expect(reason(s,{...base,fiscalAdjustmentB:floor.minFiscalAdjustmentB-.01})).toBe('imfConditionalityFloor');
  expect(reason(s,{...base,fiscalAdjustmentB:floor.minFiscalAdjustmentB,conditions:[{kind:'subsidyShare',threshold:.3,reviewDay:10}]})).toBe('imfConditionalityFloor');
  expect(reason(s,{...base,fiscalAdjustmentB:floor.minFiscalAdjustmentB})).toBe('allowed');
  expect(reason(s,base,'worldBank')).toBe('allowed');
 });
});

describe('debt sustainability ceiling',()=>{
 it('refuses a loan that pushes projected debt/GDP past 1.5 at every lender, but not a grant',()=>{
  const s=ready(),gdp=s.countries.TUR.economy.gdp;s.countries.TUR.economy.debt=gdp*DEBT_SUSTAINABILITY_CEILING-5;
  expect(projectedDebtToGdp(s,payload())).toBeGreaterThan(DEBT_SUSTAINABILITY_CEILING);
  expect(reason(s,payload())).toBe('debtUnsustainable');
  expect(reason(s,payload(),'worldBank')).toBe('debtUnsustainable');
  s.countries.TUR.economy.debt=gdp*DEBT_SUSTAINABILITY_CEILING-20;
  expect(reason(s,payload())).toBe('allowed');
  s.countries.TUR.economy.debt=gdp*DEBT_SUSTAINABILITY_CEILING-5;
  expect(reason(s,payload({fundingKind:'grant',terms:{apr:0,termDays:90,graceDays:30,denomination:'SDR'}}),'worldBank')).not.toBe('debtUnsustainable');
 });
 it('counts the undisbursed commitments of other active loans',()=>{
  const s=ready(),gdp=s.countries.TUR.economy.gdp;s.countries.TUR.economy.debt=gdp*1.49;
  const adopted=approve(request(s),'ORG-1'),c=contract(adopted);
  expect(c.committedB).toBe(6);
  const second=payload({programId:'other',principalB:5,initialTrancheB:5,conditions:[]});
  const plain=adopted.countries.TUR.economy.debt+second.principalB;
  expect(plain).toBeLessThan(gdp*DEBT_SUSTAINABILITY_CEILING);
  expect(projectedDebtToGdp(adopted,second)).toBeCloseTo((plain+6)/gdp,10);
  expect(reason(adopted,second,'worldBank')).toBe('debtUnsustainable');
 });
});

describe('austerity lasts to maturity',()=>{
 it('keeps the IMF fiscal adjustment after early repayment until the original maturity day',()=>{
  const adopted=approve(request(ready(),payload({fiscalAdjustmentB:.5})),'ORG-1');
  const funded=at(adopted,21);
  expect(organizationFiscalAdjustmentB(funded,'TUR')).toBe(.5);
  const c=contract(funded);
  const repaid=repayOrganizationFinancing(funded,c.id,c.outstandingB,c.lifecycle!.accruedInterestB);
  expect(contract(repaid).status).toBe('closed');
  const maturity=c.lifecycle!.maturityDay;
  expect(organizationFiscalAdjustmentB({...repaid,day:maturity-1},'TUR')).toBe(.5);
  expect(organizationFiscalAdjustmentB({...repaid,day:maturity},'TUR')).toBe(0);
 });
 it('does not count defaulted, cancelled or expired programs',()=>{
  const funded=at(approve(request(ready(),payload({fiscalAdjustmentB:.5})),'ORG-1'),21),c=contract(funded);
  for(const status of ['defaulted','cancelled','expired'] as const){
   const n={...funded,world:{...funded.world,organizations:{...funded.world.organizations,financing:{...funded.world.organizations.financing,[c.id]:{...c,status}}}}};
   expect(organizationFiscalAdjustmentB(n,'TUR')).toBe(0);
  }
 });
});

describe('AI votes weigh risk',()=>{
 it('scores risk in [0,1] from debt, aggression, default and conditionality',()=>{
  const s=ready(),calm=financingRisk(s,payload());
  expect(calm).toBe(0);
  expect(financingRisk(s,payload({conditions:[],initialTrancheB:10}))).toBeCloseTo(.1,10);
  expect(financingRisk(withWar(s,war('TUR','GRC')),payload())).toBeCloseTo(.3,10);
  const indebted=ready();indebted.countries.TUR.economy.debt=indebted.countries.TUR.economy.gdp*DEBT_SUSTAINABILITY_CEILING;
  expect(financingRisk(indebted,payload())).toBeGreaterThan(.39);
  expect(financingRisk(indebted,payload())).toBeLessThanOrEqual(1);
 });
 it('lowers the AI yes rate for a risky request without consuming extra random numbers',()=>{
  const fixture=ready(),open=request(fixture);
  for(const id of open.world.organizations.resolutions['ORG-1'].electorate.eligibleCountryIds)open.council.influenceByCountry[id]=50;
  expect(open.world.organizations.resolutions['ORG-1'].phase).toBe('voting');
  const indebted=structuredClone(open);indebted.countries.TUR.economy.debt=indebted.countries.TUR.economy.gdp*1.4;
  expect(AI_RISK_PENALTY).toBe(.4);
  let calmYes=0,riskyYes=0;
  for(let i=1;i<=60;i++){
   const seed=(Math.imul(i,2654435761)>>>0),a=processOrganizationAiVotes({...open,simulationSeed:seed}),b=processOrganizationAiVotes({...indebted,simulationSeed:seed});
   const ballots=(s:GameState)=>Object.values(s.world.organizations.resolutions['ORG-1'].ballots);
   expect(ballots(a).length).toBe(ballots(b).length);
   expect(a.simulationSeed).toBe(b.simulationSeed);
   calmYes+=ballots(a).filter(x=>x==='yes').length;riskyYes+=ballots(b).filter(x=>x==='yes').length;
  }
  expect(calmYes).toBeGreaterThan(0);
  expect(riskyYes).toBeLessThan(calmYes);
  // One draw per ballot: the seed advanced exactly as many steps as ballots were cast.
  const probe=processOrganizationAiVotes({...open,simulationSeed:12345});
  let seed=12345;for(let i=0;i<Object.keys(probe.world.organizations.resolutions['ORG-1'].ballots).length;i++)seed=nextRandom(seed).seed;
  expect(probe.simulationSeed).toBe(seed);
 });
});

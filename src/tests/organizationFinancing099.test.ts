import {describe,it,expect} from 'vitest';
import {version} from '../../package.json';
import {makeInitialState} from '../data/initialState';
import type {GameState} from '../domain/game';
import type {FinancePayload,OrganizationFinancingRecord,OrganizationId} from '../domain/organizations';
import {applyGameCommand,executeCommandResult} from '../engine/commands';
import {applyOrganizationCommand,proposeResolution,castBallot,repayOrganizationFinancing} from '../engine/systems/organizations/commands';
import {validateOrganizationCommand} from '../engine/systems/organizations/validation';
import {processOrganizations} from '../engine/systems/organizations/tick';
import {financingRecords,organizationDebtB,organizationFiscalAdjustmentB,financingConditionsMet} from '../engine/systems/organizations/financing';
import {initializeFinanceCapital} from '../engine/systems/organizations/financeCapital';
import {fiscalAccounts,simulateEconomy} from '../engine/systems/economy';
import {simulateResources} from '../engine/systems/resources';
import {creditRating,arrears,expansion,processCredit} from '../engine/systems/sovereignCredit';
import {recordEconomicHistory} from '../engine/systems/economicHistory';
import {tickGame} from '../engine/tick';
import {canLoadSave,migrateSave,CURRENT_SCHEMA_VERSION} from '../persistence/migrations';
import {snapshotGame} from '../persistence/snapshot';

const contractId='financing:ORG-1';
const payload=(overrides:Partial<FinancePayload>={}):FinancePayload=>({kind:'finance',borrowerId:'TUR',programId:'stabilization',principalB:10,
 terms:{apr:3.65,termDays:90,graceDays:30,denomination:'SDR'},initialTrancheB:4,
 conditions:[{kind:'taxRate',threshold:30,reviewDay:10},{kind:'taxRate',threshold:35,reviewDay:20}],...overrides});
function freeze<T>(x:T):T {if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;}
function ready():GameState {
 const s=makeInitialState();s.playerCountryId='TUR';s.council.influenceByCountry.TUR=50;s.council.influenceByCountry.USA=50;
 s.countries.TUR.economy.taxRate=40;s.eventCooldownUntil=10000;s.advisorCooldownUntil=10000;
 s.world.organizations.byId.imf.standingByCountry.TUR=50;return recordEconomicHistory(s);
}
function request(s=ready(),p=payload(),organizationId:OrganizationId='imf'):GameState {return proposeResolution(s,organizationId,'financeBoard',p,p.borrowerId);}
function approve(s=request(),id='ORG-1'):GameState {
 const r=s.world.organizations.resolutions[id];expect(r).toBeDefined();
 for(const voter of r.electorate.eligibleCountryIds)s=castBallot(s,id,'yes',voter);
 return processOrganizations({...s,day:r.closesDay});
}
function contract(s:GameState):OrganizationFinancingRecord {return s.world.organizations.financing[contractId] as OrganizationFinancingRecord;}
function at(s:GameState,day:number){return processOrganizations({...s,day});}

describe('0.99.2 funding pools and controlled Schema 18 defaults',()=>{
 it('retains Schema 18 and initializes four independent scenario capital pools and financial boards',()=>{
  const s=makeInitialState();expect(version).toBe('0.99.2');expect(CURRENT_SCHEMA_VERSION).toBe(18);
  for(const [id,funds] of [['imf',250],['worldBank',120],['bricsPlus',50],['oic',30]] as const){
   expect(s.world.organizations.byId[id].availableFundsB).toBe(funds);expect(s.world.organizations.byId[id].committedFundsB).toBe(0);
   expect(s.world.organizations.byId[id].bodies.financeBoard.kind).toBe('board');
  }
  expect(s.world.organizations.byId.imf.bodies.financeBoard.votingRule).toMatchObject({kind:'weighted',basis:'quota'});expect(canLoadSave(s)).toBe(true);
 });
 it('upgrades pre-8.3 Schema 18 optional data once without RNG or input mutation',()=>{
  const s=ready();delete s.world.organizations.financeVersion;
  for(const id of ['imf','worldBank','bricsPlus','oic'] as const){s.world.organizations.byId[id].availableFundsB=0;delete s.world.organizations.byId[id].bodies.financeBoard;}
  const before=structuredClone(s),loaded=migrateSave(freeze(s))!;
  expect(s).toEqual(before);expect(loaded.simulationSeed).toBe(s.simulationSeed);expect(loaded.world.organizations.byId.imf.availableFundsB).toBe(250);
  expect(migrateSave(loaded)).toBe(loaded);expect(initializeFinanceCapital(loaded.world.organizations,loaded.countries)).toBe(loaded.world.organizations);
  const spent=structuredClone(loaded);spent.world.organizations.byId.imf.availableFundsB=0;expect(migrateSave(spent)!.world.organizations.byId.imf.availableFundsB).toBe(0);
 });
 it('preserves authored existing capital and simple pre-8.3 financing records',()=>{
  const s=ready();delete s.world.organizations.financeVersion;s.world.organizations.byId.imf.availableFundsB=12;
  s.world.organizations.financing.old={id:'old',organizationId:'worldBank',borrowerId:'TUR',principalB:2,outstandingB:1,committedB:1,terms:payload().terms,status:'active'};
  const loaded=migrateSave(s)!;expect(loaded.world.organizations.byId.imf.availableFundsB).toBe(12);expect(loaded.world.organizations.financing.old).toEqual(s.world.organizations.financing.old);
 });
});
describe('financing approval and conserved capital reservation',()=>{
 it.each(['imf','worldBank','bricsPlus','oic'] as const)('%s disburses approved capital through its financial board',id=>{
  const borrower=id==='bricsPlus'?'BRA':'TUR',s=ready();s.council.influenceByCountry[borrower]=50;
  const p=payload({borrowerId:borrower}),before=s.countries[borrower].economy,available=s.world.organizations.byId[id].availableFundsB;
  const proposed=request(freeze(s),p,id);expect(proposed.countries[borrower].economy.treasury).toBe(before.treasury);
  const n=approve(proposed),f=contract(n),o=n.world.organizations.byId[id];
  expect(o.availableFundsB).toBe(available-10);expect(o.committedFundsB).toBe(6);expect(f).toMatchObject({status:'active',outstandingB:4,committedB:6});
  expect(n.countries[borrower].economy.treasury).toBe(before.treasury+4);expect(n.countries[borrower].economy.debt).toBe(before.debt+4);
  expect(o.availableFundsB+o.committedFundsB+f.outstandingB).toBe(available);expect(canLoadSave(n)).toBe(true);expect(processOrganizations(n)).toBe(n);
 });
 it('creates grants without borrower debt or interest, while spending real pool capital',()=>{
  const s=ready(),before=s.countries.TUR.economy.debt,n=approve(request(s,payload({fundingKind:'grant',terms:{...payload().terms,apr:0}}),'worldBank'));
  expect(contract(n).outstandingB).toBe(0);expect(n.countries.TUR.economy.debt).toBe(before);
  const completed=at(n,20);expect(contract(completed)).toMatchObject({status:'closed',committedB:0,outstandingB:0});expect(canLoadSave(completed)).toBe(true);
 });
 it('uses identical proposal validation, consent and influence fees for human and AI actors',()=>{
  const s=freeze(ready()),command={type:'organization/proposeResolution',organizationId:'imf',bodyId:'financeBoard',payload:payload()} as const;
  const human=applyGameCommand(s,command),ai=applyOrganizationCommand(s,command,'TUR');expect(human).toEqual(ai);expect(human.council.influenceByCountry.TUR).toBe(45);
  expect(applyOrganizationCommand(s,command,'USA')).toBe(s);
 });
 it.each(['Observer','suspended','missing'] as const)('refuses a borrower with %s membership',kind=>{
  const s=ready(),m=s.world.organizations.byId.imf.memberships.TUR;
  if(kind==='Observer')m.tier='Observer';else if(kind==='suspended')m.status='suspended';else delete s.world.organizations.byId.imf.memberships.TUR;
  expect(request(s)).toBe(s);
 });
 it('forbids political-body funding and funding by nonfinancial organizations',()=>{
  const s=ready();expect(proposeResolution(s,'imf','plenary',payload())).toBe(s);expect(proposeResolution(s,'un','plenary',payload())).toBe(s);
 });
 it('rejects overlarge capital requests and rechecks competing approvals at adoption',()=>{
  const s=ready();expect(request(s,payload({principalB:251}))).toBe(s);
  s.world.organizations.byId.imf.availableFundsB=15;let proposed=request(s);
  proposed.council.influenceByCountry.USA=50;proposed=request(proposed,payload({borrowerId:'USA',programId:'other'}));
  const a=proposed.world.organizations.resolutions['ORG-1'],b=proposed.world.organizations.resolutions['ORG-2'];
  for(const r of [a,b])for(const id of r.electorate.eligibleCountryIds)proposed=castBallot(proposed,r.id,'yes',id);
  const n=at(proposed,6);expect(n.world.organizations.byId.imf.availableFundsB).toBe(5);expect(Object.keys(n.world.organizations.financing)).toHaveLength(1);
  expect(n.world.organizations.resolutions['ORG-2']).toMatchObject({phase:'failed',execution:{reason:'insufficientCapital'}});
 });
 it('revalidates revoked membership and arrears before disbursing an approved resolution',()=>{
  const s=request();s.world.organizations.byId.imf.memberships.TUR.status='suspended';const n=approve(s);
  expect(n.world.organizations.financing).toEqual({});expect(n.world.organizations.byId.imf.availableFundsB).toBe(250);
 });
 it.each([
  {initialTrancheB:11},{initialTrancheB:0},{principalB:NaN},{fiscalAdjustmentB:1e20},
  {conditions:[{kind:'taxRate' as const,threshold:30,reviewDay:5}]},
  {conditions:[{kind:'taxRate' as const,threshold:30,reviewDay:100}]},
  {conditions:[],initialTrancheB:1},{fundingKind:'grant' as const},
 ])('refuses malformed financial terms %#',bad=>{const s=ready();expect(request(s,payload(bad))).toBe(s);});
});
describe('tranches, austerity and interest servicing',()=>{
 it('disburses only due tranches and preserves principal/funds conservation',()=>{
  const s=approve(),treasury=s.countries.TUR.economy.treasury,a=at(s,10),b=at(a,20);
  expect(contract(a)).toMatchObject({outstandingB:7,committedB:3});expect(a.countries.TUR.economy.treasury).toBe(treasury+3);
  expect(contract(b)).toMatchObject({outstandingB:10,committedB:0});expect(b.countries.TUR.economy.treasury).toBe(treasury+6);
  expect(b.world.organizations.byId.imf.committedFundsB).toBe(0);expect(canLoadSave(b)).toBe(true);expect(processOrganizations(b)).toBe(b);
 });
 it('pauses breached conditions once, then resumes after reform without replaying tranches or penalties',()=>{
  const s=approve();s.countries.TUR.economy.taxRate=20;
  const a=at(s,10),b=at(a,11);expect(contract(a).status).toBe('paused');expect(contract(a).outstandingB).toBe(4);
  expect(b.world.organizations.byId.imf.standingByCountry.TUR).toBe(a.world.organizations.byId.imf.standingByCountry.TUR);
  b.countries.TUR.economy.taxRate=40;const c=at(b,12);expect(contract(c)).toMatchObject({status:'active',outstandingB:7});expect(canLoadSave(c)).toBe(true);
 });
 it('checks fiscal and subsidy-share conditions from authoritative economy and budget inputs',()=>{
  const s=approve(),f=contract(s),balance=fiscalAccounts(s.countries.TUR,undefined,organizationDebtB(s,'TUR')).dailyBalance;
  f.lifecycle!.conditions=[{kind:'fiscalBalance',threshold:balance+1,reviewDay:10}];expect(financingConditionsMet(s,f,10)).toBe(false);
  f.lifecycle!.conditions=[{kind:'subsidyShare',threshold:0,reviewDay:10}];expect(financingConditionsMet(s,f,10)).toBe(false);
  s.countries.TUR.ministries.allocations.society=0;expect(financingConditionsMet(s,f,10)).toBe(true);
 });
 it('accrues percentage APR once daily without compounding unpaid interest',()=>{
  const s=approve(),debt=s.countries.TUR.economy.debt,n=at(s,9);
  expect(contract(n).lifecycle!.accruedInterestB).toBeCloseTo(4*.0365/365*3,12);expect(n.countries.TUR.economy.debt-debt).toBeCloseTo(.0012,10);
  expect(processOrganizations(n)).toBe(n);expect(n.simulationSeed).toBe(s.simulationSeed);
 });
 it('excludes organization principal AND accrued interest from generic economy service',()=>{
  const s=at(approve(),7),c=s.countries.TUR,liability=organizationDebtB(s,'TUR'),resources=simulateResources(c),ordinary=simulateEconomy(c,resources),separated=simulateEconomy(c,resources,undefined,liability);
  const rate=.03+.05*Math.min(2,c.economy.debt/Math.max(1,c.economy.gdp));
  expect(ordinary.debtService-separated.debtService).toBeCloseTo(liability*rate/365,12);
  const allOrganization={...c,economy:{...c.economy,debt:liability}};expect(simulateEconomy(allOrganization,resources,undefined,liability).debtService).toBe(0);
 });
 it('applies real fiscal adjustment and proportional domestic political costs to IMF borrowers',()=>{
  const base=ready(),gdp=base.countries.TUR.economy.gdp,s=approve(request(base,payload({fiscalAdjustmentB:gdp*.05}))),c=s.countries.TUR;
  const n=at(s,7);expect(n.countries.TUR.politics.approval).toBeCloseTo(c.politics.approval-.1);expect(n.countries.TUR.politics.stability).toBeCloseTo(c.politics.stability-.05);
  expect(organizationFiscalAdjustmentB(s,'TUR')).toBe(gdp*.05);
  expect(fiscalAccounts(c,undefined,0,gdp*.05).publicSpending).toBeCloseTo(fiscalAccounts(c).publicSpending-gdp*.05/365);
 });
 it('improves measured solvency with liquidity while retaining the new loan liability',()=>{
  const s=ready();s.countries.TUR.economy.treasury=-1;const before=creditRating(s,'TUR').score,n=approve(request(s));
  expect(n.countries.TUR.economy.treasury).toBe(3);expect(n.countries.TUR.economy.debt).toBe(s.countries.TUR.economy.debt+4);expect(creditRating(n,'TUR').score).toBeGreaterThan(before);
 });
});
describe('repayment, cancellation, maturity and default enforcement',()=>{
 it('repays principal and accrued interest with a conserved treasury/pool transfer',()=>{
  const s=at(approve(),7),f=contract(s),interest=f.lifecycle!.accruedInterestB,n=repayOrganizationFinancing(freeze(s),f.id,2,interest),o=n.world.organizations.byId.imf;
  expect(n.countries.TUR.economy.treasury).toBeCloseTo(s.countries.TUR.economy.treasury-2-interest);
  expect(n.countries.TUR.economy.debt).toBeCloseTo(s.countries.TUR.economy.debt-2-interest);
  expect(o.availableFundsB).toBeCloseTo(s.world.organizations.byId.imf.availableFundsB+2+interest);
  expect(contract(n).outstandingB).toBe(2);expect(contract(n).lifecycle!.accruedInterestB).toBe(0);expect(canLoadSave(n)).toBe(true);
 });
 it.each([{principalB:5,interestB:0},{principalB:-1,interestB:0},{principalB:0,interestB:1},{principalB:NaN,interestB:0},{principalB:0,interestB:0}])('rejects invalid voluntary repayment %#',amount=>{
  const s=approve();expect(repayOrganizationFinancing(s,contractId,amount.principalB,amount.interestB)).toBe(s);
 });
 it('enforces borrower-only payments, spendable treasury and command receipt deduplication',()=>{
  const s=approve(),command={type:'organization/repayOrganizationFinancing',financingId:contractId,principalB:1,interestB:0,commandId:'repay-once'} as const;
  expect(applyOrganizationCommand(s,command,'USA')).toBe(s);const n=applyGameCommand(s,command);expect(contract(n).outstandingB).toBe(3);expect(executeCommandResult(n,command).status).toBe('duplicate');
  n.countries.TUR.economy.treasury=0;expect(repayOrganizationFinancing(n,contractId,1,0)).toBe(n);
 });
 it('returns unused commitments on cancellation but continues interest on disbursed debt',()=>{
  const s=approve(),command={type:'organization/cancelOrganizationFinancing',financingId:contractId} as const,n=applyGameCommand(s,command);
  expect(contract(n)).toMatchObject({status:'cancelled',committedB:0,outstandingB:4});expect(n.world.organizations.byId.imf.availableFundsB).toBe(246);expect(n.world.organizations.byId.imf.committedFundsB).toBe(0);
  expect(applyGameCommand(n,command)).toBe(n);const a=at(n,10);expect(contract(a).outstandingB).toBe(4);expect(contract(a).lifecycle!.accruedInterestB).toBeGreaterThan(0);expect(canLoadSave(a)).toBe(true);
 });
 it('releases paused unused commitments at maturity and closes fully serviced debt',()=>{
  const s=approve();s.countries.TUR.economy.taxRate=0;s.countries.TUR.economy.treasury=100;
  const n=at(s,96);expect(contract(n)).toMatchObject({status:'expired',committedB:0,outstandingB:0});expect(n.world.organizations.byId.imf.committedFundsB).toBe(0);
  expect(n.world.organizations.byId.imf.availableFundsB).toBeGreaterThan(250);expect(canLoadSave(n)).toBe(true);
 });
 it('flags unpaid scheduled debt service, releases commitments and applies default penalties once',()=>{
  const s=approve();s.countries.TUR.economy.treasury=0;s.countries.TUR.economy.taxRate=0;const n=at(s,36),f=contract(n);
  expect(f).toMatchObject({status:'defaulted',committedB:0,lifecycle:{defaultRecorded:true}});expect(f.lifecycle!.arrearsB).toBeGreaterThan(0);
  expect(n.countries.TUR.economy.treasury).toBe(0);expect(n.countries.TUR.diplomacy.reputation).toBe(s.countries.TUR.diplomacy.reputation-5);
  expect(at(n,37).countries.TUR.diplomacy.reputation).toBe(n.countries.TUR.diplomacy.reputation);expect(canLoadSave(n)).toBe(true);
  for(const id of ['imf','worldBank','oic'] as const)expect(request(n,payload({programId:'another',conditions:[],initialTrancheB:10}),id)).toBe(n);
 });
 it('allows repayment to cure organization arrears without restoring spent commitments or reputation',()=>{
  const s=approve();s.countries.TUR.economy.treasury=0;s.countries.TUR.economy.taxRate=0;const n=at(s,36);n.countries.TUR.economy.treasury=100;
  const f=contract(n),paid=repayOrganizationFinancing(n,f.id,f.outstandingB,f.lifecycle!.accruedInterestB);expect(contract(paid).status).toBe('closed');
  expect(paid.countries.TUR.diplomacy.reputation).toBe(n.countries.TUR.diplomacy.reputation);expect(request(paid,payload({programId:'second',conditions:[],initialTrancheB:10}))).not.toBe(paid);
 });
 it('detects sovereign-credit arrears and blocks new loans and grants across financial institutions',()=>{
  const s=approve();s.world.expansion=structuredClone(expansion(s));s.world.expansion.loans.push({id:'arrear',lenderId:'USA',borrowerId:'TUR',principal:1,apr:0,startedDay:1,dueDay:2,outstanding:1,status:'arrears',interestBooked:true});
  const n=at(s,7);expect(contract(n).status).toBe('defaulted');expect(arrears(n,'TUR')).toBe(1);
  const command={type:'organization/proposeResolution',organizationId:'worldBank',bodyId:'financeBoard',payload:payload({fundingKind:'grant',terms:{...payload().terms,apr:0},conditions:[],initialTrancheB:10})} as const;
  expect(validateOrganizationCommand(n,command).reason).toBe('financingDefault');
 });
});
describe('financing persistence, purity and daily simulation',()=>{
 it('roundtrips active, paused, cancelled and defaulted contracts and rejects corrupted lifecycle accounting',()=>{
  const s=at(approve(),10);expect(migrateSave(JSON.parse(JSON.stringify(snapshotGame(s))))).toEqual(s);
  for(const corrupt of [
   (f:OrganizationFinancingRecord)=>{f.lifecycle!.accruedInterestB=NaN;},
   (f:OrganizationFinancingRecord)=>{f.committedB=99;},
   (f:OrganizationFinancingRecord)=>{f.lifecycle!.disbursedB=0;},
   (f:OrganizationFinancingRecord)=>{f.lifecycle!.sourceResolutionId='missing';},
   (f:OrganizationFinancingRecord)=>{f.lifecycle!.lastProcessedDay=10000;},
  ]){const bad=structuredClone(s);corrupt(contract(bad));expect(canLoadSave(bad)).toBe(false);}
 });
 it('replays pure daily organization processing identically after save/resume',()=>{
  const s=approve(),loaded=migrateSave(snapshotGame(s))!;freeze(s);expect(at(s,20)).toEqual(at(loaded,20));expect(canLoadSave(at(s,20))).toBe(true);
 });
 it('integrates a finance adoption and accrual through full tickGame without duplicate debt service',()=>{
  let s=request();for(const id of s.world.organizations.resolutions['ORG-1'].electorate.eligibleCountryIds)s=castBallot(s,'ORG-1','yes',id);
  s=recordEconomicHistory({...s,day:5});const loaded=migrateSave(snapshotGame(s))!;const a=tickGame(freeze(s)),b=tickGame(loaded);expect(a).toEqual(b);
  expect(financingRecords(a)).toHaveLength(1);expect(contract(a).outstandingB).toBe(4);expect(canLoadSave(a)).toBe(true);
  const n=tickGame({...a,activeEvent:null,activeAdvisor:null});expect(contract(n).lifecycle!.accruedInterestB).toBeCloseTo(.0004,10);expect(canLoadSave(n)).toBe(true);
 });
});

describe('financial settlement ordering and extended invariants',()=>{
 it('detects sovereign arrears created by same-day credit settlement before releasing another tranche',()=>{
  const s=approve(request(ready(),payload({conditions:[{kind:'taxRate',threshold:0,reviewDay:7}]})));
  s.world.expansion=structuredClone(expansion(s));
  s.world.expansion.loans.push({id:'matures-today',lenderId:'USA',borrowerId:'TUR',principal:1e6,apr:0,startedDay:1,dueDay:7,outstanding:1e6,status:'active',interestBooked:true});
  const n=tickGame(s);expect(n.day).toBe(7);expect(arrears(n,'TUR')).toBeGreaterThan(0);expect(contract(n)).toMatchObject({status:'defaulted',outstandingB:4,committedB:0});
  expect(n.world.organizations.byId.imf.availableFundsB).toBe(246);expect(canLoadSave(n)).toBe(true);
 });
 it.each(['active','paused','cancelled','defaulted'] as const)('roundtrips a %s contract without replaying cash or penalties',status=>{
  let s=approve();
  if(status==='paused'){s.countries.TUR.economy.taxRate=0;s=at(s,10);}
  if(status==='cancelled')s=applyGameCommand(s,{type:'organization/cancelOrganizationFinancing',financingId:contractId});
  if(status==='defaulted'){s.countries.TUR.economy.taxRate=0;s.countries.TUR.economy.treasury=0;s=at(s,36);}
  expect(contract(s).status).toBe(status);const loaded=migrateSave(JSON.parse(JSON.stringify(snapshotGame(s))))!;
  expect(loaded).toEqual(s);expect(processOrganizations(loaded)).toBe(loaded);expect(canLoadSave(at(loaded,s.day+1))).toBe(true);
 });
 it('services principal at maturity and defaults only the unpaid balance without negative payment treasury',()=>{
  const s=approve(request(ready(),payload({conditions:[],initialTrancheB:10,terms:{apr:0,termDays:2,graceDays:0,denomination:'USD'}})));
  s.countries.TUR.economy.treasury=3;const n=at(s,8);expect(contract(n)).toMatchObject({status:'defaulted',outstandingB:7,lifecycle:{arrearsB:7}});
  expect(n.countries.TUR.economy.treasury).toBe(0);expect(n.world.organizations.byId.imf.availableFundsB).toBe(243);expect(canLoadSave(n)).toBe(true);
 });
 it('releases an expired grant commitment without minting debt or recovering already disbursed grants',()=>{
  const s=approve(request(ready(),payload({fundingKind:'grant',terms:{...payload().terms,apr:0}}),'worldBank'));s.countries.TUR.economy.taxRate=0;
  const n=at(s,96);expect(contract(n)).toMatchObject({status:'expired',outstandingB:0,committedB:0});expect(n.world.organizations.byId.worldBank.availableFundsB).toBe(116);expect(canLoadSave(n)).toBe(true);
 });
 it('rejects corrupted interest terms and funds that no longer cover tracked commitments',()=>{
  const s=approve(),bad=structuredClone(s);contract(bad).terms.apr=99;expect(canLoadSave(bad)).toBe(false);
  const missing=structuredClone(s);missing.world.organizations.byId.imf.committedFundsB=0;expect(canLoadSave(missing)).toBe(false);
 });
 it('keeps 1095 financing days finite and capital-conserving across large, small and commodity economies',()=>{
  let s=ready();const ids=['USA','TUR','BRA','SAU','GRC'];
  for(const [index,borrowerId] of ids.entries()){
   s.council.influenceByCountry[borrowerId]=50;
   const p=payload({borrowerId,programId:`long-${index}`,principalB:1,initialTrancheB:1,conditions:[],terms:{apr:3,termDays:365,graceDays:30,denomination:'USD'}});
   s=request(s,p);const id=`ORG-${index+1}`;for(const voter of s.world.organizations.resolutions[id].electorate.eligibleCountryIds)s=castBallot(s,id,'yes',voter);
  }
  s=at(s,6);const initialCash=ids.reduce((sum,id)=>sum+s.countries[id].economy.treasury,0)+s.world.organizations.byId.imf.availableFundsB+s.world.organizations.byId.imf.committedFundsB;
  for(let day=7;day<=1101;day++)s=at(s,day);
  const finalCash=ids.reduce((sum,id)=>sum+s.countries[id].economy.treasury,0)+s.world.organizations.byId.imf.availableFundsB+s.world.organizations.byId.imf.committedFundsB;
  expect(finalCash).toBeCloseTo(initialCash,7);expect(financingRecords(s).every(f=>f.status==='closed')).toBe(true);expect(canLoadSave(s)).toBe(true);
  for(const id of ids)for(const value of Object.values(s.countries[id].economy))expect(Number.isFinite(value)).toBe(true);
 });
});

describe('financial authority and liquidity relief regressions',()=>{
 it('does not execute a finance resolution approved by a political body',()=>{
  const s=request();s.world.organizations.resolutions['ORG-1'].bodyId='plenary';const n=approve(s);
  expect(n.world.organizations.financing).toEqual({});expect(n.world.organizations.resolutions['ORG-1']).toMatchObject({phase:'failed',execution:{reason:'financeAuthority'}});
 });
 it('refuses an IMF board charter that substitutes a country-count vote for quota approval',()=>{
  const s=ready();s.world.organizations.byId.imf.bodies.financeBoard.votingRule={kind:'consensus',objectionsBlock:true,deadlinePolicy:'expire'};expect(request(s)).toBe(s);
 });
 it('uses the initial liquidity infusion to settle a maturing sovereign claim without free debt forgiveness',()=>{
  const s=ready();s.countries.TUR.economy.treasury=0;s.world.expansion=structuredClone(expansion(s));
  s.world.expansion.loans.push({id:'due-on-approval',lenderId:'USA',borrowerId:'TUR',principal:3,apr:0,startedDay:1,dueDay:6,outstanding:3,status:'active',interestBooked:true});
  s.countries.TUR.economy.debt+=3;const lender=s.countries.USA.economy.treasury,debt=s.countries.TUR.economy.debt;
  const n=processCredit(approve(request(s)),false);expect(arrears(n,'TUR')).toBe(0);expect(expansion(n).loans[0].status).toBe('paid');
  expect(n.countries.USA.economy.treasury).toBe(lender+3);expect(n.countries.TUR.economy.treasury).toBe(1);expect(n.countries.TUR.economy.debt).toBe(debt+4-3);
  expect(contract(n).outstandingB).toBe(4);expect(canLoadSave(n)).toBe(true);
 });
 it('rejects a finance-version marker with a missing required financial board',()=>{
  const s=ready();delete s.world.organizations.byId.imf.bodies.financeBoard;expect(canLoadSave(s)).toBe(false);
 });
});

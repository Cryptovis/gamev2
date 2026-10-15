import {resolveEvent} from '../engine/systems/events';
import {dismissVictory,pendingVictory} from '../engine/systems/victory';
import {describe,it,expect} from 'vitest';
import {version} from '../../package.json';
import {makeInitialState} from '../data/initialState';
import type {GameState} from '../domain/game';
import type {OrganizationId,EconomicResolutionPayload,OrganizationEconomicEffect,TradeRemedyEffect,CurrencySwapEffect} from '../domain/organizations';
import {applyOrganizationCommand,proposeResolution,castBallot} from '../engine/systems/organizations/commands';
import {applyGameCommand,executeCommandResult} from '../engine/commands';
import {validateOrganizationCommand} from '../engine/systems/organizations/validation';
import {processOrganizations} from '../engine/systems/organizations/tick';
import {constrainedOilOutput,processQuotaStanding} from '../engine/systems/organizations/quotas';
import {integrationBenefits} from '../engine/systems/organizations/marketIntegration';
import {tariffPreview} from '../engine/systems/organizations/tradeRemedies';
import {tradePaymentPreview,settleTradePayment} from '../engine/systems/organizations/tradeSettlement';
import {organizationSanctionsBlock,canTransferMilitaryHardware} from '../engine/systems/organizations/sanctions';
import {swapSettlementPreview} from '../engine/systems/organizations/currencySwaps';
import {initializeOrganizationTrade} from '../engine/systems/organizations/tradeInitialization';
import {commodityExchange,commodityOrderPreview,placeCommodityOrder,worldSupply,fundamentalPrice,processCommodityExchange} from '../engine/systems/commodityExchange';
import {simulateResources} from '../engine/systems/resources';
import {tickCountry,tickGame} from '../engine/tick';
import {getTradeQuote,makeBilateralImportDeal,processTradeDeals} from '../engine/systems/trade';
import {industrialQuote,settleIndustrialTrade,industrialOrderError} from '../engine/systems/industrialMarket';
import {postListing,buyListing,listingPurchasePreview,exchangeAccess,living} from '../engine/systems/livingEconomy';
import {creditOfferStatus,postCredit,acceptCredit,applyForCredit,creditApplicationPreview} from '../engine/systems/sovereignCredit';
import {sendResourceGift,sendTreasuryGift} from '../engine/systems/diplomacy';
import {recordEconomicHistory} from '../engine/systems/economicHistory';
import {canLoadSave,migrateSave,CURRENT_SCHEMA_VERSION} from '../persistence/migrations';
import {snapshotGame} from '../persistence/snapshot';

function freeze<T>(x:T):T {if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;}
function ready(actor='USA'):GameState {
 const s=makeInitialState();s.playerCountryId=actor;s.eventCooldownUntil=10000;s.advisorCooldownUntil=10000;
 for(const id of Object.keys(s.countries))s.council.influenceByCountry[id]=50;
 s.world.commodities=commodityExchange(s);return recordEconomicHistory(s);
}
function route(s:GameState,a:string,b:string){
 for(const [from,to] of [[a,b],[b,a]])s.countries[from].diplomacy.relations[to]={score:90,status:'ally',sanctions:false,treaties:['trade','alliance']};
}
function approve(s:GameState,id:string):GameState {
 const r=s.world.organizations.resolutions[id];expect(r).toBeDefined();
 for(const voter of r.electorate.eligibleCountryIds)s=castBallot(s,id,'yes',voter);
 return processOrganizations({...s,day:r.effectiveDay});
}
function adopt(s:GameState,org:OrganizationId,p:EconomicResolutionPayload,actor=s.playerCountryId){
 const id=`ORG-${s.world.organizations.nextSequence}`;return approve(proposeResolution(s,org,'plenary',p,actor),id);
}
const quota:EconomicResolutionPayload={kind:'oilQuota',quotas:{SAU:0,RUS:0},durationDays:30};
const remedy:EconomicResolutionPayload={kind:'tradeRemedy',disputeId:'dumping-1',remedy:{targetId:'CHN',commodity:'oil',tariffRate:.5,maximumValueB:2,durationDays:30}};
const integration:EconomicResolutionPayload={kind:'marketIntegration',agreement:{countryIds:['DEU','FRA'],tariffReduction:.8,freeMovement:true,durationDays:30}};
const swap:EconomicResolutionPayload={kind:'localCurrencySwap',agreement:{countryA:'BRA',countryB:'CHN',limitB:1,durationDays:30}};
function firstEffect(s:GameState):OrganizationEconomicEffect {return Object.values(s.world.organizations.effects).find(e=>!!e&&typeof e==='object'&&'kind' in e&&String(e.kind).startsWith('organization')) as OrganizationEconomicEffect;}
function sanctioned(scope:'trade'|'arms'|'finance',exemptions:Array<{scope:'food'|'medicine'|'humanitarian';countryIds:string[]}>=[]):GameState {
 let s=ready('USA');route(s,'USA','RUS');
 s=proposeResolution(s,'un','securityCouncil',{kind:'sanctions',targetId:'RUS',measures:[{scope,intensity:1,enforcement:1}],exemptions,durationDays:30});
 return approve(s,'ORG-1');
}
function economicCommand(org:OrganizationId,p:EconomicResolutionPayload){return {type:'organization/proposeResolution',organizationId:org,bodyId:'plenary',payload:p} as const;}

describe('0.99.3 economic proposal authority and shared costs',()=>{
 it('retains Schema 18, activates the scenario WTO once, and preserves save compatibility',()=>{
  const s=ready();expect(version).toBe('1.0.0');expect(CURRENT_SCHEMA_VERSION).toBe(18);expect(s.world.organizations.byId.wto.memberships.USA.tier).toBe('Member');
  expect(initializeOrganizationTrade(s.world.organizations)).toBe(s.world.organizations);expect(canLoadSave(s)).toBe(true);
  const old=structuredClone(s);delete old.world.organizations.tradeVersion;const wto=old.world.organizations.byId.wto;
  for(const m of Object.values(wto.memberships))m.tier='Observer';wto.bodies.plenary.memberIds=[];
  const n=migrateSave(freeze(old))!;expect(n.world.organizations.byId.wto.bodies.plenary.memberIds.length).toBeGreaterThan(100);expect(migrateSave(n)).toBe(n);expect(n.simulationSeed).toBe(old.simulationSeed);
 });
 it.each([['opecPlus','SAU',quota],['wto','TUR',remedy],['eu','DEU',integration],['bricsPlus','BRA',swap]] as const)('%s charges the same five-influence fee for player and AI', (org,actor,p)=>{
  const s=ready(actor),command=economicCommand(org,p),human=applyGameCommand(freeze(s),command),ai=applyOrganizationCommand(s,command,actor);
  expect(human).toEqual(ai);expect(human.council.influenceByCountry[actor]).toBe(45);expect(human.simulationSeed).toBe(s.simulationSeed);
 });
 it.each([['nato','USA',quota],['un','USA',remedy],['wto','USA',integration],['oic','SAU',swap]] as const)('refuses %s executing an unrelated economic charter',(org,actor,p)=>{
  const s=ready(actor);expect(proposeResolution(s,org,'plenary',p)).toBe(s);
 });
 it('rejects nonmember participants, empty quotas and invalid commodities without paying influence',()=>{
  const s=ready('SAU');expect(proposeResolution(s,'opecPlus','plenary',{kind:'oilQuota',quotas:{USA:1},durationDays:30})).toBe(s);
  expect(proposeResolution(s,'opecPlus','plenary',{kind:'oilQuota',quotas:{},durationDays:30})).toBe(s);
  expect(proposeResolution(s,'wto','plenary',{...remedy,remedy:{...remedy.remedy,commodity:'imaginary'}})).toBe(s);
 });
 it('deduplicates unordered bilateral pairs and regional participants and global quota topics',()=>{
  const s=ready('BRA'),n=proposeResolution(s,'bricsPlus','plenary',swap);expect(proposeResolution(n,'bricsPlus','plenary',{...swap,agreement:{...swap.agreement,countryA:'CHN',countryB:'BRA'}})).toBe(n);
  const e=ready('DEU'),m=proposeResolution(e,'eu','plenary',integration);expect(proposeResolution(m,'eu','plenary',{...integration,agreement:{...integration.agreement,countryIds:['FRA','DEU']}})).toBe(m);
  const q=proposeResolution(ready('SAU'),'opecPlus','plenary',quota);expect(proposeResolution(q,'opecPlus','plenary',{kind:'oilQuota',quotas:{SAU:1},durationDays:10})).toBe(q);
 });
 it.each([NaN,-1,Number.MAX_SAFE_INTEGER])('rejects invalid economic duration %s',durationDays=>{
  const s=ready('SAU');expect(proposeResolution(s,'opecPlus','plenary',{...quota,durationDays})).toBe(s);
 });
 it('revalidates participant membership on adoption',()=>{
  let s=proposeResolution(ready('DEU'),'eu','plenary',integration);s.world.organizations.byId.eu.memberships.FRA.status='suspended';s=approve(s,'ORG-1');
  expect(s.world.organizations.resolutions['ORG-1']).toMatchObject({phase:'failed',execution:{reason:'participantMembership'}});expect(s.world.organizations.effects).toEqual({});
 });
});
describe('OPEC physical oil and market fundamentals',()=>{
 it('constrains extraction without destroying capacity and increases the same-seed crude fundamental and momentum',()=>{
  const s=ready('SAU'),base=worldSupply(s),n=adopt(freeze(s),'opecPlus',quota),supply=worldSupply(n);
  expect(constrainedOilOutput(n,'SAU')).toBe(0);expect(n.countries.SAU.resourceProduction.oil).toBe(s.countries.SAU.resourceProduction.oil);expect(supply.worldOil).toBeLessThan(base.worldOil);
  expect(fundamentalPrice(s.world.commodities!,supply,'oil')).toBeGreaterThan(fundamentalPrice(s.world.commodities!,base,'oil'));
  const unchanged={...n,world:{...n.world,organizations:{...n.world.organizations,effects:{}}}};
  const tight=processCommodityExchange(n),open=processCommodityExchange(unchanged);expect(tight.world.commodities!.markets.oil.price).toBeGreaterThan(open.world.commodities!.markets.oil.price);
 });
 it('uses the quota in actual national stock production and restores output at the exclusive expiry boundary',()=>{
  const s=adopt(ready('SAU'),'opecPlus',quota),c=s.countries.SAU;
  const flow=simulateResources(c,1,undefined,1,constrainedOilOutput(s,'SAU'));expect(flow.production.oil).toBe(0);
  const n=tickCountry(c,1,false,undefined,undefined,0,0,constrainedOilOutput(s,'SAU'));expect(n.resources.oil).toBeLessThan(tickCountry(c).resources.oil);
  const e=firstEffect(s),expired=processOrganizations({...s,day:e.endsDay});expect(constrainedOilOutput(expired,'SAU')).toBe(c.resourceProduction.oil);expect(firstEffect(expired).status).toBe('expired');
 });
 it('allows bounded overproduction under a shared command and deducts standing only once per day',()=>{
  let s=adopt(ready('SAU'),'opecPlus',quota);s.world.organizations.byId.opecPlus.standingByCountry.SAU=50;
  const deviation=s.countries.SAU.resourceProduction.oil*.1,command={type:'organization/setOilQuotaDeviation',deviation} as const;
  s=applyGameCommand(s,command);expect(constrainedOilOutput(s,'SAU')).toBe(deviation);
  const n=processQuotaStanding({...s,day:7});expect(n.world.organizations.byId.opecPlus.standingByCountry.SAU).toBeLessThan(50);expect(processQuotaStanding(n)).toBe(n);
  expect(applyGameCommand(n,{...command,deviation:deviation+1})).toBe(n);expect(applyOrganizationCommand(n,command,'USA')).toBe(n);
 });
});
describe('WTO tariffs and actual importer revenues',()=>{
 it('quotes targeted imports with a surcharge and lowers demand; unrelated routes and goods keep their prices',()=>{
  const s=ready('TUR');route(s,'CHN','TUR');s.countries.CHN.resources.oil=1000;const before=getTradeQuote(s,'CHN','oil',undefined,'TUR'),n=adopt(s,'wto',remedy),after=getTradeQuote(n,'CHN','oil',undefined,'TUR');
  expect(after.price).toBeGreaterThan(before.price);expect(after.quantity).toBeLessThan(before.quantity);expect(after.tariffB).toBeGreaterThan(0);
  expect(getTradeQuote(n,'CHN','food',undefined,'TUR').price).toBe(getTradeQuote(s,'CHN','food',undefined,'TUR').price);
  expect(tariffPreview(n,'USA','TUR','oil',1).tariffB).toBe(0);
 });
 it('collects capped customs revenue and conserves treasury during a real contract shipment',()=>{
  let s=ready('TUR');route(s,'CHN','TUR');s.countries.CHN.resources.oil=1000;s=adopt(s,'wto',remedy);
  s.tradeDeals.test={id:'test',buyerId:'TUR',sellerId:'CHN',resource:'oil',quantityPerDay:1,pricePerUnit:1,active:true};
  const before=s.countries.CHN.economy.treasury+s.countries.TUR.economy.treasury,n=processTradeDeals(s);
  expect(n.countries.TUR.economy.tariffRevenueB).toBe(.5);expect((firstEffect(n) as TradeRemedyEffect).collectedB).toBe(.5);
  expect(n.countries.CHN.economy.treasury+n.countries.TUR.economy.treasury).toBeCloseTo(before,10);expect(canLoadSave(n)).toBe(true);
  const capped=settleTradePayment(n,'CHN','TUR','oil',10);expect((firstEffect(capped) as TradeRemedyEffect).collectedB).toBe(2);expect(firstEffect(capped).status).toBe('expired');
  expect(tariffPreview(capped,'CHN','TUR','oil',10).tariffB).toBe(0);
 });
 it('applies tariffs to industrial quotes and listing settlements using the same preview',()=>{
  let s=ready('TUR');route(s,'CHN','TUR');s.industrialEconomy.CHN.stock.water=1000;
  s=adopt(s,'wto',{...remedy,remedy:{...remedy.remedy,commodity:'water'}});
  const q=industrialQuote(s,'CHN','TUR','water',1);expect(q.tariffB).toBeGreaterThan(0);expect(q.cost).toBeCloseTo(q.customsPrice*1.5);
  const n=settleIndustrialTrade(s,'CHN','TUR','water',1);expect(n.countries.TUR.economy.tariffRevenueB).toBeCloseTo(q.tariffB);
  const listed=postListing(s,'water',1,.1,'CHN'),id=living(listed).listings[0].id,bought=buyListing(listed,id,1,'TUR');expect(bought.countries.TUR.economy.tariffRevenueB).toBeCloseTo(.05);expect(canLoadSave(bought)).toBe(true);
 });
});
describe('regional market integration and bounded local currency settlement',()=>{
 it.each([['eu','DEU','FRA'],['asean','IDN','MYS']] as const)('%s lowers bilateral friction and increases feasible volume without granting free GDP',(org,a,b)=>{
  let s=ready(a);route(s,a,b);s.countries[b].resources.food=1000;
  const p:EconomicResolutionPayload={kind:'marketIntegration',agreement:{countryIds:[a,b],tariffReduction:.8,freeMovement:true,durationDays:30}},before=getTradeQuote(s,b,'food',undefined,a),n=adopt(s,org,p),after=getTradeQuote(n,b,'food',undefined,a);
  expect(after.price).toBeLessThan(before.price);expect(after.quantity).toBeGreaterThanOrEqual(before.quantity);expect(n.countries[a].economy.gdp).toBe(s.countries[a].economy.gdp);
  expect(integrationBenefits(n,a,b).frictionMultiplier).toBeCloseTo(.96);expect(integrationBenefits(n,a,b).volumeMultiplier).toBeCloseTo(1.16);expect(integrationBenefits(n,a,'USA')).toEqual({frictionMultiplier:1,volumeMultiplier:1});
 });
 it('requires both swap participants to accept and blocks self/unbounded swaps',()=>{
  let s=proposeResolution(ready('BRA'),'bricsPlus','plenary',swap),r=s.world.organizations.resolutions['ORG-1'];
  for(const id of r.electorate.eligibleCountryIds)s=castBallot(s,r.id,id==='CHN'?'abstain':'yes',id);
  s=processOrganizations({...s,day:r.closesDay});expect(s.world.organizations.resolutions[r.id].execution.reason).toBe('participantConsent');
  const n=ready('BRA');expect(proposeResolution(n,'bricsPlus','plenary',{...swap,agreement:{...swap.agreement,countryB:'BRA'}})).toBe(n);
  expect(proposeResolution(n,'bricsPlus','plenary',{...swap,agreement:{...swap.agreement,limitB:1e9}})).toBe(n);
 });
 it('settles real bilateral purchases with zero USD, consumes the limit and keeps local clearing balances net zero',()=>{
  let s=ready('BRA');route(s,'BRA','CHN');s.countries.BRA.economy.foreignReservesB=0;s.countries.CHN.economy.foreignReservesB=5;s=adopt(s,'bricsPlus',swap);
  const cash=s.countries.BRA.economy.treasury+s.countries.CHN.economy.treasury,n=settleTradePayment(freeze(s),'CHN','BRA','oil',.6),f=firstEffect(n) as CurrencySwapEffect;
  expect(f.usedB).toBe(.6);expect(n.countries.BRA.economy.foreignReservesB).toBe(0);expect(n.countries.CHN.economy.foreignReservesB).toBe(5);
  expect(Object.values(f.localBalanceByCountry).reduce((a,b)=>a+b,0)).toBe(0);expect(n.countries.BRA.economy.treasury+n.countries.CHN.economy.treasury).toBeCloseTo(cash);
  expect(swapSettlementPreview(n,'CHN','BRA',.5).allowed).toBe(false);expect(settleTradePayment(n,'CHN','BRA','oil',.5)).toBe(n);
  expect(canLoadSave(n)).toBe(true);expect(migrateSave(snapshotGame(n))).toEqual(n);
 });
 it('uses USD only for the excess beyond a swap and never creates a budget subsidy',()=>{
  let s=ready('BRA');route(s,'BRA','CHN');s=adopt(s,'bricsPlus',swap);s.countries.BRA.economy.foreignReservesB=.5;s.countries.CHN.economy.foreignReservesB=5;
  const n=settleTradePayment(s,'CHN','BRA','oil',1.2);expect((firstEffect(n) as CurrencySwapEffect).usedB).toBe(1);expect(n.countries.BRA.economy.foreignReservesB).toBeCloseTo(.3);expect(n.countries.CHN.economy.foreignReservesB).toBeCloseTo(5.2);
  const broke=structuredClone(s);broke.countries.BRA.economy.treasury=0;expect(settleTradePayment(broke,'CHN','BRA','oil',.5)).toBe(broke);
 });
 it('does not let a swap escape a subsequently enacted financial restriction',()=>{
  let s=adopt(ready('BRA'),'bricsPlus',swap);s.playerCountryId='USA';s=proposeResolution(s,'un','securityCouncil',{kind:'sanctions',targetId:'BRA',measures:[{scope:'finance',intensity:1,enforcement:1}],durationDays:30,exemptions:[]});
  s=approve(s,'ORG-2');s.countries.BRA.economy.foreignReservesB=0;expect(swapSettlementPreview(s,'CHN','BRA',.5).allowed).toBe(false);
 });
});
describe('sanctions enforce real trade, military and credit boundaries',()=>{
 it.each(['armor','fighters'] as const)('blocks %s stock transfers and preserves inventories',equipment=>{
  const base=ready('USA');route(base,'USA','RUS');base.production.USA.stockpile[equipment]=100;
  const command={type:'organization/transferMilitaryHardware',recipientId:'RUS',equipment,quantity:1,commandId:'hardware'} as const,n=applyGameCommand(base,command);
  expect(n.production.USA.stockpile[equipment]).toBe(99);expect(n.production.RUS.stockpile[equipment]).toBe(base.production.RUS.stockpile[equipment]+1);expect(executeCommandResult(n,command).status).toBe('duplicate');
  const s=sanctioned('arms');s.production.USA.stockpile[equipment]=100;expect(canTransferMilitaryHardware(s,'USA','RUS')).toBe(false);expect(applyGameCommand(s,command)).toBe(s);
 });
 it('arms embargo blocks IndustrialMarketPanel orders while allowing ordinary civilian goods',()=>{
  const s=sanctioned('arms');s.playerCountryId='RUS';s.industrialEconomy.USA.stock.tanks=1000;s.industrialEconomy.USA.stock.water=1000;
  expect(industrialOrderError(s,'USA','tanks',1,'buy')).not.toBeNull();expect(industrialOrderError(s,'USA','water',1,'buy')).toBeNull();
 });
 it('trade embargo blocks new quotes, signed contracts, listings and physical commodity market orders',()=>{
  const s=sanctioned('trade');s.countries.USA.resources.oil=1000;s.countries.RUS.resources.oil=1000;
  expect(getTradeQuote(s,'RUS','oil',undefined,'USA').quantity).toBe(0);expect(exchangeAccess(s,'USA','RUS','oil')).toBe(false);
  s.tradeDeals.embargoed={id:'embargoed',sellerId:'USA',buyerId:'RUS',resource:'oil',quantityPerDay:1,pricePerUnit:.1,active:true};const n=processTradeDeals(s);expect(n.countries.RUS.resources.oil).toBe(s.countries.RUS.resources.oil);
  const listed=postListing(s,'oil',1,.1,'USA');expect(buyListing(listed,living(listed).listings[0].id,1,'RUS')).toBe(listed);
  for(const [id,c] of Object.entries(s.countries))if(id!=='USA'&&id!=='RUS')c.resources.oil=0;
  expect(commodityOrderPreview(s,'RUS','oil','buy',.1).allowed).toBe(false);expect(placeCommodityOrder(s,'RUS','oil','buy',.1)).toBe(s);
 });
 it.each(['food','medicine'] as const)('honors the %s exemption only for its declared partner and commodity',good=>{
  const s=sanctioned('trade',[{scope:good,countryIds:['USA']}]);expect(organizationSanctionsBlock(s,'USA','RUS','trade',good)).toBe(false);
  expect(organizationSanctionsBlock(s,'FRA','RUS','trade',good)).toBe(true);expect(organizationSanctionsBlock(s,'USA','RUS','trade','oil')).toBe(true);
  if(good==='food'){s.countries.USA.resources.food=1000;expect(exchangeAccess(s,'USA','RUS','food')).toBe(true);const listed=postListing(s,'food',1,.1,'USA');expect(buyListing(listed,living(listed).listings[0].id,1,'RUS')).not.toBe(listed);}
 });
 it('financial restrictions block sovereign offers, acceptance/applications and organization facilities but allow repayment',()=>{
  const base=ready('USA');route(base,'USA','RUS');const offered=postCredit(base,'lend',1,5,90,'USA'),offer=offered.world.expansion!.creditOffers[0];
  const s=sanctioned('finance');s.world.expansion=offered.world.expansion;
  expect(creditOfferStatus(s,'borrow',1,5,90,'RUS').allowed).toBe(false);expect(acceptCredit(s,offer.id,'RUS')).toBe(s);expect(creditApplicationPreview(s,offer.id,'RUS').allowed).toBe(false);expect(applyForCredit(s,offer.id,'RUS')).toBe(s);
  const p={kind:'finance',borrowerId:'RUS',programId:'blocked',principalB:1,terms:{apr:3,termDays:90,graceDays:30,denomination:'USD'},conditions:[]} as const;
  expect(proposeResolution(s,'imf','financeBoard',{...p,conditions:[]},'RUS')).toBe(s);
 });
 it('zero-intensity and expired effects do not block unrelated countries or scopes',()=>{
  const s=sanctioned('arms'),e=Object.values(s.world.organizations.effects)[0] as {measures:Array<{intensity:number}>;endsDay:number};
  expect(organizationSanctionsBlock(s,'USA','RUS','trade','food')).toBe(false);expect(organizationSanctionsBlock(s,'USA','CHN','arms')).toBe(false);
  e.measures[0].intensity=0;expect(organizationSanctionsBlock(s,'USA','RUS','arms')).toBe(false);
  e.measures[0].intensity=1;expect(organizationSanctionsBlock({...s,day:e.endsDay},'USA','RUS','arms')).toBe(false);
 });
});
describe('economic effects expiry, save validation and deterministic replay',()=>{
 it.each([['opecPlus','SAU',quota],['wto','TUR',remedy],['eu','DEU',integration],['bricsPlus','BRA',swap]] as const)('%s expires at endsDay and survives save/load without replay',(org,actor,p)=>{
  const s=adopt(freeze(ready(actor)),org,p),e=firstEffect(s),loaded=migrateSave(JSON.parse(JSON.stringify(snapshotGame(s))))!;
  expect(loaded).toEqual(s);expect(processOrganizations(loaded)).toBe(loaded);expect(processOrganizations({...s,day:e.endsDay-1})).toEqual(processOrganizations({...loaded,day:e.endsDay-1}));
  const n=processOrganizations({...loaded,day:e.endsDay});expect(firstEffect(n).status).toBe('expired');expect(canLoadSave(n)).toBe(true);
 });
 it('rejects non-finite reserves, corrupted swap limits and impossible clearing balances',()=>{
  const s=adopt(ready('BRA'),'bricsPlus',swap);for(const corrupt of [
   (n:GameState)=>{n.countries.BRA.economy.foreignReservesB=NaN;},
   (n:GameState)=>{(firstEffect(n) as CurrencySwapEffect).usedB=2;},
   (n:GameState)=>{(firstEffect(n) as CurrencySwapEffect).localBalanceByCountry.BRA=1;},
   (n:GameState)=>{(firstEffect(n) as CurrencySwapEffect).sourceResolutionId='missing';},
  ]){const n=structuredClone(s);corrupt(n);expect(canLoadSave(n)).toBe(false);}
 });
 it('threads adopted quotas through full tickGame and replays identically from a frozen snapshot',()=>{
  let s=proposeResolution(ready('SAU'),'opecPlus','plenary',quota);for(const id of s.world.organizations.resolutions['ORG-1'].electorate.eligibleCountryIds)s=castBallot(s,'ORG-1','yes',id);
  s=recordEconomicHistory({...s,day:5});const loaded=migrateSave(snapshotGame(s))!,a=tickGame(freeze(s)),b=tickGame(loaded);expect(a).toEqual(b);expect(firstEffect(a).kind).toBe('organizationOilQuota');expect(worldSupply(a).oilProduction.SAU).toBe(0);expect(canLoadSave(a)).toBe(true);
 });
});

describe('economic boundary and conservation regressions',()=>{
 it('opening production valves lowers the same-seed crude momentum after a quota cut',()=>{
  const cut=adopt(ready('SAU'),'opecPlus',quota),open=adopt(cut,'opecPlus',{kind:'oilQuota',quotas:{SAU:cut.countries.SAU.resourceProduction.oil,RUS:cut.countries.RUS.resourceProduction.oil},durationDays:30});
  const tight={...open,world:{...open.world,organizations:{...open.world.organizations,effects:cut.world.organizations.effects}}};
  expect(worldSupply(open).worldOil).toBeGreaterThan(worldSupply(tight).worldOil);
  expect(processCommodityExchange(open).world.commodities!.markets.oil.price).toBeLessThan(processCommodityExchange(tight).world.commodities!.markets.oil.price);
 });
 it('does not charge another tariff after cap exhaustion or the exact expiry day',()=>{
  const s=adopt(ready('TUR'),'wto',remedy),e=firstEffect(s);
  expect(tariffPreview({...s,day:e.endsDay},'CHN','TUR','oil',1).tariffB).toBe(0);
  const n=settleTradePayment(s,'CHN','TUR','oil',4);expect((firstEffect(n) as TradeRemedyEffect).collectedB).toBe(2);
  expect(tariffPreview(n,'CHN','TUR','oil',1).tariffB).toBe(0);
 });
 it('does not let a pre-signed industrial contract lock out a subsequently adopted remedy',()=>{
  let s=ready('TUR');route(s,'CHN','TUR');s.industrialEconomy.CHN.stock.water=1000;
  s=adopt(s,'wto',{...remedy,remedy:{...remedy.remedy,commodity:'water'}});
  const q=industrialQuote(s,'CHN','TUR','water',1,.1),n=settleIndustrialTrade(s,'CHN','TUR','water',1,.1);
  expect(q.cost).toBeCloseTo(.15);expect(n.countries.TUR.economy.tariffRevenueB).toBeCloseTo(.05);
 });
 it('exposes the actual tariff-inclusive listing quote and disables unaffordable gross payments',()=>{
  let s=ready('TUR');route(s,'CHN','TUR');s.countries.CHN.resources.oil=1000;s=adopt(s,'wto',remedy);
  s=postListing(s,'oil',1,1,'CHN');const id=living(s).listings[0].id,q=listingPurchasePreview(s,id,1,'TUR');expect(q).toMatchObject({allowed:true,cost:1.5,tariffB:.5,unitPrice:1.5});
  const n=buyListing(s,id,1,'TUR');expect(n.countries.TUR.economy.treasury).toBe(q.treasuryAfter);
  const poor=structuredClone(s);poor.countries.TUR.economy.treasury=1.2;expect(listingPurchasePreview(poor,id,1,'TUR').allowed).toBe(false);expect(buyListing(poor,id,1,'TUR')).toBe(poor);
 });
 it('quotes and collects the same customs amount on the physical commodity exchange',()=>{
  let s=ready('TUR');s.countries.CHN.resources.oil=100000;
  s=adopt(s,'wto',remedy);const q=commodityOrderPreview(s,'TUR','oil','buy',.1);expect(q.counterpartyId).toBe('CHN');expect(q.allowed).toBe(true);expect(q.tariffB).toBeGreaterThan(0);
  const before=s.countries.TUR.economy.treasury,n=placeCommodityOrder(s,'TUR','oil','buy',.1);expect(n.countries.TUR.economy.tariffRevenueB).toBeCloseTo(q.tariffB);
  expect(n.countries.TUR.economy.treasury).toBeCloseTo(before-q.total+q.tariffB);expect(canLoadSave(n)).toBe(true);
 });
 it('applies integration to actual deliveries, keeps the base contract price and conserves stocks/cash',()=>{
  const s=ready('DEU');route(s,'DEU','FRA');s.countries.FRA.resources.food=1000;
  s.tradeDeals.market={id:'market',sellerId:'FRA',buyerId:'DEU',resource:'food',quantityPerDay:1,pricePerUnit:.1,active:true};
  const n=adopt(s,'eu',integration),cash=n.countries.FRA.economy.treasury+n.countries.DEU.economy.treasury,stock=n.countries.FRA.resources.food+n.countries.DEU.resources.food,delivered=processTradeDeals(n);
  expect(delivered.countries.DEU.resources.food-n.countries.DEU.resources.food).toBeCloseTo(1.16);expect(delivered.countries.FRA.economy.treasury+delivered.countries.DEU.economy.treasury).toBeCloseTo(cash);
  expect(delivered.countries.FRA.resources.food+delivered.countries.DEU.resources.food).toBeCloseTo(stock);
  const signed=makeBilateralImportDeal(n,'DEU','FRA','food')!;n.tradeDeals={[signed.id]:signed};const quoted=getTradeQuote(n,'FRA','food',undefined,'DEU'),actual=processTradeDeals(n);
  expect(actual.countries.DEU.resources.food-n.countries.DEU.resources.food).toBeCloseTo(quoted.quantity);
 });
 it('prevents reversed swap transactions from replenishing the gross authorization limit',()=>{
  let s=adopt(ready('BRA'),'bricsPlus',swap);s.countries.BRA.economy.foreignReservesB=0;s.countries.CHN.economy.foreignReservesB=0;
  s=settleTradePayment(s,'CHN','BRA','oil',.5);s=settleTradePayment(s,'BRA','CHN','oil',.5);
  const e=firstEffect(s) as CurrencySwapEffect;expect(e.usedB).toBe(1);expect(Object.values(e.localBalanceByCountry)).toEqual([0,0]);expect(settleTradePayment(s,'CHN','BRA','oil',.01)).toBe(s);
 });
 it('does not allow expired swaps or suspended regional membership to avoid USD settlement',()=>{
  const s=adopt(ready('BRA'),'bricsPlus',swap);s.countries.BRA.economy.foreignReservesB=0;const e=firstEffect(s);
  expect(swapSettlementPreview({...s,day:e.endsDay},'CHN','BRA',.5).allowed).toBe(false);
  s.world.organizations.byId.bricsPlus.memberships.BRA.status='suspended';expect(swapSettlementPreview(s,'CHN','BRA',.5).allowed).toBe(false);
 });
 it('blocks resource/cash gifts as an embargo bypass while preserving exempt food aid',()=>{
  const t=sanctioned('trade',[{scope:'food',countryIds:['USA']}]);expect(sendResourceGift(t,'USA','RUS','oil')).toBe(t);expect(sendResourceGift(t,'USA','RUS','food')).not.toBe(t);
  const f=sanctioned('finance');expect(sendTreasuryGift(f,'USA','RUS',1)).toBe(f);
 });
 it('blocks anonymous metals orders when their target cannot establish a permitted counterparty',()=>{
  const t=sanctioned('trade');expect(commodityOrderPreview(t,'RUS','gold','buy',.01).allowed).toBe(false);
 });
 it('preserves old debt and treasury balances when financial sanctions begin',()=>{
  const initial=ready('USA'),s=sanctioned('finance');expect(s.countries.RUS.economy).toEqual(initial.countries.RUS.economy);expect(s.countries.USA.economy).toEqual(initial.countries.USA.economy);
 });
 it.each(['opecPlus','wto','eu','bricsPlus'] as const)('rejects corrupted source-linked %s effect data',org=>{
  const p=org==='opecPlus'?quota:org==='wto'?remedy:org==='eu'?integration:swap,actor=org==='opecPlus'?'SAU':org==='wto'?'TUR':org==='eu'?'DEU':'BRA';
  const s=adopt(ready(actor),org,p),e=firstEffect(s);e.endsDay+=1;expect(canLoadSave(s)).toBe(false);
 });
});

describe('economic effect long-run and compatibility invariants',()=>{
 it('keeps a full world year with all four economic effects finite, loadable and able to expire',()=>{
  let s=ready('TUR');
  s=adopt(s,'opecPlus',{kind:'oilQuota',quotas:{SAU:s.countries.SAU.resourceProduction.oil*.8,RUS:s.countries.RUS.resourceProduction.oil*.8},durationDays:365},'SAU');
  s=adopt(s,'wto',{...remedy,remedy:{...remedy.remedy,durationDays:365}},'TUR');
  s=adopt(s,'eu',{...integration,agreement:{...integration.agreement,durationDays:365}},'DEU');
  s=adopt(s,'bricsPlus',{...swap,agreement:{...swap.agreement,durationDays:365}},'BRA');
  const started=s.day;
  for(let i=0;i<365;i++){
   if(s.activeEvent)s=resolveEvent(s,s.activeEvent.options[0].id);
   for(let victory=pendingVictory(s);victory;victory=pendingVictory(s))s=dismissVictory(s,victory.warId);
   const l=s.world.living;s={...s,activeEvent:null,activeAdvisor:null,world:{...s.world,tutorial:{...s.world.tutorial,active:false},living:l?{...l,notice:undefined,advice:{...l.advice,active:null}}:l}};
   s=tickGame(s);expect(s.day).toBe(started+i+1);
   if(i%73===72)expect(canLoadSave(s)).toBe(true);
  }
  expect(Object.values(s.world.organizations.effects).every(e=>!!e&&typeof e==='object'&&'status' in e&&e.status==='expired')).toBe(true);
  expect(constrainedOilOutput(s,'SAU')).toBe(s.countries.SAU.resourceProduction.oil);
  for(const c of Object.values(s.countries))for(const value of [...Object.values(c.economy),...Object.values(c.resources)])expect(Number.isFinite(value)).toBe(true);
 },120000);
 it('ignores optional USD reserve metadata on earlier Schema 18 saves until first explicit use',()=>{
  const s=ready();for(const c of Object.values(s.countries))expect(c.economy.foreignReservesB).toBeUndefined();expect(migrateSave(snapshotGame(s))).toEqual(s);
 });
 it('rejects saved quota deviations above the same physical limit used by the command',()=>{
  const s=adopt(ready('SAU'),'opecPlus',quota),e=firstEffect(s);if(e.kind==='organizationOilQuota')e.allowedDeviationByCountry.SAU=s.countries.SAU.resourceProduction.oil*.2;
  expect(canLoadSave(s)).toBe(false);
 });
 it('does not let the same WTO dispute be reissued while an active countermeasure remains',()=>{
  const s=adopt(ready('TUR'),'wto',remedy);expect(proposeResolution(s,'wto','plenary',remedy)).toBe(s);
 });
});

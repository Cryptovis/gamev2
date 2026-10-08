import {describe,it,expect} from 'vitest';
import {makeInitialState} from '../data/initialState';
import {buildFacility,processIndustrialEconomy,goodStock,changeGoodStock} from '../engine/systems/industrialEconomy';
import {industrialQuote,placeIndustrialOrder,processIndustrialContracts,settleIndustrialTrade} from '../engine/systems/industrialMarket';
import {processNationalProduction} from '../engine/systems/production';
import {snapshotGame} from '../persistence/snapshot';
import {migrateSave,canLoadSave} from '../persistence/migrations';
import {TANK_COMPONENTS} from '../data/industrialCatalog';
function ready(){const s=makeInitialState();for(const c of Object.values(s.countries)){c.economy.treasury=100;c.processedResources.electricity=100;c.processedResources.steel=100;c.processedResources.fuel=100;}s.countries.TUR.diplomacy.relations.GRC={score:90,status:'ally',treaties:['trade','alliance'],sanctions:false};s.countries.GRC.diplomacy.relations.TUR={score:90,status:'ally',treaties:['trade','alliance'],sanctions:false};return s;}

describe('industrial investment and component manufacturing',()=>{
 it('pays construction once, completes on schedule and expands factory capacity',()=>{
  let s=ready(),factories=s.countries.TUR.industry.factories;
  s=buildFacility(s,'TUR','civil_factory');expect(s.countries.TUR.economy.treasury).toBe(90);expect(s.industrialEconomy.TUR.projects).toHaveLength(1);
  s=processIndustrialEconomy({...s,day:25});expect(s.countries.TUR.industry.factories).toBe(factories);
  s=processIndustrialEconomy({...s,day:26});expect(s.countries.TUR.industry.factories).toBe(factories+5);
  s=processIndustrialEconomy({...s,day:27});expect(s.countries.TUR.industry.factories).toBe(factories+5);
 });
 it('gates new advanced factories by research and affordability',()=>{
  const s=ready();s.countries.TUR.technology.unlocked=[];expect(buildFacility(s,'TUR','engine_works')).toBe(s);
  s.countries.TUR.technology.unlocked=['ind-engines'];s.countries.TUR.economy.treasury=1;expect(buildFacility(s,'TUR','engine_works')).toBe(s);
 });
 it('never extracts more than a finite deposit or available power',()=>{
  const s=ready();s.industrialEconomy.TUR.deposits.coal=.01;s.industrialEconomy.TUR.facilities.coal_mine=10;
  const n=processIndustrialEconomy(s);expect(n.industrialEconomy.TUR.deposits.coal).toBe(0);expect(n.industrialEconomy.TUR.lastOutput.coal).toBeCloseTo(.01);
  s.countries.TUR.processedResources.electricity=0;const noPower=processIndustrialEconomy(s);expect(noPower.industrialEconomy.TUR.lastOutput.coal).toBe(0);
 });
 it('uses inputs to produce engines and reports a real shortage',()=>{
  const s=ready();const n=s.industrialEconomy.TUR;Object.keys(n.enabled).forEach(k=>n.enabled[k as keyof typeof n.enabled]=false);n.enabled.engine_works=true;n.facilities.engine_works=1;n.stock.copper=0;
  const blocked=processIndustrialEconomy(s);expect(blocked.industrialEconomy.TUR.lastOutput.engines).toBe(0);expect(blocked.industrialEconomy.TUR.bottlenecks.engine_works).toBe('Copper');
  n.stock.copper=10;const next=processIndustrialEconomy(s);expect(next.industrialEconomy.TUR.lastOutput.engines).toBeGreaterThan(0);expect(next.industrialEconomy.TUR.stock.copper).toBeLessThan(10);
 });
 it('pausing a facility prevents output and operating costs',()=>{
  const s=ready();Object.keys(s.industrialEconomy.TUR.enabled).forEach(k=>s.industrialEconomy.TUR.enabled[k as keyof typeof s.industrialEconomy.TUR.enabled]=false);
  const n=processIndustrialEconomy(s);expect(n.industrialEconomy.TUR.lastCosts).toBe(0);expect(n.industrialEconomy.TUR.lastOutput).toEqual({});
 });
 it('tank production requires research and consumes imported components',()=>{
  let s=ready();const c=s.countries.TUR,p=s.production.TUR,n=s.industrialEconomy.TUR;
  Object.values(p.lines).forEach(l=>l.factories=0);p.lines.armor.factories=1;
  c.technology.unlocked=[];expect(processNationalProduction(c,p,n).production.lastDailyOutput.armor).toBe(0);
  c.technology.unlocked=['mil-armor-assembly'];n.stock.armor_plate=10;n.stock.electronics=10;n.stock.engines=0;expect(processNationalProduction(c,p,n).production.lastDailyOutput.armor).toBe(0);
  s=changeGoodStock(s,'GRC','engines',100);s=placeIndustrialOrder(s,'GRC','engines',5,'buy',0);
  const result=processNationalProduction(s.countries.TUR,p,s.industrialEconomy.TUR);expect(result.production.lastDailyOutput.armor).toBeGreaterThan(0);
  for(const [g,amount] of Object.entries(TANK_COMPONENTS))expect(result.industrial!.stock[g as keyof typeof n.stock]).toBeCloseTo(s.industrialEconomy.TUR.stock[g as keyof typeof n.stock]-result.production.lastDailyOutput.armor*amount!);
 });
});

describe('industrial exchange and secured supply',()=>{
 it('conserves real stock and treasury during an export',()=>{
  const s=ready();const before=s.industrialEconomy.TUR.stock.water+s.industrialEconomy.GRC.stock.water;
  const next=placeIndustrialOrder(s,'GRC','water',5,'sell',0);
  expect(next.countries.TUR.economy.treasury).toBeGreaterThan(100);expect(next.countries.TUR.economy.treasury+next.countries.GRC.economy.treasury).toBeCloseTo(200);
  expect(goodStock(next,'TUR','water')+goodStock(next,'GRC','water')).toBeCloseTo(before);
 });
 it('blocks sanctions, war, protected reserves and unaffordable orders',()=>{
  const s=ready();s.countries.TUR.diplomacy.relations.GRC.sanctions=true;expect(placeIndustrialOrder(s,'GRC','water',5,'buy',0)).toBe(s);
  s.countries.TUR.diplomacy.relations.GRC.sanctions=false;s.countries.TUR.diplomacy.relations.GRC.status='war';expect(placeIndustrialOrder(s,'GRC','water',5,'buy',0)).toBe(s);
  s.countries.TUR.diplomacy.relations.GRC.status='ally';s.industrialEconomy.GRC.stock.water=25;expect(industrialQuote(s,'GRC','TUR','water',1).error).toContain('reserve');
  s.industrialEconomy.GRC.stock.water=100;s.countries.TUR.economy.treasury=0;expect(placeIndustrialOrder(s,'GRC','water',1,'buy',0)).toBe(s);
 });
 it('requires alliance for weapons and transfers the actual equipment reserve',()=>{
  const s=ready();s.production.GRC.stockpile.armor=50;s.countries.TUR.diplomacy.relations.GRC.treaties=['trade'];expect(placeIndustrialOrder(s,'GRC','tanks',2,'buy',0)).toBe(s);
  s.countries.TUR.diplomacy.relations.GRC.treaties.push('alliance');const n=placeIndustrialOrder(s,'GRC','tanks',2,'buy',0);expect(n.production.GRC.stockpile.armor).toBe(48);expect(n.production.TUR.stockpile.armor).toBe(s.production.TUR.stockpile.armor+2);
 });
 it('does not create duplicate contracts or move stock before delivery',()=>{
  const s=ready(),n=placeIndustrialOrder(s,'GRC','water',5,'buy',1);expect(goodStock(n,'TUR','water')).toBe(goodStock(s,'TUR','water'));expect(placeIndustrialOrder(n,'GRC','water',5,'buy',1)).toBe(n);
  const delivered=processIndustrialContracts({...n,day:31});expect(goodStock(delivered,'TUR','water')).toBe(goodStock(s,'TUR','water')+5);
  const again=processIndustrialContracts(delivered);expect(goodStock(again,'TUR','water')).toBe(goodStock(delivered,'TUR','water'));
 });
 it('records failed deliveries without creating money or goods',()=>{
  const s=placeIndustrialOrder(ready(),'GRC','water',5,'buy',1);s.countries.TUR.economy.treasury=0;const n=processIndustrialContracts({...s,day:31});expect(Object.values(n.industrialContracts)[0].missedDeliveries).toBe(1);expect(n.countries.TUR.economy.treasury).toBe(0);expect(goodStock(n,'TUR','water')).toBe(goodStock(s,'TUR','water'));
 });
 it('rejects NaN and negative quantities',()=>{
  const s=ready();expect(settleIndustrialTrade(s,'GRC','TUR','water',NaN)).toBe(s);expect(settleIndustrialTrade(s,'GRC','TUR','water',-1)).toBe(s);
 });
 it('snapshots and migrates v12 without losing old production and infrastructure',()=>{
  const s=ready(),snapshot=snapshotGame(s);expect(snapshot.industrialEconomy).toEqual(s.industrialEconomy);expect(canLoadSave(snapshot)).toBe(true);
  const old={...snapshot,schemaVersion:12};delete (old as Partial<typeof old>).industrialEconomy;delete (old as Partial<typeof old>).industrialContracts;delete (old as Partial<typeof old>).leadership;
  const migrated=migrateSave(old)!;expect(migrated.schemaVersion).toBe(16);expect(migrated.production).toEqual(s.production);expect(migrated.infrastructure).toEqual(s.infrastructure);expect(migrated.industrialEconomy.TUR).toBeDefined();expect(migrateSave({...s,schemaVersion:99})).toBeNull();
 });
});

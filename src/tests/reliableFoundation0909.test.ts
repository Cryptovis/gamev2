import {describe,it,expect,vi} from 'vitest';
import {makeInitialState} from '../data/initialState';
import type {GameState} from '../domain/game';
import {snapshotGame} from '../persistence/snapshot';
import {migrateSave,canLoadSave} from '../persistence/migrations';
import {initialFactions} from '../engine/systems/factions';
import {executeCommandResult,applyGameCommand} from '../engine/commands';
import {commodityOrderPreview,processCommodityExchange,placeCommodityOrder} from '../engine/systems/commodityExchange';
import {processFlights} from '../engine/systems/flights';
import {startTacticalBattle,resolveTacticalRound,processAutoTacticalWars} from '../engine/systems/tactical';
import {resolveCombatRound,processAutoWars} from '../engine/systems/warfare';
import {withWarFuel} from './warFixture';

// Preserve the real save/load path; only the IndexedDB adapter is replaced in Node.
const rows=vi.hoisted(()=>new Map<string,unknown>());
vi.mock('../persistence/database',()=>({db:{saves:{put:async(r:{id:string})=>rows.set(r.id,structuredClone(r)),get:async(id:string)=>structuredClone(rows.get(id))}}}));
vi.mock('../session/demoAccounts',()=>({demoOwner:()=> 'guest'}));
import {saveGame,loadSave} from '../persistence/saveGame';
const base=()=>{const s=makeInitialState();s.world.tutorial.active=false;s.eventCooldownUntil=100000;s.advisorCooldownUntil=100000;return s;};
function enriched(){
 let s=applyGameCommand(withWarFuel(base()),{type:'military/declareWar',targetCountryId:'GRC'});
 const id=Object.keys(s.wars)[0];s=startTacticalBattle(s,id);s=resolveTacticalRound(s,id,[],0);
 const c=s.countries.TUR;c.politics.factions={...initialFactions(c),terms:2,crisis:{openedDay:s.day,deadlineDay:s.day+45,acknowledged:true},concession:{faction:'labour',untilDay:s.day+180}};c.demographics.welfare=83.25;
 s.countries.CYP.annexedBy='TUR';s.countries.CYP.controllerCountryId='TUR';s.countries.IRN.globalSanctions=true;s.countries.IRN.globalSanctionsUntil=s.day+90;c.eventFlags={phase1:s.day};
 return s;
}

describe('Phase 1 save integrity',()=>{
 for(const version of [12,13,14,15,16,17,18])it(`schema ${version} keeps country fields and war state through load-save-load`,async()=>{
  const original=enriched(),old=snapshotGame(original);old.schemaVersion=version;
  // Remove containers that had not yet been introduced, rather than merely relabel a current save.
  if(version<=17)delete (old.world as Partial<typeof old.world>).organizations;
  const partial=old as Partial<GameState>;
  if(version===12){delete partial.industrialEconomy;delete partial.industrialContracts;delete partial.leadership;}
  if(version<=13)delete partial.world;
  else if(version===14){delete old.world.campaignId;delete old.world.commandIds;delete old.world.journal;}
  if(version>=14&&version<=15)delete old.world.economicHistory;
  const loaded=migrateSave(old);expect(loaded).not.toBeNull();
  expect(loaded!.countries).toEqual(original.countries);
  expect(loaded!.wars).toEqual(original.wars);
  const record=await saveGame(loaded!,`phase1-${version}`,'Roundtrip','guest');
  const again=await loadSave(record.id);expect(again).toEqual(loaded);
  expect(again!.countries.TUR.politics.factions).toEqual(original.countries.TUR.politics.factions);
  expect(again!.countries.TUR.demographics.welfare).toBe(83.25);
  expect(again!.countries.CYP.annexedBy).toBe('TUR');expect(again!.countries.IRN.globalSanctions).toBe(true);
 });
 it('loads old saves without optional country fields and keeps them absent after saving',async()=>{
  const s=base();for(const c of Object.values(s.countries)){delete c.politics.factions;delete c.demographics.welfare;delete c.annexedBy;delete c.globalSanctionsUntil;delete c.eventFlags;}
  const loaded=migrateSave(s)!;expect(loaded).not.toBeNull();await saveGame(loaded,'optional-absent');
  expect((await loadSave('optional-absent'))!.countries).toEqual(s.countries);
 });
 it('does not overwrite a valid saved campaign with invalid faction state',async()=>{
  const s=enriched();await saveGame(s,'protected');const invalid=snapshotGame(s);invalid.countries.TUR.politics.factions!.pressure=NaN;
  expect(canLoadSave(invalid)).toBe(false);await expect(saveGame(invalid,'protected')).rejects.toThrow('invalid save');expect(await loadSave('protected')).toEqual(migrateSave(s));
 });
});

describe('Phase 1 transactions and single-day combat',()=>{
 it('includes impact, fee and freight before rejecting an underfunded physical order',()=>{
  const s=processCommodityExchange(base()),q=commodityOrderPreview(s,'TUR','food','buy',1);expect(q.allowed).toBe(true);expect(q.freight).toBeGreaterThan(0);expect(q.fillPrice).toBeGreaterThan(q.mid);
  s.countries.TUR.economy.treasury=q.total-1e-8;
  expect(commodityOrderPreview(s,'TUR','food','buy',1).allowed).toBe(false);expect(placeCommodityOrder(s,'TUR','food','buy',1)).toBe(s);
  s.countries.TUR.economy.treasury=q.total;const n=placeCommodityOrder(s,'TUR','food','buy',1);expect(n.countries.TUR.economy.treasury).toBeCloseTo(0,12);
 });
 it('deduplicates an order across reload and delivers its goods exactly once',()=>{
  const s=processCommodityExchange(base()),command={type:'commodity/order',good:'food',side:'buy',quantity:1,commandId:'phase1-cargo'} as const;
  const first=executeCommandResult(s,command);expect(first.status).toBe('applied');let loaded=migrateSave(snapshotGame(first.state))!;
  const repeat=executeCommandResult(loaded,command);expect(repeat.status).toBe('duplicate');expect(repeat.state).toBe(loaded);
  const before=loaded.countries.TUR.resources.food;const arrival=loaded.world.commodities!.deliveries.find(d=>d.countryId==='TUR'&&d.good==='food')!.arriveDay;
  loaded=processFlights({...loaded,day:arrival});expect(loaded.countries.TUR.resources.food).toBeCloseTo(before+1);
  loaded=processCommodityExchange(loaded);const once=snapshotGame(loaded);
  expect(processCommodityExchange(processFlights(loaded))).toEqual(once);
  const reloaded=migrateSave(once)!;expect(processCommodityExchange(processFlights(reloaded))).toEqual(reloaded);
 });
 it('settles a sale once, including after save/load',()=>{
  let s=processCommodityExchange(base());s=placeCommodityOrder(s,'TUR','gold','buy',1);s=placeCommodityOrder(s,'TUR','gold','sell',1);
  const amount=s.world.commodities!.settlements.filter(x=>x.countryId==='TUR').reduce((sum,x)=>sum+x.amount,0);expect(amount).toBeGreaterThan(0);
  const control=snapshotGame(s);control.world.commodities!.settlements=control.world.commodities!.settlements.filter(x=>x.countryId!=='TUR');
  const unpaid=processCommodityExchange({...control,day:control.day+1});
  s=processCommodityExchange({...s,day:s.day+1});expect(s.countries.TUR.economy.treasury-unpaid.countries.TUR.economy.treasury).toBeCloseTo(amount,10);expect(s.world.commodities!.settlements.filter(x=>x.countryId==='TUR')).toEqual([]);
  const loaded=migrateSave(snapshotGame(s))!;expect(processCommodityExchange(loaded)).toBe(loaded);
 });
 for(const tactical of [false,true])it(`${tactical?'tactical':'auto'} combat cannot resolve twice on the same day or after reload`,()=>{
  let s=applyGameCommand(withWarFuel(base()),{type:'military/declareWar',targetCountryId:'GRC'});const id=Object.keys(s.wars)[0];
  if(tactical)s=startTacticalBattle(s,id);
  s.wars[id].autoAssault=true;
  const n=tactical?resolveTacticalRound(s,id,[],0):resolveCombatRound(s,id);expect(n.wars[id].rounds).toBe(s.wars[id].rounds+1);expect(n.day).toBe(s.day);
  const loaded=migrateSave(snapshotGame(n))!;
  const repeat=tactical?resolveTacticalRound(loaded,id,[],loaded.wars[id].tactical!.round):resolveCombatRound(loaded,id);
  expect(repeat).toBe(loaded);expect(processAutoTacticalWars(processAutoWars(loaded))).toEqual(loaded);
  const next=executeCommandResult(loaded,{type:'time/advanceDay',commandId:'phase1-day'});expect(next.state.day).toBe(loaded.day+1);expect(next.state.wars[id].rounds).toBe(loaded.wars[id].rounds+1);
  expect(executeCommandResult(next.state,{type:'time/advanceDay',commandId:'phase1-day'}).status).toBe('duplicate');
 });
});

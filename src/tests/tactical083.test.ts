import { describe,it,expect } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { applyGameCommand,executeCommandResult } from '../engine/commands';
import { chooseTacticalOrders,startTacticalBattle,validateTacticalOrders,tacticalCommandStatus,resolveTacticalRound,tacticalFuel,visibleCells } from '../engine/systems/tactical';
import { processAutoWars } from '../engine/systems/warfare';
import { snapshotGame } from '../persistence/snapshot';
import { migrateSave } from '../persistence/migrations';
import type { GameState } from '../domain/game';
import type { TacticalOrder } from '../domain/tactical';
const fixture=()=>{
 let s=makeInitialState();s.world.tutorial.active=false;s.eventCooldownUntil=10000;s.advisorCooldownUntil=10000;
 s=applyGameCommand(s,{type:'military/declareWar',targetCountryId:'GRC'});const id=Object.keys(s.wars)[0];
 return {s:startTacticalBattle(s,id),id};
};
const move:TacticalOrder={unitId:'attacker-infantry',kind:'move',target:8};
describe('0.83 tactical orders',()=>{
 it('allocates bounded forces without spawning troops or resetting an existing battle',()=>{
  const {s,id}=fixture(),b=s.wars[id].tactical!;
  expect(b.units).toHaveLength(6);expect(b.units.find(u=>u.id==='attacker-infantry')!.allocated).toBe(Math.floor(s.countries.TUR.military.personnel*.25));
  expect(startTacticalBattle(s,id)).toBe(s);expect(s.wars[id].autoAssault).toBe(false);
 });
 it('prevents a country committing its groups to another tactical battle',()=>{
  const {s,id}=fixture();const n=applyGameCommand(s,{type:'military/declareWar',targetCountryId:'BGR'}),other=Object.keys(n.wars).find(x=>x!==id)!;
  expect(executeCommandResult(n,{type:'tactical/start',warId:other}).message).toContain('already committed');
 });
 it('validates command budgets, ownership, destinations and movement range',()=>{
  const {s,id}=fixture();
  expect(validateTacticalOrders(s,id,'attacker',[move])).toEqual([]);
  expect(validateTacticalOrders(s,id,'attacker',[move,move]).join(' ')).toContain('only one');
  expect(validateTacticalOrders(s,id,'attacker',[{...move,unitId:'defender-infantry'}]).join(' ')).toContain('under your command');
  expect(validateTacticalOrders(s,id,'attacker',[{...move,target:13}]).join(' ')).toContain('unoccupied');
  expect(validateTacticalOrders(s,id,'attacker',[{...move,target:22}]).length).toBeGreaterThan(0);
  expect(validateTacticalOrders(s,id,'attacker',[{...move,kind:'flank',target:9},{unitId:'attacker-armor',kind:'flank',target:14}]).join(' ')).toContain('three points');
 });
 it('rejects invalid numbers, prototype names and malformed orders without spending fuel',()=>{
  const {s,id}=fixture();
  for(const orders of [[{...move,target:NaN}],[{...move,kind:'constructor'}],[null]] as unknown as TacticalOrder[][]){
   const r=executeCommandResult(s,{type:'tactical/commit',warId:id,expectedRound:0,orders});expect(r.status).toBe('unavailable');expect(r.state).toBe(s);
  }
 });
 it('requires a forward flank and a traversable route through intervening terrain',()=>{
  const {s,id}=fixture(),b=s.wars[id].tactical!;
  expect(validateTacticalOrders(s,id,'attacker',[{...move,kind:'flank',target:6}]).join(' ')).toContain('advance toward');
  b.terrain[14]='mountain';
  expect(validateTacticalOrders(s,id,'attacker',[{unitId:'attacker-armor',kind:'move',target:15}]).join(' ')).toContain('path is blocked');
  b.terrain[14]='plains';
  expect(validateTacticalOrders(s,id,'attacker',[{unitId:'attacker-armor',kind:'move',target:15}])).toEqual([]);
 });
 it('retains the old battlefield when a same-day ceasefire is followed by redeclaration',()=>{
  const {s,id}=fixture(),ended=applyGameCommand(s,{type:'military/withdraw',warId:id});
  const n=applyGameCommand(ended,{type:'military/declareWar',targetCountryId:'GRC'});
  expect(Object.keys(n.wars)).toHaveLength(2);expect(n.wars[id]).toEqual(ended.wars[id]);
  expect(Object.values(n.wars).filter(w=>w.status==='active')).toHaveLength(1);
  expect(migrateSave(snapshotGame(n))).not.toBeNull();
 });
 it('uses the strategic victory lifecycle after a tactical round finishes the front',()=>{
  const {s,id}=fixture();s.wars[id].progress=99.9;s.wars[id].defenderExhaustion=99.9;
  const n=resolveTacticalRound(s,id,[move],0);
  expect(n.wars[id].status).toBe('victory');expect(n.countries.GRC.controllerCountryId).toBe('TUR');
  expect(n.wars[id].tactical!.events).toHaveLength(1);expect(migrateSave(snapshotGame(n))).not.toBeNull();
 });
 it('requires fuel for movement while allowing defensive orders in a fuel crisis',()=>{
  const {s,id}=fixture();s.countries.TUR.processedResources.fuel=0;
  expect(validateTacticalOrders(s,id,'attacker',[move]).join(' ')).toContain('Not enough fuel');
  expect(validateTacticalOrders(s,id,'attacker',[{unitId:move.unitId,kind:'defend'}])).toEqual([]);
 });
 it('AI orders obey the same budget, visibility and fuel validator',()=>{
  const {s,id}=fixture();
  for(const side of ['attacker','defender'] as const){
   const orders=chooseTacticalOrders(s,id,side);expect(orders.length).toBeGreaterThan(0);expect(validateTacticalOrders(s,id,side,orders)).toEqual([]);
  }
  s.countries.GRC.processedResources.fuel=0;expect(chooseTacticalOrders(s,id,'defender').every(o=>o.kind==='defend')).toBe(true);
 });
 it('resolves simultaneous movement once, reconciling campaign losses, groups and exact fuel',()=>{
  const {s,id}=fixture(),before=snapshotGame(s),fuel=tacticalFuel(s,s.wars[id],'attacker',[move]);
  const n=resolveTacticalRound(s,id,[move],0),b=n.wars[id].tactical!,e=b.events[0];
  expect(b.round).toBe(1);expect(n.countries.TUR.processedResources.fuel).toBeCloseTo(before.countries.TUR.processedResources.fuel-fuel);
  expect(before.countries.TUR.military.personnel-n.countries.TUR.military.personnel).toBe(e.attackerLosses.personnel);
  expect(b.units.find(u=>u.id===move.unitId)!.remaining).toBe(before.wars[id].tactical!.units[0].remaining-e.attackerLosses.personnel);
  expect(n.wars[id].rounds).toBe(1);expect(resolveTacticalRound(n,id,[move],1)).toBe(n);expect(resolveTacticalRound({...n,day:n.day+1},id,[move],0)).toBeDefined();
  expect(tacticalCommandStatus({...n,day:n.day+1},id,0,[move]).join(' ')).toContain('earlier round');
 });
 it('does not let defensive holds capture territory for free',()=>{
  const {s,id}=fixture();s.countries.TUR.military.personnel*=10;
  const n=resolveTacticalRound(s,id,[{unitId:move.unitId,kind:'defend'}],0);expect(n.wars[id].progress).toBeLessThanOrEqual(0);
 });
 it('persists results and deduplication across reload without rerolling',()=>{
  const {s,id}=fixture(),command={type:'tactical/commit' as const,warId:id,expectedRound:0,orders:[move],commandId:'round-confirmation'};
  const a=applyGameCommand(s,command),saved=migrateSave(snapshotGame(a))!;
  expect(saved).not.toBeNull();expect(saved.wars[id].tactical).toEqual(a.wars[id].tactical);
  const retry=executeCommandResult(saved,command);expect(retry.status).toBe('duplicate');expect(retry.state.simulationSeed).toBe(a.simulationSeed);expect(retry.state.countries).toEqual(a.countries);
  expect(applyGameCommand(migrateSave(snapshotGame(s))!,command).wars[id]).toEqual(a.wars[id]);
 });
 it('keeps auto assault on the tactical resolver instead of applying an extra legacy round',()=>{
  const {s,id}=fixture();s.wars[id].autoAssault=true;expect(processAutoWars(s)).toBe(s);
  const n=applyGameCommand(s,{type:'military/assault',warId:id});expect(n.wars[id].tactical!.round).toBe(1);expect(n.wars[id].rounds).toBe(1);
 });
 it('recon reveals a remote sector for the next planning round only',()=>{
  const {s,id}=fixture(),b=s.wars[id].tactical!;expect(visibleCells(b,'attacker').has(11)).toBe(false);
  const n=resolveTacticalRound(s,id,[{unitId:move.unitId,kind:'recon',target:10}],0);expect(visibleCells(n.wars[id].tactical!,'attacker').has(11)).toBe(true);
  const again=resolveTacticalRound({...n,day:n.day+1},id,[],1);expect(again.wars[id].tactical!.revealed.attacker).toEqual([]);
 });
 it('reserve preparation survives save/load and is consumed by a later order',()=>{
  const {s,id}=fixture(),n=resolveTacticalRound(s,id,[{unitId:move.unitId,kind:'reserve'}],0),saved=migrateSave(snapshotGame(n))!;
  expect(saved.wars[id].tactical!.units.find(u=>u.id===move.unitId)!.prepared).toBe(true);
  const after=resolveTacticalRound({...saved,day:saved.day+1},id,[move],1);expect(after.wars[id].tactical!.units.find(u=>u.id===move.unitId)!.prepared).toBe(false);
 });
 it('retreat by attacker preserves survivors and ends the war; defender retreat concedes control',()=>{
  const {s,id}=fixture(),n=applyGameCommand(s,{type:'military/withdraw',warId:id});expect(n.wars[id].status).toBe('withdrawn');expect(n.countries.TUR.military).toEqual(s.countries.TUR.military);expect(n.countries.GRC.controllerCountryId).toBeNull();
  const defending={...s,playerCountryId:'GRC'};const d=applyGameCommand(defending,{type:'military/withdraw',warId:id});expect(d.wars[id].status).toBe('victory');expect(d.countries.GRC.controllerCountryId).toBe('TUR');
 });
 it('rejects corrupt tactical saves rather than granting forces or accepting future events',()=>{
  const {s,id}=fixture(),n=resolveTacticalRound(s,id,[move],0);
  const corrupt=(change:(s:GameState)=>void)=>{const saved=snapshotGame(n);change(saved);expect(migrateSave(saved)).toBeNull();};
  corrupt(s=>{s.wars[id].tactical!.units[0].remaining=Number.MAX_SAFE_INTEGER;});
  corrupt(s=>{s.wars[id].tactical!.events[0].day=s.day+1;});
  corrupt(s=>{s.wars[id].tactical!.units[0].cell=100;});
 });
});

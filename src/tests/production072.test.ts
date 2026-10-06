import { describe,expect,it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { EQUIPMENT_CATALOG, EQUIPMENT_TYPES } from '../data/equipmentCatalog';
import { deployEquipment, militaryFactoryCapacity, processNationalProduction, processProductionAI, productionCombatModifier, setProductionFactories } from '../engine/systems/production';

describe('Production & Industry 0.72',()=>{
 it('initializes production state for every sovereign country',()=>{
  const state=makeInitialState();
  expect(Object.keys(state.production).length).toBe(Object.keys(state.countries).length);
  expect(state.production.TUR.lines.armor).toBeDefined();
  expect(state.production.TUR.stockpile.infantry_equipment).toBeGreaterThan(0);
 });

 it('converts industrial inputs into equipment stockpiles',()=>{
  const state=makeInitialState();
  const country={...state.countries.TUR,processedResources:{fuel:500,steel:500,electricity:500},economy:{...state.countries.TUR.economy,treasury:500}};
  const production=state.production.TUR;
  const before=EQUIPMENT_TYPES.reduce((sum,t)=>sum+production.stockpile[t],0);
  const result=processNationalProduction(country,production);
  const after=EQUIPMENT_TYPES.reduce((sum,t)=>sum+result.production.stockpile[t],0);
  expect(after).toBeGreaterThan(before);
  expect(result.country.processedResources.steel).toBeLessThan(country.processedResources.steel);
  expect(result.production.throughput).toBeGreaterThan(90);
 });

 it('throttles production when strategic inputs are unavailable',()=>{
  const state=makeInitialState();
  const country={...state.countries.TUR,processedResources:{fuel:0,steel:0,electricity:0},economy:{...state.countries.TUR.economy,treasury:0}};
  const result=processNationalProduction(country,state.production.TUR);
  expect(result.production.throughput).toBe(0);
  expect(result.production.bottleneck).not.toBe('none');
  expect(EQUIPMENT_TYPES.reduce((sum,t)=>sum+result.production.lastDailyOutput[t],0)).toBe(0);
 });

 it('caps factory assignment at available military capacity',()=>{
  const state=makeInitialState();
  const p=state.production.TUR;
  const capacity=militaryFactoryCapacity(state.countries.TUR,p);
  const next=setProductionFactories(state,'TUR','armor',9999);
  const assigned=EQUIPMENT_TYPES.reduce((sum,t)=>sum+next.production.TUR.lines[t].factories,0);
  expect(assigned).toBeLessThanOrEqual(capacity);
 });

 it('deploys reserve armor into active forces',()=>{
  const state=makeInitialState();
  const pack=EQUIPMENT_CATALOG.armor.deployPack;
  const prepared={...state,production:{...state.production,TUR:{...state.production.TUR,stockpile:{...state.production.TUR.stockpile,armor:pack+5}}}};
  const before=prepared.countries.TUR.military.tanks;
  const next=deployEquipment(prepared,'TUR','armor');
  expect(next.countries.TUR.military.tanks).toBe(before+pack);
  expect(next.production.TUR.stockpile.armor).toBe(5);
 });

 it('empty strategic reserves reduce combat sustainment',()=>{
  const state=makeInitialState();
  const normal=productionCombatModifier(state,'TUR');
  const empty={...state,production:{...state.production,TUR:{...state.production.TUR,stockpile:{infantry_equipment:0,artillery:0,armor:0,fighters:0,logistics:0,naval:0}}}};
  expect(productionCombatModifier(empty,'TUR')).toBeLessThan(normal);
 });

 it('AI reallocates military industry according to strategic goal',()=>{
  const state=makeInitialState();
  const bgr=state.countries.BGR;
  const prepared={...state,day:14,countries:{...state.countries,BGR:{...bgr,ai:{...bgr.ai,strategicGoal:'rearm' as const}}}};
  const next=processProductionAI(prepared);
  expect(next.production.BGR.militaryFactoryShare).toBe(66);
  expect(next.production.BGR.lines.armor.factories).toBeGreaterThanOrEqual(next.production.BGR.lines.naval.factories);
 });
});

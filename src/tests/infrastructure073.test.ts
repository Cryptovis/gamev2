import { describe,expect,it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { calculateSupplyNetwork } from '../engine/systems/supplyNetwork';
import { investInfrastructure, processInfrastructure, processInfrastructureAI } from '../engine/systems/infrastructure';
import { getWarPreview } from '../engine/systems/warfare';

describe('Command & Logistics 0.73 foundation',()=>{
 it('initializes infrastructure for every country',()=>{
  const state=makeInitialState();
  expect(Object.keys(state.infrastructure).length).toBe(Object.keys(state.countries).length);
  expect(state.infrastructure.TUR.roads).toBeGreaterThan(0);
  expect(state.infrastructure.TUR.rail).toBeGreaterThan(0);
 });

 it('player infrastructure investment costs treasury and improves the selected asset',()=>{
  const state=makeInitialState();
  const beforeInfra=state.infrastructure.TUR.roads;
  const beforeTreasury=state.countries.TUR.economy.treasury;
  const next=investInfrastructure(state,'TUR','roads');
  expect(next.infrastructure.TUR.roads).toBeGreaterThan(beforeInfra);
  expect(next.countries.TUR.economy.treasury).toBe(beforeTreasury-4);
 });

 it('daily infrastructure processing charges maintenance when affordable',()=>{
  const state=makeInitialState();
  const cost=state.infrastructure.TUR.maintenance;
  const next=processInfrastructure(state);
  expect(next.countries.TUR.economy.treasury).toBeCloseTo(state.countries.TUR.economy.treasury-cost,5);
 });

 it('persistent infrastructure changes supply throughput',()=>{
  const state=makeInitialState();
  const country=state.countries.TUR;
  const healthy={...state.infrastructure.TUR,roads:95,rail:95,hubs:95,ports:90,throughput:95};
  const weak={...state.infrastructure.TUR,roads:12,rail:10,hubs:14,ports:10,throughput:12};
  const good=calculateSupplyNetwork(country,'plains','attacker',healthy);
  const bad=calculateSupplyNetwork(country,'plains','attacker',weak);
  expect(good.supplyScore).toBeGreaterThan(bad.supplyScore);
 });

 it('war preview responds to attacker infrastructure',()=>{
  const state=makeInitialState();
  const turkey=state.countries.TUR;
  const greece=state.countries.GRC;
  const strong={...state.infrastructure.TUR,roads:96,rail:96,hubs:96,ports:90,throughput:96};
  const weak={...state.infrastructure.TUR,roads:8,rail:8,hubs:8,ports:8,throughput:8};
  const strongPreview=getWarPreview(turkey,greece,strong,state.infrastructure.GRC);
  const weakPreview=getWarPreview(turkey,greece,weak,state.infrastructure.GRC);
  expect(strongPreview.attackerSupply).toBeGreaterThan(weakPreview.attackerSupply);
 });

 it('AI invests monthly into weak infrastructure without polluting SITREP',()=>{
  const state=makeInitialState();
  const target='BGR';
  const prepared={...state,day:30,infrastructure:{...state.infrastructure,[target]:{...state.infrastructure[target],roads:20,rail:18,hubs:22,ports:25}},countries:{...state.countries,[target]:{...state.countries[target],economy:{...state.countries[target].economy,treasury:100}}}};
  const beforeSitrep=[...prepared.sitrep];
  const next=processInfrastructureAI(prepared);
  const beforeSum=prepared.infrastructure[target].roads+prepared.infrastructure[target].rail+prepared.infrastructure[target].hubs+prepared.infrastructure[target].ports;
  const afterSum=next.infrastructure[target].roads+next.infrastructure[target].rail+next.infrastructure[target].hubs+next.infrastructure[target].ports;
  expect(afterSum).toBeGreaterThan(beforeSum);
  expect(next.sitrep).toEqual(beforeSitrep);
 });
});

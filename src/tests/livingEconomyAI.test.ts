import { describe,expect,it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { processLivingEconomyAI } from '../engine/systems/livingEconomyAI';
describe('living economy AI',()=>{
 it('responds to strategic resource stress',()=>{const s=makeInitialState(),b=s.countries.BGR,stressed={...b,resources:{...b.resources,oil:1},resourceProduction:{...b.resourceProduction,oil:0},processedResources:{...b.processedResources,fuel:5},ai:{...b.ai,strategicGoal:'secure_resources' as const}};const next=processLivingEconomyAI({...s,day:7,countries:{...s.countries,BGR:stressed}});const imported=Object.values(next.tradeDeals).some(d=>d.buyerId==='BGR'&&d.resource==='oil');const moved=Object.values(next.countries.BGR.diplomacy.relations).some(r=>r.score!==0||r.treaties.includes('trade'));expect(imported||moved).toBe(true);});
});

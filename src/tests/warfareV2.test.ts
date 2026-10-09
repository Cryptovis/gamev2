import {withWarFuel} from './warFixture';
import { describe,expect,it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { applyGameCommand } from '../engine/commands';
import { getWarPreview,terrainForCountry } from '../engine/systems/warfare';
describe('warfare v2',()=>{
 it('creates a theatre with supply and air state',()=>{let s=makeInitialState();const p=getWarPreview(s.countries.TUR,s.countries.GRC);expect(p.attackerSupply).toBeGreaterThan(0);s=applyGameCommand(withWarFuel(s),{type:'military/declareWar',targetCountryId:'GRC'});const w=Object.values(s.wars)[0];expect(w.terrain).toBe(terrainForCountry(s.countries.GRC));expect(w.attackerSupply).toBeGreaterThan(0);});
 it('permits one assault per game day and accumulates exhaustion',()=>{let s=makeInitialState();s=applyGameCommand(withWarFuel(s),{type:'military/declareWar',targetCountryId:'GRC'});const id=Object.values(s.wars)[0].id;s=applyGameCommand(s,{type:'military/assault',warId:id});const rounds=s.wars[id].rounds;expect(s.wars[id].attackerExhaustion).toBeGreaterThan(0);const same=applyGameCommand(s,{type:'military/assault',warId:id});expect(same.wars[id].rounds).toBe(rounds);});
});

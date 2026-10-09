import {withWarFuel} from './warFixture';
import { describe, expect, it } from 'vitest';
import { applyGameCommand } from '../engine/commands';
import { makeInitialState } from '../data/initialState';
import { snapshotGame } from '../persistence/snapshot';

describe('Demo 0.1 smoke flow',()=>{
  it('supports diplomacy, trade, war, time and a serializable snapshot',()=>{
    let state=makeInitialState();
    state=applyGameCommand(state,{type:'diplomacy/improveRelations',targetCountryId:'GRC'});
    state=applyGameCommand(state,{type:'diplomacy/signTradePact',targetCountryId:'GRC'});
    state=applyGameCommand(state,{type:'trade/createImport',targetCountryId:'GRC',resource:'oil'});
    state=applyGameCommand(state,{type:'time/advanceDay'});
    state=applyGameCommand(withWarFuel(state),{type:'military/declareWar',targetCountryId:'GRC'});
    const war=Object.values(state.wars)[0];
    state=applyGameCommand(state,{type:'military/assault',warId:war.id});
    const saved=snapshotGame(state);
    expect(saved.day).toBeGreaterThan(1);
    expect(saved.wars[war.id].rounds).toBe(1);
    expect(()=>structuredClone(saved)).not.toThrow();
  });
});

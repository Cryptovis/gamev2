import { describe,expect,it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { relationFor, relationshipIndex, relationshipStance, sendResourceGift, sendTreasuryGift } from '../engine/systems/diplomacy';

describe('relations v2',()=>{
 it('maps legacy bilateral score to a 0-100 relationship index',()=>{
  const state=makeInitialState();
  const relation=relationFor(state.countries.TUR,'GRC');
  const index=relationshipIndex(relation);
  expect(index).toBeGreaterThanOrEqual(0);
  expect(index).toBeLessThanOrEqual(100);
  expect(relationshipStance(relation)).toBeTruthy();
 });
 it('treasury aid transfers funds and improves relations',()=>{
  const state=makeInitialState();
  const before=relationFor(state.countries.TUR,'GRC').score;
  const next=sendTreasuryGift(state,'TUR','GRC',1);
  expect(next.countries.TUR.economy.treasury).toBe(state.countries.TUR.economy.treasury-1);
  expect(relationFor(next.countries.TUR,'GRC').score).toBeGreaterThan(before);
 });
 it('resource aid transfers stock and improves relations',()=>{
  const state=makeInitialState();
  const before=state.countries.TUR.resources.food;
  const next=sendResourceGift(state,'TUR','GRC','food');
  expect(next.countries.TUR.resources.food).toBeLessThan(before);
  expect(next.countries.GRC.resources.food).toBeGreaterThan(state.countries.GRC.resources.food);
 });
});

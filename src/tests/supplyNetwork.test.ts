import { describe,expect,it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { calculateSupplyNetwork } from '../engine/systems/supplyNetwork';

describe('supply network',()=>{
 it('produces bounded operational logistics metrics',()=>{
  const c=makeInitialState().countries.TUR;
  const s=calculateSupplyNetwork(c,'mountain','attacker');
  expect(s.supplyScore).toBeGreaterThanOrEqual(5);
  expect(s.supplyScore).toBeLessThanOrEqual(100);
  expect(s.stages).toHaveLength(4);
  expect(s.fuelDays).toBeGreaterThanOrEqual(0);
 });
 it('mountain attack is harder than plains attack',()=>{
  const c=makeInitialState().countries.TUR;
  expect(calculateSupplyNetwork(c,'mountain','attacker').supplyScore).toBeLessThan(calculateSupplyNetwork(c,'plains','attacker').supplyScore);
 });
});

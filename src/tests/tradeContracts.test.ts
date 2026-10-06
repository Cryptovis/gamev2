import { describe,expect,it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { addTreaty } from '../engine/systems/diplomacy';
import { makeLongTermImportContract, processTradeDeals } from '../engine/systems/trade';

describe('long-term trade contracts',()=>{
 it('creates a fixed-price monthly contract with an expiry',()=>{
  let state=makeInitialState();
  state=addTreaty(state,'TUR','AZE','trade');
  const deal=makeLongTermImportContract(state,'TUR','AZE','oil',3);
  expect(deal?.contractType).toBe('long_term');
  expect(deal?.deliveryIntervalDays).toBe(30);
  expect(deal?.expiresDay).toBe(state.day+1095);
 });
 it('waits until the scheduled delivery day',()=>{
  let state=makeInitialState();
  state=addTreaty(state,'TUR','AZE','trade');
  const deal=makeLongTermImportContract(state,'TUR','AZE','oil',1);
  if(!deal) throw new Error('expected contract');
  state={...state,tradeDeals:{[deal.id]:deal}};
  const before=state.countries.TUR.resources.oil;
  const next=processTradeDeals(state);
  expect(next.countries.TUR.resources.oil).toBe(before);
 });
});

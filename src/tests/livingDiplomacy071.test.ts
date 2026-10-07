import { describe,expect,it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { openEmbassy, embassyFor, relationFor } from '../engine/systems/diplomacy';
import { getTradeQuote } from '../engine/systems/trade';
import { resolveDiplomaticOffer } from '../engine/systems/diplomaticOffers';
import { maybeTriggerEvent } from '../engine/systems/events';

describe('Living Diplomacy 0.71 foundation',()=>{
 it('opens an embassy and improves bilateral relations',()=>{
  const state=makeInitialState();
  const before=relationFor(state.countries.TUR,'GRC').score;
  const next=openEmbassy(state,'TUR','GRC',1);
  expect(embassyFor(next,'TUR','GRC')?.level).toBe(1);
  expect(relationFor(next.countries.TUR,'GRC').score).toBeGreaterThan(before);
 });

 it('embassy lowers bilateral trade friction',()=>{
  const state=makeInitialState();
  const plain=getTradeQuote(state,'AZE','oil',undefined,'TUR').price;
  const withEmbassy=openEmbassy(state,'TUR','AZE',2);
  const boosted=getTradeQuote(withEmbassy,'AZE','oil',undefined,'TUR').price;
  expect(boosted).toBeLessThan(plain);
 });

 it('accepting an embassy offer creates a mission',()=>{
  const state=makeInitialState();
  const withOffer={...state,diplomaticOffers:[{id:'offer-1',type:'embassy' as const,senderId:'GRC',receiverId:'TUR',createdDay:1,expiresDay:30,message:'test'}]};
  const next=resolveDiplomaticOffer(withOffer,'offer-1',true);
  expect(embassyFor(next,'TUR','GRC')).not.toBeNull();
  expect(next.diplomaticOffers).toHaveLength(0);
 });

 it('soft domestic agenda does not roll every day',()=>{
  const state={...makeInitialState(),day:22,eventCooldownUntil:0};
  const next=maybeTriggerEvent(state);
  expect(next.activeEvent).toBeNull();
 });
});

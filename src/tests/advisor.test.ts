import { describe,expect,it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { maybeCreateResourceAdvisor } from '../engine/systems/advisor';

describe('resource advisor',()=>{
 it('preserves preferred speed while pausing for a decision',()=>{
  const base=makeInitialState();
  const player={...base.countries.TUR,resources:{...base.countries.TUR.resources,food:1}};
  const aze={...base.countries.AZE,resourceProduction:{...base.countries.AZE.resourceProduction,food:20}};
  const state={...base,day:10,speed:3 as const,preferredSpeed:3 as const,countries:{...base.countries,TUR:player,AZE:aze}};
  const next=maybeCreateResourceAdvisor(state);
  if(next.activeAdvisor){
   expect(next.speed).toBe(0);
   expect(next.preferredSpeed).toBe(3);
  } else {
   expect(next.advisorCooldownUntil).toBeGreaterThanOrEqual(state.day);
  }
 });
});

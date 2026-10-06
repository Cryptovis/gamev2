import { describe,expect,it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { processWorldDiplomacy } from '../engine/systems/worldDynamics';

describe('world dynamics',()=>{
 it('evolves AI bilateral diplomacy on review cycles',()=>{
  const state=makeInitialState();
  const next=processWorldDiplomacy({...state,day:14});
  expect(next).not.toBe(state);
  const changed=Object.values(next.countries).some((country)=>country.id!==state.playerCountryId&&Object.values(country.diplomacy.relations).some((relation)=>relation.score!==0||relation.treaties.length>0));
  expect(changed).toBe(true);
 });
});

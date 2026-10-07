import { describe, expect, it } from 'vitest';
import { initialCountries } from '../data/countries';
import { makeInitialState } from '../data/initialState';
import { tickCountry, tickGame } from '../engine/tick';

describe('simulation tick',()=>{
  it('advances the game by one day',()=>expect(tickGame(makeInitialState()).day).toBe(2));
  it('changes country economy and resources',()=>{const before=initialCountries.TUR;const after=tickCountry(before);expect(after.economy.treasury).not.toBe(before.economy.treasury);expect(after.resources.iron).not.toBe(before.resources.iron);});
  it('does not mutate the original country',()=>{const before=structuredClone(initialCountries.TUR);tickCountry(initialCountries.TUR);expect(initialCountries.TUR).toEqual(before);});
});

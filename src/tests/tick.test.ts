import { describe, expect, it } from 'vitest';
import { initialCountries } from '../data/countries';
import { tickCountry, tickGame } from '../engine/tick';
import type { GameState } from '../domain/game';

const makeState=():GameState=>({schemaVersion:7,simulationSeed:123,day:1,speed:0,campaignStatus:'active',playerCountryId:'TUR',selectedCountryId:'TUR',mapMode:'political',mapNotice:null,countries:structuredClone(initialCountries),tradeDeals:{},wars:{},blocs:{},council:{influenceByCountry:{TUR:28},history:[]},activeEvent:null,eventCooldownUntil:12,lastAiDay:1,sitrep:[]});

describe('simulation tick',()=>{
  it('advances the game by one day',()=>expect(tickGame(makeState()).day).toBe(2));
  it('changes country economy and resources',()=>{const before=initialCountries.TUR;const after=tickCountry(before);expect(after.economy.treasury).not.toBe(before.economy.treasury);expect(after.resources.iron).not.toBe(before.resources.iron);});
  it('does not mutate the original country',()=>{const before=structuredClone(initialCountries.TUR);tickCountry(initialCountries.TUR);expect(initialCountries.TUR).toEqual(before);});
});

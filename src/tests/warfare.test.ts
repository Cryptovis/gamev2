import {withWarFuel} from './warFixture';
import { describe, expect, it } from 'vitest';
import { applyGameCommand } from '../engine/commands';
import { makeInitialState } from '../data/initialState';

describe('warfare', () => {
  it('declares war symmetrically and produces deterministic casualties', () => {
    let state = makeInitialState();
    state = applyGameCommand(withWarFuel(state), { type: 'military/declareWar', targetCountryId: 'GRC' });
    const war = Object.values(state.wars)[0];
    expect(state.countries.TUR.diplomacy.relations.GRC.status).toBe('war');
    expect(state.countries.GRC.diplomacy.relations.TUR.status).toBe('war');
    const before = state.countries.GRC.military.personnel;
    state = applyGameCommand(state, { type: 'military/assault', warId: war.id });
    expect(state.countries.GRC.military.personnel).toBeLessThan(before);
    expect(state.wars[war.id].rounds).toBe(1);
  });
});

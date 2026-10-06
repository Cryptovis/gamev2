import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { applyGameCommand } from '../engine/commands';

it('improves bilateral relations and can sign a trade pact', () => {
  let state = makeInitialState();
  state = applyGameCommand(state, { type: 'diplomacy/improveRelations', targetCountryId: 'GRC' });
  state = applyGameCommand(state, { type: 'diplomacy/signTradePact', targetCountryId: 'GRC' });
  expect(state.countries.TUR.diplomacy.relations.GRC.treaties).toContain('trade');
  expect(state.countries.GRC.diplomacy.relations.TUR.treaties).toContain('trade');
});

describe('trade engine', () => {
  it('moves oil and money through a daily contract with an actual oil exporter', () => {
    let state = makeInitialState();
    state = applyGameCommand(state, { type: 'diplomacy/signTradePact', targetCountryId: 'AZE' });
    state = applyGameCommand(state, { type: 'trade/createImport', targetCountryId: 'AZE', resource: 'oil' });
    const before = state.countries.TUR.resources.oil;
    expect(Object.values(state.tradeDeals).some((deal) => deal.active && deal.sellerId === 'AZE')).toBe(true);
    state = applyGameCommand(state, { type: 'time/advanceDay' });
    expect(state.countries.TUR.resources.oil).toBeGreaterThan(before - 1);
  });
});

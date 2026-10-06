import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { getExportCapacity, getGlobalMarketPrice } from '../engine/systems/trade';
import { resourceStrategicStatus } from '../store/marketSelectors';

describe('strategic commodity ecosystem', () => {
  it('creates differentiated oil exporters', () => {
    const state = makeInitialState();
    expect(getExportCapacity(state.countries.SAU, 'oil')).toBeGreaterThan(getExportCapacity(state.countries.CHE, 'oil'));
    expect(resourceStrategicStatus(state.countries.SAU, 'oil')).toBe('EXPORTER');
  });

  it('derives a positive global market price for every commodity', () => {
    const state = makeInitialState();
    for (const resource of ['food','oil','iron','uranium'] as const) expect(getGlobalMarketPrice(state, resource)).toBeGreaterThan(0);
  });
});

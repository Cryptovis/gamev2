import { describe, expect, it } from 'vitest';
import { applyGameCommand } from '../engine/commands';
import { makeInitialState } from '../data/initialState';

describe('command layer', () => {
  it('changes tax policy without mutating the input state', () => {
    const state = makeInitialState();
    const originalTaxRate = state.countries.TUR.economy.taxRate;
    const next = applyGameCommand(state, { type: 'economy/setTaxRate', rate: 33 });
    expect(next.countries.TUR.economy.taxRate).toBe(33);
    expect(state.countries.TUR.economy.taxRate).toBe(originalTaxRate);
  });

  it('clamps invalid tax policy', () => {
    const next = applyGameCommand(makeInitialState(), { type: 'economy/setTaxRate', rate: 99 });
    expect(next.countries.TUR.economy.taxRate).toBe(60);
  });

  it('advances time through the same deterministic command path', () => {
    const next = applyGameCommand(makeInitialState(), { type: 'time/advanceDay' });
    expect(next.day).toBe(2);
  });
});

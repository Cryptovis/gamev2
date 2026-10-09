import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { simulateEconomy } from '../engine/systems/economy';
import { simulateResources } from '../engine/systems/resources';

// Audit C4 (0.85): debt carries interest and high tax rates dampen growth.
describe('economy 0.85 — debt service and tax friction', () => {
  const base = () => makeInitialState().countries.DEU;

  it('charges interest on debt, and more interest for higher leverage', () => {
    const c = base();
    const low = { ...c, economy: { ...c.economy, debt: c.economy.gdp * 0.1 } };
    const high = { ...c, economy: { ...c.economy, debt: c.economy.gdp * 1.5 } };
    const lf = simulateEconomy(low, simulateResources(low));
    const hf = simulateEconomy(high, simulateResources(high));
    expect(lf.debtService).toBeGreaterThan(0);
    expect(hf.debtService).toBeGreaterThan(lf.debtService);
    expect(hf.dailyBalance).toBeLessThan(lf.dailyBalance);
  });

  it('does not change growth for tax rates up to 25%', () => {
    const c = base();
    const at = (taxRate: number) => {
      const k = { ...c, economy: { ...c.economy, taxRate } };
      return simulateEconomy(k, simulateResources(k)).dailyGrowthRate;
    };
    expect(at(20)).toBeCloseTo(at(25), 12);
  });

  it('lowers growth above 25% tax, and the penalty is floored', () => {
    const c = base();
    const at = (taxRate: number) => {
      const k = { ...c, economy: { ...c.economy, taxRate } };
      return simulateEconomy(k, simulateResources(k)).dailyGrowthRate;
    };
    expect(at(40)).toBeLessThan(at(25));
    // Friction is floored at 70%: 60% and 90% tax both hit the floor and must give identical growth.
    expect(at(90)).toBeCloseTo(at(60), 12);
  });
});

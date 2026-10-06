import { describe, expect, it } from 'vitest';
import { initialCountries } from '../data/countries';
import { simulateEconomy } from '../engine/systems/economy';
import { simulateResources } from '../engine/systems/resources';

describe('economy and resource systems', () => {
  it('balances resource production against consumption', () => {
    const flow = simulateResources(initialCountries.TUR);
    expect(flow.next.food).toBeGreaterThanOrEqual(0);
    expect(flow.net.iron).not.toBeNaN();
  });

  it('derives treasury movement from revenue and spending', () => {
    const country = initialCountries.TUR;
    const resources = simulateResources(country);
    const economy = simulateEconomy(country, resources);
    expect(economy.next.treasury).toBeCloseTo(country.economy.treasury + economy.dailyBalance, 8);
  });
});

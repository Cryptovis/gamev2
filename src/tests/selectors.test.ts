import { describe, expect, it } from 'vitest';
import { initialCountries } from '../data/countries';
import { calculateIndustrialOutput, calculateMilitaryPower } from '../store/selectors';

describe('derived selectors', () => {
  it('calculates military power without storing a flat power value', () => {
    expect(calculateMilitaryPower(initialCountries.TUR)).toBeGreaterThan(0);
    expect('power' in initialCountries.TUR.military).toBe(false);
  });

  it('calculates industrial output', () => {
    expect(calculateIndustrialOutput(initialCountries.TUR)).toBeGreaterThan(0);
  });
});

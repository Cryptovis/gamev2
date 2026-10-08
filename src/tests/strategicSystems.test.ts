import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { setMinistryAllocation } from '../engine/systems/ministries';
import { processIndustry } from '../engine/systems/industry';
import { unlockTechnology } from '../engine/systems/technology';
import { formBloc } from '../engine/systems/blocs';
import { proposeCouncilResolution } from '../engine/systems/council';

const totalAllocation = (country: ReturnType<typeof makeInitialState>['countries'][string]) => Object.values(country.ministries.allocations).reduce((sum, value) => sum + value, 0);

describe('strategic command systems', () => {
  it('rebalances ministry allocations to roughly 100 percent', () => {
    const state = makeInitialState();
    const turkey = state.countries.TUR;
    const next = setMinistryAllocation(turkey, 'science', 30);
    expect(next.ministries.allocations.science).toBe(30);
    expect(totalAllocation(next)).toBeCloseTo(100, 1);
  });

  it('converts raw commodities into processed industrial resources', () => {
    const state = makeInitialState();
    const turkey = state.countries.TUR;
    const next = processIndustry(turkey);
    expect(next.processedResources.fuel).toBeGreaterThan(turkey.processedResources.fuel);
    expect(next.processedResources.steel).toBeGreaterThan(turkey.processedResources.steel);
    expect(next.resources.oil).toBeLessThan(turkey.resources.oil);
  });

  it('starts affordable research and spends points without an instant unlock', () => {
    const state = makeInitialState();
    const player = state.countries.TUR;
    const boosted = { ...player, technology: { ...player.technology, researchPoints: 100 } };
    const prepared = { ...state, countries: { ...state.countries, TUR: boosted } };
    const next = unlockTechnology(prepared, 'TUR', 'econ-logistics');
    expect(next.countries.TUR.technology.unlocked).not.toContain('econ-logistics');
    expect(next.countries.TUR.technology.project?.technologyId).toBe('econ-logistics');
    expect(next.countries.TUR.technology.researchPoints).toBeLessThan(100);
  });

  it('forms a bloc only from a qualifying alliance', () => {
    const state = makeInitialState();
    const turkey = state.countries.TUR;
    const azerbaijan = state.countries.AZE;
    const prepared = {
      ...state,
      countries: {
        ...state.countries,
        TUR: { ...turkey, economy: { ...turkey.economy, treasury: 100 }, diplomacy: { ...turkey.diplomacy, relations: { ...turkey.diplomacy.relations, AZE: { score: 75, status: 'ally' as const, treaties: ['alliance' as const], sanctions: false } } } },
        AZE: { ...azerbaijan, diplomacy: { ...azerbaijan.diplomacy, relations: { ...azerbaijan.diplomacy.relations, TUR: { score: 75, status: 'ally' as const, treaties: ['alliance' as const], sanctions: false } } } },
      },
    };
    const next = formBloc(prepared, 'AZE');
    expect(Object.values(next.blocs)).toHaveLength(1);
    expect(Object.values(next.blocs)[0].memberIds).toContain('AZE');
  });

  it('records deterministic Global Council resolutions', () => {
    const state = makeInitialState();
    const prepared = { ...state, council: { ...state.council, influenceByCountry: { ...state.council.influenceByCountry, TUR: 100 } } };
    const next = proposeCouncilResolution(prepared, 'humanitarian_aid', 'SYR');
    expect(next.council.history).toHaveLength(1);
    expect(next.council.history[0].supportPercent).toBeGreaterThanOrEqual(0);
    expect(next.council.influenceByCountry.TUR).toBeLessThan(100);
  });
});

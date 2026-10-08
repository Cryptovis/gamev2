import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { GameState, TradeResource } from '../domain/game';
import { processLivingEconomyAI } from '../engine/systems/livingEconomyAI';
import { getExportCapacity } from '../engine/systems/trade';
import { maybeTriggerEvent } from '../engine/systems/events';
import { tickGame } from '../engine/tick';
import { energyFor, processEnergyAI } from '../engine/systems/energy';
import { addTreaty } from '../engine/systems/diplomacy';
import { foodReserveDays, simulateResources, SHORTAGE_RESERVE_DAYS } from '../engine/systems/resources';

const committed = (state: GameState, sellerId: string, resource: TradeResource, ids: Set<string>) =>
  Object.values(state.tradeDeals).filter((deal) => deal.active && ids.has(deal.id) && deal.sellerId === sellerId && deal.resource === resource)
    .reduce((sum, deal) => sum + deal.quantityPerDay, 0);

describe('0.84 audit integration fixes', () => {
  it('spreads weekly AI imports across sellers instead of over-committing one supplier', () => {
    // Let reserves draw down for a few weeks so importers appear, then run one AI trade week in isolation.
    let state: GameState = makeInitialState();
    for (let i = 0; i < 40; i++) state = { ...tickGame({ ...state, activeEvent: null }), activeEvent: null };
    state = { ...state, day: 42 };
    const before = new Set(Object.keys(state.tradeDeals));
    const next = processLivingEconomyAI(state);
    const added = new Set(Object.keys(next.tradeDeals).filter((id) => !before.has(id)));
    expect(added.size).toBeGreaterThan(0);
    for (const deal of Object.values(next.tradeDeals).filter((d) => added.has(d.id))) {
      const capacity = getExportCapacity(state.countries[deal.sellerId], deal.resource);
      // Each new deal was sized while capacity remained; together they must not exceed the seller's weekly capacity by more than one deal.
      expect(committed(next, deal.sellerId, deal.resource, added)).toBeLessThanOrEqual(capacity + deal.quantityPerDay + 1e-9);
    }
  });

  it('raises the food crisis before the resources.ts shortage threshold is reached', () => {
    const state = makeInitialState();
    state.day = 40; state.eventCooldownUntil = 0;
    const player = state.countries[state.playerCountryId];
    // Force a structural food deficit: a reserve between the event threshold and the shortage threshold.
    player.resourceProduction.food = 0;
    const flow = simulateResources(player);
    const perDay = flow.consumption.food - flow.production.food;
    expect(perDay).toBeGreaterThan(0);
    player.resources.food = perDay * (SHORTAGE_RESERVE_DAYS * 1.5);
    expect(foodReserveDays(player)).toBeGreaterThan(SHORTAGE_RESERVE_DAYS);
    expect(maybeTriggerEvent(state).activeEvent?.kind).toBe('food_crisis');
  });

  it('applies the per-capita food floor to countries loaded from pre-0.84 saves', () => {
    const state = makeInitialState();
    const china = state.countries.CHN;
    const floored = simulateResources(china).production.food;
    // A 0.83 save kept the catalog's 7/day cap for populous countries; the floor must still apply at runtime.
    china.resourceProduction.food = 7;
    expect(simulateResources(china).production.food).toBeCloseTo(floored, 6);
    expect(foodReserveDays(china)).toBeGreaterThanOrEqual(365);
  });

  it('counts contracted imports when testing for an oil shortage', () => {
    const state = makeInitialState();
    const japan = { ...state.countries.JPN, resources: { ...state.countries.JPN.resources, oil: 1 } };
    const flow = simulateResources(japan);
    const deficit = flow.consumption.oil - flow.production.oil;
    expect(flow.oilShortage).toBe(true);
    expect(simulateResources(japan, 1, { oil: deficit + 0.1 }).oilShortage).toBe(false);
  });

  it('lets an AI importer whose food need is covered go on to import oil', () => {
    let state: GameState = makeInitialState();
    const id = 'IND';
    const flow = simulateResources(state.countries[id]);
    state = {
      ...state, day: 42,
      countries: { ...state.countries, [id]: { ...state.countries[id], resources: { ...state.countries[id].resources, oil: 5, food: 50 } } },
      tradeDeals: { ...state.tradeDeals, 'IMP-TEST-food': { id: 'IMP-TEST-food', sellerId: 'BRA', buyerId: id, resource: 'food', quantityPerDay: Math.max(0.1, flow.consumption.food - flow.production.food + 1), pricePerUnit: 0.01, active: true } },
    };
    // Give India trade pacts so the test isolates need selection from relationship building.
    for (const other of Object.keys(state.countries)) if (other !== id && other !== state.playerCountryId) state = addTreaty(state, id, other, 'trade');
    const next = processLivingEconomyAI(state);
    expect(Object.values(next.tradeDeals).some((d) => d.active && d.buyerId === id && d.resource === 'oil')).toBe(true);
  });

  it('allows an AI country in a deep power outage to run several plant projects at once', () => {
    let state: GameState = makeInitialState();
    state = { ...state, day: 14 };
    const id = 'IND';
    const energy = { ...energyFor(state, id), lastCoverage: 60, lastGeneration: 1, lastDemand: 10, projects: [] };
    state = { ...state, countries: { ...state.countries, [id]: { ...state.countries[id], economy: { ...state.countries[id].economy, treasury: 5000 } } }, world: { ...state.world, energy: { ...state.world.energy, [id]: energy } } };
    let next = state;
    for (let i = 0; i < 3; i++) next = processEnergyAI({ ...next, day: 14 * (i + 1) });
    expect(energyFor(next, id).projects.length).toBeGreaterThan(1);
  });
});

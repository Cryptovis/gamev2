import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { GameState, TradeResource } from '../domain/game';
import { processLivingEconomyAI } from '../engine/systems/livingEconomyAI';
import { getExportCapacity } from '../engine/systems/trade';
import { maybeTriggerEvent } from '../engine/systems/events';
import { tickGame } from '../engine/tick';
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
});

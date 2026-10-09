import {activeCountries} from '../domain/sovereignty';
import type { CountryState, GameState, TradeResource } from '../domain/game';
import { simulateResources } from '../engine/systems/resources';
import { getGlobalMarketPrice } from '../engine/systems/trade';
import { rankSuppliers } from '../engine/systems/tradeOptions';

export const MARKET_RESOURCES: TradeResource[] = ['food','oil','iron','uranium'];

export function resourceSelfSufficiency(country: CountryState, resource: TradeResource) {
  const flow = simulateResources(country);
  return flow.consumption[resource] <= 0 ? 999 : flow.production[resource] / flow.consumption[resource];
}

export function resourceReserveDays(country: CountryState, resource: TradeResource) {
  const flow = simulateResources(country);
  const consumption = flow.consumption[resource];
  if (consumption <= 0.0001) return 9999;
  return country.resources[resource] / consumption;
}

export function resourceStrategicStatus(country: CountryState, resource: TradeResource): 'EXPORTER'|'BALANCED'|'IMPORT NEED'|'CRITICAL' {
  const flow = simulateResources(country);
  const sufficiency = resourceSelfSufficiency(country, resource);
  const days = resourceReserveDays(country, resource);
  if (days < 20 || (flow.net[resource] < 0 && days < 60)) return 'CRITICAL';
  if (sufficiency >= 1.2 && flow.net[resource] > 0) return 'EXPORTER';
  if (sufficiency < 0.8 || flow.net[resource] < -0.2) return 'IMPORT NEED';
  return 'BALANCED';
}

/**
 * Suppliers of a raw resource for a buyer, best first (0.89 trade discovery): open routes, then countries one
 * trade pact away. Countries without access or surplus are left out; `rankSuppliers` explains them.
 */
export function findBestSuppliers(state: GameState, buyerId: string, resource: TradeResource, limit = 4) {
  return rankSuppliers(state, buyerId, resource)
    .filter((option) => option.tier <= 1)
    .slice(0, limit)
    .map((option) => ({ seller: state.countries[option.sellerId], relation: state.countries[buyerId]?.diplomacy.relations[option.sellerId], available: option.available, price: option.price, quantity: option.suggestedQuantity, dailyCost: option.suggestedQuantity * option.price, option }));
}

export function getMarketBoard(state: GameState) {
  return MARKET_RESOURCES.map((resource) => ({ resource, price: getGlobalMarketPrice(state, resource) }));
}

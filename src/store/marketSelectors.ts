import type { CountryState, GameState, TradeResource } from '../domain/game';
import { simulateResources } from '../engine/systems/resources';
import { getGlobalMarketPrice, getTradeQuote } from '../engine/systems/trade';

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

export function findBestSuppliers(state: GameState, buyerId: string, resource: TradeResource, limit = 4) {
  const buyer = state.countries[buyerId];
  if (!buyer) return [];
  const marketPrice = getGlobalMarketPrice(state, resource);
  return Object.values(state.countries)
    .filter((seller) => seller.id !== buyerId)
    .map((seller) => {
      const relation = buyer.diplomacy.relations[seller.id];
      const quote = getTradeQuote(state, seller.id, resource, marketPrice);
      return { seller, relation, ...quote };
    })
    .filter((item) => item.available > 0.05 && item.relation?.status !== 'war' && !item.relation?.sanctions)
    .sort((a,b) => (b.available * 2 - b.price * 10) - (a.available * 2 - a.price * 10))
    .slice(0, limit);
}

export function getMarketBoard(state: GameState) {
  return MARKET_RESOURCES.map((resource) => ({ resource, price: getGlobalMarketPrice(state, resource) }));
}

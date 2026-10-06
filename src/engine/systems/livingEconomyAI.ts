import type { GameState, TradeResource } from '../../domain/game';
import { addTreaty, changeRelations, relationFor } from './diplomacy';
import { getExportCapacity, getGlobalMarketPrice, makeBilateralImportDeal } from './trade';
import { simulateResources } from './resources';

const resources: TradeResource[] = ['food','oil','iron','uranium'];

export function processLivingEconomyAI(state: GameState): GameState {
  if (state.day % 7 !== 0) return state;

  const countryList = Object.values(state.countries);
  const flows = Object.fromEntries(countryList.map((country) => [country.id, simulateResources(country)]));
  const marketPrices = Object.fromEntries(resources.map((resource) => [resource, getGlobalMarketPrice(state, resource)])) as Record<TradeResource, number>;
  const exportCapacity = Object.fromEntries(countryList.map((country) => [
    country.id,
    Object.fromEntries(resources.map((resource) => [resource, getExportCapacity(country, resource)])) as Record<TradeResource, number>,
  ])) as Record<string, Record<TradeResource, number>>;

  const reserveDays = (countryId: string, resource: TradeResource) => {
    const country = state.countries[countryId];
    const consumption = flows[countryId].consumption[resource];
    return consumption <= 0.0001 ? 9999 : country.resources[resource] / consumption;
  };

  const needScore = (countryId: string, resource: TradeResource) => {
    const country = state.countries[countryId];
    const flow = flows[countryId];
    const days = reserveDays(countryId, resource);
    return (flow.net[resource] < 0 ? 35 : 0)
      + (days < 30 ? 50 : days < 75 ? 25 : 0)
      + (country.ai.strategicGoal === 'secure_resources' ? 18 : 0)
      + (resource === 'oil' && country.processedResources.fuel < 25 ? 22 : 0);
  };

  let next = state;
  const notices: string[] = [];

  for (const initialBuyer of countryList) {
    const buyer = next.countries[initialBuyer.id];
    if (!buyer || buyer.id === next.playerCountryId || buyer.controllerCountryId || buyer.globalSanctions) continue;
    if (Object.values(next.tradeDeals).filter((deal) => deal.active && deal.buyerId === buyer.id).length >= 4) continue;

    const need = resources
      .map((resource) => ({ resource, score: needScore(buyer.id, resource) }))
      .sort((a, b) => b.score - a.score)[0];

    if (!need || need.score < 45) continue;
    if (Object.values(next.tradeDeals).some((deal) => deal.active && deal.buyerId === buyer.id && deal.resource === need.resource)) continue;

    const supplier = countryList
      .filter((candidate) => candidate.id !== buyer.id && exportCapacity[candidate.id][need.resource] > 0.05)
      .map((candidate) => {
        const relation = relationFor(next.countries[buyer.id], candidate.id);
        const score = exportCapacity[candidate.id][need.resource] * 24
          + relation.score * 0.3
          - (candidate.globalSanctions ? 999 : 0)
          - (relation.status === 'war' ? 999 : 0)
          - marketPrices[need.resource] * 4;
        return { candidate, score };
      })
      .sort((a, b) => b.score - a.score)[0];

    if (!supplier || supplier.score < -10) continue;
    let relation = relationFor(next.countries[buyer.id], supplier.candidate.id);
    if (relation.score < -25 || relation.status === 'war' || relation.sanctions) continue;

    if (!relation.treaties.includes('trade')) {
      if (relation.score < 5) {
        next = changeRelations(next, buyer.id, supplier.candidate.id, 2);
        continue;
      }
      next = addTreaty(next, buyer.id, supplier.candidate.id, 'trade');
      relation = relationFor(next.countries[buyer.id], supplier.candidate.id);
    }

    if (!relation.treaties.includes('trade')) continue;
    const deal = makeBilateralImportDeal(next, buyer.id, supplier.candidate.id, need.resource);
    if (!deal) continue;

    next = { ...next, tradeDeals: { ...next.tradeDeals, [deal.id]: deal } };
    notices.push(`AI TRADE // ${buyer.name} secured ${need.resource.toUpperCase()} imports from ${supplier.candidate.name}.`);
  }

  return { ...next, sitrep: [...notices, ...next.sitrep].slice(0, 12) };
}

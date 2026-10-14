import {leaderModifiers} from './leaderPerks';
import {activeCountries} from '../../domain/sovereignty';
import type { GameState, TradeResource } from '../../domain/game';
import { changeRelations, relationFor } from './diplomacy';
import { aiProposeAgreement } from './treaties';
import { cargoFlight } from './flightHooks';
import { getExportCapacity, getGlobalMarketPrice, makeBilateralImportDeal } from './trade';
import { simulateResources } from './resources';

const resources: TradeResource[] = ['food','oil','iron','uranium'];

export function processLivingEconomyAI(state: GameState): GameState {
  if (state.day % 7 !== 0) return state;

  const countryList = activeCountries(state.countries);
  const flows = Object.fromEntries(countryList.map((country) => [country.id, simulateResources(country,1,undefined,leaderModifiers(state,country.id).consumer)]));
  const marketPrices = Object.fromEntries(resources.map((resource) => [resource, getGlobalMarketPrice(state, resource)])) as Record<TradeResource, number>;
  const exportCapacity = Object.fromEntries(countryList.map((country) => [
    country.id,
    Object.fromEntries(resources.map((resource) => [resource, getExportCapacity(country, resource,leaderModifiers(state,country.id).consumer)])) as Record<TradeResource, number>,
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

    // Pick the most urgent need not yet covered by contracted imports, so a covered food need cannot block oil
    // forever and a large importer can add a second supplier when one deal does not close its deficit.
    const buying = Object.values(next.tradeDeals).filter((deal) => deal.active && deal.buyerId === buyer.id);
    const contracted = (resource: TradeResource) => buying.filter((deal) => deal.resource === resource).reduce((sum, deal) => sum + deal.quantityPerDay, 0);
    const covered = (resource: TradeResource) => buying.some((deal) => deal.resource === resource) && flows[buyer.id].net[resource] + contracted(resource) >= 0;
    const need = resources
      .filter((resource) => !covered(resource))
      .map((resource) => ({ resource, score: needScore(buyer.id, resource) }))
      .sort((a, b) => b.score - a.score)[0];

    if (!need || need.score < 45) continue;

    const supplier = countryList
      // The player is never auto-signed as a supplier: pacts with the player need its consent (letters/offers).
      .filter((candidate) => candidate.id !== buyer.id && candidate.id !== next.playerCountryId && exportCapacity[candidate.id][need.resource] > 0.05
        && !buying.some((deal) => deal.sellerId === candidate.id && deal.resource === need.resource))
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
      // Same rules as a player proposal: eligibility, GDP-scaled fee, the supplier's acceptance roll and retry cooldown (audit D8).
      const proposal = aiProposeAgreement(next, buyer.id, supplier.candidate.id, 'trade');
      next = proposal.state;
      if (!proposal.accepted) continue;
      relation = relationFor(next.countries[buyer.id], supplier.candidate.id);
    }

    if (!relation.treaties.includes('trade')) continue;
    const deal = makeBilateralImportDeal(next, buyer.id, supplier.candidate.id, need.resource);
    if (!deal) continue;

    next = { ...next, tradeDeals: { ...next.tradeDeals, [deal.id]: deal } };
    next = cargoFlight(next, deal.sellerId, deal.buyerId, 'Trade cargo'); // rate-limited for AI–AI deals
    // Consume the supplier's weekly export capacity so later buyers spread across sellers instead of all signing with one.
    exportCapacity[supplier.candidate.id][need.resource] = Math.max(0, exportCapacity[supplier.candidate.id][need.resource] - deal.quantityPerDay);
    notices.push(`AI TRADE // ${buyer.name} secured ${need.resource.toUpperCase()} imports from ${supplier.candidate.name}.`);
  }

  return { ...next, sitrep: [...notices, ...next.sitrep].slice(0, 12) };
}

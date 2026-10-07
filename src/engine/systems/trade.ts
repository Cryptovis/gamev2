import type { CountryState, GameState, TradeDeal, TradeResource } from '../../domain/game';
import { simulateResources } from './resources';
import { changeRelations, embassyFor, embassyRelationBonus } from './diplomacy';

export const TRADE_PRICES: Record<TradeResource, number> = { food: 0.025, oil: 0.06, iron: 0.04, uranium: 0.22 };

const clamp = (v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));

function reserveFloor(country: CountryState, resource: TradeResource) {
  const popM = country.demographics.population / 1_000_000;
  if (resource === 'food') return Math.max(20, popM * 1.2);
  if (resource === 'oil') return Math.max(18, country.military.readiness * 0.22);
  if (resource === 'iron') return Math.max(20, country.industry.factories * 2.2);
  return country.industry.powerCapacity > 70 ? 2 : 0.5;
}

export function getGlobalMarketPrice(state: GameState, resource: TradeResource): number {
  let production = 0;
  let consumption = 0;
  for (const country of Object.values(state.countries)) {
    const flow = simulateResources(country);
    production += flow.production[resource];
    consumption += flow.consumption[resource];
  }
  const scarcity = clamp(consumption / Math.max(0.001, production), 0.65, 2.35);
  return Number((TRADE_PRICES[resource] * scarcity).toFixed(4));
}

export function getExportCapacity(country: CountryState, resource: TradeResource): number {
  const flow = simulateResources(country);
  const floor = reserveFloor(country, resource);
  const stockExcess = Math.max(0, country.resources[resource] - floor);
  const structuralSurplus = Math.max(0, flow.net[resource]);
  const cap = structuralSurplus * 0.55 + stockExcess * 0.025;
  const max = resource === 'uranium' ? 0.35 : resource === 'oil' ? 3.2 : 5.5;
  return Number(clamp(cap, 0, max).toFixed(3));
}

export function getTradeQuote(state: GameState, sellerId: string, resource: TradeResource, marketPrice?: number, buyerId = state.playerCountryId) {
  const seller = state.countries[sellerId];
  const global = marketPrice ?? getGlobalMarketPrice(state, resource);
  if (!seller || seller.globalSanctions) return { available: 0, price: global, dailyCost: 0, quantity: 0 };
  const available = getExportCapacity(seller, resource);
  const abundanceDiscount = clamp(1 - available / (resource === 'uranium' ? 2.5 : 22), 0.78, 1.08);
  const embassy=embassyFor(state,buyerId,sellerId);
  const embassyDiscount=embassy?Math.max(.91,1-embassy.level*.02):1;
  const price = Number((global * abundanceDiscount * embassyDiscount).toFixed(4));
  const quantity = resource === 'uranium' ? Math.min(0.2, available) : Math.min(resource === 'oil' ? 1.5 : 2, available);
  return { available, price, dailyCost: Number((quantity * price).toFixed(4)), quantity };
}

export function processTradeDeals(state: GameState): GameState {
  let countries = state.countries;
  let tradeDeals = state.tradeDeals;
  const notices: string[] = [];
  const relationBonuses: Array<{a:string;b:string;delta:number}> = [];

  for (const deal of Object.values(state.tradeDeals)) {
    if (!deal.active) continue;
    if (deal.expiresDay && state.day > deal.expiresDay) {
      tradeDeals = { ...tradeDeals, [deal.id]: { ...deal, active: false } };
      notices.push(`TRADE // Long-term ${deal.resource.toUpperCase()} contract expired.`);
      continue;
    }

    const interval = Math.max(1, deal.deliveryIntervalDays ?? 1);
    const dueDay = deal.nextDeliveryDay ?? state.day;
    if (state.day < dueDay) continue;

    const seller = countries[deal.sellerId];
    const buyer = countries[deal.buyerId];
    if (!seller || !buyer || seller.globalSanctions || buyer.globalSanctions) continue;
    const access=buyer.diplomacy.relations[seller.id];
    if(!access?.treaties.includes('trade')||access.sanctions||access.status==='war')continue;

    const exportCap = getExportCapacity(seller, deal.resource);
    const quantity = Math.min(deal.quantityPerDay * interval, seller.resources[deal.resource], exportCap * interval);
    const cost = quantity * deal.pricePerUnit;

    if (quantity <= 0.0001 || buyer.economy.treasury < cost) {
      notices.push(`TRADE // ${buyer.name} ↔ ${seller.name} ${deal.resource.toUpperCase()} delivery delayed — supply or liquidity unavailable.`);
      tradeDeals = { ...tradeDeals, [deal.id]: { ...deal, nextDeliveryDay: state.day + interval } };
      continue;
    }

    countries = {
      ...countries,
      [seller.id]: {
        ...seller,
        economy: { ...seller.economy, treasury: seller.economy.treasury + cost },
        resources: { ...seller.resources, [deal.resource]: seller.resources[deal.resource] - quantity },
      },
      [buyer.id]: {
        ...buyer,
        economy: { ...buyer.economy, treasury: buyer.economy.treasury - cost },
        resources: { ...buyer.resources, [deal.resource]: buyer.resources[deal.resource] + quantity },
      },
    };

    tradeDeals = { ...tradeDeals, [deal.id]: { ...deal, nextDeliveryDay: state.day + interval } };
    relationBonuses.push({a:buyer.id,b:seller.id,delta:(interval>1?1:0.08)*embassyRelationBonus(state,buyer.id,seller.id)});
    if (interval > 1) notices.push(`TRADE // Monthly ${deal.resource.toUpperCase()} delivery from ${seller.name}: ${quantity.toFixed(1)} units for $${cost.toFixed(2)}B.`);
  }

  let next: GameState = { ...state, countries, tradeDeals, sitrep: [...notices, ...state.sitrep].slice(0, 12) };
  for (const bonus of relationBonuses) next = changeRelations(next,bonus.a,bonus.b,bonus.delta);
  return next;
}

export function makeBilateralImportDeal(state: GameState, buyerId: string, sellerId: string, resource: TradeResource): TradeDeal | null {
  const quote = getTradeQuote(state, sellerId, resource, undefined, buyerId);
  if (!quote.quantity || quote.quantity <= 0) return null;
  return { id: `IMP-${sellerId}-${buyerId}-${resource}`, sellerId, buyerId, resource, quantityPerDay: quote.quantity, pricePerUnit: quote.price, active: true };
}

export function makeImportDeal(state: GameState, targetCountryId: string, resource: TradeResource): TradeDeal | null {
  return makeBilateralImportDeal(state, state.playerCountryId, targetCountryId, resource);
}

export function makeLongTermImportContract(state: GameState, buyerId: string, sellerId: string, resource: TradeResource, years: 1|3|5|10): TradeDeal | null {
  const buyer=state.countries[buyerId],seller=state.countries[sellerId];
  const relation=buyer?.diplomacy.relations[sellerId];
  if(!buyer||!seller||buyerId===sellerId||buyer.globalSanctions||seller.globalSanctions||!relation?.treaties.includes('trade')||relation.sanctions||relation.status==='war'||![1,3,5,10].includes(years))return null;
  if(Object.values(state.tradeDeals).some(d=>d.active&&d.contractType==='long_term'&&d.buyerId===buyerId&&d.sellerId===sellerId&&d.resource===resource))return null;
  const quote = getTradeQuote(state, sellerId, resource, undefined, buyerId);
  if (!quote.quantity || quote.quantity <= 0) return null;
  const interval = 30;
  return {
    id: `LTC-${sellerId}-${buyerId}-${resource}-${state.day}`,
    sellerId, buyerId, resource,
    quantityPerDay: quote.quantity,
    pricePerUnit: quote.price,
    active: true,
    contractType: 'long_term',
    startDay: state.day,
    expiresDay: state.day + years * 365,
    deliveryIntervalDays: interval,
    nextDeliveryDay: state.day + interval,
    contractYears: years,
  };
}

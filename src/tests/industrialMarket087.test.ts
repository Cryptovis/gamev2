import { describe, expect, it } from 'vitest';
import { REFERENCE_PRICES, REFERENCE_UTILIZATION } from '../data/commodityPrices';
import { makeInitialState } from '../data/initialState';
import { FACILITIES, GOODS } from '../data/industrialCatalog';
import type { GameState } from '../domain/game';
import type { FacilityKind, IndustrialGood } from '../domain/industrial';
import { buildFacility, changeGoodStock, civilFactoryTarget, civilParkGdpGain, facilityDailyEconomics, goodStock, PARK_GDP_CAP, processIndustrialAI, processIndustrialEconomy } from '../engine/systems/industrialEconomy';
import { AI_CONTRACT_MAX_YEARS, aiPurchaseLimit, industrialBuyerDemand, industrialOrderError, placeIndustrialOrder, processIndustrialContracts } from '../engine/systems/industrialMarket';
import { TRADE_PRICES } from '../engine/systems/trade';
import { investmentReview } from '../engine/systems/investmentReview';

/** Player TUR and AI GRC share a trade pact and alliance; both are liquid. */
function ready(): GameState {
  const s = makeInitialState();
  for (const id of ['TUR', 'GRC']) { s.countries[id].economy.treasury = 500; s.countries[id].processedResources.electricity = 500; }
  s.countries.TUR.diplomacy.relations.GRC = { ...s.countries.TUR.diplomacy.relations.GRC, score: 90, status: 'ally', treaties: ['trade', 'alliance'], sanctions: false };
  s.countries.GRC.diplomacy.relations.TUR = { ...s.countries.GRC.diplomacy.relations.TUR, score: 90, status: 'ally', treaties: ['trade', 'alliance'], sanctions: false };
  return s;
}

describe('0.87 industrial market: one price scale (C10)', () => {
  it('raw resources and industrial goods read one reference table', () => {
    for (const good of Object.keys(GOODS) as IndustrialGood[]) expect(GOODS[good].price).toBe(REFERENCE_PRICES[good]);
    for (const resource of ['food', 'oil', 'iron', 'uranium'] as const) expect(TRADE_PRICES[resource]).toBe(REFERENCE_PRICES[resource]);
  });

  it('refining oil into fuel and iron into steel adds value instead of destroying 98% of it', () => {
    // industry.ts: 1 oil -> 0.9 fuel, 1 iron -> 0.86 steel (before research bonuses).
    expect(REFERENCE_PRICES.fuel * 0.9).toBeGreaterThan(REFERENCE_PRICES.oil);
    expect(REFERENCE_PRICES.steel * 0.86).toBeGreaterThan(REFERENCE_PRICES.iron);
  });

  it('every producing facility covers inputs and full upkeep at reference conditions', () => {
    const s = makeInitialState(), n = s.industrialEconomy.USA;
    s.countries.USA.industry.utilization = REFERENCE_UTILIZATION;
    for (const key of Object.keys(n.potential) as Array<keyof typeof n.potential>) n.potential[key] = 1;
    for (const kind of Object.keys(FACILITIES) as FacilityKind[]) {
      if (!FACILITIES[kind].output) continue;
      const e = facilityDailyEconomics(s, 'USA', kind)!;
      expect(e.upkeep).toBeCloseTo(FACILITIES[kind].upkeep, 12); // USA pays the full catalog upkeep
      expect(e.margin, kind).toBeGreaterThan(0);
      expect(e.outputValue - e.inputCost, kind).toBeGreaterThan(1.3 * e.upkeep);
    }
  });

  it('a mine on a low-grade deposit still covers its upkeep (running cost follows the grade)', () => {
    const s = makeInitialState();
    expect(s.industrialEconomy.TUR.potential.coal).toBeLessThan(0.2);
    const e = facilityDailyEconomics(s, 'TUR', 'coal_mine')!;
    expect(e.outputValue).toBeGreaterThan(e.upkeep);
    // The engine charges the same upkeep the estimate reports.
    const t = { ...s, countries: { ...s.countries } };
    const n = t.industrialEconomy.TUR;
    for (const kind of Object.keys(n.enabled) as FacilityKind[]) n.enabled[kind] = kind === 'coal_mine';
    n.facilities.coal_mine = 1;
    expect(processIndustrialEconomy(t).industrialEconomy.TUR.lastCosts).toBeCloseTo(e.upkeep, 12);
  });

  it('the build review shows the GDP-scaled running cost and a margin from the engine', () => {
    const s = makeInitialState();
    const review = investmentReview(s, 'coal_mine');
    const e = facilityDailyEconomics(s, 'TUR', 'coal_mine')!;
    expect(review.metrics.find(m => m[0] === 'Additional running cost')?.[1]).toBe(`$${e.upkeep.toFixed(4)}B/day`);
    expect(review.metrics.some(m => m[0] === 'Estimated daily margin at market prices')).toBe(true);
    expect(investmentReview(s, 'civil_factory').metrics.find(m => m[0] === 'Estimated GDP gain on completion')?.[1]).toBe(`+$${civilParkGdpGain(s.countries.TUR).toFixed(2)}B`);
  });
});

describe('0.87 industrial market: AI buyers need demand (C11)', () => {
  it('rejects immediate sales and long contracts the AI buyer does not need', () => {
    let s = ready();
    s = changeGoodStock(s, 'TUR', 'gold', 500);
    s = changeGoodStock(s, 'GRC', 'gold', 100);
    expect(industrialBuyerDemand(s, 'GRC', 'gold').shortfall).toBe(0);
    expect(industrialOrderError(s, 'GRC', 'gold', 10, 'sell', 0)).toBe('Buyer has no demand for this quantity');
    expect(placeIndustrialOrder(s, 'GRC', 'gold', 10, 'sell', 0)).toBe(s);
    expect(placeIndustrialOrder(s, 'GRC', 'gold', 10, 'sell', 10)).toBe(s);
    expect(industrialOrderError(s, 'GRC', 'gold', 10, 'sell', 10)).toBe('The buyer signs supply contracts of at most 3 years');
    expect(industrialOrderError(s, 'GRC', 'gold', 10, 'sell', 1)).toBe("Monthly delivery exceeds the buyer's recurring consumption");
  });

  it('accepts a sale up to the real shortfall and 5% of the buyer treasury', () => {
    let s = ready();
    s = changeGoodStock(s, 'TUR', 'water', 400);
    s.industrialEconomy.GRC.stock.water = 5;
    const { shortfall } = industrialBuyerDemand(s, 'GRC', 'water');
    expect(shortfall).toBeGreaterThan(40);
    const limit = aiPurchaseLimit(s, 'GRC', 'water', 1e-9);
    expect(limit).toBeCloseTo(shortfall, 9);
    const ok = placeIndustrialOrder(s, 'GRC', 'water', Math.floor(shortfall), 'sell', 0);
    expect(goodStock(ok, 'GRC', 'water')).toBeCloseTo(5 + Math.floor(shortfall), 9);
    expect(placeIndustrialOrder(s, 'GRC', 'water', Math.ceil(shortfall) + 1, 'sell', 0)).toBe(s);
    // A poor buyer commits at most 5% of its treasury to one shipment.
    s.countries.GRC.economy.treasury = 0.001;
    expect(aiPurchaseLimit(s, 'GRC', 'water', 0.01)).toBeCloseTo(0.005, 12);
  });

  it('signs only short contracts sized to recurring consumption', () => {
    let s = ready();
    s = changeGoodStock(s, 'TUR', 'water', 400);
    const { monthlyNeed } = industrialBuyerDemand(s, 'GRC', 'water');
    expect(monthlyNeed).toBeGreaterThan(1);
    const qty = Math.floor(monthlyNeed);
    expect(placeIndustrialOrder(s, 'GRC', 'water', qty, 'sell', 5)).toBe(s);
    const n = placeIndustrialOrder(s, 'GRC', 'water', qty, 'sell', AI_CONTRACT_MAX_YEARS);
    expect(Object.values(n.industrialContracts)).toHaveLength(1);
    // The signed contract now covers that consumption, so a second seller route cannot stack on top.
    expect(industrialBuyerDemand(n, 'GRC', 'water').monthlyNeed).toBeLessThan(monthlyNeed - qty + 1e-9);
    // The player is never limited when buying.
    s = changeGoodStock(s, 'GRC', 'water', 400);
    expect(industrialOrderError(s, 'GRC', 'water', 50, 'buy', 10)).toBeNull();
  });

  it('a pumping contract from an older save delivers nothing while the buyer has no need', () => {
    let s = ready();
    s = changeGoodStock(s, 'TUR', 'gold', 5000);
    s = changeGoodStock(s, 'GRC', 'gold', 100);
    const id = 'TUR-GRC-gold-1-0';
    s = { ...s, industrialContracts: { [id]: { id, sellerId: 'TUR', buyerId: 'GRC', good: 'gold', quantity: 100, price: 0.13, nextDeliveryDay: s.day, expiresDay: s.day + 3650, active: true, missedDeliveries: 0 } } };
    const n = processIndustrialContracts(s);
    expect(n.countries.TUR.economy.treasury).toBe(s.countries.TUR.economy.treasury);
    expect(goodStock(n, 'GRC', 'gold')).toBe(goodStock(s, 'GRC', 'gold'));
    expect(n.industrialContracts[id]).toMatchObject({ active: true, missedDeliveries: 0, nextDeliveryDay: s.day + 30 });
    expect(n.sitrep[0]).toBe('SUPPLY CONTRACT // Gold delivery declined: the buyer has no current demand.');
    // Once the buyer runs short, the delivery is capped at what it needs.
    s.industrialEconomy.GRC.stock.gold = 0;
    const short = processIndustrialContracts(s);
    const delivered = goodStock(short, 'GRC', 'gold');
    expect(delivered).toBeGreaterThan(0);
    expect(delivered).toBeLessThanOrEqual(GOODS.gold.reserve * 2 + 1e-9);
  });
});

describe('0.87 industrial parks: goal-driven AI and GDP (C12)', () => {
  it('the AI builds Industrial Parks only below its GDP-linked factory target', () => {
    const s = makeInitialState();
    const id = 'DEU', c = s.countries[id];
    c.economy.treasury = 500;
    c.ai.strategicGoal = 'stabilize';
    s.industrialEconomy[id].stock.water = 500;
    const day30 = { ...s, day: 30 };
    c.industry.factories = civilFactoryTarget(c);
    expect(processIndustrialAI(day30).industrialEconomy[id].projects).toHaveLength(0);
    c.industry.factories = civilFactoryTarget(c) - 1;
    expect(processIndustrialAI(day30).industrialEconomy[id].projects.map(p => p.kind)).toEqual(['civil_factory']);
  });

  it('a completed park adds bounded GDP with diminishing returns', () => {
    let s = ready();
    const gdp = s.countries.TUR.economy.gdp, factories = s.countries.TUR.industry.factories;
    s = buildFacility(s, 'TUR', 'civil_factory');
    s = processIndustrialEconomy({ ...s, day: s.day + FACILITIES.civil_factory.days });
    const gain = s.countries.TUR.economy.gdp - gdp;
    expect(gain).toBeGreaterThan(0);
    expect(gain).toBeLessThanOrEqual(FACILITIES.civil_factory.cost * 0.5 + 1e-9);
    expect(s.countries.TUR.industry.factories).toBe(factories + 5);
    const micro = makeInitialState().countries.LUX;
    expect(civilParkGdpGain(micro)).toBeLessThanOrEqual(micro.economy.gdp * PARK_GDP_CAP + 1e-9);
    const saturated = { ...s.countries.TUR, industry: { ...s.countries.TUR.industry, factories: 10_000 } };
    expect(civilParkGdpGain(saturated)).toBeCloseTo(civilParkGdpGain({ ...saturated, industry: { ...saturated.industry, factories: 1 } }) * 0.25, 9);
  });
});

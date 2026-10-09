import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { CountryState, DiplomaticRelation, GameState } from '../domain/game';
import { applyGameCommand } from '../engine/commands';
import { maybeCreateResourceAdvisor } from '../engine/systems/advisor';
import { relationFor } from '../engine/systems/diplomacy';
import { exchangeAccess } from '../engine/systems/livingEconomy';
import { countryTradeOptions, purchaseOption, rankSuppliers, routeScore, TRADE_REASONS } from '../engine/systems/tradeOptions';
import { goodStock } from '../engine/systems/industrialEconomy';
import { findBestSuppliers } from '../store/marketSelectors';
import { UI_CATALOG_089_G } from '../i18n/uiCatalog089G';

const PLAYER = 'TUR';

function patchCountry(state: GameState, id: string, patch: (c: CountryState) => CountryState): GameState {
  return { ...state, countries: { ...state.countries, [id]: patch(state.countries[id]) } };
}

/** Sets the relation on both sides, as the diplomacy system keeps it. */
function setRelation(state: GameState, a: string, b: string, relation: Partial<DiplomaticRelation>): GameState {
  const both = (s: GameState, x: string, y: string) => patchCountry(s, x, (c) => ({ ...c, diplomacy: { ...c.diplomacy, relations: { ...c.diplomacy.relations, [y]: { ...relationFor(c, y), ...relation } } } }));
  return both(both(state, a, b), b, a);
}

/** A large oil producer with plenty of stock above its reserve. */
const oilRich = (c: CountryState): CountryState => ({ ...c, globalSanctions: false, resources: { ...c.resources, oil: 5000 }, resourceProduction: { ...c.resourceProduction, oil: 400 } });
const oilDry = (c: CountryState): CountryState => ({ ...c, globalSanctions: false, resources: { ...c.resources, oil: 0 }, resourceProduction: { ...c.resourceProduction, oil: 0 } });

/** AZE: pact + oil. KAZ: oil, good relations, no pact. VEN: oil, relations too low for a pact. IRQ: at war. NOR: sanctioned. QAT: pact but no oil. */
function scenario(): GameState {
  let s = makeInitialState();
  s = { ...s, playerCountryId: PLAYER, day: 10 };
  for (const id of ['AZE', 'KAZ', 'VEN', 'IRQ', 'NOR']) s = patchCountry(s, id, oilRich);
  s = patchCountry(s, 'QAT', oilDry);
  s = setRelation(s, PLAYER, 'AZE', { score: 40, status: 'friendly', treaties: ['trade'], sanctions: false });
  s = setRelation(s, PLAYER, 'KAZ', { score: 40, status: 'friendly', treaties: [], sanctions: false });
  s = setRelation(s, PLAYER, 'VEN', { score: -80, status: 'hostile', treaties: [], sanctions: false });
  s = setRelation(s, PLAYER, 'IRQ', { score: -90, status: 'war', treaties: [], sanctions: false });
  s = setRelation(s, PLAYER, 'NOR', { score: 30, status: 'neutral', treaties: ['trade'], sanctions: true });
  s = setRelation(s, PLAYER, 'QAT', { score: 40, status: 'friendly', treaties: ['trade'], sanctions: false });
  return patchCountry(s, PLAYER, (c) => ({ ...c, economy: { ...c.economy, treasury: 500 } }));
}

describe('0.89 trade discovery: supplier ranking', () => {
  it('ranks eligible partners above every ineligible one, tier by tier', () => {
    const ranked = rankSuppliers(scenario(), PLAYER, 'oil');
    expect(ranked.length).toBeGreaterThan(10);
    for (let i = 1; i < ranked.length; i++) expect(ranked[i].tier).toBeGreaterThanOrEqual(ranked[i - 1].tier);
    const firstClosed = ranked.findIndex((o) => !o.eligible);
    expect(firstClosed).toBeGreaterThan(0);
    expect(ranked.slice(firstClosed).every((o) => !o.eligible)).toBe(true);
    // Eligibility always agrees with the rule the trade commands use.
    for (const o of ranked) expect(o.access).toBe(exchangeAccess(scenario(), o.sellerId, PLAYER, 'oil'));
  });

  it('puts a pact partner with surplus oil above a better-liked country without access', () => {
    const ranked = rankSuppliers(scenario(), PLAYER, 'oil');
    const rank = (id: string) => ranked.findIndex((o) => o.sellerId === id);
    const aze = ranked[rank('AZE')], kaz = ranked[rank('KAZ')];
    expect(aze.eligible).toBe(true);
    expect(aze.tier).toBe(0);
    expect(aze.nextStep).toBe('buy');
    expect(aze.suggestedQuantity).toBeGreaterThan(0);
    expect(kaz.eligible).toBe(false);
    expect(rank('AZE')).toBeLessThan(rank('KAZ'));
    // The old selector listed countries without access; it now keeps open routes and those one pact away, open first.
    const best = findBestSuppliers(scenario(), PLAYER, 'oil', 40).map((x) => x.seller.id);
    expect(best).toContain('AZE');
    expect(best).not.toContain('VEN');
    expect(best).not.toContain('IRQ');
    expect(best).not.toContain('NOR');
    expect(best.indexOf('AZE')).toBeLessThan(best.indexOf('KAZ'));
  });

  it('gives the correct reason and next step for each closed route', () => {
    const s = scenario();
    const kaz = purchaseOption(s, 'KAZ', PLAYER, 'oil');
    expect([kaz.block, kaz.tier, kaz.nextStep, kaz.reason]).toEqual(['no_pact', 1, 'propose_pact', TRADE_REASONS.noPact]);
    const ven = purchaseOption(s, 'VEN', PLAYER, 'oil');
    expect([ven.block, ven.tier, ven.nextStep, ven.reason]).toEqual(['relations', 2, 'improve_relations', TRADE_REASONS.relationsForPact]);
    const irq = purchaseOption(s, 'IRQ', PLAYER, 'oil');
    expect([irq.block, irq.tier, irq.reason]).toEqual(['war', 3, TRADE_REASONS.war]);
    const nor = purchaseOption(s, 'NOR', PLAYER, 'oil');
    expect([nor.block, nor.tier, nor.reason]).toEqual(['sanctions', 3, TRADE_REASONS.sanctions]);
    const qat = purchaseOption(s, 'QAT', PLAYER, 'oil');
    expect([qat.block, qat.tier, qat.reason, qat.access, qat.eligible]).toEqual(['no_surplus', 3, TRADE_REASONS.noSurplus, true, false]);
    // A pact proposal already sent shows as pending instead of offering a second letter.
    const sent = applyGameCommand(s, { type: 'diplomacy/request', id: 'KAZ', kind: 'trade_pact', years: 1 });
    expect(purchaseOption(sent, 'KAZ', PLAYER, 'oil').nextStep).toBe('pact_pending');
  });

  it('explains industrial and armored-vehicle requirements', () => {
    let s = scenario();
    s = setRelation(s, PLAYER, 'AZE', { score: 0, status: 'neutral', treaties: ['trade'] });
    s = patchCountry(s, 'AZE', (c) => ({ ...c, processedResources: { ...c.processedResources, steel: 500 } }));
    const steel = purchaseOption(s, 'AZE', PLAYER, 'steel');
    expect([steel.access, steel.block, steel.nextStep, steel.reason]).toEqual([false, 'relations', 'improve_relations', TRADE_REASONS.relationsIndustrial]);
    s = setRelation(s, PLAYER, 'AZE', { score: 30, status: 'friendly', treaties: ['trade'] });
    s = { ...s, production: { ...s.production, AZE: { ...s.production.AZE, stockpile: { ...s.production.AZE.stockpile, armor: 300 } } } };
    const tanks = purchaseOption(s, 'AZE', PLAYER, 'tanks');
    expect([tanks.access, tanks.block, tanks.nextStep, tanks.reason]).toEqual([false, 'alliance', 'form_alliance', TRADE_REASONS.alliance]);
    const steelOpen = purchaseOption(s, 'AZE', PLAYER, 'steel');
    expect(steelOpen.eligible).toBe(true);
    expect(steelOpen.suggestedQuantity).toBeGreaterThan(0);
    expect(steelOpen.orderError).toBeNull();
  });

  it('scores more stock, lower prices, better relations and shorter distance higher', () => {
    const base = routeScore(1, 1, 1, 50, 5000, 'oil');
    expect(routeScore(3, 1, 1, 50, 5000, 'oil')).toBeGreaterThan(base);
    expect(routeScore(1, 0.8, 1, 50, 5000, 'oil')).toBeGreaterThan(base);
    expect(routeScore(1, 1, 1, 80, 5000, 'oil')).toBeGreaterThan(base);
    expect(routeScore(1, 1, 1, 50, 1000, 'oil')).toBeGreaterThan(base);
    const aze = purchaseOption(scenario(), 'AZE', PLAYER, 'oil');
    expect(aze.distanceKm).toBeGreaterThan(0);
    expect(aze.travelDays).toBeGreaterThanOrEqual(2);
  });

  it('the top-ranked supplier accepts an import through the existing command', () => {
    const s = scenario();
    const top = rankSuppliers(s, PLAYER, 'oil')[0];
    expect(top.eligible).toBe(true);
    const next = applyGameCommand(s, { type: 'trade/createImport', targetCountryId: top.sellerId, resource: 'oil' });
    expect(Object.values(next.tradeDeals).some((d) => d.active && d.sellerId === top.sellerId && d.buyerId === PLAYER && d.resource === 'oil')).toBe(true);
  });
});

describe('0.89 trade discovery: per-country trade desk', () => {
  function deskScenario(): GameState {
    let s = scenario();
    // AZE runs short of food and steel; the player holds large food and steel surpluses.
    s = patchCountry(s, 'AZE', (c) => ({ ...c, resources: { ...c.resources, food: 0 }, resourceProduction: { ...c.resourceProduction, food: 0 }, processedResources: { ...c.processedResources, steel: 0 }, economy: { ...c.economy, treasury: 400 } }));
    s = patchCountry(s, PLAYER, (c) => ({ ...c, resources: { ...c.resources, food: 9000 }, processedResources: { ...c.processedResources, steel: 900 } }));
    return s;
  }

  it('lists what the player can buy from a pact partner, open routes first', () => {
    const desk = countryTradeOptions(deskScenario(), 'AZE');
    expect(desk.hasPact).toBe(true);
    const oil = desk.buy.find((o) => o.good === 'oil');
    expect(oil?.eligible).toBe(true);
    expect(oil?.nextStep).toBe('buy');
    expect(desk.buy.every((o) => o.block !== 'no_surplus')).toBe(true);
    for (let i = 1; i < desk.buy.length; i++) expect(desk.buy[i].tier).toBeGreaterThanOrEqual(desk.buy[i - 1].tier);
  });

  it('lists what the player can sell to the partner, with a working industrial order', () => {
    const s = deskScenario();
    const desk = countryTradeOptions(s, 'AZE');
    const food = desk.sell.find((o) => o.good === 'food');
    expect(food?.eligible).toBe(true);
    expect(food?.nextStep).toBe('list_on_exchange');
    expect(food?.demand).toBeGreaterThan(0);
    const steel = desk.sell.find((o) => o.good === 'steel');
    expect(steel?.eligible).toBe(true);
    expect(steel?.nextStep).toBe('sell');
    expect(steel?.orderError).toBeNull();
    const qty = steel!.suggestedQuantity;
    const next = applyGameCommand(s, { type: 'industry/order', partnerId: 'AZE', good: 'steel', quantity: qty, direction: 'sell', years: 0 });
    expect(goodStock(next, 'AZE', 'steel')).toBeCloseTo(qty, 6);
  });

  it('a partner without a pact offers its goods behind the pact step', () => {
    const desk = countryTradeOptions(scenario(), 'KAZ');
    expect(desk.hasPact).toBe(false);
    expect(desk.pactStep).toBe('propose_pact');
    const oil = desk.buy.find((o) => o.good === 'oil');
    expect(oil?.eligible).toBe(false);
    expect(oil?.reason).toBe(TRADE_REASONS.noPact);
    expect(desk.sell.every((o) => !o.eligible)).toBe(true);
    const war = countryTradeOptions(scenario(), 'IRQ');
    expect(war.pactStep).toBe('none');
    expect(war.pactReason).toBe(TRADE_REASONS.war);
    // War closes every route, but the desk still lists only goods the enemy actually has.
    expect(war.buy.find((o) => o.good === 'oil')?.reason).toBe(TRADE_REASONS.war);
    expect(war.buy.every((o) => o.surplus && !o.eligible)).toBe(true);
    expect(war.sell.every((o) => o.surplus && o.reason === TRADE_REASONS.war)).toBe(true);
    expect(countryTradeOptions(scenario(), PLAYER).buy).toEqual([]);
  });
});

describe('0.89 trade discovery: advisor suggestion', () => {
  it('suggests a supplier with an open trade pact before a better-liked one without', () => {
    let s = scenario();
    s = patchCountry(s, PLAYER, (c) => ({ ...c, resources: { ...c.resources, oil: 1 } }));
    s = setRelation(s, PLAYER, 'KAZ', { score: 90, status: 'ally', treaties: [] });
    const next = maybeCreateResourceAdvisor(s);
    expect(next.activeAdvisor?.resource).toBe('oil');
    expect(next.activeAdvisor?.stage).toBe('contract');
    expect(relationFor(next.countries[PLAYER], next.activeAdvisor!.supplierId).treaties).toContain('trade');
  });
});

describe('0.89 trade discovery: translations', () => {
  it('translates every route reason and has four non-empty translations per key', () => {
    for (const reason of Object.values(TRADE_REASONS)) expect(UI_CATALOG_089_G[reason]).toBeDefined();
    for (const values of Object.values(UI_CATALOG_089_G)) {
      expect(values).toHaveLength(4);
      for (const v of values) expect(v.trim().length).toBeGreaterThan(0);
    }
    // Template keys keep their slots in every language.
    for (const [key, values] of Object.entries(UI_CATALOG_089_G)) for (const slot of key.match(/\{\d+\}/g) ?? []) for (const v of values) expect(v).toContain(slot);
  });
});

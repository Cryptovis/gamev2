import {constrainedOilOutput} from './organizations/quotas';
import {organizationSanctionsBlock} from './organizations/sanctions';
import {leaderModifiers} from './leaderPerks';
import { activeCountries } from '../../domain/sovereignty';
import type { GameState, TradeResource } from '../../domain/game';
import type { IndustrialGood } from '../../domain/industrial';
import type { ExchangeGood } from '../../domain/living';
import { GOODS } from '../../data/industrialCatalog';
import { relationFor, relationshipIndex } from './diplomacy';
import { agreementEligibility, TRADE_MIN_INDEX } from './treaties';
import { getGlobalMarketPrice, getTradeQuote } from './trade';
import { aiPurchaseLimit, industrialBuyerDemand, industrialOrderError, industrialPrice, industrialQuote } from './industrialMarket';
import { diplomaticProposalStatus, EXCHANGE_GOODS, exchangeAccess, exportableStock, living } from './livingEconomy';
import { distanceKm, travelDays } from './flights';
import { simulateResources } from './resources';

/**
 * 0.89 trade discovery (player feedback: "the market lists irrelevant countries"). Read-only views over the existing
 * trade rules: who can sell a good to a buyer today, why the others cannot, and the next step that would unlock them.
 * Nothing here changes state; eligibility, stock and prices come from the same functions the trade commands use.
 */

/** Why a route is closed. Checked in this order: war, sanctions, no surplus/demand, then diplomatic requirements. */
export type TradeBlock = 'war' | 'sanctions' | 'no_surplus' | 'no_demand' | 'relations' | 'no_pact' | 'alliance';
/** What the buyer (or seller, on the sell side) can do next on this route. */
export type TradeNextStep = 'buy' | 'sell' | 'list_on_exchange' | 'propose_pact' | 'pact_pending' | 'improve_relations' | 'form_alliance' | 'none';
/** 0: open now. 1: one step away (a trade pact can be proposed). 2: needs more diplomacy. 3: irrelevant (no stock, war, sanctions). */
export type TradeTier = 0 | 1 | 2 | 3;

/** English reason texts; the UI translates them through the i18n catalog. */
export const TRADE_REASONS = {
  open: 'Trade pact active: route open',
  war: 'At war: trade suspended',
  sanctions: 'Sanctions block trade',
  noSurplus: 'No exportable surplus',
  noDemand: 'No current demand',
  relationsForPact: 'Relations below 20/100: improve relations before a trade pact',
  noPact: 'Needs a trade pact',
  noPactIndustrial: 'Needs a trade pact and relations of 55/100',
  relationsIndustrial: 'Industrial goods need relations of 55/100',
  noPactTanks: 'Needs a trade pact and an alliance',
  alliance: 'Armored vehicles need an alliance and relations of 80/100',
  pactPending: 'Trade pact proposal pending',
} as const;

export interface TradeOption {
  sellerId: string;
  buyerId: string;
  /** The country on the other side of the route from the viewer (seller when buying, buyer when selling). */
  partnerId: string;
  good: ExchangeGood;
  /** Raw resources (food, oil, iron, uranium) trade as daily import flows; industrial goods as shipments. */
  raw: boolean;
  /** Trade access under the existing rules (exchangeAccess: pact, sanctions, war, industrial relations, alliance). */
  access: boolean;
  /** The seller has something to sell on this route (and, on sale routes, the buyer wants it). */
  surplus: boolean;
  /** Access and something to trade. */
  eligible: boolean;
  block?: TradeBlock;
  nextStep: TradeNextStep;
  reason: string;
  /** Raw: export capacity per day. Industrial: units above the seller's protected reserve. */
  available: number;
  /** Stock above the seller's protected reserve. */
  exportable: number;
  /** Unit price quoted on this route ($B). */
  price: number;
  /** Reference world price of the good ($B). */
  marketPrice: number;
  /** 0-100 relationship index between the two countries. */
  relationIndex: number;
  hasPact: boolean;
  distanceKm: number;
  /** Cargo travel time between the two countries. */
  travelDays: number;
  /** Open exchange listings of this good by the seller. */
  listed: number;
  /** Raw: units per day of an import flow. Industrial: units for one shipment. 0 when nothing can be ordered. */
  suggestedQuantity: number;
  /** `suggestedQuantity` at `price` ($B): per day for a raw import flow, per shipment for industrial goods. */
  orderCost: number;
  /** Industrial only: the existing order validator's verdict for `suggestedQuantity` (null = accepted). */
  orderError: string | null;
  tier: TradeTier;
  /** 0-100 within a tier: stock, price, relations and distance combined (see `routeScore`). */
  score: number;
}

/** Monthly demand on a sale route: the buyer's raw-resource deficit or industrial stock shortfall. */
export interface SaleOption extends TradeOption { demand: number }

const RAW: TradeResource[] = ['food', 'oil', 'iron', 'uranium'];
const isRaw = (good: ExchangeGood): good is TradeResource => (RAW as ExchangeGood[]).includes(good);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
/** Raw relation score at which industrial routes open (canTradeIndustrial); 55/100 on the relationship index. */
export const INDUSTRIAL_MIN_SCORE = 10;
/** Smallest surplus worth listing as a supplier. */
const MIN_SURPLUS = 0.05;

/** A typical order size, used to judge whether a seller's surplus is large. */
function referenceQuantity(good: ExchangeGood): number {
  if (isRaw(good)) return good === 'uranium' ? 0.2 : good === 'oil' ? 1.5 : 2;
  return Math.max(0.5, GOODS[good].reserve);
}

/**
 * Ranking score 0-100: 35% stock (surplus against a typical order), 25% price (route price against the world
 * price; 30% cheaper scores full, 30% dearer scores zero), 25% relations, 15% distance (0 km full, 20,000 km zero).
 */
export function routeScore(available: number, price: number, marketPrice: number, relationIndex: number, km: number, good: ExchangeGood): number {
  const ref = referenceQuantity(good);
  const stock = available > 0 ? available / (available + ref) : 0;
  const cheap = marketPrice > 0 ? clamp((1.3 - price / marketPrice) / 0.6, 0, 1) : 0.5;
  const relations = clamp(relationIndex / 100, 0, 1);
  const near = 1 - clamp(km / 20000, 0, 1);
  return Math.round((35 * stock + 25 * cheap + 25 * relations + 15 * near) * 10) / 10;
}

/** World reference price of a good, computed once per ranking. */
function marketPriceOf(state: GameState, good: ExchangeGood): number {
  return isRaw(good) ? getGlobalMarketPrice(state, good) : industrialPrice(state, good);
}

interface Access { block?: TradeBlock; nextStep: TradeNextStep; reason: string; tier: TradeTier }

/**
 * The diplomatic part of a route's status, from the buyer's relation with the seller. Mirrors exchangeAccess /
 * canTradeIndustrial (which decide), and only explains them. `proposerId` is the side that would propose the pact.
 */
function diplomaticAccess(state: GameState, sellerId: string, buyerId: string, good: ExchangeGood, proposerId: string, open: boolean): Access {
  const seller = state.countries[sellerId], buyer = state.countries[buyerId];
  const relation = relationFor(buyer, sellerId), index = relationshipIndex(relation);
  if (relation.status === 'war') return { block: 'war', nextStep: 'none', reason: TRADE_REASONS.war, tier: 3 };
  if (organizationSanctionsBlock(state,sellerId,buyerId,'trade',good)||good==='tanks'&&organizationSanctionsBlock(state,sellerId,buyerId,'arms')||relation.sanctions || seller.globalSanctions || buyer.globalSanctions) return { block: 'sanctions', nextStep: 'none', reason: TRADE_REASONS.sanctions, tier: 3 };
  if (open) return { nextStep: 'buy', reason: TRADE_REASONS.open, tier: 0 };
  const hasPact = relation.treaties.includes('trade');
  if (!hasPact) {
    if (index < TRADE_MIN_INDEX) return { block: 'relations', nextStep: 'improve_relations', reason: TRADE_REASONS.relationsForPact, tier: 2 };
    const pact = pactStep(state, proposerId, proposerId === buyerId ? sellerId : buyerId);
    if (good === 'tanks') return { block: 'no_pact', nextStep: pact.nextStep, reason: TRADE_REASONS.noPactTanks, tier: 2 };
    if (!isRaw(good) && relation.score < INDUSTRIAL_MIN_SCORE) return { block: 'no_pact', nextStep: pact.nextStep, reason: TRADE_REASONS.noPactIndustrial, tier: 2 };
    return { block: 'no_pact', nextStep: pact.nextStep, reason: pact.reason ?? TRADE_REASONS.noPact, tier: 1 };
  }
  if (good === 'tanks' && relation.score >= INDUSTRIAL_MIN_SCORE) return { block: 'alliance', nextStep: 'form_alliance', reason: TRADE_REASONS.alliance, tier: 2 };
  return { block: 'relations', nextStep: 'improve_relations', reason: TRADE_REASONS.relationsIndustrial, tier: 2 };
}

/** Whether `proposerId` can propose a trade pact to `partnerId` now. The player goes through letters; AI through treaties. */
function pactStep(state: GameState, proposerId: string, partnerId: string): { nextStep: TradeNextStep; reason?: string } {
  if (proposerId === state.playerCountryId) {
    const status = diplomaticProposalStatus(state, partnerId, 'trade_pact');
    if (status.allowed) return { nextStep: 'propose_pact' };
    if ('letter' in status && status.letter) return { nextStep: 'pact_pending', reason: status.letter.incoming ? status.reason : TRADE_REASONS.pactPending };
    return { nextStep: 'none', reason: status.reason };
  }
  const check = agreementEligibility(state, proposerId, partnerId, 'trade');
  return { nextStep: check.allowed ? 'propose_pact' : check.block === 'cooldown' ? 'pact_pending' : 'none' };
}

interface Quote { available: number; exportable: number; price: number; suggestedQuantity: number; orderError: string | null }

/** Stock and price of a purchase on this route, from the existing trade quotes. */
function purchaseQuote(state: GameState, sellerId: string, buyerId: string, good: ExchangeGood, marketPrice: number, buyerNeed: number): Quote {
  const exportable = exportableStock(state, sellerId, good);
  if (isRaw(good)) {
    const quote = getTradeQuote(state, sellerId, good, marketPrice, buyerId);
    return { available: quote.available, exportable, price: quote.price, suggestedQuantity: quote.quantity, orderError: null };
  }
  const unit = industrialQuote(state, sellerId, buyerId, good, 1);
  const buyer = state.countries[buyerId];
  const wanted = buyerNeed > 0 ? buyerNeed : GOODS[good].reserve;
  const affordable = unit.price > 0 ? Math.max(0, buyer.economy.treasury) * 0.25 / unit.price : 0;
  const quantity = roundOrder(Math.min(unit.available, wanted, affordable));
  const orderError = buyerId === state.playerCountryId && quantity > 0 ? industrialOrderError(state, sellerId, good, quantity, 'buy') : null;
  return { available: unit.available, exportable, price: unit.price, suggestedQuantity: quantity, orderError };
}

/** Whole units for orders of one unit or more; two decimals below (gold and silver trade in tonnes). */
function roundOrder(quantity: number): number {
  if (!(quantity > 0)) return 0;
  return quantity >= 1 ? Math.floor(quantity) : Math.floor(quantity * 100) / 100;
}

function listedBy(state: GameState, sellerId: string, good: ExchangeGood): number {
  return living(state).listings.filter((x) => x.status === 'open' && x.sellerId === sellerId && x.good === good).reduce((sum, x) => sum + x.remaining, 0);
}

/** One purchase route: `sellerId` sells `good` to `buyerId`. */
export function purchaseOption(state: GameState, sellerId: string, buyerId: string, good: ExchangeGood, marketPrice = marketPriceOf(state, good), buyerNeed = monthlyDemand(state, buyerId, good)): TradeOption {
  const buyer = state.countries[buyerId];
  const relation = relationFor(buyer, sellerId), index = relationshipIndex(relation);
  const quote = purchaseQuote(state, sellerId, buyerId, good, marketPrice, buyerNeed);
  const access = exchangeAccess(state, sellerId, buyerId, good);
  const surplus = quote.available > MIN_SURPLUS;
  let status = diplomaticAccess(state, sellerId, buyerId, good, buyerId, access);
  if (!surplus && status.block !== 'war' && status.block !== 'sanctions') status = { block: 'no_surplus', nextStep: 'none', reason: TRADE_REASONS.noSurplus, tier: 3 };
  const km = distanceKm(sellerId, buyerId);
  return {
    sellerId, buyerId, partnerId: sellerId, good, raw: isRaw(good),
    access, surplus, eligible: access && surplus, block: status.block, nextStep: status.nextStep, reason: status.reason,
    available: quote.available, exportable: quote.exportable, price: quote.price, marketPrice,
    relationIndex: index, hasPact: relation.treaties.includes('trade'),
    distanceKm: Math.round(km), travelDays: travelDays('cargo', sellerId, buyerId),
    listed: listedBy(state, sellerId, good),
    suggestedQuantity: status.tier === 0 ? quote.suggestedQuantity : 0,
    orderCost: status.tier === 0 ? quote.suggestedQuantity * quote.price : 0,
    orderError: quote.orderError,
    tier: status.tier,
    score: surplus ? routeScore(quote.available, quote.price, marketPrice, index, km, good) : 0,
  };
}

const byRank = (a: TradeOption, b: TradeOption) => a.tier - b.tier || b.score - a.score || a.partnerId.localeCompare(b.partnerId);

/**
 * Every country that could supply `good` to `buyerId`, best first: open routes (tier 0), then routes one trade
 * pact away (tier 1), then routes needing more diplomacy (tier 2), then countries without surplus or access (tier 3).
 * Within a tier the higher `routeScore` (stock, price, relations, distance) ranks first.
 */
export function rankSuppliers(state: GameState, buyerId: string, good: ExchangeGood): TradeOption[] {
  if (!state.countries[buyerId]) return [];
  const marketPrice = marketPriceOf(state, good), buyerNeed = monthlyDemand(state, buyerId, good);
  return activeCountries(state.countries)
    .filter((c) => c.id !== buyerId)
    .map((c) => purchaseOption(state, c.id, buyerId, good, marketPrice, buyerNeed))
    .sort(byRank);
}

/** Monthly demand of `buyerId` for `good`: raw-resource deficit, or industrial stock shortfall. */
export function monthlyDemand(state: GameState, buyerId: string, good: ExchangeGood): number {
  const buyer = state.countries[buyerId];
  if (!buyer) return 0;
  if (isRaw(good)) return Math.max(0, -simulateResources(buyer,1,undefined,leaderModifiers(state,buyer.id).consumer,constrainedOilOutput(state,buyer.id)).net[good]) * 30;
  return industrialBuyerDemand(state, buyerId, good as IndustrialGood).shortfall;
}

/** One sale route: `sellerId` (usually the player) sells `good` to `buyerId`. */
export function saleOption(state: GameState, sellerId: string, buyerId: string, good: ExchangeGood, marketPrice = marketPriceOf(state, good)): SaleOption {
  const buyer = state.countries[buyerId];
  const relation = relationFor(buyer, sellerId), index = relationshipIndex(relation);
  const access = exchangeAccess(state, sellerId, buyerId, good);
  const exportable = exportableStock(state, sellerId, good);
  const demand = monthlyDemand(state, buyerId, good);
  const raw = isRaw(good);
  const price = raw ? marketPrice : industrialQuote(state, sellerId, buyerId, good, 1).price;
  // Industrial shipments go through the order validator; raw surplus is sold by listing it on the open exchange.
  const quantity = raw ? roundOrder(Math.min(exportable, demand)) : roundOrder(Math.min(exportable, aiPurchaseLimit(state, buyerId, good as IndustrialGood, price)));
  const surplus = exportable > MIN_SURPLUS && demand > MIN_SURPLUS && quantity > 0;
  let status = diplomaticAccess(state, sellerId, buyerId, good, sellerId, access);
  if (status.tier < 3) {
    if (exportable <= MIN_SURPLUS) status = { block: 'no_surplus', nextStep: 'none', reason: TRADE_REASONS.noSurplus, tier: 3 };
    else if (!surplus) status = { block: 'no_demand', nextStep: 'none', reason: TRADE_REASONS.noDemand, tier: 3 };
  }
  if (status.tier === 0) status = { ...status, nextStep: raw ? 'list_on_exchange' : 'sell' };
  const orderError = !raw && status.tier === 0 && sellerId === state.playerCountryId ? industrialOrderError(state, buyerId, good, quantity, 'sell') : null;
  const km = distanceKm(sellerId, buyerId);
  return {
    sellerId, buyerId, partnerId: buyerId, good, raw,
    access, surplus, eligible: status.tier === 0, block: status.block, nextStep: status.nextStep, reason: status.reason,
    available: exportable, exportable, price, marketPrice,
    relationIndex: index, hasPact: relation.treaties.includes('trade'),
    distanceKm: Math.round(km), travelDays: travelDays('cargo', sellerId, buyerId),
    listed: listedBy(state, sellerId, good),
    suggestedQuantity: status.tier === 0 ? quantity : 0,
    orderCost: status.tier === 0 ? quantity * price : 0,
    orderError,
    tier: status.tier,
    score: routeScore(Math.min(exportable, demand), price, marketPrice, index, km, good),
    demand,
  };
}

export interface CountryTradeSummary {
  partnerId: string;
  relationIndex: number;
  hasPact: boolean;
  /** Next step for the trade pact itself (propose, pending, improve relations) or 'none' when active or blocked. */
  pactStep: TradeNextStep;
  pactReason: string;
  distanceKm: number;
  travelDays: number;
  /** Goods the partner has surplus of, best for the viewer first (also when war or sanctions close the route). */
  buy: TradeOption[];
  /** Goods the partner needs and the viewer can export, best first. */
  sell: SaleOption[];
}

/**
 * The trade desk for one partner country: what `viewerId` (default: the player) can buy from it and what it can
 * sell to it, with eligibility reasons and the next step. Goods without surplus or demand are left out.
 */
export function countryTradeOptions(state: GameState, partnerId: string, viewerId = state.playerCountryId): CountryTradeSummary {
  const viewer = state.countries[viewerId];
  const relation = viewer ? relationFor(viewer, partnerId) : undefined;
  const index = relation ? relationshipIndex(relation) : 0;
  const hasPact = !!relation?.treaties.includes('trade');
  const empty: CountryTradeSummary = { partnerId, relationIndex: index, hasPact, pactStep: 'none', pactReason: '', distanceKm: 0, travelDays: 0, buy: [], sell: [] };
  if (!viewer || !state.countries[partnerId] || partnerId === viewerId) return empty;
  const pact = diplomaticAccess(state, partnerId, viewerId, 'oil', viewerId, hasPact && !relation?.sanctions && relation?.status !== 'war');
  const buy = EXCHANGE_GOODS.map((good) => purchaseOption(state, partnerId, viewerId, good))
    .filter((o) => o.surplus)
    .sort(byRank);
  const sell = EXCHANGE_GOODS.map((good) => saleOption(state, viewerId, partnerId, good))
    .filter((o) => o.surplus)
    .sort(byRank);
  return {
    ...empty,
    pactStep: hasPact ? 'none' : pact.nextStep,
    pactReason: hasPact ? TRADE_REASONS.open : pact.reason,
    distanceKm: Math.round(distanceKm(viewerId, partnerId)),
    travelDays: travelDays('cargo', partnerId, viewerId),
    buy, sell,
  };
}

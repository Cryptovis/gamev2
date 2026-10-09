import { useMemo, useState, type ReactNode } from 'react';
import type { CountryState, TradeResource } from '../../domain/game';
import type { ExchangeGood } from '../../domain/living';
import type { IndustrialGood } from '../../domain/industrial';
import { GOODS } from '../../data/industrialCatalog';
import { flagEmoji } from '../../data/countryThemes';
import { LocaleText, translateLive } from '../../i18n/localeText';
import { EXCHANGE_GOODS, letterCost } from '../../engine/systems/livingEconomy';
import { countryTradeOptions, rankSuppliers, type SaleOption, type TradeOption } from '../../engine/systems/tradeOptions';
import { useGameStore } from '../../store/gameStore';
import { MARKET_RESOURCES, resourceStrategicStatus } from '../../store/marketSelectors';
import { money } from '../formatMoney';
import { AssetThumbnail } from '../icons/AssetThumbnail';
import { CivicArt } from '../icons/CivicArt';
import { ReviewDialog, type ReviewContent } from './ReviewDialog';
import '../styles/tradeDesk.css';

/**
 * 0.89 trade discovery. Supplier rankings for the market windows and the "Trade" tab of the country panel. All
 * numbers come from engine/systems/tradeOptions; every button goes through an existing store command.
 */

const RAW_LABEL: Record<TradeResource, string> = { food: 'Food', oil: 'Oil', iron: 'Iron', uranium: 'Uranium' };
const isRaw = (good: ExchangeGood): good is TradeResource => good in RAW_LABEL;
export const goodLabel = (good: ExchangeGood) => (isRaw(good) ? RAW_LABEL[good] : GOODS[good].label);
const pct = (value: number) => Math.max(0, Math.min(100, value));
const amount = (value: number) => (value >= 100 ? value.toFixed(0) : value >= 1 ? value.toFixed(1) : value.toFixed(2));

/** Small inline meter; `mark` draws a threshold tick (e.g. 20/100 for a trade pact). */
function Meter({ value, tone = 'gold', mark, label }: { value: number; tone?: 'gold' | 'cyan' | 'red'; mark?: number; label: string }) {
  return <i className={'trade-meter ' + tone} role="meter" aria-label={translateLive(label)} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
    <b style={{ width: pct(value) + '%' }} />
    {mark !== undefined && <em style={{ left: pct(mark) + '%' }} />}
  </i>;
}

function priceDelta(option: TradeOption) {
  if (!(option.marketPrice > 0)) return '';
  const delta = Math.round((option.price / option.marketPrice - 1) * 100);
  return delta === 0 ? 'world price' : `${delta > 0 ? '+' : ''}${delta}% vs world`;
}

type Dialog = ReviewContent & { allowed?: boolean; confirmLabel?: string; run: (commandId: string) => void };

/** Turns a route's next step into a button and, where the action costs money, a review dialog. */
function useTradeActions() {
  const state = useGameStore();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const player = state.countries[state.playerCountryId];

  function open(option: TradeOption) {
    const partner = state.countries[option.partnerId];
    if (!partner) return;
    const label = goodLabel(option.good);
    switch (option.nextStep) {
      case 'buy':
        if (option.raw) {
          setDialog({ title: translateLive('Review import flow'), summary: `Import ${label.toLowerCase()} from ${partner.name}.`, visual: 'contract',
            metrics: [['Daily supply', amount(option.suggestedQuantity)], ['Daily cost', money(option.orderCost)], ['Cargo travel', `${option.travelDays} days`], ['Treasury', money(player.economy.treasury)]],
            warnings: ['This daily flow can be cancelled in Diplomacy. Actual supply depends on available stock and funds.'],
            allowed: option.suggestedQuantity > 0,
            run: () => { state.createImport(partner.id, option.good as TradeResource); state.showReceipt({ title: 'Import flow updated', summary: useGameStore.getState().sitrep[0] }); } });
        } else {
          setDialog({ title: translateLive('Review industrial order'), summary: `Buy ${label} from ${partner.name}.`, visual: 'contract',
            metrics: [['Quantity', amount(option.suggestedQuantity)], ['Unit price', money(option.price)], ['Shipment value', money(option.orderCost)], ['Treasury', money(player.economy.treasury)]],
            warnings: option.orderError ? [option.orderError] : ['Stocks move immediately.'],
            allowed: !option.orderError && option.suggestedQuantity > 0,
            run: (commandId) => state.placeIndustrialOrder(partner.id, option.good as IndustrialGood, option.suggestedQuantity, 'buy', 0, commandId) });
        }
        return;
      case 'sell':
        setDialog({ title: translateLive('Review industrial export'), summary: `Sell ${label} to ${partner.name}.`, visual: 'contract',
          metrics: [['Quantity', amount(option.suggestedQuantity)], ['Unit price', money(option.price)], ['Shipment value', money(option.orderCost)]],
          warnings: option.orderError ? [option.orderError] : ['Stocks move immediately.'],
          allowed: !option.orderError && option.suggestedQuantity > 0,
          run: (commandId) => state.placeIndustrialOrder(partner.id, option.good as IndustrialGood, option.suggestedQuantity, 'sell', 0, commandId) });
        return;
      case 'propose_pact':
        proposePact(partner);
        return;
      case 'improve_relations':
      case 'form_alliance':
      case 'pact_pending':
        state.navigate('diplomacy', partner.id);
        return;
      case 'list_on_exchange':
        state.navigate('market');
        return;
      default:
        return;
    }
  }

  function proposePact(partner: CountryState) {
    setDialog({ title: translateLive('Propose a trade pact'), summary: `Send a trade pact proposal to ${partner.name}.`, visual: 'diplomacy',
      metrics: [['Fee if accepted', money(letterCost(state, player.id, 'trade_pact'))], ['Treasury', money(player.economy.treasury)]],
      warnings: ['The reply arrives after three campaign days. Payment is charged only if accepted.'],
      confirmLabel: 'SEND PROPOSAL',
      run: (commandId) => state.requestDiplomacy(partner.id, 'trade_pact', 1, commandId) });
  }

  const element = dialog && <ReviewDialog title={dialog.title} summary={dialog.summary} metrics={dialog.metrics} warnings={dialog.warnings} visual={dialog.visual} allowed={dialog.allowed ?? true} confirmLabel={dialog.confirmLabel ?? 'CONFIRM'} onCancel={() => setDialog(null)} onConfirm={(commandId) => { dialog.run(commandId); setDialog(null); }} />;
  return { open, proposePact, element };
}

const ACTION_LABEL: Record<TradeOption['nextStep'], string> = {
  buy: 'BUY', sell: 'SELL', list_on_exchange: 'LIST ON EXCHANGE', propose_pact: 'PROPOSE TRADE PACT', pact_pending: 'PACT PENDING',
  improve_relations: 'IMPROVE RELATIONS', form_alliance: 'SEEK ALLIANCE', none: '',
};

function ActionButton({ option, onAction }: { option: TradeOption; onAction: (option: TradeOption) => void }) {
  if (option.nextStep === 'none') return <span className="trade-action-none" />;
  const label = option.nextStep === 'buy' && option.raw ? 'IMPORT' : ACTION_LABEL[option.nextStep];
  return <button className={'trade-action step-' + option.nextStep} onClick={() => onAction(option)}><LocaleText value={label} /></button>;
}

/** One route. `leading` is the flag (supplier lists) or the good's art (country desk). */
function TradeRow({ option, leading, title, maxAvailable, onAction, demand }: { option: TradeOption; leading: ReactNode; title: ReactNode; maxAvailable: number; onAction: (option: TradeOption) => void; demand?: number }) {
  const unit = option.raw ? (option.buyerId === option.partnerId ? '' : '/day') : '';
  return <div className={'trade-row tier-' + option.tier}>
    <span className="trade-row-lead">{leading}</span>
    <span className="trade-row-main">
      <strong>{title}</strong>
      <small className={'trade-reason ' + (option.eligible ? 'open' : option.tier === 1 ? 'near' : 'closed')}><LocaleText value={option.reason} /></small>
    </span>
    <span className="trade-row-stats">
    <span className="trade-row-stat">
      <small><LocaleText value={demand !== undefined ? 'DEMAND / MONTH' : 'SURPLUS'} /></small>
      <b><LocaleText value={amount(demand ?? option.available)} /><LocaleText value={unit} /></b>
      <Meter value={maxAvailable > 0 ? (demand ?? option.available) / maxAvailable * 100 : 0} label="Surplus" />
    </span>
    <span className="trade-row-stat">
      <small><LocaleText value="PRICE" /></small>
      <b>{money(option.price)}</b>
      <em><LocaleText value={priceDelta(option)} /></em>
    </span>
    <span className="trade-row-stat">
      <small><LocaleText value="RELATIONS" /></small>
      <b><LocaleText value={option.relationIndex} /><LocaleText value="/100" /></b>
      <Meter value={option.relationIndex} tone={option.relationIndex < 20 ? 'red' : 'cyan'} mark={20} label="Relations" />
    </span>
    <span className="trade-row-stat">
      <small><LocaleText value="CARGO" /></small>
      <b><LocaleText value={option.travelDays} /><LocaleText value=" days" /></b>
      <em><LocaleText value={option.distanceKm.toLocaleString()} /><LocaleText value=" km" /></em>
    </span>
    </span>
    <ActionButton option={option} onAction={onAction} />
  </div>;
}

/**
 * Ranked suppliers of one good for the player: open routes and routes one trade pact away are shown; countries
 * without access are collapsed behind "Show N more countries without access".
 */
export function SupplierRanking({ good, limit = 4 }: { good: ExchangeGood; limit?: number }) {
  const state = useGameStore();
  const actions = useTradeActions();
  const ranked = useMemo(() => rankSuppliers(state, state.playerCountryId, good), [state.day, state.countries, state.tradeDeals, state.world.living, state.industrialEconomy, state.production, good]);
  const relevant = ranked.filter((o) => o.tier <= 1);
  const shown = relevant.slice(0, limit);
  // Countries with surplus but no access yet (relations, alliance, war, sanctions) are worth knowing; no-surplus ones are only counted.
  const hidden = [...relevant.slice(limit), ...ranked.filter((o) => o.tier >= 2 && o.surplus)];
  const noSurplus = ranked.filter((o) => !o.surplus).length;
  const maxAvailable = Math.max(0, ...ranked.map((o) => o.available));
  const row = (o: TradeOption) => <TradeRow key={o.sellerId} option={o} maxAvailable={maxAvailable} onAction={actions.open}
    leading={<span className="trade-flag">{flagEmoji(state.countries[o.sellerId]?.iso2 ?? '')}</span>}
    title={<LocaleText value={state.countries[o.sellerId]?.name ?? o.sellerId} />} />;
  return <div className="trade-ranking">
    {shown.length ? shown.map(row) : <p className="trade-empty"><LocaleText value="No supplier with surplus can trade with you yet. Improve relations or propose a trade pact below." /></p>}
    {hidden.length > 0 && <details className="trade-more">
      <summary><LocaleText value={`Show ${hidden.length} more countries without access`} /></summary>
      {hidden.slice(0, 30).map(row)}
    </details>}
    {noSurplus > 0 && <small className="trade-footnote"><LocaleText value={`${noSurplus} countries have no exportable surplus`} /></small>}
    {actions.element}
  </div>;
}

/**
 * "Who can sell me this?" for the market window: pick any good and see the ranked suppliers. Opens on the
 * player's most urgent raw-resource shortfall.
 */
export function SupplierFinder() {
  const state = useGameStore();
  const player = state.countries[state.playerCountryId];
  const urgent = MARKET_RESOURCES.find((r) => resourceStrategicStatus(player, r) === 'CRITICAL') ?? MARKET_RESOURCES.find((r) => resourceStrategicStatus(player, r) === 'IMPORT NEED') ?? 'oil';
  const [good, setGood] = useState<ExchangeGood>(urgent);
  return <section className="trade-finder">
    <header className="trade-desk-hero">
      <CivicArt kind="trade" size={40} />
      <span><small><LocaleText value="SUPPLIER FINDER" /></small><strong><LocaleText value={`Who can sell you ${goodLabel(good).toLowerCase()}?`} /></strong><p className="trade-reason"><LocaleText value="Open routes first, then countries one trade pact away. Countries without access are collapsed." /></p></span>
    </header>
    <div className="trade-good-picker" role="tablist" aria-label={translateLive('Choose a good')}>
      {EXCHANGE_GOODS.map((g) => <button key={g} role="tab" aria-selected={good === g} className={good === g ? 'active' : ''} title={translateLive(goodLabel(g))} onClick={() => setGood(g)}><AssetThumbnail asset={g} size={30} /><span><LocaleText value={goodLabel(g)} /></span></button>)}
    </div>
    <SupplierRanking good={good} limit={5} />
  </section>;
}

/** The "Trade" tab of the country panel: what the player can buy from and sell to the selected country. */
export function CountryTradeDesk({ country }: { country: CountryState }) {
  const state = useGameStore();
  const actions = useTradeActions();
  const isPlayer = country.id === state.playerCountryId;
  const desk = useMemo(() => (isPlayer ? null : countryTradeOptions(state, country.id)), [isPlayer, country.id, state.day, state.countries, state.tradeDeals, state.world.living, state.industrialEconomy, state.production]);
  const [showAllBuy, setShowAllBuy] = useState(false);

  if (isPlayer || !desk) {
    const player = state.countries[state.playerCountryId];
    const needs = MARKET_RESOURCES.filter((r) => ['CRITICAL', 'IMPORT NEED'].includes(resourceStrategicStatus(player, r)));
    return <section className="trade-desk">
      <header className="trade-desk-hero"><CivicArt kind="trade" size={46} /><span><small><LocaleText value="TRADE DESK" /></small><strong><LocaleText value="Best suppliers for your shortfalls" /></strong><p><LocaleText value="Select another country to see what you can buy from it and sell to it." /></p></span></header>
      {needs.length ? needs.map((r) => <div key={r} className="trade-desk-section">
        <div className="trade-desk-subhead"><AssetThumbnail asset={r} size={26} /><LocaleText value={RAW_LABEL[r].toUpperCase()} /><em><LocaleText value={resourceStrategicStatus(player, r)} /></em></div>
        <SupplierRanking good={r} limit={3} />
      </div>) : <p className="trade-empty"><LocaleText value="No raw-resource shortfall. Open the market to trade industrial goods." /></p>}
      <button className="trade-open-market" onClick={() => state.navigate('market')}><LocaleText value="OPEN GLOBAL MARKET" /></button>
    </section>;
  }

  const open = desk.buy.filter((o) => o.eligible);
  const buy = showAllBuy ? desk.buy : [...open, ...desk.buy.filter((o) => !o.eligible).slice(0, Math.max(0, 6 - open.length))];
  const maxBuy = Math.max(0, ...desk.buy.map((o) => o.available));
  const maxSell = Math.max(0, ...desk.sell.map((o) => o.demand));
  const goodLead = (o: TradeOption) => <AssetThumbnail asset={o.good} size={34} />;
  const goodTitle = (o: TradeOption) => <LocaleText value={goodLabel(o.good)} />;
  return <section className="trade-desk">
    <header className="trade-desk-hero">
      <CivicArt kind="trade" size={46} />
      <span>
        <small><LocaleText value="TRADE DESK" /></small>
        <strong><LocaleText value={country.name} /></strong>
        <p className={desk.hasPact ? 'trade-reason open' : 'trade-reason ' + (desk.pactStep === 'propose_pact' ? 'near' : 'closed')}><LocaleText value={desk.pactReason} /></p>
      </span>
      <span className="trade-desk-facts">
        <span><small><LocaleText value="RELATIONS" /></small><b><LocaleText value={desk.relationIndex} /><LocaleText value="/100" /></b><Meter value={desk.relationIndex} tone={desk.relationIndex < 20 ? 'red' : 'cyan'} mark={20} label="Relations" /></span>
        <span><small><LocaleText value="CARGO" /></small><b><LocaleText value={desk.travelDays} /><LocaleText value=" days" /></b><em><LocaleText value={desk.distanceKm.toLocaleString()} /><LocaleText value=" km" /></em></span>
      </span>
      {desk.pactStep === 'propose_pact' && <button className="trade-action step-propose_pact" onClick={() => actions.proposePact(country)}><LocaleText value="PROPOSE TRADE PACT" /></button>}
      {(desk.pactStep === 'improve_relations' || desk.pactStep === 'pact_pending') && <button className="trade-action" onClick={() => state.navigate('diplomacy', country.id)}><LocaleText value="OPEN DIPLOMACY" /></button>}
    </header>

    <div className="trade-desk-section">
      <div className="trade-desk-subhead"><LocaleText value="YOU CAN BUY" /><em><LocaleText value={`${open.length} open · ${desk.buy.length} with surplus`} /></em></div>
      {buy.map((o) => <TradeRow key={o.good} option={o} leading={goodLead(o)} title={goodTitle(o)} maxAvailable={maxBuy} onAction={actions.open} />)}
      {!desk.buy.length && <p className="trade-empty"><LocaleText value={`${country.name} has no exportable surplus right now.`} /></p>}
      {buy.length < desk.buy.length && <button className="trade-more-button" onClick={() => setShowAllBuy(true)}><LocaleText value={`Show ${desk.buy.length - buy.length} more goods`} /></button>}
    </div>

    <div className="trade-desk-section">
      <div className="trade-desk-subhead"><LocaleText value="YOU CAN SELL" /><em><LocaleText value={`${desk.sell.filter((o) => o.eligible).length} open · ${desk.sell.length} in demand`} /></em></div>
      {desk.sell.map((o: SaleOption) => <TradeRow key={o.good} option={o} leading={goodLead(o)} title={goodTitle(o)} maxAvailable={maxSell} demand={o.demand} onAction={actions.open} />)}
      {!desk.sell.length && <p className="trade-empty"><LocaleText value={`${country.name} has no current demand for goods you can export.`} /></p>}
    </div>

    <button className="trade-open-market" onClick={() => state.navigate('market')}><LocaleText value="OPEN GLOBAL MARKET" /></button>
    {actions.element}
  </section>;
}

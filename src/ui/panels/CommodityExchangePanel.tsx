import { lazy, Suspense, useMemo, useState } from 'react';
import { useWorldView } from '../../store/useWorldView';
import { LocaleText, translateLive } from '../../i18n/localeText';
import { money as formatMoney } from '../formatMoney';
import { AssetThumbnail } from '../icons/AssetThumbnail';
import { TreasuryIcon } from '../icons/GameIcons';
import { ReviewDialog, type ReviewContent } from './ReviewDialog';
import type { Commodity } from '../../domain/commodityExchange';
import {
  COMMODITIES, COMMODITY_SPECS, EXCHANGE_FEE, commodityHoldings, commodityNews, commodityOrderPreview, commodityQuote,
  maxOrderQuantity, commodityExchange,
} from '../../engine/systems/commodityExchange';

const CommodityPriceChart = lazy(() => import('./CommodityPriceChart'));
const RANGES = [30, 90, 180] as const;

const pct = (v: number, digits = 2) => `${v > 0 ? '+' : ''}${(v * 100).toFixed(digits)}%`;

/** Small SVG sparkline of the last closes; colour follows the 30-day direction. */
function Sparkline({ values, rising }: { values: number[]; rising: boolean }) {
  if (values.length < 2) return <svg className="cx-spark" viewBox="0 0 80 24" aria-hidden="true" />;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1) * 80).toFixed(1)},${(22 - (v - min) / span * 20).toFixed(1)}`).join(' ');
  return <svg className={`cx-spark ${rising ? 'up' : 'down'}`} viewBox="0 0 80 24" aria-hidden="true"><polyline points={points} fill="none" strokeWidth="1.6" /></svg>;
}

/** Bar showing how much of a limit is used. */
function LimitBar({ label, used, limit, format }: { label: string; used: number; limit: number; format: (v: number) => string }) {
  const share = limit > 0 && Number.isFinite(limit) ? Math.min(1, used / limit) : 0;
  return <div className={`cx-limit ${share > 0.999 ? 'full' : ''}`}><span><LocaleText value={label} /></span><i><b style={{ width: `${share * 100}%` }} /></i><em>{format(used)} / {Number.isFinite(limit) ? format(limit) : '∞'}</em></div>;
}

export function CommodityExchangePanel() {
  const s = useWorldView();
  const language = s.playerProfile.language;
  const money = (v: number) => formatMoney(v, language);
  const units = (v: number) => v.toLocaleString(language, { maximumFractionDigits: v < 10 ? 3 : 1 });
  const [good, setGood] = useState<Commodity>('oil');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState(1);
  const [range, setRange] = useState<(typeof RANGES)[number]>(90);
  const [review, setReview] = useState<(ReviewContent & { execute: (commandId: string) => void; allowed?: boolean }) | null>(null);

  const ex = commodityExchange(s);
  const quotes = useMemo(() => COMMODITIES.map((g) => commodityQuote(s, g)), [s.world.commodities, s.day, s.countries]);
  const quote = quotes.find((x) => x.good === good)!;
  const preview = useMemo(() => commodityOrderPreview(s, s.playerCountryId, good, side, quantity), [s.world.commodities, s.countries, s.wars, s.day, good, side, quantity]);
  const holdings = useMemo(() => commodityHoldings(s), [s.world.commodities, s.countries]);
  const news = commodityNews(s, 6);
  const holding = holdings.find((h) => h.good === good);
  const spec = COMMODITY_SPECS[good];
  const closes = quote.history.slice(-range);
  const firstDay = quote.firstHistoryDay + quote.history.length - closes.length;
  const shockDays = useMemo(() => ex.shocks.filter((x) => x.good === good).map((x) => x.day), [ex.shocks, good]);
  const totals = holdings.reduce((a, h) => ({ value: a.value + h.marketValue, unrealized: a.unrealized + h.unrealized, realized: a.realized + h.realized, storage: a.storage + h.storagePaid, daily: a.daily + h.dailyStorageCost }), { value: 0, unrealized: 0, realized: 0, storage: 0, daily: 0 });
  const label = (g: Commodity) => translateLive(COMMODITY_SPECS[g].label);
  const counterparty = preview.counterpartyId ? s.countries[preview.counterpartyId]?.name ?? preview.counterpartyId : null;

  const fill = (share: number) => setQuantity(Number((maxOrderQuantity(s, s.playerCountryId, good, side) * share).toFixed(4)) || 0);
  const openReview = () => setReview({
    title: side === 'buy' ? 'Review exchange purchase' : 'Review exchange sale',
    summary: side === 'buy'
      ? (spec.physical ? 'Payment is taken now. The cargo flies from the seller and joins your strategic reserve on arrival.' : 'Payment is taken now. The metal is held in an exchange vault and can be sold at any time.')
      : 'The goods leave now. Proceeds, after the fee, reach the treasury on the next day (T+1).',
    metrics: [
      ['Commodity', label(good)],
      ['Quantity', `${units(preview.quantity)} ${translateLive(spec.unit)}`],
      ['Mid price', money(preview.mid)],
      ['Fill price', money(preview.fillPrice)],
      ['Spread', pct(preview.spread)],
      ['Market impact', pct(preview.impact)],
      ['Exchange fee', money(preview.fee)],
      ...(preview.freight > 0 ? [['Freight & insurance', money(preview.freight)]] : []),
      [side === 'buy' ? 'Total cost' : 'Proceeds (T+1)', money(preview.total)],
      ...(counterparty ? [[side === 'buy' ? 'Seller' : 'Buyer', counterparty], ['Cargo flight', `${preview.arrivalDays} ${translateLive('days')}`]] : []),
      ...(side === 'sell' && preview.fromPosition > 0 ? [['Realized profit', money(preview.realized)]] : []),
    ],
    warnings: preview.reasons,
    allowed: preview.allowed,
    execute: (commandId) => s.tradeCommodity(good, side, quantity, commandId),
  });

  return (
    <section className="commodity-exchange" data-testid="commodity-exchange">
      <header className="cx-header">
        <div>
          <small><LocaleText value="SPOT MARKET · PHYSICAL & PRECIOUS" /></small>
          <h3><LocaleText value="Commodity Exchange" /></h3>
          <p><LocaleText value="Buy when prices fall and sell when they rise. Prices follow world supply, shocks from the news and every country's orders. Spreads, fees, freight and storage make random trading lose money." /></p>
        </div>
        <button className="cx-credit" onClick={() => s.openTool('credit')}><TreasuryIcon size={18} /><span><LocaleText value="Borrow through Sovereign Credit" /></span></button>
      </header>

      <div className="cx-tape" aria-label={translateLive('Market news')}>
        {news.length ? news.map(({ shock, ageDays, remaining }) => (
          <span key={shock.id} className={shock.size > 0 ? 'up' : 'down'}>
            <b>{ageDays === 0 ? <LocaleText value="TODAY" /> : <><LocaleText value="Day" /> {shock.day}</>}</b>
            {shock.countryId && s.countries[shock.countryId] ? <><LocaleText value={s.countries[shock.countryId].name} />: </> : null}
            <LocaleText value={shock.headline} />
            <em>{label(shock.good)} {pct(Math.exp(remaining) - 1, 1)}</em>
          </span>
        )) : <span><LocaleText value="Markets are calm. Watch for droughts, wars and supply news." /></span>}
      </div>

      <div className="cx-grid">
        <nav className="cx-board" aria-label={translateLive('Commodities')}>
          {quotes.map((q) => (
            <button key={q.good} className={q.good === good ? 'active' : ''} aria-pressed={q.good === good} onClick={() => { setGood(q.good); setQuantity(1); }}>
              <AssetThumbnail asset={q.good} size={30} />
              <span className="cx-name"><strong>{label(q.good)}</strong><small>{money(q.price)} / {translateLive(COMMODITY_SPECS[q.good].unit === 'tonnes' ? 'tonne' : 'unit')}</small></span>
              <Sparkline values={q.history.slice(-30)} rising={q.change30d >= 0} />
              <em className={q.change1d >= 0 ? 'up' : 'down'}>{pct(q.change1d)}</em>
            </button>
          ))}
        </nav>

        <div className="cx-main">
          <div className="cx-quote">
            <AssetThumbnail asset={good} size={44} />
            <div>
              <small>{label(good)} · <LocaleText value="spot" /></small>
              <strong>{money(quote.price)}</strong>
              <span className={quote.change1d >= 0 ? 'up' : 'down'}>{pct(quote.change1d)} <LocaleText value="today" /> · {pct(quote.change30d)} <LocaleText value="30 days" /></span>
            </div>
            <dl>
              <div><dt><LocaleText value="Fundamental" /></dt><dd>{money(quote.fundamental)}</dd></div>
              <div><dt><LocaleText value="Shock premium" /></dt><dd className={quote.premium > 0.005 ? 'up' : quote.premium < -0.005 ? 'down' : ''}>{pct(Math.exp(quote.premium) - 1, 1)}</dd></div>
              <div><dt><LocaleText value="Spread" /></dt><dd>{pct(quote.spread)}</dd></div>
              <div><dt><LocaleText value="Daily volatility" /></dt><dd>{pct(spec.volatility, 1)}</dd></div>
            </dl>
          </div>
          <div className="cx-range" role="group" aria-label={translateLive('History range')}>
            {RANGES.map((n) => <button key={n} aria-pressed={range === n} className={range === n ? 'active' : ''} onClick={() => setRange(n)}>{n} <LocaleText value="days" /></button>)}
          </div>
          <div className="cx-chart">
            <Suspense fallback={<p><LocaleText value="Loading price chart…" /></p>}>
              <CommodityPriceChart closes={closes} firstDay={firstDay} label={label(good)} language={language} avgCost={holding && holding.units + holding.inbound > 0 ? holding.avgCost : undefined} fundamental={quote.fundamental} shockDays={shockDays} rising={closes[closes.length - 1] >= closes[0]} />
            </Suspense>
          </div>

          <div className="cx-order">
            <div className="cx-side" role="group" aria-label={translateLive('Order side')}>
              <button className={side === 'buy' ? 'active buy' : ''} aria-pressed={side === 'buy'} onClick={() => setSide('buy')}><LocaleText value="BUY" /></button>
              <button className={side === 'sell' ? 'active sell' : ''} aria-pressed={side === 'sell'} onClick={() => setSide('sell')}><LocaleText value="SELL" /></button>
            </div>
            <label>
              <span><LocaleText value="Quantity" /> ({translateLive(spec.unit)})</span>
              <input aria-label={translateLive('Exchange order quantity')} type="number" min="0" step="0.1" value={quantity} onChange={(e) => setQuantity(Math.max(0, Number(e.target.value) || 0))} />
            </label>
            <div className="cx-quick">
              {[0.25, 0.5, 1].map((share) => <button key={share} onClick={() => fill(share)}>{share === 1 ? translateLive('Max') : `${share * 100}%`}</button>)}
            </div>
            <dl className="cx-preview">
              <div><dt><LocaleText value="Fill price" /></dt><dd>{money(preview.fillPrice)}</dd></div>
              <div><dt><LocaleText value="Spread cost" /></dt><dd>{money(preview.spreadCost)}</dd></div>
              <div><dt><LocaleText value="Market impact" /></dt><dd>{pct(preview.impact)}</dd></div>
              <div><dt><LocaleText value="Exchange fee" /> ({pct(EXCHANGE_FEE)})</dt><dd>{money(preview.fee)}</dd></div>
              {preview.freight > 0 && <div><dt><LocaleText value="Freight & insurance" /></dt><dd>{money(preview.freight)}</dd></div>}
              {spec.physical && side === 'buy' && <div><dt><LocaleText value="Storage per day" /></dt><dd>{money(preview.dailyStorageCost)}</dd></div>}
              <div className="total"><dt><LocaleText value={side === 'buy' ? 'Total cost' : 'Proceeds (T+1)'} /></dt><dd>{money(preview.total)}</dd></div>
              {counterparty && <div><dt><LocaleText value={side === 'buy' ? 'Seller' : 'Buyer'} /></dt><dd><LocaleText value={counterparty} /> · ✈ {preview.arrivalDays} <LocaleText value="days" /></dd></div>}
            </dl>
            <div className="cx-limits">
              <LimitBar label="Daily order limit" used={preview.dailyUsed} limit={preview.dailyLimit} format={units} />
              <LimitBar label="Position limit (5% of GDP)" used={preview.positionValue} limit={preview.positionLimit} format={money} />
              {spec.physical && <LimitBar label="Strategic storage" used={preview.storageUsed} limit={preview.storageCapacity} format={units} />}
            </div>
            {preview.reasons.length > 0 && quantity > 0 && <ul className="cx-reasons">{preview.reasons.map((r) => <li key={r}><LocaleText value={r} /></li>)}</ul>}
            <button className={`cx-submit ${side}`} disabled={!preview.allowed} onClick={openReview}><LocaleText value={side === 'buy' ? 'Review purchase' : 'Review sale'} /></button>
          </div>
        </div>
      </div>

      <section className="cx-holdings">
        <h4><LocaleText value="Holdings & profit" /></h4>
        {holdings.length ? (
          <table>
            <thead><tr><th><LocaleText value="Commodity" /></th><th><LocaleText value="Held" /></th><th><LocaleText value="Average cost" /></th><th><LocaleText value="Market value" /></th><th><LocaleText value="Unrealized" /></th><th><LocaleText value="Realized" /></th><th><LocaleText value="Storage paid" /></th><th><LocaleText value="Net" /></th></tr></thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.good} onClick={() => setGood(h.good)}>
                  <td>{label(h.good)}</td>
                  <td>{units(h.units)}{h.inbound > 0 && <small> + {units(h.inbound)} ✈</small>}</td>
                  <td>{money(h.avgCost)}</td>
                  <td>{money(h.marketValue)}</td>
                  <td className={h.unrealized >= 0 ? 'up' : 'down'}>{money(h.unrealized)}</td>
                  <td className={h.realized >= 0 ? 'up' : 'down'}>{money(h.realized)}</td>
                  <td>{money(h.storagePaid)}</td>
                  <td className={h.net >= 0 ? 'up' : 'down'}>{money(h.net)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td><LocaleText value="Total" /></td><td /><td /><td>{money(totals.value)}</td><td className={totals.unrealized >= 0 ? 'up' : 'down'}>{money(totals.unrealized)}</td><td className={totals.realized >= 0 ? 'up' : 'down'}>{money(totals.realized)}</td><td>{money(totals.storage)}</td><td className={totals.realized + totals.unrealized - totals.storage >= 0 ? 'up' : 'down'}>{money(totals.realized + totals.unrealized - totals.storage)}</td></tr></tfoot>
          </table>
        ) : <p><LocaleText value="No exchange holdings yet. Physical purchases join your strategic reserve; national consumption can draw them down." /></p>}
        {totals.daily > 0 && <p className="cx-note"><LocaleText value="Storage cost per day" />: <b>{money(totals.daily)}</b></p>}
      </section>
    </section>
  );
}

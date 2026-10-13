import {useWorldView} from '../../store/useWorldView';
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../../store/gameStore";
import { LocaleText,translateLive } from "../../i18n/localeText";
import {
  EXCHANGE_GOODS,
  living,
  exchangePrice,
  exchangeAccess,
  exportableStock,
  exchangeStock,
} from "../../engine/systems/livingEconomy";
import type { ExchangeGood } from "../../domain/living";
import { GOODS } from "../../data/industrialCatalog";
import {money as formatMoney} from '../formatMoney';
import { AssetThumbnail } from "../icons/AssetThumbnail";
import { ReviewDialog, type ReviewContent } from "./ReviewDialog";
import { tankDomesticCost } from "../../engine/systems/industrialMarket";
import { GOLD_SOURCE } from "../../data/preciousMetals";
const label = (g: ExchangeGood) =>
  g in GOODS ? GOODS[g as keyof typeof GOODS].label : g.charAt(0).toUpperCase()+g.slice(1).replaceAll('_',' ');
export function OpenExchange() {
  const s = useWorldView(),
    l = living(s),
    p = s.countries[s.playerCountryId],
    [good, setGood] = useState<ExchangeGood>("gold"),
    [quantity, setQuantity] = useState(1),
    [saleQuantity, setSaleQuantity] = useState(1),
    [ask, setAsk] = useState(0),
    [bankQty, setBankQty] = useState(0.1),
    [review, setReview] = useState<
      (ReviewContent & { execute: (commandId:string) => void; allowed?: boolean }) | null
    >(null);
  const navigation=useGameStore(s=>s.navigation),root=useRef<HTMLElement>(null);
  useEffect(()=>{
    const intent=navigation?.intent;
    if(intent?.kind!=='market'||!intent.focusedGood)return;
    setGood(intent.focusedGood);setReview(null);
    root.current?.querySelector<HTMLButtonElement>(`[data-good="${intent.focusedGood}"]`)?.focus({preventScroll:true});
  },[navigation]);
  const reference = exchangePrice(s, good),
    price = ask || reference,
    offers = l.listings
      .filter(
        (x) =>
          x.status === "open" &&
          x.good === good &&
          x.sellerId !== p.id &&
          x.expiresDay >= s.day,
      )
      .sort((a, b) => a.unitPrice - b.unitPrice),
    own = l.listings.filter((x) => x.sellerId === p.id && x.status === "open"),
    vault = l.bankGold[p.id];
  const money=(value:number)=>formatMoney(value,s.playerProfile.language);
  const displayLabel=(g:ExchangeGood)=>{const text=translateLive(label(g));return text.charAt(0).toLocaleUpperCase(s.playerProfile.language)+text.slice(1).toLocaleLowerCase(s.playerProfile.language);};
  return (
    <section ref={root} className="open-exchange">
      <header>
        <h3>
          <LocaleText value="Open Market & Precious Metals" />
        </h3>
        <p>
          <LocaleText value="Compare seller prices. Listings reserve real stock; you earn money only when a buyer purchases it. High asking prices may remain unsold." />
        </p>
      </header>
      <div className="exchange-filters">
        {EXCHANGE_GOODS.map((g) => (
          <button
            className={g === good ? "active" : ""}
            key={g} data-good={g}
            onClick={() => {
              setGood(g);
              setAsk(0);
            }}
          >
            <AssetThumbnail asset={g} size={32} />
            <span>{displayLabel(g)}</span>
          </button>
        ))}
      </div>
      <div className="market-facts">
        <span>
          <LocaleText value="Market reference" />
          <strong>{money(reference)}</strong>
        </span>
        <span>
          <LocaleText value="Available to list" />
          <strong>{exportableStock(s, p.id, good).toFixed(3)}</strong>
        </span>
        <span>
          <LocaleText value="Own stock" />
          <strong>{exchangeStock(s, p.id, good).toFixed(3)}</strong>
        </span>
      </div>
      {good === "tanks" && (
        <p>
          <LocaleText value="Estimated domestic assembly cost" />:{" "}
          <b>{money(tankDomesticCost(s, p.id))}</b> ·{" "}
          <LocaleText value="Requires components, factories, technology and daily production time. Imported vehicles require strong relations, a trade pact and alliance." />
        </p>
      )}
      <div className="exchange-columns">
      <section className="exchange-buy" aria-label={translateLive("Buy from sellers")}><h4><LocaleText value="Buy from sellers"/></h4>
      <label>
        <LocaleText value="Quantity" />
        <input
          aria-label="Open market quantity"
          type="number"
          min=".001"
          max="100000"
          step=".1"
          value={quantity}
          onChange={(e) =>
            setQuantity(Math.max(0.001, Number(e.target.value) || 0.001))
          }
        />
      </label>
      <div className="seller-offers">
        {offers.map((x) => {
          const accessible = exchangeAccess(s, x.sellerId, p.id, good),
            q = Math.min(quantity, x.remaining),
            cost = q * x.unitPrice;
          return (
            <article key={x.id}>
              <AssetThumbnail asset={good} size={42} />
              <div>
                <strong>
                  <LocaleText value={s.countries[x.sellerId].name} />
                </strong>
                <small>
                  {money(x.unitPrice)} /{" "}
                  <LocaleText
                    value={
                      good in GOODS
                        ? GOODS[good as keyof typeof GOODS].unit
                        : "strategic lot"
                    }
                  />{" "}
                  · {x.remaining.toFixed(3)} <LocaleText value="available" />
                </small>
              </div>
              <button
                onClick={() =>
                  accessible
                    ? setReview({
                        title: "Buy market listing",
                        summary:
                          "Stock and payment transfer immediately. Completed purchases cannot be reversed automatically; you can resell the goods.",
                        metrics: [
                          ["Seller", s.countries[x.sellerId].name],
                          ["Quantity", q.toFixed(3)],
                          ["Unit price", money(x.unitPrice)],
                          ["Shipment value", money(cost)],
                          ["Treasury after", money(p.economy.treasury - cost)],
                        ],
                        allowed: p.economy.treasury >= cost,
                        execute: (commandId) => s.buyListing(x.id, q, commandId),
                      })
                    : s.navigate("diplomacy", x.sellerId)
                }
              >
                <LocaleText
                  value={
                    accessible ? "Review purchase" : "Open partner diplomacy"
                  }
                />
              </button>
            </article>
          );
        })}
        {!offers.length && (
          <p>
            <LocaleText value="No listings for this product yet. Countries publish surplus offers during weekly market reviews." />
          </p>
        )}
      </div>
      </section>
      <section className="exchange-sell" aria-label={translateLive("Sell from reserves")}><section className="listing-form">
        <h4>
          <LocaleText value="Sell on the open market" />
        </h4>
        <label><LocaleText value="Quantity"/><input aria-label={translateLive("Open market sale quantity")} type="number" min=".001" max="100000" step=".1" value={saleQuantity} onChange={e=>setSaleQuantity(Math.max(.001,Number(e.target.value)||.001))}/></label>
        <label>
          <LocaleText value="Ask per unit (USD)" />
          <input
            aria-label="Listing unit price USD"
            type="number"
            min="1"
            step="1000"
            value={Math.round(price * 1e9)}
            onChange={(e) =>
              setAsk(Math.max(0.000000001, (Number(e.target.value) || 1) / 1e9))
            }
          />
        </label>
        <strong>{money(price)}</strong>
        <button
          disabled={saleQuantity > exportableStock(s, p.id, good)}
          onClick={() =>
            setReview({
              title: "Publish sale listing",
              summary:
                "Goods move into reserved inventory for up to 60 days. Cancel to return unsold stock. The asking price does not guarantee a buyer.",
              metrics: [
                ["Product", label(good)],
                ["Reserved quantity", saleQuantity.toFixed(3)],
                ["Ask per unit", money(price)],
                ["Potential proceeds", money(saleQuantity * price)],
              ],
              execute: (commandId) => s.postListing(good, saleQuantity, price, commandId),
            })
          }
        >
          <LocaleText value="Review listing" />
        </button>
        {price > reference * 1.15 && (
          <p className="price-warning">
            <LocaleText value="Above typical buyer limits: this listing may remain unsold." />
          </p>
        )}
      </section>
      <div className="own-listings">
        <h4>
          <LocaleText value="Your reserved listings" />
        </h4>
        {own.map((x) => (
          <article key={x.id}>
            <span>
              <LocaleText value={label(x.good)} /> · {x.remaining.toFixed(3)} ·{" "}
              {money(x.unitPrice)}
            </span>
            <button
              onClick={() =>
                setReview({
                  title: "Cancel sale listing",
                  summary:
                    "Only the unsold reserved quantity returns to your stock. Previous sales remain settled.",
                  metrics: [["Returned quantity", x.remaining.toFixed(3)]],
                  execute: (commandId) => s.cancelListing(x.id, commandId),
                })
              }
            >
              <LocaleText value="Return unsold stock" />
            </button>
          </article>
        ))}
      </div>
      </section></div>
      {vault && (
        <section className="gold-vault">
          <AssetThumbnail asset="gold" size={64} />
          <div>
            <h4>
              <LocaleText value="Central-bank gold vault" />
            </h4>
            <strong>
              {vault.tonnes.toFixed(2)} <LocaleText value="tonnes" />
            </strong>
            <p>
              <LocaleText
                value={
                  vault.confidence === "reported"
                    ? "Reported opening snapshot"
                    : "Game estimate; current official data unavailable"
                }
              />{" "}
              · {vault.asOf}
            </p>
            {vault.confidence === "reported" && (
              <a href={GOLD_SOURCE} target="_blank" rel="noreferrer">
                World Gold Council
              </a>
            )}
            <p>
              <LocaleText value="Vault gold is separate from factory inputs. Release it to industrial stock before listing or using it; deposit industrial gold to rebuild reserves." />
            </p>
            <input
              aria-label="Vault transfer tonnes"
              type="number"
              min=".001"
              step=".1"
              value={bankQty}
              onChange={(e) =>
                setBankQty(Math.max(0.001, Number(e.target.value) || 0.001))
              }
            />
            {(["release", "deposit"] as const).map((direction) => (
              <button
                key={direction}
                disabled={
                  bankQty >
                  (direction === "release"
                    ? vault.tonnes
                    : exchangeStock(s, p.id, "gold"))
                }
                onClick={() =>
                  setReview({
                    title:
                      direction === "release"
                        ? "Release reserve gold"
                        : "Deposit reserve gold",
                    summary:
                      "Transfer between the central-bank vault and industrial metal inventory. This transfer itself does not earn or spend money.",
                    metrics: [["Gold tonnes", bankQty.toFixed(3)]],
                    execute: (commandId) => s.moveBankGold(bankQty, direction, commandId),
                  })
                }
              >
                <LocaleText
                  value={
                    direction === "release"
                      ? "Review reserve release"
                      : "Review reserve deposit"
                  }
                />
              </button>
            ))}
          </div>
        </section>
      )}
      {review && (
        <ReviewDialog
          {...review}
          onCancel={() => setReview(null)}
          onConfirm={(commandId) => {
            review.execute(commandId);
            setReview(null);
          }}
        />
      )}
    </section>
  );
}

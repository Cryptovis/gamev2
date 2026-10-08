import {useWorldView} from '../../store/useWorldView';
import { useState } from "react";
import { useGameStore } from "../../store/gameStore";
import {
  expansion,
  arrears,
  riskRate,
  loanTotal,
  creditOfferStatus,
} from "../../engine/systems/sovereignCredit";
import { CommandWindow } from "./CommandWindow";
import { ReviewDialog, type ReviewContent } from "./ReviewDialog";
import { LocaleText } from "../../i18n/localeText";
import {money as formatMoney} from '../formatMoney';
export function CreditWindow() {
  const s = useWorldView(),
    e = expansion(s),
    p = s.countries[s.playerCountryId],
    [kind, setKind] = useState<"lend" | "borrow">("borrow"),
    [millions, setMillions] = useState(1),
    [apr, setApr] = useState(3),
    [days, setDays] = useState<90 | 180 | 365>(365),
    [review, setReview] = useState<
      (ReviewContent & { execute: (commandId:string) => void; allowed?: boolean }) | null
    >(null);
  const principal = millions / 1000;
  const status=creditOfferStatus(s,kind,principal,apr,days);
  const money=(value:number)=>formatMoney(value,s.playerProfile.language);
  return (
    <CommandWindow
      wide
      title="Sovereign Credit & Monetary Fund"
      kicker="CAPITAL MARKETS"
      onClose={s.closeWorkspace}
    >
      <div className="credit-overview">
        <article>
          <small>
            <LocaleText value="Spendable treasury" />
          </small>
          <strong>{money(p.economy.treasury)}</strong>
        </article>
        <article>
          <small>
            <LocaleText value="Fiscal balance after arrears" />
          </small>
          <strong>{money(p.economy.treasury - arrears(s, p.id))}</strong>
        </article>
        <article>
          <small>
            <LocaleText value="Risk-based reference APR" />
          </small>
          <strong>{riskRate(s, p.id).toFixed(2)}%</strong>
        </article>
      </div>
      <p>
        <LocaleText value="APR is annual interest, prorated by term. At maturity, cash is collected first, then vault gold, precious metals and resources at conservative market prices. Unpaid debt creates arrears and compulsory taxes until settled." />
      </p>
      <aside className="credit-status" role="status"><p><LocaleText value="Amounts are entered in USD millions. Lending reserves cash immediately; a posted offer waits for a counterparty and is not a completed loan."/></p><strong><LocaleText value="Principal"/>: {money(principal)} · <LocaleText value="Spendable treasury"/>: {money(status.treasury)} · <LocaleText value="Maximum principal"/>: {money(status.maxPrincipal)}</strong>{status.reasons.map(reason=><p key={reason}><LocaleText value={reason}/></p>)}{status.shortfall>0&&<p><LocaleText value="Treasury shortfall"/>: {money(status.shortfall)}</p>}{kind==='lend'&&Math.min(status.maxPrincipal,status.treasury)>=.001&&<button onClick={()=>setMillions(Math.floor(Math.min(status.maxPrincipal,status.treasury)*1000))}><LocaleText value="Use maximum affordable lending"/></button>}</aside>
      <div className="credit-compose">
        <label>
          <LocaleText value="Offer type" />
          <select
            aria-label="Credit offer type"
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            <option value="borrow">
              <LocaleText value="Request a loan" />
            </option>
            <option value="lend">
              <LocaleText value="Offer lending" />
            </option>
          </select>
        </label>
        <label>
          <LocaleText value="Principal (USD millions)" />
          <input
            aria-label="Credit principal millions"
            type="number"
            min="1"
            value={millions}
            onChange={(e) => setMillions(Number(e.target.value))}
          />
        </label>
        <label>
          <LocaleText value="Annual interest (%)" />
          <input
            aria-label="Credit APR"
            type="number"
            min="0"
            max="30"
            step=".1"
            value={apr}
            onChange={(e) => setApr(Number(e.target.value))}
          />
        </label>
        <label>
          <LocaleText value="Term" />
          <select
            aria-label="Credit duration"
            value={days}
            onChange={(e) => setDays(Number(e.target.value) as typeof days)}
          >
            {[90, 180, 365].map((d) => (
              <option key={d} value={d}>
                {d} <LocaleText value="days" />
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() =>
            setReview({
              title: "Publish credit terms",
              summary:
                "Posting these exact terms authorizes a matching country to fund the request or borrow the reserved money. An unmatched offer can be cancelled.",
              metrics: [
                ["Principal", money(principal)],
                ["Spendable treasury",money(status.treasury)],
                ["Treasury shortfall",money(status.shortfall)],
                ["Maximum principal",money(status.maxPrincipal)],
                ["Open offers",`${status.openOffers} / 3`],
                [
                  "Repayment at maturity",
                  money(loanTotal(principal, apr, days)),
                ],
                ["Annual interest", `${apr}%`],
                ["Term", `${days} days`],
              ],
              allowed:status.allowed,
              warnings:status.reasons,
              execute: (commandId) => s.postCredit(kind, principal, apr, days, commandId),
            })
          }
        >
          <LocaleText value="Review credit offer" />
        </button>
      </div>
      <h3>
        <LocaleText value="Sovereign lending & borrowing board" />
      </h3>
      <div className="credit-board">
        {e.creditOffers
          .filter((o) => o.status === "open" && o.expiresDay >= s.day)
          .map((o) => (
            <article key={o.id}>
              <div>
                <b><LocaleText value={s.countries[o.countryId].name}/></b>
                <span>
                  <LocaleText
                    value={
                      o.kind === "lend"
                        ? "Lending available"
                        : "Borrowing requested"
                    }
                  />
                </span>
              </div>
              <strong>{money(o.principal)}</strong>
              <span>
                {o.apr}% <LocaleText value="Annual interest" /> · {o.days} <LocaleText value="days" />
              </span>
              <button
                onClick={() =>
                  setReview(
                    o.countryId === p.id
                      ? {
                          title: "Cancel unmatched credit",
                          summary:
                            "Reserved lending cash is returned. Matched loans cannot be cancelled.",
                          execute: (commandId) => s.cancelCredit(o.id, commandId),
                        }
                      : {
                          title:
                            o.kind === "lend"
                              ? "Borrow from this country"
                              : "Fund this country",
                          summary:
                            "Review the binding terms. Collateral can be seized at maturity; unpaid balances trigger compulsory tax collection.",
                          metrics: [
                            ["Partner", s.countries[o.countryId].name],
                            ["Principal", money(o.principal)],
                            [
                              "Repayment at maturity",
                              money(loanTotal(o.principal, o.apr, o.days)),
                            ],
                            ["Maturity day", String(s.day + o.days)],
                          ],
                          execute: (commandId) => s.acceptCredit(o.id, commandId),
                        },
                  )
                }
              >
                <LocaleText
                  value={
                    o.countryId === p.id ? "Cancel offer" : "Review agreement"
                  }
                />
              </button>
            </article>
          ))}
      </div>
      <h3>
        <LocaleText value="Your sovereign loans" />
      </h3>
      {e.loans
        .filter((l) => l.borrowerId === p.id || l.lenderId === p.id)
        .map((l) => (
          <article className="credit-loan" key={l.id}>
            <b>
              {s.countries[l.lenderId].name} → {s.countries[l.borrowerId].name}
            </b>
            <span>
              {money(l.outstanding)} · <LocaleText value={l.status} /> ·{" "}
              <LocaleText value="Due day" /> {l.dueDay}
            </span>
          </article>
        ))}
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
    </CommandWindow>
  );
}

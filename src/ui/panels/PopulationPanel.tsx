import {leaderModifiers} from '../../engine/systems/leaderPerks';
import {recruitmentPreview} from '../../engine/systems/livingEconomy';
import { arrears } from "../../engine/systems/sovereignCredit";
import { useState, useEffect } from "react";
import type { CountryState } from "../../domain/game";
import {useWorldView} from '../../store/useWorldView';
import { LocaleText } from "../../i18n/localeText";
import {
  populationForecast,
  civilianPopulation,
} from "../../engine/systems/population";
import { simulateResources } from "../../engine/systems/resources";
import { ReviewDialog } from "./ReviewDialog";
import { money } from "../formatMoney";
export function PopulationPanel({ country: c, policyOnly=false, showPolicy=true }: { country: CountryState; policyOnly?:boolean; showPolicy?:boolean }) {
  const s = useWorldView(),
    own = c.id === s.playerCountryId,
    [tax, setTax] = useState(c.economy.taxRate),
    [review, setReview] = useState(false),
    forecast = populationForecast(c, simulateResources(c,1,undefined,leaderModifiers(s,c.id).consumer)),
    next = { ...c, economy: { ...c.economy, taxRate: tax } },
    after = populationForecast(next, simulateResources(next,1,undefined,leaderModifiers(s,c.id).consumer));
  useEffect(() => setTax(c.economy.taxRate), [c.id, c.economy.taxRate]);
  return (
    <section className={policyOnly?"population-panel tax-policy-panel":"population-panel"}>
      <h3>
        <LocaleText value={policyOnly?"Tax policy":"People, Taxes & Living Standards"} />
      </h3>
      {!policyOnly&&<><div className="population-metrics">
        {[
          [
            "Total population",
            c.demographics.population.toLocaleString("en-US", {
              maximumFractionDigits: 0,
            }),
          ],
          [
            "Civilian population",
            civilianPopulation(c).toLocaleString("en-US", {
              maximumFractionDigits: 0,
            }),
          ],
          ["Workforce", c.demographics.workforce.toLocaleString("en-US")],
          ["Annual population trend", `${forecast.growthRate.toFixed(2)}%`],
          ["Births / 1,000 / year", forecast.birthsPerThousand.toFixed(1)],
          ["Deaths / 1,000 / year", forecast.deathsPerThousand.toFixed(1)],
          ["Migration / day", (c.demographics.netMigration ?? 0).toFixed(0)],
          ["Living standards", `${forecast.welfare.toFixed(0)}/100`],
        ].map(([label, value]) => (
          <span key={label}>
            <small>
              <LocaleText value={label} />
            </small>
            <strong>{value}</strong>
          </span>
        ))}
      </div>
      <p>
        <LocaleText value="Food, disposable income, inflation, unemployment and stability affect births and migration. Recruitment moves civilians into the military; it does not erase people from the total population." />
      </p>
      </>}
      {policyOnly&&<p><LocaleText value="Tax rate"/>: <strong>{c.economy.taxRate.toFixed(0)}%</strong></p>}
      {policyOnly&&!own&&<p><LocaleText value="Only your country’s policies can be changed."/></p>}
      {own && showPolicy && (
        <>
          <label>
            <LocaleText value="Tax rate" /> {tax.toFixed(0)}%
            <input
              aria-label="Proposed tax rate"
              type="range"
              min={arrears(s, c.id) > 0 ? 45 : 0}
              max="60"
              value={tax}
              onChange={(e) => setTax(Number(e.target.value))}
            />
          </label>
          <button className="tax-policy-apply primary"
            disabled={tax === c.economy.taxRate}
            onClick={() => setReview(true)}
          >
            <LocaleText value="Apply changes on tax policy" />
          </button>
        </>
      )}
      {review && (
        <ReviewDialog
          title="Review tax policy"
          summary="Higher taxes collect more revenue but reduce disposable income, living standards, approval and births. Lower taxes improve public sentiment while reducing the budget."
          metrics={[
            ["Tax rate", `${c.economy.taxRate}% → ${tax}%`],
            [
              "Daily tax revenue",
              `${money((c.economy.gdp * c.economy.taxRate) / 100 / 365)} → ${money((c.economy.gdp * tax) / 100 / 365)}`,
            ],
            [
              "Living standards",
              `${forecast.welfare.toFixed(0)} → ${after.welfare.toFixed(0)}`,
            ],
            [
              "Annual population trend",
              `${forecast.growthRate.toFixed(2)}% → ${after.growthRate.toFixed(2)}%`,
            ],
          ]}
          onCancel={() => setReview(false)}
          onConfirm={(commandId) => {
            s.setTaxRate(tax);
            setReview(false);
            s.showReceipt({
              title: "Tax policy updated",
              summary:
                "New taxes apply on the next daily simulation. Public sentiment and demographics adjust over time.",
            });
          }}
        />
      )}
    </section>
  );
}
export function RecruitmentPanel() {
  const s = useWorldView(),
    c = s.countries[s.playerCountryId],
    [count, setCount] = useState(10000),
    [review, setReview] = useState(false),
    quote = recruitmentPreview(s,count),
    cost = quote.cost;
  return (
    <section className="recruitment-panel">
      <h3>
        <LocaleText value="Recruit from civilian population" />
      </h3>
      <p>
        <LocaleText value="Recruitment costs include mobilization and training. New personnel reduce civilian workforce and temporarily reduce readiness; wages enter military upkeep." />
      </p>
      <input
        aria-label="Recruit personnel count"
        type="number"
        min="100"
        max="100000"
        step="100"
        value={count}
        onChange={(e) =>
          setCount(
            Math.max(
              100,
              Math.min(100000, Math.floor(Number(e.target.value) || 100)),
            ),
          )
        }
      />
      <button onClick={() => setReview(true)}>
        <LocaleText value="Review recruitment" />
      </button>
      {review && (
        <ReviewDialog
          title="Review recruitment"
          summary="Personnel transfer from civilians into active military service. Total national population remains unchanged."
          metrics={[
            ["Personnel", quote.count.toLocaleString(s.playerProfile.language)],
            ["Mobilization cost", money(cost)],
            ["Daily personnel upkeep", money(quote.count * 0.00000006)],
            [
              "Civilian population after",
              Math.max(0, civilianPopulation(c) - quote.count).toLocaleString(
                "en-US",
                { maximumFractionDigits: 0 },
              ),
            ],
            ["Treasury after", money(c.economy.treasury - cost)],
          ]}
          allowed={
            quote.allowed
          }
          onCancel={() => setReview(false)}
          onConfirm={(commandId) => {
            s.recruitPersonnel(count, commandId);
            setReview(false);
          }}
        />
      )}
    </section>
  );
}

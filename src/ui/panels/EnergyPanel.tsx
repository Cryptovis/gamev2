import { useState } from "react";
import { useGameStore } from "../../store/gameStore";
import {
  energyFor,
  energyDemand,
  plantYield,
  canBuildPlant,
  powerProjectRefund,
} from "../../engine/systems/energy";
import { PLANT_KINDS, POWER_PLANTS } from "../../data/powerPlants";
import type { PlantKind } from "../../domain/energy";
import type { CountryState } from "../../domain/game";
import { LocaleText } from "../../i18n/localeText";
import { PowerPlantArt } from "../icons/PowerPlantArt";
import { ReviewDialog } from "./ReviewDialog";
import { money } from "../formatMoney";
export function EnergyPanel({ country }: { country: CountryState }) {
  const s = useGameStore(),
    e = energyFor(s, country.id),
    [review, setReview] = useState<PlantKind | null>(null),
    [cancelId, setCancelId] = useState<string | null>(null),
    player = country.id === s.playerCountryId;
  const demand = energyDemand(s, country.id),
    d = review ? POWER_PLANTS[review] : null;
  return (
    <section className="energy-command" data-testid="energy-panel">
      <header>
        <h3>
          <LocaleText value="National Energy Grid" />
        </h3>
        <p>
          <LocaleText value="Fuel, funding and grid capacity determine whether homes and factories receive power." />
        </p>
      </header>
      <div className="energy-summary">
        {[
          ["Generation / day", e.lastGeneration.toFixed(2)],
          ["Demand / day", demand.total.toFixed(2)],
          ["Grid coverage", e.lastCoverage.toFixed(0) + "%"],
          ["Power reserve", country.processedResources.electricity.toFixed(2)],
          ["Outage days", String(e.outageDays)],
        ].map(([label, value]) => (
          <span key={label}>
            <small>
              <LocaleText value={label} />
            </small>
            <strong>
              <LocaleText value={value} />
            </strong>
          </span>
        ))}
      </div>
      {!s.world.energy?.[country.id] && (
        <p>
          <LocaleText value="Awaiting first daily energy report" />
        </p>
      )}
      {e.lastCoverage < 95 && (
        <p className="energy-warning" role="alert">
          <LocaleText value="Power shortage: production slows and public confidence falls. Replenish fuel, fund operations or commission new capacity." />
        </p>
      )}
      <div className="power-plant-grid">
        {PLANT_KINDS.map((kind) => {
          const p = POWER_PLANTS[kind];
          return (
            <article key={kind}>
              <PowerPlantArt kind={kind} />
              <h4>
                <LocaleText value={p.label} />
              </h4>
              <p>
                <LocaleText value={p.description} />
              </p>
              <dl>
                <div>
                  <dt>
                    <LocaleText value="Operational plants" />
                  </dt>
                  <dd>{e.plants[kind]}</dd>
                </div>
                <div>
                  <dt>
                    <LocaleText value="Output per plant" />
                  </dt>
                  <dd>
                    {plantYield(s, country.id, kind).toFixed(2)} /{" "}
                    <LocaleText value="day" />
                  </dd>
                </div>
                <div>
                  <dt>
                    <LocaleText value="Fuel / day" />
                  </dt>
                  <dd>
                    {p.fuel ? (
                      <>
                        <LocaleText value={p.fuel} />: {p.fuelUse}
                      </>
                    ) : (
                      <LocaleText value="No fuel required" />
                    )}
                  </dd>
                </div>
                <div>
                  <dt>
                    <LocaleText value="Operating cost / day" />
                  </dt>
                  <dd>{money(p.upkeep)}</dd>
                </div>
              </dl>
              {e.bottlenecks[kind] && (
                <p className="energy-warning">
                  <LocaleText value={e.bottlenecks[kind]} />
                </p>
              )}
              {player && (
                <div className="plant-actions">
                  <button onClick={() => setReview(kind)}>
                    <LocaleText value="Review construction" />
                  </button>
                  <button
                    disabled={!e.plants[kind]}
                    onClick={() => s.togglePlant(kind)}
                    aria-pressed={e.enabled[kind]}
                  >
                    <LocaleText
                      value={
                        e.enabled[kind]
                          ? "Pause generation"
                          : "Resume generation"
                      }
                    />
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <div className="energy-projects">
        {e.projects.map((p) => (
          <p key={p.id}>
            <LocaleText value={POWER_PLANTS[p.kind].label} /> ·{" "}
            <LocaleText value="Ready day" /> {p.readyDay} ·{" "}
            {Math.max(0, p.readyDay - s.day)}{" "}
            <LocaleText value="days remaining" />
            {player && (
              <button onClick={() => setCancelId(p.id)}>
                <LocaleText value="CANCEL / REFUND" />
              </button>
            )}
          </p>
        ))}
      </div>
      <small>
        <LocaleText value="Existing infrastructure is migrated once. Renewable output varies predictably; these are game balance units, not real-world electricity measurements." />
      </small>
      {cancelId && (
        <ReviewDialog
          title="Cancel construction?"
          summary="Refund is 80% of the remaining unbuilt investment. Completed construction cannot be cancelled."
          metrics={[
            ["Refund", money(powerProjectRefund(s, country.id, cancelId))],
          ]}
          allowed={powerProjectRefund(s, country.id, cancelId) > 0}
          onCancel={() => setCancelId(null)}
          onConfirm={() => {
            s.cancelPowerProject(cancelId);
            setCancelId(null);
          }}
          confirmLabel="CANCEL PROJECT"
        />
      )}
      {review && d && (
        <ReviewDialog
          title={d.label}
          summary={d.description}
          metrics={[
            ["Construction cost", money(d.cost)],
            ["Current treasury", money(country.economy.treasury)],
            [
              "Treasury after construction",
              money(country.economy.treasury - d.cost),
            ],
            ["Construction time", `${d.days} days`],
            ["Ready day", String(s.day + d.days)],
            ["Output per plant", plantYield(s, country.id, review).toFixed(2)],
            ["Operating cost / day", money(d.upkeep)],
            [
              "Fuel / day",
              d.fuel ? `${d.fuelUse} ${d.fuel}` : "No fuel required",
            ],
          ]}
          warnings={[
            ...(d.tech && !country.technology.unlocked.includes(d.tech)
              ? ["Required research is not unlocked."]
              : []),
            ...(review === "hydro" &&
            (s.industrialEconomy[country.id]?.potential.water ?? 1) < 0.5
              ? ["Insufficient national water potential."]
              : []),
            "Construction is limited to three simultaneous power projects. Output starts on completion.",
          ]}
          allowed={canBuildPlant(s, country.id, review)}
          onCancel={() => setReview(null)}
          onConfirm={() => {
            s.buildPlant(review);
            setReview(null);
          }}
        />
      )}
    </section>
  );
}

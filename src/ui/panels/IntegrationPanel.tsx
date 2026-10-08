import { useState } from "react";
import { useGameStore } from "../../store/gameStore";
import {
  integrationRequirements,
  integrationCost,
} from "../../engine/systems/integration";
import { expansion } from "../../engine/systems/sovereignCredit";
import { LocaleText } from "../../i18n/localeText";
import { ReviewDialog, type ReviewContent } from "./ReviewDialog";
import { money } from "../formatMoney";
export function IntegrationPanel({ countryId }: { countryId: string }) {
  const s = useGameStore(),
    [open, setOpen] = useState(false),
    [review, setReview] = useState<
      (ReviewContent & { execute: (commandId:string) => void; allowed?: boolean }) | null
    >(null),
    req = integrationRequirements(s, countryId),
    project = expansion(s).integrations[countryId],
    c = s.countries[countryId];
  const prepare = (kind: "language" | "ideology" | "services") =>
    setReview({
      title: "Fund integration preparation",
      summary:
        kind === "services"
          ? "Improve public services, ease local taxes and build public support. Food and inflation still affect wellbeing."
          : "Fund education and civic outreach. Weekly cooldown applies; preparation does not instantly complete integration.",
      metrics: [
        ["Cost", money(0.25)],
        ["Territory", c.name],
        ["Cooldown", "7 days"],
      ],
      allowed:
        s.countries[s.playerCountryId].economy.treasury >= 0.25 &&
        s.day - (expansion(s).preparation[countryId]?.lastActionDay ?? -14) >=
          7 &&
        project?.status !== "active",
      execute: (commandId) => s.prepareIntegration(countryId, kind, commandId),
    });
  return (
    <section className="integration-card">
      <button onClick={() => setOpen(true)}>
        <LocaleText value="Assimilate / Integrate territory" />
      </button>
      {project && (
        <p>
          <LocaleText value={project.status} />
          {project.status === "active"
            ? ` · ${Math.max(0, project.endsDay - s.day)} `
            : ""}
          <LocaleText
            value={
              project.status === "active"
                ? "days remaining"
                : (project.reason ?? "")
            }
          />
        </p>
      )}
      {open && (
        <div className="integration-overlay">
          <section
            role="dialog"
            aria-label="Territory integration"
            className="integration-dialog"
          >
            <header>
              <h2>
                <LocaleText value="Territory integration" /> · {c.name}
              </h2>
              <button
                aria-label="Close integration"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </header>
            <p>
              <LocaleText value="Meet every condition, pay the investment, then maintain wellbeing of at least 80% for 90 days. Failure loses the upfront investment. Completion merges population, forces, assets and liabilities." />
            </p>
            <div className="integration-requirements">
              {req.map((r) => (
                <div
                  key={r.label}
                  className={
                    r.value >= r.min ? "requirement-met" : "requirement-missing"
                  }
                >
                  <span>
                    <LocaleText value={r.label} />
                  </span>
                  <strong>
                    {r.value.toFixed(1)} / {r.min}%
                  </strong>
                </div>
              ))}
            </div>
            <div className="integration-preparation">
              <button onClick={() => prepare("language")}>
                <LocaleText value="Language education" />
              </button>
              <button onClick={() => prepare("ideology")}>
                <LocaleText value="Civic education" />
              </button>
              <button onClick={() => prepare("services")}>
                <LocaleText value="Public services & tax relief" />
              </button>
              <button
                onClick={() =>
                  setReview({
                    title: "Voluntary religious outreach",
                    summary:
                      "Fund a gradual, uncertain outreach mission. Results may be small or unsuccessful.",
                    metrics: [
                      ["Cost", money(2)],
                      ["Territory", c.name],
                    ],
                    allowed:
                      s.countries[s.playerCountryId].economy.treasury >= 2,
                    execute: (commandId) =>
                      s.startOutreach(
                        countryId,
                        s.countries[s.playerCountryId].society.dominantReligion,
                        commandId,
                      ),
                  })
                }
              >
                <LocaleText value="Voluntary religious outreach" />
              </button>
            </div>
            <p>
              <LocaleText value="Religious outreach has uncertain, gradual results. It does not guarantee conversion." />
            </p>
            <button
              disabled={
                req.some((r) => r.value < r.min) ||
                project?.status === "active" ||
                project?.status === "completed"
              }
              onClick={() =>
                setReview({
                  title: "Start 90-day integration",
                  summary:
                    "Completion absorbs the territory and its liabilities. Keep wellbeing above the failure threshold and maintain control.",
                  metrics: [
                    ["Cost", money(integrationCost(s, countryId))],
                    ["Duration", "90 days"],
                    ["Failure below wellbeing", "80%"],
                  ],
                  allowed:
                    s.countries[s.playerCountryId].economy.treasury >=
                    integrationCost(s, countryId),
                  execute: (commandId) => s.beginIntegration(countryId, commandId),
                })
              }
            >
              <LocaleText value="Review integration" />
            </button>
          </section>
        </div>
      )}
      {review && (
        <ReviewDialog
          {...review}
          onCancel={() => setReview(null)}
          onConfirm={(commandId) => {
            review.execute(commandId);
            setReview(null);
            setOpen(false);
          }}
        />
      )}
    </section>
  );
}

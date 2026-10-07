import { useState } from "react";
import { CommandWindow } from "./CommandWindow";
import { ReviewDialog, type ReviewContent } from "./ReviewDialog";
import { LocaleText } from "../../i18n/localeText";
import { useGameStore } from "../../store/gameStore";
import {
  CAMPUSES,
  academyFor,
  pilotCoverage,
} from "../../engine/systems/governance";
import type { CampusKind } from "../../domain/governance";
export function InvestmentWindow() {
  const s = useGameStore(),
    c = s.countries[s.playerCountryId],
    a = academyFor(s, c.id),
    [count, setCount] = useState(50),
    [review, setReview] = useState<
      (ReviewContent & { execute: () => void; allowed: boolean }) | null
    >(null);
  const bonuses = a.buildings.university * 0.05 + a.buildings.institute * 0.06,
    rate =
      1 +
      a.buildings.academy * 0.005 +
      (c.technology.unlocked.includes("mil-flight-school") ? 0.1 : 0);
  return (
    <CommandWindow
      wide
      title="Investments & Pilot Training"
      kicker="NATIONAL DEVELOPMENT"
      onClose={s.closeWorkspace}
    >
      <div className="investment-summary">
        <span>
          <LocaleText value="Research speed bonus" />{" "}
          <b>+{bonuses.toFixed(2)}%</b>
        </span>
        <span>
          <LocaleText value="Pilots" /> <b>{a.pilots}</b>
        </span>
        <span>
          <LocaleText value="Aircraft crew coverage" />{" "}
          <b>{(pilotCoverage(s, c.id) * 100).toFixed(0)}%</b>
        </span>
        <span>
          <LocaleText value="Monthly upkeep" />{" "}
          <b>${(a.lastUpkeep * 30).toFixed(5)}B</b>
        </span>
      </div>
      {!a.funded && (
        <p className="negative">
          <LocaleText value="Upkeep is underfunded; research bonuses are suspended." />
        </p>
      )}
      <div className="campus-grid">
        {(Object.keys(CAMPUSES) as CampusKind[]).map((kind) => {
          const d = CAMPUSES[kind],
            techReady =
              kind === "institute"
                ? c.technology.unlocked.includes("edu-laboratories")
                : kind === "academy"
                  ? c.technology.unlocked.includes("mil-command")
                  : true;
          return (
            <article key={kind}>
              <h3>
                <LocaleText value={d.title} /> ×{a.buildings[kind]}
              </h3>
              <p>
                <LocaleText
                  value={
                    kind === "academy"
                      ? "Pilot training speed"
                      : "Research speed"
                  }
                />{" "}
                +{(d.bonus * 100).toFixed(2)}%
              </p>
              <small>
                ${d.cost}B · {d.days} <LocaleText value="days" /> · $
                {(d.upkeep * 30).toFixed(3)}B/
                <LocaleText value="month" />
              </small>
              <button
                disabled={
                  !techReady ||
                  a.projects.length >= 4 ||
                  c.economy.treasury < d.cost
                }
                onClick={() =>
                  setReview({
                    title: d.title,
                    summary:
                      "Fund construction now. Benefits and upkeep begin on completion.",
                    metrics: [
                      ["Cost", `$${d.cost}B`],
                      ["Completion", `Day ${s.day + d.days}`],
                      ["Monthly upkeep", `$${(d.upkeep * 30).toFixed(3)}B`],
                      [
                        "Treasury after",
                        `$${(c.economy.treasury - d.cost).toFixed(3)}B`,
                      ],
                    ],
                    allowed: true,
                    execute: () => s.buildCampus(kind),
                  })
                }
              >
                <LocaleText
                  value={techReady ? "Review investment" : "RESEARCH REQUIRED"}
                />
              </button>
            </article>
          );
        })}
      </div>
      <div className="construction-list">
        {a.projects.map((p) => (
          <p key={p.id}>
            <LocaleText value={CAMPUSES[p.kind].title} /> · {p.readyDay - s.day}{" "}
            <LocaleText value="days remaining" />
          </p>
        ))}
      </div>
      <section className="pilot-recruitment">
        <h3>
          <LocaleText value="Recruit pilots from your armed forces" />
        </h3>
        <p>
          <LocaleText value="Each fighter and bomber needs one trained pilot. Recruitment is limited to 5% of military personnel. Training takes time; newly built aircraft without crews reduce effective air power." />
        </p>
        <label>
          <LocaleText value="Pilot intake" />
          <input
            type="number"
            min="1"
            max="1000"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
        <button
          disabled={!Number.isInteger(count) || count < 1 || count > 1000}
          onClick={() =>
            setReview({
              title: "Pilot recruitment",
              summary:
                "Pay training costs now. Pilot wages begin when training completes. Academies accelerate training.",
              metrics: [
                ["Cost", `$${(count * 0.0001).toFixed(4)}B`],
                ["Training duration", `${Math.ceil(30 / rate)} days`],
                ["Monthly wages", `$${(count * 0.0000002 * 30).toFixed(5)}B`],
                [
                  "Pilots after training",
                  String(
                    a.pilots +
                      a.training.reduce((n, t) => n + t.count, 0) +
                      count,
                  ),
                ],
              ],
              allowed:
                c.economy.treasury >= count * 0.0001 &&
                a.pilots +
                  a.training.reduce((n, t) => n + t.count, 0) +
                  count <=
                  Math.floor(c.military.personnel * 0.05),
              execute: () => s.hirePilots(count),
            })
          }
        >
          <LocaleText value="Review recruitment" />
        </button>
        {a.training.map((t) => (
          <p key={t.id}>
            {t.count} <LocaleText value="pilots in training" /> ·{" "}
            {Math.max(0, t.readyDay - s.day)}{" "}
            <LocaleText value="days remaining" />
          </p>
        ))}
      </section>
      {review && (
        <ReviewDialog
          {...review}
          onCancel={() => setReview(null)}
          onConfirm={() => {
            review.execute();
            setReview(null);
          }}
        />
      )}
    </CommandWindow>
  );
}

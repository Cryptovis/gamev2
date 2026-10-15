import { useState } from "react";
import { CommandWindow } from "./CommandWindow";
import { ReviewDialog, type ReviewContent } from "./ReviewDialog";
import { LocaleText } from "../../i18n/localeText";
import {useWorldView} from '../../store/useWorldView';
import {
  CAMPUSES,
  academyFor,
  pilotCoverage,
  campusPreview,pilotTrainingPreview,academySummary,
} from "../../engine/systems/governance";
import type { CampusKind } from "../../domain/governance";
import { CampusIcon } from "../icons/PlaytestIcons";
export function InvestmentWindow({embedded=false,section='investments'}:{embedded?:boolean;section?:'investments'|'pilots'}={}) {
  const s = useWorldView(),
    c = s.countries[s.playerCountryId],
    a = academyFor(s, c.id),
    [count, setCount] = useState(50),
    [review, setReview] = useState<
      (ReviewContent & { execute: (commandId:string) => void; allowed: boolean }) | null
    >(null);
  const summary=academySummary(s,c.id),training=pilotTrainingPreview(s,count);
  const content = <section className="development-section" data-development={section}>
      <div className="investment-summary">
        {section==='investments'&&<span>
          <LocaleText value="Research speed bonus" />{" "}
          <b>+{summary.researchBonusPercent.toFixed(2)}%</b>
        </span>}
        {section==='pilots'&&<span>
          <LocaleText value="Pilots" /> <b>{a.pilots}</b>
        </span>}
        {section==='pilots'&&<span>
          <LocaleText value="Aircraft crew coverage" />{" "}
          <b>{(pilotCoverage(s, c.id) * 100).toFixed(0)}%</b>
        </span>}
        <span>
          <LocaleText value="Monthly upkeep" />{" "}
          <b>${summary.monthlyUpkeep.toFixed(5)}B</b>
        </span>
      </div>
      {!a.funded && (
        <p className="negative">
          <LocaleText value="Upkeep is underfunded; research bonuses are suspended." />
        </p>
      )}
      <div className="campus-grid">
        {(Object.keys(CAMPUSES) as CampusKind[]).filter(kind=>section==='pilots'?kind==='academy':kind!=='academy').map((kind) => {
          const d=CAMPUSES[kind],view=campusPreview(s,kind),techReady=view.techReady;
          return (
            <article key={kind}>
              <CampusIcon kind={kind} />
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
                  !view.allowed
                }
                onClick={() =>
                  setReview({
                    title: d.title,
                    summary:
                      "Fund construction now. Benefits and upkeep begin on completion.",
                    metrics: [
                      ["Cost", `$${view.cost}B`],
                      ["Completion", `Day ${view.completionDay}`],
                      ["Monthly upkeep", `$${view.monthlyUpkeep.toFixed(3)}B`],
                      [
                        "Treasury after",
                        `$${view.treasuryAfter.toFixed(3)}B`,
                      ],
                    ],
                    allowed: true,
                    execute: (commandId) => s.buildCampus(kind, commandId),
                  })
                }
              >
                <LocaleText
                  value={techReady ? "Review investment" : "Research required"}
                />
              </button>
            </article>
          );
        })}
      </div>
      <div className="construction-list">
        {a.projects.filter(p=>section==='pilots'?p.kind==='academy':p.kind!=='academy').map((p) => (
          <p key={p.id}>
            <LocaleText value={CAMPUSES[p.kind].title} /> · {p.readyDay - s.day}{" "}
            <LocaleText value="days remaining" />
          </p>
        ))}
      </div>
      {section==='pilots'&&<section className="pilot-recruitment">
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
                ["Cost", `$${training.cost.toFixed(4)}B`],
                ["Training duration", `${training.days} days`],
                ["Monthly wages", `$${training.monthlyWages.toFixed(5)}B`],
                [
                  "Pilots after training",
                  String(
                    training.pilotsAfter,
                  ),
                ],
              ],
              allowed:training.allowed,
              execute: (commandId) => s.hirePilots(count, commandId),
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
      </section>}
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
    </section>;
  return embedded?content:<CommandWindow wide title={section==='pilots'?'Pilot training':'Investments'} kicker="NATIONAL DEVELOPMENT" onClose={s.closeWorkspace}>{content}</CommandWindow>;
}

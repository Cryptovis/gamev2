import { BRAND_NAME } from "../BrandMark";
import { LocaleText, translateLive } from "../../i18n/localeText";
import { useState } from "react";
import { useGameStore } from "../../store/gameStore";
import { useShallow } from "zustand/react/shallow";
import { useStoreView } from "../../store/useStoreView";
import { DraggableWindow } from "../windows/DraggableWindow";
import { ReviewDialog } from "./ReviewDialog";
import {
  PROGRAMS,
  programCost,
  programPreview,
  type ProgramKind,
} from "../../engine/systems/nationalPrograms";
import { formatCostB } from "../../engine/systems/policyPressure";
import { translateText } from "../../i18n/localeText";
const faq = [
 ["Where are my proposals?","Open Diplomacy, then Proposal tracker and Sent proposals. Pending replies arrive after three campaign days; advance time to receive them. Sending again will not accelerate the answer. No fee is charged at submission; accepted outgoing proposals charge the stated fee once."],
 ["How does the energy grid work?","Open Production and National Energy Grid. Fuel plants consume coal, oil or uranium and operating funds. Renewable plants need no fuel. Review construction time, research and budget before investing. Power shortages slow production and reduce public confidence."],

 ["How do sovereign loans work?","Open Market and Sovereign Credit & Monetary Fund. Review annual interest, term and total repayment. At maturity, unpaid cash is recovered from collateral; remaining arrears enforce higher taxes until settled."],
 ["How do I integrate a controlled territory?","Open Territories and Assimilate / Integrate territory. Meet the live conditions, fund preparation and review the 90-day investment. Keep wellbeing at least 80%; losing control or wellbeing fails the process."],
  [
    "Why is population falling?",
    "Food shortages, high taxes, inflation and weak income reduce wellbeing and birth rates. Emigrants move to stable countries when a safe destination is available. Recruitment transfers civilians into military service without deleting total population.",
  ],
  [
    "When do market listings earn money?",
    "Posting reserves the offered stock. You are paid only when another country buys it. An overpriced listing may remain unsold; cancel it to recover the remaining stock.",
  ],
  [
    "How do diplomatic letters work?",
    "Sent proposals receive a reply after three game days and can be rejected. Incoming proposals split setup costs equally between both governments. Agreements require consent before any payment.",
  ],
  [
    "Is reserve gold the same as industrial gold?",
    "Central-bank gold is a separate vault. Release tonnes to industry before selling or using them. Reported holdings show their date; other country profiles explicitly use game estimates.",
  ],
  [
    "How do I train pilots?",
    "Open Investments & Pilot Training. Recruit from your military personnel; training takes time, costs money and adds daily wages. Aircraft without enough funded pilots lose combat effectiveness.",
  ],
  [
    "How do I manage occupied territories?",
    "Open Territories & Political Affairs. Shortages raise unrest. Send relief, transfer control, or fund a transition election. At high unrest, production suffers and rebellion can restore independence.",
  ],
  [
    "How do I start?",
    "Pause time, check your budget and reserves, then build one affordable facility. Open Supply to find shortages and Diplomacy to negotiate access.",
  ],
  [
    "Why is a factory not producing?",
    "Construction must finish first. Production needs all listed inputs, power and operating funds. Supply shortages reduce output.",
  ],
  [
    "How do I cancel construction?",
    "Open Production and cancel an unfinished project. The review shows the remaining refundable cost; completed construction cannot be undone.",
  ],
  [
    "How do I import resources?",
    "Improve relations, sign a trade pact, then use Market or the partner’s economy panel. Review volume, duration and budget before confirming.",
  ],
  [
    "What does Low Relations mean?",
    "The partner does not trust you enough. Open diplomacy, exchange embassies, send aid or complete a diplomatic mission.",
  ],
  [
    "Why are my units not ready?",
    "Check fuel, logistics, power and equipment reserves. Supply and infrastructure matter as much as unit counts.",
  ],
  [
    "How do research prerequisites work?",
    "Technology branches require earlier unlocks and enough research points. Equipment factories also require their material inputs.",
  ],
  [
    "How do I join international institutions?",
    "Open your nation’s World tab. Complete the requirements, apply and wait for the membership ballot. Other countries vote.",
  ],
  [
    "What happens when war starts?",
    "Tactical battles are available from HD War Experience inside an active war. Queue orders, review fuel, then commit. Use recon to reveal enemies and advance a campaign day between rounds.",
  ],
  [
    "How do national programs work?",
    "Pay once to fund a timed program. Its stated benefits are applied once on completion. You cannot run two copies of the same program at once.",
  ],
  [
    "Where is my save?",
    "Use commander options to save a campaign or load your latest save. Autosave keeps local progress in this browser.",
  ],
  [
    "Can I replay the tutorial?",
    "Open Help and choose Replay tutorial. The ten steps pause time and include a real first construction: review the cost, confirm it and inspect the result.",
  ],
];
export function HelpPanel() {
  const state = useGameStore(
      useShallow((s) => ({
        closeWorkspace: s.closeWorkspace,
        restoreAdvice: s.restoreAdvice,
        showReceipt: s.showReceipt,
        navigate: s.navigate,
        setTutorial: s.setTutorial,
        startProgram: s.startProgram,
      })),
    ),
    language = useGameStore((s) => s.playerProfile.language),
    [query, setQuery] = useState(""),
    [review, setReview] = useState<ProgramKind | null>(null);
  // Only the displayed program figures are watched, not the whole campaign state.
  const programs = useStoreView((s) => {
    const treasury = s.countries[s.playerCountryId].economy.treasury;
    return (Object.keys(PROGRAMS) as ProgramKind[]).map((kind) => {
      const cost = programCost(s, kind),
        active = s.world.programs?.find((p) => p.kind === kind && p.status === "active");
      return { kind, cost, affordable: treasury >= cost, remaining: active ? Math.max(0, active.readyDay - s.day) : null };
    });
  });
  const reviewed = useStoreView((s) => {
    if (!review) return null;
    const preview = programPreview(s, review);
    return {
      cost: preview.cost,
      multiplier: preview.multiplier,
      treasury: s.countries[s.playerCountryId].economy.treasury,
      day: s.day,
      active: !!s.world.programs?.some((p) => p.kind === review && p.status === "active"),
    };
  });
  const matching = faq.filter((row) =>
    row.some((t) =>
      translateText(language, t)
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
    ),
  );
  return (
    <DraggableWindow
      id="help-window"
      title={translateLive("Help & National Development")}
      kicker="START HERE"
      initialX={110}
      initialY={125}
      width={640}
      onClose={state.closeWorkspace}
    >
      <section className="game-notes">
        <h3 translate="no">{BRAND_NAME}</h3>
        <p>
          <LocaleText value="203 sovereign profiles · economy · population · resource markets · diplomacy · research · military command." />
        </p>
        <button
          onClick={() => {
            state.restoreAdvice();
            state.showReceipt({
              title: "Warnings restored",
              summary:
                "Cabinet recommendations are enabled again. They will appear when their conditions are met.",
            });
          }}
        >
          <LocaleText value="Restore all cabinet warnings" />
        </button>
        <p>
          <LocaleText value="New screens use dollars, thousands (K), millions (M) and billions (B). Engine amounts remain in billions; strategic commodity units are game lots unless tonnes or vehicles are specified." />
        </p>
      </section>
      <section className="help-intro">
        <h3>
          <LocaleText value={"Your first days in office"} />
        </h3>
        <p>
          <LocaleText
            value={
              "Start with one decision at a time. Keep time paused while you explore; you decide when the next day begins."
            }
          />
        </p>
        <div className="help-shortcuts">
          <button onClick={() => state.navigate("economy")}>
            <LocaleText value={"Check budget"} />
          </button>
          <button onClick={() => state.navigate("production")}>
            <LocaleText value={"Build industry"} />
          </button>
          <button onClick={() => state.navigate("technology")}>
            <LocaleText value={"Explore research"} />
          </button>
          <button
            onClick={() => {
              state.closeWorkspace();
              state.setTutorial(0, true);
            }}
          >
            <LocaleText value={"Replay tutorial"} />
          </button>
        </div>
      </section>
      <section>
        <h3>
          <LocaleText value={"National development programs"} />
        </h3>
        <p>
          <LocaleText
            value={
              "Small, predictable investments with a clear completion date."
            }
          />
        </p>
        <div className="program-grid">
          {programs.map(({ kind, cost, affordable, remaining }) => {
            const d = PROGRAMS[kind];
            return (
              <article key={kind}>
                <h4>
                  <LocaleText value={d.title} />
                </h4>
                <p>
                  <LocaleText value={d.description} />
                </p>
                <small>
                  {formatCostB(cost)}
                  {" · "}
                  <LocaleText value={d.days} />
                  <LocaleText value={" days"} />
                </small>
                <button
                  disabled={remaining !== null || !affordable}
                  onClick={() => setReview(kind)}
                >
                  <LocaleText
                    value={
                      remaining !== null
                        ? `${remaining} days remaining`
                        : "Review program"
                    }
                  />
                </button>
              </article>
            );
          })}
        </div>
      </section>
      <section className="faq">
        <h3>
          <LocaleText value={"Frequently asked questions"} />
        </h3>
        <input
          aria-label={translateLive("Search help")}
          placeholder={translateLive("Search questions…")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {matching.map(([question, answer]) => (
          <details key={question}>
            <summary>
              <LocaleText value={question} />
            </summary>
            <p>
              <LocaleText value={answer} />
            </p>
          </details>
        ))}
        {!matching.length && (
          <p>
            <LocaleText value={"No matching questions."} />
          </p>
        )}
      </section>
      <section>
        <h3>
          <LocaleText value={"HD War Experience roadmap"} />
        </h3>
        <p>
          <LocaleText
            value={
              "The first tactical battlefield is playable: force groups, terrain, recon, command budgets and saved combat results. More animation and rendering quality will follow after playtesting."
            }
          />
        </p>
      </section>
      {review && reviewed && (() => {
        const preview = reviewed;
        return (
        <ReviewDialog
          title={translateLive(PROGRAMS[review].title)}
          summary={PROGRAMS[review].description}
          metrics={[
            ["Cost", formatCostB(preview.cost)],
            [
              "Treasury after",
              `$${(preview.treasury - preview.cost).toFixed(2)}B`,
            ],
            ["Completion", `Day ${preview.day + PROGRAMS[review].days}`],
            ["Effect after repeat fatigue", `${Math.round(preview.multiplier * 100)}%`],
          ]}
          allowed={
            preview.treasury >= preview.cost && !preview.active
          }
          onCancel={() => setReview(null)}
          onConfirm={(commandId) => {
            state.startProgram(review, commandId);
            setReview(null);
          }}
        />
        );
      })()}
    </DraggableWindow>
  );
}

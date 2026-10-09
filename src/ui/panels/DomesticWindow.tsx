import {useWorldView} from '../../store/useWorldView';
import { useState } from "react";
import { useGameStore } from "../../store/gameStore";
import { LocaleText } from "../../i18n/localeText";
import { ACTIVITIES, activityPreview, living } from "../../engine/systems/livingEconomy";
import type { ActivityKind } from "../../domain/living";
import { CommandWindow } from "./CommandWindow";
import { ReviewDialog } from "./ReviewDialog";
import { CivicArt } from "../icons/CivicArt";
import {money as formatMoney} from '../formatMoney';
import { PoliticsSection } from "./PoliticsSection";
export function DomesticWindow() {
  const s = useWorldView(),
    p = s.countries[s.playerCountryId],
    l = living(s),
    [review, setReview] = useState<ActivityKind | null>(null);
  const money=(value:number)=>formatMoney(value,s.playerProfile.language);
  return (
    <CommandWindow
      title="Public Events & Relief"
      kicker="NATIONAL WELLBEING"
      wide
      onClose={s.closeWorkspace}
    >
      <div className="market-facts">
        <span>
          <LocaleText value="Approval" />
          <strong>{p.politics.approval.toFixed(1)}%</strong>
        </span>
        <span>
          <LocaleText value="Cohesion" />
          <strong>{p.society.cohesion.toFixed(1)}%</strong>
        </span>
        <span>
          <LocaleText value="Treasury" />
          <strong>{money(p.economy.treasury)}</strong>
        </span>
      </div>
      <PoliticsSection />
      <p>
        <LocaleText value="Events improve morale over several days. They do not replace food supplies, economic reforms or security. Each has a thirty-day cooldown after it ends." />
      </p>
      <div className="activity-cards">
        {(
          Object.entries(ACTIVITIES) as Array<
            [ActivityKind, (typeof ACTIVITIES)[ActivityKind]]
          >
        ).map(([kind, d]) => {
          const active = l.activities.find(
              (x) => x.kind === kind && s.day < x.endsDay + 30,
            ),
            preview = activityPreview(s, kind);
          return (
            <article key={kind}>
              <CivicArt kind={kind} size={120} />
              <h3>
                <LocaleText value={d.title} />
              </h3>
              <strong>{money(preview.cost)}</strong>
              <p>
                {d.days} <LocaleText value="days" /> · +
                {preview.approvalGain.toFixed(1)}{" "}
                <LocaleText value="approval" />
              </p>
              {kind === "food_relief" && (
                <p>
                  <LocaleText value="Uses 20 food reserves" />
                </p>
              )}
              <button
                disabled={
                  !!active ||
                  p.economy.treasury < preview.cost ||
                  (kind === "food_relief" && p.resources.food < 20)
                }
                onClick={() => setReview(kind)}
              >
                <LocaleText
                  value={active ? "Active / cooldown" : "Review event"}
                />
              </button>
            </article>
          );
        })}
      </div>
      <div>
        {l.activities.map((x) => (
          <p key={x.id}>
            <LocaleText value={ACTIVITIES[x.kind].title} /> ·{" "}
            <LocaleText value={s.day <= x.endsDay ? "Active" : "Completed"} /> ·{" "}
            {Math.max(0, x.endsDay - s.day)}{" "}
            <LocaleText value="days remaining" />
          </p>
        ))}
      </div>
      {review && (() => {
        const preview = activityPreview(s, review);
        return (
        <ReviewDialog
          title={ACTIVITIES[review].title}
          summary="This public program is paid upfront and applies its effects once per day while active. A cooldown prevents repeated instant approval gains."
          metrics={[
            ["Cost", money(preview.cost)],
            [
              "Treasury after",
              money(p.economy.treasury - preview.cost),
            ],
            ["Duration", `${ACTIVITIES[review].days} days`],
            [
              "Total approval gain",
              `+${preview.approvalGain.toFixed(1)}`,
            ],
            ["Effect after repeat fatigue", `${Math.round(preview.multiplier * 100)}%`],
            ...(review === "food_relief" ? [["Food reserves used", "20"]] : []),
          ]}
          onCancel={() => setReview(null)}
          onConfirm={(commandId) => {
            s.startActivity(review, commandId);
            setReview(null);
          }}
        />
        );
      })()}
    </CommandWindow>
  );
}

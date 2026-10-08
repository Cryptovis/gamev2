import { useGameStore } from "../../store/gameStore";
import { LocaleText } from "../../i18n/localeText";
import { living } from "../../engine/systems/livingEconomy";
import { ReviewDialog } from "./ReviewDialog";
import type { AdviceKind } from "../../domain/living";
const advice: Record<
  AdviceKind,
  { title: string; summary: string; panel: string }
> = {
  approval: {
    title: "Public confidence is falling",
    summary:
      "Review living standards, taxes and shortages. A festival or sports event can temporarily improve public morale, but underlying problems still need reform.",
    panel: "society",
  },
  population: {
    title: "Population trend is negative",
    summary:
      "Inflation, shortages and weak living standards reduce births and encourage emigration. Inspect tax policy, food reserves and employment before choosing a reform.",
    panel: "economy",
  },
  fuel: {
    title: "Critical fuel on the front",
    summary:
      "Fuel supplies cover fewer than three operational days. Consider halting the assault, securing imports or withdrawing before supply and readiness collapse.",
    panel: "resources",
  },
  food: {
    title: "Food reserves are critical",
    summary:
      "Secure imports or improve food production. A relief program uses existing reserves and cannot replace missing food.",
    panel: "resources",
  },
  inflation: {
    title: "Cost of living is rising",
    summary:
      "Inspect shortages, tax policy and industrial output. Public events can support morale but do not directly cure inflation.",
    panel: "economy",
  },
};
export function EconomicAdvice() {
  const s = useGameStore(),
    l = living(s),
    kind = l.advice.active;
  if (l.notice)
    return <ReviewDialog {...l.notice} onCancel={s.dismissLivingNotice} />;
  if (!kind || s.world.tutorial.active) return null;
  const d = advice[kind];
  return (
    <div className="economic-advice-backdrop">
      <section className="economic-advice" role="dialog" aria-modal="true">
        <small>
          <LocaleText value="CABINET RECOMMENDATION" />
        </small>
        <h2>
          <LocaleText value={d.title} />
        </h2>
        <p>
          <LocaleText value={d.summary} />
        </p>
        <footer>
          <button onClick={() => s.dismissAdvice(kind)}>
            <LocaleText value="Skip for now" />
          </button>
          <button onClick={() => s.dismissAdvice(kind, true)}>
            <LocaleText value="Do not show this warning again" />
          </button>
          <button
            className="primary"
            onClick={() => {
              s.dismissAdvice(kind);
              s.navigate(d.panel);
            }}
          >
            <LocaleText value="Inspect options" />
          </button>
        </footer>
        <small>
          <LocaleText value="No spending occurs here. Review and confirm any action on the next screen. Restore warnings from Help." />
        </small>
      </section>
    </div>
  );
}

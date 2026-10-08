import { createPortal } from "react-dom";
import { useGameStore } from "../../store/gameStore";
import { pendingVictory } from "../../engine/systems/victory";
import { VICTORY_QUOTES } from "../../data/victoryQuotes";
import { LocaleText } from "../../i18n/localeText";
export function VictoryScroll() {
  const s = useGameStore(),
    v = pendingVictory(s);
  if (!v) return null;
  const q = VICTORY_QUOTES[v.quote] ?? VICTORY_QUOTES[0],
    w = s.wars[v.warId],
    tr = s.playerProfile.language === "tr";
  return createPortal(
    <div className="victory-backdrop">
      <section
        className="victory-scroll"
        role="dialog"
        aria-modal="true"
        aria-label={tr ? "Zafer" : "Victory"}
      >
        <small>THE REAL PRESIDENT</small>
        <h1>
          <LocaleText value="VICTORY" />
        </h1>
        <p>
          {s.countries[w.attackerId]?.name} · {s.countries[w.defenderId]?.name}
        </p>
        <blockquote>{q.text}</blockquote>
        {tr && q.author !== "Mustafa Kemal Atatürk" && (
          <p className="quote-translation">
            {q.translation} · <LocaleText value="Translation" />
          </p>
        )}
        <strong>— {q.author}</strong>
        <a href={q.source} target="_blank" rel="noreferrer">
          <LocaleText value="Quote source" />
        </a>
        <p>
          <LocaleText value="The battlefield is won. The next challenge is governing the peace." />
        </p>
        <button onClick={() => s.dismissVictory(v.warId)}>
          <LocaleText value="Continue governing" />
        </button>
        <button
          onClick={() => {
            s.dismissVictory(v.warId);
            s.openTool("governance");
          }}
        >
          <LocaleText value="Manage territories" />
        </button>
      </section>
    </div>,
    document.body,
  );
}

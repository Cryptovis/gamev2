import {ManagedDialog} from "../windows/ManagedDialog";
import {WINDOW_LAYERS} from "../windows/useWindowLifecycle";
import { createPortal } from "react-dom";
import { useGameStore } from "../../store/gameStore";
import {useWorldView} from '../../store/useWorldView';
import { pendingVictory } from "../../engine/systems/victory";
import { VICTORY_QUOTES } from "../../data/victoryQuotes";
import { LocaleText } from "../../i18n/localeText";
// Always mounted: only the pending war id is watched until a victory notice is due.
export function VictoryScroll() {
  return useGameStore((s) => pendingVictory(s)?.warId ?? null) ? <VictoryNotice /> : null;
}
function VictoryNotice() {
  const s = useWorldView(),
    v = pendingVictory(s);
  if (!v) return null;
  const q = VICTORY_QUOTES[v.quote] ?? VICTORY_QUOTES[0],
    w = s.wars[v.warId],
    tr = s.playerProfile.language === "tr";
  return createPortal(
    <div className="victory-backdrop">
      <ManagedDialog key={v.warId} className="victory-scroll" label="VICTORY" layer={WINDOW_LAYERS.modal} onClose={() => s.dismissVictory(v.warId)}>
        <small>THE REAL PRESIDENT</small>
        <h1>
          <LocaleText value="VICTORY" />
        </h1>
        <p>
          {s.countries[w.attackerId]?.name} · {s.countries[w.defenderId]?.name}
        </p>
        <blockquote>{q.text}</blockquote>
        {/* Turkish originals carry an English translation; English originals carry a Turkish one. */}
        {tr !== (q.author === "Mustafa Kemal Atatürk") && (
          <p className="quote-translation">
            {tr ? q.translation : <LocaleText value={q.translation} />} · <LocaleText value="Translation" />
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
      </ManagedDialog>
    </div>,
    document.body,
  );
}

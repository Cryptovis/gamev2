import { LocaleText, translateLive } from "../../i18n/localeText";
import { useEffect, useState } from "react";
import { useGameStore } from "../../store/gameStore";
const steps = [
  [
    "Welcome to national command",
    "Learn by clicking the highlighted controls. Time stays paused. You will open each window and close it yourself.",
    "",
    "",
  ],
  [
    "Budget & reserves",
    "Open your nation, choose Economy and check treasury, daily budget and resource reserves.",
    "nation",
    "economy",
  ],
  [
    "Explore the world",
    "Open Map. Explore geographic and relationship views, then close the window using its highlighted X.",
    "rail-map",
    "",
  ],
  [
    "Build national industry",
    "Open your nation and choose Production. Reviews compare costs and output before you commit.",
    "nation",
    "production",
  ],
  [
    "Research new capabilities",
    "Open your nation and choose Technology. Read prerequisites before spending research points.",
    "nation",
    "technology",
  ],
  [
    "Trade & secure supply",
    "Open Market. Prices, materials and equipment are here; trade contracts require diplomatic access.",
    "rail-market",
    "",
  ],
  [
    "Respond to shortages",
    "Open Supply. Reserve days show urgency; Low Relations explains how to unlock a supplier.",
    "rail-supply",
    "",
  ],
  [
    "Build trust",
    "Open the diplomatic inbox. Read proposals and leader messages; embassies and trade help build trust.",
    "rail-diplo",
    "",
  ],
  [
    "Equip your military",
    "Open your nation and choose Military. Compare forces, readiness, logistics and equipment.",
    "nation",
    "military",
  ],
  [
    "Participate in world affairs",
    "Open your nation and choose World. Explore membership requirements, votes and outreach. Help contains answers and a tutorial replay.",
    "nation",
    "world",
  ],
];
type Phase = "open" | "tab" | "inspect" | "done";
export function CampaignTutorial() {
  const state = useGameStore(),
    t = state.world.tutorial,
    [phase, setPhase] = useState<Phase>("open"),
    [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[Math.min(9, t.step)];
  const target =
    phase === "open"
      ? step[2]
      : phase === "tab"
        ? "tab-" + step[3]
        : phase === "inspect"
          ? "close-workspace"
          : "";
  useEffect(() => {
    if (t.active && state.playerProfile.setupComplete) {
      state.setSpeed(0);
      state.closeWorkspace();
      setPhase(t.step === 0 ? "done" : "open");
    }
  }, [t.active, t.step, state.playerProfile.setupComplete]);
  useEffect(() => {
    if (!t.active || !target) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-guide="${target}"]`,
      );
      if (el) {
        const b = el.getBoundingClientRect();
        if (b.top < 0 || b.bottom > window.innerHeight)
          el.scrollIntoView({ block: "nearest" });
        setRect(el.getBoundingClientRect());
      } else setRect(null);
    };
    measure();
    const timer = window.setInterval(measure, 180);
    const click = (event: MouseEvent) => {
      if ((event.target as Element).closest?.(`[data-guide="${target}"]`))
        setPhase(
          phase === "open"
            ? step[3]
              ? "tab"
              : "inspect"
            : phase === "tab"
              ? "inspect"
              : "done",
        );
    };
    document.addEventListener("click", click);
    return () => {
      clearInterval(timer);
      document.removeEventListener("click", click);
    };
  }, [t.active, target, phase, t.step]);
  if (!t.active || !state.playerProfile.setupComplete) return null;
  const hole = rect
    ? {
        x: Math.max(0, rect.left - 6),
        y: Math.max(0, rect.top - 6),
        w: rect.width + 12,
        h: rect.height + 12,
      }
    : null;
  return (
    <div className="guided-tutorial">
      {hole ? (
        <>
          <div
            className="tutorial-shade"
            style={{ inset: `0 0 auto 0`, height: hole.y }}
          />
          <div
            className="tutorial-shade"
            style={{ top: hole.y + hole.h, bottom: 0, left: 0, right: 0 }}
          />
          <div
            className="tutorial-shade"
            style={{ top: hole.y, height: hole.h, left: 0, width: hole.x }}
          />
          <div
            className="tutorial-shade"
            style={{
              top: hole.y,
              height: hole.h,
              left: hole.x + hole.w,
              right: 0,
            }}
          />
          <div
            className="tutorial-highlight"
            style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }}
          />
        </>
      ) : (
        <div className="tutorial-shade" style={{ inset: 0 }} />
      )}
      <section
        className="tutorial-dialog guided-card"
        role="dialog"
        aria-label={translateLive("Campaign tutorial")}
      >
        <small>
          <LocaleText value={"COMMAND TUTORIAL · "} />
          <LocaleText value={t.step + 1} />
          <LocaleText value={"/10"} />
        </small>
        <progress max={10} value={t.step + 1} />
        <h2>
          <LocaleText value={step[0]} />
        </h2>
        <p>
          <LocaleText value={step[1]} />
        </p>
        <strong className="tutorial-instruction">
          <LocaleText
            value={
              phase === "open"
                ? "Click the highlighted menu"
                : phase === "tab"
                  ? "Click the highlighted tab"
                  : phase === "inspect"
                    ? "Read the window, then click the highlighted X"
                    : "Step completed. Continue when ready."
            }
          />
        </strong>
        <footer>
          <button
            onClick={() => {
              state.closeWorkspace();
              state.setTutorial(t.step, false);
            }}
          >
            <LocaleText value={"SKIP"} />
          </button>
          <button
            disabled={t.step === 0}
            onClick={() => state.setTutorial(t.step - 1, true)}
          >
            <LocaleText value={"BACK"} />
          </button>
          <button
            className="primary"
            disabled={phase !== "done"}
            onClick={() => state.setTutorial(t.step + 1, t.step < 9)}
          >
            <LocaleText value={t.step === 9 ? "FINISH" : "NEXT"} />
          </button>
        </footer>
      </section>
    </div>
  );
}

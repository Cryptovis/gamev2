import { LocaleText, translateLive } from "../../i18n/localeText";
import { useEffect, useState,useRef } from "react";
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
    "Open Production and make your first real investment. Review its cost, output and upkeep, confirm construction and inspect the completion date.",
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
type Phase = "open" | "tab" | "inspect" | "done" | "build" | "review" | "result" | "detail" | "reading";
export function CampaignTutorial() {
  const state = useGameStore(),
    t = state.world.tutorial,
    [phase, setPhase] = useState<Phase>("open"),
    [rect, setRect] = useState<DOMRect | null>(null);
  const initialProjects=useRef(0);
  const step = steps[Math.min(9, t.step)];
  const practice=t.step===3;
  const target = phase==='detail'?'tutorial-detail':phase==='reading'?'review-dismiss':phase==='build'?'learn-build':phase==='review'?'review-confirm':phase==='result'?'review-dismiss':
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
      initialProjects.current=state.industrialEconomy[state.playerCountryId].projects.length;
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
      if(phase==='review'&&(event.target as Element).closest?.('[data-guide="review-dismiss"]')){setPhase('build');return;}
      if ((event.target as Element).closest?.(`[data-guide="${target}"]`))
        setPhase(
          phase === "open"
            ? step[3]
              ? "tab"
              : "detail"
            : phase === "tab"
              ? (practice?"build":"detail")
              :phase==='detail'?'reading':phase==='reading'?'inspect':phase==='build'?'review':phase==='review'?'result':phase==='result'?(useGameStore.getState().industrialEconomy[state.playerCountryId].projects.length>initialProjects.current?'inspect':'build'):"done",
        );
    };
    document.addEventListener("click", click);
    return () => {
      clearInterval(timer);
      document.removeEventListener("click", click);
    };
  }, [t.active, target, phase, t.step]);
  if (!t.active || !state.playerProfile.setupComplete) return null;
  const content=phase==='inspect'?document.querySelector('.command-panel,.command-window,.floating-command-window,.map-command-dock')?.getBoundingClientRect():null;
  const spotlight=(phase==='review'||phase==='result'||phase==='reading')?document.querySelector('.review-dialog')?.getBoundingClientRect()??rect:content??rect;
  const hole = spotlight
    ? {
        x: Math.max(0, spotlight!.left - 6),
        y: Math.max(0, spotlight!.top - 6),
        w: spotlight!.width + 12,
        h: spotlight!.height + 12,
      }
    : null;
  return (
    <div className="guided-tutorial">{phase==='inspect'&&rect&&<div className="tutorial-target-ring" style={{left:rect.left-5,top:rect.top-5,width:rect.width+10,height:rect.height+10}}/>}
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
        className="tutorial-dialog guided-card" style={rect&&rect.top>window.innerHeight*.55?{top:112,bottom:'auto'}:undefined}
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
              phase==='detail'?'Open the highlighted briefing to inspect this system.':phase==='reading'?'Read the live figures and explanation, then close the briefing.':phase==='build'?'Choose your first facility. This is a real investment.':phase==='review'?'Compare cost, output and upkeep, then confirm construction.':phase==='result'?'Read the result and close the confirmation.':phase === "open"
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
      initialProjects.current=state.industrialEconomy[state.playerCountryId].projects.length;
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

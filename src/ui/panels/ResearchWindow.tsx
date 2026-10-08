import {useWorldView} from '../../store/useWorldView';
import { useState } from "react";
import { CommandWindow } from "./CommandWindow";
import { ReviewDialog } from "./ReviewDialog";
import { LocaleText } from "../../i18n/localeText";
import { TECHNOLOGY_TREE, technologyById } from "../../data/technologyTree";
import { canUnlockTechnology,researchCapacity,researchDuration } from "../../engine/systems/technology";
import { useGameStore } from "../../store/gameStore";
import type { TechnologyCategory } from "../../domain/game";
export function ResearchWindow() {
  const s = useWorldView(),
    c = s.countries[s.playerCountryId],
    [branch, setBranch] = useState<TechnologyCategory>("industry"),
    [review, setReview] = useState<string | null>(null);
  const categories: Array<[TechnologyCategory, string]> = [
    ["industry", "Industry"],
    ["military", "Military"],
    ["energy", "Energy"],
    ["economy", "Economy"],
    ["education", "Education"],
    ["diplomacy", "Diplomacy"],
    ["intelligence", "Intelligence"],
    ["society", "Society"],
  ];
  const nodes = TECHNOLOGY_TREE.filter((n) => n.category === branch).sort(
      (a, b) => a.tier - b.tier,
    ),
    rows = new Map<number, number>();
  const placed = nodes.map((n) => {
      const row = rows.get(n.tier) ?? 0;
      rows.set(n.tier, row + 1);
      return { ...n, x: (n.tier - 1) * 300, y: row * 230 };
    }),
    height = Math.max(...Array.from(rows.values())) * 230;
  const width = Math.max(...nodes.map((n) => n.tier)) * 300 - 20;
  const selected = review ? technologyById[review] : null;
  const project=c.technology.project;
  const [cancel,setCancel]=useState(false);
  return (
    <CommandWindow
      wide
      kicker="NATIONAL RESEARCH"
      title="Research & Technology Tree"
      subtitle={`${c.technology.researchPoints.toFixed(2)} RP`}
      onClose={s.closeWorkspace}
    >
      <section className="research-progress"><strong><LocaleText value="Research capacity / day"/>: {researchCapacity(s,c.id).toFixed(2)}</strong><p><LocaleText value="One national team runs one project at a time. Universities and institutes increase research capacity. Points are paid once; capabilities unlock on completion."/></p>{project&&<><h3><LocaleText value={technologyById[project.technologyId].name}/></h3><progress aria-label="Research progress" max={project.requiredWork} value={project.workDone}/><p>{Math.ceil((project.requiredWork-project.workDone)/researchCapacity(s,c.id))} <LocaleText value="days remaining"/></p><button onClick={()=>setCancel(true)}><LocaleText value="Cancel research / refund"/></button></>}</section>
      <div className="tree-branches">
        {categories.map(([id, label]) => (
          <button
            key={id}
            className={branch === id ? "active" : ""}
            onClick={() => setBranch(id)}
          >
            <LocaleText value={label} />
          </button>
        ))}
      </div>
      <p>
        <LocaleText value="Unlock prerequisites first. Connected nodes show how one discovery enables the next." />
      </p>
      <div className="tree-scroll">
        <div className="research-tree" style={{ height, width }}>
          <svg width={width} height={height} aria-hidden="true">
            {placed.flatMap((n) =>
              n.prerequisites.map((id) => {
                const parent = placed.find((p) => p.id === id);
                return parent ? (
                  <path
                    key={id + "-" + n.id}
                    d={`M${parent.x + 270},${parent.y + 100} C${parent.x + 290},${parent.y + 100} ${n.x - 20},${n.y + 100} ${n.x},${n.y + 100}`}
                    stroke={
                      c.technology.unlocked.includes(id) ? "#dfc679" : "#7591a4"
                    }
                    strokeWidth="3"
                    fill="none"
                  />
                ) : null;
              }),
            )}
          </svg>
          {placed.map((n) => {
            const complete = c.technology.unlocked.includes(n.id),
              ready = canUnlockTechnology(c, n.id);
            return (
              <article
                key={n.id}
                className={
                  "tree-node " +
                  (complete ? "complete" : ready ? "available" : "locked")
                }
                style={{ left: n.x, top: n.y }}
              >
                <small>
                  <LocaleText
                    value={
                      complete ? "COMPLETE" : project?.technologyId===n.id ? "RESEARCH IN PROGRESS" : ready ? "AVAILABLE" : "LOCKED"
                    }
                  />{" "}
                  · {n.cost} RP
                </small>
                <h3>
                  <LocaleText value={n.name} />
                </h3>
                <p>
                  <LocaleText value={n.description} />
                </p>
                <div>
                  {n.prerequisites.map((id) => (
                    <button
                      className="prerequisite-link"
                      key={id}
                      onClick={() => setBranch(technologyById[id].category)}
                    >
                      <LocaleText value={technologyById[id].name} />{" "}
                      {c.technology.unlocked.includes(id) ? "✓" : "↗"}
                    </button>
                  ))}
                </div>
                <button disabled={!ready} onClick={() => setReview(n.id)}>
                  <LocaleText
                    value={complete ? "RESEARCH COMPLETE" : project?.technologyId===n.id ? "RESEARCH IN PROGRESS" : "Review research"}
                  />
                </button>
              </article>
            );
          })}
        </div>
      </div>
      {selected && (
        <ReviewDialog
          title={selected.name}
          summary={selected.description}
          metrics={[
            ["Research cost", `${selected.cost} RP`],
            ["Estimated duration",`${researchDuration(s,c.id,selected.id)} days`],
            ["Research capacity / day",researchCapacity(s,c.id).toFixed(2)],
            [
              "Points after",
              `${(c.technology.researchPoints - selected.cost).toFixed(2)} RP`,
            ],
          ]}
          warnings={["Research points are paid upfront. Cancellation refunds 80% of unfinished work; completed research cannot be cancelled."]}
          allowed={canUnlockTechnology(c, selected.id)}
          onCancel={() => setReview(null)}
          onConfirm={(commandId) => {
            s.unlockTechnology(selected.id, commandId);
            setReview(null);
          }}
        />
      )}
      {cancel&&project&&<ReviewDialog title="Cancel research?" summary="Research points are paid upfront. Cancellation refunds 80% of unfinished work; completed research cannot be cancelled." metrics={[["Refund",`${(project.cost*.8*(1-project.workDone/project.requiredWork)).toFixed(2)} RP`]]} onCancel={()=>setCancel(false)} onConfirm={(commandId)=>{s.cancelResearch(commandId);setCancel(false)}}/>}
    </CommandWindow>
  );
}

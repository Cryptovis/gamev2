import { LocaleText, translateLive } from "../../i18n/localeText";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGameStore } from "../../store/gameStore";
import { flagEmoji } from "../../data/countryThemes";
import { getWarPreview } from "../../engine/systems/warfare";
import { AssetThumbnail } from "../icons/AssetThumbnail";
import { ReviewDialog } from "./ReviewDialog";
export function WarTheatreModal() {
  const s = useGameStore(),
    [wip, setWip] = useState(false),
    dialog = useRef<HTMLElement>(null),
    seen = useRef(new Set(Object.keys(s.wars)));
  useEffect(() => {
    const fresh = Object.values(s.wars).find(
      (w) =>
        !seen.current.has(w.id) &&
        w.status === "active" &&
        (w.attackerId === s.playerCountryId ||
          w.defenderId === s.playerCountryId),
    );
    seen.current = new Set(Object.keys(s.wars));
    if (fresh) s.openWarWindow(fresh.id);
  }, [s.wars]);
  const w = s.warWindowId ? s.wars[s.warWindowId] : null;
  useEffect(() => {
    if (!w) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (wip) return;
      if (e.key === "Escape") s.openWarWindow(null);
      if (e.key === "Tab") {
        const buttons = Array.from(
            dialog.current?.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ) ?? [],
          ),
          first = buttons[0],
          last = buttons.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [w?.id, wip]);
  if (!w) return null;
  const a = s.countries[w.attackerId],
    d = s.countries[w.defenderId],
    p = getWarPreview(a, d, s.infrastructure[a.id], s.infrastructure[d.id]);
  const mine =
    w.attackerId === s.playerCountryId || w.defenderId === s.playerCountryId;
  return createPortal(
    <div className="war-theatre-backdrop">
      <section
        ref={dialog}
        className="war-theatre"
        role="dialog"
        aria-modal="true"
        aria-label={translateLive("War command")}
      >
        <header>
          <span>
            <small>
              <LocaleText value={"WAR COMMAND"} />
            </small>
            <h2>
              <LocaleText value={a.name} />
              <LocaleText value={" vs "} />
              <LocaleText value={d.name} />
            </h2>
          </span>
          <button
            autoFocus
            aria-label={translateLive("Close war command")}
            onClick={() => s.openWarWindow(null)}
          >
            <LocaleText value={"×"} />
          </button>
        </header>
        <div className="war-sides">
          {[a, d].map((c, i) => (
            <article key={c.id}>
              <div className="war-nation">
                <b>
                  <LocaleText value={flagEmoji(c.iso2)} />
                </b>
                <h3>
                  <LocaleText value={c.name} />
                </h3>
                <small>
                  <LocaleText value={i === 0 ? "ATTACKER" : "DEFENDER"} />
                </small>
              </div>
              <div className="war-units">
                {[
                  ["infantry_equipment", c.military.personnel],
                  ["tanks", c.military.tanks],
                  ["fighters", c.military.fighters],
                  ["naval", c.military.warships],
                ].map(([asset, count]) => (
                  <span key={asset}>
                    <AssetThumbnail asset={String(asset)} size={46} />
                    <strong>
                      <LocaleText value={Number(count).toLocaleString()} />
                    </strong>
                    <small>
                      <LocaleText value={asset} />
                    </small>
                  </span>
                ))}
              </div>
              <dl>
                <dt>
                  <LocaleText value={"Readiness"} />
                </dt>
                <dd>
                  <LocaleText value={c.military.readiness.toFixed(0)} />
                  <LocaleText value={"%"} />
                </dd>
                <dt>
                  <LocaleText value={"Morale"} />
                </dt>
                <dd>
                  <LocaleText value={c.military.morale.toFixed(0)} />
                  <LocaleText value={"%"} />
                </dd>
                <dt>
                  <LocaleText value={"Supply"} />
                </dt>
                <dd>
                  <LocaleText
                    value={(i === 0
                      ? p.attackerSupply
                      : p.defenderSupply
                    ).toFixed(0)}
                  />
                  <LocaleText value={"%"} />
                </dd>
                <dt>
                  <LocaleText value={"Personnel lost"} />
                </dt>
                <dd>
                  <LocaleText
                    value={(i === 0
                      ? w.attackerLosses
                      : w.defenderLosses
                    ).personnel.toLocaleString()}
                  />
                </dd>
              </dl>
            </article>
          ))}
        </div>
        <div className="war-front">
          <span>
            <LocaleText value={w.terrain} />
            <LocaleText value={" · "} />
            <LocaleText value={w.status} />
            <LocaleText value={" · Round "} />
            <LocaleText value={w.rounds} />
          </span>
          <progress max={200} value={w.progress + 100} />
          <strong>
            <LocaleText value={"Effective power ratio: "} />
            <LocaleText value={p.powerRatio.toFixed(2)} />
            <LocaleText value={"×"} />
          </strong>
          <p>
            <LocaleText
              value={w.lastReport || "No combat round has been resolved yet."}
            />
          </p>
        </div>
        <footer>
          <button
            disabled={
              !mine || w.status !== "active" || w.lastCombatDay === s.day
            }
            onClick={() => s.assault(w.id)}
          >
            <LocaleText value={"Combat round"} />
          </button>
          <button
            disabled={!mine || w.status !== "active"}
            onClick={() => s.setAutoAssault(w.id, !w.autoAssault)}
          >
            <LocaleText
              value={
                w.autoAssault ? "Disable auto assault" : "Enable auto assault"
              }
            />
          </button>
          <button
            disabled={
              s.campaignStatus !== "active" ||
              !!s.activeEvent ||
              !!s.activeAdvisor
            }
            onClick={() => s.advanceDay()}
          >
            <LocaleText value="Advance one day" />
          </button>
          <button className="hd-war-button" onClick={() => setWip(true)}>
            <LocaleText value={"HD War Experience"} />
          </button>
        </footer>
        {(s.activeEvent || s.activeAdvisor) && (
          <button onClick={() => s.openWarWindow(null)}>
            <LocaleText value="Resolve pending decision" />
          </button>
        )}
        <p className="muted">
          <LocaleText
            value={
              "Combat is resolved once per day. Use the campaign clock to advance time."
            }
          />
        </p>
      </section>
      {wip && (
        <ReviewDialog
          title={translateLive("HD War Experience")}
          summary="Work in progress. The cinematic battlefield is planned; current combat already uses terrain, supply, air superiority, equipment and losses. See Help for the roadmap."
          onCancel={() => setWip(false)}
        />
      )}
    </div>,
    document.body,
  );
}

import {calculateSupplyNetwork} from '../../engine/systems/supplyNetwork';
import {pilotCoverage,academyFor} from '../../engine/systems/governance';
import { LocaleText, translateLive } from "../../i18n/localeText";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGameStore } from "../../store/gameStore";
import { flagEmoji } from "../../data/countryThemes";
import { getWarPreview } from "../../engine/systems/warfare";
import { AssetThumbnail } from "../icons/AssetThumbnail";
import {tacticalStartStatus} from '../../engine/systems/tactical';
const TacticalBattlefield=lazy(()=>import('./TacticalBattlefield').then(m=>({default:m.TacticalBattlefield})));
export function WarTheatreModal() {
  const s = useGameStore(),
    [tacticalView, setTacticalView] = useState(false),
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
      if (document.querySelector('.review-dialog')) return;
      if (e.key === "Escape") s.openWarWindow(null);
      if (e.key === "Tab") {
        const buttons = Array.from(
            (dialog.current?.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ) ?? []),
          ),
          first = buttons.filter(b=>b.offsetParent!==null)[0],
          last = buttons.filter(b=>b.offsetParent!==null).at(-1);
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
  }, [w?.id]);
  useEffect(()=>setTacticalView(!!w?.tactical),[w?.id]);
  if (!w) return null;
  const a = s.countries[w.attackerId],
    d = s.countries[w.defenderId],
    p = getWarPreview({...a,military:{...a.military,fighters:a.military.fighters*pilotCoverage(s,a.id),bombers:a.military.bombers*pilotCoverage(s,a.id)}}, {...d,military:{...d.military,fighters:d.military.fighters*pilotCoverage(s,d.id),bombers:d.military.bombers*pilotCoverage(s,d.id)}}, s.infrastructure[a.id], s.infrastructure[d.id]);
  const fuel=calculateSupplyNetwork(s.countries[s.playerCountryId]).fuelDays;
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
        {mine&&fuel<14&&<div className="war-fuel-warning" role="alert"><strong><LocaleText value={fuel<3?'Critical fuel on the front':'Fuel reserves are insufficient for a sustained operation'}/></strong><p><LocaleText value="Fuel operational days"/>: {fuel.toFixed(1)}. <LocaleText value="Consider halting the assault, securing imports or withdrawing before supply and readiness collapse."/></p><button onClick={()=>s.navigate('resources')}><LocaleText value="Inspect fuel supply"/></button></div>}
        {tacticalView&&w.tactical?<Suspense fallback={<p><LocaleText value="Preparing the battlefield…"/></p>}><TacticalBattlefield warId={w.id} onReturn={()=>setTacticalView(false)}/></Suspense>:<>
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
                      <LocaleText value={String(asset)==='infantry_equipment'?'Personnel':String(asset)==='tanks'?'Tanks':String(asset)==='fighters'?'Fighters':'Warships'} />
                    </small>
                  </span>
                ))}
              </div>
              <dl><dt><LocaleText value="Pilots"/></dt><dd>{academyFor(s,c.id).pilots}</dd><dt><LocaleText value="Aircraft crew coverage"/></dt><dd>{(pilotCoverage(s,c.id)*100).toFixed(0)}%</dd>
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
          <button className="hd-war-button" disabled={!mine||(!w.tactical&&(w.status!=="active"||!!tacticalStartStatus(s,w.id)))} onClick={() => {if(!w.tactical)s.startTactical(w.id);else if(w.status==='active'&&w.autoAssault)s.setAutoAssault(w.id,false);setTacticalView(true);}}>
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
              "Auto assault advances one day every two seconds while this window is open. Decisions pause the clock."
            }
          />
        </p>
        </>}
      </section>

    </div>,
    document.body,
  );
}

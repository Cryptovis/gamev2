import {useWindowLifecycle,WINDOW_LAYERS} from '../windows/useWindowLifecycle';
import {calculateSupplyNetwork} from '../../engine/systems/supplyNetwork';
import {pilotCoverage,academyFor} from '../../engine/systems/governance';
import { LocaleText, translateLive } from "../../i18n/localeText";
import { Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGameStore } from "../../store/gameStore";
import {useWorldView} from '../../store/useWorldView';
import { flagEmoji } from "../../data/countryThemes";
import { coalitionSupport, warCombatView } from "../../engine/systems/warfare";
import { TaskGroupsPanel } from "./TaskGroupsPanel";
import { AssetThumbnail } from "../icons/AssetThumbnail";
import {tacticalStartStatus} from '../../engine/systems/tactical';
import {ErrorBoundary} from '../ErrorBoundary';
import {TacticalBattlefield} from './TacticalBattlefield';
// Always mounted: watches the war list to open new player wars, and mounts the
// full-state command body only while a war window is open.
export function WarTheatreModal() {
  const wars = useGameStore((s) => s.wars),
    playerCountryId = useGameStore((s) => s.playerCountryId),
    openWarWindow = useGameStore((s) => s.openWarWindow),
    open = useGameStore((s) => !!(s.warWindowId && s.wars[s.warWindowId])),
    seen = useRef(new Set(Object.keys(wars)));
  useEffect(() => {
    const fresh = Object.values(wars).find(
      (w) =>
        !seen.current.has(w.id) &&
        w.status === "active" &&
        (w.attackerId === playerCountryId ||
          w.defenderId === playerCountryId),
    );
    seen.current = new Set(Object.keys(wars));
    if (fresh) openWarWindow(fresh.id);
  }, [wars]);
  return open ? <WarCommand /> : null;
}
function WarCommand() {
  const s = useWorldView(),
    [tacticalView, setTacticalView] = useState(false),
    dialog = useRef<HTMLElement>(null);
  const w = s.warWindowId ? s.wars[s.warWindowId] : null;
  useWindowLifecycle(dialog,{onClose:()=>s.openWarWindow(null),layer:WINDOW_LAYERS.modal,enabled:!!w});
  useEffect(()=>setTacticalView(!!w?.tactical),[w?.id]);
  if (!w) return null;
  const a = s.countries[w.attackerId],
    d = s.countries[w.defenderId],
    // Phase 4: the war as it is fought (assigned task groups and their effects; whole crewed forces in older saves).
    p = warCombatView(s, w).p;
  const fuel=calculateSupplyNetwork(s.countries[s.playerCountryId]).fuelDays;
  const mine =
    w.attackerId === s.playerCountryId || w.defenderId === s.playerCountryId;
  return createPortal(
    <div className="war-theatre-backdrop">
      <section
        ref={dialog}
        tabIndex={-1}
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
        {tacticalView&&w.tactical?<ErrorBoundary title="The battlefield could not be displayed." actions={[{label:'Return to war command',onClick:()=>setTacticalView(false)}]}><Suspense fallback={<p><LocaleText value="Preparing the battlefield…"/></p>}><TacticalBattlefield warId={w.id} onReturn={()=>setTacticalView(false)}/></Suspense></ErrorBoundary>:<>
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
          {!!w.defenderAllies?.length && (
            <p className="war-allies">
              <LocaleText value={`Allies of the defender: ${(w.defenderAllies ?? []).map((id) => s.countries[id]?.name ?? id).join(", ")} (+${(coalitionSupport(s, w) * 100).toFixed(0)}% defender power)`} />
            </p>
          )}
        </div>
        {mine && <TaskGroupsPanel warId={w.id} />}
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
              "Auto assault runs at 5×: one day per second. Fuel warnings stay in the theatre; other decisions can pause the clock."
            }
          />
        </p>
        </>}
      </section>

    </div>,
    document.body,
  );
}

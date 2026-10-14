import {useWorldView} from '../../store/useWorldView';
import {NavigationArt} from '../icons/NavigationArt';
import {CivicArt} from '../icons/CivicArt';
import {activeCountries} from '../../domain/sovereignty';
import {LocaleText,translateLive} from '../../i18n/localeText';
import { useState } from "react";
import type { InstitutionId, VoteChoice } from "../../domain/world";
import type { ReligionType } from "../../domain/game";
import { useGameStore } from "../../store/gameStore";
import {
  INSTITUTIONS,
  membershipRequirements,
  ballotCount,
} from "../../engine/systems/worldInstitutions";
import { relationFor } from "../../engine/systems/diplomacy";
import { BASE_COST_B, formatCostB, scaledCostB } from "../../engine/systems/policyPressure";
import { ReviewDialog, type ReviewContent } from "./ReviewDialog";
import { AssetThumbnail } from "../icons/AssetThumbnail";
const religions: ReligionType[] = [
  "christianity",
  "catholic_christianity",
  "orthodox_christianity",
  "protestant_christianity",
  "islam",
  "hinduism",
  "buddhism",
  "judaism",
  "unaffiliated",
  "folk_or_mixed",
];
export function WorldInstitutionsPanel() {
  const state = useWorldView(),
    player = state.countries[state.playerCountryId];
  const [target, setTarget] = useState(
    state.selectedCountryId !== player.id
      ? (state.selectedCountryId ?? "")
      : "",
  );
  const [religion, setReligion] = useState<ReligionType>(
    player.society.dominantReligion,
  );
  const [review, setReview] = useState<
    (ReviewContent & { execute: (commandId:string) => void }) | null
  >(null);
  const foreign = activeCountries(state.countries)
    .filter((c) => c.id !== player.id)
    .sort((a, b) => a.name.localeCompare(b.name));
  const chosen = foreign.find((c) => c.id === target) ?? foreign[0];
  const missions = state.world.missions.filter((m) => m.targetId === chosen.id),
    latest = missions[0];
  const outreachCost = scaledCostB(player, BASE_COST_B.worldOutreach);
  const outreachBlocked =
    player.economy.treasury < outreachCost ||
    relationFor(player, chosen.id).score < 0 ||
    Boolean(
      latest && (latest.status === "active" || state.day < latest.endsDay + 60),
    );
  const chance = Math.max(
    0.15,
    Math.min(
      0.75,
      0.25 +
        relationFor(player, chosen.id).score * 0.003 +
        (state.culturalInfluence[chosen.id] ?? 0) * 0.002,
    ),
  );
  const ballots = state.world.ballots;
  return (
    <section className="world-institutions">
      <header>
        <small><LocaleText value={"WORLD / INSTITUTIONS & SOCIETY"}/></small>
        <h2><CivicArt kind="bloc" size={44}/><LocaleText value={"International Affairs"}/></h2>
        <p className="data-note"><LocaleText value={"Game rules and starting memberships are simulated. Voting uses one member, one vote; more yes than no passes, abstentions excluded. Institution badges are original game artwork."}/></p>
      </header>
      <div className="world-card">
        <AssetThumbnail asset="embassy" size={56} />
        <span>
          <small><LocaleText value={"DIPLOMATIC INFLUENCE"}/></small>
          <strong>
            <LocaleText value={(state.council.influenceByCountry[player.id] ?? 0).toFixed(1)}/><LocaleText value={"/100"}/></strong>
          <em><LocaleText value={"Research Public Diplomacy and Diplomatic Leadership to develop your international voice."}/></em>
        </span>
      </div>
      {(Object.keys(INSTITUTIONS) as InstitutionId[]).map((id) => {
        const d = INSTITUTIONS[id],
          checks = membershipRequirements(state, id),
          member = state.world.members[id].includes(player.id),
          pending = ballots.find(
            (b) =>
              b.kind === "membership" &&
              b.institution === id &&
              b.proposerId === player.id &&
              b.status === "open",
          ),
          last = ballots.find(
            (b) =>
              b.kind === "membership" &&
              b.institution === id &&
              b.proposerId === player.id,
          ),
          retry = last && state.day < last.closesDay + 30;
        return (
          <article className="institution-card" key={id}>
            <header>
              <span className="institution-mark"><NavigationArt kind={id==='security'?'military':'world'} size={46}/><b className="institution-abbreviation" translate="no">{d.short}</b></span>
              <div>
                <h3><LocaleText value={d.name}/></h3>
                <small>
                  <LocaleText value={state.world.members[id].length}/><LocaleText value={" members ·"}/><LocaleText value={" "}/>
                  <LocaleText value={member
                    ? "MEMBER"
                    : pending
                      ? "APPLICATION IN PROGRESS"
                      : "NON-MEMBER"}/>
                </small>
              </div>
            </header>
            <p>
              <LocaleText value={d.description}/><LocaleText value={" Benefit: "}/><LocaleText value={d.benefit}/><LocaleText value={"."}/></p>
            {!member && (
              <div className="institution-checks">
                {checks.map((c) => (
                  <span key={c.label} className={c.met ? "met" : "unmet"}>
                    <LocaleText value={c.met ? "✓" : "○"}/> <LocaleText value={c.label}/>
                  </span>
                ))}
              </div>
            )}
            <button
              disabled={
                member ||
                Boolean(pending) ||
                Boolean(retry) ||
                checks.some((c) => !c.met)
              }
              onClick={() =>
                setReview({
                  title: "Apply to " + d.name,
                  summary:
                    "Submit an application for a five-day member vote. Eligibility allows you to apply; it does not guarantee admission.",
                  metrics: [
                    ["Influence fee", String(d.cost)],
                    [
                      "Influence after",
                      (
                        (state.council.influenceByCountry[player.id] ?? 0) -
                        d.cost
                      ).toFixed(1),
                    ],
                  ],
                  warnings: [
                    "Relations, reputation and diplomatic leadership affect member votes.",
                    "Rejected applications may be retried 30 days after the vote closes.",
                  ],
                  execute: (commandId) => state.applyMembership(id, commandId),
                })
              }
            >
              <LocaleText value={member
                ? "MEMBERSHIP ACTIVE"
                : pending
                  ? "VOTING IN PROGRESS"
                  : retry
                    ? `RETRY D${last!.closesDay + 30}`
                    : "REVIEW APPLICATION"}/>
            </button>
          </article>
        );
      })}
      <article className="ballot-card">
        <h3><LocaleText value={"Security proposal"}/></h3>
        <select
          aria-label={translateLive("International affairs target")}
          value={chosen.id}
          onChange={(e) => setTarget(e.target.value)}
        >
          {foreign.map((c) => (
            <option key={c.id} value={c.id}>
              <LocaleText value={c.name}/>
            </option>
          ))}
        </select>
        <p><LocaleText value={"Request assembly support for an attack on"}/><LocaleText value={chosen.name}/><LocaleText value={". A vote does not start a war. Attacking after rejection causes condemnation, reputation loss and hostility from opposing countries and the target's allies."}/></p>
        <button
          disabled={
            !state.world.members.un.includes(player.id) ||
            (state.council.influenceByCountry[player.id] ?? 0) < 8 ||
            ballots.some(
              (b) =>
                b.kind === "attack" &&
                b.proposerId === player.id &&
                b.targetId === chosen.id &&
                b.status === "open",
            )
          }
          onClick={() =>
            setReview({
              title: "Debate an attack on " + chosen.name,
              summary:
                "Open a five-day assembly vote. You can review the result before declaring war.",
              metrics: [
                ["Influence fee", "8"],
                ["War starts automatically", "No"],
              ],
              warnings: [
                "A rejected resolution carries a -10 reputation and -20 bilateral relations penalty if you subsequently attack.",
              ],
              execute: (commandId) => state.proposeAttack(chosen.id, commandId),
            })
          }
        ><LocaleText value={"Review attack proposal"}/></button>
        <button onClick={() => state.navigate("war", chosen.id)}><LocaleText value={"OPEN WAR ASSESSMENT"}/></button>
      </article>
      <h3><LocaleText value={"Assembly votes & applications"}/></h3>
      {ballots.map((b) => {
        const counts = ballotCount(b),
          canVote =
            b.status === "open" &&
            state.world.members[b.institution].includes(player.id);
        return (
          <article className="ballot-card" key={b.id}>
            <small>
              <LocaleText value={INSTITUTIONS[b.institution].short}/><LocaleText value={" · "}/><LocaleText value={b.status.toUpperCase()}/><LocaleText value={" ·"}/><LocaleText value={" "}/>
              <LocaleText value={b.status === "open"
                ? `${Math.max(0, b.closesDay - state.day)} days left`
                : `closed D${b.closesDay}`}/>
            </small>
            <h3>
              <LocaleText value={b.kind === "membership"
                ? "Membership application"
                : "Attack proposal"}/><LocaleText value={" "}/><LocaleText value={"·"}/><LocaleText value={state.countries[b.proposerId].name}/>
            </h3>
            <p><LocaleText value={"Target:"}/><LocaleText value={state.countries[b.targetId].name}/><LocaleText value={" · "}/><LocaleText value={counts.yes}/><LocaleText value={" yes /"}/><LocaleText value={" "}/>
              <LocaleText value={counts.no}/><LocaleText value={" no / "}/><LocaleText value={counts.abstain}/><LocaleText value={"abstain"}/><LocaleText value={b.condemned ? " · ATTACK CONDEMNED" : ""}/>
            </p>
            {canVote &&
              (["yes", "no", "abstain"] as VoteChoice[]).map((choice) => (
                <button
                  key={choice}
                  aria-pressed={b.votes[player.id] === choice}
                  className={b.votes[player.id] === choice ? "selected" : ""}
                  onClick={() => state.voteWorld(b.id, choice)}
                >
                  <LocaleText value={choice.toUpperCase()}/>
                </button>
              ))}
            <details>
              <summary><LocaleText value={"Country votes"}/><LocaleText value={" "}/>
                <LocaleText value={canVote ? "· change your vote until closing" : ""}/>
              </summary>
              <div className="ballot-votes">
                {Object.entries(b.votes).map(([id, v]) => (
                  <span key={id}>
                    <LocaleText value={state.countries[id].name}/>
                    <b><LocaleText value={v.toUpperCase()}/></b>
                  </span>
                ))}
              </div>
            </details>
          </article>
        );
      })}
      {!ballots.length && (
        <p className="data-note"><LocaleText value={"No ballots yet. Submit an eligible application to begin. Other countries may seek support for ongoing conflicts."}/></p>
      )}
      <article className="outreach-card">
        <h3><LocaleText value={"Voluntary religious outreach"}/></h3>
        <p><LocaleText value={"Fund community exchange in"}/><LocaleText value={chosen.name}/><LocaleText value={". Starting percentages are gameplay estimates. The campaign may produce no measurable change; successful missions shift only 0.1–0.5 percentage points."}/></p>
        <select
          aria-label={translateLive("Outreach belief")}
          value={religion}
          onChange={(e) => setReligion(e.target.value as ReligionType)}
        >
          {religions.map((r) => (
            <option key={r} value={r}>
              <LocaleText value={r.replaceAll("_", " ")}/>
            </option>
          ))}
        </select>
        <div className="religious-shares">
          {Object.entries(state.world.religiousShares[chosen.id] ?? {}).map(
            ([r, v]) => (
              <span key={r}>
                <LocaleText value={r.replaceAll("_", " ")}/><LocaleText value={": "}/><LocaleText value={(v ?? 0).toFixed(2)}/><LocaleText value={"%"}/></span>
            ),
          )}
        </div>
        <p><LocaleText value={`Cost ${formatCostB(outreachCost)} · 30 days · estimated success`}/><LocaleText value={(chance * 100).toFixed(0)}/><LocaleText value={"% · requires non-negative relations · 60-day cooldown after completion."}/></p>
        <button
          disabled={outreachBlocked}
          onClick={() =>
            setReview({
              title: "Fund voluntary outreach",
              summary: `30-day ${religion.replaceAll("_", " ")} community exchange in ${chosen.name}.`,
              metrics: [
                ["Cost", formatCostB(outreachCost)],
                [
                  "Treasury after",
                  `$${(player.economy.treasury - outreachCost).toFixed(3)}B`,
                ],
                ["Success estimate", `${(chance * 100).toFixed(0)}%`],
                ["Possible change", "0.1–0.5 percentage points"],
              ],
              warnings: [
                "The campaign can fail. Costs are not refunded.",
                "Religious shares remain normalized to 100%; results are deterministic for this saved campaign.",
              ],
              execute: (commandId) => state.startOutreach(chosen.id, religion, commandId),
            })
          }
        ><LocaleText value={"REVIEW OUTREACH"}/></button>
        {missions.map((m) => (
          <p key={m.id}>
            <LocaleText value={m.religion.replaceAll("_", " ")}/><LocaleText value={" · "}/><LocaleText value={m.status.toUpperCase()}/><LocaleText value={" ·"}/><LocaleText value={" "}/>
            <LocaleText value={m.status === "active"
              ? `result D${m.endsDay}`
              : `+${m.effect.toFixed(2)} percentage points`}/>
          </p>
        ))}
      </article>
      {review && (
        <ReviewDialog
          {...review}
          onCancel={() => setReview(null)}
          onConfirm={(commandId) => {
            review.execute(commandId);
            setReview(null);
          }}
        />
      )}
    </section>
  );
}

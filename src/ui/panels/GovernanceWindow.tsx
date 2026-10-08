import {IntegrationPanel} from './IntegrationPanel';
import {activeCountries} from '../../domain/sovereignty';
import { useState } from "react";
import { CommandWindow } from "./CommandWindow";
import { ReviewDialog, type ReviewContent } from "./ReviewDialog";
import { LocaleText } from "../../i18n/localeText";
import { useGameStore } from "../../store/gameStore";
import {
  CANDIDATES,
  governance,
  occupationFor,
  politicalChance,
} from "../../engine/systems/governance";
export function GovernanceWindow() {
  const s = useGameStore(),
    g = governance(s),
    [selected, setSelected] = useState(
      s.navigation?.countryId && s.navigation.countryId !== s.playerCountryId
        ? s.navigation.countryId
        : (activeCountries(s.countries).find(
            (c) => c.controllerCountryId === s.playerCountryId,
          )?.id ?? s.playerCountryId),
    ),
    [recipient, setRecipient] = useState(""),
    [review, setReview] = useState<
      (ReviewContent & { execute: (commandId:string) => void; allowed: boolean }) | null
    >(null),
    p = s.countries[s.playerCountryId],
    c = s.countries[selected] ?? p,
    o = occupationFor(s, c.id),
    mine = o?.controllerId === p.id,
    history = g.occupations[c.id]?.election;
  const territories = activeCountries(s.countries).filter(
      (c) => c.controllerCountryId === p.id,
    ),
    action = (
      title: string,
      summary: string,
      cost: number,
      execute: (commandId:string) => void,
      allowed = true,
    ) =>
      setReview({
        title,
        summary,
        metrics: [
          ["Cost", `$${cost}B`],
          ["Treasury after", `$${(p.economy.treasury - cost).toFixed(3)}B`],
        ],
        allowed: p.economy.treasury >= cost && allowed,
        execute,
      });
  return (
    <CommandWindow
      wide
      title="Territories & Political Affairs"
      kicker="CIVIL ADMINISTRATION"
      onClose={s.closeWorkspace}
    >
      <div className="governance-navigation">
        <select
          aria-label="Governance country"
          value={c.id}
          onChange={(e) => setSelected(e.target.value)}
        >
          {activeCountries(s.countries)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((x) => (
              <option key={x.id} value={x.id}>
                <LocaleText value={x.name} />
              </option>
            ))}
        </select>
        <span>
          {territories.length} <LocaleText value="controlled territories" />
        </span>
        {territories.map((t) => (
          <button key={t.id} onClick={() => setSelected(t.id)}>
            <LocaleText value={t.name} />
          </button>
        ))}
      </div>
      <h2>
        <LocaleText value={c.name} />
      </h2>
      {g.foreignLeaders[c.id] && (
        <p>
          <LocaleText value="Current government" />:{" "}
          <LocaleText value={g.foreignLeaders[c.id]} />
        </p>
      )}
      {mine && o ? (
        <>
          <IntegrationPanel countryId={c.id}/><div className="occupation-summary">
            <span>
              <LocaleText value="Unrest" /> <b>{o.unrest.toFixed(1)}%</b>
              <progress max="100" value={o.unrest} />
            </span>
            <span>
              <LocaleText value="Civil stability" />{" "}
              {c.politics.stability.toFixed(0)}%
            </span>
            <span>
              <LocaleText value="Food reserves" /> {c.resources.food.toFixed(1)}
            </span>
            <span>
              <LocaleText value="Policy" /> <LocaleText value={o.policy} />
            </span>
          </div>
          <p>
            <LocaleText value="Shortages and weak stability raise unrest. At 80% unrest, output falls by 30%; at 95%, daily rebellion can restore independence. Military suppression reduces unrest temporarily but harms cohesion and reputation." />
          </p>
          <div className="governance-actions">
            <button
              disabled={
                s.day - o.lastActionDay < 7 ||
                p.resources.food < 20 ||
                p.resources.oil < 5
              }
              onClick={() =>
                action(
                  "Civil relief",
                  "Transfer 20 food and 5 oil; reduce unrest by 12 and improve stability by 3. Seven-day policy cooldown.",
                  1,
                  (commandId) => s.manageOccupation(c.id, "relief", commandId),
                )
              }
            >
              <LocaleText value="Send relief" />
            </button>
            <button
              disabled={
                s.day - o.lastActionDay < 7 ||
                p.military.personnel < 10000 ||
                p.military.readiness < 30
              }
              onClick={() =>
                action(
                  "Military suppression",
                  "Reduce unrest by 20. Lose 5 readiness, 5 reputation and 5 local cohesion. Long-term resentment rises.",
                  2,
                  (commandId) => s.manageOccupation(c.id, "suppress", commandId),
                )
              }
            >
              <LocaleText value="Military suppression" />
            </button>
            <button
              disabled={!!o.election}
              onClick={() =>
                action(
                  "Grant freedom through elections",
                  "Start a 21-day election. Control returns to an independent government when voting ends. Supporting a candidate improves their chance but cannot guarantee victory.",
                  3,
                  (commandId) => s.manageOccupation(c.id, "election", commandId),
                )
              }
            >
              <LocaleText value="Grant freedom / elections" />
            </button>
          </div>
          <div className="control-transfer">
            <h3>
              <LocaleText value="Transfer territorial control" />
            </h3>
            <select
              aria-label="Transfer recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            >
              <option value="">
                <LocaleText value="Choose recipient" />
              </option>
              {activeCountries(s.countries)
                .filter(
                  (x) =>
                    x.id !== p.id && x.id !== c.id && !x.controllerCountryId,
                )
                .sort(
                  (a, b) =>
                    (p.diplomacy.relations[b.id]?.score ?? 0) -
                    (p.diplomacy.relations[a.id]?.score ?? 0),
                )
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    <LocaleText value={x.name} />
                  </option>
                ))}
            </select>
            <button
              disabled={!recipient}
              onClick={() =>
                action(
                  "Transfer control",
                  "This transfers administration to the selected country and raises unrest by 10. The territory no longer belongs to your administration.",
                  0,
                  (commandId) => s.manageOccupation(c.id, "transfer", recipient, commandId),
                )
              }
            >
              <LocaleText value="Review transfer" />
            </button>
          </div>
          {o.election && !o.election.resolved && (
            <section>
              <h3>
                <LocaleText value="Transition election" /> ·{" "}
                {Math.max(0, o.election.endsDay - s.day)}{" "}
                <LocaleText value="days remaining" />
              </h3>
              <div className="candidate-grid">
                {CANDIDATES.map((candidate) => (
                  <article key={candidate.id}>
                    <h4>
                      <LocaleText value={candidate.name} />
                    </h4>
                    <p>
                      <LocaleText value={candidate.offer} />
                    </p>
                    <button
                      disabled={o.election?.supported === candidate.id}
                      onClick={() =>
                        action(
                          "Support candidate",
                          "Fund public electoral support. Voters still decide; the winner offers their own treaty after independence.",
                          1,
                          () =>
                            s.manageOccupation(c.id, "support", candidate.id),
                        )
                      }
                    >
                      <LocaleText
                        value={
                          o.election?.supported === candidate.id
                            ? "Supported"
                            : "Review support"
                        }
                      />
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="political-campaign">
          <h3>
            <LocaleText value="Foreign political influence" />
          </h3>
          <p>
            <LocaleText value="A campaign requires approval below 40%, stability below 50%, and either weak military readiness/logistics or strong ideological influence. It costs $5B, lasts 30 days and has a 90-day cooldown. Success is never guaranteed." />
          </p>
          <IntegrationPanel countryId={c.id}/><div className="occupation-summary">
            <span>
              <LocaleText value="Approval" /> {c.politics.approval.toFixed(0)}%
            </span>
            <span>
              <LocaleText value="Stability" /> {c.politics.stability.toFixed(0)}
              %
            </span>
            <span>
              <LocaleText value="Estimated chance" />{" "}
              {(politicalChance(s, c.id) * 100).toFixed(0)}%
            </span>
          </div>
          <button
            disabled={
              !politicalChance(s, c.id) ||
              g.campaigns.some(
                (x) =>
                  x.targetId === c.id &&
                  (x.status === "active" || s.day < x.endsDay + 90),
              )
            }
            onClick={() =>
              action(
                "Political influence campaign",
                "Support a fictional civil opposition coalition. Failure worsens relations. Conditions are checked again on completion; military strength and public opinion can recover.",
                5,
                (commandId) => s.fundPoliticalCampaign(c.id, commandId),
              )
            }
          >
            <LocaleText value="Review political campaign" />
          </button>
          {g.campaigns
            .filter((x) => x.targetId === c.id)
            .map((x) => (
              <p key={x.id}>
                <LocaleText value={x.status} /> ·{" "}
                <LocaleText value="Estimated chance" />{" "}
                {(x.chance * 100).toFixed(0)}% ·{" "}
                {Math.max(0, x.endsDay - s.day)}{" "}
                <LocaleText value="days remaining" />
              </p>
            ))}
        </section>
      )}
      {history?.resolved && g.occupations[c.id].controllerId === p.id && (
        <section className="election-result">
          <h3>
            <LocaleText value="Independent government elected" />
          </h3>
          <p>
            <LocaleText
              value={
                CANDIDATES.find((x) => x.id === history.winner)?.name ?? ""
              }
            />
          </p>
          <p>
            <LocaleText
              value={
                CANDIDATES.find((x) => x.id === history.winner)?.offer ?? ""
              }
            />
          </p>
          <button
            disabled={history.offerAccepted}
            onClick={() =>
              action(
                "Accept government offer",
                "Accept the elected government’s treaty. The country remains independent.",
                0,
                (commandId) => s.acceptElectionOffer(c.id, commandId),
              )
            }
          >
            <LocaleText
              value={
                history.offerAccepted ? "Offer accepted" : "Review treaty offer"
              }
            />
          </button>
        </section>
      )}
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
    </CommandWindow>
  );
}

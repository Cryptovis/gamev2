import { useState } from "react";
import { useGameStore } from "../../store/gameStore";
import { LocaleText } from "../../i18n/localeText";
import { living, LETTER_COST } from "../../engine/systems/livingEconomy";
import { CivicArt } from "../icons/CivicArt";
import { ReviewDialog, type ReviewContent } from "./ReviewDialog";
import { money } from "../formatMoney";
export function DiplomaticPost() {
  const s = useGameStore(),
    l = living(s),
    [target, setTarget] = useState("BRA"),
    [kind, setKind] = useState<"embassy" | "trade_pact">("embassy"),
    [review, setReview] = useState<
      (ReviewContent & { execute: () => void; allowed?: boolean }) | null
    >(null);
  return (
    <section className="diplomatic-post">
      <header>
        <CivicArt kind="letter" size={82} />
        <div>
          <h3>
            <LocaleText value="Diplomatic Post Office" />
          </h3>
          <p>
            <LocaleText value="Send proposals, wait for replies and review incoming offers. Shared incoming proposals cost you 50% of the diplomatic fee; the sender pays the other half." />
          </p>
        </div>
        <button onClick={s.readLetters}>
          <LocaleText value="Mark letters read" />
        </button>
      </header>
      <div className="letter-compose">
        <select
          aria-label="Letter recipient"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          {Object.values(s.countries)
            .filter((c) => c.id !== s.playerCountryId)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((c) => (
              <option key={c.id} value={c.id}>
                <LocaleText value={c.name} />
              </option>
            ))}
        </select>
        <select
          aria-label="Proposal type"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
        >
          <option value="embassy">
            <LocaleText value="Embassy exchange" />
          </option>
          <option value="trade_pact">
            <LocaleText value="Trade framework" />
          </option>
        </select>
        <button
          onClick={() =>
            setReview({
              title: "Send diplomatic proposal",
              summary:
                "The partner replies in three days. Relations, strategic needs and funding determine acceptance. A rejection creates no agreement and charges no fee.",
              metrics: [
                ["Partner", s.countries[target].name],
                ["Cost if accepted", money(LETTER_COST[kind])],
                ["Reply day", String(s.day + 3)],
              ],
              allowed:
                s.countries[s.playerCountryId].economy.treasury >=
                LETTER_COST[kind],
              execute: () => s.requestDiplomacy(target, kind, 1),
            })
          }
        >
          <LocaleText value="Review proposal" />
        </button>
      </div>
      <div className="letter-list">
        {l.letters.map((x) => {
          const other =
              x.senderId === s.playerCountryId ? x.receiverId : x.senderId,
            pending =
              x.incoming && x.status === "pending" && x.expiresDay >= s.day;
          return (
            <article key={x.id} className={x.read ? "" : "unread"}>
              <CivicArt kind="letter" size={44} />
              <div>
                <small>
                  <LocaleText value={x.incoming ? "INCOMING" : "OUTGOING"} /> ·{" "}
                  <LocaleText value={x.status} /> · D{x.sentDay}
                </small>
                <h4>
                  <LocaleText value={s.countries[other]?.name ?? other} />
                </h4>
                <p>
                  <LocaleText value={x.message} />
                </p>
                <small>
                  <LocaleText
                    value={
                      x.kind === "embassy"
                        ? "Embassy exchange"
                        : x.kind === "closure"
                          ? "Embassy closed"
                          : "Trade framework"
                    }
                  />
                </small>
                {pending && (
                  <div>
                    <button
                      onClick={() =>
                        setReview({
                          title: "Decline proposal",
                          summary:
                            "The proposal will close without spending funds or opening an agreement.",
                          execute: () => s.resolveIncomingLetter(x.id, false),
                        })
                      }
                    >
                      <LocaleText value="Decline" />
                    </button>
                    <button
                      onClick={() =>
                        setReview({
                          title: "Accept shared proposal",
                          summary:
                            "Both countries pay half of the diplomatic setup fee. This opens the agreement; goods still require separate priced shipments.",
                          metrics: [
                            ["Your share", money(LETTER_COST[x.kind] * 0.5)],
                            ["Partner share", money(LETTER_COST[x.kind] * 0.5)],
                            [
                              "Treasury after",
                              money(
                                s.countries[s.playerCountryId].economy
                                  .treasury -
                                  LETTER_COST[x.kind] * 0.5,
                              ),
                            ],
                          ],
                          allowed:
                            s.countries[s.playerCountryId].economy.treasury >=
                              LETTER_COST[x.kind] * 0.5 &&
                            s.countries[x.senderId].economy.treasury >=
                              LETTER_COST[x.kind] * 0.5,
                          execute: () => s.resolveIncomingLetter(x.id, true),
                        })
                      }
                    >
                      <LocaleText value="Review shared offer" />
                    </button>
                  </div>
                )}
              </div>
              <button onClick={() => s.navigate("diplomacy", other)}>
                <LocaleText value="Open partner diplomacy" />
              </button>
            </article>
          );
        })}
      </div>
      {!l.letters.length && (
        <p>
          <LocaleText value="No letters yet. Send your first proposal or wait for a government to contact you." />
        </p>
      )}
      {review && (
        <ReviewDialog
          {...review}
          onCancel={() => setReview(null)}
          onConfirm={() => {
            review.execute();
            setReview(null);
          }}
        />
      )}
    </section>
  );
}

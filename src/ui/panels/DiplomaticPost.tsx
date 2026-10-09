import {relationFor,relationshipIndex} from '../../engine/systems/diplomacy';
import {diplomaticMissionStatus} from '../../engine/systems/policyPressure';
import {useWorldView} from '../../store/useWorldView';
import {activeCountries} from '../../domain/sovereignty';
import { useState } from "react";
import { useGameStore } from "../../store/gameStore";
import { LocaleText } from "../../i18n/localeText";
import { living, letterCost, diplomaticProposalStatus,proposalAcceptanceChance } from "../../engine/systems/livingEconomy";
import { CivicArt } from "../icons/CivicArt";
import { ReviewDialog, type ReviewContent } from "./ReviewDialog";
import { money } from "../formatMoney";
export function DiplomaticPost() {
  const s = useWorldView(),
    l = living(s),
    [target, setTarget] = useState(()=>{const nav=useGameStore.getState().navigation;return nav?.panel==='diplomacy-inbox'&&nav.countryId!==s.playerCountryId?nav.countryId:"BRA";}),
    [kind, setKind] = useState<"embassy" | "trade_pact">("embassy"),
    [filter,setFilter]=useState<'all'|'outgoing'|'incoming'|'history'>('all'),
    [help,setHelp]=useState(false),
    [review, setReview] = useState<
      (ReviewContent & { execute: (commandId:string) => void; allowed?: boolean }) | null
    >(null);
  const status=diplomaticProposalStatus(s,target,kind);
  const relation=relationFor(s.countries[s.playerCountryId],target),index=relationshipIndex(relation),chance=proposalAcceptanceChance(s,s.playerCountryId,target,kind);
  const visibleLetters=l.letters.filter(x=>filter==='history'?x.status!=='pending':x.status==='pending'&&(filter==='all'||(filter==='incoming'?x.incoming:!x.incoming)));
  const track=()=>{setFilter(status.letter&&status.letter.status!=='pending'?'history':status.letter?.incoming?'incoming':'outgoing');setHelp(true);window.setTimeout(()=>document.getElementById('proposal-tracker')?.scrollIntoView({block:'nearest'}),0);};
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
          {activeCountries(s.countries)
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
          onClick={() => {
            if(!status.allowed){track();return;}
            setReview({
              title: "Send diplomatic proposal",
              summary:
                "The partner replies in three days. Relations, strategic needs and funding determine acceptance. A rejection creates no agreement and charges no fee.",
              metrics: [
                ["Partner", s.countries[target].name],
                ["Cost if accepted", money(letterCost(s, s.playerCountryId, kind))],
                ["Reply day", String(s.day + 3)],
                ["Relations",`${index}/100`],
                ["Points to trade eligibility",String(Math.max(0,20-index))],
                ["Points to Good",String(Math.max(0,51-index))],
                ["Estimated acceptance",`${Math.round(chance*100)}%`],
              ],
              allowed: status.allowed,
              execute: (commandId) => s.requestDiplomacy(target, kind, 1, commandId),
            });
          }}
        >
          <LocaleText value={status.allowed?"Review proposal":"Track proposal / status"} />
        </button>
      </div>
      <aside className="proposal-assessment"><strong><LocaleText value="Relations"/>: {index}/100 · <LocaleText value="Points to trade eligibility"/>: {Math.max(0,20-index)} · <LocaleText value="Points to Good"/>: {Math.max(0,51-index)} · <LocaleText value="Mission gain"/>: +{diplomaticMissionStatus(s,s.playerCountryId,target).gain/2}</strong><p><LocaleText value="Above 50/100 is Good and makes trade acceptance easier. Trade proposals need at least 20/100. Missions or aid raise relations; acceptance is not guaranteed."/></p>{status.allowed&&<p><LocaleText value="Estimated acceptance"/>: {Math.round(chance*100)}%</p>}</aside>
      {!status.allowed&&<aside className="proposal-status" role="status"><strong><LocaleText value="Proposal status"/></strong><p><LocaleText value={status.reason}/></p>{status.letter&&<small><LocaleText value="Reply day"/>: {status.letter.replyDay}{status.letter.status!=='pending'&&<> · <LocaleText value="Retry day"/>: {status.retryDay}</>}</small>}<div><button onClick={track}><LocaleText value="Help / track proposals"/></button><button onClick={()=>s.navigate('diplomacy',target)}><LocaleText value="Open partner diplomacy"/></button></div></aside>}
      {help&&<aside className="proposal-status"><strong><LocaleText value="Where are my proposals?"/></strong><p><LocaleText value="Open Diplomacy, then Proposal tracker and Sent proposals. Pending replies arrive after three campaign days; advance time to receive them. Sending again will not accelerate the answer. No fee is charged at submission; accepted outgoing proposals charge the stated fee once."/></p></aside>}
      <h4 id="proposal-tracker"><LocaleText value="Proposal tracker"/> · <LocaleText value="Pending"/>: {l.letters.filter(x=>x.status==='pending').length}</h4>
      <nav className="proposal-filters" aria-label="Proposal tracker filters">{(['all','outgoing','incoming','history'] as const).map(f=><button key={f} data-proposal-filter={f} className={filter===f?'active':''} aria-pressed={filter===f} onClick={()=>setFilter(f)}><LocaleText value={f==='history'?'Proposal history':f==='all'?'Pending proposals':f==='outgoing'?'Sent proposals':'Received proposals'}/>{f==='history'&&<> ({l.letters.filter(x=>x.status!=='pending').length})</>}</button>)}</nav>
      {filter==='history'&&<p className="proposal-history-note"><LocaleText value="Accepted, rejected and closed proposals are kept here. A past acceptance does not mean the agreement is still active."/></p>}
      <div className="letter-list">
        {visibleLetters.map((x) => {
          const other =
              x.senderId === s.playerCountryId ? x.receiverId : x.senderId,
            pending =
              x.incoming && x.status === "pending" && x.expiresDay >= s.day;
          return (
            <article key={x.id} data-letter-id={x.id} data-status={x.status} className={x.read ? "" : "unread"}>
              <CivicArt kind="letter" size={44} />
              <div>
                <small>
                  <LocaleText value={x.incoming ? "INCOMING" : "OUTGOING"} /> ·{" "}
                  <LocaleText value={x.status} /> · <LocaleText value="Day"/> {x.sentDay}
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
                          execute: (commandId) => s.resolveIncomingLetter(x.id, false, commandId),
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
                            ["Your share", money(letterCost(s, s.playerCountryId, x.kind) * 0.5)],
                            ["Partner share", money(letterCost(s, x.senderId, x.kind) * 0.5)],
                            [
                              "Treasury after",
                              money(
                                s.countries[s.playerCountryId].economy
                                  .treasury -
                                  letterCost(s, s.playerCountryId, x.kind) * 0.5,
                              ),
                            ],
                          ],
                          allowed:
                            s.countries[s.playerCountryId].economy.treasury >=
                              letterCost(s, s.playerCountryId, x.kind) * 0.5 &&
                            s.countries[x.senderId].economy.treasury >=
                              letterCost(s, x.senderId, x.kind) * 0.5,
                          execute: (commandId) => s.resolveIncomingLetter(x.id, true, commandId),
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
      {!visibleLetters.length && (
        <p>
          <LocaleText value="No letters yet. Send your first proposal or wait for a government to contact you." />
        </p>
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
    </section>
  );
}

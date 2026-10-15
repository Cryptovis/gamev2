import {useState} from 'react';
import type {GameState} from '../../../domain/game';
import {LocaleText} from '../../../i18n/localeText';
import {ORGANIZATION_LABELS,PAYLOAD_LABELS,bodyLabel,resolutionVotingView,resolutionPayloadMetrics,type OrganizationProposalDraft} from '../../../engine/systems/organizations/previews';
import {isFoundationalPayload} from '../../../engine/systems/organizations/validation';
import {isEconomicPayload} from '../../../engine/systems/organizations/economic';
import {Badge,Metrics,ReviewedAction,type ReviewAction} from './shared';
import {ProposalComposer} from './ProposalComposer';
export function VotingTab({state,draft,setDraft,onReview}:{state:GameState;draft:OrganizationProposalDraft;setDraft:(d:OrganizationProposalDraft)=>void;onReview:ReviewAction}){
 const [history,setHistory]=useState(false),[limit,setLimit]=useState(30);
 const resolutions=Object.values(state.world.organizations.resolutions).filter(r=>history||['voting','debate','draft'].includes(r.phase)||r.phase==='adopted'&&r.execution.status==='pending').sort((a,b)=>b.openedDay-a.openedDay||b.id.localeCompare(a.id));
 return <><ProposalComposer state={state} draft={draft} setDraft={setDraft} onReview={onReview}/>
 <label className="ia-check"><input type="checkbox" checked={history} onChange={e=>setHistory(e.target.checked)}/><LocaleText value="Include completed resolutions"/></label>
 {!resolutions.length&&<p className="ia-empty"><LocaleText value="No resolutions in this view. Create an eligible proposal to open voting."/></p>}
 {resolutions.slice(0,limit).map(r=>{const view=resolutionVotingView(r),title=isFoundationalPayload(r.payload)||isEconomicPayload(r.payload)||r.payload.kind==='finance'?PAYLOAD_LABELS[r.payload.kind]:'Other mandate';return <article className="ia-card" key={r.id} data-resolution={r.id}>
  <header className="ia-card-header"><div><small><LocaleText value={ORGANIZATION_LABELS[r.organizationId]}/> · <LocaleText value={bodyLabel(r.bodyId)}/></small><h3><LocaleText value={title}/> <code>{r.id}</code></h3></div><Badge value={r.phase}/></header>
  <Metrics rows={[["Proposer",state.countries[r.proposerId].name],["Voting closes on day",String(r.closesDay)],["Effective day",String(r.effectiveDay)],["Voting rule",view.rule.label],...view.rule.metrics,["Yes",String(view.yesCount)],["No",String(view.noCount)],["Abstain",String(view.abstainCount)],["Yes weight",String(view.yesWeight)],["Eligible weight",String(view.totalWeight)]]}/>
  <Metrics rows={resolutionPayloadMetrics(state,r.payload)}/>
  <div className="ia-buttons">{(['yes','no','abstain'] as const).map(choice=><ReviewedAction key={choice} state={state} command={{type:'organization/castBallot',resolutionId:r.id,choice}} onReview={onReview} label={choice==='yes'?'Yes':choice==='no'?'No':'Abstain'}/>)}</div>
  {r.outcome&&<p><LocaleText value={r.outcome.passed?'Vote passed':'Vote rejected'}/>{!!r.outcome.vetoedBy?.length&&<> · <LocaleText value="Veto"/> {r.outcome.vetoedBy.map(id=>state.countries[id].name).join(' · ')}</>}</p>}
  <details><summary><LocaleText value="Frozen electorate and ballots"/></summary><div className="ia-electorate">{r.electorate.eligibleCountryIds.map(id=><div key={id}><LocaleText value={state.countries[id].name}/><span><LocaleText value="Weight"/> {r.electorate.weights[id]}</span><Badge value={r.ballots[id]??'pending'}/></div>)}</div></details>
 </article>;})}
 {resolutions.length>limit&&<button type="button" onClick={()=>setLimit(n=>n+30)}><LocaleText value="Show more"/></button>}
 </>;
}

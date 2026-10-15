import {useState} from 'react';
import type {GameState} from '../../../domain/game';
import type {OrganizationFinancingRecord} from '../../../domain/organizations';
import {financingRecords} from '../../../engine/systems/organizations/financing';
import {financingFacilityView,ORGANIZATION_LABELS} from '../../../engine/systems/organizations/previews';
import {LocaleText} from '../../../i18n/localeText';
import {Badge,Metrics,NumberField,ReviewedAction,type ReviewAction} from './shared';
function Facility({state,facility:f,onReview}:{state:GameState;facility:OrganizationFinancingRecord;onReview:ReviewAction}){
 const view=financingFacilityView(state,f),[principal,setPrincipal]=useState(0),[interest,setInterest]=useState(0),l=f.lifecycle;
 return <article className="ia-card" data-facility={f.id}><header className="ia-card-header"><div><small><LocaleText value={ORGANIZATION_LABELS[f.organizationId]}/></small><h3><LocaleText value={state.countries[f.borrowerId].name}/> <code>{f.id}</code></h3></div><Badge value={f.status}/></header>
  <Metrics rows={[["Outstanding principal ($B)",f.outstandingB.toFixed(4)],["Undrawn commitment ($B)",f.committedB.toFixed(4)],["APR (%)",String(f.terms.apr)],["Daily interest ($B)",view.dailyInterestB.toFixed(6)],["Accrued interest ($B)",view.accruedInterestB.toFixed(6)],["Next service day",view.nextServiceDay===null?'Unknown':String(view.nextServiceDay)],["Debt service due ($B)",view.debtServiceB.toFixed(6)],["Maturity day",view.maturityDay===null?'Unknown':String(view.maturityDay)]]}/>
  {l?<><Badge value={l.fundingKind}/><div className="ia-tranches">{l.tranches.map(t=><div key={t.reviewDay}><span><LocaleText value="Review day"/> {t.reviewDay}</span><span><LocaleText value="Tranche ($B)"/> {t.amountB.toFixed(4)}</span><Badge value={t.status}/></div>)}</div>
   {!!l.conditions.length&&<ul>{l.conditions.map((c,i)=><li key={i}><LocaleText value={c.kind==='taxRate'?'Minimum tax rate (%)':c.kind==='fiscalBalance'?'Minimum fiscal balance ($B/day)':'Maximum social budget share (0–1)'}/> {c.threshold} · <LocaleText value="Review day"/> {c.reviewDay}</li>)}</ul>}
   {view.canRepay&&<><div className="ia-form-grid"><NumberField label="Principal payment ($B)" value={principal} onChange={setPrincipal} max={f.outstandingB}/><NumberField label="Interest payment ($B)" value={interest} onChange={setInterest} max={view.accruedInterestB}/></div>
    <div className="ia-buttons"><button type="button" onClick={()=>{setPrincipal(f.outstandingB);setInterest(view.accruedInterestB);}}><LocaleText value="Fill outstanding balance"/></button><ReviewedAction state={state} command={{type:'organization/repayOrganizationFinancing',financingId:f.id,principalB:principal,interestB:interest}} onReview={onReview} label="Review repayment"/>
    {f.committedB>0&&<ReviewedAction state={state} command={{type:'organization/cancelOrganizationFinancing',financingId:f.id}} onReview={onReview} label="Review cancellation"/>}</div></>}
  </>:<p className="ia-muted"><LocaleText value="Legacy facility: historical schedule is unavailable."/></p>}
 </article>;
}
export function FinanceTab({state,onReview}:{state:GameState;onReview:ReviewAction}){
 const [history,setHistory]=useState(false),[limit,setLimit]=useState(30),facilities=financingRecords(state).filter(f=>history||f.outstandingB>0||(f.lifecycle?.accruedInterestB??0)>0||!['closed','expired','cancelled'].includes(f.status));
 return <><label className="ia-check"><input type="checkbox" checked={history} onChange={e=>setHistory(e.target.checked)}/><LocaleText value="Include completed facilities"/></label>
  {!facilities.length&&<p className="ia-empty"><LocaleText value="No financial facilities in this view. Request a loan or grant from an eligible financial board."/></p>}
  {facilities.slice(0,limit).map(f=><Facility key={f.id} state={state} facility={f} onReview={onReview}/>)}{facilities.length>limit&&<button type="button" onClick={()=>setLimit(n=>n+30)}><LocaleText value="Show more"/></button>}
 </>;
}

import {useId,useState} from 'react';
import type {OrganizationCommand,OrganizationId} from '../../domain/organizations';
import {useWorldView} from '../../store/useWorldView';
import {useGameStore} from '../../store/gameStore';
import {LocaleText,translateLive} from '../../i18n/localeText';
import {initialProposalDraft,previewOrganizationCommand} from '../../engine/systems/organizations/previews';
import {ReviewDialog} from './ReviewDialog';
import {OverviewTab} from './international/OverviewTab';
import {VotingTab} from './international/VotingTab';
import {FinanceTab} from './international/FinanceTab';
import {MarketsTab} from './international/MarketsTab';
import {SanctionsTab} from './international/SanctionsTab';
import {INTERNATIONAL_HINTS} from './international/hints';
import {TacticalHint} from '../hints/TacticalHint';
import {createPortal} from 'react-dom';
import {useWindowHintSlot} from '../hints/HintSlot';
export const INTERNATIONAL_TABS=[{id:'overview',label:'Overview & Roster'},{id:'resolutions',label:'Resolutions & Voting'},{id:'finance',label:'Financial Facilities'},{id:'markets',label:'Commodities & Swaps'},{id:'sanctions',label:'Sanctions & Enforcement'}] as const;
type Tab=typeof INTERNATIONAL_TABS[number]['id'];
const reviewTitle=(command:OrganizationCommand)=>command.type==='organization/proposeResolution'?'Review proposal':command.type==='organization/castBallot'?'Review ballot':command.type==='organization/repayOrganizationFinancing'?'Review repayment':command.type==='organization/setOilQuotaDeviation'?'Review deviation':command.type==='organization/transferMilitaryHardware'?'Review hardware transfer':'Review cancellation';
export function InternationalAffairsWorkspace(){
 const state=useWorldView(),dispatch=useGameStore(s=>s.dispatch),prefix=useId(),[tab,setTab]=useState<Tab>('overview'),[draft,setDraft]=useState(()=>initialProposalDraft(state)),[review,setReview]=useState<OrganizationCommand|null>(null),[notice,setNotice]=useState('');
 const preview=review?previewOrganizationCommand(state,review):null;
 const onReview=(command:OrganizationCommand)=>{setNotice('');setReview(structuredClone(command));};
 const onPropose=(id:OrganizationId)=>{setDraft(initialProposalDraft(state,id));setTab('resolutions');};
 const slot=useWindowHintSlot();
 return <section className="international-affairs" aria-label={translateLive('International Affairs (Alliances)')}>
  <header className="ia-header ia-header-hinted"><div><h2><LocaleText value="International Affairs (Alliances)"/></h2><p><LocaleText value="Fourteen organizations. One command hub. Every action follows the same engine rules."/></p></div>
   <div className="ia-influence"><span><LocaleText value="Diplomatic influence"/></span><strong>{(state.council.influenceByCountry[state.playerCountryId]??0).toFixed(1)}</strong><small><LocaleText value="Campaign day"/> {state.day}</small></div>
   {!slot&&<TacticalHint spec={INTERNATIONAL_HINTS[tab]}/>}
  </header>
  {slot&&createPortal(<TacticalHint spec={INTERNATIONAL_HINTS[tab]}/>,slot)}
  <div className="ia-tabs" role="tablist" aria-label={translateLive('International Affairs sections')} onKeyDown={event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')),index=buttons.indexOf(document.activeElement as HTMLButtonElement);if(index<0)return;
   event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next].focus();buttons[next].click();
  }}>{INTERNATIONAL_TABS.map(item=><button type="button" id={`${prefix}-${item.id}-tab`} key={item.id} role="tab" aria-selected={tab===item.id} aria-controls={`${prefix}-panel`} tabIndex={tab===item.id?0:-1} onClick={()=>setTab(item.id)}><LocaleText value={item.label}/></button>)}</div>
  <div className="ia-tab-panel" role="tabpanel" id={`${prefix}-panel`} aria-labelledby={`${prefix}-${tab}-tab`} tabIndex={0}>
   {tab==='overview'&&<OverviewTab state={state} onPropose={onPropose}/>}
   {tab==='resolutions'&&<VotingTab state={state} draft={draft} setDraft={setDraft} onReview={onReview}/>}
   {tab==='finance'&&<FinanceTab state={state} onReview={onReview}/>}
   {tab==='markets'&&<MarketsTab state={state} onReview={onReview}/>}
   {tab==='sanctions'&&<SanctionsTab state={state} onReview={onReview}/>}
  </div>
  <p className="ia-notice" role="status" aria-live="polite"><LocaleText value={notice}/></p>
  {review&&preview&&<ReviewDialog className="ia-review" title={reviewTitle(review)} summary="Review the current eligibility, costs and effects before confirming. The engine validates again at submission." metrics={preview.metrics} warnings={[preview.reasonText]} allowed={preview.allowed} onCancel={()=>setReview(null)} onConfirm={commandId=>{
   const current=useGameStore.getState(),status=previewOrganizationCommand(current,review);if(!status.allowed){setNotice(status.reasonText);return;}
   dispatch({...review,commandId});setNotice(useGameStore.getState().world.commandIds?.includes(commandId)?'Command applied.':'No change was applied.');setReview(null);
  }}/>}
 </section>;
}

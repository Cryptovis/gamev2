import {useState} from 'react';
import type {CountryState} from '../../domain/game';
import {useWorldView} from '../../store/useWorldView';
import {useGameStore} from '../../store/gameStore';
import {LocaleText,formatText} from '../../i18n/localeText';
import {formatCostB} from '../../engine/systems/policyPressure';
import {CommandArt} from '../icons/CommandArt';
import {CivicArt} from '../icons/CivicArt';
import {ReviewDialog} from './ReviewDialog';
import {CONCESSION_DAYS,FACTION_LABEL,policyCards,reasonParts,type PolicyCard} from './policyCards';

/** Policies & Laws: six cards built from the existing tax policy and faction concessions. Only the player's own country gets buttons. */
export function PolicyCardGrid({country}:{country:CountryState}){
 const state=useWorldView(),language=useGameStore(s=>s.playerProfile.language),dispatch=useGameStore(s=>s.dispatchWithReceipt);
 const [pending,setPending]=useState<PolicyCard|null>(null);
 const own=country.id===state.playerCountryId,cards=policyCards(state,country.id);
 const adjustTax=()=>{
  const panel=document.querySelector<HTMLElement>('.tax-policy-panel');
  panel?.scrollIntoView({block:'center'});panel?.querySelector<HTMLElement>('input')?.focus({preventScroll:true});
 };
 return <section className="policy-card-grid" aria-label={formatText(language,'Policies & Laws',[])}>
  <h4 className="policy-card-heading"><LocaleText value="Policies & Laws"/></h4>
  <div className="policy-card-list">{cards.map(card=>{
   const reason=card.reason?reasonParts(card.reason):null;
   return <article key={card.id} className={`policy-card status-${card.status}`} data-policy={card.id} data-status={card.status}>
    {card.status==='active'&&<span className="policy-card-check" role="img" aria-label={formatText(language,'Active',[])}>✓</span>}
    <span className="policy-card-art" aria-hidden="true">{card.art.set==='civic'?<CivicArt kind={card.art.kind as never} size={40}/>:<CommandArt kind={card.art.kind} size={40}/>}</span>
    <h5><LocaleText value={card.title}/></h5>
    <p>{card.id==='tax'?formatText(language,card.subtitle,[String(Math.round((card.taxRate??0)*10)/10)]):formatText(language,card.subtitle,[FACTION_LABEL[card.faction!]])}</p>
    <div className="policy-card-meta">
     {card.status==='active'&&<b>{formatText(language,'Active · {0} days left',[String(card.daysLeft??0)])}</b>}
     {card.status==='locked'&&reason&&<span>{formatText(language,reason.key,reason.values)}</span>}
     {card.status==='available'&&card.id!=='tax'&&<span><LocaleText value="Satisfaction"/>{` ${Math.round(card.satisfaction??0)}/100`}</span>}
    </div>
    {own&&card.id==='tax'&&<button className="policy-card-action" onClick={adjustTax}><LocaleText value="Adjust"/></button>}
    {own&&card.status==='available'&&card.command&&<button className="policy-card-action" onClick={()=>setPending(card)}><LocaleText value="Enact"/>{` · ${formatCostB(card.costB??0)}`}</button>}
   </article>;
  })}</div>
  {pending?.command&&<ReviewDialog
   title={formatText(language,'Concession to {0}',[FACTION_LABEL[pending.faction!]])}
   summary={formatText(language,'Courts {0} for 180 days',[FACTION_LABEL[pending.faction!]])}
   metrics={[['Cost',formatCostB(pending.costB??0)],['Duration',`${CONCESSION_DAYS} days`],['Satisfaction',`${Math.round(pending.satisfaction??0)}/100`]]}
   onCancel={()=>setPending(null)} onConfirm={commandId=>{dispatch({...pending.command!,commandId});setPending(null);}} confirmLabel="CONFIRM"/>}
 </section>;
}

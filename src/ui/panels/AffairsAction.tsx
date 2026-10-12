import {useState} from 'react';
import type {GameCommand} from '../../domain/commands';
import {affairsPreview} from '../../engine/affairsPreview';
import {useGameStore} from '../../store/gameStore';
import {useShallow} from 'zustand/react/shallow';
import {LocaleText} from '../../i18n/localeText';
import {ReviewDialog} from './ReviewDialog';
import {money} from '../formatMoney';

/** The displayed gate and the commit gate use the same engine preview. */
export function AffairsAction({command,title,summary}:{command:GameCommand;title:string;summary:string}) {
 // Select only the displayed preview figures, so unrelated store changes do not re-render each action card.
 const view=useGameStore(useShallow(s=>{const p=affairsPreview(s,command);return p?{allowed:p.allowed,cost:p.cost,shortfall:p.shortfall,cooldown:p.cooldown,reasons:p.reasons.join('\n'),treasury:s.countries[s.playerCountryId].economy.treasury,language:s.playerProfile.language}:null;}));
 const dispatchWithReceipt=useGameStore(s=>s.dispatchWithReceipt),[review,setReview]=useState(false);
 if(!view)return null;
 const preview={...view,reasons:view.reasons?view.reasons.split('\n'):[]};
 const metrics=[['Cost',money(preview.cost,view.language)],['Treasury',money(view.treasury,view.language)]];
 if(preview.shortfall)metrics.push(['Shortfall',money(preview.shortfall,view.language)]);
 if(preview.cooldown)metrics.push(['Days remaining',String(preview.cooldown)]);
 return <article className="affairs-action">
  <h3><LocaleText value={title}/></h3><p><LocaleText value={summary}/></p>
  <dl>{metrics.map(([label,value])=><div key={label}><dt><LocaleText value={label}/></dt><dd>{value}</dd></div>)}</dl>
  {preview.reasons.length>0&&<ul className="affairs-blockers">{preview.reasons.map(reason=><li key={reason}><LocaleText value={reason}/></li>)}</ul>}
  <button disabled={!preview.allowed} onClick={()=>setReview(true)}><LocaleText value={title}/></button>
  {review&&<ReviewDialog title={title} summary={summary} metrics={metrics} warnings={preview.reasons} allowed={preview.allowed} onCancel={()=>setReview(false)} onConfirm={commandId=>{dispatchWithReceipt({...command,commandId});setReview(false);}}/>}
 </article>;
}

import {useState} from 'react';
import type {GameCommand} from '../../domain/commands';
import {affairsPreview} from '../../engine/affairsPreview';
import {useGameStore} from '../../store/gameStore';
import {LocaleText} from '../../i18n/localeText';
import {ReviewDialog} from './ReviewDialog';
import {money} from '../formatMoney';

/** The displayed gate and the commit gate use the same engine preview. */
export function AffairsAction({command,title,summary}:{command:GameCommand;title:string;summary:string}) {
 const s=useGameStore(),[review,setReview]=useState(false),preview=affairsPreview(s,command);
 if(!preview)return null;
 const metrics=[['Cost',money(preview.cost,s.playerProfile.language)],['Treasury',money(s.countries[s.playerCountryId].economy.treasury,s.playerProfile.language)]];
 if(preview.shortfall)metrics.push(['Shortfall',money(preview.shortfall,s.playerProfile.language)]);
 if(preview.cooldown)metrics.push(['Days remaining',String(preview.cooldown)]);
 return <article className="affairs-action">
  <h3><LocaleText value={title}/></h3><p><LocaleText value={summary}/></p>
  <dl>{metrics.map(([label,value])=><div key={label}><dt><LocaleText value={label}/></dt><dd>{value}</dd></div>)}</dl>
  {preview.reasons.length>0&&<ul className="affairs-blockers">{preview.reasons.map(reason=><li key={reason}><LocaleText value={reason}/></li>)}</ul>}
  <button disabled={!preview.allowed} onClick={()=>setReview(true)}><LocaleText value={title}/></button>
  {review&&<ReviewDialog title={title} summary={summary} metrics={metrics} warnings={preview.reasons} allowed={preview.allowed} onCancel={()=>setReview(false)} onConfirm={commandId=>{s.dispatchWithReceipt({...command,commandId});setReview(false);}}/>}
 </article>;
}

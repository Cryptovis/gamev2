import type {ReactNode} from 'react';
import type {GameState} from '../../../domain/game';
import type {OrganizationCommand} from '../../../domain/organizations';
import {LocaleText,translateLive} from '../../../i18n/localeText';
import {previewOrganizationCommand} from '../../../engine/systems/organizations/previews';
export const statusLabel=(value:string)=>({nonMember:'Non-member',Observer:'Observer',Member:'Member',PermanentCouncil:'Permanent council',Chair:'Chair',active:'Active',suspended:'Suspended',withdrawalPending:'Withdrawal pending',draft:'Draft',debate:'Debate',voting:'Voting',adopted:'Adopted',rejected:'Rejected',implementing:'Implementing',expired:'Expired',revoked:'Revoked',failed:'Failed',paused:'Paused',closed:'Closed',defaulted:'Defaulted',cancelled:'Cancelled',pending:'Pending',paid:'Paid',applied:'Applied',yes:'Yes',no:'No',abstain:'Abstain',loan:'Loan',grant:'Grant',arms:'Arms embargo',trade:'Trade embargo',finance:'Financial restriction',food:'Food',medicine:'Medicine',humanitarian:'Humanitarian'}[value]??'Unknown');
export function Metrics({rows}:{rows:string[][]}){return <dl className="ia-metrics">{rows.map(([label,value],i)=><div key={label+i}><dt><LocaleText value={label}/></dt><dd><LocaleText value={value}/></dd></div>)}</dl>;}
export function Badge({value}:{value:string}){return <span className="ia-badge"><LocaleText value={statusLabel(value)}/></span>;}
export type ReviewAction=(command:OrganizationCommand,title?:string)=>void;
export function ReviewedAction({state,command,onReview,label='Review action'}:{state:GameState;command:OrganizationCommand;onReview:ReviewAction;label?:string}){
 const preview=previewOrganizationCommand(state,command);
 return <div className="ia-action"><button type="button" disabled={!preview.allowed} title={translateLive(preview.reasonText)} onClick={()=>onReview(command,label)}><LocaleText value={label}/></button>
  {!preview.allowed&&<small className="ia-blocked"><LocaleText value={preview.reasonText}/></small>}</div>;
}
export function Field({label,children}:{label:string;children:ReactNode}){return <label className="ia-field"><span><LocaleText value={label}/></span>{children}</label>;}
export function NumberField({label,value,onChange,min=0,max,step='any'}:{label:string;value:number;onChange:(n:number)=>void;min?:number;max?:number;step?:number|'any'}){
 return <Field label={label}><input aria-label={translateLive(label)} type="number" min={min} max={max} step={step} value={Number.isNaN(value)?'':value} onChange={e=>onChange(e.target.value===''?NaN:Number(e.target.value))}/></Field>;
}

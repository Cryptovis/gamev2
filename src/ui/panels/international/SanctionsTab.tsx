import {useState} from 'react';
import type {GameState} from '../../../domain/game';
import {sanctionEffects,effectActive} from '../../../engine/systems/organizations/effectSelectors';
import {ORGANIZATION_LABELS,bodyLabel} from '../../../engine/systems/organizations/previews';
import {LocaleText,translateLive} from '../../../i18n/localeText';
import {Badge,Metrics,Field,NumberField,ReviewedAction,type ReviewAction} from './shared';
export function SanctionsTab({state,onReview}:{state:GameState;onReview:ReviewAction}){
 const [recipient,setRecipient]=useState(Object.keys(state.countries).find(id=>id!==state.playerCountryId)??state.playerCountryId),[equipment,setEquipment]=useState<'armor'|'fighters'>('armor'),[quantity,setQuantity]=useState(1);
 const effects=sanctionEffects(state).filter(e=>effectActive(state,e));
 return <>
  {!effects.length&&<p className="ia-empty"><LocaleText value="No active multilateral sanctions."/></p>}
  {effects.map(e=><article className="ia-card" key={e.id}><h3><LocaleText value={state.countries[e.targetId].name}/></h3><p><LocaleText value={ORGANIZATION_LABELS[e.organizationId]}/> · <LocaleText value={bodyLabel(e.bodyId)}/></p>
   <Metrics rows={[["Starts on day",String(e.startsDay)],["Ends on day",String(e.endsDay)]]}/><div className="ia-tags">{e.measures.map((m,i)=><span key={m.scope+i}><Badge value={m.scope}/></span>)}</div>
   <h4><LocaleText value="Humanitarian Exemptions"/></h4><div className="ia-tags">{e.exemptions.length?e.exemptions.map((x,i)=><span key={x.scope+i}><Badge value={x.scope}/><LocaleText value={x.countryIds.length?x.countryIds.map(id=>state.countries[id].name).join(' · '):'All implementing partners'}/></span>):<LocaleText value="No exemptions"/>}</div>
  </article>)}
  <section className="ia-card"><h3><LocaleText value="Military Hardware Transfer"/></h3><p className="ia-section-note" data-testid="hardware-note"><LocaleText value="Manage sovereign military hardware aid, defense transfers and arms embargo compliance."/></p>   <div className="ia-form-grid"><Field label="Recipient"><select aria-label={translateLive('Recipient')} value={recipient} onChange={e=>setRecipient(e.target.value)}>{Object.values(state.countries).filter(c=>!c.annexedBy&&c.id!==state.playerCountryId).sort((a,b)=>a.name.localeCompare(b.name)).map(c=><option key={c.id} value={c.id}><LocaleText value={c.name}/></option>)}</select></Field>
    <Field label="Equipment"><select aria-label={translateLive('Equipment')} value={equipment} onChange={e=>setEquipment(e.target.value as 'armor'|'fighters')}><option value="armor"><LocaleText value="Armor"/></option><option value="fighters"><LocaleText value="Fighters"/></option></select></Field>
    <NumberField label="Quantity" min={1} step={1} value={quantity} onChange={setQuantity}/></div>
   <Metrics rows={[["Available reserve",String(state.production[state.playerCountryId]?.stockpile[equipment]??0)]]}/>
   <ReviewedAction state={state} command={{type:'organization/transferMilitaryHardware',recipientId:recipient,equipment,quantity}} onReview={onReview} label="Review hardware transfer"/>
  </section>
 </>;
}

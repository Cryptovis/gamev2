import {useState} from 'react';
import type {GameState} from '../../../domain/game';
import {ORGANIZATION_IDS,type OrganizationId} from '../../../domain/organizations';
import {ORGANIZATION_LABELS,bodyLabel} from '../../../engine/systems/organizations/previews';
import {LocaleText} from '../../../i18n/localeText';
import {Badge,Metrics} from './shared';
export function OverviewTab({state,onPropose}:{state:GameState;onPropose:(id:OrganizationId)=>void}){
 const [roster,setRoster]=useState<OrganizationId>('un'),[limit,setLimit]=useState(40),actor=state.playerCountryId,organization=state.world.organizations.byId[roster];
 const members=Object.values(organization.memberships).sort((a,b)=>a.countryId.localeCompare(b.countryId));
 return <><div className="ia-organization-grid">{ORGANIZATION_IDS.map(id=>{const o=state.world.organizations.byId[id],m=o.memberships[actor];return <article className="ia-card" key={id} data-organization={id}>
  <h3><LocaleText value={ORGANIZATION_LABELS[id]}/></h3><Badge value={m?.tier??'nonMember'}/>{m&&<Badge value={m.status}/>}
  <Metrics rows={[["Standing",(o.standingByCountry[actor]??0).toFixed(1)],["Roster size",String(Object.keys(o.memberships).length)],["Available funds ($B)",o.availableFundsB.toFixed(2)],["Committed funds ($B)",o.committedFundsB.toFixed(2)]]}/>
  {!!m?.offices.length&&<div className="ia-tags">{m.offices.map(office=><span key={office.bodyId}><Badge value={office.role}/><LocaleText value={bodyLabel(office.bodyId)}/> · <LocaleText value="Until day"/> {office.untilDay}</span>)}</div>}
  <div className="ia-buttons"><button type="button" aria-pressed={roster===id} onClick={()=>{setRoster(id);setLimit(40);}}><LocaleText value="Show roster"/></button><button type="button" onClick={()=>onPropose(id)}><LocaleText value="Create resolution"/></button></div>
 </article>;})}</div>
 <section className="ia-card"><h3><LocaleText value={ORGANIZATION_LABELS[roster]}/> · <LocaleText value="Member roster"/></h3>
  <div className="ia-roster">{members.slice(0,limit).map(m=><article key={m.countryId}><strong><LocaleText value={state.countries[m.countryId].name}/></strong><Badge value={m.tier}/><Badge value={m.status}/><span><LocaleText value="Standing"/> {(organization.standingByCountry[m.countryId]??0).toFixed(1)}</span>{m.offices.map(office=><span key={office.bodyId}><LocaleText value="Chair"/> · <LocaleText value={bodyLabel(office.bodyId)}/> · <LocaleText value="Until day"/> {office.untilDay}</span>)}</article>)}</div>
  {members.length>limit&&<button type="button" onClick={()=>setLimit(n=>n+40)}><LocaleText value="Show more"/></button>}
 </section></>;
}

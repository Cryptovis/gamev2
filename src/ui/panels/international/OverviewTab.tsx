import {useState} from 'react';
import type {GameState} from '../../../domain/game';
import {ORGANIZATION_IDS,type OrganizationId} from '../../../domain/organizations';
import {ORGANIZATION_LABELS,bodyLabel} from '../../../engine/systems/organizations/previews';
import {LocaleText} from '../../../i18n/localeText';
import {Badge,Metrics} from './shared';
import {flagEmoji} from '../../../data/countryThemes';
import {OrganizationEmblem} from '../../icons/OrganizationIcons';
export function OverviewTab({state,onPropose}:{state:GameState;onPropose:(id:OrganizationId)=>void}){
 const [roster,setRoster]=useState<OrganizationId>('un'),[limit,setLimit]=useState(40),actor=state.playerCountryId,organization=state.world.organizations.byId[roster];
 const members=Object.values(organization.memberships).sort((a,b)=>a.countryId.localeCompare(b.countryId));
 return <><div className="ia-organization-grid">{ORGANIZATION_IDS.map(id=>{const o=state.world.organizations.byId[id],m=o.memberships[actor];return <article className="ia-card" key={id} data-organization={id}>
  <div className="ia-org-title"><OrganizationEmblem id={id}/><h3><LocaleText value={ORGANIZATION_LABELS[id]}/></h3></div><Badge value={m?.tier??'nonMember'}/>{m&&<Badge value={m.status}/>}
  <Metrics rows={[["Standing",(o.standingByCountry[actor]??0).toFixed(1)],["Roster size",String(Object.keys(o.memberships).length)],["Available funds ($B)",o.availableFundsB.toFixed(2)],["Committed funds ($B)",o.committedFundsB.toFixed(2)]]}/>
  {!!m?.offices.length&&<div className="ia-tags">{m.offices.map(office=><span key={office.bodyId}><Badge value={office.role}/><LocaleText value={bodyLabel(office.bodyId)}/> · <LocaleText value="Until day"/> {office.untilDay}</span>)}</div>}
  <div className="ia-buttons"><button type="button" aria-pressed={roster===id} onClick={()=>{setRoster(id);setLimit(40);}}><LocaleText value="Show roster"/></button><button type="button" onClick={()=>onPropose(id)}><LocaleText value="Create resolution"/></button></div>
 </article>;})}</div>
 <section className="ia-card"><h3><LocaleText value={ORGANIZATION_LABELS[roster]}/> · <LocaleText value="Member Roster"/></h3>
  <div className="ranking-table-wrap ia-roster-wrap"><table className="ranking-table ia-roster-table"><thead><tr><th>#</th><th><LocaleText value="Country"/></th><th><LocaleText value="Tier"/></th><th><LocaleText value="Status"/></th><th><LocaleText value="Standing"/></th><th><LocaleText value="Active offices"/></th></tr></thead>
  <tbody>{members.slice(0,limit).map((m,i)=><tr key={m.countryId} className={m.countryId===actor?'player-row':''}><td>{i+1}</td><td><span aria-hidden="true">{flagEmoji(state.countries[m.countryId].iso2)}</span> <LocaleText value={state.countries[m.countryId].name}/></td><td><Badge value={m.tier}/></td><td><Badge value={m.status}/></td><td>{(organization.standingByCountry[m.countryId]??0).toFixed(1)}</td><td>{m.offices.length?m.offices.map(office=><span className="ia-office" key={office.bodyId}><LocaleText value={office.role}/> · <LocaleText value={bodyLabel(office.bodyId)}/> · <LocaleText value="Until day"/> {office.untilDay}</span>):'—'}</td></tr>)}</tbody></table></div>
  {members.length>limit&&<button type="button" onClick={()=>setLimit(n=>n+40)}><LocaleText value="Show more"/></button>}
 </section></>;
}

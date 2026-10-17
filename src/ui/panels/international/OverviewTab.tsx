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
  <div className="ia-org-title"><OrganizationEmblem id={id}/><h3><LocaleText value={ORGANIZATION_LABELS[id]}/></h3></div><div className="ia-org-badges" data-testid="org-badges"><Badge value={m?.tier??'nonMember'} tone={m?'good':'warn'}/>{m&&<Badge value={m.status} tone={m.status==='active'?'good':undefined}/>}</div>
  <Metrics rows={[["Standing",(o.standingByCountry[actor]??0).toFixed(1)],["Roster size",String(Object.keys(o.memberships).length)],["Available funds ($B)",o.availableFundsB.toFixed(2)],["Committed funds ($B)",o.committedFundsB.toFixed(2)]]}/>
  {!!m?.offices.length&&<div className="ia-tags">{m.offices.map(office=><span key={office.bodyId}><Badge value={office.role}/><LocaleText value={bodyLabel(office.bodyId)}/> · <LocaleText value="Until day"/> {office.untilDay}</span>)}</div>}
  <div className="ia-buttons">
   <button type="button" className="ia-btn-roster" aria-pressed={roster===id} onClick={()=>{setRoster(id);setLimit(40);setTimeout(()=>document.getElementById('ia-roster-section')?.scrollIntoView({behavior:'smooth',block:'start'}),30);}}><svg className="ia-btn-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span><LocaleText value="Members"/></span></button>
   <button type="button" className="ia-btn-proposal" onClick={()=>onPropose(id)}><svg className="ia-btn-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg><span><LocaleText value="Proposal"/></span></button>
  </div>
 </article>;})}</div>
 <section id="ia-roster-section" className="ia-card"><h3><LocaleText value={ORGANIZATION_LABELS[roster]}/> · <LocaleText value="Member Roster"/></h3>
  <div className="ranking-table-wrap ia-roster-wrap"><table className="ranking-table ia-roster-table"><thead><tr><th>#</th><th><LocaleText value="Country"/></th><th><LocaleText value="Tier"/></th><th><LocaleText value="Status"/></th><th><LocaleText value="Standing"/></th><th><LocaleText value="Active offices"/></th></tr></thead>
  <tbody>{members.slice(0,limit).map((m,i)=><tr key={m.countryId} className={m.countryId===actor?'player-row':''}><td>{i+1}</td><td><span aria-hidden="true">{flagEmoji(state.countries[m.countryId].iso2)}</span> <LocaleText value={state.countries[m.countryId].name}/></td><td><Badge value={m.tier}/></td><td><Badge value={m.status}/></td><td>{(organization.standingByCountry[m.countryId]??0).toFixed(1)}</td><td>{m.offices.length?m.offices.map(office=><span className="ia-office" key={office.bodyId}><LocaleText value={office.role}/> · <LocaleText value={bodyLabel(office.bodyId)}/> · <LocaleText value="Until day"/> {office.untilDay}</span>):'—'}</td></tr>)}</tbody></table></div>
  {members.length>limit&&<button type="button" onClick={()=>setLimit(n=>n+40)}><LocaleText value="Show more"/></button>}
 </section></>;
}

import {useGameStore} from '../../store/gameStore';
import {useState} from 'react';
import {activeCountries} from '../../domain/sovereignty';
import {useWorldView} from '../../store/useWorldView';
import {governance,occupationFor,politicalChance,CANDIDATES} from '../../engine/systems/governance';
import {LocaleText,translateLive} from '../../i18n/localeText';
import {CommandWindow} from './CommandWindow';
import {CommandArt} from '../icons/CommandArt';
import {SectionMenu} from '../windows/SectionMenu';
import {IntegrationPanel} from './IntegrationPanel';
import {AffairsAction} from './AffairsAction';
import {ReviewDialog} from './ReviewDialog';

export function GovernanceWindow() {
 const s=useWorldView(),g=governance(s),p=s.countries[s.playerCountryId];
 const [selected,setSelected]=useState(()=>useGameStore.getState().navigation?.countryId??p.id),[section,setSection]=useState('overview'),[recipient,setRecipient]=useState(''),[offer,setOffer]=useState(false);
 const c=s.countries[selected]??p,o=occupationFor(s,c.id),mine=o?.controllerId===p.id,history=g.occupations[c.id]?.election;
 const items=[{id:'overview',label:'Overview',icon:<CommandArt kind="governance"/>},...(mine?[{id:'administration',label:'Administration',icon:<CommandArt kind="cabinet"/>},{id:'integration',label:'Territory integration',icon:<CommandArt kind="world"/>}]:c.id!==p.id?[{id:'influence',label:'Foreign political influence',icon:<CommandArt kind="diplomacy"/>}]:[]),{id:'history',label:'History',icon:<CommandArt kind="intel"/>}];
 const current=items.some(x=>x.id===section)?section:'overview';
 return <CommandWindow wide title="Territories & Political Affairs" kicker="CIVIL ADMINISTRATION" onClose={s.closeWorkspace}>
  <div className="affairs-shell">
   <div className="governance-navigation"><select aria-label={translateLive('Governance country')} value={c.id} onChange={e=>{setSelected(e.target.value);setRecipient('');setSection('overview');}}>{activeCountries(s.countries).sort((a,b)=>a.name.localeCompare(b.name)).map(x=><option key={x.id} value={x.id}><LocaleText value={x.name}/></option>)}</select></div>
   <header className="affairs-hero"><CommandArt kind="governance" size={80}/><div><small><LocaleText value={c.controllerCountryId?'Controlled territory':c.id===p.id?'Your country':'Independent country'}/></small><h2><LocaleText value={c.name}/></h2><p><LocaleText value={mine?'Manage local needs, prepare integration or restore independence.':'Review the conditions before you fund a foreign campaign.'}/></p></div></header>
   <SectionMenu label="Affairs sections" items={items} selected={current} onSelect={setSection} contentId="affairs-content"/>
   <div id="affairs-content" className="affairs-content" role="region" aria-label={translateLive(items.find(x=>x.id===current)!.label)} key={c.id+current}>
    {current==='overview'&&<>
     <div className="occupation-summary"><span><LocaleText value="Approval"/><strong>{c.politics.approval.toFixed(1)}%</strong></span><span><LocaleText value="Stability"/><strong>{c.politics.stability.toFixed(1)}%</strong></span><span><LocaleText value={mine?'Unrest':'Estimated chance'}/><strong>{mine?o.unrest.toFixed(1):(politicalChance(s,c.id)*100).toFixed(0)}%</strong></span></div>
     {g.foreignLeaders[c.id]&&<p><LocaleText value="Current government"/>: <LocaleText value={g.foreignLeaders[c.id]}/></p>}
     <p className="affairs-guidance"><LocaleText value={mine?'Shortages and weak stability raise unrest. At 80% unrest, output falls by 30%; at 95%, daily rebellion can restore independence. Military suppression reduces unrest temporarily but harms cohesion and reputation.':c.id===p.id?'Choose another country to review its political affairs.':'Integration is only available for territories you control. Foreign influence has separate conditions; money alone is not enough.'}/></p>
     {mine&&<button onClick={()=>setSection('administration')}><LocaleText value="Administration"/></button>}
    </>}
    {current==='administration'&&mine&&o&&<>
     <div className="affairs-actions-grid">
      <AffairsAction command={{type:'occupation/manage',id:c.id,action:'relief'}} title="Send relief" summary="Transfer 20 food and 5 oil; reduce unrest by 12 and improve stability by 3. Seven-day policy cooldown."/>
      <AffairsAction command={{type:'occupation/manage',id:c.id,action:'suppress'}} title="Military suppression" summary="Reduce unrest by 20. Lose 5 readiness, 5 reputation and 5 local cohesion. Long-term resentment rises."/>
      <AffairsAction command={{type:'occupation/manage',id:c.id,action:'election'}} title="Grant freedom / elections" summary="Start a 21-day election. Control returns to an independent government when voting ends. Supporting a candidate improves their chance but cannot guarantee victory."/>
     </div>
     <h3><LocaleText value="Transfer territorial control"/></h3><select aria-label={translateLive('Transfer recipient')} value={recipient} onChange={e=>setRecipient(e.target.value)}><option value=""><LocaleText value="Choose recipient"/></option>{activeCountries(s.countries).filter(x=>x.id!==p.id&&x.id!==c.id&&!x.controllerCountryId).map(x=><option value={x.id} key={x.id}><LocaleText value={x.name}/></option>)}</select>
     <AffairsAction command={{type:'occupation/manage',id:c.id,action:'transfer',value:recipient}} title="Review transfer" summary="This transfers administration to the selected country and raises unrest by 10. The territory no longer belongs to your administration."/>
     {o.election&&!o.election.resolved&&<><h3><LocaleText value="Transition election"/> · {Math.max(0,o.election.endsDay-s.day)} <LocaleText value="days remaining"/></h3><div className="affairs-actions-grid">{CANDIDATES.map(candidate=><AffairsAction key={candidate.id} command={{type:'occupation/manage',id:c.id,action:'support',value:candidate.id}} title={candidate.name} summary={candidate.offer}/>)}</div></>}
    </>}
    {current==='integration'&&mine&&<IntegrationPanel countryId={c.id} embedded/>}
    {current==='influence'&&<>
     <p><LocaleText value="Average readiness and logistics must be below 50%, or ideological pressure must reach 30%."/></p>
     <div className="affairs-thresholds">{[['Approval',c.politics.approval,'< 40%'],['Stability',c.politics.stability,'< 50%'],['Military readiness / logistics',(c.military.readiness+c.military.logistics)/2,'< 50%'],['Ideological pressure',c.society.influencePressure.ideology,'≥ 30%']].map(([label,value,target])=><div key={String(label)}><span><LocaleText value={String(label)}/></span><strong>{Number(value).toFixed(1)}%</strong><small><LocaleText value="Required"/> {target}</small></div>)}</div>
     <AffairsAction command={{type:'politics/campaign',id:c.id}} title="Review political campaign" summary="Support a fictional civil opposition coalition. Failure worsens relations. Conditions are checked again on completion; military strength and public opinion can recover."/>
     <AffairsAction command={{type:'world/outreach',id:c.id,religion:p.society.dominantReligion}} title="Voluntary religious outreach" summary="Fund a gradual, uncertain outreach mission. Results may be small or unsuccessful."/>
    </>}
    {current==='history'&&<>
     {!g.campaigns.some(x=>x.targetId===c.id)&&!history&&<p><LocaleText value="No political actions recorded for this country."/></p>}
     {g.campaigns.filter(x=>x.targetId===c.id).map(x=><article className="affairs-action" key={x.id}><h3><LocaleText value={x.status}/></h3><p><LocaleText value="Estimated chance"/> {(x.chance*100).toFixed(0)}% · {Math.max(0,x.endsDay-s.day)} <LocaleText value="days remaining"/></p></article>)}
     {history&&!history.resolved&&<p><LocaleText value="Transition election"/> · {Math.max(0,history.endsDay-s.day)} <LocaleText value="days remaining"/></p>}
     {history?.resolved&&g.occupations[c.id].controllerId===p.id&&<article className="affairs-action"><h3><LocaleText value="Independent government elected"/></h3><p><LocaleText value={CANDIDATES.find(x=>x.id===history.winner)?.name??''}/></p><p><LocaleText value={CANDIDATES.find(x=>x.id===history.winner)?.offer??''}/></p><button disabled={history.offerAccepted||!!c.controllerCountryId||Object.values(s.wars).some(w=>w.status==='active'&&[w.attackerId,w.defenderId].includes(c.id))} onClick={()=>setOffer(true)}><LocaleText value={history.offerAccepted?'Offer accepted':'Review treaty offer'}/></button></article>}
    </>}
   </div>
  </div>
  {offer&&<ReviewDialog title="Accept government offer" summary="Accept the elected government’s treaty. The country remains independent." onCancel={()=>setOffer(false)} onConfirm={commandId=>{s.acceptElectionOffer(c.id,commandId);setOffer(false);}}/>}
 </CommandWindow>;
}

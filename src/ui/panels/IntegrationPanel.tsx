import {useState} from 'react';
import {createPortal} from 'react-dom';
import {useGameStore} from '../../store/gameStore';
import {useShallow} from 'zustand/react/shallow';
import {integrationRequirements} from '../../engine/systems/integration';
import {expansion} from '../../engine/systems/sovereignCredit';
import {LocaleText} from '../../i18n/localeText';
import {ManagedDialog} from '../windows/ManagedDialog';
import {WINDOW_LAYERS} from '../windows/useWindowLifecycle';
import {AffairsAction} from './AffairsAction';
export function IntegrationPanel({countryId,embedded=false}:{countryId:string;embedded?:boolean}) {
 // Select the displayed figures only; requirements are compared by value.
 const view=useGameStore(useShallow(s=>{const p=expansion(s).integrations[countryId];return {name:s.countries[countryId].name,req:JSON.stringify(integrationRequirements(s,countryId).map(r=>[r.label,r.value,r.min])),status:p?.status,remaining:p?Math.max(0,p.endsDay-s.day):0,religion:s.countries[s.playerCountryId].society.dominantReligion};}));
 const [open,setOpen]=useState(false),c={name:view.name},req=(JSON.parse(view.req) as [string,number,number][]).map(([label,value,min])=>({label,value,min})),project=view.status?{status:view.status}:null;
 const content=<>
  <p><LocaleText value="Meet every condition, pay the investment, then maintain wellbeing of at least 80% for 90 days. Failure loses the upfront investment. Completion merges population, forces, assets and liabilities."/></p>
  {project&&<p><LocaleText value={project.status}/> · {view.remaining} <LocaleText value="days remaining"/></p>}
  <div className="integration-requirements">{req.map(r=><div key={r.label} className={r.value>=r.min?'requirement-met':'requirement-missing'}><span><LocaleText value={r.label}/></span><strong>{r.value.toFixed(1)} / {r.min}%</strong><progress max={100} value={r.value}/></div>)}</div>
  <div className="affairs-actions-grid">
   {(['language','ideology','services'] as const).map(kind=><AffairsAction key={kind} command={{type:'integration/prepare',id:countryId,kind}} title={kind==='language'?'Language education':kind==='ideology'?'Civic education':'Public services & tax relief'} summary={kind==='services'?"Improve public services, ease local taxes and build public support. Food and inflation still affect wellbeing.":"Fund education and civic outreach. Weekly cooldown applies; preparation does not instantly complete integration."}/>)}
   <AffairsAction command={{type:'world/outreach',id:countryId,religion:view.religion}} title="Voluntary religious outreach" summary="Fund a gradual, uncertain outreach mission. Results may be small or unsuccessful."/>
   <AffairsAction command={{type:'integration/begin',id:countryId}} title="Review integration" summary="Completion absorbs the territory and its liabilities. Keep wellbeing above the failure threshold and maintain control."/>
  </div>
 </>;
 if(embedded)return <section className="integration-card">{content}</section>;
 return <section className="integration-card"><button onClick={()=>setOpen(true)}><LocaleText value="Assimilate / Integrate territory"/></button>{open&&createPortal(<div className="integration-overlay"><ManagedDialog className="integration-dialog" label="Territory integration" onClose={()=>setOpen(false)} layer={WINDOW_LAYERS.modal}><header><h2><LocaleText value="Territory integration"/> · <LocaleText value={c.name}/></h2><button onClick={()=>setOpen(false)} aria-label="Close integration">×</button></header>{content}</ManagedDialog></div>,document.body)}</section>;
}

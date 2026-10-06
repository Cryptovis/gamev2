import { flagEmoji } from '../../data/countryThemes';
import { tr } from '../../i18n/gameI18n';
import { useGameStore } from '../../store/gameStore';
import { ResourceIcon } from '../icons/GameIcons';

export function AdvisorModal(){
 const prompt=useGameStore(s=>s.activeAdvisor);
 const resolve=useGameStore(s=>s.resolveAdvisor);
 const language=useGameStore(s=>s.playerProfile.language);
 const countries=useGameStore(s=>s.countries);
 const playerId=useGameStore(s=>s.playerCountryId);
 if(!prompt)return null;
 const supplier=countries[prompt.supplierId];
 return <div className="advisor-backdrop"><section className="advisor-modal">
  <header><div className="advisor-seal"><ResourceIcon resource={prompt.resource} size={30}/></div><div><small>{tr(language,'advisor')}</small><h2>{prompt.resource.toUpperCase()} SECURITY</h2><p>{prompt.message}</p></div><b>{flagEmoji(supplier.iso2)}</b></header>
  <div className="advisor-supplier"><span><small>RECOMMENDED SUPPLIER</small><strong>{supplier.name}</strong></span><span><small>RELATION</small><strong>{countries[playerId].diplomacy.relations[supplier.id]?.score??0}</strong></span><span><small>CAPABILITY</small><strong>{supplier.military.assessment.capability.toFixed(0)}</strong></span></div>
  {prompt.stage==='pact'?<div className="advisor-actions"><button onClick={()=>resolve('dismiss')}>{tr(language,'dismiss')}</button><button className="primary" onClick={()=>resolve('pact')}>{tr(language,'trade_pact')}</button></div>:<><div className="advisor-contract-title"><strong>{tr(language,'contract')}</strong><span>{tr(language,'choose_duration')}</span></div><div className="contract-years">{([1,3,5,10] as const).map(y=><button key={y} onClick={()=>resolve(y)}><strong>{y}</strong><span>YEAR{y>1?'S':''}</span><small>monthly delivery</small></button>)}</div><button className="advisor-dismiss" onClick={()=>resolve('dismiss')}>{tr(language,'dismiss')}</button></>}
 </section></div>;
}

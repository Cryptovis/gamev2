import {LocaleText,translateLive} from '../../i18n/localeText';
import { useGameStore } from '../../store/gameStore';
import { BlocIcon, IntelligenceIcon } from '../icons/GameIcons';

export function WorldPulse(){
 const wars=useGameStore(s=>Object.values(s.wars).filter(w=>w.status==='active').length);
 const trades=useGameStore(s=>Object.values(s.tradeDeals).filter(d=>d.active).length);
 const intel=useGameStore(s=>Object.values(s.intelOperations).filter(o=>o.status==='active').length);
 const blocs=useGameStore(s=>Object.values(s.blocs).length);
 const sanctions=useGameStore(s=>Object.values(s.countries).filter(c=>c.globalSanctions).length);
 return <div className="world-pulse" aria-label={translateLive("Living world activity")}>
  <span className="world-pulse-title"><LocaleText value={"WORLD PULSE"}/></span>
  <span className={wars?'alert':''}><b><LocaleText value={wars}/></b><small><LocaleText value={"WARS"}/></small></span>
  <span><b><LocaleText value={trades}/></b><small><LocaleText value={"TRADE FLOWS"}/></small></span>
  <span><IntelligenceIcon size={12}/><b><LocaleText value={intel}/></b><small><LocaleText value={"OPS"}/></small></span>
  <span><BlocIcon size={12}/><b><LocaleText value={blocs}/></b><small><LocaleText value={"BLOCS"}/></small></span>
  <span className={sanctions?'warning':''}><b><LocaleText value={sanctions}/></b><small><LocaleText value={"SANCTIONED"}/></small></span>
 </div>;
}

import { useGameStore } from '../../store/gameStore';
import { BlocIcon, IntelligenceIcon } from '../icons/GameIcons';

export function WorldPulse(){
 const wars=useGameStore(s=>Object.values(s.wars).filter(w=>w.status==='active').length);
 const trades=useGameStore(s=>Object.values(s.tradeDeals).filter(d=>d.active).length);
 const intel=useGameStore(s=>Object.values(s.intelOperations).filter(o=>o.status==='active').length);
 const blocs=useGameStore(s=>Object.values(s.blocs).length);
 const sanctions=useGameStore(s=>Object.values(s.countries).filter(c=>c.globalSanctions).length);
 return <div className="world-pulse" aria-label="Living world activity">
  <span className="world-pulse-title">WORLD PULSE</span>
  <span className={wars?'alert':''}><b>{wars}</b><small>WARS</small></span>
  <span><b>{trades}</b><small>TRADE FLOWS</small></span>
  <span><IntelligenceIcon size={12}/><b>{intel}</b><small>OPS</small></span>
  <span><BlocIcon size={12}/><b>{blocs}</b><small>BLOCS</small></span>
  <span className={sanctions?'warning':''}><b>{sanctions}</b><small>SANCTIONED</small></span>
 </div>;
}

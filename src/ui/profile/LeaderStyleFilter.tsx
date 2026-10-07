import {LEADER_STYLES,type LeaderStyle} from '../../data/avatarPresets';
export function LeaderStyleFilter({value,onChange,turkish=false}:{value:LeaderStyle|'all';onChange:(value:LeaderStyle|'all')=>void;turkish?:boolean}){
 return <div className="leader-style-filter" aria-label="Leader clothing style">
  <button aria-pressed={value==='all'} className={value==='all'?'active':''} onClick={()=>onChange('all')}>{turkish?'Tümü':'All styles'}</button>
  {LEADER_STYLES.map(s=><button key={s.id} aria-pressed={value===s.id} title={s.description} className={value===s.id?'active':''} onClick={()=>onChange(s.id)}>{turkish?s.turkish:s.label}</button>)}
 </div>;
}

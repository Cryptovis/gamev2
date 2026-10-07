import {LocaleText,translateLive} from '../../i18n/localeText';
import {LEADER_STYLES,type LeaderStyle} from '../../data/avatarPresets';
export function LeaderStyleFilter({value,onChange,turkish=false}:{value:LeaderStyle|'all';onChange:(value:LeaderStyle|'all')=>void;turkish?:boolean}){
 return <div className="leader-style-filter" aria-label={translateLive("Leader clothing style")}>
  <button aria-pressed={value==='all'} className={value==='all'?'active':''} onClick={()=>onChange('all')}><LocaleText value={turkish?'Tümü':'All styles'}/></button>
  {LEADER_STYLES.map(s=><button key={s.id} aria-pressed={value===s.id} title={translateLive(s.description)} className={value===s.id?'active':''} onClick={()=>onChange(s.id)}><LocaleText value={turkish?s.turkish:s.label}/></button>)}
 </div>;
}

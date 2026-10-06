import { AVATAR_PRESETS } from '../../data/avatarPresets';
import { tr } from '../../i18n/gameI18n';
import { useGameStore } from '../../store/gameStore';
import { AvatarPortrait } from '../profile/AvatarPortrait';
export function AvatarPicker({onClose}:{onClose:()=>void}){
 const current=useGameStore(s=>s.playerProfile.avatarId);
 const language=useGameStore(s=>s.playerProfile.language);
 const setAvatar=useGameStore(s=>s.setPlayerAvatar);
 return <div className="avatar-picker-backdrop" onMouseDown={onClose}><section className="avatar-picker" onMouseDown={e=>e.stopPropagation()}><header><div><small>{tr(language,'profile')}</small><h2>{tr(language,'choose_avatar')}</h2></div><button onClick={onClose}>×</button></header><div className="avatar-picker-grid">{AVATAR_PRESETS.map(a=><button key={a.id} className={current===a.id?'active':''} onClick={()=>{setAvatar(a.id);onClose();}}><AvatarPortrait id={a.id} size={72}/><span>{a.label}</span></button>)}</div></section></div>;
}

import {useEffect,useSyncExternalStore} from 'react';
import {imageRequest} from '../icons/reliableImage';
import {LocaleText,translateLive} from '../../i18n/localeText';
import {avatarPreset} from '../../data/avatarPresets';
export function AvatarPortrait({id,size=58}:{id:string;size?:number}){
 const a=avatarPreset(id),request=imageRequest(`/assets/leaders/${a.category}-atlas.webp`),snapshot=useSyncExternalStore(listener=>{request.listeners.add(listener);return()=>{request.listeners.delete(listener);};},()=>request.snapshot);
 useEffect(()=>request.start(),[request]);
 return <div className="avatar-portrait portrait-generated" role="img" aria-label={translateLive(a.label)} data-style={a.category} style={{width:size,height:Math.round(size*1.16),backgroundImage:snapshot.status==='ready'?`url("${snapshot.url}")`:undefined,backgroundPosition:`${a.tile*25}% 26%`}}>{snapshot.status!=='ready'&&<span aria-hidden="true" className="portrait-placeholder">♟</span>}</div>;
}

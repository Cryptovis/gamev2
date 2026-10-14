import {create} from 'zustand';

export const APPEARANCE_KEY='trp-appearance-v1';
export type AppearancePreference='dark'|'light'|'system';
export const parseAppearance=(value:string|null):AppearancePreference|null=>value==='dark'||value==='light'||value==='system'?value:null;
export const effectiveAppearance=(preference:AppearancePreference,osDark:boolean)=>preference==='system'?(osDark?'dark':'light'):preference;
const read=()=>{try{return parseAppearance(localStorage.getItem(APPEARANCE_KEY));}catch{return null;}};
const media=()=>typeof matchMedia==='function'?matchMedia('(prefers-color-scheme: dark)'):null;
export function applyAppearance(preference:AppearancePreference,osDark=media()?.matches??true){
 if(typeof document==='undefined')return;
 document.documentElement.dataset.theme=effectiveAppearance(preference,osDark);
 document.documentElement.dataset.appearance=preference;
 document.documentElement.style.colorScheme=effectiveAppearance(preference,osDark);
}
export const useAppearance=create<{preference:AppearancePreference;setPreference:(value:AppearancePreference,persist?:boolean)=>void}>(set=>({
 preference:read()??'light',
 setPreference:(value,persist=true)=>{if(persist){try{localStorage.setItem(APPEARANCE_KEY,value);}catch{/* preference remains usable without storage */}}set({preference:value});applyAppearance(value);},
}));

export function hasLegacyPreferences(local:Pick<Storage,'getItem'>,session:Pick<Storage,'getItem'>){
 return ['alpyx-map-zoom','trp-audio-v1','trp-map-desk-v1','trp-demo-accounts-v1','trp-last-leadership-quote'].some(key=>local.getItem(key)!==null)||session.getItem('trp-demo-session-v1')!==null;
}
async function existingInstallation(){
 try{if(hasLegacyPreferences(localStorage,sessionStorage))return true;}catch{/* check database metadata instead */}
 if(typeof indexedDB==='undefined')return false;
 try{
  if(indexedDB.databases)return (await indexedDB.databases()).some(db=>db.name==='alpyx-global-command');
  return await new Promise<boolean>(resolve=>{
   const request=indexedDB.open('alpyx-global-command');
   request.onupgradeneeded=()=>{request.transaction?.abort();resolve(false);};
   request.onsuccess=()=>{request.result.close();resolve(true);};request.onerror=()=>resolve(false);
  });
 }catch{return false;}
}
let listening=false;
/** Runs before React mounts, including entry/setup and portal content. No campaign save is opened or changed. */
export async function initializeAppearance(){
 const saved=read();
 const preference=saved??(await existingInstallation()?'dark':'light');
 useAppearance.getState().setPreference(preference);
 if(!listening){
  listening=true;
  media()?.addEventListener('change',event=>{const value=useAppearance.getState().preference;if(value==='system')applyAppearance(value,event.matches);});
  if(typeof window!=='undefined')window.addEventListener('storage',event=>{if(event.key===APPEARANCE_KEY){const value=parseAppearance(event.newValue)??'system';useAppearance.getState().setPreference(value,false);}});
 }
}

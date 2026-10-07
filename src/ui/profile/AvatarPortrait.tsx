import {useId} from 'react';
import { avatarPreset } from '../../data/avatarPresets';
export function AvatarPortrait({id,size=58}:{id:string;size?:number}){
 const a=avatarPreset(id),uid=useId().replaceAll(':',''),longHair=a.style===3||a.style===4;
 const hairPath=[
 'M24 38Q20 12 45 10Q70 9 70 36L64 28Q52 27 43 19Q36 30 26 32Z',
 'M23 37Q19 16 42 10Q68 6 72 32L63 27Q44 22 26 31Z',
 'M24 31Q26 9 47 10Q69 11 70 31L65 23Q48 16 28 27Z',
 'M20 54Q14 15 38 9Q69 1 75 27L77 63L66 67L65 28Q48 31 40 17Q32 31 29 55Z',
 'M22 55Q15 17 37 10Q62 1 73 24L75 63L65 66L64 26Q40 21 28 35L30 63Z'
 ][a.style];
 return <svg width={size} height={size} viewBox="0 0 96 112" className="avatar-portrait portrait-modern" role="img" aria-label={a.label}>
  <defs><linearGradient id={'bg'+uid} x2="1" y2="1"><stop stopColor={a.jacket}/><stop offset="1" stopColor="#08141e"/></linearGradient><linearGradient id={'face'+uid} x2="1" y2=".4"><stop stopColor={a.skin}/><stop offset=".65" stopColor={a.skin}/><stop offset="1" stopColor="#976a59"/></linearGradient><linearGradient id={'suit'+uid} x2="1" y2="1"><stop stopColor={a.jacket}/><stop offset="1" stopColor="#111a26"/></linearGradient><radialGradient id={'light'+uid}><stop stopColor="#9fc9e2" stopOpacity=".24"/><stop offset="1" stopColor="#9fc9e2" stopOpacity="0"/></radialGradient></defs>
  <rect width="96" height="112" rx="15" fill={'url(#bg'+uid+')'}/><circle cx="42" cy="24" r="60" fill={'url(#light'+uid+')'}/><path d="M7 108V75M14 108V79M85 108V71M90 108V65" stroke="#aacbde" strokeOpacity=".07"/>
  {longHair&&<path d="M23 33Q15 52 21 74L33 84H68L76 70Q79 34 67 20Z" fill={a.hair}/>}
  <path d="M7 112L13 87Q23 74 37 74H59Q75 74 85 88L91 112Z" fill={'url(#suit'+uid+')'}/>
  <path d="M39 60H57V78L48 87L38 77Z" fill={'url(#face'+uid+')'}/><path d="M38 68Q49 78 59 67L56 75L48 80L39 76Z" fill="#69493f" opacity=".2"/>
  <path d="M36 76L48 87L60 76L58 112H38Z" fill={a.shirt}/><path d="M35 75L45 84L39 93L29 78ZM61 75L51 84L57 93L69 79Z" fill="#e6edf1" opacity=".85"/>
  <path d="M47 85L51 85L54 92L51 112H44L46 92Z" fill={a.style===3?'#ac8870':'#48677d'}/>
  <path d="M29 76L40 110L18 94L26 89L20 82ZM68 76L55 110L78 94L70 89L77 83Z" fill="#d2e3ee" opacity=".10"/>
  <ellipse cx="27" cy="43" rx="4" ry="7" fill={a.skin}/><ellipse cx="68" cy="43" rx="4" ry="7" fill={a.skin}/>
  <path d="M27 32Q27 13 47 13Q68 15 68 34L65 56Q60 70 49 73Q34 70 29 56Z" fill={'url(#face'+uid+')'}/>
  <path d={hairPath} fill={a.hair}/><path d="M31 35Q37 31 42 35M53 35Q59 31 64 35" stroke={a.hair} strokeWidth="2.1" strokeLinecap="round" fill="none"/>
  <path d="M32 40Q37 36 42 40M53 40Q58 36 63 40" stroke="#48322d" strokeWidth="1.1" fill="none"/><ellipse cx="37" cy="40" rx="2" ry="1.5" fill="#253941"/><ellipse cx="58" cy="40" rx="2" ry="1.5" fill="#253941"/><circle cx="37.5" cy="39.5" r=".55" fill="#edf5f6"/><circle cx="58.5" cy="39.5" r=".55" fill="#edf5f6"/>
  <path d="M47 39L44 51Q48 54 52 51" stroke="#966750" strokeOpacity=".6" strokeWidth="1" fill="none"/><path d="M39 59Q48 63 57 58" stroke="#985b50" strokeWidth="1.5" strokeLinecap="round" fill="none"/><path d="M41 61Q49 64 55 60" stroke="#f1d4c0" strokeOpacity=".6" fill="none"/>
  <path d="M31 47Q36 51 40 49M57 49Q62 51 65 46" stroke="#b17a67" strokeOpacity=".2" strokeWidth="3" fill="none"/>
  {a.glasses&&<g fill="#b2c7d2" fillOpacity=".12" stroke="#293845" strokeWidth="1.3"><rect x="29" y="36" width="16" height="11" rx="4"/><rect x="51" y="36" width="16" height="11" rx="4"/><path d="M45 40H51"/></g>}
  <rect x=".5" y=".5" width="95" height="111" rx="15" stroke="#b9d5e5" strokeOpacity=".2" fill="none"/>
 </svg>;
}

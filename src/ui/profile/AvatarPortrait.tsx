import { avatarPreset } from '../../data/avatarPresets';
export function AvatarPortrait({id,size=58}:{id:string;size?:number}){
 const a=avatarPreset(id);
 const hairPath=[
  'M18 27c2-13 12-18 22-18s20 5 22 18c-9-7-33-8-44 0Z',
  'M16 29c0-14 9-21 24-21 12 0 21 6 24 17-8-5-14-4-19-10-7 9-18 11-29 14Z',
  'M17 27c4-15 17-20 29-17 9 2 15 8 17 17-8-5-15-7-23-7s-15 2-23 7Z',
  'M18 30c-1-12 8-22 22-22 15 0 23 10 22 22-6-8-13-11-22-11-8 0-16 3-22 11Z',
  'M16 29c2-14 11-21 24-21 14 0 23 8 24 22-7-8-15-10-24-10s-17 3-24 9Z'
 ][a.style];
 return <svg width={size} height={size} viewBox="0 0 80 80" className="avatar-portrait" aria-label={a.label}>
  <defs><linearGradient id={`bg-${a.id}`} x1="0" x2="1"><stop stopColor={a.jacket}/><stop offset="1" stopColor="#0d1b25"/></linearGradient></defs>
  <rect width="80" height="80" rx="18" fill={`url(#bg-${a.id})`}/>
  <path d="M15 80c2-17 11-26 25-26s23 9 25 26H15Z" fill={a.jacket}/>
  <path d="M31 55h18l5 25H26l5-25Z" fill={a.shirt}/>
  <ellipse cx="40" cy="35" rx="18" ry="22" fill={a.skin}/>
  <path d={hairPath} fill={a.hair}/>
  <circle cx="34" cy="36" r="1.6" fill="#1a1716"/><circle cx="46" cy="36" r="1.6" fill="#1a1716"/>
  <path d="M36 46c3 2 5 2 8 0" fill="none" stroke="#7c4a42" strokeWidth="1.3" strokeLinecap="round"/>
  {a.glasses&&<g fill="none" stroke="#26343d" strokeWidth="1.4"><rect x="27" y="31" width="11" height="9" rx="3"/><rect x="42" y="31" width="11" height="9" rx="3"/><path d="M38 35h4"/></g>}
 </svg>;
}

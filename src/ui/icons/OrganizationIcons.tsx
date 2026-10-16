import type {ReactNode} from 'react';
import type {OrganizationId} from '../../domain/organizations';

/**
 * Original, simplified emblems for the 14 simulated organizations. They are symbolic drawings made for this
 * game, not copies of any registered logo, so they carry no trademark or copyright claims. All strokes use
 * currentColor so the emblem stays crisp in both themes.
 */
const ring=<circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="1.6"/>;
const dots=(n:number,r:number,size:number)=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2-Math.PI/2;return <circle key={i} cx={18+Math.cos(a)*r} cy={18+Math.sin(a)*r} r={size} fill="currentColor"/>;});
const GLYPHS:Record<OrganizationId,ReactNode>={
 un:<><circle cx="18" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M10 16h16M18 8v16M13 10.5c3 3 7 3 10 0M13 21.5c3-3 7-3 10 0" fill="none" stroke="currentColor" strokeWidth="1.2"/><path d="M7 25c4 5 18 5 22 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></>,
 nato:<><path d="M18 5l3 10 10 3-10 3-3 10-3-10-10-3 10-3z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="18" cy="18" r="2.2" fill="currentColor"/></>,
 csto:<><path d="M18 5l10 3.5v8c0 6-4.5 10-10 12.5C12.5 26.5 8 22.5 8 16.5v-8z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M18 11l1.8 4h4.2l-3.4 2.6 1.3 4.1L18 19l-3.9 2.7 1.3-4.1L12 15h4.2z" fill="currentColor"/></>,
 sco:<><path d="M18 6l9 5v10l-9 5-9-5V11z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M18 6v20M9 11l18 10M27 11L9 21" stroke="currentColor" strokeWidth="1.1"/><circle cx="18" cy="16" r="2.4" fill="currentColor"/></>,
 eu:<>{dots(12,11,1.6)}<circle cx="18" cy="18" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.4"/></>,
 opecPlus:<><path d="M18 5c5 6.5 8 10 8 14a8 8 0 0 1-16 0c0-4 3-7.5 8-14z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 20a4 4 0 0 0 4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></>,
 imf:<><ellipse cx="18" cy="24" rx="9" ry="3.2" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M9 24v-5c0 1.8 4 3.2 9 3.2s9-1.4 9-3.2v5M9 19v-5c0 1.8 4 3.2 9 3.2s9-1.4 9-3.2v5" fill="none" stroke="currentColor" strokeWidth="1.5"/><ellipse cx="18" cy="14" rx="9" ry="3.2" fill="none" stroke="currentColor" strokeWidth="1.5"/></>,
 worldBank:<><path d="M5 14L18 6l13 8z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M9 16v9M15 16v9M21 16v9M27 16v9M6 28h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
 wto:<><path d="M6 13h20M21 8l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M30 23H10M15 18l-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></>,
 g20:<><circle cx="18" cy="18" r="11" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2.5"/><text x="18" y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" fontFamily="system-ui,sans-serif">20</text></>,
 wef:<><path d="M4 28l9-15 5 8 4-6 10 13z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="26" cy="9" r="2.2" fill="currentColor"/></>,
 asean:<><path d="M11 26V12M14.5 26V9M18 26V8M21.5 26V9M25 26V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M8 27h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M8 18l4.5-3M28 18l-4.5-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></>,
 oic:<><path d="M23 7a11 11 0 1 0 0 22 9 9 0 1 1 0-22z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M26 14l1.1 2.4 2.6.3-1.9 1.8.5 2.6-2.3-1.3-2.3 1.3.5-2.6-1.9-1.8 2.6-.3z" fill="currentColor"/></>,
 bricsPlus:<><path d="M8 28V20M14 28V15M20 28V11M26 28V7" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round"/><circle cx="18" cy="18" r="16" fill="none" stroke="none"/></>,
};
export function OrganizationEmblem({id,size=36}:{id:OrganizationId;size?:number}){
 return <svg className="org-emblem" width={size} height={size} viewBox="0 0 36 36" role="img" aria-hidden="true" focusable="false" data-emblem={id}>{id==='eu'?null:ring}{GLYPHS[id]}</svg>;
}

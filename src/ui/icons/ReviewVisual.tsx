import { AssetThumbnail } from './AssetThumbnail';
import { CivicArt } from './CivicArt';
import {useId} from 'react';
export type ReviewVisualKind='contract'|'diplomacy'|'economy'|'military'|'construction'|'research'|'notice';
export function reviewVisualKind(text:string):ReviewVisualKind {
 if(/contract|agreement|shipment|import flow/i.test(text))return 'contract';
 if(/diploma|proposal|embass|pact|alliance/i.test(text))return 'diplomacy';
 if(/credit|loan|lend|market|treasury|payment|budget/i.test(text))return 'economy';
 if(/battle|combat|war|force|withdraw/i.test(text))return 'military';
 if(/research|technology|training/i.test(text))return 'research';
 if(/build|plant|construction|invest|facility/i.test(text))return 'construction';
 return 'notice';
}
export function ReviewVisual({kind,signed=false}:{kind:ReviewVisualKind;signed?:boolean}) {
 const gradient=useId();
 return <div className={`review-visual visual-${kind} ${signed?'is-signed':''}`} aria-hidden="true">
  {kind==='contract'?<svg viewBox="0 0 300 150" focusable="false"><defs><linearGradient id={gradient} x2="1" y2="1"><stop stopColor="#f6e8ca"/><stop offset="1" stopColor="#d6c398"/></linearGradient></defs><path d="M57 12h175v128H57z" fill={`url(#${gradient})`} stroke="#b7a170"/><path d="M78 36h108M78 49h135M78 61h135M78 73h97" stroke="#84785f" strokeWidth="3" opacity=".55"/><path className="contract-signature" d="M81 110q9-35 15-7t19-12q-7 22 8 14t12-5q-5 17 10 5l27-7" fill="none" stroke="#273a4c" strokeWidth="2.5" strokeLinecap="round"/><circle cx="204" cy="112" r="15" fill="#8d3832"/><path d="m197 112 5 5 9-10" fill="none" stroke="#eedbbc" strokeWidth="2"/><g className="contract-pen"><path d="m145 114 62-70 7 6-62 70-10 4z" fill="#273a4c" stroke="#d8b66e" strokeWidth="2"/><path d="m208 44 7 6" stroke="#f6df9d" strokeWidth="5"/></g></svg>:kind==='diplomacy'?<CivicArt kind="letter" size={72}/>:kind==='economy'?<CivicArt kind="gold" size={72}/>:<AssetThumbnail asset={kind==='military'?'tanks':kind==='construction'?'factory':kind==='research'?'electronics':'embassy'} size={72}/>}
 </div>;
}

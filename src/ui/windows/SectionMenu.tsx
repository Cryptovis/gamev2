import {LocaleText,translateLive} from '../../i18n/localeText';
import type {ReactNode} from 'react';

/** Button navigation keeps its own space above the scrolling selected content. */
export function SectionMenu({items,selected,onSelect,contentId,label='Market sections'}:{items:{id:string;label:string;icon:ReactNode}[];selected:string;onSelect:(id:string)=>void;contentId:string;label?:string}) {
 return <nav className="section-menu" aria-label={translateLive(label)}>
  {items.map(item=><button key={item.id} aria-controls={contentId} aria-pressed={item.id===selected} onClick={()=>onSelect(item.id)}><span aria-hidden="true">{item.icon}</span><span className="section-menu-label"><LocaleText value={item.label}/></span></button>)}
 </nav>;
}

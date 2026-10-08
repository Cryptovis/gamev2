import {GuideBriefing} from './GuideBriefing';
import {LocaleText,translateLive} from '../../i18n/localeText';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function CommandWindow({kicker,title,subtitle,onClose,children,wide=false}:{kicker:string;title:string;subtitle?:string;onClose:()=>void;children:ReactNode;wide?:boolean}){
  const node=<div className="command-window-backdrop" onMouseDown={onClose}>
    <section className={`command-window ${wide?'wide':''}`} onMouseDown={(e)=>e.stopPropagation()}>
      <header className="command-window-header"><div><small><LocaleText value={kicker}/></small><h2><LocaleText value={title}/></h2>{subtitle&&<p><LocaleText value={subtitle}/></p>}</div><button data-guide="close-workspace" onClick={onClose} aria-label={translateLive("Close command window")}><LocaleText value={"×"}/></button></header>
      <div className="command-window-body"><GuideBriefing/><LocaleText value={children}/></div>
    </section>
  </div>;
  return typeof document==='undefined'?node:createPortal(node,document.body);
}

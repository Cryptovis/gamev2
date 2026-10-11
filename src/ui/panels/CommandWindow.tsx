import {useWorkspaceVisibility} from '../windows/useWorkspaceVisibility';
import {useRef} from 'react';
import {useWindowLifecycle} from '../windows/useWindowLifecycle';
import {GuideBriefing} from './GuideBriefing';
import {LocaleText,translateLive} from '../../i18n/localeText';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function CommandWindow({kicker,title,subtitle,onClose,children,wide=false,className=""}:{kicker:string;title:string;subtitle?:string;onClose:()=>void;children:ReactNode;wide?:boolean;className?:string}){
  const visible=useWorkspaceVisibility();
  const ref=useRef<HTMLElement>(null);
  useWindowLifecycle(ref,{onClose,enabled:visible});
  const node=<div className="command-window-backdrop" hidden={!visible} onMouseDown={onClose}>
    <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={translateLive(title)} className={`command-window ${wide?'wide':''} ${className}`} onMouseDown={(e)=>e.stopPropagation()}>
      <header className="command-window-header"><div><small><LocaleText value={kicker}/></small><h2><LocaleText value={title}/></h2>{subtitle&&<p><LocaleText value={subtitle}/></p>}</div><button data-guide="close-workspace" onClick={onClose} aria-label={translateLive("Close command window")}><LocaleText value={"×"}/></button></header>
      <div className="command-window-body"><GuideBriefing/><LocaleText value={children}/></div>
    </section>
  </div>;
  return typeof document==='undefined'?node:createPortal(node,document.body);
}

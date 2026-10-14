import {useLayoutEffect,useRef,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {useWorkspaceVisibility} from './useWorkspaceVisibility';
import {useWindowLifecycle,ownsWindowDismissal,WINDOW_LAYERS} from './useWindowLifecycle';
import {useScrollMemory} from './useScrollMemory';
import {LocaleText,translateLive} from '../../i18n/localeText';
import {GuideBriefing} from '../panels/GuideBriefing';

/** A centered primary workspace: fixed heading/tabs, one scrolling body, suspended ownership while a child is active. */
export function ExecutiveWorkspaceShell({id,title,kicker='EXECUTIVE OFFICE',tabs,children,onClose,scrollKey='body'}:{id:string;title:string;kicker?:string;tabs?:ReactNode;children:ReactNode;onClose:()=>void;scrollKey?:string}){
 const visible=useWorkspaceVisibility(),ref=useRef<HTMLElement>(null),body=useRef<HTMLDivElement>(null),positions=useRef(new Map<string,number>());
 useLayoutEffect(()=>{if(visible&&body.current)body.current.scrollTop=positions.current.get(scrollKey)??0;},[scrollKey,visible]);
 useWindowLifecycle(ref,{onClose,layer:WINDOW_LAYERS.workspace,enabled:visible});
 useScrollMemory(ref,visible);
 const node=<div className="executive-backdrop" hidden={!visible} onMouseDown={event=>{if(ownsWindowDismissal(ref.current)){event.preventDefault();onClose();}}}>
  <section id={id} ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={translateLive(title)} className="executive-workspace" onMouseDown={e=>e.stopPropagation()}>
   <header className="floating-command-header executive-header" onMouseDown={e=>e.stopPropagation()}>
    <span><small><LocaleText value={kicker}/></small><strong><LocaleText value={title}/></strong></span>
    <button data-guide="close-workspace" onClick={onClose} aria-label={translateLive('Close command window')}><LocaleText value="×"/></button>
   </header>
   {tabs&&<div className="executive-tabs" onKeyDown={event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    const tabs=[...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)')],index=tabs.indexOf(document.activeElement as HTMLButtonElement);
    if(index<0||!tabs.length)return;event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    tabs[next].focus();tabs[next].click();
   }} onMouseDown={e=>e.stopPropagation()}>{tabs}</div>}
   <div ref={body} onScroll={()=>{if(visible&&body.current)positions.current.set(scrollKey,body.current.scrollTop);}} className="floating-command-body executive-body" onMouseDown={e=>e.stopPropagation()}><GuideBriefing/>{children}</div>
  </section>
 </div>;
 return typeof document==='undefined'?node:createPortal(node,document.body);
}

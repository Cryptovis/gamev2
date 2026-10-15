import {createPortal} from 'react-dom';
import {useWorkspaceVisibility} from './useWorkspaceVisibility';
import {useGameStore} from '../../store/gameStore';
import {useWindowLifecycle,WINDOW_LAYERS} from './useWindowLifecycle';
import {useScrollMemory} from './useScrollMemory';
import {GuideBriefing} from '../panels/GuideBriefing';
import {TacticalHint} from '../hints/TacticalHint';
import type {TacticalHintSpec} from '../hints/types';
import {LocaleText,translateLive} from '../../i18n/localeText';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** Keep initial tool frames between the visible rails; confirmations remain centred. */
export function workspaceBounds(viewportWidth:number,leftEdge:number,rightEdge:number,width:number,right:boolean,preferredX:number) {
 const minX=Math.max(12,leftEdge+12),maxRight=Math.min(viewportWidth-12,rightEdge-12);
 const fittedWidth=Math.min(width,Math.max(0,maxRight-minX));
 const maxX=Math.max(minX,maxRight-fittedWidth);
 return {x:right?maxX:Math.max(minX,Math.min(preferredX,maxX)),width:fittedWidth,minX,maxX};
}
function visibleEdge(selector:string,side:'left'|'right',fallback:number) {
 const node=document.querySelector<HTMLElement>(selector);
 return node&&node.getClientRects().length?node.getBoundingClientRect()[side]:fallback;
}
function bounds(width:number,preferredX:number,expanded=false) {
 if(expanded&&window.innerWidth<=760)return workspaceBounds(window.innerWidth,0,window.innerWidth,width,false,12);
 const right=['objectives','diplomacy','alerts','sitrep','help','map'].includes(useGameStore.getState().activeTool??'');
 const left=visibleEdge('.command-rail-left','right',72);
 const edge=visibleEdge('.command-rail-right','left',window.innerWidth);
 return workspaceBounds(window.innerWidth,left,edge,width,right,preferredX);
}
export function DraggableWindow({
 id,title,kicker,children,onClose,initialX=120,initialY=130,width=430,expanded=false,hint
}:{id:string;title:string;kicker:string;children:ReactNode;onClose:()=>void;initialX?:number;initialY?:number;width?:number;expanded?:boolean;hint?:TacticalHintSpec}){
 const visible=useWorkspaceVisibility();
 const activeTool=useGameStore(s=>s.activeTool);
 const country=useGameStore(s=>s.selectedCountryId);
 const [position,setPosition]=useState(()=>({...bounds(width,initialX,expanded),y:Math.min(initialY,150)}));
 const ref=useRef<HTMLElement>(null);
 const raise=useWindowLifecycle(ref,{onClose,layer:WINDOW_LAYERS.workspace,modal:false,backdrop:false,enabled:visible});
 useScrollMemory(ref,visible);
 useLayoutEffect(()=>{
  if(!visible)return;
  setPosition(old=>({...bounds(width,old.x,expanded),y:expanded?Math.max(old.y,110,(document.querySelector('.topbar')?.getBoundingClientRect().bottom??98)+12):old.y}));
 },[activeTool,country,expanded,width,visible]);
 useEffect(()=>{
  const clamp=()=>{if(!visible)return;setPosition(old=>({...bounds(width,old.x,expanded),y:Math.max(12,Math.min(old.y,window.innerHeight-100))}));};
  window.addEventListener('resize',clamp);return()=>window.removeEventListener('resize',clamp);
 },[width,expanded,visible]);
 const drag=useRef<{dx:number;dy:number}|null>(null);
 const onPointerDown=(e:React.PointerEvent<HTMLElement>)=>{
  if((e.target as HTMLElement).closest('button'))return;
  drag.current={dx:e.clientX-position.x,dy:e.clientY-position.y};
  e.currentTarget.setPointerCapture(e.pointerId);
 };
 const onPointerMove=(e:React.PointerEvent<HTMLElement>)=>{
  if(!drag.current)return;
  const area=bounds(width,position.x,expanded),maxY=Math.max(86,window.innerHeight-190);
  setPosition({...area,x:Math.max(area.minX,Math.min(area.maxX,e.clientX-drag.current.dx)),y:Math.max(82,Math.min(maxY,e.clientY-drag.current.dy))});
 };
 const stop=()=>{drag.current=null;};
 const node=<section ref={ref} tabIndex={-1} role="dialog" aria-modal="false" aria-label={translateLive(title)} onPointerDownCapture={raise} id={id} className={`floating-command-window ${expanded?'expanded-command-window':''}`} hidden={!visible} style={{left:position.x,top:position.y,width:position.width,'--workspace-y':`${position.y}px`,'--workspace-x':`${position.x}px`,'--workspace-width':`${position.width}px`} as React.CSSProperties} onPointerMove={onPointerMove} onPointerUp={stop} onPointerCancel={stop}>
   <header className="floating-command-header" onPointerDown={onPointerDown}>
    <span><small><LocaleText value={kicker}/></small><strong><LocaleText value={title}/></strong></span><div><em><LocaleText value={"DRAG"}/></em>{hint&&<TacticalHint spec={hint}/>}<button data-guide="close-workspace" onClick={onClose} aria-label={translateLive(`Close ${title}`)}><LocaleText value={"×"}/></button></div>
   </header>
   <div className="floating-command-body"><GuideBriefing/><LocaleText value={children}/></div>
  </section>;
 return expanded&&typeof document!=='undefined'?createPortal(node,document.body):node;
}

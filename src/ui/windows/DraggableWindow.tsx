import {useGameStore} from '../../store/gameStore';
import {useWindowLifecycle,WINDOW_LAYERS} from './useWindowLifecycle';
import {GuideBriefing} from '../panels/GuideBriefing';
import {LocaleText,translateLive} from '../../i18n/localeText';
import { useEffect, useRef, useState, type ReactNode } from 'react';

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
function bounds(width:number,preferredX:number) {
 const right=['objectives','diplomacy','alerts','sitrep','help','map'].includes(useGameStore.getState().activeTool??'');
 const left=visibleEdge('.command-rail-left','right',72);
 const edge=Math.min(visibleEdge('.command-rail-right','left',window.innerWidth),visibleEdge('.map-help-cluster','left',window.innerWidth));
 return workspaceBounds(window.innerWidth,left,edge,width,right,preferredX);
}
export function DraggableWindow({
 id,title,kicker,children,onClose,initialX=120,initialY=130,width=430
}:{id:string;title:string;kicker:string;children:ReactNode;onClose:()=>void;initialX?:number;initialY?:number;width?:number}){
 const [position,setPosition]=useState(()=>({...bounds(width,initialX),y:Math.min(initialY,150)}));
 const ref=useRef<HTMLElement>(null);
 const raise=useWindowLifecycle(ref,{onClose,layer:WINDOW_LAYERS.workspace,modal:false,backdrop:false});
 useEffect(()=>{
  const clamp=()=>setPosition(old=>({...bounds(width,old.x),y:Math.max(12,Math.min(old.y,window.innerHeight-100))}));
  window.addEventListener('resize',clamp);return()=>window.removeEventListener('resize',clamp);
 },[width]);
 const drag=useRef<{dx:number;dy:number}|null>(null);
 const onPointerDown=(e:React.PointerEvent<HTMLElement>)=>{
  if((e.target as HTMLElement).closest('button'))return;
  drag.current={dx:e.clientX-position.x,dy:e.clientY-position.y};
  e.currentTarget.setPointerCapture(e.pointerId);
 };
 const onPointerMove=(e:React.PointerEvent<HTMLElement>)=>{
  if(!drag.current)return;
  const area=bounds(width,position.x),maxY=Math.max(86,window.innerHeight-190);
  setPosition({...area,x:Math.max(area.minX,Math.min(area.maxX,e.clientX-drag.current.dx)),y:Math.max(82,Math.min(maxY,e.clientY-drag.current.dy))});
 };
 const stop=()=>{drag.current=null;};
 return <section ref={ref} tabIndex={-1} role="dialog" aria-modal="false" aria-label={translateLive(title)} onPointerDownCapture={raise} id={id} className="floating-command-window" style={{left:position.x,top:position.y,width:position.width,'--workspace-x':`${position.x}px`,'--workspace-width':`${position.width}px`} as React.CSSProperties} onPointerMove={onPointerMove} onPointerUp={stop} onPointerCancel={stop}>
   <header className="floating-command-header" onPointerDown={onPointerDown}>
    <span><small><LocaleText value={kicker}/></small><strong><LocaleText value={title}/></strong></span><div><em><LocaleText value={"DRAG"}/></em><button data-guide="close-workspace" onClick={onClose} aria-label={translateLive(`Close ${title}`)}><LocaleText value={"×"}/></button></div>
   </header>
   <div className="floating-command-body"><GuideBriefing/><LocaleText value={children}/></div>
  </section>;
}

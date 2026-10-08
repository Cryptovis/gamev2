import {GuideBriefing} from '../panels/GuideBriefing';
import {LocaleText,translateLive} from '../../i18n/localeText';
import { useRef, useState, type ReactNode } from 'react';

export function DraggableWindow({
 id,title,kicker,children,onClose,initialX=120,initialY=130,width=430
}:{id:string;title:string;kicker:string;children:ReactNode;onClose:()=>void;initialX?:number;initialY?:number;width?:number}){
 const [position,setPosition]=useState({x:Math.max(12,Math.min(initialX,window.innerWidth-Math.min(width,window.innerWidth-24)-12)),y:Math.min(initialY,150)});
 const drag=useRef<{dx:number;dy:number}|null>(null);
 const onPointerDown=(e:React.PointerEvent<HTMLElement>)=>{
  if((e.target as HTMLElement).closest('button'))return;
  drag.current={dx:e.clientX-position.x,dy:e.clientY-position.y};
  e.currentTarget.setPointerCapture(e.pointerId);
 };
 const onPointerMove=(e:React.PointerEvent<HTMLElement>)=>{
  if(!drag.current)return;
  const maxX=Math.max(12,window.innerWidth-width-12),maxY=Math.max(86,window.innerHeight-190);
  setPosition({x:Math.max(12,Math.min(maxX,e.clientX-drag.current.dx)),y:Math.max(82,Math.min(maxY,e.clientY-drag.current.dy))});
 };
 const stop=()=>{drag.current=null;};
 return <section id={id} className="floating-command-window" style={{left:position.x,top:position.y,width}} onPointerMove={onPointerMove} onPointerUp={stop} onPointerCancel={stop}>
   <header className="floating-command-header" onPointerDown={onPointerDown}>
    <span><small><LocaleText value={kicker}/></small><strong><LocaleText value={title}/></strong></span><div><em><LocaleText value={"DRAG"}/></em><button data-guide="close-workspace" onClick={onClose} aria-label={translateLive(`Close ${title}`)}><LocaleText value={"×"}/></button></div>
   </header>
   <div className="floating-command-body"><GuideBriefing/><LocaleText value={children}/></div>
  </section>;
}

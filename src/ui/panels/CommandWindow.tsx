import type { ReactNode } from 'react';

export function CommandWindow({kicker,title,subtitle,onClose,children,wide=false}:{kicker:string;title:string;subtitle?:string;onClose:()=>void;children:ReactNode;wide?:boolean}){
  return <div className="command-window-backdrop" onMouseDown={onClose}>
    <section className={`command-window ${wide?'wide':''}`} onMouseDown={(e)=>e.stopPropagation()}>
      <header className="command-window-header"><div><small>{kicker}</small><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button onClick={onClose} aria-label="Close command window">×</button></header>
      <div className="command-window-body">{children}</div>
    </section>
  </div>;
}

import type {ReactNode} from 'react';
import {DraggableWindow} from '../windows/DraggableWindow';
export function CountrySectionFrame({expanded,wideSection,title,onClose,children}:{expanded:boolean;wideSection:boolean;title:string;onClose:()=>void;children:ReactNode}) {
  if(wideSection&&!expanded)return null;
  if(!expanded)return <>{children}</>;
  return <DraggableWindow expanded id="country-section-window" kicker="NATIONAL COMMAND" title={title} width={1120} onClose={onClose}>
    <div className="country-section-content">{children}</div>
  </DraggableWindow>;
}

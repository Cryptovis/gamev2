import type {ReactNode} from 'react';
import {ExecutiveWorkspaceShell} from '../windows/ExecutiveWorkspaceShell';
import {DraggableWindow} from '../windows/DraggableWindow';
export function CountrySectionFrame({expanded,wideSection,title,onClose,children,centered=false,tabs,scrollKey}:{expanded:boolean;wideSection:boolean;title:string;onClose:()=>void;children:ReactNode;centered?:boolean;tabs?:ReactNode;scrollKey?:string}) {
  if(wideSection&&!expanded)return null;
  if(!expanded)return <>{children}</>;
  if(centered)return <ExecutiveWorkspaceShell id="country-section-window" title={title} kicker="NATIONAL COMMAND" onClose={onClose} tabs={tabs} scrollKey={scrollKey}><div className="country-section-content">{children}</div></ExecutiveWorkspaceShell>;
  return <DraggableWindow expanded id="country-section-window" kicker="NATIONAL COMMAND" title={title} width={1120} onClose={onClose}>
    <div className="country-section-content">{children}</div>
  </DraggableWindow>;
}

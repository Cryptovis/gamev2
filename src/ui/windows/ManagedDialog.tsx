import {useRef, type ReactNode} from 'react';
import {useWindowLifecycle,type WindowLayer} from './useWindowLifecycle';
import {translateLive} from '../../i18n/localeText';
export function ManagedDialog({children,className,label,onClose,layer,enabled=true,role="dialog",testId}:{children:ReactNode;className:string;label:string;onClose?:()=>void;layer?:WindowLayer;enabled?:boolean;role?:"dialog"|"alertdialog";testId?:string}) {
 const ref=useRef<HTMLElement>(null);
 useWindowLifecycle(ref,{onClose:onClose??(()=>{}),layer,dismissible:!!onClose,enabled});
 return <section ref={ref} tabIndex={-1} className={className} role={role} aria-modal="true" data-testid={testId} aria-label={translateLive(label)} onMouseDown={e=>e.stopPropagation()}>{children}</section>;
}

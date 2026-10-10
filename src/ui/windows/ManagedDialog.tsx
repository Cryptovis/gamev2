import {useRef, type ReactNode} from 'react';
import {useWindowLifecycle,type WindowLayer} from './useWindowLifecycle';
import {translateLive} from '../../i18n/localeText';
export function ManagedDialog({children,className,label,onClose,layer,enabled=true}:{children:ReactNode;className:string;label:string;onClose?:()=>void;layer?:WindowLayer;enabled?:boolean}) {
 const ref=useRef<HTMLElement>(null);
 useWindowLifecycle(ref,{onClose:onClose??(()=>{}),layer,dismissible:!!onClose,enabled});
 return <section ref={ref} tabIndex={-1} className={className} role="dialog" aria-modal="true" aria-label={translateLive(label)} onMouseDown={e=>e.stopPropagation()}>{children}</section>;
}

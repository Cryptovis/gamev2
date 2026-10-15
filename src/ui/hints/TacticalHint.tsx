import {useCallback,useEffect,useId,useLayoutEffect,useRef,useState,type SyntheticEvent} from 'react';
import {createPortal} from 'react-dom';
import {LocaleText,formatLive} from '../../i18n/localeText';
import {positionPopover} from './positionPopover';
import {useUiPrefsStore} from './uiPrefsStore';
import type {TacticalHintSpec} from './types';

const REDUCED_MOTION='(prefers-reduced-motion: reduce)';

function usePrefersReducedMotion():boolean {
  const query=()=>typeof window!=='undefined'&&typeof window.matchMedia==='function'?window.matchMedia(REDUCED_MOTION):null;
  const [reduced,setReduced]=useState(()=>Boolean(query()?.matches));
  useEffect(()=>{
    const list=query();if(!list)return;
    const update=()=>setReduced(list.matches);
    update();
    list.addEventListener?.('change',update);
    return()=>list.removeEventListener?.('change',update);
  },[]);
  return reduced;
}

/** Popover events must not reach the host window (drag handlers, backdrop dismissal) through the React tree. */
const contain=(event:SyntheticEvent)=>event.stopPropagation();

/**
 * Header-anchored help beacon. Preferences live in the UI prefs store only; this never
 * dispatches a command or reads simulation state. The beacon renders inline where the
 * window header places it; only the popover is portaled to document.body so a window's
 * overflow can never clip it.
 */
export function TacticalHint({spec}:{spec:TacticalHintSpec}){
  const hintsEnabled=useUiPrefsStore(s=>s.hintsEnabled);
  const dismissed=useUiPrefsStore(s=>Boolean(s.dismissedHints[spec.id]));
  const seen=useUiPrefsStore(s=>Boolean(s.seenHints[spec.id]));
  const markSeen=useUiPrefsStore(s=>s.markSeen);
  const dismiss=useUiPrefsStore(s=>s.dismiss);
  const reduced=usePrefersReducedMotion();
  const uid=useId(),popoverId=`${uid}-popover`,titleId=`${uid}-title`;
  const beacon=useRef<HTMLButtonElement>(null),popover=useRef<HTMLDivElement>(null);
  const [open,setOpen]=useState(false);
  const [position,setPosition]=useState<{top:number;left:number;placement:'below'|'above'}|null>(null);
  const visible=hintsEnabled&&!dismissed;
  const shown=open&&visible;

  const close=useCallback((restoreFocus:boolean)=>{
    setOpen(false);setPosition(null);
    if(restoreFocus)beacon.current?.focus({preventScroll:true});
  },[]);

  // A different hint (e.g. another tab) never keeps the previous popover open.
  useEffect(()=>{setOpen(false);setPosition(null);},[spec.id]);

  const place=useCallback(()=>{
    const anchor=beacon.current,card=popover.current;
    if(!anchor||!card)return;
    if(anchor.closest('[hidden]')){close(false);return;}
    const box=card.getBoundingClientRect();
    setPosition(positionPopover(anchor.getBoundingClientRect(),{width:box.width,height:box.height},{width:window.innerWidth,height:window.innerHeight}));
  },[close]);

  useLayoutEffect(()=>{if(shown)place();},[shown,place]);
  useEffect(()=>{if(shown&&position)popover.current?.focus({preventScroll:true});},[shown,position===null]);

  useEffect(()=>{
    if(!shown)return;
    // Window-level capture runs before the window lifecycle's own Escape handler, so Esc closes only the hint.
    const onKey=(event:KeyboardEvent)=>{
      if(event.key!=='Escape')return;
      event.preventDefault();event.stopPropagation();close(true);
    };
    const onOutside=(event:Event)=>{
      const target=event.target as Node|null;
      if(target&&(popover.current?.contains(target)||beacon.current?.contains(target)))return;
      close(false);
    };
    window.addEventListener('keydown',onKey,true);
    document.addEventListener('pointerdown',onOutside,true);
    document.addEventListener('mousedown',onOutside,true);
    window.addEventListener('resize',place);
    window.addEventListener('scroll',place,true);
    return()=>{
      window.removeEventListener('keydown',onKey,true);
      document.removeEventListener('pointerdown',onOutside,true);
      document.removeEventListener('mousedown',onOutside,true);
      window.removeEventListener('resize',place);
      window.removeEventListener('scroll',place,true);
    };
  },[shown,close,place]);

  if(!visible)return null;

  const toggle=()=>{
    if(open){close(false);return;}
    markSeen(spec.id);setOpen(true);
  };
  return <>
    <button ref={beacon} type="button" className="tactical-hint-beacon" data-hint-id={spec.id} data-state={seen?'seen':'unseen'} data-motion={reduced?'reduced':'full'}
      aria-label={formatLive('Help: {0}',[spec.titleKey])} aria-haspopup="dialog" aria-expanded={shown} aria-controls={shown?popoverId:undefined} onClick={toggle}>
      <span aria-hidden="true">?</span>
    </button>
    {shown&&typeof document!=='undefined'&&createPortal(
      <div ref={popover} id={popoverId} role="dialog" aria-modal="false" aria-labelledby={titleId} tabIndex={-1} className="tactical-hint-popover"
        data-placement={position?.placement??'below'} style={{top:position?.top??0,left:position?.left??0,visibility:position?'visible':'hidden'}}
        onPointerDown={contain} onMouseDown={contain} onPointerMove={contain} onPointerUp={contain}
        onBlur={event=>{const next=event.relatedTarget as Node|null;if(next&&!event.currentTarget.contains(next)&&next!==beacon.current)close(false);}}>
        <h3 id={titleId}><LocaleText value={spec.titleKey}/></h3>
        <p className="tactical-hint-body"><LocaleText value={spec.bodyKey}/></p>
        {spec.extraKeys?.map(key=><p key={key} className="tactical-hint-body"><LocaleText value={key}/></p>)}
        {spec.learnMoreKey&&<p className="tactical-hint-more"><LocaleText value={spec.learnMoreKey}/></p>}
        <label className="tactical-hint-dismiss"><input type="checkbox" checked={false} onChange={event=>{if(event.target.checked)dismiss(spec.id);}}/><span><LocaleText value="Do not show this hint again"/></span></label>
      </div>,document.body)}
  </>;
}

import {useCallback,useEffect,useRef,useState,type FocusEvent} from 'react';
import {LEADERSHIP_QUOTES,type LeadershipQuote} from '../../data/leadershipQuotes';
import {QUOTE_RECENT_WINDOW,selectLeadershipQuote,type QuoteContext} from '../../data/leadershipQuoteSelection';

/** Time each quote stays on screen before the next one fades in. */
export const DEFAULT_QUOTE_INTERVAL_MS=18000;

export interface RotationPauses {hover:boolean;focus:boolean;hidden:boolean;manual:boolean;}
/** Rotation stops while the pointer is over the quote, focus is inside it, the tab is hidden, or the person paused it. */
export const isRotationPaused=(pauses:RotationPauses)=>pauses.hover||pauses.focus||pauses.hidden||pauses.manual;

interface Chosen {quote:LeadershipQuote;recent:readonly string[];}
/** One step of the rotation: picks with the caller's roll, avoiding the last few quotes shown. Pure. */
export function advanceQuote(corpus:readonly LeadershipQuote[],context:QuoteContext,roll:number,previous:Chosen|null):Chosen {
 const quote=selectLeadershipQuote(corpus,context,roll,previous?.recent??[]);
 return {quote,recent:[...(previous?.recent??[]),quote.id].slice(-QUOTE_RECENT_WINDOW)};
}

export interface QuoteRotationOptions {
 context:QuoteContext;
 /** Milliseconds per quote. Pass 0 or a negative number for a fixed quote that never rotates. */
 intervalMs?:number;
 corpus?:readonly LeadershipQuote[];
 /** Source of the presentation-only random number in [0,1). Defaults to Math.random; tests pass a fixed sequence. */
 roll?:()=>number;
}
export interface QuoteRotation {
 quote:LeadershipQuote;
 paused:boolean;
 /** True when the person paused it with the button, as opposed to a hover, focus or hidden-tab pause. */
 manuallyPaused:boolean;
 next:()=>void;
 setManualPause:(paused:boolean)=>void;
 toggleManualPause:()=>void;
 /** Spread on the element that wraps the quote so hovering or focusing it pauses rotation. */
 bind:{onPointerEnter:()=>void;onPointerLeave:()=>void;onFocus:()=>void;onBlur:(event:FocusEvent<HTMLElement>)=>void};
}

const documentHidden=()=>typeof document!=='undefined'&&document.visibilityState==='hidden';

export function useQuoteRotation(options:QuoteRotationOptions):QuoteRotation {
 const {intervalMs=DEFAULT_QUOTE_INTERVAL_MS}=options;
 const latest=useRef(options);latest.current=options;
 const draw=useCallback(()=>(latest.current.roll??Math.random)(),[]);
 const [chosen,setChosen]=useState<Chosen>(()=>advanceQuote(options.corpus??LEADERSHIP_QUOTES,options.context,draw(),null));
 const [hover,setHover]=useState(false),[focus,setFocus]=useState(false),[manual,setManual]=useState(false),[hidden,setHidden]=useState(documentHidden);
 // Bumped by a manual Next so the timer restarts and the new quote gets its full time on screen.
 const [epoch,setEpoch]=useState(0);

 const step=useCallback(()=>{
  const roll=draw();
  setChosen(previous=>advanceQuote(latest.current.corpus??LEADERSHIP_QUOTES,latest.current.context,roll,previous));
 },[draw]);

 useEffect(()=>{
  if(typeof document==='undefined')return;
  const onVisibility=()=>setHidden(documentHidden());
  document.addEventListener('visibilitychange',onVisibility);
  return ()=>document.removeEventListener('visibilitychange',onVisibility);
 },[]);

 const paused=isRotationPaused({hover,focus,hidden,manual});
 useEffect(()=>{
  if(paused||!(intervalMs>0))return;
  const timer=setInterval(step,intervalMs);
  return ()=>clearInterval(timer);
 },[paused,intervalMs,epoch,step]);

 const next=useCallback(()=>{step();setEpoch(value=>value+1);},[step]);
 const bind=useRef({
  onPointerEnter:()=>setHover(true),
  onPointerLeave:()=>setHover(false),
  onFocus:()=>setFocus(true),
  onBlur:(event:FocusEvent<HTMLElement>)=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setFocus(false);},
 }).current;
 return {
  quote:chosen.quote,paused,manuallyPaused:manual,next,
  setManualPause:setManual,toggleManualPause:useCallback(()=>setManual(value=>!value),[]),bind,
 };
}

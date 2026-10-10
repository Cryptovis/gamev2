import {useEffect, useRef, type RefObject} from 'react';
import {useGameStore} from '../../store/gameStore';
import {clockBlocked} from '../../engine/clockState';
import type {GameSpeed} from '../../domain/game';

export const WINDOW_LAYERS = {workspace:'workspace', command:'command', modal:'modal', review:'review', nested:'nested'} as const;
export type WindowLayer = typeof WINDOW_LAYERS[keyof typeof WINDOW_LAYERS];
const layerOrder = Object.values(WINDOW_LAYERS);
type Entry = {dialog:HTMLElement;surface:HTMLElement;layer:WindowLayer;order:number;modal:boolean;dismissible:boolean;close:()=>void};
const entries = new Set<Entry>();
let order = 0;
let pausedSpeed: GameSpeed | undefined;
let stopWatching: (()=>void) | undefined;
const pauseOwners = new Set<Entry>();

function sorted() {return [...entries].sort((a,b)=>layerOrder.indexOf(a.layer)-layerOrder.indexOf(b.layer)||a.order-b.order);}
function top() {return sorted().at(-1);}
function refreshLayers() {
 const ranks = new Map<WindowLayer,number>();
 for (const entry of sorted()) {
  const rank = ranks.get(entry.layer)??0;
  entry.surface.style.zIndex = `calc(var(--layer-${entry.layer}) + ${rank})`;
  ranks.set(entry.layer,rank+1);
 }
}
function controls(dialog:HTMLElement) {
 return [...dialog.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,[tabindex]')]
  .filter(node=>node.tabIndex>=0&&!node.matches(':disabled')&&!node.closest('[inert],[aria-hidden="true"]')&&node.getClientRects().length>0);
}
function focusFirst(entry:Entry) {(controls(entry.dialog)[0]??entry.dialog).focus({preventScroll:true});}
function handleKey(event:KeyboardEvent) {
 const entry = top();
 if (!entry || event.defaultPrevented) return;
 if (event.key==='Escape') {
  event.preventDefault();event.stopImmediatePropagation();if(entry.dismissible)entry.close();return;
 }
 if (event.key!=='Tab'||!entry.modal) return;
 // The tutorial has its own reserved area and remains keyboard-accessible during a lesson.
 const tutorial = document.querySelector<HTMLElement>('.tutorial-docked');
 const items = [...controls(entry.dialog),...(tutorial?controls(tutorial):[])];
 const first = items[0], last = items.at(-1);
 if (!first) {event.preventDefault();entry.dialog.focus({preventScroll:true});return;}
 const outside = !items.includes(document.activeElement as HTMLElement);
 if (event.shiftKey&&(document.activeElement===first||outside)) {event.preventDefault();last?.focus({preventScroll:true});}
 else if (!event.shiftKey&&(document.activeElement===last||outside)) {event.preventDefault();first.focus({preventScroll:true});}
}
function resumeWhenReleased() {
 if (pauseOwners.size || pausedSpeed===undefined) return;
 const state = useGameStore.getState();
 if (state.speed!==0) pausedSpeed=undefined;
 else if (!clockBlocked(state)&&!state.world.tutorial.active) {
  const speed=pausedSpeed;pausedSpeed=undefined;if(speed)state.setSpeed(speed);
 }
 if (pausedSpeed===undefined) {stopWatching?.();stopWatching=undefined;}
}

/** One owner for focus, Escape, stacking and nested review pauses. Simulation rules remain in the engine. */
export function useWindowLifecycle(ref:RefObject<HTMLElement|null>, {
 onClose, layer=WINDOW_LAYERS.command, modal=true, backdrop=true, pause=false, enabled=true, dismissible=true,
}: {onClose:()=>void;layer?:WindowLayer;modal?:boolean;backdrop?:boolean;pause?:boolean;enabled?:boolean;dismissible?:boolean}) {
 const close = useRef(onClose);close.current=onClose;
 const active = useRef<Entry|null>(null);
 // Capture the opener before React hides its parent during the commit.
 const initialFocus = useRef(typeof document==='undefined'?null:document.activeElement as HTMLElement|null);
 const enabledNow = useRef(enabled);enabledNow.current=enabled;
 useEffect(()=>{
  const dialog=ref.current;if(!enabled||!dialog)return;
  const previous=initialFocus.current;
  const entry:Entry={dialog,surface:backdrop?dialog.parentElement??dialog:dialog,layer,order:++order,modal,dismissible,close:()=>close.current()};
  active.current=entry;
  if (!entries.size) document.addEventListener('keydown',handleKey,true);
  entries.add(entry);refreshLayers();
  if (pause) {
   if (pausedSpeed===undefined) pausedSpeed=useGameStore.getState().speed;
   pauseOwners.add(entry);
   if (!stopWatching) stopWatching=useGameStore.subscribe(resumeWhenReleased);
   useGameStore.getState().setSpeed(0);
  }
  if (top()===entry&&!dialog.contains(document.activeElement)) focusFirst(entry);
  return ()=>{
   const wasTop=top()===entry;
   entries.delete(entry);pauseOwners.delete(entry);active.current=null;refreshLayers();resumeWhenReleased();
   if (!entries.size) document.removeEventListener('keydown',handleKey,true);
   if (wasTop&&enabledNow.current) {
    const next=top();
    if (previous?.isConnected&&(!next||!next.modal||next.dialog.contains(previous))) previous.focus({preventScroll:true});
    else if(next)focusFirst(next);
   }
  };
 },[enabled,layer,modal,backdrop,pause,dismissible,ref]);
 return ()=>{const entry=active.current;if(entry){entry.order=++order;refreshLayers();}};
}

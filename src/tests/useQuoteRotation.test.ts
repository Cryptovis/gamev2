// @vitest-environment happy-dom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {LEADERSHIP_QUOTES} from '../data/leadershipQuotes';
import {QUOTE_RECENT_WINDOW} from '../data/leadershipQuoteSelection';
import {DEFAULT_QUOTE_INTERVAL_MS,advanceQuote,isRotationPaused,useQuoteRotation,type QuoteRotation,type QuoteRotationOptions} from '../ui/hooks/useQuoteRotation';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});

describe('isRotationPaused',()=>{
 it('is paused when any one reason holds and running only when none does',()=>{
  const none={hover:false,focus:false,hidden:false,manual:false};
  expect(isRotationPaused(none)).toBe(false);
  for(const key of ['hover','focus','hidden','manual'] as const)expect(isRotationPaused({...none,[key]:true}),key).toBe(true);
 });
});

describe('advanceQuote',()=>{
 const context={screen:'landing'} as const;
 it('is deterministic for the same roll and history',()=>{
  const a=advanceQuote(LEADERSHIP_QUOTES,context,0.37,null),b=advanceQuote(LEADERSHIP_QUOTES,context,0.37,null);
  expect(a.quote.id).toBe(b.quote.id);expect(a.recent).toEqual([a.quote.id]);
 });
 it('never repeats a quote within the recent window and keeps the window bounded',()=>{
  let state=advanceQuote(LEADERSHIP_QUOTES,context,0.5,null);
  for(let step=0;step<40;step++){
   const next=advanceQuote(LEADERSHIP_QUOTES,context,0.5,state);
   expect(state.recent.includes(next.quote.id),`step ${step}`).toBe(false);
   expect(next.recent.length).toBeLessThanOrEqual(QUOTE_RECENT_WINDOW);
   state=next;
  }
 });
 it('does not modify the history it is given',()=>{
  const first=advanceQuote(LEADERSHIP_QUOTES,context,0.1,null);const before=JSON.stringify(first);
  advanceQuote(LEADERSHIP_QUOTES,context,0.9,first);
  expect(JSON.stringify(first)).toBe(before);
 });
});

let host:HTMLDivElement,root:Root,latest:QuoteRotation;
const rolls=(...values:number[])=>{let index=0;return ()=>values[index++%values.length];};
function Probe(props:QuoteRotationOptions) {
 latest=useQuoteRotation(props);
 return createElement('div',{...latest.bind,id:'probe','data-quote':latest.quote.id,tabIndex:0},createElement('button',{id:'inner'}));
}
const mount=async(options:QuoteRotationOptions)=>{await act(async()=>{root.render(createElement(Probe,options));});};
const tick=async(ms:number)=>{await act(async()=>{vi.advanceTimersByTime(ms);});};
const shown=()=>host.querySelector('#probe')!.getAttribute('data-quote')!;
const setVisibility=async(state:'visible'|'hidden')=>{
 Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>state});
 await act(async()=>{document.dispatchEvent(new Event('visibilitychange'));});
};

beforeEach(()=>{vi.useFakeTimers();host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>{root.unmount();});host.remove();await setVisibility('visible');vi.useRealTimers();});

describe('useQuoteRotation',()=>{
 const base=()=>({context:{screen:'landing'} as const,roll:rolls(0.05,0.35,0.65,0.95,0.2,0.8)});
 it('shows the quote picked from its first roll',async()=>{
  const expected=advanceQuote(LEADERSHIP_QUOTES,{screen:'landing'},0.05,null).quote.id;
  await mount(base());expect(shown()).toBe(expected);
 });
 it('rotates every 18 seconds by default and not a moment sooner',async()=>{
  expect(DEFAULT_QUOTE_INTERVAL_MS).toBe(18000);
  await mount(base());const first=shown();
  await tick(17999);expect(shown()).toBe(first);
  await tick(1);const second=shown();expect(second).not.toBe(first);
  await tick(DEFAULT_QUOTE_INTERVAL_MS);expect(shown()).not.toBe(second);
 });
 it('honours a custom interval and never rotates when the interval is 0',async()=>{
  await mount({...base(),intervalMs:1000});const first=shown();
  await tick(1000);expect(shown()).not.toBe(first);
  await mount({...base(),intervalMs:0});const fixed=shown();
  await tick(100000);expect(shown()).toBe(fixed);
 });
 it('pauses while the pointer is over the quote and resumes when it leaves',async()=>{
  await mount(base());const first=shown();
  await act(async()=>{latest.bind.onPointerEnter();});
  expect(latest.paused).toBe(true);await tick(DEFAULT_QUOTE_INTERVAL_MS*3);expect(shown()).toBe(first);
  await act(async()=>{latest.bind.onPointerLeave();});
  expect(latest.paused).toBe(false);await tick(DEFAULT_QUOTE_INTERVAL_MS);expect(shown()).not.toBe(first);
 });
 it('pauses while focus is inside the quote and stays paused when focus moves between its children',async()=>{
  await mount(base());const first=shown();const probe=host.querySelector('#probe') as HTMLElement,inner=host.querySelector('#inner') as HTMLElement;
  await act(async()=>{latest.bind.onFocus();});
  expect(latest.paused).toBe(true);
  await act(async()=>{latest.bind.onBlur({currentTarget:probe,relatedTarget:inner} as never);});
  expect(latest.paused).toBe(true);await tick(DEFAULT_QUOTE_INTERVAL_MS*2);expect(shown()).toBe(first);
  await act(async()=>{latest.bind.onBlur({currentTarget:probe,relatedTarget:null} as never);});
  expect(latest.paused).toBe(false);await tick(DEFAULT_QUOTE_INTERVAL_MS);expect(shown()).not.toBe(first);
 });
 it('pauses while the document is hidden and resumes when it is visible again',async()=>{
  await mount(base());const first=shown();
  await setVisibility('hidden');expect(latest.paused).toBe(true);
  await tick(DEFAULT_QUOTE_INTERVAL_MS*3);expect(shown()).toBe(first);
  await setVisibility('visible');expect(latest.paused).toBe(false);
  await tick(DEFAULT_QUOTE_INTERVAL_MS);expect(shown()).not.toBe(first);
 });
 it('starts paused when mounted in a hidden tab',async()=>{
  await setVisibility('hidden');await mount(base());
  expect(latest.paused).toBe(true);const first=shown();await tick(DEFAULT_QUOTE_INTERVAL_MS*2);expect(shown()).toBe(first);
 });
 it('pauses and resumes from the explicit control, and reports that it was manual',async()=>{
  await mount(base());const first=shown();
  await act(async()=>{latest.toggleManualPause();});
  expect(latest.paused).toBe(true);expect(latest.manuallyPaused).toBe(true);
  await tick(DEFAULT_QUOTE_INTERVAL_MS*2);expect(shown()).toBe(first);
  await act(async()=>{latest.setManualPause(false);});
  expect(latest.manuallyPaused).toBe(false);await tick(DEFAULT_QUOTE_INTERVAL_MS);expect(shown()).not.toBe(first);
 });
 it('keeps a manual pause when the pointer leaves',async()=>{
  await mount(base());await act(async()=>{latest.toggleManualPause();latest.bind.onPointerEnter();});
  await act(async()=>{latest.bind.onPointerLeave();});
  expect(latest.paused).toBe(true);
 });
 it('advances at once on next(), even while paused, and gives the new quote a full interval',async()=>{
  await mount(base());const first=shown();
  await tick(10000);
  await act(async()=>{latest.next();});
  const second=shown();expect(second).not.toBe(first);
  await tick(DEFAULT_QUOTE_INTERVAL_MS-1);expect(shown()).toBe(second);
  await tick(1);expect(shown()).not.toBe(second);
  await act(async()=>{latest.toggleManualPause();});
  const held=shown();await act(async()=>{latest.next();});expect(shown()).not.toBe(held);
 });
 it('clears its timer and listeners on unmount',async()=>{
  await mount(base());expect(vi.getTimerCount()).toBeGreaterThan(0);
  await act(async()=>{root.unmount();});
  expect(vi.getTimerCount()).toBe(0);
  root=createRoot(host);
 });
});

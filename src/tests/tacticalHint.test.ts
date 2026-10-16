// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement,type ReactNode} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {TacticalHint} from '../ui/hints/TacticalHint';
import {TacticalHintOptions} from '../ui/hints/TacticalHintOptions';
import {positionPopover} from '../ui/hints/positionPopover';
import {DEFAULT_UI_PREFS,UI_PREFS_KEY,safePrefsStorage,useUiPrefsStore} from '../ui/hints/uiPrefsStore';
import type {TacticalHintSpec} from '../ui/hints/types';
import {INTERNATIONAL_HINTS} from '../ui/panels/international/hints';
import {InternationalAffairsWorkspace,INTERNATIONAL_TABS} from '../ui/panels/InternationalAffairsWorkspace';
import {CommandWindow} from '../ui/panels/CommandWindow';
import {ExecutiveWorkspaceShell} from '../ui/windows/ExecutiveWorkspaceShell';
import {DraggableWindow} from '../ui/windows/DraggableWindow';
import {useGameStore} from '../store/gameStore';
import {makeInitialState} from '../data/initialState';
import {recordEconomicHistory} from '../engine/systems/economicHistory';
import type {GameState} from '../domain/game';
import {translateText,formatText} from '../i18n/localeText';
import {UI_CATALOG_HINTS} from '../i18n/uiCatalogHints';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});

const SPEC:TacticalHintSpec={id:'test.alpha',titleKey:INTERNATIONAL_HINTS.overview.titleKey,bodyKey:INTERNATIONAL_HINTS.overview.bodyKey};
const OTHER:TacticalHintSpec={id:'test.beta',titleKey:INTERNATIONAL_HINTS.resolutions.titleKey,bodyKey:INTERNATIONAL_HINTS.resolutions.bodyKey};
const REMOVED_NOTES=[
  'NDB and IDB are financial facilities under BRICS+ and OIC. Starting rosters and charters are game scenarios.',
  'Proposals follow simulated charters. Approval is a vote, not an automatic effect.',
  'Repayments transfer real treasury. Cancellation releases undrawn funds and does not forgive drawn debt.',
  'Oil is measured in game units per day. Swaps authorize settlement and do not create treasury.',
  'Sanctions restrict their declared channels. Humanitarian exemptions do not permit weapons transfers.',
];

let host:HTMLDivElement,root:Root;
const originalMatchMedia=window.matchMedia;

function ready():GameState {
  const s=makeInitialState();
  s.playerProfile={...s.playerProfile,language:'en',setupComplete:true};
  s.speed=0;s.eventCooldownUntil=10000;s.advisorCooldownUntil=10000;s.world.tutorial.active=false;
  return recordEconomicHistory(s);
}
async function render(node:ReactNode){await act(async()=>{root.render(node);});}
async function click(element:HTMLElement){await act(async()=>{element.click();});}
async function press(key:string){await act(async()=>{window.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));});}
async function pointerOutside(){await act(async()=>{document.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));});}
const beacon=()=>host.querySelector<HTMLButtonElement>('.tactical-hint-beacon');
const popover=()=>document.querySelector<HTMLElement>('.tactical-hint-popover');
const storedPrefs=()=>JSON.parse(localStorage.getItem(UI_PREFS_KEY)??'null') as {state:{hintsEnabled:boolean;seenHints:Record<string,true>;dismissedHints:Record<string,true>};version:number}|null;
const resetPrefs=()=>useUiPrefsStore.setState({...DEFAULT_UI_PREFS,seenHints:{},dismissedHints:{}});

beforeEach(()=>{
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
  safePrefsStorage.removeItem(UI_PREFS_KEY);localStorage.clear();resetPrefs();
  useGameStore.setState({playerProfile:{...useGameStore.getState().playerProfile,language:'en'}});
});
afterEach(async()=>{
  await act(async()=>{root.unmount();});
  host.remove();
  Object.defineProperty(window,'matchMedia',{configurable:true,writable:true,value:originalMatchMedia});
  vi.unstubAllGlobals();vi.restoreAllMocks();
});

describe('positionPopover (pure placement)',()=>{
  const viewport={width:1000,height:800},popover={width:320,height:200};
  const anchor=(top:number,right:number)=>({top,bottom:top+24,left:right-24,right});
  it('opens below the anchor, right-aligned to it, when it fits',()=>{
    expect(positionPopover(anchor(100,984),popover,viewport)).toEqual({top:130,left:664,placement:'below'});
  });
  it('flips above when there is no room below',()=>{
    expect(positionPopover(anchor(700,984),popover,viewport)).toEqual({top:494,left:664,placement:'above'});
  });
  it('clamps to the left and right viewport edges with the default 8px margin',()=>{
    expect(positionPopover(anchor(100,100),popover,viewport).left).toBe(8);
    expect(positionPopover(anchor(100,1200),popover,viewport).left).toBe(672);
  });
  it('clamps to the top and bottom edges when it fits neither side',()=>{
    const result=positionPopover(anchor(140,500),{width:320,height:280},{width:1000,height:300});
    expect(result.placement).toBe('above');expect(result.top).toBe(8);
    expect(positionPopover(anchor(20,500),{width:320,height:900},{width:1000,height:800}).top).toBe(8);
  });
  it('honours a custom margin and a popover wider than the viewport',()=>{
    expect(positionPopover(anchor(100,100),popover,viewport,20).left).toBe(20);
    expect(positionPopover(anchor(100,200),{width:400,height:100},{width:300,height:800}).left).toBe(8);
  });
});

describe('TacticalHint beacon and popover',()=>{
  it('renders a localized, accessible beacon whose aria-expanded follows the popover',async()=>{
    await render(createElement(TacticalHint,{spec:SPEC}));
    const b=beacon()!;
    expect(b.tagName).toBe('BUTTON');expect(b.getAttribute('aria-label')).toBe('Help: Hub overview');
    expect(b.getAttribute('aria-expanded')).toBe('false');expect(popover()).toBeNull();
    await click(b);
    expect(b.getAttribute('aria-expanded')).toBe('true');
    const card=popover()!;
    expect(card.getAttribute('role')).toBe('dialog');expect(card.getAttribute('aria-modal')).toBe('false');
    expect(b.getAttribute('aria-controls')).toBe(card.id);
    expect(document.getElementById(card.getAttribute('aria-labelledby')!)?.textContent).toBe('Hub overview');
    expect(card.textContent).toContain(SPEC.bodyKey);
    expect(card.parentElement).toBe(document.body);
    expect(host.contains(card)).toBe(false);
  });
  it('is unseen until the popover is opened, then seen and persisted',async()=>{
    await render(createElement(TacticalHint,{spec:SPEC}));
    expect(beacon()!.getAttribute('data-state')).toBe('unseen');expect(useUiPrefsStore.getState().seenHints).toEqual({});
    await click(beacon()!);
    expect(beacon()!.getAttribute('data-state')).toBe('seen');
    expect(useUiPrefsStore.getState().seenHints['test.alpha']).toBe(true);
    expect(storedPrefs()?.state.seenHints['test.alpha']).toBe(true);
  });
  it('clicking the beacon again closes the popover',async()=>{
    await render(createElement(TacticalHint,{spec:SPEC}));
    await click(beacon()!);expect(popover()).not.toBeNull();
    await click(beacon()!);expect(popover()).toBeNull();expect(beacon()!.getAttribute('aria-expanded')).toBe('false');
  });
  it('Escape closes the popover and returns focus to the beacon',async()=>{
    await render(createElement(TacticalHint,{spec:SPEC}));
    await click(beacon()!);expect(popover()).not.toBeNull();
    await press('Escape');
    expect(popover()).toBeNull();expect(document.activeElement).toBe(beacon());
  });
  it('closes on an outside click',async()=>{
    await render(createElement(TacticalHint,{spec:SPEC}));
    await click(beacon()!);expect(popover()).not.toBeNull();
    await pointerOutside();expect(popover()).toBeNull();
  });
  it('closes when its parent unmounts',async()=>{
    await render(createElement(TacticalHint,{spec:SPEC}));
    await click(beacon()!);expect(popover()).not.toBeNull();
    await render(null);expect(popover()).toBeNull();
  });
  it('a different hint id (another tab) never keeps the previous popover open',async()=>{
    await render(createElement(TacticalHint,{spec:SPEC}));
    await click(beacon()!);expect(popover()).not.toBeNull();
    await render(createElement(TacticalHint,{spec:OTHER}));
    expect(popover()).toBeNull();expect(beacon()!.getAttribute('data-hint-id')).toBe('test.beta');
    expect(beacon()!.getAttribute('data-state')).toBe('unseen');
  });
  it('shows the optional secondary line only when the spec has one',async()=>{
    await render(createElement(TacticalHint,{spec:INTERNATIONAL_HINTS.finance}));
    await click(beacon()!);expect(popover()!.querySelector('.tactical-hint-more')?.textContent).toBe(INTERNATIONAL_HINTS.finance.learnMoreKey);
    await render(createElement(TacticalHint,{spec:SPEC}));
    await click(beacon()!);expect(popover()!.querySelector('.tactical-hint-more')).toBeNull();
  });
  it('exposes data-motion="reduced" when the user prefers reduced motion, and "full" otherwise',async()=>{
    await render(createElement(TacticalHint,{spec:SPEC}));expect(beacon()!.getAttribute('data-motion')).toBe('full');
    await act(async()=>{root.unmount();});
    root=createRoot(host);
    Object.defineProperty(window,'matchMedia',{configurable:true,writable:true,value:(query:string)=>({matches:query.includes('prefers-reduced-motion'),media:query,addEventListener:()=>undefined,removeEventListener:()=>undefined})});
    await render(createElement(TacticalHint,{spec:SPEC}));expect(beacon()!.getAttribute('data-motion')).toBe('reduced');
  });
});

describe('Do not show again, reset and the global switch',()=>{
  it('dismissing removes the beacon and the popover, and survives a reload',async()=>{
    await render(createElement(TacticalHint,{spec:SPEC}));
    await click(beacon()!);
    const checkbox=popover()!.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    expect(checkbox.parentElement?.textContent).toBe('Do not show this hint again');
    await click(checkbox);
    expect(beacon()).toBeNull();expect(popover()).toBeNull();
    expect(useUiPrefsStore.getState().dismissedHints['test.alpha']).toBe(true);
    const raw=localStorage.getItem(UI_PREFS_KEY)!;
    expect(storedPrefs()?.state.dismissedHints['test.alpha']).toBe(true);expect(storedPrefs()?.version).toBe(1);
    // Simulate a fresh page load: empty memory, same stored bytes, rehydrate.
    resetPrefs();localStorage.setItem(UI_PREFS_KEY,raw);
    await act(async()=>{await useUiPrefsStore.persist.rehydrate();});
    expect(useUiPrefsStore.getState().dismissedHints['test.alpha']).toBe(true);expect(beacon()).toBeNull();
  });
  it('resetHints restores dismissed and seen hints to unseen',async()=>{
    useUiPrefsStore.getState().markSeen('test.alpha');useUiPrefsStore.getState().dismiss('test.alpha');
    await render(createElement(TacticalHint,{spec:SPEC}));expect(beacon()).toBeNull();
    await act(async()=>{useUiPrefsStore.getState().resetHints();});
    expect(useUiPrefsStore.getState().seenHints).toEqual({});expect(useUiPrefsStore.getState().dismissedHints).toEqual({});
    expect(beacon()!.getAttribute('data-state')).toBe('unseen');
  });
  it('undismiss brings back a single hint',async()=>{
    useUiPrefsStore.getState().dismiss('test.alpha');useUiPrefsStore.getState().dismiss('test.beta');
    await act(async()=>{useUiPrefsStore.getState().undismiss('test.alpha');});
    expect(useUiPrefsStore.getState().dismissedHints).toEqual({'test.beta':true});
  });
  it('hintsEnabled=false hides every beacon, and turning it back on restores them',async()=>{
    await render(createElement('div',null,createElement(TacticalHint,{spec:SPEC}),createElement(TacticalHint,{spec:OTHER})));
    expect(host.querySelectorAll('.tactical-hint-beacon')).toHaveLength(2);
    await act(async()=>{useUiPrefsStore.getState().setHintsEnabled(false);});
    expect(host.querySelectorAll('.tactical-hint-beacon')).toHaveLength(0);
    await act(async()=>{useUiPrefsStore.getState().setHintsEnabled(true);});
    expect(host.querySelectorAll('.tactical-hint-beacon')).toHaveLength(2);
  });
  it('turning hints off while a popover is open closes it',async()=>{
    await render(createElement(TacticalHint,{spec:SPEC}));await click(beacon()!);expect(popover()).not.toBeNull();
    await act(async()=>{useUiPrefsStore.getState().setHintsEnabled(false);});
    expect(popover()).toBeNull();
  });
  it('Settings section toggles hints, resets them and confirms briefly',async()=>{
    useUiPrefsStore.getState().dismiss('test.alpha');useUiPrefsStore.getState().markSeen('test.beta');
    await render(createElement(TacticalHintOptions));
    const toggle=host.querySelector<HTMLInputElement>('.tactical-hint-toggle input')!;
    expect(toggle.checked).toBe(true);
    await click(toggle);expect(useUiPrefsStore.getState().hintsEnabled).toBe(false);
    await click(toggle);expect(useUiPrefsStore.getState().hintsEnabled).toBe(true);
    const status=host.querySelector('[role="status"]')!;expect(status.textContent).toBe('');
    const reset=Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Reset dismissed hints')!;
    await click(reset);
    expect(useUiPrefsStore.getState().dismissedHints).toEqual({});expect(useUiPrefsStore.getState().seenHints).toEqual({});
    expect(status.textContent).toBe('Dismissed hints restored.');
  });
});

describe('uiPrefsStore storage safety',()=>{
  it('falls back to memory when localStorage throws on every access',async()=>{
    safePrefsStorage.removeItem(UI_PREFS_KEY);
    vi.stubGlobal('localStorage',{getItem:()=>{throw new Error('blocked');},setItem:()=>{throw new Error('blocked');},removeItem:()=>{throw new Error('blocked');}});
    resetPrefs();
    await act(async()=>{await useUiPrefsStore.persist.rehydrate();});
    expect(useUiPrefsStore.getState().hintsEnabled).toBe(true);
    expect(()=>useUiPrefsStore.getState().dismiss('test.alpha')).not.toThrow();
    expect(useUiPrefsStore.getState().dismissedHints['test.alpha']).toBe(true);
    await render(createElement(TacticalHint,{spec:SPEC}));expect(beacon()).toBeNull();
    await render(createElement(TacticalHint,{spec:OTHER}));await click(beacon()!);expect(popover()).not.toBeNull();
  });
  it('loads defaults from corrupt or malformed stored values and keeps only valid flags',async()=>{
    const cases:[string,Record<string,true>][]=[
      ['{not json',{}],['null',{}],['"text"',{}],['{"state":null,"version":1}',{}],
      ['{"state":{"hintsEnabled":"yes","seenHints":{"a.b":1,"c.d":true},"dismissedHints":[]},"version":1}',{'c.d':true}],
    ];
    for(const [raw,seen] of cases){
      vi.stubGlobal('localStorage',{getItem:()=>raw,setItem:()=>undefined,removeItem:()=>undefined});
      resetPrefs();
      await act(async()=>{await useUiPrefsStore.persist.rehydrate();});
      const state=useUiPrefsStore.getState();
      expect(state.hintsEnabled,raw).toBe(true);expect(state.dismissedHints,raw).toEqual({});expect(state.seenHints,raw).toEqual(seen);
    }
    await render(createElement(TacticalHint,{spec:SPEC}));expect(beacon()).not.toBeNull();
  });
});

describe('Invariants: hints are UI preferences only',()=>{
  it('never changes game state, notifies the game store, or dispatches a command',async()=>{
    const dispatch=vi.fn(),dispatchWithReceipt=vi.fn();
    useGameStore.setState({dispatch,dispatchWithReceipt});
    const before=useGameStore.getState();let notified=0;
    const unsubscribe=useGameStore.subscribe(()=>{notified++;});
    try{
      await render(createElement('div',null,createElement(TacticalHint,{spec:SPEC}),createElement(TacticalHintOptions)));
      await click(beacon()!);await press('Escape');await click(beacon()!);
      await click(popover()!.querySelector<HTMLInputElement>('input[type="checkbox"]')!);
      await act(async()=>{useUiPrefsStore.getState().resetHints();});
      await act(async()=>{useUiPrefsStore.getState().setHintsEnabled(false);});
      await act(async()=>{useUiPrefsStore.getState().setHintsEnabled(true);});
      await click(Array.from(host.querySelectorAll('button')).find(b=>b.textContent==='Reset dismissed hints')!);
    }finally{unsubscribe();}
    expect(useGameStore.getState()).toBe(before);expect(notified).toBe(0);
    expect(dispatch).not.toHaveBeenCalled();expect(dispatchWithReceipt).not.toHaveBeenCalled();
  });
  const hintSources=import.meta.glob<string>(['../ui/hints/*.ts','../ui/hints/*.tsx'],{query:'?raw',import:'default',eager:true});
  it('keeps the hint module free of game store, engine and command imports',()=>{
    const entries=Object.entries(hintSources);expect(entries.length).toBeGreaterThanOrEqual(5);
    for(const [file,source] of entries)expect(source,file).not.toMatch(/gameStore|dispatchWithReceipt|\/engine\/|domain\/commands|persistence\//);
  });
  it('keeps positionPopover free of DOM access',()=>{
    const source=hintSources['../ui/hints/positionPopover.ts'];
    expect(source).toBeDefined();expect(source).not.toMatch(/\b(document|window|navigator|getBoundingClientRect)\b/);
  });
});

describe('Window chrome and the International Affairs pilot',()=>{
  beforeEach(()=>{useGameStore.setState({...ready(),activeTool:null,workspaceTrail:[],navigation:null,actionReceipt:null});});
  it('CommandWindow puts the beacon right before the close button and is unchanged without a hint',async()=>{
    await render(createElement(CommandWindow,{kicker:'K',title:'T',onClose:()=>undefined,hint:SPEC,children:'body'}));
    const close=document.querySelector('.command-window-header [data-guide="close-workspace"]')!;
    expect(close.previousElementSibling?.classList.contains('tactical-hint-beacon')).toBe(true);
    await render(createElement(CommandWindow,{kicker:'K',title:'T',onClose:()=>undefined,children:'body'}));
    expect(document.querySelector('.tactical-hint-beacon')).toBeNull();
    expect(Array.from(document.querySelector('.command-window-header')!.children).map(c=>c.tagName)).toEqual(['DIV','BUTTON']);
  });
  it('ExecutiveWorkspaceShell puts the beacon right before the close button and is unchanged without a hint',async()=>{
    const props={id:'tactical-hint-shell',title:'T',onClose:()=>undefined,active:true};
    await render(createElement(ExecutiveWorkspaceShell,{...props,hint:SPEC,children:'body'}));
    const close=document.querySelector('.executive-header [data-guide="close-workspace"]')!;
    expect(close.previousElementSibling?.classList.contains('tactical-hint-beacon')).toBe(true);
    await render(createElement(ExecutiveWorkspaceShell,{...props,children:'body'}));
    expect(document.querySelector('.tactical-hint-beacon')).toBeNull();
    expect(Array.from(document.querySelector('.executive-header')!.children).map(c=>c.tagName)).toEqual(['SPAN','DIV']);
    expect(Array.from(document.querySelector('.executive-header .header-actions')!.children).map(c=>c.tagName)).toEqual(['SPAN','BUTTON']);
  });
  it('DraggableWindow puts the beacon right before the close button and is unchanged without a hint',async()=>{
    const props={id:'tactical-hint-drag',title:'T',kicker:'K',onClose:()=>undefined};
    await render(createElement(DraggableWindow,{...props,hint:SPEC,children:'body'}));
    const close=document.querySelector('.floating-command-header [data-guide="close-workspace"]')!;
    expect(close.previousElementSibling?.classList.contains('tactical-hint-beacon')).toBe(true);
    await render(createElement(DraggableWindow,{...props,children:'body'}));
    expect(document.querySelector('.tactical-hint-beacon')).toBeNull();
    expect(Array.from(document.querySelector('.floating-command-header>div')!.children).map(c=>c.tagName)).toEqual(['EM','BUTTON']);
  });
  it('a click inside the popover does not start a window drag or dismiss the window',async()=>{
    const onClose=vi.fn();
    await render(createElement(DraggableWindow,{id:'tactical-hint-drag2',title:'T',kicker:'K',onClose,hint:SPEC,children:'body'}));
    await click(document.querySelector<HTMLButtonElement>('.tactical-hint-beacon')!);
    const card=popover()!;
    const down=new MouseEvent('mousedown',{bubbles:true,cancelable:true});
    await act(async()=>{card.dispatchEvent(down);});
    expect(onClose).not.toHaveBeenCalled();expect(popover()).not.toBeNull();
  });
  it('shows exactly one hint per hub tab in the hub header, switching with the tab',async()=>{
    await render(createElement(InternationalAffairsWorkspace));
    for(const item of INTERNATIONAL_TABS){
      await click(Array.from(host.querySelectorAll('button')).find(b=>b.textContent?.trim()===item.label)!);
      const beacons=host.querySelectorAll('.ia-header .tactical-hint-beacon');
      expect(beacons,item.id).toHaveLength(1);expect(host.querySelectorAll('.tactical-hint-beacon')).toHaveLength(1);
      expect(beacons[0].getAttribute('data-hint-id')).toBe(INTERNATIONAL_HINTS[item.id].id);
    }
    expect(Object.values(INTERNATIONAL_HINTS).map(h=>h.id).sort()).toEqual(['intl.finance','intl.markets','intl.overview','intl.resolutions','intl.sanctions']);
  });
  it('removes the five tab-level footnotes from every hub tab but keeps in-card text',async()=>{
    await render(createElement(InternationalAffairsWorkspace));
    for(const item of INTERNATIONAL_TABS){
      await click(Array.from(host.querySelectorAll('button')).find(b=>b.textContent?.trim()===item.label)!);
      for(const note of REMOVED_NOTES)expect(host.textContent,`${item.id}: ${note}`).not.toContain(note);
    }
    await click(Array.from(host.querySelectorAll('button')).find(b=>b.textContent?.trim()==='Resolutions & Voting')!);
    expect(host.querySelector('.ia-composer')).not.toBeNull();
  });
});

describe('Locale coverage (en, tr, es, zh, ru)',()=>{
  const specs=Object.values(INTERNATIONAL_HINTS);
  const keys=[
    ...specs.flatMap(s=>[s.titleKey,s.bodyKey,...(s.learnMoreKey?[s.learnMoreKey]:[])]),
    'Tactical hints','Show tactical hints','Reset dismissed hints','Dismissed hints restored.',
    'Short explanations appear behind a ? beacon in window headers.','Do not show this hint again',
  ];
  it('every hub hint and settings string has a distinct tr, es, zh and ru translation',()=>{
    for(const key of keys){
      const row=UI_CATALOG_HINTS[key];expect(row,key).toBeDefined();expect(row).toHaveLength(4);
      ['tr','es','zh','ru'].forEach((language,index)=>{
        const translated=translateText(language,key);
        expect(translated.trim().length,`${language}: ${key}`).toBeGreaterThan(0);
        expect(translated,`${language}: ${key}`).not.toBe(key);
        expect(translated,`${language}: ${key}`).toBe(row[index]);
      });
    }
  });
  it('the beacon label template resolves in every language and stays English in en',()=>{
    expect(formatText('en','Help: {0}',['Hub overview'])).toBe('Help: Hub overview');
    expect(formatText('tr','Help: {0}',['Hub overview'])).toBe('Yardım: Merkez genel bakışı');
    expect(formatText('es','Help: {0}',['Hub overview'])).toBe('Ayuda: Resumen del centro');
    expect(formatText('zh','Help: {0}',['Hub overview'])).toBe('帮助：中心概览');
    expect(formatText('ru','Help: {0}',['Hub overview'])).toBe('Справка: Обзор центра');
  });
  it('no catalog row is empty and hint ids are namespaced and unique',()=>{
    for(const [key,row] of Object.entries(UI_CATALOG_HINTS))for(const value of row)expect(value.trim().length,key).toBeGreaterThan(0);
    const ids=specs.map(s=>s.id);expect(new Set(ids).size).toBe(ids.length);
    for(const id of ids)expect(id).toMatch(/^[a-z]+\.[a-z]+$/);
  });
});

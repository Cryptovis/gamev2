// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {act,createElement,type ReactNode} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {DEFAULT_UI_PREFS,UI_PREFS_KEY,safePrefsStorage,useUiPrefsStore} from '../ui/hints/uiPrefsStore';
import {PRODUCTION_DOCTRINE_HINT,RANKING_HINTS} from '../ui/hints/registry';
import {WorldRankingsWindow} from '../ui/panels/WorldRankingsWindow';
import {CountrySectionFrame} from '../ui/panels/CountrySectionFrame';
import {useGameStore} from '../store/gameStore';
import {makeInitialState} from '../data/initialState';
import {recordEconomicHistory} from '../engine/systems/economicHistory';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});

let host:HTMLDivElement,root:Root;
const render=async(node:ReactNode)=>{await act(async()=>{root.render(node);});};
const click=async(element:Element)=>{await act(async()=>{(element as HTMLElement).click();});};
const beacon=()=>document.querySelector<HTMLButtonElement>('.tactical-hint-beacon');
const popover=()=>document.querySelector<HTMLElement>('.tactical-hint-popover');
const stored=()=>JSON.parse(localStorage.getItem(UI_PREFS_KEY)??'null') as {state:{dismissedHints:Record<string,true>}}|null;

beforeEach(()=>{
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
  safePrefsStorage.removeItem(UI_PREFS_KEY);localStorage.clear();
  useUiPrefsStore.setState({...DEFAULT_UI_PREFS,seenHints:{},dismissedHints:{}});
  const s=makeInitialState();
  s.playerProfile={...s.playerProfile,language:'en',setupComplete:true};
  s.speed=0;s.eventCooldownUntil=10000;s.advisorCooldownUntil=10000;s.world.tutorial.active=false;
  useGameStore.setState({...recordEconomicHistory(s),activeTool:null,workspaceTrail:[],navigation:null,actionReceipt:null});
});
afterEach(async()=>{await act(async()=>{root.unmount();});host.remove();document.querySelectorAll('.tactical-hint-popover').forEach(n=>n.remove());});

describe('migrated window hints (mounted)',()=>{
  it('hint-prop window: rankings beacon follows the ranking kind, shows the body, and dismissal persists',async()=>{
    await render(createElement(WorldRankingsWindow));
    expect(document.querySelectorAll('.tactical-hint-beacon')).toHaveLength(1);
    expect(document.body.textContent).not.toContain(RANKING_HINTS.military.bodyKey);
    expect(beacon()!.getAttribute('data-hint-id')).toBe('rankings.military');
    await click(beacon()!);
    expect(popover()!.textContent).toContain(RANKING_HINTS.military.bodyKey);
    const financial=Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.includes('Financial ranking'))!;
    await click(financial);
    expect(popover()).toBeNull();
    expect(beacon()!.getAttribute('data-hint-id')).toBe('rankings.financial');
    await click(beacon()!);
    expect(popover()!.textContent).toContain(RANKING_HINTS.financial.bodyKey);
    await click(popover()!.querySelector('input[type="checkbox"]')!);
    expect(beacon()).toBeNull();expect(popover()).toBeNull();
    expect(useUiPrefsStore.getState().dismissedHints['rankings.financial']).toBe(true);
    expect(stored()!.state.dismissedHints['rankings.financial']).toBe(true);
  });
  it('section frame forwards the hint to both shells, placing the beacon right before the close button',async()=>{
    for(const centered of [true,false]){
      await render(createElement(CountrySectionFrame,{expanded:true,wideSection:false,title:'Production',centered,onClose:()=>undefined,hint:PRODUCTION_DOCTRINE_HINT,children:'body'}));
      expect(document.querySelectorAll('.tactical-hint-beacon')).toHaveLength(1);
      const close=document.querySelector('#country-section-window [data-guide="close-workspace"]')!;
      expect(close.previousElementSibling?.classList.contains('tactical-hint-beacon')).toBe(true);
      expect(beacon()!.getAttribute('data-hint-id')).toBe('production.doctrine');
      await click(beacon()!);
      expect(Array.from(popover()!.querySelectorAll('.tactical-hint-body')).map(p=>p.textContent)).toEqual([PRODUCTION_DOCTRINE_HINT.bodyKey]);
      await click(popover()!.querySelector('input[type="checkbox"]')!);
      expect(stored()!.state.dismissedHints['production.doctrine']).toBe(true);
      expect(document.querySelector('.tactical-hint-beacon')).toBeNull();
      useUiPrefsStore.setState({...DEFAULT_UI_PREFS,seenHints:{},dismissedHints:{}});
    }
  });
  it('extraKeys render as consecutive paragraphs after the body',async()=>{
    const {TacticalHint}=await import('../ui/hints/TacticalHint');
    const {WAR_TACTICAL_HINT}=await import('../ui/hints/registry');
    await render(createElement(TacticalHint,{spec:WAR_TACTICAL_HINT}));
    await click(beacon()!);
    const paragraphs=Array.from(popover()!.querySelectorAll('.tactical-hint-body')).map(p=>p.textContent);
    expect(paragraphs).toEqual([WAR_TACTICAL_HINT.bodyKey,...WAR_TACTICAL_HINT.extraKeys!]);
  });
});

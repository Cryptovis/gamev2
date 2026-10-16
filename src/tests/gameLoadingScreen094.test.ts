// @vitest-environment happy-dom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {GameLoadingScreen,type GameLoadingScreenProps} from '../ui/panels/landing/GameLoadingScreen';
import {PRELOAD_STAGE_ORDER} from '../ui/loading/preloadPipeline';
import {useGameStore} from '../store/gameStore';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let host:HTMLDivElement,root:Root;
beforeEach(()=>{host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>{root.unmount();});host.remove();});

const props=(extra:Partial<GameLoadingScreenProps>={}):GameLoadingScreenProps=>({language:'en',percent:0,stage:'hydrate',error:null,onReturnToMenu:vi.fn(),...extra});
const show=async(p:GameLoadingScreenProps)=>{useGameStore.setState(s=>({playerProfile:{...s.playerProfile,language:p.language}}));await act(async()=>{root.render(createElement(GameLoadingScreen,p));});};
const byId=(id:string)=>host.querySelector(`[data-testid="${id}"]`) as HTMLElement|null;

describe('GameLoadingScreen progress',()=>{
  it('shows the percentage, a gauge and the stage label',async()=>{
    await show(props({percent:42,stage:'graphics'}));
    expect(byId('loading-progress-percentage')!.textContent).toBe('42%');
    const gauge=host.querySelector('[role="progressbar"]')!;
    expect(gauge.getAttribute('aria-valuenow')).toBe('42');
    expect(gauge.getAttribute('aria-valuemin')).toBe('0');
    expect(gauge.getAttribute('aria-valuemax')).toBe('100');
    expect((host.querySelector('.l94-gauge-fill') as HTMLElement).style.width).toBe('42%');
    expect(byId('loading-stage-label')!.textContent).toBe('Pre-decoding vector graphics…');
  });
  it('rounds and clamps what it is given',async()=>{
    await show(props({percent:99.6}));
    expect(byId('loading-progress-percentage')!.textContent).toBe('100%');
    await show(props({percent:-5}));
    expect(byId('loading-progress-percentage')!.textContent).toBe('0%');
    await show(props({percent:250}));
    expect(byId('loading-progress-percentage')!.textContent).toBe('100%');
  });
  it('names a different stage for each step and for the hand-off',async()=>{
    const labels=new Set<string>();
    for(const stage of [...PRELOAD_STAGE_ORDER,'handoff'] as const){await show(props({stage}));labels.add(byId('loading-stage-label')!.textContent!);}
    expect(labels.size).toBe(5);
  });
  it('marks finished, current and waiting steps',async()=>{
    await show(props({stage:'indexes'}));
    expect([...host.querySelectorAll('.l94-loading-steps li')].map(li=>li.getAttribute('data-state'))).toEqual(['done','done','active','todo']);
    await show(props({stage:'handoff'}));
    expect([...host.querySelectorAll('.l94-loading-steps li')].map(li=>li.getAttribute('data-state'))).toEqual(['done','done','done','done']);
  });
  it('announces the stage politely and keeps the number out of the live region',async()=>{
    await show(props());
    expect(byId('loading-stage-label')!.getAttribute('aria-live')).toBe('polite');
    expect(byId('loading-progress-percentage')!.closest('[aria-live]')).toBeNull();
  });
  it('shows a leadership quote in the loading variant',async()=>{
    await show(props());
    const widget=host.querySelector('[data-testid="wisdom-widget"]')!;
    expect(widget.getAttribute('data-variant')).toBe('loading');
    expect(widget.getAttribute('data-quote-id')).toBeTruthy();
  });
  it('translates the stage label into every language',async()=>{
    const seen=new Set<string>();
    for(const language of ['en','tr','es','zh','ru'] as const){await show(props({language,stage:'indexes'}));seen.add(byId('loading-stage-label')!.textContent!);}
    expect(seen.size).toBe(5);
  });
});

describe('GameLoadingScreen failure',()=>{
  it('shows the error, hides the gauge and returns to the menu from the button',async()=>{
    const onReturnToMenu=vi.fn();
    await show(props({error:'unknown',percent:30,onReturnToMenu}));
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    expect(host.querySelector('[role="progressbar"]')).toBeNull();
    expect(byId('loading-progress-percentage')).toBeNull();
    await act(async()=>{byId('loading-return')!.click();});
    expect(onReturnToMenu).toHaveBeenCalledTimes(1);
  });
  it('explains an unreadable or incompatible save and says nothing more for other causes',async()=>{
    await show(props({error:'corrupt'}));
    expect(byId('game-loading')!.textContent).toContain('This save could not be read');
    await show(props({error:'incompatible_version'}));
    expect(byId('game-loading')!.textContent).toContain('This save is from an incompatible version');
    await show(props({error:'missing'}));
    expect(host.querySelector('.l94-loading-reason')).toBeNull();
  });
  it('keeps the quote visible on the error screen',async()=>{
    await show(props({error:'missing'}));
    expect(host.querySelector('[data-testid="wisdom-widget"]')).not.toBeNull();
  });
});

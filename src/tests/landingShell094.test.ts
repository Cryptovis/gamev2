// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {LandingShell} from '../ui/panels/landing/LandingShell';
import type {LandingShellDeps,LandingSession} from '../ui/panels/landing/landingDeps';
import type {SaveSummaryState} from '../persistence/saveSummary';
import {useGameStore} from '../store/gameStore';
import {buildPreloadStages,type PreloadServices} from '../ui/loading/preloadStages';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let host:HTMLDivElement,root:Root;
const READY:SaveSummaryState={status:'ready',summary:{slotId:'slot-1',countryId:'USA',countryName:'United States',iso2:'US',leaderName:'A. Leader',campaignDay:42,campaignDateIso:'2031-04-09',savedAt:1_700_000_000_000}};
const EMPTY:SaveSummaryState={status:'none'};

const services=(loadLatest:()=>Promise<boolean>):PreloadServices=>({
  loadLatest,inspectState:()=>({ok:true}),assets:[],decodeAsset:async()=>{},languages:['en'],translate:(_l,key)=>key,countryCount:()=>1,
  fontsReady:async()=>{},audioState:()=>'ready',yieldToBrowser:async()=>{},
});
const makeDeps=(over:Partial<LandingShellDeps>={}):LandingShellDeps&{calls:string[]}=>{
  const calls:string[]=[];
  let session:LandingSession=null;
  const deps:LandingShellDeps&{calls:string[]}={calls,
    readSession:()=>session,
    ensureGuest:()=>{calls.push('ensureGuest');session={kind:'guest',username:'guest'};},
    peekSummary:async()=>EMPTY,
    resetCampaign:()=>{calls.push('reset');useGameStore.setState(s=>({playerProfile:{...s.playerProfile,setupComplete:false}}));},
    loadLatest:async()=>true,
    buildPreloadStages:intent=>buildPreloadStages(intent,services(()=>deps.loadLatest())),
    handoffMs:0,
    setLanguage:next=>{calls.push(`lang:${next}`);useGameStore.setState(s=>({playerProfile:{...s.playerProfile,language:next}}));},
    ...over};
  return deps;
};
const Setup=({onReturnToMenu}:{onReturnToMenu():void})=>createElement('div',{'data-testid':'fake-setup'},createElement('button',{'data-testid':'fake-setup-back',onClick:onReturnToMenu}),createElement('button',{'data-testid':'fake-setup-commit',onClick:()=>useGameStore.setState(s=>({playerProfile:{...s.playerProfile,setupComplete:true}}))}));

const lastCall=(fn:ReturnType<typeof vi.fn>)=>fn.mock.calls[fn.mock.calls.length-1];
const flush=async()=>{for(let i=0;i<4;i++)await act(async()=>{await new Promise(r=>setTimeout(r,0));});};
const byId=(id:string)=>host.querySelector(`[data-testid="${id}"]`) as HTMLElement|null;
const click=async(id:string)=>{await act(async()=>{byId(id)!.click();});await flush();};
const mount=async(deps:LandingShellDeps,onPlaying=vi.fn())=>{await act(async()=>{root.render(createElement(LandingShell,{deps,onPlaying,Setup}));});await flush();return onPlaying;};

beforeEach(()=>{
  localStorage.clear();sessionStorage.clear();
  useGameStore.setState(s=>({setSpeed:vi.fn(),playerProfile:{...s.playerProfile,language:'en',setupComplete:false}}) as never);
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
});
afterEach(async()=>{await act(async()=>{root.unmount();});host.remove();});

describe('LandingShell boot',()=>{
  it('shows the landing screen once the session and save lookup have resolved',async()=>{
    await mount(makeDeps());
    expect(byId('landing-root')?.getAttribute('data-screen')).toBe('landing');
  });
  it('offers Play now with no save and Continue when a save is ready',async()=>{
    await mount(makeDeps());
    expect(host.textContent).toContain('Play now');
    await act(async()=>{root.unmount();});root=createRoot(host);
    await mount(makeDeps({peekSummary:async()=>READY}));
    expect(host.textContent).toContain('Continue campaign');
  });
  it('does not touch the page if it is removed before the lookups finish',async()=>{
    let release:(v:SaveSummaryState)=>void=()=>{};
    const deps=makeDeps({peekSummary:()=>new Promise(r=>{release=r;})});
    await act(async()=>{root.render(createElement(LandingShell,{deps,onPlaying:vi.fn(),Setup}));});
    await act(async()=>{root.unmount();});
    release(EMPTY);await flush();
    root=createRoot(host);
  });
});

describe('LandingShell flow',()=>{
  it('Play now creates a guest, resets the campaign and opens setup',async()=>{
    const deps=makeDeps();
    await mount(deps);
    await click('landing-hero');
    expect(deps.calls).toEqual(['ensureGuest','reset']);
    expect(byId('fake-setup')).not.toBeNull();
  });
  it('going back from setup returns to the landing screen',async()=>{
    await mount(makeDeps());
    await click('landing-hero');
    await click('fake-setup-back');
    expect(byId('landing-root')?.getAttribute('data-screen')).toBe('landing');
  });
  it('committing setup hands off to the game and reports playing',async()=>{
    const onPlaying=await mount(makeDeps());
    await click('landing-hero');
    await click('fake-setup-commit');
    expect(byId('landing-root')).toBeNull();
    expect(lastCall(onPlaying)).toEqual([true]);
  });
  it('leaving the campaign from the game returns to the landing screen and pauses',async()=>{
    const onPlaying=await mount(makeDeps());
    await click('landing-hero');
    await click('fake-setup-commit');
    await act(async()=>{useGameStore.setState(s=>({playerProfile:{...s.playerProfile,setupComplete:false}}));});
    await flush();
    expect(byId('landing-root')?.getAttribute('data-screen')).toBe('landing');
    expect(lastCall(onPlaying)).toEqual([false]);
    expect((useGameStore.getState() as never as {setSpeed:{mock:{calls:unknown[][]}}}).setSpeed.mock.calls.at(-1)).toEqual([0]);
  });
  it('Continue loads the latest save and enters the game',async()=>{
    const loadLatest=vi.fn(async()=>{useGameStore.setState(s=>({playerProfile:{...s.playerProfile,setupComplete:true}}));return true;});
    const onPlaying=await mount(makeDeps({peekSummary:async()=>READY,loadLatest}));
    await click('save-card-continue');
    expect(loadLatest).toHaveBeenCalledTimes(1);
    expect(lastCall(onPlaying)).toEqual([true]);
  });
  it('with a save, Continue lives only on the save card and the menu offers New campaign instead',async()=>{
    await mount(makeDeps({peekSummary:async()=>READY}));
    expect(byId('landing-hero')).toBeNull();
    expect(byId('landing-menu')!.getAttribute('data-action')).toBe('continue');
    expect(host.textContent!.match(/Continue campaign/g)?.length).toBe(1);
    expect(byId('landing-new-campaign')).not.toBeNull();
  });
  it('a failed load shows the error with a way back, and the way back works',async()=>{
    await mount(makeDeps({peekSummary:async()=>READY,loadLatest:async()=>false}));
    await click('save-card-continue');
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    await click('loading-return');
    expect(byId('landing-root')?.getAttribute('data-screen')).toBe('landing');
  });
  it('a load that throws is treated as a failure, not left spinning',async()=>{
    await mount(makeDeps({peekSummary:async()=>READY,loadLatest:async()=>{throw new Error('boom');}}));
    await click('save-card-continue');
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
  });
});

describe('LandingShell loading screen',()=>{
  it('shows 100% and the hand-off label before the game appears',async()=>{
    await mount(makeDeps({handoffMs:150}));
    await click('landing-hero');
    await click('fake-setup-commit');
    expect(byId('loading-progress-percentage')?.textContent).toBe('100%');
    expect(byId('loading-stage-label')?.textContent).toBe('Handing over command…');
    await act(async()=>{await new Promise(r=>setTimeout(r,250));});
    expect(byId('loading-progress-percentage')).toBeNull();
    expect(byId('landing-root')).toBeNull();
  });
  it('names the cause when the loaded campaign does not look sound',async()=>{
    const deps=makeDeps({peekSummary:async()=>READY});
    deps.buildPreloadStages=intent=>buildPreloadStages(intent,{...services(async()=>true),inspectState:()=>({ok:false,reason:'corrupt'})});
    await mount(deps);
    await click('save-card-continue');
    expect(byId('loading-error')).not.toBeNull();
    expect(byId('game-loading')?.textContent).toContain('This save could not be read');
  });
  it('runs the stages once per load, not once per render',async()=>{
    let calls=0;
    const deps=makeDeps({peekSummary:async()=>READY,loadLatest:async()=>{calls++;return true;},handoffMs:200});
    await mount(deps);
    await click('save-card-continue');
    expect(calls).toBe(1);
    await act(async()=>{await new Promise(r=>setTimeout(r,300));});
    expect(calls).toBe(1);
  });
});

describe('LandingShell overlays and dock',()=>{
  it('opens and closes the release notes',async()=>{
    await mount(makeDeps());
    await click('dock-release-notes');
    expect(byId('release-notes-modal')).not.toBeNull();
    await click('release-notes-close');
    expect(byId('release-notes-modal')).toBeNull();
  });
  it('changing language goes through the store and relabels the screen',async()=>{
    const deps=makeDeps();
    await mount(deps);
    await click('dock-language-tr');
    expect(deps.calls).toContain('lang:tr');
    expect(byId('landing-root')?.getAttribute('lang')).toBe('tr');
  });
  it('opens the Player Profile drawer from its card and shows the Coming soon notice for each social sign-in',async()=>{
    await mount(makeDeps());
    expect(byId('profile-drawer')).toBeNull();
    await click('landing-dossier');
    expect(byId('profile-drawer')).not.toBeNull();
    expect(byId('social-toast')!.textContent).toBe('');
    for(const provider of ['google','apple','facebook']){
      await click(`social-${provider}`);
      expect(byId('social-toast')!.textContent,provider).toBe('Coming soon');
      expect(byId('social-toast')!.getAttribute('role')).toBe('status');
    }
  });
  it('centres the saves note and carries the company notice in the footer',async()=>{
    await mount(makeDeps());
    const footer=host.querySelector('footer.l94-footer') as HTMLElement;
    expect(footer.textContent).toContain('Saves are stored per profile on this device');
    expect(footer.textContent).toContain('RON Interactive © 2026. All rights reserved.');
    expect(footer.querySelector('[translate="no"]')!.textContent).toBe('RON Interactive © 2026.');
  });
  it('shows Last campaign beside the three action cards and keeps the quote below them',async()=>{
    await mount(makeDeps({peekSummary:async()=>READY}));
    const items=[...host.querySelectorAll('.l94-action-cards>li')];
    expect(items).toHaveLength(4);
    expect(items[0].querySelector('[data-testid="save-card"]')).not.toBeNull();
    const cards=host.querySelector('.l94-action-cards')!,quote=host.querySelector('[data-testid="wisdom-widget"]')!;
    expect(cards.compareDocumentPosition(quote)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(host.querySelector('.l94-side')).toBeNull();
  });
});

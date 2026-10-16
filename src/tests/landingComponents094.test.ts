// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement,type ReactElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {HeroBrand} from '../ui/panels/landing/HeroBrand';
import {CommandMenu,type CommandMenuProps} from '../ui/panels/landing/CommandMenu';
import {SaveGameCard,type SaveGameCardProps} from '../ui/panels/landing/SaveGameCard';
import {UtilityDock,type UtilityDockProps} from '../ui/panels/landing/UtilityDock';
import {LandingBackdrop} from '../ui/panels/landing/LandingBackdrop';
import {UI_CATALOG_LANDING} from '../i18n/uiCatalogLanding';
import type {SaveSummary,SaveSummaryState} from '../persistence/saveSummary';
import type {GameLanguage} from '../domain/game';
import type {HeroAction} from '../ui/landing/heroAction';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let host:HTMLDivElement,root:Root;
beforeEach(()=>{host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>{root.unmount();});host.remove();});
const show=async(element:ReactElement)=>{await act(async()=>{root.render(element);});};
const q=(selector:string)=>host.querySelector(selector) as HTMLElement|null;
const byId=(id:string)=>q(`[data-testid="${id}"]`);
const click=async(id:string)=>{await act(async()=>{byId(id)!.click();});};
const TR=(key:string)=>UI_CATALOG_LANDING[key][0];

describe('HeroBrand',()=>{
 it('shows the kicker, the untranslatable title, the tagline and the version',async()=>{
  await show(createElement(HeroBrand,{language:'en',version:'1.0.0'}));
  expect(q('.l94-eyebrow')!.textContent).toContain('Grand Strategy');
  expect(q('h1')!.textContent).toBe('Rule of Nations');
  expect(q('h1')!.getAttribute('translate')).toBe('no');
  expect(q('h1')!.id).toBe('landing-title');
  expect(q('.l94-lede')!.textContent).toBe('Be the president you have always dreamed of.');
  expect(q('.l94-version')!.textContent).toBe('v1.0.0');
 });
 it('adds the build only when one is given',async()=>{
  await show(createElement(HeroBrand,{language:'en',version:'1.0.0',buildId:'abc123'}));
  expect(q('.l94-version')!.textContent).toBe('v1.0.0 · build abc123');
 });
 it('translates the kicker and tagline but never the title',async()=>{
  await show(createElement(HeroBrand,{language:'tr',version:'1.0.0'}));
  expect(q('.l94-eyebrow')!.textContent).toContain(TR('Grand Strategy'));
  expect(q('h1')!.textContent).toBe('Rule of Nations');
  expect(q('.l94-lede')!.textContent).not.toBe('Be the president you have always dreamed of.');
 });
});

describe('CommandMenu',()=>{
 const spies=()=>({onPlayNow:vi.fn(),onNewCampaign:vi.fn(),onContinue:vi.fn(),onOpenDossier:vi.fn()});
 const props=(heroAction:HeroAction,extra:Partial<CommandMenuProps>={}):CommandMenuProps=>({language:'en',heroAction,busy:false,...spies(),...extra});
 it('labels the hero button for each action and marks it for tests',async()=>{
  const labels:Record<HeroAction,string>={play_now:'Play now',continue:'Continue campaign',new_campaign:'New campaign'};
  for(const action of Object.keys(labels) as HeroAction[]){
   await show(createElement(CommandMenu,props(action)));
   expect(byId('landing-hero')!.textContent,action).toBe(labels[action]);
   expect(byId('landing-hero')!.getAttribute('data-action')).toBe(action);
  }
 });
 it('runs the callback that matches the hero action',async()=>{
  const p=props('play_now');await show(createElement(CommandMenu,p));await click('landing-hero');expect(p.onPlayNow).toHaveBeenCalledTimes(1);
  const c=props('continue');await show(createElement(CommandMenu,c));await click('landing-hero');expect(c.onContinue).toHaveBeenCalledTimes(1);
  const n=props('new_campaign');await show(createElement(CommandMenu,n));await click('landing-hero');expect(n.onNewCampaign).toHaveBeenCalledTimes(1);
 });
 it('shows the no-account note only for Play now',async()=>{
  await show(createElement(CommandMenu,props('play_now')));expect(q('.l94-cta-note')!.textContent).toBe('No account needed');
  await show(createElement(CommandMenu,props('continue')));expect(q('.l94-cta-note')).toBeNull();
 });
 it('lists New campaign beside Play now and Continue but not when the hero already is New campaign',async()=>{
  for(const action of ['play_now','continue'] as const){await show(createElement(CommandMenu,props(action)));expect(byId('landing-new-campaign'),action).not.toBeNull();}
  await show(createElement(CommandMenu,props('new_campaign')));expect(byId('landing-new-campaign')).toBeNull();
 });
 it('starts a new campaign and opens the dossier from the list',async()=>{
  const p=props('play_now');await show(createElement(CommandMenu,p));
  await click('landing-new-campaign');await click('landing-dossier');
  expect(p.onNewCampaign).toHaveBeenCalledTimes(1);expect(p.onOpenDossier).toHaveBeenCalledTimes(1);
 });
 it('keeps Historical scenarios focusable but inert, with a Coming soon badge',async()=>{
  const onOpenScenarios=vi.fn();await show(createElement(CommandMenu,props('play_now',{onOpenScenarios})));
  const button=byId('landing-scenarios')!;
  expect(button.getAttribute('aria-disabled')).toBe('true');expect((button as HTMLButtonElement).disabled).toBe(false);
  expect(button.textContent).toContain('Historical scenarios');expect(button.querySelector('.l94-badge')!.textContent).toBe('Coming soon');
  await click('landing-scenarios');expect(onOpenScenarios).not.toHaveBeenCalled();
 });
 it('opens scenarios once they are enabled and drops the badge',async()=>{
  const onOpenScenarios=vi.fn();await show(createElement(CommandMenu,props('play_now',{onOpenScenarios,scenariosEnabled:true})));
  expect(byId('landing-scenarios')!.getAttribute('aria-disabled')).toBeNull();expect(q('.l94-badge')).toBeNull();
  await click('landing-scenarios');expect(onOpenScenarios).toHaveBeenCalledTimes(1);
 });
 it('holds the hero button while busy so a second click cannot start a second load',async()=>{
  const c=props('continue',{busy:true});await show(createElement(CommandMenu,c));
  expect((byId('landing-hero') as HTMLButtonElement).disabled).toBe(true);expect(byId('landing-hero')!.getAttribute('aria-busy')).toBe('true');
  await click('landing-hero');expect(c.onContinue).not.toHaveBeenCalled();
 });
 it('uses the menu label and wording of the current language',async()=>{
  await show(createElement(CommandMenu,props('play_now',{language:'tr'})));
  expect(q('nav')!.getAttribute('aria-label')).toBe(TR('Main menu'));
  expect(byId('landing-hero')!.textContent).toBe(TR('Play now'));
  expect(byId('landing-dossier')!.textContent).toBe(TR('Commander dossier'));
 });
});

const SUMMARY:SaveSummary={slotId:'manual-1',countryId:'TUR',countryName:'Turkey',iso2:'TR',leaderName:'Ada Lovelace',campaignDay:45,campaignDateIso:'2026-02-14',savedAt:Date.UTC(2026,5,12,12)};
const NOW=Date.UTC(2026,5,15,12);
describe('SaveGameCard',()=>{
 const card=(state:SaveSummaryState,extra:Partial<SaveGameCardProps>={}):SaveGameCardProps=>({language:'en',state,loadError:null,busy:false,onContinue:vi.fn(),now:NOW,...extra});
 it('marks its state for tests',async()=>{
  const states:SaveSummaryState[]=[{status:'loading'},{status:'none'},{status:'ready',summary:SUMMARY},{status:'unreadable',reason:'corrupt'}];
  for(const state of states){await show(createElement(SaveGameCard,card(state)));expect(byId('save-card')!.getAttribute('data-state')).toBe(state.status);}
 });
 it('hides Continue while loading and announces nothing alarming',async()=>{
  await show(createElement(SaveGameCard,card({status:'loading'})));
  expect(byId('save-card-continue')).toBeNull();expect(byId('save-card')!.getAttribute('aria-busy')).toBe('true');
 });
 it('shows flag, country, leader, date, day and saved time for a readable save',async()=>{
  await show(createElement(SaveGameCard,card({status:'ready',summary:SUMMARY})));
  const text=byId('save-card')!.textContent!;
  expect(text).toContain('Turkey');expect(text).toContain('🇹🇷');expect(text).toContain('Ada Lovelace');
  expect(text).toContain('14 February 2026');expect(text).toContain('Day 45');expect(text).toContain('Last saved: 3 days ago');
  expect(q('[role="img"]')!.getAttribute('aria-label')).toBe('Turkey');
 });
 it('omits the leader line when the save has no commander name',async()=>{
  await show(createElement(SaveGameCard,card({status:'ready',summary:{...SUMMARY,leaderName:''}})));
  expect(q('.l94-card-meta strong')).toBeNull();
 });
 it('continues from a readable save and holds the button while busy',async()=>{
  const ready:SaveSummaryState={status:'ready',summary:SUMMARY};
  const free=card(ready);await show(createElement(SaveGameCard,free));await click('save-card-continue');expect(free.onContinue).toHaveBeenCalledTimes(1);
  const busy=card(ready,{busy:true});await show(createElement(SaveGameCard,busy));
  expect((byId('save-card-continue') as HTMLButtonElement).disabled).toBe(true);await click('save-card-continue');expect(busy.onContinue).not.toHaveBeenCalled();
 });
 it('explains an empty card and keeps Continue inert',async()=>{
  const props=card({status:'none'});await show(createElement(SaveGameCard,props));
  expect(byId('save-card')!.textContent).toContain('No saved campaign yet');
  expect(byId('save-card-continue')!.getAttribute('aria-disabled')).toBe('true');
  await click('save-card-continue');expect(props.onContinue).not.toHaveBeenCalled();
 });
 it('names the reason an unreadable save cannot be used',async()=>{
  await show(createElement(SaveGameCard,card({status:'unreadable',reason:'corrupt'})));expect(byId('save-card')!.textContent).toContain('This save could not be read');
  await show(createElement(SaveGameCard,card({status:'unreadable',reason:'incompatible_version'})));expect(byId('save-card')!.textContent).toContain('This save is from an incompatible version');
  const props=card({status:'unreadable',reason:'corrupt'});await show(createElement(SaveGameCard,props));await click('save-card-continue');expect(props.onContinue).not.toHaveBeenCalled();
 });
 it('shows a load failure as an alert, together with whatever the summary said',async()=>{
  await show(createElement(SaveGameCard,card({status:'ready',summary:SUMMARY},{loadError:'corrupt'})));
  const alert=byId('save-card-error')!;expect(alert.getAttribute('role')).toBe('alert');expect(alert.textContent).toBe('The campaign could not be loaded');
  await show(createElement(SaveGameCard,card({status:'ready',summary:SUMMARY})));expect(byId('save-card-error')).toBeNull();
 });
 it('writes date, day and saved time in every language',async()=>{
  const seen=new Set<string>();
  for(const language of ['en','tr','es','zh','ru'] as GameLanguage[]){
   await show(createElement(SaveGameCard,card({status:'ready',summary:SUMMARY},{language})));
   const meta=q('.l94-card-meta')!.textContent!;seen.add(meta);expect(meta.length,language).toBeGreaterThan(20);
  }
  expect(seen.size).toBe(5);
 });
});

describe('UtilityDock',()=>{
 const dock=(extra:Partial<UtilityDockProps>={}):UtilityDockProps=>({language:'en',onLanguageChange:vi.fn(),theme:'dark',onToggleTheme:vi.fn(),muted:false,audioAvailable:true,onToggleMuted:vi.fn(),version:'1.0.0',onOpenReleaseNotes:vi.fn(),sessionKind:'guest',onOpenDossier:vi.fn(),...extra});
 it('is a labelled toolbar with the five dock controls',async()=>{
  await show(createElement(UtilityDock,dock()));
  expect(q('[role="toolbar"]')!.getAttribute('aria-label')).toBe('Settings');
  for(const id of ['dock-language','dock-theme','dock-audio','dock-release-notes','dock-dossier-chip'])expect(byId(id),id).not.toBeNull();
 });
 it('offers all five languages, marks the current one and switches on click',async()=>{
  const p=dock({language:'es'});await show(createElement(UtilityDock,p));
  const buttons=[...host.querySelectorAll('[data-testid^="dock-language-"]')] as HTMLElement[];
  expect(buttons.map(b=>b.getAttribute('aria-label'))).toEqual(['English','Türkçe','Español','中文','Русский']);
  expect(buttons.map(b=>b.getAttribute('aria-pressed'))).toEqual(['false','false','true','false','false']);
  await click('dock-language-zh');expect(p.onLanguageChange).toHaveBeenCalledWith('zh');
 });
 it('toggles the theme with a pressed state and a label naming the other theme',async()=>{
  const p=dock({theme:'dark'});await show(createElement(UtilityDock,p));
  expect(byId('dock-theme')!.getAttribute('aria-pressed')).toBe('false');expect(byId('dock-theme')!.getAttribute('aria-label')).toBe('Switch to light theme');
  await click('dock-theme');expect(p.onToggleTheme).toHaveBeenCalledTimes(1);
  await show(createElement(UtilityDock,dock({theme:'light'})));
  expect(byId('dock-theme')!.getAttribute('aria-pressed')).toBe('true');expect(byId('dock-theme')!.getAttribute('aria-label')).toBe('Switch to dark theme');
 });
 it('toggles sound and names the action',async()=>{
  const p=dock({muted:false});await show(createElement(UtilityDock,p));
  expect(byId('dock-audio')!.getAttribute('aria-label')).toBe('Mute ambience');expect(byId('dock-audio')!.getAttribute('aria-pressed')).toBe('true');
  await click('dock-audio');expect(p.onToggleMuted).toHaveBeenCalledTimes(1);
  await show(createElement(UtilityDock,dock({muted:true})));
  expect(byId('dock-audio')!.getAttribute('aria-label')).toBe('Play ambience');expect(byId('dock-audio')!.getAttribute('aria-pressed')).toBe('false');
 });
 it('says why sound is off when the audio backend is unavailable, and does nothing on click',async()=>{
  const p=dock({audioAvailable:false});await show(createElement(UtilityDock,p));
  expect(byId('dock-audio')!.getAttribute('aria-disabled')).toBe('true');expect(byId('dock-audio')!.getAttribute('aria-label')).toBe('Ambience coming soon');
  await click('dock-audio');expect(p.onToggleMuted).not.toHaveBeenCalled();
 });
 it('opens release notes from a button that shows the version',async()=>{
  const p=dock();await show(createElement(UtilityDock,p));
  expect(byId('dock-release-notes')!.textContent).toBe('v1.0.0');expect(byId('dock-release-notes')!.getAttribute('aria-label')).toBe('Release notes');
  await click('dock-release-notes');expect(p.onOpenReleaseNotes).toHaveBeenCalledTimes(1);
 });
 it('shows Playing as guest for a guest or no session and the profile name for a profile',async()=>{
  for(const sessionKind of ['none','guest'] as const){await show(createElement(UtilityDock,dock({sessionKind,profileName:'alper'})));expect(byId('dock-dossier-chip')!.textContent,sessionKind).toBe('Playing as guest');}
  const p=dock({sessionKind:'profile',profileName:'alper'});await show(createElement(UtilityDock,p));
  expect(byId('dock-dossier-chip')!.textContent).toBe('alper');expect(byId('dock-dossier-chip')!.getAttribute('data-session')).toBe('profile');
  await click('dock-dossier-chip');expect(p.onOpenDossier).toHaveBeenCalledTimes(1);
 });
 it('falls back to the guest wording for a profile without a name',async()=>{
  await show(createElement(UtilityDock,dock({sessionKind:'profile'})));expect(byId('dock-dossier-chip')!.textContent).toBe('Playing as guest');
 });
 it('translates its labels',async()=>{
  await show(createElement(UtilityDock,dock({language:'tr'})));
  expect(q('[role="toolbar"]')!.getAttribute('aria-label')).toBe('Ayarlar');
  expect(byId('dock-theme')!.getAttribute('aria-label')).toBe(TR('Switch to light theme'));
  expect(byId('dock-dossier-chip')!.textContent).toBe(TR('Playing as guest'));
 });
});

describe('LandingBackdrop',()=>{
 it('is decorative: hidden from assistive technology, with an empty-alt cover image and four layers',async()=>{
  await show(createElement(LandingBackdrop));
  expect(q('.l94-backdrop')!.getAttribute('aria-hidden')).toBe('true');
  expect(q('img')!.getAttribute('alt')).toBe('');expect(q('img')!.getAttribute('src')).toBe('/assets/command/campaign-cover.webp');
  for(const layer of ['.l94-art','.l94-wash','.l94-graticule','.l94-vignette'])expect(q(layer),layer).not.toBeNull();
  expect(host.textContent).toBe('');
 });
});

describe('presentational components stay pure',()=>{
 const sources=import.meta.glob<string>(['../ui/panels/landing/HeroBrand.tsx','../ui/panels/landing/CommandMenu.tsx','../ui/panels/landing/SaveGameCard.tsx','../ui/panels/landing/UtilityDock.tsx','../ui/panels/landing/LandingBackdrop.tsx'],{query:'?raw',import:'default',eager:true});
 it('never touch storage, the session, the game store or the persistence layer',()=>{
  expect(Object.keys(sources)).toHaveLength(5);
  for(const [path,source] of Object.entries(sources)){
   expect(/sessionStorage|localStorage|indexedDB|useGameStore|useAudioSettings|useAppearance/.test(source),path).toBe(false);
   expect(/^import (?!type).*(demoAccounts|persistence\/)/m.test(source),path).toBe(false);
  }
 });
});

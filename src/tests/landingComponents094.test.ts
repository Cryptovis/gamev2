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
import {translateText} from '../i18n/localeText';
import {LANDING_BACKDROP_URL} from '../ui/panels/landing/LandingBackdrop';
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
 it('shows the untranslatable title and the tagline, with no kicker pill and no version label',async()=>{
  await show(createElement(HeroBrand,{language:'en'}));
  expect(q('h1')!.textContent).toBe('Rule of Nations');
  expect(q('h1')!.getAttribute('translate')).toBe('no');
  expect(q('h1')!.id).toBe('landing-title');
  expect(q('.l94-lede')!.textContent).toBe('Be the president you have always dreamed of.');
  expect(q('.l94-eyebrow')).toBeNull();expect(q('.l94-emblem')).toBeNull();expect(q('.l94-version')).toBeNull();
  expect(host.textContent).not.toContain('Grand Strategy');expect(host.textContent).not.toMatch(/v\d+\.\d+/);
 });
 it('translates the tagline but never the title',async()=>{
  await show(createElement(HeroBrand,{language:'tr'}));
  expect(q('h1')!.textContent).toBe('Rule of Nations');
  expect(q('.l94-lede')!.textContent).not.toBe('Be the president you have always dreamed of.');
 });
});

describe('CommandMenu',()=>{
 const spies=()=>({onPlayNow:vi.fn(),onNewCampaign:vi.fn(),onOpenDossier:vi.fn()});
 const props=(heroAction:HeroAction,extra:Partial<CommandMenuProps>={}):CommandMenuProps=>({language:'en',heroAction,busy:false,...spies(),...extra});
 it('draws the hero button only for Play now and never a second Continue button',async()=>{
  await show(createElement(CommandMenu,props('play_now')));
  expect(byId('landing-hero')!.textContent).toBe('Play now');expect(byId('landing-hero')!.getAttribute('data-action')).toBe('play_now');
  for(const action of ['continue','new_campaign'] as const){
   await show(createElement(CommandMenu,props(action)));
   expect(byId('landing-hero'),action).toBeNull();expect(byId('landing-menu')!.getAttribute('data-action')).toBe(action);
   expect(host.textContent,action).not.toContain('Continue campaign');
  }
 });
 it('runs the callback that matches the action',async()=>{
  const p=props('play_now');await show(createElement(CommandMenu,p));await click('landing-hero');expect(p.onPlayNow).toHaveBeenCalledTimes(1);
  const n=props('new_campaign');await show(createElement(CommandMenu,n));await click('landing-new-campaign');expect(n.onNewCampaign).toHaveBeenCalledTimes(1);
 });
 it('shows the no-account note only for Play now',async()=>{
  await show(createElement(CommandMenu,props('play_now')));expect(q('.l94-cta-note')!.textContent).toBe('No account needed');
  await show(createElement(CommandMenu,props('continue')));expect(q('.l94-cta-note')).toBeNull();
 });
 it('always offers New campaign as an action card, and marks it primary when there is no save to continue',async()=>{
  await show(createElement(CommandMenu,props('play_now')));expect(byId('landing-new-campaign')).not.toBeNull();expect(byId('landing-new-campaign')!.getAttribute('data-primary')).toBeNull();
  await show(createElement(CommandMenu,props('continue')));expect(byId('landing-new-campaign')).not.toBeNull();expect(byId('landing-new-campaign')!.getAttribute('data-primary')).toBeNull();
  await show(createElement(CommandMenu,props('new_campaign')));expect(byId('landing-new-campaign')!.getAttribute('data-primary')).toBe('true');
 });
 it('starts a new campaign and opens the dossier from the cards',async()=>{
  const p=props('continue');await show(createElement(CommandMenu,p));
  await click('landing-new-campaign');await click('landing-dossier');
  expect(p.onNewCampaign).toHaveBeenCalledTimes(1);expect(p.onOpenDossier).toHaveBeenCalledTimes(1);
 });
 it('uses action cards, not text links, for every menu entry',async()=>{
  await show(createElement(CommandMenu,props('continue')));
  expect(host.querySelectorAll('a').length).toBe(0);
  expect(host.querySelectorAll('.l94-action-cards .l94-action-card').length).toBe(3);
 });
 it('keeps three equal cards in one list and puts the resume bar below them, spanning all three',async()=>{
  await show(createElement(CommandMenu,props('continue',{lead:createElement('section',{'data-testid':'lead'},'Resume')})));
  const items=[...host.querySelectorAll('.l94-action-cards>li')];
  expect(items).toHaveLength(3);
  expect(items.map(li=>li.querySelector('button')!.getAttribute('data-testid'))).toEqual(['landing-new-campaign','landing-scenarios','landing-dossier']);
  const list=host.querySelector('.l94-action-cards')!,resume=host.querySelector('.l94-resume')!;
  expect(resume.querySelector('[data-testid="lead"]')).not.toBeNull();
  expect(list.compareDocumentPosition(resume)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 });
 it('gives each artwork card its own art layer and names the Player Profile card in plain words',async()=>{
  await show(createElement(CommandMenu,props('continue')));
  expect([...host.querySelectorAll('.l94-action-card')].map(card=>card.getAttribute('data-art'))).toEqual(['new','scenarios','profile']);
  for(const card of host.querySelectorAll('.l94-action-card')){expect(card.querySelector('.l94-card-art')!.getAttribute('aria-hidden')).toBe('true');}
  const profile=byId('landing-dossier')!;
  expect(profile.querySelector('.l94-action-title')!.textContent).toBe('Player Profile');
  expect(profile.querySelector('.l94-action-sub')!.textContent).toBe('Manage profile, cloud sync and saves');
  expect(host.textContent).not.toContain('Commander dossier');
 });
 it('shows the signed-in profile name on the Player Profile card',async()=>{
  await show(createElement(CommandMenu,props('continue',{profileName:'alper'})));
  expect(byId('landing-profile-name')!.textContent).toBe('alper');expect(byId('landing-dossier')!.getAttribute('data-session')).toBe('profile');
  await show(createElement(CommandMenu,props('continue')));expect(byId('landing-profile-name')).toBeNull();
 });
 it('names the Player Profile card in every language',async()=>{
  const names={en:'Player Profile',tr:'Oyuncu Profili',es:'Perfil de Jugador',zh:'玩家档案',ru:'Профиль Игрока'} as const;
  for(const language of Object.keys(names) as (keyof typeof names)[]){await show(createElement(CommandMenu,props('continue',{language})));expect(byId('landing-dossier')!.querySelector('.l94-action-title')!.textContent,language).toBe(names[language]);}
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
 it('holds the action buttons while busy so a second click cannot start a second load',async()=>{
  const p=props('play_now',{busy:true});await show(createElement(CommandMenu,p));
  expect((byId('landing-hero') as HTMLButtonElement).disabled).toBe(true);expect(byId('landing-hero')!.getAttribute('aria-busy')).toBe('true');
  await click('landing-hero');expect(p.onPlayNow).not.toHaveBeenCalled();
  const n=props('continue',{busy:true});await show(createElement(CommandMenu,n));
  expect((byId('landing-new-campaign') as HTMLButtonElement).disabled).toBe(true);await click('landing-new-campaign');expect(n.onNewCampaign).not.toHaveBeenCalled();
 });
 it('uses the menu label and wording of the current language',async()=>{
  await show(createElement(CommandMenu,props('play_now',{language:'tr'})));
  expect(q('nav')!.getAttribute('aria-label')).toBe(TR('Main menu'));
  expect(byId('landing-hero')!.textContent).toBe(TR('Play now'));
  expect(byId('landing-dossier')!.textContent).toContain(TR('Player Profile'));
  await show(createElement(CommandMenu,props('continue',{language:'tr'})));
  expect(byId('landing-new-campaign')!.textContent).toContain(translateText('tr','New campaign'));
 });
});

describe('UtilityDock',()=>{
 const dock=(extra:Partial<UtilityDockProps>={}):UtilityDockProps=>({language:'en',onLanguageChange:vi.fn(),theme:'dark',onToggleTheme:vi.fn(),muted:false,audioAvailable:true,onToggleMuted:vi.fn(),version:'1.0.0',onOpenReleaseNotes:vi.fn(),...extra});
 it('is a labelled toolbar with the four dock controls and no profile chip',async()=>{
  await show(createElement(UtilityDock,dock()));
  expect(q('[role="toolbar"]')!.getAttribute('aria-label')).toBe('Settings');
  for(const id of ['dock-language','dock-theme','dock-audio','dock-release-notes'])expect(byId(id),id).not.toBeNull();
  expect(byId('dock-dossier-chip')).toBeNull();expect(host.textContent).not.toContain('Playing as guest');
 });
 it('offers all five languages, marks the current one and switches on click',async()=>{
  const p=dock({language:'es'});await show(createElement(UtilityDock,p));
  const buttons=[...host.querySelectorAll('[data-testid^="dock-language-"]:not([data-testid="dock-language-bar"])')] as HTMLElement[];
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
 it('labels the language group in each language and shows a national flag on every button',async()=>{
  const labels={en:'Language',tr:'Dil',es:'Idioma',zh:'语言',ru:'Язык'} as const;
  for(const language of Object.keys(labels) as (keyof typeof labels)[]){
   await show(createElement(UtilityDock,dock({language})));
   expect(q('#dock-language-label')!.textContent,language).toBe(labels[language]);
   expect(byId('dock-language')!.getAttribute('aria-labelledby')).toBe('dock-language-label');
  }
  const flags=[...host.querySelectorAll('[data-testid^="dock-language-"] [aria-hidden="true"]')].map(n=>n.textContent);
  expect(flags).toEqual(['🇬🇧','🇹🇷','🇪🇸','🇨🇳','🇷🇺']);
 });
 it('sits the language bar between the tools and the account chip',async()=>{
  await show(createElement(UtilityDock,dock()));
  const bar=byId('dock-language-bar')!;expect(bar.classList.contains('l94-dock-language')).toBe(true);
  expect(bar.contains(byId('dock-language'))).toBe(true);expect(bar.contains(byId('dock-theme'))).toBe(false);
 });
 it('translates its labels',async()=>{
  await show(createElement(UtilityDock,dock({language:'tr'})));
  expect(q('[role="toolbar"]')!.getAttribute('aria-label')).toBe('Ayarlar');
  expect(byId('dock-theme')!.getAttribute('aria-label')).toBe(TR('Switch to light theme'));
 });
});

describe('LandingBackdrop',()=>{
 it('is decorative: hidden from assistive technology, with four CSS layers and no image element',async()=>{
  await show(createElement(LandingBackdrop));
  expect(q('.l94-backdrop')!.getAttribute('aria-hidden')).toBe('true');
  expect(q('img')).toBeNull();expect(LANDING_BACKDROP_URL).toBe('/assets/command/landing-backdrop.jpg');
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

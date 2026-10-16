// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {LEADERSHIP_QUOTES,QUOTE_GLYPHS,quoteAuthor} from '../data/leadershipQuotes';
import {useGameStore} from '../store/gameStore';
import {makeInitialState} from '../data/initialState';
import {UI_CATALOG_LANDING} from '../i18n/uiCatalogLanding';
import {LeadershipWisdomWidget,type LeadershipWisdomWidgetProps} from '../ui/components/LeadershipWisdomWidget';
import type {GameLanguage} from '../domain/game';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const LANGUAGES:GameLanguage[]=['en','tr','es','zh','ru'];
let host:HTMLDivElement,root:Root;
const setLanguage=(language:GameLanguage)=>{const s=makeInitialState();s.playerProfile={...s.playerProfile,language};useGameStore.setState(s);};
const render=async(props:LeadershipWisdomWidgetProps)=>{await act(async()=>{root.render(createElement(LeadershipWisdomWidget,props));});};
const figure=()=>host.querySelector('[data-testid="leadership-wisdom"]') as HTMLElement;
const text=(selector:string)=>host.querySelector(selector)?.textContent??null;
const quoteById=(id:string)=>LEADERSHIP_QUOTES.find(q=>q.id===id)!;
const tick=async(ms:number)=>{await act(async()=>{vi.advanceTimersByTime(ms);});};

beforeEach(()=>{vi.useFakeTimers();host=document.createElement('div');document.body.append(host);root=createRoot(host);setLanguage('en');});
afterEach(async()=>{await act(async()=>{root.unmount();});host.remove();vi.useRealTimers();});

describe('LeadershipWisdomWidget',()=>{
 it('renders the quote, localized author, role and year in every language with that language\'s quote marks',async()=>{
  for(const language of LANGUAGES){
   setLanguage(language);
   await render({variant:'hero',roll:()=>0.3});
   const quote=quoteById(figure().getAttribute('data-quote-id')!);const author=quoteAuthor(quote);const glyphs=QUOTE_GLYPHS[language];
   expect(text('.lw-text'),language).toBe(glyphs.open+quote.text[language]+glyphs.close);
   expect(text('.lw-name'),language).toBe(author.name[language]);
   expect(text('.lw-role'),language).toBe(author.role[language]);
   expect(text('.lw-year'),language).toBe(quote.year);
   expect(figure().getAttribute('lang'),language).toBe(language);
  }
 });
 it('marks each variant and shows the role only where there is room',async()=>{
  for(const variant of ['hero','compact','loading','outcome'] as const){
   await render({variant,roll:()=>0.3});
   expect(figure().getAttribute('data-variant')).toBe(variant);
   expect(figure().classList.contains(`lw--${variant}`)).toBe(true);
   expect(host.querySelector('.lw-role')!==null,variant).toBe(variant!=='compact');
  }
 });
 it('offers the pause and next controls on the hero only, labelled in the current language',async()=>{
  for(const variant of ['compact','loading','outcome'] as const){await render({variant});expect(host.querySelector('.lw-controls'),variant).toBeNull();}
  setLanguage('tr');await render({variant:'hero'});
  expect(text('[data-testid="wisdom-pause"]')).toBe(UI_CATALOG_LANDING['Pause quotes'][0]);
  expect(text('[data-testid="wisdom-next"]')).toBe(UI_CATALOG_LANDING['Next quote'][0]);
 });
 it('toggles between Pause and Resume, with aria-pressed, and holds the quote while paused',async()=>{
  await render({variant:'hero',roll:()=>0.3});
  const pause=host.querySelector('[data-testid="wisdom-pause"]') as HTMLButtonElement;const first=figure().getAttribute('data-quote-id');
  expect(pause.textContent).toBe('Pause quotes');expect(pause.getAttribute('aria-pressed')).toBe('false');
  await act(async()=>{pause.click();});
  expect(pause.textContent).toBe('Resume quotes');expect(pause.getAttribute('aria-pressed')).toBe('true');expect(figure().getAttribute('data-paused')).toBe('true');
  await tick(60000);expect(figure().getAttribute('data-quote-id')).toBe(first);
  await act(async()=>{pause.click();});
  expect(pause.textContent).toBe('Pause quotes');
 });
 it('moves to a different quote when Next is pressed',async()=>{
  let n=0;await render({variant:'hero',roll:()=>[0.05,0.4,0.7][n++%3]});
  const first=figure().getAttribute('data-quote-id');
  await act(async()=>{(host.querySelector('[data-testid="wisdom-next"]') as HTMLButtonElement).click();});
  expect(figure().getAttribute('data-quote-id')).not.toBe(first);
 });
 it('rotates on its own for the hero, compact and loading variants',async()=>{
  for(const variant of ['hero','compact','loading'] as const){
   let n=0;await render({variant,intervalMs:1000,roll:()=>[0.05,0.4,0.7][n++%3]});
   const first=figure().getAttribute('data-quote-id');await tick(1000);
   expect(figure().getAttribute('data-quote-id'),variant).not.toBe(first);
  }
 });
 it('shows a given quote on the outcome variant and never rotates it',async()=>{
  const given=LEADERSHIP_QUOTES[3];
  await render({variant:'outcome',quote:given,intervalMs:1000});
  expect(figure().getAttribute('data-quote-id')).toBe(given.id);
  await tick(60000);expect(figure().getAttribute('data-quote-id')).toBe(given.id);
  expect(host.querySelector('.lw-controls')).toBeNull();
 });
 it('re-renders in the new language when the player changes language',async()=>{
  await render({variant:'hero',roll:()=>0.3});const id=figure().getAttribute('data-quote-id')!;
  await act(async()=>{setLanguage('ru');});
  // setLanguage replaces the whole state; the widget keeps its quote because the rotation state lives in the hook.
  expect(figure().getAttribute('lang')).toBe('ru');expect(figure().getAttribute('data-quote-id')).toBe(id);
  expect(text('.lw-text')).toContain(quoteById(id).text.ru);
 });
});

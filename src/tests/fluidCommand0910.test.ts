import {describe,it,expect} from 'vitest';
import {translateText} from '../i18n/localeText';
import {makeInitialState} from '../data/initialState';
import {BRAND_NAME,BRAND_SHORT} from '../ui/BrandMark';
import {naturalCase} from '../i18n/naturalCase';
import indexHtml from '../../index.html?raw';

const uiSources=import.meta.glob<string>(['../ui/**/*.tsx','../app/**/*.tsx'],{query:'?raw',import:'default',eager:true});
const LANGUAGES=['en','tr','es','zh','ru'];

describe('playtest.10 store subscriptions',()=>{
 it('no UI component subscribes to the whole store',()=>{
  // Parameterless useGameStore() re-renders on every store change; use a selector, useStoreView or useWorldView.
  const broad=Object.entries(uiSources).filter(([,source])=>/useGameStore\(\s*\)/.test(source)).map(([file])=>file);
  expect(broad).toEqual([]);
 });
});

describe('playtest.10 Rule of Nations',()=>{
 it('keeps the name untranslated in every language, including legacy save messages',()=>{
  for(const language of LANGUAGES){
   for(const text of ['Rule of Nations is ready.','Rule of Nations — economy, people and diplomacy.','The Real President is ready.','The Real President 0.83 online.']){
    const shown=translateText(language,text);
    expect(shown,`${language}: ${text}`).toContain(BRAND_NAME);
    expect(shown).not.toMatch(/Real President|Gerçek Başkan|президент|总统|Presidente/i);
   }
  }
 });
 it('names the game in the page title, the opening state and the interface',()=>{
  expect(indexHtml).toContain(`<title>${BRAND_NAME}</title>`);
  expect(BRAND_SHORT).toBe('RON');
  const state=makeInitialState();
  expect(state.mapNotice).toContain(BRAND_NAME);
  expect(state.sitrep.join(' ')).not.toMatch(/Real President|AlpyX/i);
  const old=Object.entries(uiSources).filter(([,source])=>/THE REAL PRESIDENT|The Real President|AlpyX|ALPYX/.test(source)).map(([file])=>file);
  expect(old).toEqual([]);
 });
});

describe('playtest.10 natural case',()=>{
 it('turns capital-only labels into sentence case with the language rules',()=>{
  expect(naturalCase('GIDA','tr')).toBe('Gıda');
  expect(naturalCase('İTHAL ET','tr')).toBe('İthal et');
  expect(naturalCase('НЕФТЬ','ru')).toBe('Нефть');
  expect(naturalCase('Demir','tr')).toBe('Demir');
  expect(naturalCase('石油','zh')).toBe('石油');
 });
});

import {describe,it,expect} from 'vitest';
import {translateText} from '../i18n/localeText';
import {makeInitialState} from '../data/initialState';
import {BRAND_NAME,BRAND_SHORT} from '../ui/BrandMark';
import motionCss from '../ui/styles/motion091.css?raw';
import indexHtml from '../../index.html?raw';

const uiSources=import.meta.glob<string>(['../ui/**/*.tsx','../app/**/*.tsx'],{query:'?raw',import:'default',eager:true});
const LANGUAGES=['en','tr','es','zh','ru'];

describe('0.91 store subscriptions',()=>{
 it('no UI component subscribes to the whole store',()=>{
  // Parameterless useGameStore() re-renders on every store change; use a selector, useStoreView or useWorldView.
  const broad=Object.entries(uiSources).filter(([,source])=>/useGameStore\(\s*\)/.test(source)).map(([file])=>file);
  expect(broad).toEqual([]);
 });
});

describe('0.91 Rule of Nations',()=>{
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

describe('0.91 window motion',()=>{
 it('every animated window selector is switched off for reduced motion',()=>{
  const css=motionCss.replace(/\/\*[\s\S]*?\*\//g,'');
  const [motion,reduced]=css.split('@media (prefers-reduced-motion:reduce)');
  const animated=[...motion.matchAll(/([^{}]+)\{animation:/g)].flatMap(m=>m[1].split(',').map(s=>s.trim())).filter(Boolean);
  expect(animated.length).toBeGreaterThan(10);
  for(const selector of animated)expect(reduced,selector).toContain(selector);
  expect(reduced).toContain('animation:none');
 });
 it('stays inside the 160-220 ms design range and never animates geometry',()=>{
  for(const ms of [...motionCss.matchAll(/--motion-[a-z]+:(\d+)ms/g)].map(m=>Number(m[1])))expect(ms>=160&&ms<=220).toBe(true);
  expect(motionCss).not.toMatch(/@keyframes[^}]*(transform|translate|scale|width|height|top|left)/);
 });
});

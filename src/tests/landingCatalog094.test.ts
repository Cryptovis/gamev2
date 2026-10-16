import {describe,it,expect} from 'vitest';
import {UI_CATALOG_LANDING,LANDING_REUSED_KEYS} from '../i18n/uiCatalogLanding';
import {MERGED_CATALOG_GROUP,translateText} from '../i18n/localeText';

const LANGUAGES=['tr','es','zh','ru'] as const;
const rows=Object.entries(UI_CATALOG_LANDING);

describe('landing catalog rows',()=>{
 it('has a non-empty translation for tr, es, zh and ru on every key',()=>{
  expect(rows.length).toBeGreaterThanOrEqual(28);
  for(const [key,row] of rows){
   expect(row,key).toHaveLength(4);
   for(const value of row){expect(value.trim().length,key).toBeGreaterThan(0);expect(value,key).toBe(value.trim());}
  }
 });
 it('never leaves a translation identical to the English key',()=>{
  for(const [key,row] of rows)for(const value of row)expect(value.toLowerCase(),key).not.toBe(key.toLowerCase());
 });
 it('carries no machine-translation artefacts',()=>{
  for(const [key,row] of rows)for(const value of row){
   expect(value.includes('{\\f'),key).toBe(false);
   expect(/&(?:amp|quot|lt|gt|apos|#\d+);/.test(value),key).toBe(false);
  }
 });
 it('uses no {0} placeholders, because a template key would match unrelated strings across the game',()=>{
  for(const [key,row] of rows){expect(key.includes('{'),key).toBe(false);for(const value of row)expect(value.includes('{'),key).toBe(false);}
 });
 it('has unique keys once case and whitespace are ignored',()=>{
  const normalized=rows.map(([key])=>key.trim().replace(/\s+/g,' ').toLowerCase());
  expect(new Set(normalized).size).toBe(normalized.length);
 });
});

describe('landing catalog wiring',()=>{
 it('is part of the merged catalog group',()=>expect(MERGED_CATALOG_GROUP).toContain(UI_CATALOG_LANDING));
 it('resolves every key to its row through translateText in tr, es, zh and ru',()=>{
  for(const [key,row] of rows)LANGUAGES.forEach((language,index)=>expect(translateText(language,key),`${language}: ${key}`).toBe(row[index]));
 });
 it('leaves English text unchanged',()=>{
  for(const [key] of rows)expect(translateText('en',key),key).toBe(key);
 });
 it('still resolves the strings the landing screen reuses from older catalogs to a non-English translation',()=>{
  for(const key of LANDING_REUSED_KEYS)for(const language of LANGUAGES){
   const translated=translateText(language,key);
   expect(translated.trim().length,`${language}: ${key}`).toBeGreaterThan(0);
   expect(translated.toLowerCase(),`${language}: ${key}`).not.toBe(key.toLowerCase());
  }
 });
 it('keeps all-caps labels in capitals, as the buttons render them',()=>{
  expect(translateText('tr','PLAY NOW')).toBe('HEMEN OYNA');
  expect(translateText('es','COMING SOON')).toBe('PRÓXIMAMENTE');
 });
});

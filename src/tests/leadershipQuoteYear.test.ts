import {describe,it,expect} from 'vitest';
import {formatQuoteYear} from '../data/leadershipQuoteYear';
import {LEADERSHIP_QUOTES} from '../data/leadershipQuotes';
import type {GameLanguage} from '../domain/game';

const OTHERS:GameLanguage[]=['tr','es','zh','ru'];
const row=(year:string)=>Object.fromEntries((['en','tr','es','zh','ru'] as GameLanguage[]).map(l=>[l,formatQuoteYear(year,l)]));

describe('formatQuoteYear',()=>{
 it('leaves English exactly as stored',()=>{for(const quote of LEADERSHIP_QUOTES)expect(formatQuoteYear(quote.year,'en')).toBe(quote.year);});
 it('writes a plain year in each language',()=>{
  expect(row('1863')).toEqual({en:'1863',tr:'1863',es:'1863',zh:'1863年',ru:'1863 г.'});
 });
 it('writes years before the common era',()=>{
  expect(row('431 BCE')).toEqual({en:'431 BCE',tr:'M.Ö. 431',es:'431 a. C.',zh:'公元前431年',ru:'431 г. до н. э.'});
 });
 it('writes approximate years, before and after the common era',()=>{
  expect(row('c. 1931')).toEqual({en:'c. 1931',tr:'1931 civarı',es:'c. 1931',zh:'约1931年',ru:'ок. 1931 г.'});
  expect(row('c. 250 BCE')).toEqual({en:'c. 250 BCE',tr:'yaklaşık M.Ö. 250',es:'c. 250 a. C.',zh:'约公元前250年',ru:'ок. 250 г. до н. э.'});
 });
 it('writes year ranges',()=>{
  expect(row('c. 170–180')).toEqual({en:'c. 170–180',tr:'170–180 civarı',es:'c. 170–180',zh:'约170–180年',ru:'ок. 170–180 гг.'});
 });
 it('writes centuries',()=>{
  expect(row('c. 5th century BCE')).toEqual({en:'c. 5th century BCE',tr:'yaklaşık M.Ö. 5. yüzyıl',es:'c. siglo V a. C.',zh:'约公元前5世纪',ru:'ок. V в. до н. э.'});
  expect(row('c. 3rd century BCE').es).toBe('c. siglo III a. C.');
 });
 it('shows an unknown shape as stored rather than guessing',()=>{
  for(const language of OTHERS)expect(formatQuoteYear('the winter of 1862',language)).toBe('the winter of 1862');
 });
 it('leaves no English era words in any other language for the whole corpus',()=>{
  for(const quote of LEADERSHIP_QUOTES)for(const language of OTHERS){
   const shown=formatQuoteYear(quote.year,language);
   expect(/century|BCE/.test(shown),`${quote.id} ${language}: ${shown}`).toBe(false);
   // "c." is also the Spanish abbreviation, so only the other languages must not show it.
   if(language!=='es')expect(/\bc\. /.test(shown),`${quote.id} ${language}: ${shown}`).toBe(false);
   expect(shown.length,`${quote.id} ${language}`).toBeGreaterThan(0);
  }
 });
 it('shows every corpus year in a recognised shape, so none falls back to the stored text by accident',()=>{
  for(const quote of LEADERSHIP_QUOTES)expect(formatQuoteYear(quote.year,'zh'),quote.id).not.toBe(quote.year);
 });
});

import {describe,it,expect} from 'vitest';
import {LEADERSHIP_QUOTES,pickLeadershipQuote,quoteAuthor,QUOTE_CATEGORIES,QUOTE_GLYPHS} from '../data/leadershipQuotes';
import {LEADERSHIP_AUTHORS} from '../data/leadershipAuthors';

const LANGUAGES=['en','tr','es','zh','ru'] as const;
const LEGACY_IDS=['ataturk-peace','ataturk-sovereignty','lincoln-people','mandela-education'];

it('selects quotes across the corpus and bounds unusual random input',()=>{
 const ids=[0,.25,.5,.75].map(roll=>pickLeadershipQuote(roll).id);
 expect(new Set(ids).size).toBe(4);
 expect(pickLeadershipQuote(-1).id).toBe(ids[0]);
 expect(pickLeadershipQuote(1).id).toBe(LEADERSHIP_QUOTES[LEADERSHIP_QUOTES.length-1].id);
 expect(pickLeadershipQuote(NaN).id).toBe(ids[0]);
});
it('ships sourced sayings in all five game languages',()=>{
 for(const quote of LEADERSHIP_QUOTES){
  expect(quote.author).toBeTruthy();expect(quote.source.trim()).not.toBe('');
  expect(quote.provenance.citation.trim()).not.toBe('');
  for(const language of LANGUAGES)expect(quote.text[language].trim()).not.toBe('');
 }
 for(const quote of LEADERSHIP_QUOTES.filter(q=>LEGACY_IDS.includes(q.id)))expect(quote.source).toMatch(/^https:\/\//);
 expect(LEADERSHIP_QUOTES.filter(q=>q.author.includes('Atatürk'))).toHaveLength(2);
});

describe('curated leadership corpus',()=>{
 const everyString=(quote:(typeof LEADERSHIP_QUOTES)[number])=>[quote.source,quote.year,quote.provenance.citation,...LANGUAGES.map(l=>quote.text[l]),...LANGUAGES.map(l=>quote.sourceTitle[l])];

 it('holds between 20 and 30 quotes with unique, well-formed ids',()=>{
  expect(LEADERSHIP_QUOTES.length).toBeGreaterThanOrEqual(20);
  expect(LEADERSHIP_QUOTES.length).toBeLessThanOrEqual(30);
  const ids=LEADERSHIP_QUOTES.map(q=>q.id);
  expect(new Set(ids).size).toBe(ids.length);
  for(const id of ids)expect(id).toMatch(/^[a-z0-9-]+$/);
 });
 it('keeps the four original quotes, in front, with their ids',()=>{
  expect(LEADERSHIP_QUOTES.slice(0,4).map(q=>q.id)).toEqual(LEGACY_IDS);
 });
 it('has complete text and source titles in every language and no stray whitespace or ASCII ellipsis',()=>{
  for(const quote of LEADERSHIP_QUOTES)for(const value of everyString(quote)){
   expect(value.trim(),`${quote.id}: empty string`).not.toBe('');
   expect(value,`${quote.id}: leading or trailing whitespace in ${value}`).toBe(value.trim());
   expect(value.includes('...'),`${quote.id}: use the ellipsis character, not three dots`).toBe(false);
  }
 });
 it('links every quote to a complete author profile',()=>{
  for(const quote of LEADERSHIP_QUOTES){
   const author=LEADERSHIP_AUTHORS[quote.authorId];
   expect(author,`${quote.id}: unknown author ${quote.authorId}`).toBeDefined();
   expect(quote.author).toBe(author.name.en);
   expect(quoteAuthor(quote)).toBe(author);
  }
  for(const author of Object.values(LEADERSHIP_AUTHORS)){
   for(const language of LANGUAGES){
    expect(author.name[language].trim(),`${author.id} name ${language}`).not.toBe('');
    expect(author.role[language].trim(),`${author.id} role ${language}`).not.toBe('');
   }
   expect(author.lifespan.trim()).not.toBe('');
  }
 });
 it('keys the author catalog by the id each profile declares',()=>{
  for(const [key,author] of Object.entries(LEADERSHIP_AUTHORS))expect(author.id).toBe(key);
 });
 it('uses the six categories, puts the primary one in tags and avoids duplicate tags',()=>{
  for(const quote of LEADERSHIP_QUOTES){
   expect(QUOTE_CATEGORIES).toContain(quote.category);
   expect(quote.tags.length).toBeGreaterThan(0);
   expect(quote.tags).toContain(quote.category);
   expect(new Set(quote.tags).size).toBe(quote.tags.length);
   for(const tag of quote.tags)expect(QUOTE_CATEGORIES).toContain(tag);
  }
 });
 it('covers every category with at least three quotes',()=>{
  for(const category of QUOTE_CATEGORIES)expect(LEADERSHIP_QUOTES.filter(q=>q.tags.includes(category)).length,category).toBeGreaterThanOrEqual(3);
 });
 it('has no two quotes with the same English wording',()=>{
  const texts=LEADERSHIP_QUOTES.map(q=>q.text.en.toLowerCase());
  expect(new Set(texts).size).toBe(texts.length);
 });
 it('keeps wording short enough for the quote card in every language',()=>{
  for(const quote of LEADERSHIP_QUOTES){
   expect(quote.text.en.length,`${quote.id} en`).toBeLessThanOrEqual(220);
   for(const language of ['tr','es','ru'] as const)expect(quote.text[language].length,`${quote.id} ${language}`).toBeLessThanOrEqual(quote.text.en.length*1.6);
  }
 });
 it('records provenance on every quote',()=>{
  for(const quote of LEADERSHIP_QUOTES){
   expect(quote.provenance.originalLanguage).toMatch(/^[a-z]{2,3}$/);
   expect(['public_domain','short_quotation']).toContain(quote.provenance.rights);
   expect(quote.year.trim()).not.toBe('');
  }
 });
 it('defines opening and closing marks for every language',()=>{
  for(const language of LANGUAGES){expect(QUOTE_GLYPHS[language].open).toBeTruthy();expect(QUOTE_GLYPHS[language].close).toBeTruthy();}
  expect(QUOTE_GLYPHS.es.open).toBe('«');expect(QUOTE_GLYPHS.ru.close).toBe('»');
  expect(QUOTE_GLYPHS.zh.open).toBe('“');
 });
});

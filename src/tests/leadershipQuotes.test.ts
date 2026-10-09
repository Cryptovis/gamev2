import {it,expect} from 'vitest';
import {LEADERSHIP_QUOTES,pickLeadershipQuote} from '../data/leadershipQuotes';
it('selects all quotes and bounds unusual random input',()=>{
 const ids=[0,.25,.5,.75].map(roll=>pickLeadershipQuote(roll).id);
 expect(new Set(ids).size).toBe(4);
 expect(pickLeadershipQuote(-1).id).toBe(ids[0]);
 expect(pickLeadershipQuote(1).id).toBe(ids[3]);
 expect(pickLeadershipQuote(NaN).id).toBe(ids[0]);
});
it('ships sourced sayings in all five game languages',()=>{
 for(const quote of LEADERSHIP_QUOTES){
  expect(quote.author).toBeTruthy();expect(quote.source).toMatch(/^https:\/\//);
  for(const language of ['en','tr','es','zh','ru'] as const)expect(quote.text[language].trim()).not.toBe('');
 }
 expect(LEADERSHIP_QUOTES.filter(q=>q.author.includes('Atatürk'))).toHaveLength(2);
});

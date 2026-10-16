import {describe,it,expect} from 'vitest';
import {LEADERSHIP_QUOTES,nextLeadershipQuote} from '../data/leadershipQuotes';
import {QUOTE_RECENT_WINDOW,ideologyTags,preferredTags,selectLeadershipQuote,type QuoteContext} from '../data/leadershipQuoteSelection';

const landing:QuoteContext={screen:'landing'};
const ids=LEADERSHIP_QUOTES.map(q=>q.id);
/** 0, 0.001, ... 0.999 for n = 1000: an even sweep over the roll range. */
const sweep=(n:number)=>Array.from({length:n},(_,i)=>i/n);
const countWhere=(context:QuoteContext,n:number,test:(q:(typeof LEADERSHIP_QUOTES)[number])=>boolean)=>sweep(n).filter(roll=>test(selectLeadershipQuote(LEADERSHIP_QUOTES,context,roll,[]))).length;

describe('selectLeadershipQuote',()=>{
 it('is deterministic for the same inputs and does not depend on corpus order',()=>{
  const reversed=[...LEADERSHIP_QUOTES].reverse();
  for(const roll of [0,.13,.5,.87,1]){
   const first=selectLeadershipQuote(LEADERSHIP_QUOTES,landing,roll,['a']).id;
   for(let i=0;i<100;i++)expect(selectLeadershipQuote(LEADERSHIP_QUOTES,landing,roll,['a']).id).toBe(first);
   expect(selectLeadershipQuote(reversed,landing,roll,['a']).id).toBe(first);
  }
 });
 it('never returns one of the five most recent quotes while others remain',()=>{
  const recent=ids.slice(0,QUOTE_RECENT_WINDOW);
  for(const roll of sweep(500))expect(recent).not.toContain(selectLeadershipQuote(LEADERSHIP_QUOTES,landing,roll,recent).id);
 });
 it('only looks at the first five recent ids',()=>{
  const recent=ids.slice(0,QUOTE_RECENT_WINDOW+1),sixth=recent[QUOTE_RECENT_WINDOW];
  const picked=sweep(1000).map(roll=>selectLeadershipQuote(LEADERSHIP_QUOTES,landing,roll,recent).id);
  expect(picked).toContain(sixth);
 });
 it('falls back to skipping only the most recent quote when every quote is recent',()=>{
  const pair=LEADERSHIP_QUOTES.slice(0,2);
  for(const roll of [0,.5,1])expect(selectLeadershipQuote(pair,landing,roll,[pair[0].id,pair[1].id]).id).toBe(pair[1].id);
 });
 it('returns the only quote of a one-quote corpus and rejects an empty one',()=>{
  expect(selectLeadershipQuote([LEADERSHIP_QUOTES[0]],landing,.5,[LEADERSHIP_QUOTES[0].id]).id).toBe(LEADERSHIP_QUOTES[0].id);
  expect(()=>selectLeadershipQuote([],landing,.5,[])).toThrow();
 });
 it('returns a valid quote for boundary and unusual rolls',()=>{
  for(const roll of [0,.999999,1,NaN,-1,Infinity,-Infinity,2])expect(ids).toContain(selectLeadershipQuote(LEADERSHIP_QUOTES,landing,roll,[]).id);
  expect(selectLeadershipQuote(LEADERSHIP_QUOTES,landing,NaN,[]).id).toBe(selectLeadershipQuote(LEADERSHIP_QUOTES,landing,0,[]).id);
 });
 it('reaches every quote and stays close to uniform when the context has no preference',()=>{
  const seen=new Map<string,number>();
  for(const roll of sweep(5000)){const id=selectLeadershipQuote(LEADERSHIP_QUOTES,landing,roll,[]).id;seen.set(id,(seen.get(id)??0)+1);}
  expect(seen.size).toBe(LEADERSHIP_QUOTES.length);
  for(const count of seen.values())expect(count/5000).toBeLessThan(2/LEADERSHIP_QUOTES.length);
 });
 it('favours war_and_peace quotes at least 1.8 times their uniform share during a war',()=>{
  const n=10000,warCount=LEADERSHIP_QUOTES.filter(q=>q.tags.includes('war_and_peace')).length;
  const share=countWhere({screen:'landing',atWar:true},n,q=>q.tags.includes('war_and_peace'))/n;
  expect(share).toBeGreaterThan(1.8*warCount/LEADERSHIP_QUOTES.length);
 });
 it('favours economics quotes in an economic crisis and liberty or diplomacy quotes for a pluralist state',()=>{
  const n=10000,uniform=(tag:string)=>LEADERSHIP_QUOTES.filter(q=>(q.tags as readonly string[]).includes(tag)).length/LEADERSHIP_QUOTES.length;
  expect(countWhere({screen:'landing',situation:'economic_crisis'},n,q=>q.tags.includes('economics'))/n).toBeGreaterThan(1.5*uniform('economics'));
  expect(countWhere({screen:'landing',ideology:'pluralist'},n,q=>q.tags.includes('liberty')||q.tags.includes('diplomacy'))/n).toBeGreaterThan(uniform('liberty'));
 });
});

describe('preferredTags',()=>{
 it('is empty for the landing screen with no other context',()=>expect(preferredTags(landing)).toEqual([]));
 it('favours statecraft and liberty in setup, wisdom while loading, and wisdom with war_and_peace after a defeat',()=>{
  expect(preferredTags({screen:'setup'})).toEqual(['statecraft','liberty']);
  expect(preferredTags({screen:'loading'})).toEqual(['wisdom']);
  expect(preferredTags({screen:'victory'})).toEqual(['statecraft','wisdom']);
  expect(preferredTags({screen:'defeat'})).toEqual(['wisdom','war_and_peace']);
 });
 it('adds war, situation and ideology tags without duplicates',()=>{
  const tags=preferredTags({screen:'defeat',atWar:true,situation:'economic_crisis',ideology:'state_centric'});
  expect(new Set(tags).size).toBe(tags.length);
  for(const tag of ['wisdom','war_and_peace','economics','statecraft'] as const)expect(tags).toContain(tag);
 });
 it('maps each ideology as designed and ignores an unknown one',()=>{
  expect(ideologyTags('pluralist')).toEqual(['liberty','diplomacy']);
  expect(ideologyTags('state_centric')).toEqual(['statecraft','war_and_peace']);
  expect(ideologyTags('state_socialist')).toEqual(['economics','liberty']);
  expect(ideologyTags('royalist')).toEqual(['statecraft','diplomacy']);
  expect(ideologyTags('religious_state')).toEqual(['wisdom','statecraft']);
  expect(ideologyTags('not_an_ideology')).toEqual([]);
  expect(ideologyTags('constructor')).toEqual([]);
  expect(ideologyTags(undefined)).toEqual([]);
 });
});

describe('nextLeadershipQuote compatibility',()=>{
 it('never repeats the previous quote, whatever the roll',()=>{
  for(const q of LEADERSHIP_QUOTES)for(const roll of [0,.25,.5,.99,1,NaN,-1])expect(nextLeadershipQuote(roll,q.id).id).not.toBe(q.id);
 });
 it('accepts a missing or null previous id and an explicit context',()=>{
  expect(ids).toContain(nextLeadershipQuote(.4).id);
  expect(ids).toContain(nextLeadershipQuote(.4,null).id);
  expect(nextLeadershipQuote(.4,'x',{screen:'landing'}).id).toBe(selectLeadershipQuote(LEADERSHIP_QUOTES,landing,.4,['x']).id);
 });
});

describe('selection isolation',()=>{
 const sources=import.meta.glob<string>(['../data/leadershipQuoteSelection.ts','../data/leadershipQuotes.ts','../data/leadershipAuthors.ts','../data/leadershipTypes.ts'],{query:'?raw',import:'default',eager:true});
 const engineImport=/from\s+['"][^'"]*\/(engine|simulation)(\/|['"])/;
 it('finds the four data modules',()=>expect(Object.keys(sources)).toHaveLength(4));
 it('imports nothing from the engine or simulation, so it cannot reach the seeded generator',()=>{
  for(const [path,source] of Object.entries(sources))expect(engineImport.test(source),path).toBe(false);
 });
 it('reads neither the clock nor a random source in the selection module',()=>{
  const source=Object.entries(sources).find(([path])=>path.endsWith('leadershipQuoteSelection.ts'))?.[1]??'';
  expect(source.length).toBeGreaterThan(0);
  expect(/Math\.random|Date\.now|performance\.now|\brng\b/.test(source)).toBe(false);
 });
});

import type { GameState } from '../domain/game';
export const JOURNAL_LIMIT = 200;
// Immutable legacy reports remain translatable at display time.
export function recordReports(before:GameState,after:GameState,kind:'command'|'world'='command'):GameState {
  if(after===before)return after;
  const previous=new Set(before.sitrep),messages=after.sitrep.filter(message=>!previous.has(message));
  if(!messages.length)return after;
  const journal=after.world.journal??[],offset=Number(journal[0]?.id.split(':').at(-1))||0;
  const entries=messages.map((message,index)=>({id:`news:${after.day}:${offset+messages.length-index}`,day:after.day,message,kind}));
  return {...after,world:{...after.world,journal:[...entries,...journal].slice(0,JOURNAL_LIMIT)}};
}

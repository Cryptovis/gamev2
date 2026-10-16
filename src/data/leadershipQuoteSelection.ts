import type {IdeologyType} from '../domain/game';
import type {LeadershipQuote} from './leadershipQuotes';
import type {QuoteCategory} from './leadershipTypes';

// Presentation only. Selection is a pure function of its arguments: the caller supplies the roll, so nothing in here
// reads the clock, a random source, or any game state. It must never touch the simulation's seeded generator.

export type QuoteScreen='landing'|'setup'|'loading'|'victory'|'defeat';
export type NationalSituation='stable'|'unrest'|'economic_crisis';

/** Plain values the caller derives from existing selectors. Every field except screen is optional. */
export interface QuoteContext {
 screen:QuoteScreen;
 ideology?:IdeologyType;
 atWar?:boolean;
 situation?:NationalSituation;
}

/** A new pick avoids this many of the most recently shown quotes. */
export const QUOTE_RECENT_WINDOW=5;
/** Each preferred tag a quote carries adds this much weight on top of the base weight of 1. */
const PREFERRED_TAG_WEIGHT=3;

const SCREEN_TAGS:Record<QuoteScreen,readonly QuoteCategory[]>={
 landing:[],
 setup:['statecraft','liberty'],
 loading:['wisdom'],
 victory:['statecraft','wisdom'],
 defeat:['wisdom','war_and_peace'],
};
const IDEOLOGY_TAGS:Record<IdeologyType,readonly QuoteCategory[]>={
 pluralist:['liberty','diplomacy'],
 state_centric:['statecraft','war_and_peace'],
 state_socialist:['economics','liberty'],
 royalist:['statecraft','diplomacy'],
 religious_state:['wisdom','statecraft'],
};
const SITUATION_TAGS:Record<NationalSituation,readonly QuoteCategory[]>={
 stable:[],
 unrest:['statecraft','liberty'],
 economic_crisis:['economics'],
};

/** Tags for an ideology id; an unknown or missing id gives none, so stale data cannot break a screen. */
export function ideologyTags(ideology?:string):readonly QuoteCategory[] {
 return ideology!==undefined&&Object.hasOwn(IDEOLOGY_TAGS,ideology)?IDEOLOGY_TAGS[ideology as IdeologyType]:[];
}

/** The categories this context favours, without duplicates, in a stable order. */
export function preferredTags(context:QuoteContext):readonly QuoteCategory[] {
 const tags:QuoteCategory[]=[...SCREEN_TAGS[context.screen]];
 if(context.atWar)tags.push('war_and_peace');
 if(context.situation)tags.push(...SITUATION_TAGS[context.situation]);
 tags.push(...ideologyTags(context.ideology));
 return [...new Set(tags)];
}

const byId=(a:LeadershipQuote,b:LeadershipQuote)=>(a.id<b.id?-1:a.id>b.id?1:0);

/**
 * Picks one quote. Deterministic for a given corpus, context, roll and recent list, whatever the order of the corpus.
 * roll is in [0, 1]; a value outside that range is clamped and a non-finite one counts as 0.
 * recentIds is most recent first. Quotes among its first QUOTE_RECENT_WINDOW ids are skipped while others remain;
 * if that would leave nothing, only the single most recent quote is skipped.
 */
export function selectLeadershipQuote(corpus:readonly LeadershipQuote[],context:QuoteContext,roll:number,recentIds:readonly string[]=[]):LeadershipQuote {
 if(corpus.length===0)throw new Error('The leadership quote corpus is empty.');
 if(corpus.length===1)return corpus[0];
 const recent=recentIds.slice(0,QUOTE_RECENT_WINDOW);
 let pool=corpus.filter(q=>!recent.includes(q.id));
 if(pool.length===0)pool=corpus.filter(q=>q.id!==recentIds[0]);
 if(pool.length===0)pool=[...corpus];
 const preferred=new Set(preferredTags(context));
 const weighted=[...pool].sort(byId).map(entry=>({entry,weight:1+PREFERRED_TAG_WEIGHT*entry.tags.filter(tag=>preferred.has(tag)).length}));
 const total=weighted.reduce((sum,item)=>sum+item.weight,0);
 let remaining=(Number.isFinite(roll)?Math.min(Math.max(roll,0),1-Number.EPSILON):0)*total;
 for(const item of weighted){
  if(remaining<item.weight)return item.entry;
  remaining-=item.weight;
 }
 return weighted[weighted.length-1].entry;
}

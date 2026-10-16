import {QUOTE_GLYPHS,quoteAuthor,type LeadershipQuote} from '../../data/leadershipQuotes';
import {formatQuoteYear} from '../../data/leadershipQuoteYear';
import type {QuoteContext,QuoteScreen} from '../../data/leadershipQuoteSelection';
import {useGameStore} from '../../store/gameStore';
import {DEFAULT_QUOTE_INTERVAL_MS,useQuoteRotation} from '../hooks/useQuoteRotation';

export type WisdomVariant='hero'|'compact'|'loading'|'outcome';

export interface LeadershipWisdomWidgetProps {
 variant:WisdomVariant;
 /** Overrides the default context for the variant (for example the player's ideology or an ongoing war). */
 context?:Partial<QuoteContext>;
 intervalMs?:number;
 /** A fixed quote. Used by the outcome variant to show the quote chosen for the ending; it never rotates. */
 quote?:LeadershipQuote;
 roll?:()=>number;
 className?:string;
}

/**
 * Size bucket for the quote text. The framed hero box has a fixed height, so a longer quote gets a smaller type size
 * instead of a taller box and the cards above never move. Chinese characters are about twice as wide as Latin ones.
 */
export function quoteSizeBucket(text:string,language:string):'s'|'m'|'l'|'xl'{
 const weight=text.length*(language==='zh'?1.9:1);
 return weight<=85?'s':weight<=150?'m':weight<=240?'l':'xl';
}

const VARIANT_SCREEN:Record<WisdomVariant,QuoteScreen>={hero:'landing',compact:'setup',loading:'loading',outcome:'victory'};
const ROTATES:Record<WisdomVariant,boolean>={hero:true,compact:true,loading:true,outcome:false};

/** Visible quote with localized text, author, role and year. Rotation pauses on hover, on focus and in a hidden tab. There are no buttons: it reads as an aphorism, not a media player. */
export function LeadershipWisdomWidget({variant,context,intervalMs=DEFAULT_QUOTE_INTERVAL_MS,quote:fixed,roll,className}:LeadershipWisdomWidgetProps) {
 const language=useGameStore(s=>s.playerProfile.language);
 const rotation=useQuoteRotation({context:{screen:VARIANT_SCREEN[variant],...context},intervalMs:ROTATES[variant]&&!fixed?intervalMs:0,roll});
 const quote=fixed??rotation.quote;
 const author=quoteAuthor(quote);
 const glyphs=QUOTE_GLYPHS[language];
 const classes=['lw',`lw--${variant}`,className].filter(Boolean).join(' ');
 return <figure className={classes} data-testid="wisdom-widget" data-variant={variant} data-quote-id={quote.id} data-size={quoteSizeBucket(quote.text[language],language)} data-paused={rotation.paused?'true':'false'} lang={language} {...rotation.bind}>
  <div className="lw-body" key={quote.id}>
   <blockquote className="lw-text">{glyphs.open}{quote.text[language]}{glyphs.close}</blockquote>
   <figcaption className="lw-caption">
    <span className="lw-name">{author.name[language]}</span>
    {variant!=='compact'&&<span className="lw-role">{author.role[language]}</span>}
    <span className="lw-year">{formatQuoteYear(quote.year,language)}</span>
   </figcaption>
  </div>
 </figure>;
}

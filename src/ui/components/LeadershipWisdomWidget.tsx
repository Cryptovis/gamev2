import {QUOTE_GLYPHS,quoteAuthor,type LeadershipQuote} from '../../data/leadershipQuotes';
import type {QuoteContext,QuoteScreen} from '../../data/leadershipQuoteSelection';
import {translateText} from '../../i18n/localeText';
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

const VARIANT_SCREEN:Record<WisdomVariant,QuoteScreen>={hero:'landing',compact:'setup',loading:'loading',outcome:'victory'};
const ROTATES:Record<WisdomVariant,boolean>={hero:true,compact:true,loading:true,outcome:false};
const HAS_CONTROLS:Record<WisdomVariant,boolean>={hero:true,compact:false,loading:false,outcome:false};

/** Visible quote with localized text, author, role and year. Rotation pauses on hover, focus, a hidden tab or the pause button. */
export function LeadershipWisdomWidget({variant,context,intervalMs=DEFAULT_QUOTE_INTERVAL_MS,quote:fixed,roll,className}:LeadershipWisdomWidgetProps) {
 const language=useGameStore(s=>s.playerProfile.language);
 const rotation=useQuoteRotation({context:{screen:VARIANT_SCREEN[variant],...context},intervalMs:ROTATES[variant]&&!fixed?intervalMs:0,roll});
 const quote=fixed??rotation.quote;
 const author=quoteAuthor(quote);
 const glyphs=QUOTE_GLYPHS[language];
 const t=(text:string)=>translateText(language,text);
 const controls=HAS_CONTROLS[variant]&&!fixed;
 const classes=['lw',`lw--${variant}`,className].filter(Boolean).join(' ');
 return <figure className={classes} data-testid="leadership-wisdom" data-variant={variant} data-quote-id={quote.id} data-paused={rotation.paused?'true':'false'} lang={language} {...rotation.bind}>
  <div className="lw-body" key={quote.id}>
   <blockquote className="lw-text">{glyphs.open}{quote.text[language]}{glyphs.close}</blockquote>
   <figcaption className="lw-caption">
    <span className="lw-name">{author.name[language]}</span>
    {variant!=='compact'&&<span className="lw-role">{author.role[language]}</span>}
    <span className="lw-year">{quote.year}</span>
   </figcaption>
  </div>
  {controls&&<div className="lw-controls">
   <button type="button" className="lw-btn" data-testid="wisdom-pause" aria-pressed={rotation.manuallyPaused} onClick={rotation.toggleManualPause}>{t(rotation.manuallyPaused?'Resume quotes':'Pause quotes')}</button>
   <button type="button" className="lw-btn" data-testid="wisdom-next" onClick={rotation.next}>{t('Next quote')}</button>
  </div>}
 </figure>;
}

import type {GameLanguage} from '../../../domain/game';
import {flagEmoji} from '../../../data/countryThemes';
import {translateText} from '../../../i18n/localeText';
import type {SaveSummaryState} from '../../../persistence/saveSummary';
import type {LoadFailureReason} from '../../landing/landingMachine';
import {formatCampaignDate,formatDayLabel,formatSavedAgo} from '../../landing/saveCardFormat';

export interface SaveGameCardProps {
  language:GameLanguage;
  state:SaveSummaryState;
  /** Why the last attempt to load failed, if it did. Shown even when the summary looked fine. */
  loadError:LoadFailureReason|null;
  busy:boolean;
  onContinue():void;
  /** Clock for the "saved ... ago" text. Defaults to the current time; tests pass a fixed one. */
  now?:number;
}

const UNREADABLE_TEXT={corrupt:'This save could not be read',incompatible_version:'This save is from an incompatible version'} as const;

/** The Continue card: last campaign, readable or not. Reads nothing itself; the shell hands it the summary. */
export function SaveGameCard({language,state,loadError,busy,onContinue,now=Date.now()}:SaveGameCardProps) {
  const t=(text:string)=>translateText(language,text);
  const dataState=state.status;
  return <section className="l94-card" data-testid="save-card" data-state={dataState} aria-labelledby="save-card-title" aria-busy={dataState==='loading'||undefined}>
    <h2 id="save-card-title">{t('Continue with Last Saved Campaign')}</h2>
    {state.status==='loading'&&<p className="l94-card-title"><span className="l94-sr">{t('Continue with Last Saved Campaign')}</span></p>}
    {state.status==='ready'&&<>
      <p className="l94-card-title"><span className="l94-flag-emoji" role="img" aria-label={state.summary.countryName}>{flagEmoji(state.summary.iso2)}</span> {state.summary.countryName}</p>
      <p className="l94-card-meta">
        {state.summary.leaderName&&<span><strong>{state.summary.leaderName}</strong></span>}
        <span>{formatCampaignDate(state.summary.campaignDateIso,language)}</span>
        <span>{formatDayLabel(state.summary.campaignDay,language)}</span>
        <span>{t('Last saved')}: {formatSavedAgo(state.summary.savedAt,now,language)}</span>
      </p>
    </>}
    {state.status==='none'&&<p className="l94-card-title">{t('No saved campaign yet')}</p>}
    {state.status==='unreadable'&&<p className="l94-card-title">{t(UNREADABLE_TEXT[state.reason])}</p>}
    {loadError&&<p className="l94-card-error" data-testid="save-card-error" role="alert">{t('The campaign could not be loaded')}</p>}
    {state.status!=='loading'&&<button type="button" className="l94-cta l94-cta--card" data-testid="save-card-continue" disabled={state.status==='ready'&&busy} aria-disabled={state.status==='ready'?undefined:true} onClick={()=>{if(state.status==='ready')onContinue();}}>{t('Continue campaign')}</button>}
  </section>;
}

import type {GameLanguage} from '../../../domain/game';
import {translateText} from '../../../i18n/localeText';
import {LeadershipWisdomWidget} from '../../components/LeadershipWisdomWidget';
import type {LoadFailureReason} from '../../landing/landingMachine';
import {PRELOAD_STAGE_ORDER,type PreloadStageId} from '../../loading/preloadPipeline';
import {LandingBackdrop} from './LandingBackdrop';

export interface GameLoadingScreenProps {
  language:GameLanguage;
  /** 0 to 100. */
  percent:number;
  /** The stage in progress, or 'handoff' once every stage has finished. */
  stage:PreloadStageId|'handoff'|null;
  error:LoadFailureReason|null;
  onReturnToMenu():void;
}

const STAGE_TEXT:Record<PreloadStageId|'handoff',string>={
  hydrate:'Hydrating simulation and save state…',graphics:'Pre-decoding vector graphics…',indexes:'Verifying intelligence indexes and dictionaries…',
  workspace:'Preparing executive workspace and audio…',handoff:'Handing over command…',
};
const REASON_TEXT:Partial<Record<LoadFailureReason,string>>={corrupt:'This save could not be read',incompatible_version:'This save is from an incompatible version'};

/** Progress, stage and a leadership quote while a campaign loads; or the reason it failed with a way back. Props in, callback out. */
export function GameLoadingScreen({language,percent,stage,error,onReturnToMenu}:GameLoadingScreenProps) {
  const t=(text:string)=>translateText(language,text);
  const shown=Math.min(100,Math.max(0,Math.round(percent)));
  const active=stage??'hydrate';
  const activeIndex=active==='handoff'?PRELOAD_STAGE_ORDER.length:PRELOAD_STAGE_ORDER.indexOf(active);
  return <div className="landing094" data-testid="landing-root" data-screen="loading" lang={language}>
    <LandingBackdrop/>
    <main className="l94-stage l94-stage--center">
      <section className="l94-loading" data-testid="game-loading" data-state={error?'error':'loading'} aria-busy={!error}>
        {error
          ?<>
            <p className="l94-error" role="alert" data-testid="loading-error">{t('The campaign could not be loaded')}</p>
            {REASON_TEXT[error]&&<p className="l94-loading-reason">{t(REASON_TEXT[error]!)}</p>}
            <button type="button" className="l94-cta" data-testid="loading-return" onClick={onReturnToMenu}>{t('Main menu')}</button>
          </>
          :<>
            <p className="l94-loading-kicker">{t('Loading command…')}</p>
            <strong className="l94-loading-percent" data-testid="loading-progress-percentage">{shown}%</strong>
            <div className="l94-gauge" role="progressbar" aria-label={t('Loading progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={shown}>
              <i className="l94-gauge-fill" style={{width:`${shown}%`}}/>
            </div>
            <p className="l94-loading-stage" role="status" aria-live="polite" data-testid="loading-stage-label">{t(STAGE_TEXT[active])}</p>
            <ol className="l94-loading-steps" aria-hidden="true">
              {PRELOAD_STAGE_ORDER.map((id,index)=><li key={id} data-state={index<activeIndex?'done':index===activeIndex?'active':'todo'}/>)}
            </ol>
          </>}
        <LeadershipWisdomWidget variant="loading" context={{screen:'loading'}}/>
      </section>
    </main>
  </div>;
}

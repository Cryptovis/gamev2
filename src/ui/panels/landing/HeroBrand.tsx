import type {GameLanguage} from '../../../domain/game';
import {translateText} from '../../../i18n/localeText';
import {BRAND_NAME,BRAND_SHORT} from '../../BrandMark';

export interface HeroBrandProps {
  language:GameLanguage;
  version:string;
  /** Short commit or build label. Omitted when the build does not provide one. */
  buildId?:string;
}

/** Kicker, game title, gold rule, tagline and version. The name is a proper noun: never translated. */
export function HeroBrand({language,version,buildId}:HeroBrandProps) {
  const t=(text:string)=>translateText(language,text);
  return <header className="l94-hero-brand" data-testid="landing-brand">
    <p className="l94-eyebrow"><span className="l94-emblem" aria-hidden="true" translate="no">{BRAND_SHORT}</span>{t('Grand Strategy')}</p>
    <h1 id="landing-title" className="l94-title" translate="no">{BRAND_NAME}</h1>
    <p className="l94-lede">{t('Be the president you have always dreamed of.')}</p>
    <p className="l94-version" translate="no">v{version}{buildId?` · build ${buildId}`:''}</p>
  </header>;
}

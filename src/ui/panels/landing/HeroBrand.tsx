import type {GameLanguage} from '../../../domain/game';
import {translateText} from '../../../i18n/localeText';
import {BRAND_NAME} from '../../BrandMark';

export interface HeroBrandProps {
  language:GameLanguage;
}

/** Game title, gold rule and tagline, centred. The version lives in the utility dock. The name is a proper noun: never translated. */
export function HeroBrand({language}:HeroBrandProps) {
  const t=(text:string)=>translateText(language,text);
  return <header className="l94-hero-brand" data-testid="landing-brand">
    <h1 id="landing-title" className="l94-title" translate="no"><img src="/assets/command/brand-logo.png" alt="" className="l94-brand-logo" aria-hidden="true" width={580} height={377} /><span className="l94-title-text sr-only">{BRAND_NAME}</span></h1>
    <p className="l94-lede">{t('Be the president you have always dreamed of.')}</p>
  </header>;
}

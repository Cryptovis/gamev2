import type {GameLanguage} from '../../../domain/game';
import {translateText} from '../../../i18n/localeText';
import type {HeroAction} from '../../landing/heroAction';

export interface CommandMenuProps {
  language:GameLanguage;
  heroAction:HeroAction;
  /** True while a campaign is loading. The hero button is held so a second click cannot start a second load. */
  busy:boolean;
  onPlayNow():void;
  onNewCampaign():void;
  onContinue():void;
  onOpenDossier():void;
  /** Historical scenarios are not playable yet; the slot stays so the menu does not change shape when they arrive. */
  scenariosEnabled?:boolean;
  onOpenScenarios?():void;
}

const HERO_LABEL:Record<HeroAction,string>={play_now:'Play now',continue:'Continue campaign',new_campaign:'New campaign'};

/** The main call to action, then the secondary choices. All wording comes from the catalogs; all behaviour comes from props. */
export function CommandMenu({language,heroAction,busy,onPlayNow,onNewCampaign,onContinue,onOpenDossier,scenariosEnabled=false,onOpenScenarios}:CommandMenuProps) {
  const t=(text:string)=>translateText(language,text);
  const runHero={play_now:onPlayNow,continue:onContinue,new_campaign:onNewCampaign}[heroAction];
  // When the hero already starts a new campaign, a second "New campaign" entry would only repeat it.
  const showNewCampaign=heroAction!=='new_campaign';
  return <nav className="l94-menu" aria-label={t('Main menu')}>
    <div className="l94-actions">
      <button type="button" className="l94-cta" data-testid="landing-hero" data-action={heroAction} disabled={busy} aria-busy={busy||undefined} onClick={runHero}>{t(HERO_LABEL[heroAction])}</button>
      {heroAction==='play_now'&&<p className="l94-cta-note">{t('No account needed')}</p>}
    </div>
    <ul className="l94-menu-list">
      {showNewCampaign&&<li><button type="button" className="l94-link" data-testid="landing-new-campaign" disabled={busy} onClick={onNewCampaign}>{t('New campaign')}</button></li>}
      <li><button type="button" className="l94-link" data-testid="landing-scenarios" aria-disabled={scenariosEnabled?undefined:true} onClick={()=>{if(scenariosEnabled)onOpenScenarios?.();}}>{t('Historical scenarios')}{!scenariosEnabled&&<> <span className="l94-badge">{t('Coming soon')}</span></>}</button></li>
      <li><button type="button" className="l94-link" data-testid="landing-dossier" onClick={onOpenDossier}>{t('Commander dossier')}</button></li>
    </ul>
  </nav>;
}

import type {GameLanguage} from '../../../domain/game';
import {translateText} from '../../../i18n/localeText';
import type {HeroAction} from '../../landing/heroAction';

import {DossierIcon,PlusIcon,ScrollIcon} from './landingIcons';

export interface CommandMenuProps {
  language:GameLanguage;
  heroAction:HeroAction;
  /** True while a campaign is loading. The hero button is held so a second click cannot start a second load. */
  busy:boolean;
  onPlayNow():void;
  onNewCampaign():void;
  onOpenDossier():void;
  /** Historical scenarios are not playable yet; the slot stays so the menu does not change shape when they arrive. */
  scenariosEnabled?:boolean;
  onOpenScenarios?():void;
}

/**
 * The call to action and the action cards. With no save the hero button is "Play now". With a save the Continue card
 * beside this menu is the way back in, so no second Continue button is drawn here; "New campaign" is a card instead.
 * All wording comes from the catalogs; all behaviour comes from props.
 */
export function CommandMenu({language,heroAction,busy,onPlayNow,onNewCampaign,onOpenDossier,scenariosEnabled=false,onOpenScenarios}:CommandMenuProps) {
  const t=(text:string)=>translateText(language,text);
  return <nav className="l94-menu" aria-label={t('Main menu')} data-testid="landing-menu" data-action={heroAction}>
    {heroAction==='play_now'&&<div className="l94-actions">
      <button type="button" className="l94-cta" data-testid="landing-hero" data-action={heroAction} disabled={busy} aria-busy={busy||undefined} onClick={onPlayNow}>{t('Play now')}</button>
      <p className="l94-cta-note">{t('No account needed')}</p>
    </div>}
    <ul className="l94-action-cards">
      {heroAction!=='play_now'&&<li><button type="button" className="l94-action-card" data-testid="landing-new-campaign" data-primary={heroAction==='new_campaign'||undefined} disabled={busy} onClick={onNewCampaign}>
        <span className="l94-action-icon"><PlusIcon/></span><span className="l94-action-title">{t('New campaign')}</span><span className="l94-action-sub">{t('Choose a nation and begin')}</span>
      </button></li>}
      <li><button type="button" className="l94-action-card" data-testid="landing-scenarios" aria-disabled={scenariosEnabled?undefined:true} onClick={()=>{if(scenariosEnabled)onOpenScenarios?.();}}>
        <span className="l94-action-icon"><ScrollIcon/></span><span className="l94-action-title">{t('Historical scenarios')}</span>
        <span className="l94-action-sub">{t('Replay defining moments in history')}</span>{!scenariosEnabled&&<span className="l94-badge">{t('Coming soon')}</span>}
      </button></li>
      <li><button type="button" className="l94-action-card" data-testid="landing-dossier" onClick={onOpenDossier}>
        <span className="l94-action-icon"><DossierIcon/></span><span className="l94-action-title">{t('Commander dossier')}</span><span className="l94-action-sub">{t('Your profile, sign-in and saves')}</span>
      </button></li>
    </ul>
  </nav>;
}

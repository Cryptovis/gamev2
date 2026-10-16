import type {ReactNode} from 'react';
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
  onOpenDossier():void;
  /** Historical scenarios are not playable yet; the slot stays so the menu does not change shape when they arrive. */
  scenariosEnabled?:boolean;
  onOpenScenarios?():void;
  /** The Last campaign card. It sits first in the same row, so all four cards share one height. */
  lead?:ReactNode;
  /** Name of the signed-in profile; shown on the Player Profile card so the header chip is not needed. */
  profileName?:string;
}

/**
 * The call to action and the action cards. With no save the hero button is "Play now". The Last campaign card (the lead
 * slot) holds the only Continue button; New campaign, Historical scenarios and Player Profile are artwork cards beside it.
 * All wording comes from the catalogs; all behaviour comes from props.
 */
export function CommandMenu({language,heroAction,busy,onPlayNow,onNewCampaign,onOpenDossier,scenariosEnabled=false,onOpenScenarios,lead,profileName}:CommandMenuProps) {
  const t=(text:string)=>translateText(language,text);
  return <nav className="l94-menu" aria-label={t('Main menu')} data-testid="landing-menu" data-action={heroAction}>
    {heroAction==='play_now'&&<div className="l94-actions">
      <button type="button" className="l94-cta" data-testid="landing-hero" data-action={heroAction} disabled={busy} aria-busy={busy||undefined} onClick={onPlayNow}>{t('Play now')}</button>
      <p className="l94-cta-note">{t('No account needed')}</p>
    </div>}
    <ul className="l94-action-cards">
      {lead&&<li className="l94-deck-slot">{lead}</li>}
      <li><button type="button" className="l94-action-card" data-art="new" data-testid="landing-new-campaign" data-primary={heroAction==='new_campaign'||undefined} disabled={busy} onClick={onNewCampaign}>
        <span className="l94-card-art" aria-hidden="true"/>
        <span className="l94-card-text"><span className="l94-action-title">{t('New campaign')}</span><span className="l94-action-sub">{t('Choose a nation and begin')}</span></span>
      </button></li>
      <li><button type="button" className="l94-action-card" data-art="scenarios" data-testid="landing-scenarios" aria-disabled={scenariosEnabled?undefined:true} onClick={()=>{if(scenariosEnabled)onOpenScenarios?.();}}>
        <span className="l94-card-art" aria-hidden="true"/>
        <span className="l94-card-text"><span className="l94-action-title">{t('Historical scenarios')}</span>
        <span className="l94-action-sub">{t('Replay defining moments in history')}</span></span>{!scenariosEnabled&&<span className="l94-badge">{t('Coming soon')}</span>}
      </button></li>
      <li><button type="button" className="l94-action-card" data-art="profile" data-testid="landing-dossier" data-session={profileName?'profile':'guest'} onClick={onOpenDossier}>
        <span className="l94-card-art" aria-hidden="true"/>
        <span className="l94-card-text"><span className="l94-action-title">{t('Player Profile')}</span><span className="l94-action-sub">{t('Manage profile, cloud sync and saves')}</span>{profileName&&<span className="l94-action-sub l94-profile-name" data-testid="landing-profile-name">{profileName}</span>}</span>
      </button></li>
    </ul>
  </nav>;
}

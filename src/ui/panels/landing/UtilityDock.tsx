import type {GameLanguage} from '../../../domain/game';
import {LANGUAGE_OPTIONS} from '../../../i18n/gameI18n';
import {translateText} from '../../../i18n/localeText';
import type {SessionKind} from '../../landing/heroAction';
import {DossierIcon,MoonIcon,NotesIcon,SpeakerIcon,SpeakerOffIcon,SunIcon} from './landingIcons';

export interface UtilityDockProps {
  language:GameLanguage;
  onLanguageChange(next:GameLanguage):void;
  theme:'dark'|'light';
  onToggleTheme():void;
  muted:boolean;
  /** False when the audio backend cannot play; the toggle is then disabled and says why. */
  audioAvailable:boolean;
  onToggleMuted():void;
  version:string;
  onOpenReleaseNotes():void;
  sessionKind:SessionKind;
  /** Shown on the dossier chip for a signed-in profile. */
  profileName?:string;
  onOpenDossier():void;
}

// Short labels that fit a phone-width dock. The full language name is the accessible name.
const SHORT_LABEL:Record<GameLanguage,string>={en:'EN',tr:'TR',es:'ES',zh:'中文',ru:'RU'};

/** Language, theme, sound, release notes and the profile chip. Every control is a plain button or group driven by props. */
export function UtilityDock(props:UtilityDockProps) {
  const {language,theme,muted,audioAvailable,sessionKind,profileName}=props;
  const t=(text:string)=>translateText(language,text);
  const audioLabel=!audioAvailable?'Ambience coming soon':muted?'Play ambience':'Mute ambience';
  const chipText=sessionKind==='profile'&&profileName?profileName:t('Playing as guest');
  return <div className="l94-dock" role="toolbar" aria-label={t('Settings')}>
    <div className="l94-dock-group">
      <div className="l94-segmented" role="group" aria-label={t('Language')} data-testid="dock-language">
        {LANGUAGE_OPTIONS.map(option=><button key={option.id} type="button" className="l94-dock-btn l94-seg-btn" lang={option.id} aria-pressed={option.id===language} aria-label={option.label} data-testid={`dock-language-${option.id}`} onClick={()=>props.onLanguageChange(option.id)}>{SHORT_LABEL[option.id]}</button>)}
      </div>
      <button type="button" className="l94-dock-btn" data-testid="dock-theme" aria-pressed={theme==='light'} aria-label={t(theme==='light'?'Switch to dark theme':'Switch to light theme')} onClick={props.onToggleTheme}>{theme==='light'?<SunIcon/>:<MoonIcon/>}</button>
      <button type="button" className="l94-dock-btn" data-testid="dock-audio" aria-pressed={audioAvailable?!muted:undefined} aria-disabled={audioAvailable?undefined:true} aria-label={t(audioLabel)} title={t(audioLabel)} onClick={()=>{if(audioAvailable)props.onToggleMuted();}}>{audioAvailable&&!muted?<SpeakerIcon/>:<SpeakerOffIcon/>}</button>
      <button type="button" className="l94-dock-btn" data-testid="dock-release-notes" aria-label={t('Release notes')} title={t('Release notes')} onClick={props.onOpenReleaseNotes}><NotesIcon/><span className="l94-dock-label" translate="no">v{props.version}</span></button>
    </div>
    <div className="l94-dock-group">
      <button type="button" className="l94-dock-btn l94-chip" data-testid="dock-dossier-chip" data-session={sessionKind} aria-label={`${t('Commander dossier')}: ${chipText}`} onClick={props.onOpenDossier}><DossierIcon/><span className="l94-dock-label">{chipText}</span></button>
    </div>
  </div>;
}

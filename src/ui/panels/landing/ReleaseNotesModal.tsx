import type {GameLanguage} from '../../../domain/game';
import {latestReleaseNotes} from '../../../data/releaseNotes';
import {translateText} from '../../../i18n/localeText';
import {ManagedDialog} from '../../windows/ManagedDialog';
import {formatCampaignDate} from '../../landing/saveCardFormat';

export interface ReleaseNotesModalProps {
  language:GameLanguage;
  open:boolean;
  onClose():void;
}

/** The latest three release notes, in the player's language. Focus, Escape and stacking come from ManagedDialog. */
export function ReleaseNotesModal({language,open,onClose}:ReleaseNotesModalProps) {
  if(!open)return null;
  const t=(text:string)=>translateText(language,text);
  return <div className="l94-modal-layer" data-testid="release-notes-scrim" onMouseDown={onClose}>
    <ManagedDialog className="l94-modal" label={t('Release notes')} onClose={onClose} testId="release-notes-modal">
      <header>
        <h2>{t('Release notes')}</h2>
        <button type="button" className="lw-btn" data-testid="release-notes-close" autoFocus onClick={onClose}>{t('Close')}</button>
      </header>
      <div className="l94-modal-body" lang={language}>
        {latestReleaseNotes().map(note=><section key={note.version} className="l94-release">
          <h3><span translate="no">v{note.version}</span>{note.date&&<small> · {formatCampaignDate(note.date,language)}</small>}</h3>
          <ul>{note.highlights[language].map(line=><li key={line}>{line}</li>)}</ul>
        </section>)}
      </div>
    </ManagedDialog>
  </div>;
}

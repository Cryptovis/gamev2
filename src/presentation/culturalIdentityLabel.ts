import type {GameLanguage} from '../domain/game';
import {translateText} from '../i18n/localeText';

/** Translate first, then title-case with the selected locale; never alter saved identity. */
export function formatCulturalIdentity(value:string|undefined,language:GameLanguage):string {
  const translated=translateText(language,value?.replaceAll('_',' ')||'Unknown').toLocaleLowerCase(language);
  return translated.replace(/(^|[\s-])(\p{L})/gu,(_match,prefix:string,letter:string)=>prefix+letter.toLocaleUpperCase(language));
}

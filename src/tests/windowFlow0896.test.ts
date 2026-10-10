import {it,expect} from 'vitest';
import {UI_CATALOG_089_L} from '../i18n/uiCatalog089L';
import {translateText} from '../i18n/localeText';
it('window recovery and portrait labels are translated in every supported language',()=>{
 for(const key of Object.keys(UI_CATALOG_089_L))for(const language of ['tr','es','zh','ru'])expect(translateText(language,key)).not.toBe(key);
});

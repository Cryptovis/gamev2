import {it,expect} from 'vitest';
import {translateText} from '../i18n/localeText';
import {UI_CATALOG_0908} from '../i18n/uiCatalog0908';
it('corrects refreshed workspace labels in all five supported languages',()=>{
 for(const [key,translations] of Object.entries(UI_CATALOG_0908)){
  expect(translateText('en',key)).toBe(key);
  for(const [i,language] of ['tr','es','zh','ru'].entries())expect(translateText(language,key)).toBe(translations[i]);
 }
 expect(translateText('tr','National power')).toBe('Güç');
 expect(translateText('tr','Delivery')).toBe('Teslimat');
});

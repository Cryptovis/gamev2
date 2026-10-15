import {describe,it,expect} from 'vitest';
import {version} from '../../package.json';
import {makeInitialState} from '../data/initialState';
import {translateText} from '../i18n/localeText';
import {UI_CATALOG_096} from '../i18n/uiCatalog096';

describe('0.96 release contract',()=>{
 it('retains the official version and frozen save schema',()=>{
  expect(version).toBe('0.99.3');expect(makeInitialState().schemaVersion).toBe(18);
 });
 it.each(['en','tr','es','zh','ru'] as const)('translates the sign-in return action in %s',language=>{
  const index=['tr','es','zh','ru'].indexOf(language);
  for(const [key,values] of Object.entries(UI_CATALOG_096))expect(translateText(language,key)).toBe(language==='en'?key:values[index]);
 });
});

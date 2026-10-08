import {describe,it,expect} from 'vitest';
import tr from '../i18n/completedLocales/tr.json';
import es from '../i18n/completedLocales/es.json';
import zh from '../i18n/completedLocales/zh.json';
import ru from '../i18n/completedLocales/ru.json';

// Machine-translation artifacts that must never ship: subtitle markup, HTML entities, stuttered phrases.
const repeated=/(?:^|(?<=\s))(\S+(?:\s+\S+){0,3})\s+\1(?=\s|$|[.,;:!?)])/iu;
export function localeArtifacts(catalog:Record<string,string>):string[] {
 return Object.entries(catalog).filter(([,value])=>value.includes('{\\f')||/&(?:amp|quot|lt|gt|apos|#\d+);/.test(value)||repeated.test(value)).map(([key,value])=>`${key} => ${value}`);
}
describe('completed locale catalogs',()=>{
 for(const [language,catalog] of Object.entries({tr,es,zh,ru}))
  it(`${language} has no machine-translation artifacts`,()=>expect(localeArtifacts(catalog as Record<string,string>)).toEqual([]));
 it('detects the known artifact shapes',()=>{
  expect(localeArtifacts({a:'90 gün 90 gün',b:'x {\\fs16}%',c:'A &amp; B',d:'Ön tedarik ön tedarik',e:'Supply network flow'})).toHaveLength(4);
 });
});

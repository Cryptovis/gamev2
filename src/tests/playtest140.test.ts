import {describe,expect,it} from 'vitest';
import {translateText} from '../i18n/localeText';

describe('electricity tile labels',()=>{
  it('translates the renamed tile and grid status labels in all four languages',()=>{
    expect(translateText('tr','ELECTRICITY')).toBe('ELEKTRİK');
    expect(translateText('es','ELECTRICITY')).toBe('ELECTRICIDAD');
    expect(translateText('zh','ELECTRICITY')).toBe('电力');
    expect(translateText('ru','ELECTRICITY')).toBe('ЭЛЕКТРИЧЕСТВО');
    for(const key of ['Generation','Demand','Grid balance'])for(const language of ['tr','es','zh','ru'] as const)expect(translateText(language,key)).not.toBe(key);
  });
});

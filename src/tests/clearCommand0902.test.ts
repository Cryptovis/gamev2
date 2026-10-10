import {it,expect} from 'vitest';
import {makeInitialState} from '../data/initialState';
import {migrateSave} from '../persistence/migrations';
import {workspaceBounds} from '../ui/windows/DraggableWindow';
import {translateText} from '../i18n/localeText';
it('existing campaigns refresh historical country names while keeping country IDs and custom names',()=>{
 const s=makeInitialState();s.countries.TUR.name='Turkey';s.countries.MKD.name='Macedonia';
 const loaded=migrateSave(s)!;expect(loaded.countries.TUR.name).toBe('Türkiye');expect(loaded.countries.MKD.name).toBe('North Macedonia');expect(loaded.playerCountryId).toBe('TUR');
 s.countries.TUR.name='Custom republic';expect(migrateSave(s)!.countries.TUR.name).toBe('Custom republic');
});
it('country name aliases use current names in English and every other supported language',()=>{
 expect(translateText('en','Turkey')).toBe('Türkiye');expect(translateText('en','Turkiye')).toBe('Türkiye');
 for(const lang of ['tr','es','zh','ru'])expect(translateText(lang,'North Macedonia')).not.toBe('North Macedonia');
});
it.each([2048,1440,900,390])('tool frames stay beside both rails at %ipx',viewport=>{
 for(const right of [true,false]){
  const b=workspaceBounds(viewport,84,viewport-84,1040,right,12);
  expect(b.x).toBeGreaterThanOrEqual(96);expect(b.x+b.width).toBeLessThanOrEqual(viewport-96);
 }
});

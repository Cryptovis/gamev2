import { describe,expect,it } from 'vitest';
import { countryThemeFor,flagEmoji } from '../data/countryThemes';
import { tr } from '../i18n/gameI18n';

describe('nation identity',()=>{
 it('localizes core labels',()=>{expect(tr('tr','political')).toBe('SİYASİ');expect(tr('es','save')).toBe('GUARDAR');});
 it('creates flag identity and theme',()=>{expect(flagEmoji('TR')).toBe('🇹🇷');expect(countryThemeFor('TR').primary).toBeTruthy();});
});

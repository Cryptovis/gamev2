import {afterEach,expect,it,vi} from 'vitest';
import {APPEARANCE_KEY,effectiveAppearance,hasLegacyPreferences,initializeAppearance,parseAppearance,useAppearance} from '../presentation/appearance';
import {UI_CATALOG_PHASE7} from '../i18n/uiCatalogPhase7';
import {translateText} from '../i18n/localeText';
const storage=()=>{const entries=new Map<string,string>();return {getItem:(key:string)=>entries.get(key)??null,setItem:(key:string,value:string)=>entries.set(key,value)};};
afterEach(()=>vi.unstubAllGlobals());
it('parses preferences and resolves System without changing explicit choices',()=>{
 expect(parseAppearance('light')).toBe('light');expect(parseAppearance('invalid')).toBeNull();
 expect(effectiveAppearance('system',true)).toBe('dark');expect(effectiveAppearance('system',false)).toBe('light');expect(effectiveAppearance('dark',false)).toBe('dark');
});
it('new installations default to System; existing databases preserve Dark before UI mount',async()=>{
 const local=storage();vi.stubGlobal('localStorage',local);vi.stubGlobal('sessionStorage',storage());vi.stubGlobal('indexedDB',{databases:async()=>[]});
 await initializeAppearance();expect(local.getItem(APPEARANCE_KEY)).toBe('system');
 const existing=storage();vi.stubGlobal('localStorage',existing);vi.stubGlobal('indexedDB',{databases:async()=>[{name:'alpyx-global-command'}]});
 await initializeAppearance();expect(existing.getItem(APPEARANCE_KEY)).toBe('dark');
 useAppearance.getState().setPreference('light');await initializeAppearance();expect(useAppearance.getState().preference).toBe('light');
});
it('recognizes legacy settings without modifying their keys',()=>{
 const local=storage(),session=storage();expect(hasLegacyPreferences(local,session)).toBe(false);local.setItem('alpyx-map-zoom','1');expect(hasLegacyPreferences(local,session)).toBe(true);expect(local.getItem('alpyx-map-zoom')).toBe('1');
});
it('new appearance copy is translated in all five languages',()=>{
 for(const [key,values] of Object.entries(UI_CATALOG_PHASE7)){expect(translateText('en',key)).toBe(key);for(const [i,lang] of ['tr','es','zh','ru'].entries())expect(translateText(lang,key)).toBe(values[i]);}
});

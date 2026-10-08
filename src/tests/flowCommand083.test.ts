import {describe,it,expect,vi,afterEach} from 'vitest';
import {registerDemoAccount,loginDemoAccount,demoOwner,enterDemoSession,leaveDemoSession} from '../session/demoAccounts';
import {imageRequest,retryFailedImages} from '../ui/icons/reliableImage';
import {translateText} from '../i18n/localeText';
import {UI_CATALOG_FLOW} from '../i18n/uiCatalogFlow083';
const storage=()=>{const data=new Map<string,string>();return {getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value),removeItem:(key:string)=>data.delete(key),clear:()=>data.clear()};};
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('0.83 entry and recovered artwork',()=>{
 it('registers a local demo profile with a salted hash, rejects duplicates and checks login',async()=>{
  const local=storage();vi.stubGlobal('localStorage',local);vi.stubGlobal('sessionStorage',storage());
  await registerDemoAccount('Alper','alper@example.test','secret123');expect(demoOwner()).toBe('alper');const raw=local.getItem('trp-demo-accounts-v1')!;expect(raw).not.toContain('secret123');expect(JSON.parse(raw)[0].salt).toHaveLength(32);
  await expect(registerDemoAccount('ALPER','other@example.test','secret123')).rejects.toThrow('already used');await expect(loginDemoAccount('alper','wrongpass')).rejects.toThrow('incorrect');leaveDemoSession();expect(demoOwner()).toBe('guest');await loginDemoAccount(' ALPER ','secret123');expect(demoOwner()).toBe('alper');enterDemoSession();expect(demoOwner()).toBe('guest');
 });
 it('rejects a reserved guest identity and short passwords',async()=>{vi.stubGlobal('localStorage',storage());vi.stubGlobal('sessionStorage',storage());await expect(registerDemoAccount('guest','a@b.test','secret123')).rejects.toThrow('other than guest');await expect(registerDemoAccount('alper','a@b.test','123')).rejects.toThrow('8–128');});
 it('shares a request, retries transient errors, limits retries and recovers after manual retry',()=>{
  vi.useFakeTimers();const images:Array<{onload:()=>void;onerror:()=>void;src:string}>=[];vi.stubGlobal('Image',class{onload=()=>{};onerror=()=>{};src='';constructor(){images.push(this);}});
  const request=imageRequest('/test-recovery.webp');expect(imageRequest('/test-recovery.webp')).toBe(request);request.start();request.start();expect(images).toHaveLength(1);images[0].onerror();vi.advanceTimersByTime(500);expect(images[1].src).toContain('retry=1');images[1].onload();expect(request.snapshot.status).toBe('ready');request.failed();vi.advanceTimersByTime(1500);images[2].onerror();vi.advanceTimersByTime(4000);images[3].onerror();expect(request.snapshot.status).toBe('failed');vi.advanceTimersByTime(30000);expect(images).toHaveLength(4);retryFailedImages();images[4].onload();expect(request.snapshot.status).toBe('ready');
 });
 it.each(['tr','es','zh','ru'])('%s translates the complete entry and guided-turn flow',language=>{for(const key of Object.keys(UI_CATALOG_FLOW))expect(translateText(language,key),key).not.toBe(key);});
});

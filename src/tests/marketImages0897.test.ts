import {it,expect,vi,afterEach} from 'vitest';
import {imageRequest} from '../ui/icons/reliableImage';
import {translateText} from '../i18n/localeText';
import {UI_CATALOG_089_M} from '../i18n/uiCatalog089M';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
function fakeImages(){vi.useFakeTimers();const images:Array<{onload:()=>void;onerror:()=>void;src:string}>=[];vi.stubGlobal('Image',class{onload=()=>{};onerror=()=>{};src='';constructor(){images.push(this);}});return images;}
it('reopening artwork retries an exhausted shared request',()=>{
 const images=fakeImages(),r=imageRequest('/reopen0897.webp');r.start();
 for(const delay of [500,1500,4000]){images.at(-1)!.onerror();vi.advanceTimersByTime(delay);}
 images.at(-1)!.onerror();expect(r.snapshot.status).toBe('failed');r.start();expect(images).toHaveLength(5);images.at(-1)!.onload();expect(r.snapshot.status).toBe('ready');
});
it('stale image callbacks cannot poison a recovered atlas',()=>{
 const images=fakeImages(),r=imageRequest('/stale0897.webp');r.start();images[0].onerror();vi.advanceTimersByTime(500);images[1].onload();images[0].onerror();vi.advanceTimersByTime(9000);expect(r.snapshot.status).toBe('ready');expect(images).toHaveLength(2);
});
it('a stalled download times out and retries instead of loading forever',()=>{
 const images=fakeImages(),r=imageRequest('/timeout0897.webp');r.start();vi.advanceTimersByTime(8500);expect(images).toHaveLength(2);images[1].onload();expect(r.snapshot.status).toBe('ready');
});
it.each(['tr','es','zh','ru'])('%s has the market navigation labels',lang=>{for(const key of Object.keys(UI_CATALOG_089_M))expect(translateText(lang,key)).not.toBe(key);});

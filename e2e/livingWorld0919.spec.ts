import {test,expect,type Page} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';
import {withWarFuel} from '../src/tests/warFixture';
import {applyGameCommand} from '../src/engine/commands';
import type {GameState} from '../src/domain/game';

/** Phase 6.5: live HUD change counters, map event pins and the commander portrait mood. */
function fixture(language:'tr'|'en',opts:{war?:boolean;unrest?:string;calm?:boolean;happy?:boolean}={}){
 let s:GameState=campaignFixture(language);s.selectedCountryId=null;
 const id=s.playerCountryId,p=s.countries[id];
 // Start from a quiet world so only the situations named here put pins on the map.
 for(const c of Object.values(s.countries))s.countries[c.id]={...c,politics:{...c.politics,stability:Math.max(c.politics.stability,60)}};
 s.countries[id]={...s.countries[id],politics:{...s.countries[id].politics,stability:opts.happy?75:60,approval:opts.happy?85:50}};
 if(opts.unrest)s.countries[opts.unrest]={...s.countries[opts.unrest],politics:{...s.countries[opts.unrest].politics,stability:8}};
 if(opts.war)s=applyGameCommand(withWarFuel(s),{type:'military/declareWar',targetCountryId:'GRC'});
 s.selectedCountryId=null;
 void p;return s;
}
async function showFlatMap(page:Page){
 await page.locator('[data-guide="rail-map"]').click();
 const dock=page.locator('.map-command-dock');await expect(dock).toBeVisible();
 await dock.locator('.map-command-sections > div').nth(1).locator('button').nth(1).click();
 await expect(page.locator('.strategy-svg')).toHaveClass(/flat-svg/);
 await dock.locator('.map-close').click();await expect(dock).toHaveCount(0);
}
const noOverflow=(page:Page)=>page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1);
async function centre(page:Page,selector:string){
 const box=(await page.locator(selector).boundingBox())!;
 const x=box.x+box.width/2,y=box.y+box.height/2;
 expect(await page.evaluate(([px,py])=>Boolean(document.elementFromPoint(px,py)?.closest('.strategy-svg')),[x,y]),`${selector} is covered by an overlay`).toBe(true);
 return [x,y] as const;
}

test('en 1440px the HUD shows live change counters with arrows and the portrait glows gold in prosperity',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:900});
 await resumeFixture(page,fixture('en',{happy:true}));
 await expect(page.locator('.country-shape').first()).toBeAttached();
 const deltas=page.locator('.live-flows .live-delta');
 await expect(deltas).toHaveCount(3);
 for(const id of ['treasury','food','oil']){
  const d=page.locator(`.live-delta[data-delta="${id}"]`);
  await expect(d).toBeVisible();
  await expect(d).toHaveText(/^[▲▼■]\s/);
  await expect(d).toHaveText(/\/day$/);
  await expect(d).toHaveAttribute('aria-label',/^(Rising|Falling|Steady) /);
  await expect(d).toHaveClass(/\b(up|down|flat)\b/);
 }
 await expect(page.locator('.leader-avatar-button')).toHaveAttribute('data-mood','gold');
 await expect(page.locator('.leader-avatar-button .mood-note')).toHaveText('Prosperity');
 expect(errors).toEqual([]);
});

test('tr 1440px a war and a domestic unrest put pins on the flat map; clicking them opens the matching window',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('trp-map-desk-v1',JSON.stringify({tilt:false,relief:false,pins:true})));
 await page.setViewportSize({width:1440,height:900});
 await resumeFixture(page,fixture('tr',{war:true,unrest:'FRA'}));
 await expect(page.locator('.country-shape').first()).toBeAttached();
 await showFlatMap(page);
 await expect(page.locator('.leader-avatar-button')).toHaveAttribute('data-mood','alarm');
 await expect(page.locator('.leader-avatar-button .mood-note')).toHaveText('Kriz uyarısı');
 await expect(page.locator('.event-pin.kind-war')).toHaveCount(1);
 await expect(page.locator('.event-pin[data-event="unrest:FRA"]')).toHaveCount(1);
 await expect(page.locator('.event-pin-layer')).toHaveCSS('pointer-events','none');
 await page.screenshot({path:'test-results/living-world-0919-tr-1440.png'});

 // The unrest pin opens that country's hub.
 const [ux,uy]=await centre(page,'.event-pin[data-event="unrest:FRA"] .event-pin-disc');
 await page.mouse.click(ux,uy);
 await expect(page.locator('.target-hub')).toHaveAttribute('data-country','FRA');
 await page.keyboard.press('Escape');await expect(page.locator('.target-hub')).toHaveCount(0);

 // The war pin opens the war window.
 const [wx,wy]=await centre(page,'.event-pin.kind-war .event-pin-disc');
 await page.mouse.click(wx,wy);
 await expect(page.locator('.war-theatre-backdrop')).toBeVisible();
 expect(errors).toEqual([]);
});

test('en 390px phone: counters fit, the portrait names its mood, no horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await resumeFixture(page,fixture('en',{war:true}));
 await expect(page.locator('.country-shape').first()).toBeAttached();
 await expect(page.locator('.live-delta[data-delta="treasury"]')).toBeVisible();
 await expect(page.locator('.live-delta[data-delta="food"]')).toBeVisible();
 await expect(page.locator('.leader-avatar-button')).toHaveAttribute('data-mood','alarm');
 await expect(page.locator('.leader-avatar-button .mood-note')).toHaveText('Crisis alert');
 expect(await noOverflow(page)).toBe(true);
 await page.screenshot({path:'test-results/living-world-0919-en-390.png'});
});

test('en 1440px a quiet world has no event pins and a calm portrait',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await resumeFixture(page,fixture('en'));
 await expect(page.locator('.country-shape').first()).toBeAttached();
 await expect(page.locator('.event-pin')).toHaveCount(0);
 await expect(page.locator('.leader-avatar-button')).toHaveAttribute('data-mood','calm');
 await expect(page.locator('.leader-avatar-button .mood-note')).toHaveCount(0);
});

for(const [width,lang] of [[1440,'tr'],[390,'en']] as const)test(`${lang} ${width}px covert operations are 3:4 poster cards with the same buttons`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await resumeFixture(page,fixture(lang));
 await page.locator('[data-guide="nation"]').click();
 await page.locator('.country-select').selectOption('GRC');
 await page.locator('[data-guide="tab-intel"]').click();
 const posters=page.locator('.intel-actions .op-poster');
 await expect(posters).toHaveCount(4);
 for(let i=0;i<4;i++){
  const box=(await posters.nth(i).boundingBox())!;
  expect(box.height/box.width).toBeGreaterThan(1.3);expect(box.height/box.width).toBeLessThan(1.37);
  await expect(posters.nth(i).locator('.op-poster-art')).toBeVisible();
  await expect(posters.nth(i).locator('small')).toBeVisible();
 }
 expect(await noOverflow(page)).toBe(true);
 await page.screenshot({path:`test-results/living-world-0919-posters-${lang}-${width}.png`});
});

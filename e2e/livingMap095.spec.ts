import {test,expect,type Page} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';

/** Phase 9.5 stage 1: living geographic map. Shelf halo, river vectors, solar terminator and city lights over the Blue Marble surface. */
async function openGeographicMap(page:Page,theme:'dark'|'light',projection:'globe'|'flat',hour=3){
 await page.addInitScript(([t,h])=>{localStorage.setItem('trp-appearance-v1',t as string);(window as unknown as {__RON_SUN_HOUR:number}).__RON_SUN_HOUR=h as number;},[theme,hour]);
 await page.setViewportSize({width:1440,height:900});
 const state=campaignFixture('en');state.selectedCountryId=null;state.mapPresentation='geographic';state.day=290;
 await resumeFixture(page,state);
 await expect(page.locator('[data-geographic-render="worker-ready"]')).toBeAttached({timeout:45000});
 if(projection==='flat'){
  await page.locator('[data-guide="rail-map"]').click();
  const dock=page.locator('.map-command-dock');await expect(dock).toBeVisible();
  await dock.locator('.map-command-sections > div').nth(1).locator('button').nth(1).click();
  await expect(page.locator('.strategy-svg')).toHaveClass(/flat-svg/);
  await dock.locator('.map-close').click();
 }
}

for(const theme of ['dark','light'] as const)for(const projection of ['globe','flat'] as const)test(`9.5-1..3 ${theme} ${projection}: shelf halo, nine rivers and a night shade are drawn`,async({page})=>{
 await openGeographicMap(page,theme,projection);
 const svg=page.locator('.strategy-svg');
 await expect(svg.locator('[data-layer="shelf-halo"] .shelf-halo')).toHaveCount(3);
 await expect(svg.locator('[data-layer="rivers"]')).toHaveCount(0);
 await expect(svg.locator('[data-layer="night"] .night-band')).toHaveCount(4);
 const sun=await svg.locator('[data-layer="night"]').evaluate(el=>[Number(el.getAttribute('data-sun-lon')),Number(el.getAttribute('data-sun-lat'))]);
 // 03:00 UTC: the sun is over 135 degrees east, and mid-October declination is about 9 degrees south.
 expect(Math.abs(sun[0]-135)).toBeLessThan(6);expect(sun[1]).toBeLessThan(-5);expect(sun[1]).toBeGreaterThan(-13);
 // The layers never take pointer events, so country selection and dragging keep working.
 for(const layer of ['shelf-halo','night','night-lights'])expect(await svg.locator(`[data-layer="${layer}"]`).evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
});

test('9.5-3 flat map at 03:00 UTC lights London and New York and leaves Tokyo, in daylight, dark',async({page})=>{
 await openGeographicMap(page,'dark','flat',3);
 const lit=page.locator('.night-lights-layer .night-light');
 await expect(lit.first()).toBeAttached();
 await expect(page.locator('.night-light[data-city="London"]')).toBeAttached();
 await expect(page.locator('.night-light[data-city="New York"]')).toBeAttached();
 await expect(page.locator('.night-light[data-city="Tokyo"]')).toHaveCount(0);
 const count=Number(await page.locator('[data-layer="night-lights"]').getAttribute('data-lit-cities'));
 expect(count).toBeGreaterThan(10);expect(count).toBeLessThan(60);
});

test('9.5-3 Ivory night lights are ink-toned',async({page})=>{
 await openGeographicMap(page,'light','flat',3);
 const core=page.locator('.night-light-core').first();
 await expect(core).toBeAttached();
 expect(await core.evaluate(el=>getComputedStyle(el).fill)).toBe('rgb(232, 196, 140)');
});

test('9.5-3 Navy night lights are warm gold',async({page})=>{
 await openGeographicMap(page,'dark','flat',3);
 const core=page.locator('.night-light-core').first();
 await expect(core).toBeAttached();
 expect(await core.evaluate(el=>getComputedStyle(el).fill)).toBe('rgb(255, 223, 154)');
});

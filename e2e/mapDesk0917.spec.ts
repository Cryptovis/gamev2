import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {geoNaturalEarth1} from 'd3-geo';
import {campaignFixture,resumeFixture} from './seedCampaign';
import {tilt} from '../src/map/deskTilt';

/** Phase 6.3: tactile map. Hillshade layer, 18 degree desk tilt with exact click mapping, capital pins, and the three settings. */
const geojson=JSON.parse(readFileSync('public/data/countries.geojson','utf8'));
// The page's own flat projection (WorldMap.tsx): fitted to the whole geometry, camera at zoom 1 and no pan on load.
const projection=geoNaturalEarth1().fitExtent([[34,34],[1166,666]],geojson).precision(.25);
const KEY='trp-map-desk-v1';

function mapFixture(language:'tr'|'en'){
 // Map view without a country panel, so nothing covers the map.
 const s=campaignFixture(language);s.selectedCountryId=null;return s;
}
/** The projection is a store setting (default: globe), not part of a save: switch to the flat map from the map dock. */
async function showFlatMap(page:Page,keepDockOpen=false){
 await page.locator('[data-guide="rail-map"]').click();
 const dock=page.locator('.map-command-dock');await expect(dock).toBeVisible();
 await dock.locator('.map-command-sections > div').nth(1).locator('button').nth(1).click(); // PROJECTION row: GLOBE, FLAT
 await expect(page.locator('.strategy-svg')).toHaveClass(/flat-svg/);
 if(!keepDockOpen){await dock.locator('.map-close').click();await expect(dock).toHaveCount(0);}
}
/** Client pixel of a [lon, lat] on the untilted or tilted flat map, computed from the page's box exactly as the CSS lays it out. */
async function clientPoint(page:Page,lonLat:[number,number],tilted:boolean){
 const box=(await page.locator('.world-map').boundingBox())!;
 const [vx,vy]=projection(lonLat)!;
 const k=Math.min(box.width/1200,box.height/700),ox=(box.width-1200*k)/2,oy=(box.height-700*k)/2;
 let x=ox+vx*k,y=oy+vy*k;
 if(tilted)[x,y]=tilt(x,y,box.width,box.height);
 return [box.x+x,box.y+y] as [number,number];
}
/** Waits for the 190 ms tilt transition (or its absence) to settle and returns the final computed transform. */
async function settledTransform(page:Page){
 let previous='';
 await expect.poll(async()=>{const now=await page.locator('.strategy-svg').evaluate(el=>getComputedStyle(el).transform);const same=now===previous;previous=now;return same;},{timeout:5000,intervals:[120,120,120,120]}).toBe(true);
 return previous;
}
async function clickCountry(page:Page,name:string,id:string,lonLat:[number,number],tilted:boolean){
 const [x,y]=await clientPoint(page,lonLat,tilted);
 // The click must land on the map, not on a HUD element, or the test would not be measuring the mapping.
 expect(await page.evaluate(([px,py])=>Boolean(document.elementFromPoint(px,py)?.closest('.strategy-svg')),[x,y]),`${name} point is covered by an overlay`).toBe(true);
 await page.mouse.click(x,y);
 await expect(page.locator('.target-hub'),`${name} should be selected`).toHaveAttribute('data-country',id);
 await page.keyboard.press('Escape');await expect(page.locator('.target-hub')).toHaveCount(0);
}

test('tr 1440px desk tilt: 3D transform, relief layer, capital pins, exact clicks',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:900});
 await resumeFixture(page,mapFixture('tr'));
 await expect(page.locator('.country-shape').first()).toBeAttached();
 await showFlatMap(page);
 await expect(page.locator('.world-map')).toHaveClass(/desk-tilt/);
 expect(await settledTransform(page)).toMatch(/^matrix3d\(/);

 // Hillshade: its own layer, drawn by the worker, never in the way of clicks.
 const relief=page.locator('.relief-layer image');
 await expect(relief).toBeAttached({timeout:30000});
 await expect(relief).toHaveCSS('pointer-events','none');
 await expect(page.locator('.relief-layer')).toHaveCSS('pointer-events','none');

 // Capital pins: the player's own capital is always there; other countries only after zooming in; never more than 48.
 await page.mouse.move(720,8); // off the map: a hovered country would also get a pin
 await expect(page.locator('.capital-pin[data-capital="TUR"]')).toBeAttached();
 await expect(page.locator('.capital-pin.role-player')).toHaveCount(1);
 await expect(page.locator('.capital-pin.role-other')).toHaveCount(0);
 const svg=page.locator('.strategy-svg');await svg.focus();
 for(let i=0;i<5;i++)await page.keyboard.press('+');
 await expect.poll(async()=>Number(await svg.getAttribute('data-zoom'))).toBeGreaterThanOrEqual(1.8);
 await expect.poll(()=>page.locator('.capital-pin.role-other').count()).toBeGreaterThan(0);
 expect(await page.locator('.capital-pin').count()).toBeLessThanOrEqual(48);
 await page.screenshot({path:'test-results/map-desk-0917-tr-1440.png'});
 await page.locator('.camera-reset').click();
 await expect.poll(async()=>Number(await svg.getAttribute('data-zoom'))).toBeCloseTo(1,3);

 // Click accuracy under the perspective: the pixel the page's projection and the tilt maths give for an interior point picks that country.
 await clickCountry(page,'Brazil','BRA',[-52,-10],true);
 await clickCountry(page,'Russia (near the top edge)','RUS',[100,62],true);
 await clickCountry(page,'Australia','AUS',[134,-25],true);
 expect(errors).toEqual([]);
});

test('tr 1440px with the tilt off the same clicks use the plain mapping',async({page})=>{
 await page.addInitScript(([key])=>localStorage.setItem(key,JSON.stringify({tilt:false,relief:true,pins:true})),[KEY]);
 await page.setViewportSize({width:1440,height:900});
 await resumeFixture(page,mapFixture('tr'));
 await expect(page.locator('.country-shape').first()).toBeAttached();
 await showFlatMap(page);
 await expect(page.locator('.world-map')).not.toHaveClass(/desk-tilt/);
 expect(await settledTransform(page)).toBe('none');
 await clickCountry(page,'Brazil','BRA',[-52,-10],false);
 await clickCountry(page,'Russia','RUS',[100,62],false);
});

test('tr 1440px each setting turns its layer off, and the choice persists after a reload',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await resumeFixture(page,mapFixture('tr'));
 await expect(page.locator('.country-shape').first()).toBeAttached();
 await showFlatMap(page,true);
 const dock=page.locator('.map-command-dock');
 await expect(page.locator('.world-map')).toHaveClass(/desk-tilt/);await expect(page.locator('.capital-pin-layer')).toBeAttached();await expect(page.locator('.relief-layer')).toBeAttached();
 const tiltBox=dock.getByLabel('Masa eğimi',{exact:true}),reliefBox=dock.getByLabel('Kabartma gölgelendirme',{exact:true}),pinsBox=dock.getByLabel('Başkent işaretleri',{exact:true});
 for(const box of [tiltBox,reliefBox,pinsBox])await expect(box).toBeChecked();
 await expect(dock).toContainText('Natural Earth');

 await tiltBox.uncheck();await expect(page.locator('.world-map')).not.toHaveClass(/desk-tilt/);
 await reliefBox.uncheck();await expect(page.locator('.relief-layer')).toHaveCount(0);await expect(dock).not.toContainText('Natural Earth');
 await pinsBox.uncheck();await expect(page.locator('.capital-pin-layer')).toHaveCount(0);
 expect(JSON.parse((await page.evaluate(key=>localStorage.getItem(key),KEY))!)).toEqual({tilt:false,relief:false,pins:false});

 // After a reload the projection is back to the globe (a store setting), so switch to the flat map again before checking.
 await page.reload();await page.locator('.load-previous').click();
 await expect(page.locator('.country-shape').first()).toBeAttached();
 await showFlatMap(page,true);
 const dockAgain=page.locator('.map-command-dock');
 await expect(page.locator('.world-map')).not.toHaveClass(/desk-tilt/);await expect(page.locator('.relief-layer')).toHaveCount(0);await expect(page.locator('.capital-pin-layer')).toHaveCount(0);
 for(const label of ['Masa eğimi','Kabartma gölgelendirme','Başkent işaretleri'])await expect(dockAgain.getByLabel(label,{exact:true})).not.toBeChecked();

 // Turning one back on brings only that layer back.
 await dockAgain.getByLabel('Başkent işaretleri',{exact:true}).check();
 await expect(page.locator('.capital-pin-layer')).toBeAttached();await expect(page.locator('.relief-layer')).toHaveCount(0);await expect(page.locator('.world-map')).not.toHaveClass(/desk-tilt/);
});

test('en 390px phone: no tilt, no horizontal overflow, layers still drawn',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 await resumeFixture(page,mapFixture('en'));
 await expect(page.locator('.country-shape').first()).toBeAttached();
 await showFlatMap(page,true);
 await expect(page.locator('.world-map')).not.toHaveClass(/desk-tilt/);
 expect(await settledTransform(page)).toBe('none');
 await expect(page.locator('.relief-layer image')).toBeAttached({timeout:30000});
 await expect(page.locator('.capital-pin[data-capital="TUR"]')).toBeAttached();
 const dock=page.locator('.map-command-dock');
 await expect(dock.getByLabel('Desk tilt',{exact:true})).toBeChecked();await expect(dock.getByLabel('Relief shading',{exact:true})).toBeChecked();await expect(dock.getByLabel('Capital pins',{exact:true})).toBeChecked();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
 expect(await dock.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await page.screenshot({path:'test-results/map-desk-0917-en-390.png'});
 expect(errors).toEqual([]);
});

test('the globe (the default projection) stays upright and keeps its relief and pins',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await resumeFixture(page,mapFixture('en'));
 await expect(page.locator('.country-shape').first()).toBeAttached();
 await expect(page.locator('.strategy-svg')).toHaveClass(/globe-svg/);
 await expect(page.locator('.world-map')).not.toHaveClass(/desk-tilt/);
 expect(await settledTransform(page)).toBe('none');
 await expect(page.locator('.relief-layer image')).toBeAttached({timeout:30000});
 await expect(page.locator('.capital-pin[data-capital="TUR"]')).toBeAttached();
});

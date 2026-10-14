import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';
import {UI_CATALOG_094} from '../src/i18n/uiCatalog094';

for(const width of [1440,390])test(`0.94 ${width}px independent HUD, Light globe and bottom-left toast clearance`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(()=>localStorage.setItem('trp-appearance-v1','light'));
 const s=campaignFixture('en');s.selectedCountryId=null;await resumeFixture(page,s);
 for(const selector of ['.command-overview-island','.metrics-island','.clock-island','.map-help-cluster']){
  const style=await page.locator(selector).evaluate(e=>{const s=getComputedStyle(e);return {bg:s.backgroundColor,image:s.backgroundImage,border:s.borderTopWidth,padding:s.padding};});
  expect(style).toEqual({bg:'rgba(0, 0, 0, 0)',image:'none',border:'0px',padding:'0px'});
 }
 expect(await page.locator('.strategy-svg').evaluate(e=>getComputedStyle(e).backgroundImage)).toContain('radial-gradient');
 expect(await page.locator('.ocean-sphere').evaluate(e=>getComputedStyle(e).filter)).toContain('drop-shadow');
 await page.locator('[data-guide="nation"]').click();const badges=page.locator('.command-panel .identity-strip>span');
 for(const badge of await badges.all())expect(await badge.evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(243, 239, 229)');
 await expect(page.locator('.command-panel .national-panel-heading button')).not.toHaveAttribute('title');
 expect(await page.locator('.national-flag-card strong').evaluate(e=>getComputedStyle(e).color)).toBe('rgb(255, 255, 255)');
 await page.keyboard.press('Escape');
 await page.locator('[data-guide="rail-world"]').click();await page.locator('#pulse-window .ranking-table tbody button').filter({hasText:'France'}).first().click();
 const action=page.locator('.target-hub [data-action="aid"] .hub-card-variants button').first();await action.hover();
 await expect.poll(()=>action.evaluate(e=>getComputedStyle(e).cursor)).toBe('pointer');
 await action.click();await page.locator('.strategic-decision-modal .confirm').click();await page.locator('[data-guide="review-dismiss"]').first().click();await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 const toast=page.locator('.sitrep-toast');await expect(toast).toBeVisible();await toast.dispatchEvent('mouseenter');
 const r=await toast.boundingBox();expect(r!.x).toBeCloseTo(20);expect(r!.x+r!.width).toBeLessThanOrEqual(width-19);
 for(const selector of ['.map-camera-hud','.command-rail-left','.map-help-cluster']){
  const b=await page.locator(selector).boundingBox();expect(!!b&&r!.x<b.x+b.width&&r!.x+r!.width>b.x&&r!.y<b.y+b.height&&r!.y+r!.height>b.y).toBe(false);
 }
 if(width===390){const camera=await page.locator('.map-camera-hud').boundingBox();for(const selector of ['.command-rail-left','.map-help-cluster']){const b=await page.locator(selector).boundingBox();expect(camera!.x<b!.x+b!.width&&camera!.x+camera!.width>b!.x&&camera!.y<b!.y+b!.height&&camera!.y+camera!.height>b!.y).toBe(false);}}
 await page.screenshot({path:`test-results/release094-${width}.png`,animations:'disabled'});
});
for(const [index,language] of ['en','tr','es','zh','ru'].entries())test(`0.94 ${language} portrait perk is localized and preview stays in the wizard`,async({page})=>{
 await page.setViewportSize({width:language==='en'?1440:390,height:900});
 const s=campaignFixture(language as 'en'|'tr'|'es'|'zh'|'ru');s.playerProfile.setupComplete=false;s.playerProfile.avatarId='avatar-03';await resumeFixture(page,s);
 await expect(page.locator('.setup-home')).toHaveCount(0);await page.locator('.wizard-next').click();
 const preview=page.locator('.wizard-avatar-preview');await preview.scrollIntoViewIfNeeded();await expect(preview.locator('[data-archetype="diplomat"]')).toContainText(index===0?'Global Envoy':UI_CATALOG_094['Global Envoy'][index-1]);
 if(language==='en'){const a=await page.locator('.wizard-avatar-grid').boundingBox(),b=await preview.boundingBox();expect(a!.y).toBeCloseTo(b!.y);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

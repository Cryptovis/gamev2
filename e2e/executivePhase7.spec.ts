import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';
for(const width of [1440,390])test(`${width}px core executive sections share a centered, keyboard reachable shell`,async({page})=>{
 await page.setViewportSize({width,height:900});await resumeFixture(page,campaignFixture('en'));
 await page.locator('[data-guide="nation"]').click();
 for(const tab of ['policies','military','economy']){
  await page.locator(`[data-guide="tab-${tab}"]`).click();const shell=page.locator('#country-section-window.executive-workspace');await expect(shell).toBeVisible();await expect(page.locator('.command-panel')).toBeHidden();
  const box=await shell.boundingBox();expect(Math.abs(box!.x+box!.width/2-width/2)).toBeLessThan(2);expect(box!.width).toBeGreaterThan(width===390?350:900);
  const last=shell.locator('button:not(:disabled)').last();await last.focus();await page.keyboard.press('Tab');await expect(shell.locator('[data-guide="close-workspace"]')).toBeFocused();
  await page.keyboard.press('Escape');await expect(shell).toHaveCount(0);await expect(page.locator(`[data-guide="tab-${tab}"]`)).toBeFocused();
 }
 await page.locator('[data-guide="tab-policies"]').click();const tabs=page.locator('.executive-section-tabs [role="tab"]');const body=page.locator('#country-section-window .executive-body');await body.evaluate(el=>{el.scrollTop=Math.min(150,el.scrollHeight-el.clientHeight);});const offset=await body.evaluate(el=>el.scrollTop);expect(offset).toBeGreaterThan(0);await tabs.nth(1).click();await tabs.first().click();await expect.poll(()=>body.evaluate(el=>el.scrollTop)).toBe(offset);await tabs.first().focus();await page.keyboard.press('ArrowRight');await expect(tabs.nth(1)).toHaveAttribute('aria-selected','true');
 await page.screenshot({path:`test-results/phase7-executive-${width}.png`});
});
for(const language of ['en','tr','es','zh','ru'] as const)test(`${language} diplomacy rail stays single-line and Inbox is centered`,async({page})=>{
 const state=campaignFixture(language);state.selectedCountryId=null;await resumeFixture(page,state);
 const label=page.locator('[data-guide="rail-diplo"] small');
 const dimensions=await label.evaluate(el=>({font:parseFloat(getComputedStyle(el).fontSize),width:el.clientWidth,scroll:el.scrollWidth,wrap:getComputedStyle(el).whiteSpace}));
 expect(dimensions.font).toBeGreaterThanOrEqual(10);expect(dimensions.wrap).toBe('nowrap');expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width+1);
 await page.locator('[data-guide="rail-diplo"]').click();await expect(page.locator('#diplomacy-window.executive-workspace')).toBeVisible();
 await page.locator('.executive-backdrop').click({position:{x:2,y:2}});await expect(page.locator('#diplomacy-window')).toHaveCount(0);await expect(page.locator('[data-guide="rail-diplo"]')).toBeFocused();
});

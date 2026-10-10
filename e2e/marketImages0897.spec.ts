import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';
for(const width of [1440,390])test(`${width}px market sections show only selected content and keep navigation accessible`,async({page})=>{
 await page.setViewportSize({width,height:900});await resumeFixture(page,campaignFixture('en'));await page.locator('[data-guide="rail-market"]').click();const menu=page.locator('#market-window>.floating-command-body>.section-menu');await expect(menu).toBeVisible();await expect(page.locator('.open-exchange')).toBeVisible();await expect(page.locator('.commodity-exchange')).toHaveCount(0);
 for(const [name,selector] of [['Commodity Exchange','.commodity-exchange'],['Sovereign Credit & Monetary Fund','.credit-compose'],['Supply contracts','.exchange-order'],['Trade partners','.trade-finder']]){
  await menu.getByRole('button',{name,exact:true}).click();await expect(page.locator(selector)).toBeVisible();await expect(page.locator('.open-exchange')).toHaveCount(0);await expect(menu).toBeVisible();const box=await menu.boundingBox();expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThan(900);
 }
 await menu.getByRole('button',{name:'Open Market & Precious Metals',exact:true}).click();await expect(page.locator('.credit-compose')).toHaveCount(0);await expect(page.locator('.open-exchange')).toBeVisible();await page.screenshot({path:`test-results/market-menu-0897-${width}.png`,fullPage:true});
});
test('atlas artwork recovers when its window is reopened after a failed download',async({page})=>{
 let offline=true;await page.route('**/assets/command/resource-atlas.webp*',r=>offline?r.abort():r.continue());await resumeFixture(page,campaignFixture('en'));await page.locator('[data-guide="rail-market"]').click();await expect(page.locator('#market-window .atlas-fallback').first()).toBeVisible();await page.waitForTimeout(6500);offline=false;await page.locator('[data-guide="close-workspace"]:visible').click();await page.locator('[data-guide="rail-market"]').click();await expect(page.locator('#market-window img[src*="resource-atlas.webp"]').first()).toBeVisible();
});

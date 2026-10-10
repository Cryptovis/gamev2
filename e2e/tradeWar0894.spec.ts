import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';
import {withWarFuel} from '../src/tests/warFixture';
import {updateBilateralRelation} from '../src/engine/systems/diplomacy';
async function oilTrade(page:import('@playwright/test').Page,score:number) {
 let s=campaignFixture('en');s.countries.BGR.resources.oil=10000;s.countries.TUR.economy.treasury=10000;
 s=updateBilateralRelation(s,'TUR','BGR',r=>({...r,score,status:'neutral',treaties:['trade']}));
 await resumeFixture(page,s);await page.locator('[data-guide="rail-supply"]').click();
 await page.locator('.resource-filter').getByRole('button',{name:/oil/i}).click();
 const row=page.locator('.trade-row').filter({hasText:'Bulgaria'}).first();await row.getByRole('button',{name:'IMPORT',exact:true}).click();
}
for(const width of [1440,390])test(`${width}px monthly contract choices and disabled relation gate`,async({page})=>{
 await page.setViewportSize({width,height:900});await oilTrade(page,-20);await expect(page.getByRole('button',{name:'LONG-TERM AGREEMENT',exact:true})).toBeDisabled();await expect(page.locator('.review-dialog')).toContainText('above 40/100');
 await page.locator('[data-guide="review-dismiss"]').first().click();
 await oilTrade(page,-18);await page.getByRole('button',{name:'LONG-TERM AGREEMENT',exact:true}).click();await expect(page.locator('.contract-duration button')).toHaveCount(4);await page.getByRole('button',{name:'5 years',exact:true}).click();await expect(page.getByRole('button',{name:'5 years',exact:true})).toHaveAttribute('aria-pressed','true');
 const confirm=await page.getByRole('button',{name:'SIGN AGREEMENT',exact:true}).boundingBox();expect(confirm!.y+confirm!.height).toBeLessThanOrEqual(900);await page.screenshot({path:`test-results/contract-0894-${width}.png`,fullPage:true});await page.getByRole('button',{name:'SIGN AGREEMENT',exact:true}).click();await expect(page.locator('.review-dialog')).toContainText('5-year OIL contract signed');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('war review blocks inadequate refined fuel and shows the exact shortfall',async({page})=>{
 const s=campaignFixture('en');s.countries.TUR.resources.oil=100000;s.countries.TUR.processedResources.fuel=0;
 await resumeFixture(page,s);await page.locator('[data-guide="nation"]').first().click();await page.locator('.country-select').selectOption('GRC');await page.locator('[data-guide="tab-war"]').click();await page.locator('.declare-war').click();await expect(page.locator('.strategic-decision-modal .confirm')).toBeDisabled();await expect(page.locator('.strategic-decision-modal')).toContainText('14 operational days');await expect(page.locator('.strategic-decision-modal')).toContainText('FUEL SHORTFALL');
});
test('auto assault selects 5× and advances days without fuel advice modals',async({page})=>{
 await resumeFixture(page,withWarFuel(campaignFixture('en')));await page.locator('[data-guide="nation"]').first().click();await page.locator('.country-select').selectOption('GRC');await page.locator('[data-guide="tab-war"]').click();await page.locator('.declare-war').click();await page.locator('.strategic-decision-modal .confirm').click();
 const day=await page.locator('.campaign-clock strong').innerText();await page.getByRole('button',{name:'Enable auto assault',exact:true}).click();await expect(page.locator('.speed-segment button').last()).toHaveClass(/active/);await expect(page.locator('.campaign-clock strong')).not.toHaveText(day);await expect(page.locator('.war-theatre')).toContainText('one day per second');await expect(page.locator('.economic-advice-backdrop')).toHaveCount(0);
});
test('country panel is ready at startup and remains usable with subsequent downloads blocked',async({page})=>{
 await resumeFixture(page,campaignFixture('en'));let requests=0;
 await page.route(/\/(assets|src)\/.*CountryPanel.*\.(js|tsx)/,route=>{requests++;return route.abort('failed');});
 await page.locator('[data-guide="nation"]').click();await expect(page.locator('.command-panel')).toBeVisible();expect(requests).toBe(0);await expect(page.locator('[data-testid="error-boundary"]')).toHaveCount(0);await expect(page.locator('.brand-line')).toContainText('Browser playtest');
});

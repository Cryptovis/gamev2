import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture,openNation} from './seedCampaign';

test('the inbox is ready after startup even when later module downloads are unavailable',async({page})=>{
 await resumeFixture(page,campaignFixture('en'));let requests=0;
 await page.route(/\/(assets|src)\/.*DiplomaticPost.*\.(js|tsx)/,route=>{requests++;return route.abort('failed');});
 await page.locator('[data-guide="rail-diplo"]').click();await expect(page.locator('.diplomatic-post')).toBeVisible();expect(requests).toBe(0);await expect(page.locator('[data-testid="error-boundary"]')).toHaveCount(0);
});
test('closing and reopening the ready inbox needs no import retries and preserves the campaign',async({page})=>{
 await resumeFixture(page,campaignFixture('en'));await page.route(/\/(assets|src)\/.*DiplomaticPost.*\.(js|tsx)/,route=>route.abort('failed'));
 for(let i=0;i<2;i++){await page.locator('[data-guide="rail-diplo"]').click();await expect(page.locator('.diplomatic-post')).toBeVisible();await expect(page.locator('.brand-line')).toContainText('Browser playtest');await page.keyboard.press('Escape');}
 await expect(page.locator('[data-testid="panel-load-error"]')).toHaveCount(0);
});
for(const width of [1440,390])test(`${width}px country trade heading separates label, country and metrics`,async({page})=>{
 await page.setViewportSize({width,height:900});await resumeFixture(page,campaignFixture('en'));await openNation(page);await page.locator('.country-select').selectOption('AZE');await page.locator('[data-guide="tab-trade"]').click();const hero=page.locator('.trade-country-hero');await expect(hero).toBeVisible();await hero.scrollIntoViewIfNeeded();const label=await hero.locator('.trade-desk-title small').boundingBox(),name=await hero.locator('.trade-desk-title strong').boundingBox(),facts=await hero.locator('.trade-desk-facts').boundingBox();expect(name!.y).toBeGreaterThanOrEqual(label!.y+label!.height);expect(facts!.y).toBeGreaterThan(name!.y+name!.height);await page.screenshot({path:`test-results/trade-heading-0896-${width}.png`,fullPage:true});
});
test('nested review owns Escape and Tab, restores focus and keeps its parent open',async({page})=>{
 const s=campaignFixture('en');s.countries.TUR.economy.treasury=10000;
 await resumeFixture(page,s);await page.locator('[data-guide="rail-diplo"]').click();await page.locator('.letter-compose select').first().selectOption('BRA');const open=page.locator('.letter-compose').getByRole('button',{name:'Review proposal',exact:true});await open.click();await expect(page.locator('.review-dialog')).toBeVisible();
 const buttons=page.locator('.review-dialog button:not(:disabled)');await buttons.last().focus();await page.keyboard.press('Tab');await expect(buttons.first()).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(buttons.last()).toBeFocused();await page.keyboard.press('Escape');await expect(page.locator('.review-dialog')).toHaveCount(0);await expect(page.locator('.diplomatic-post')).toBeVisible();await expect(open).toBeFocused();await page.keyboard.press('Escape');await expect(page.locator('#diplomacy-window')).toHaveCount(0);await expect(page.locator('[data-guide="rail-diplo"]')).toBeFocused();
});
test('the commander menu closes with Escape and restores its trigger',async({page})=>{
 await resumeFixture(page,campaignFixture('en'));await page.locator('.leader-avatar-button').click();await expect(page.locator('.player-options-modal')).toBeVisible();await expect(page.getByRole('button',{name:'CHANGE PORTRAIT',exact:true})).toHaveCount(0);await page.keyboard.press('Escape');await expect(page.locator('.player-options-modal')).toHaveCount(0);await expect(page.locator('.leader-avatar-button')).toBeFocused();
});
test('proposal confirmation and its receipt hold the clock until the final dialog closes',async({page})=>{
 const s=campaignFixture('en');s.countries.TUR.economy.treasury=10000;await resumeFixture(page,s);
 await page.locator('.speed-segment button').nth(3).click();await page.locator('[data-guide="rail-diplo"]').click();await page.locator('.letter-compose').getByRole('button',{name:'Review proposal',exact:true}).click();await expect(page.locator('.speed-segment button').first()).toHaveClass(/active/);await page.locator('[data-guide="review-confirm"]').click();await expect(page.locator('.review-result')).toBeVisible();await expect(page.locator('.speed-segment button').first()).toHaveClass(/active/);await page.locator('.review-result [data-guide="review-dismiss"]').first().click();await expect(page.locator('.speed-segment button').nth(3)).toHaveClass(/active/);
});

import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture,openNation} from './seedCampaign';
import {enterAsGuest} from './helpers/enterAsGuest';
for(const language of ['en','tr','es','zh','ru'] as const)test(`Affairs explains unavailable foreign actions in ${language}`,async({page})=>{
 await resumeFixture(page,campaignFixture(language));await openNation(page);await page.locator('.country-select').selectOption('GRC');
 await expect(page.locator('.trade-desk-shortcut')).toHaveCount(0);
 if(language==='en')await page.screenshot({path:'test-results/country-090.png'});
 await page.locator('[data-guide="tab-affairs"]').click();await expect(page.locator('.affairs-hero')).toBeVisible();
 await page.locator('.affairs-shell .section-menu button').nth(1).click();await expect(page.locator('.affairs-thresholds')).toBeVisible();
 const action=page.locator('.affairs-action').first();await expect(action.locator('button')).toBeDisabled();await expect(action.locator('.affairs-blockers')).toBeVisible();await expect(action).not.toContainText('Command unavailable');
 if(language!=='en'){await expect(action).not.toContainText('Target approval must');await expect(page.locator('.affairs-shell')).not.toContainText('Average readiness and logistics');}
 await page.screenshot({path:`test-results/affairs-090-${language}.png`});
});
for(const width of [1440,390])test(`${width}px territory sections retain navigation and apply one reviewed preparation`,async({page})=>{
 await page.setViewportSize({width,height:900});const s=campaignFixture('en');s.countries.GRC.controllerCountryId='TUR';await resumeFixture(page,s);
 await openNation(page);await page.locator('.country-select').selectOption('GRC');await page.locator('[data-guide="tab-affairs"]').click();
 const nav=page.locator('.affairs-shell .section-menu');await nav.getByRole('button',{name:'Territory integration',exact:true}).click();
 await expect(page.locator('.integration-requirements')).toBeVisible();const action=page.locator('.affairs-action').first();await action.locator('button').click();
 await expect(page.locator('.review-dialog')).toBeVisible();await page.locator('[data-guide="review-confirm"]').click();
 await expect(page.locator('.review-result')).toBeVisible();
 await page.locator('.review-result footer [data-guide="review-dismiss"]').click();
 await expect(action.locator('button')).toBeDisabled();await expect(action).toContainText('7');
 await nav.getByRole('button',{name:'Administration',exact:true}).click();await expect(page.locator('.integration-requirements')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(nav).toBeInViewport();await expect(page.locator('[data-guide="close-workspace"]:visible').last()).toBeInViewport();
 await page.screenshot({path:`test-results/territory-090-${width}.png`});
});
test('the setup wizard shows one compact leadership quote that stays put while the player types',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>.1;});await page.goto('/');await enterAsGuest(page);
 const quote=page.getByTestId('wisdom-widget');await expect(quote).toBeVisible();await expect(quote).toHaveAttribute('data-variant','compact');
 const first=await quote.getAttribute('data-quote-id');expect(first).toBeTruthy();
 await page.locator('.wizard-name-field input').fill('Quiet reader');await page.waitForTimeout(500);await expect(quote).toHaveAttribute('data-quote-id',first!);
 await expect(page.locator('.entry-tagline')).toBeVisible();await expect(page.locator('.setup-cover')).not.toContainText('THE REAL PRESIDENT');
});
test('keyboard map controls zoom, return home and open the nation without selecting a hidden country',async({page})=>{
 await resumeFixture(page,campaignFixture('en'));const map=page.locator('.strategy-svg');await map.focus();const zoom=Number(await map.getAttribute('data-zoom'));await page.keyboard.press('+');await expect.poll(async()=>Number(await map.getAttribute('data-zoom'))).toBeGreaterThan(zoom);await page.keyboard.press('ArrowRight');await page.keyboard.press('Home');await page.keyboard.press('Enter');await expect(page.locator('.country-select')).toHaveValue('TUR');
 await page.locator('[data-guide="tab-war"]').click();await expect(page.locator('#country-section-window')).toBeVisible();await expect(page.locator('.command-panel')).toBeHidden();
});

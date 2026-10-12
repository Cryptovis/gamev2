import {test,expect,type Page} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';
import {withWarFuel} from '../src/tests/warFixture';

/** Phase 5: one tactical round (player bombards) and its recorded replay. */
async function foughtRound(page:Page){
 await resumeFixture(page,withWarFuel(campaignFixture('en')));await page.locator('[data-guide="nation"]').first().click();await page.locator('.country-select').selectOption('GRC');await page.locator('[data-guide="tab-war"]').click();
 await page.locator('.declare-war').click();await page.locator('.strategic-decision-modal .confirm').click();await expect(page.locator('.war-theatre-backdrop')).toBeVisible();
 await page.locator('.hd-war-button').click();await page.locator('[data-guide="review-dismiss"]').first().click();await expect(page.locator('[data-testid="tactical-battlefield"]')).toBeVisible();
 await page.locator('[data-unit="attacker-infantry-1"]').click();await page.locator('[data-order-kind="move"]').click();await page.locator('[data-cell="22"]').click();await page.locator('.tactical-queue').click();
 await page.locator('.tactical-commit').click();await page.locator('[data-guide="review-confirm"]').click();await page.locator('[data-guide="review-confirm"]').click();await page.locator('[data-guide="review-dismiss"]').first().click();
 await expect(page.locator('.tactical-round-result h4')).toContainText('1');
}

test('sound options persist in this browser, and missing sound files never break the game',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 // Every sound request fails: the game must continue silently.
 await page.route('**/assets/audio/**',route=>route.abort());
 await resumeFixture(page,campaignFixture('en'));
 await page.locator('.leader-avatar-button').click();await page.locator('.profile-tabs button',{hasText:'Sound'}).click();
 const options=page.locator('[data-testid="audio-options"]');await expect(options).toBeVisible();
 await options.locator('.audio-toggle input').first().check();
 await options.locator('.audio-toggle input').last().check();
 await page.reload();await page.locator('.load-previous').click();
 await page.locator('.leader-avatar-button').click();await page.locator('.profile-tabs button',{hasText:'Sound'}).click();
 await expect(options.locator('.audio-toggle input').first()).toBeChecked();await expect(options.locator('.audio-toggle input').last()).toBeChecked();
 await expect(options.locator('.audio-slider input').first()).toBeDisabled();
 // The last tab is still the session tab (save and load).
 await expect(page.locator('.profile-tabs button').last()).toHaveText('Session');
 await page.screenshot({path:'test-results/audio-options-0914.png'});
 expect(errors).toEqual([]);
});

test('replay draws recorded effects; low effects shows one round summary instead',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await foughtRound(page);
 const result=await page.locator('.tactical-round-result p').first().innerText();
 await page.locator('.tactical-round-result button').first().click();await expect(page.locator('.tactical-playback')).toBeVisible();
 // Let the replay finish, then step back one recorded action (this also pauses).
 await page.getByRole('button',{name:'Skip to result'}).click();
 await page.getByRole('button',{name:'Previous step'}).click();
 await expect(page.locator('.battle-fx')).toHaveCount(1);
 await page.screenshot({path:'test-results/battle-fx-0914.png',fullPage:true});
 await page.getByRole('button',{name:'Skip to result'}).click();
 await expect(page.locator('.tactical-round-result p').first()).toHaveText(result);
 await page.locator('.tactical-round-result button').first().click(); // back to live orders
 await page.evaluate(()=>{localStorage.setItem('trp-audio-v1',JSON.stringify({muted:true,master:.8,channels:{ui:.6,war:.8,ambient:.35},lowEffects:true}));});
 await page.locator('.war-theatre > header > button').click();await page.locator('.leader-avatar-button').click();await page.locator('.profile-tabs button').last().click();await page.locator('.campaign-option-actions button').first().click();
 await expect(page.locator('.campaign-save-status')).toBeVisible();
 await page.reload();await page.locator('.load-previous').click();
 await expect(page.locator('[data-testid="tactical-battlefield"]')).toBeVisible();
 await expect(page.locator('.round-summary-strip')).toBeVisible();
 // A loaded war shows the last round's result first; close it.
 const review=await page.locator('.review-dialog').waitFor({state:'visible',timeout:5000}).then(()=>true,()=>false);
 if(review)await page.locator('.review-dialog [data-guide="review-dismiss"]').first().click();
 await page.locator('.tactical-round-result button').first().click();
 await expect(page.locator('.battle-fx')).toHaveCount(0);
 await expect(page.locator('.tactical-round-result p').first()).toHaveText(result);
 await page.screenshot({path:'test-results/round-summary-0914.png',fullPage:true});
 expect(errors).toEqual([]);
});

test('reduced motion turns battle playback into the summary',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await foughtRound(page);
 await expect(page.locator('.round-summary-strip')).toBeVisible();
 await page.locator('.tactical-round-result button').first().click();
 await expect(page.locator('.battle-fx')).toHaveCount(0);
 expect(errors).toEqual([]);
});

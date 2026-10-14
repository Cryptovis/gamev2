import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';

test('toast focus keeps expiry paused after mouse leave; dismissing the last toast releases the next one',async({page})=>{
 const s=campaignFixture('en');s.selectedCountryId=null;await resumeFixture(page,s);
 const aid=async(index:number)=>{
  await page.locator('[data-guide="rail-world"]').click();
  await page.locator('#pulse-window .ranking-table tbody button').filter({hasText:'France'}).first().click();
  await page.locator('.target-hub [data-action="aid"] .hub-card-variants button').nth(index).click();
  await page.locator('.strategic-decision-modal .confirm').click();
  await page.locator('[data-guide="review-dismiss"]').first().click();
  await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 };
 await aid(0);const toast=page.locator('.sitrep-toast');await expect(toast).toBeVisible();
 await toast.dispatchEvent('mouseenter');
 await toast.getByRole('button',{name:'Dismiss alert',exact:true}).focus();
 await toast.dispatchEvent('mouseleave');
 // Exercise the actual six-second expiry boundary while keyboard focus still owns the pause.
 await page.waitForTimeout(6300);await expect(toast).toBeVisible();
 await toast.dispatchEvent('mouseenter');
 await page.keyboard.press('Enter');await expect(toast).toHaveCount(0);
 await aid(1);await expect(toast).toBeVisible();
 await page.mouse.move(5,880);
 await expect(toast).toHaveCount(0,{timeout:9000});
});

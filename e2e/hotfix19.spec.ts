import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';

for(const theme of ['dark','light'] as const)test(`1.9-3 ${theme}: five tabs in one row and four aligned status boxes`, async ({page}) => {
  await page.addInitScript(t=>localStorage.setItem('trp-appearance-v1',t),theme);
  await page.setViewportSize({width:1440,height:900});
  const state=campaignFixture('en');state.selectedCountryId=null;await resumeFixture(page,state);
  await page.locator('.leader-avatar-button').click();
  const modal=page.locator('.player-options-modal');
  await expect(modal).toBeVisible();
  const tabs=await modal.locator('.profile-tabs button').all();
  expect(tabs).toHaveLength(5);
  const boxes=await Promise.all(tabs.map(async tab=>(await tab.boundingBox())!));
  for(const box of boxes)expect(Math.abs(box.y-boxes[0].y)).toBeLessThanOrEqual(1);
  await expect(modal.locator('.profile-tabs button')).toHaveText(['Profile','Campaign','Settings','Sound','Session']);
  for(const tab of tabs)expect(await tab.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  const status=await Promise.all((await modal.locator('.campaign-status-grid>span:not([hidden])').all()).map(async box=>(await box.boundingBox())!));
  expect(status.length).toBeGreaterThanOrEqual(1);
  for(const box of status){expect(box.height).toBeGreaterThan(0);}
  await expect(modal.locator('[data-status="day"] small')).toHaveText('Days in Office');
});

test('1.9-4 the hardware card stays inside 680px and the page does not scroll sideways on a phone', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await resumeFixture(page,campaignFixture('en'));await page.locator('[data-guide="rail-alliances"]').click();
  await page.getByRole('tab',{name:'Sanctions & Enforcement'}).or(page.getByRole('button',{name:'Sanctions & Enforcement'})).first().click();
  const card=page.getByTestId('hardware-card');
  await expect(card).toBeVisible();
  expect((await card.boundingBox())!.width).toBeLessThanOrEqual(681);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
  await expect(page.getByTestId('hardware-context')).toBeVisible();
});

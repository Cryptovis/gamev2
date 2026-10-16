import {test,expect} from '@playwright/test';
import {landingReady,enterAsGuest} from './helpers/enterAsGuest';
import {campaignFixture,resumeFixture,openNation,seedSave} from './seedCampaign';

test('1.7-1 the brand is centred with no pill and no version, and the resume bar spans the three cards', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});await page.goto('/');await landingReady(page);
  const brand=page.getByTestId('landing-brand');
  await expect(brand.locator('h1')).toContainText('Rule of Nations');
  await expect(brand).not.toContainText('Grand Strategy');await expect(brand).not.toContainText(/v\d+\.\d+/);
  const title=(await brand.locator('h1').boundingBox())!,lede=(await brand.locator('.l94-lede').boundingBox())!;
  expect(Math.abs(title.x+title.width/2-720)).toBeLessThanOrEqual(24);expect(Math.abs(lede.x+lede.width/2-720)).toBeLessThanOrEqual(24);
  const cards=await Promise.all(['landing-new-campaign','landing-scenarios','landing-dossier'].map(async id=>(await page.getByTestId(id).boundingBox())!));
  for(const box of cards){expect(Math.abs(box.y-cards[0].y)).toBeLessThanOrEqual(1);expect(Math.abs(box.width-cards[0].width)).toBeLessThanOrEqual(2);}
  const bar=(await page.getByTestId('save-card').boundingBox())!;
  expect(bar.y).toBeGreaterThan(cards[0].y+cards[0].height-1);
  expect(Math.abs(bar.x-cards[0].x)).toBeLessThanOrEqual(1);expect(Math.abs(bar.x+bar.width-(cards[2].x+cards[2].width))).toBeLessThanOrEqual(1);
});

test('1.7-1b the resume bar carries the new title, the flag, the leader and the Continue button', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  const state=campaignFixture('en');state.selectedCountryId=null;await seedSave(page,state);await landingReady(page);
  const bar=page.getByTestId('save-card');
  await expect(bar.locator('h2')).toHaveText('Continue with Last Saved Campaign');
  await expect(bar.locator('.l94-flag-emoji')).toBeVisible();await expect(bar.getByTestId('save-card-continue')).toBeVisible();
});

test('1.7-2 the setup wizard has a graticule backdrop and the same compact poster on every step', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});await page.goto('/');await landingReady(page);await enterAsGuest(page);
  const image=await page.locator('.campaign-wizard-backdrop').evaluate(el=>getComputedStyle(el).backgroundImage);
  expect(image).toContain('repeating-linear-gradient');
  const shell=(await page.locator('.campaign-wizard').boundingBox())!,cover=(await page.locator('.setup-cover').boundingBox())!;
  expect(cover.width/shell.width).toBeGreaterThan(0.31);expect(cover.width/shell.width).toBeLessThan(0.37);
});

test('1.7-4 Days in Office sits under the date in the clock and the capsule keeps portrait and name', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  const state=campaignFixture('en');state.selectedCountryId=null;state.playerProfile.commanderName='Alexander Hamilton-Washington III';await resumeFixture(page,state);
  const clock=page.locator('.campaign-clock'),days=clock.getByTestId('days-in-office');
  await expect(days).toContainText('Days in Office:');
  const date=(await clock.locator('strong').boundingBox())!,line=(await days.boundingBox())!;
  expect(line.y).toBeGreaterThanOrEqual(date.y+date.height-1);
  const fontOf=(selector:string)=>page.locator(selector).first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(await fontOf('.campaign-clock [data-testid="days-in-office"]')).toBeLessThan(await fontOf('.campaign-clock strong'));
  await expect(page.locator('.leader-capsule .day-chip')).toHaveCount(0);
  const name=page.getByTestId('commander-name');
  await expect(name).toHaveText('Alexander Hamilton-W…');await expect(name).toHaveAttribute('title','Alexander Hamilton-Washington III');
  const capsule=(await page.locator('.leader-capsule').boundingBox())!,box=(await name.boundingBox())!;
  expect(box.x+box.width).toBeLessThanOrEqual(capsule.x+capsule.width+1);
});

test('1.7-5 the Diplomatic Hub icons have no oval frame', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  const state=campaignFixture('en');state.selectedCountryId=null;await resumeFixture(page,state);
  await openNation(page);
  await page.locator('[data-guide="rail-diplo"]').click();
  const art=page.locator('.hub-card .hub-card-art').first();
  if(await art.count()){await expect(art).toHaveCSS('border-radius','0px');await expect(art).toHaveCSS('border-top-width','0px');await expect(art).toHaveCSS('background-color','rgba(0, 0, 0, 0)');}
});

test('1.7-6 the rails carry no background band', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  const state=campaignFixture('en');state.selectedCountryId=null;await resumeFixture(page,state);
  for(const selector of ['.command-rail-left','.command-rail-right','.map-help-cluster']){
    const rail=page.locator(selector).first();await expect(rail).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await expect(rail).toHaveCSS('border-top-width','0px');await expect(rail).toHaveCSS('box-shadow','none');
  }
});

test('1.7-3 the Ivory tutorial NEXT button is dark navy and bold', async ({page}) => {
  await page.addInitScript(()=>localStorage.setItem('trp-appearance-v1','light'));
  await page.setViewportSize({width:1440,height:900});
  const state=campaignFixture('en');state.selectedCountryId=null;await resumeFixture(page,state);
  const next=page.locator('.tutorial-dialog button.primary').first();
  if(await next.count()){await expect(next).toHaveCSS('color','rgb(14, 32, 53)');await expect(next).toHaveCSS('font-weight','700');}
});

import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';

for(const language of ['en','tr','es','zh','ru'] as const){
 test(`Light National Command stays readable and dismissible (${language})`,async({page})=>{
  await page.setViewportSize({width:language==='en'?1440:390,height:language==='en'?900:650});
  await page.addInitScript(()=>localStorage.setItem('trp-appearance-v1','light'));
  const state=campaignFixture(language);state.selectedCountryId=null;
  await resumeFixture(page,state);
  await page.locator('.leader-avatar-button').click();
  const modal=page.locator('.player-options-modal');
  await expect(modal).toBeVisible();
  await expect(modal.locator('.player-options-main')).toHaveCSS('background-color','rgb(255, 253, 247)');
  for(let tab=0;tab<5;tab++){
   await modal.locator('.profile-tabs button').nth(tab).click();
   const footer=modal.locator('.player-options-footer button');
   await expect(footer).toBeInViewport();
   const geometry=await modal.evaluate(el=>{
    const footer=el.querySelector('.player-options-footer')!.getBoundingClientRect();
    const body=el.querySelector('.player-options-layout')!;
    return {bottom:footer.bottom,viewport:innerHeight,overflow:body.scrollWidth-body.clientWidth};
   });
   expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewport);
   expect(geometry.overflow).toBeLessThanOrEqual(1);
   if(tab===3){
    const labels=modal.locator('.audio-slider > span, .audio-slider output, .audio-toggle');
    for(const label of await labels.all())await expect(label).toHaveCSS('color','rgb(20, 44, 70)');
    const slider=modal.locator('.audio-slider input').first();
    await slider.fill('65');await expect(modal.locator('.audio-slider output').first()).toHaveText('65%');
    await modal.locator('.audio-toggle input').first().check();
    await expect(slider).toBeDisabled();
    await modal.locator('.audio-toggle input').first().uncheck();
    await expect(slider).toBeEnabled();
    await page.screenshot({path:`test-results/national-command-095-audio-${language}.png`});
   }
  }
  await page.screenshot({path:`test-results/national-command-095-${language}.png`});
  await page.keyboard.press('Escape');await expect(modal).toHaveCount(0);
  await expect(page.locator('.leader-avatar-button')).toBeFocused();
 });
}
test('short landscape viewport retains exit while the body scrolls',async({page})=>{
 await page.setViewportSize({width:844,height:390});
 await page.addInitScript(()=>localStorage.setItem('trp-appearance-v1','light'));
 const state=campaignFixture('en');state.selectedCountryId=null;
 await resumeFixture(page,state);await page.locator('.leader-avatar-button').click();
 const modal=page.locator('.player-options-modal');
 await modal.locator('.profile-tabs button').nth(3).click();
 await modal.locator('.audio-slider input').last().scrollIntoViewIfNeeded();
 await expect(modal.locator('.player-options-footer button')).toBeInViewport();
 await page.screenshot({path:'test-results/national-command-095-landscape.png'});
 await modal.locator('.player-options-footer button').click();await expect(modal).toHaveCount(0);
});

test('Dark modal keeps keyboard and backdrop dismissal',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('trp-appearance-v1','dark'));
 const state=campaignFixture('en');state.selectedCountryId=null;
 await resumeFixture(page,state);await page.locator('.leader-avatar-button').click();
 await expect(page.locator('.player-options-footer button')).toBeInViewport();
 await page.locator('.player-options-backdrop').click({position:{x:4,y:4}});
 await expect(page.locator('.player-options-modal')).toHaveCount(0);
 await expect(page.locator('.leader-avatar-button')).toBeFocused();
});

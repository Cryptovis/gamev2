import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';

for(const [width,language] of [[1440,'en'],[2048,'tr'],[390,'tr'],[1440,'es'],[1440,'zh'],[1440,'ru']] as const) {
 test(`${width}px ${language} compact World, Supply and national workspaces`,async({page})=>{
  await page.setViewportSize({width,height:width===2048?1056:width===390?844:900});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await resumeFixture(page,campaignFixture(language));
  if(width>1100){
   const overview=await page.locator('.command-overview-island').boundingBox();expect(overview!.width).toBeLessThan(780);
   await expect(page.locator('.top-metric')).toHaveCount(4);
  }
  await page.locator('[data-guide="rail-world"]').click();
  const frame=page.locator('#pulse-window');await expect(frame).toBeVisible();
  if(width>1100)expect((await frame.boundingBox())!.width).toBeLessThanOrEqual(940);
  for(let ranking=0;ranking<3;ranking++){
   await frame.locator('.section-menu button').nth(ranking).click();
   await expect(frame.locator('.ranking-table tbody tr')).toHaveCount(20);
   const visibleRows=await frame.locator('.ranking-table-wrap').evaluate(wrap=>{
    const area=wrap.getBoundingClientRect(),head=wrap.querySelector('thead')!.getBoundingClientRect();
    return Array.from(wrap.querySelectorAll('tbody tr')).filter(row=>{const r=row.getBoundingClientRect();return r.top>=head.bottom-.5&&r.bottom<=area.bottom+.5;}).length;
   });expect(visibleRows).toBe(10);
   // Scroll through every page: the compact viewport must never discard lower-ranked countries.
   for(let count=20;count<203;count+=20){
    await frame.locator('.ranking-table-wrap').evaluate(el=>{el.scrollTop=el.scrollHeight;el.dispatchEvent(new Event('scroll',{bubbles:true}));});
    await expect(frame.locator('.ranking-table tbody tr')).toHaveCount(Math.min(count+20,203));
   }
   expect(await frame.locator('.ranking-table-wrap').evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
  }
  await frame.locator('.section-menu button').first().click();
  await page.screenshot({path:`test-results/world-0908-${width}-${language}.png`});
  const body=frame.locator('.floating-command-body');await body.evaluate(el=>{el.scrollTop=el.scrollHeight;});
  const end=await body.evaluate(el=>({padding:parseFloat(getComputedStyle(el).paddingBottom),bottom:el.getBoundingClientRect().bottom,table:el.querySelector('.ranking-table-wrap')!.getBoundingClientRect().bottom}));
  expect(end.padding).toBeGreaterThanOrEqual(18);expect(end.bottom-end.table).toBeGreaterThanOrEqual(15);
  await page.keyboard.press('Escape');
  await page.locator('[data-guide="rail-supply"]').click();
  const resources=page.locator('#resource-command-window');await expect(resources).toBeVisible();
  const cols=await resources.locator('.resource-command-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(cols).toBe(width>=1440?3:1);
  const overflowing=await resources.locator('.resource-command-card').evaluateAll(cards=>cards.some(el=>el.scrollWidth>el.clientWidth+1));expect(overflowing).toBe(false);
  await page.screenshot({path:`test-results/resources-0908-${width}-${language}.png`});await page.keyboard.press('Escape');
  await page.locator('[data-guide="nation"]').click();await page.locator('[data-guide="tab-power"]').click();
  const dossier=page.locator('.country-dossier-window');await expect(dossier).toBeVisible();
  const dossierBox=(await dossier.boundingBox())!;expect(dossierBox.width).toBeLessThanOrEqual(920);expect(dossierBox.x).toBeGreaterThanOrEqual(12);expect(dossierBox.x+dossierBox.width).toBeLessThanOrEqual(width-12);
  await dossier.locator('.command-subtabs button').nth(2).click();
  const heading=dossier.locator('.trade-shortfall-hero');await expect(heading).toBeVisible();
  const title=await heading.locator('.trade-desk-title').evaluate(el=>{
   const small=el.querySelector('small')!.getBoundingClientRect(),strong=el.querySelector('strong')!.getBoundingClientRect();
   return {separate:strong.top>=small.bottom,left:Math.abs(strong.left-small.left)};
  });expect(title.separate).toBe(true);expect(title.left).toBeLessThan(1);
  await page.screenshot({path:`test-results/dossier-trade-0908-${width}-${language}.png`});
  await dossier.locator('.command-subtabs button').nth(3).click();
  await expect(dossier.locator('.society-identity-grid article')).toHaveCount(2);
  await expect(dossier.locator('.society-indicators article')).toHaveCount(5);
  expect((await dossier.locator('.society-indicators .command-art').first().boundingBox())!.width).toBe(28);
  await expect(dossier.locator('.society-composition progress').first()).toHaveAttribute('value','70');
  await page.screenshot({path:`test-results/society-0908-${width}-${language}.png`});await page.keyboard.press('Escape');
  await expect(page.locator('.command-panel')).toBeVisible();
  await page.locator('[data-guide="tab-supply-command"]').click();
  const supply=page.locator('.national-supply-window');await supply.locator('.command-subtabs button').nth(1).click();
  await expect(supply.locator('.infrastructure-art')).toHaveCount(4);
  for(const asset of ['roads','rail','ports','hubs'])await expect(supply.locator(`[data-infrastructure="${asset}"] svg`)).toHaveAttribute('data-asset',asset);
  expect(await supply.evaluate(el=>el.scrollWidth>el.clientWidth+1)).toBe(false);
  await page.screenshot({path:`test-results/infrastructure-0908-${width}-${language}.png`});
  // The visual treatment keeps the existing reviewed investment command available.
  const before=await supply.locator('[data-infrastructure="rail"] header strong').innerText();
  await supply.locator('[data-infrastructure="rail"] button').click();await expect(page.locator('.review-dialog')).toBeVisible();
  await page.keyboard.press('Escape');await expect(supply).toBeVisible();
  expect(await supply.locator('[data-infrastructure="rail"] header strong').innerText()).toBe(before);
  await page.keyboard.press('Escape');await expect(page.locator('.command-panel')).toBeVisible();
  expect(errors).toEqual([]);
 });
}

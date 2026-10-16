import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture,openNation} from './seedCampaign';
for(const width of [1440,390])test(`${width}px spacious windows restore parent menus and retain their sections`,async({page})=>{
 await page.setViewportSize({width,height:900});await resumeFixture(page,campaignFixture('en'));
 await openNation(page);
 await expect(page.locator('[data-menu-group="summary"] button')).toHaveCount(3);
 await expect(page.locator('[data-menu-group="strategy"] button')).toHaveCount(3);
 for(const tab of ['technology','world','war','production']){
  await page.locator(`[data-guide="tab-${tab}"]`).click();
  const frame=page.locator('#country-section-window');await expect(frame).toBeVisible();
  await expect(page.locator('.command-panel')).toBeHidden();
  const box=await frame.boundingBox();expect(box!.width).toBeGreaterThan(width===390?350:950);
  if(tab==='technology'){await page.locator('.technology-sections .section-menu button').last().click();await expect(page.locator('[data-development="investments"]')).toBeVisible();const shortcut=frame.getByRole('button',{name:'Open technology tree',exact:true});await expect(shortcut).toHaveCSS('border-top-left-radius','8px');await shortcut.click();await expect(frame).toBeHidden();await expect(page.getByRole('dialog',{name:'Research & Technology Tree',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(frame).toBeVisible();await expect(page.locator('[data-development="investments"]')).toBeVisible();await expect(shortcut).toBeFocused();}
  await page.screenshot({path:`test-results/national-${tab}-0905-${width}.png`});await page.keyboard.press('Escape');await expect(page.locator('.command-panel')).toBeVisible();await expect(frame).toHaveCount(0);await expect(page.locator(`[data-guide="tab-${tab}"]`)).toBeFocused();
 }
 await page.locator('[data-guide="tab-cabinet"]').click();await expect(page.locator('.ministry-row img').first()).toBeVisible();await expect.poll(()=>page.locator('.ministry-row img').evaluateAll(images=>images.every(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0))).toBe(true);await page.locator('.command-panel').evaluate(el=>{el.scrollTop=el.scrollHeight;});await page.screenshot({path:`test-results/cabinet-0905-${width}.png`});
 await page.locator('[data-guide="tab-affairs"]').click();await expect(page.locator('.command-panel')).toBeHidden();await page.keyboard.press('Escape');await expect(page.locator('.command-panel')).toBeVisible();await expect(page.locator('[data-guide="tab-cabinet"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-guide="rail-world"]').click();await expect(page.locator('.world-activity')).toBeVisible();await expect(page.locator('.ranking-table tbody tr')).toHaveCount(20);
 if(width>760){const head=await page.locator('#pulse-window .floating-command-header').boundingBox();await page.mouse.move(head!.x+200,head!.y+25);await page.mouse.down();await page.mouse.move(head!.x+248,head!.y+43);await page.mouse.up();}
 const scrollPage=async()=>{await page.locator('.ranking-table-wrap').evaluate(el=>{el.scrollTop=el.scrollHeight;el.dispatchEvent(new Event('scroll',{bubbles:true}));el.dispatchEvent(new Event('scroll',{bubbles:true}));});await expect(page.locator('.ranking-table tbody tr')).toHaveCount(40);};
 await scrollPage();await page.locator('#pulse-window .section-menu').getByRole('button',{name:'Financial ranking',exact:true}).click();await expect(page.locator('.ranking-table tbody tr')).toHaveCount(20);expect(await page.locator('.ranking-table-wrap').evaluate(el=>el.scrollTop)).toBe(0);await page.locator('#pulse-window .section-menu').getByRole('button',{name:'Military ranking',exact:true}).click();await scrollPage();
 const beforeCountry=await page.locator('#pulse-window').boundingBox();await page.locator('.ranking-table tbody button').first().click();await expect(page.locator('#pulse-window')).toBeHidden();await expect(page.locator('.target-hub')).toBeVisible();await expect(page.locator('.command-panel')).toHaveCount(0);await page.locator('.target-hub [data-guide="close-workspace"]').click();await expect(page.locator('#pulse-window')).toBeVisible();await expect(page.locator('.ranking-table tbody tr')).toHaveCount(40);const restored=await page.locator('#pulse-window').boundingBox();expect(restored!.x).toBe(beforeCountry!.x);expect(restored!.y).toBe(beforeCountry!.y);
 await page.screenshot({path:`test-results/world-0905-${width}.png`});
 await page.keyboard.press('Escape');await page.locator('[data-guide="rail-supply"]').click();await expect(page.locator('#resource-command-window')).toBeVisible();await page.screenshot({path:`test-results/supply-0905-${width}.png`});
 await page.keyboard.press('Escape');await page.locator('[data-guide="rail-market"]').click();await expect(page.locator('#market-window')).toBeVisible();await page.screenshot({path:`test-results/market-0905-${width}.png`});
});
test('right popups dock beside their rail and the speed/date card stays independent',async({page})=>{
 await resumeFixture(page,campaignFixture('en'));
 for(const tool of ['alerts','news']){await page.locator(`[data-guide="rail-${tool}"]`).click();const frame=await page.locator('.floating-command-window:not([hidden])').boundingBox(),rail=await page.locator('.command-rail-right').boundingBox();expect(rail!.x-frame!.x-frame!.width).toBeCloseTo(12,0);await page.keyboard.press('Escape');}
 const speed=await page.locator('.speed-segment').boundingBox(),date=await page.locator('.campaign-clock').boundingBox();expect(date!.y).toBeGreaterThanOrEqual(speed!.y+speed!.height);
 expect(await page.locator('.clock-island').evaluate(el=>getComputedStyle(el).backgroundImage)).toBe('none');
 await page.locator('.leader-avatar-button').click();await page.locator('.change-portrait-button').first().click();await expect(page.locator('.player-options-backdrop')).toBeHidden();await expect(page.locator('.avatar-picker')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('.player-options-modal')).toBeVisible();await page.screenshot({path:'test-results/profile-0905.png'});
});

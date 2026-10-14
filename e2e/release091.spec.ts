import {test,expect,type Page} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';

/** 0.91.0 "The Living World & Executive Release": War Planning, dossier sub-view, Help tabs, feature tour, HUD polish. */
async function openHelp(page:Page){
 await page.locator('.command-panel [data-guide="close-workspace"]').click();await expect(page.locator('.command-panel')).toHaveCount(0);
 await page.locator('[data-guide="rail-help"]').click();await expect(page.locator('#help-window')).toBeVisible();
}
async function openFrance(page:Page){
 const world=page.locator('#pulse-window');
 if(!await world.isVisible())await page.locator('[data-guide="rail-world"]').click();
 await expect(world).toBeVisible();
 await page.locator('#pulse-window .ranking-table tbody button').filter({hasText:'France'}).first().click();
 await expect(page.locator('.target-hub')).toBeVisible();
}

for(const width of [1440,390])test(`${width}px war planning sub-view: ratio bar, air badge, logistics, back and Escape`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:width<500?844:900});
 await resumeFixture(page,campaignFixture('en'));await openFrance(page);
 const hub=page.locator('.target-hub');
 await expect(hub.locator('.target-hub-warplan')).toBeVisible();
 await hub.locator('.target-hub-warplan').click();
 const assessment=page.locator('#operational-assessment-window');await expect(assessment).toBeVisible();
 await expect(assessment.locator('.war-plan .war-ratio-bar')).toBeVisible();await expect(assessment.locator('.war-air')).toBeVisible();await expect(assessment.locator('.war-logistics .war-meter')).toHaveCount(3);
 // The confirm button is either armed (and then asks for strategic review) or the engine's own reason is shown.
 const declare=assessment.locator('.war-plan-declare');await expect(declare).toContainText('FRANCE');
 if(await declare.isEnabled())await expect(assessment.locator('.war-plan-block')).toHaveCount(0);else await expect(assessment.locator('.war-plan-block')).toBeVisible();
 expect(await assessment.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await page.screenshot({path:`test-results/war-planning-0911-${width}.png`});
 // Escape steps back to the hub first; a second Escape closes it.
 await page.keyboard.press('Escape');await expect(hub).toBeVisible();await expect(hub.locator('.target-hub-grid')).toBeVisible();
 await hub.locator('.target-hub-warplan').click();await assessment.locator('[data-guide="close-workspace"]').click();await expect(hub.locator('.target-hub-grid')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('.target-hub')).toHaveCount(0);
 expect(errors).toEqual([]);
});

test('help has three tabs and keeps the brand heading on the briefing',async({page})=>{
 await resumeFixture(page,campaignFixture('en'));
 await openHelp(page);
 const help=page.locator('#help-window'),tabs=help.locator('.section-menu button');
 await expect(tabs).toHaveCount(3);
 await expect(help.locator('.game-notes h3')).toHaveText('Rule of Nations');await expect(help.locator('.help-situation')).toBeVisible();
 await expect(help.locator('.help-situation .help-goals li').first()).toBeVisible();
 await tabs.nth(1).click();await expect(help.locator('.program-grid article')).toHaveCount(3);await expect(help.locator('.help-situation')).toHaveCount(0);
 await tabs.nth(2).click();await expect(help.locator('.faq input')).toBeVisible();await expect(help.locator('.faq details').first()).toBeVisible();
 await help.locator('.faq input').fill('tutorial');await expect(help.locator('.faq details')).toHaveCount(1);
});

test('feature tour has four skippable steps',async({page})=>{
 await resumeFixture(page,campaignFixture('en'));
 await openHelp(page);
 await page.locator('#help-window .help-shortcuts button').filter({hasText:'Replay feature tour'}).click();
 const tour=page.locator('.feature-tour');await expect(tour).toBeVisible();await expect(tour).toHaveAttribute('data-tour-step','0');
 await expect(page.locator('.guided-tutorial')).toHaveCount(0);
 await expect(page.locator('.feature-tour-layer .tutorial-target-ring')).toBeVisible();
 for(const step of [1,2,3]){await tour.locator('button.primary').click();await expect(tour).toHaveAttribute('data-tour-step',String(step));}
 await tour.locator('button.primary').click();await expect(tour).toHaveCount(0);
 // Skip also ends it.
 await page.locator('[data-guide="rail-help"]').click();
 await page.locator('#help-window .help-shortcuts button').filter({hasText:'Replay feature tour'}).click();
 await expect(tour).toBeVisible();await tour.locator('.tour-skip').click();await expect(tour).toHaveCount(0);
});

test('top bar: no cramped live-flow block, glass island, five cards and a one-line DIPLOMACY label',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await resumeFixture(page,campaignFixture('en'));
 await expect(page.locator('.live-flows')).toHaveCount(0);
 await expect(page.locator('.top-metric')).toHaveCount(5);
 for(const id of ['treasury','food','oil'])await expect(page.locator(`.top-metric[data-metric="${id}"] .live-delta`)).toBeVisible();
 const island=await page.locator('.command-overview-island').evaluate(el=>{const s=getComputedStyle(el);return {bg:s.backgroundImage,border:s.borderTopColor};});
 expect(island.bg).toContain('linear-gradient');
 expect(await page.locator('[data-guide="rail-diplo"] small').evaluate(el=>getComputedStyle(el).whiteSpace)).toBe('nowrap');
});

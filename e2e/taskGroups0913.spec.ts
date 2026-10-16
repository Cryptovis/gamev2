import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture,openNation} from './seedCampaign';
import {withWarFuel} from '../src/tests/warFixture';

/** Phase 4: the player's task groups in the war theatre. The player declares war on Greece from the country panel. */

for(const [language,width] of [['tr',1440],['en',390]] as const)test(`${language} ${width}px task groups: assign through the command, enemy groups hidden`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:width<500?844:900});
 await resumeFixture(page,withWarFuel(campaignFixture(language)));
 await openNation(page);await page.locator('.country-select').selectOption('GRC');await page.locator('[data-guide="tab-war"]').click();
 await page.locator('.declare-war').click();await page.locator('.strategic-decision-modal .confirm').click();
 await expect(page.locator('.war-theatre-backdrop')).toBeVisible();
 const opened=await page.locator('.review-dialog').waitFor({state:'visible',timeout:5000}).then(()=>true,()=>false);
 if(opened)await page.locator('.review-dialog [data-guide="review-dismiss"]').first().click();
 const panel=page.locator('.task-groups');
 await expect(panel).toHaveCount(1);
 await expect(panel.locator('h3')).toHaveText(language==='tr'?'Görev grupları':'Task groups');
 await page.locator('.war-theatre header .tactical-hint-beacon').click();
 await expect(page.locator('.tactical-hint-popover')).toContainText(language==='tr'?'Düşman atamaları görünmez':'Enemy assignments are not visible');
 await page.keyboard.press('Escape');
 const cas=panel.locator('.task-groups-rows > li').nth(1);
 await expect(cas).toContainText(language==='tr'?'Yakın hava desteği':'Close air support');
 await cas.locator('input').fill('10');
 await cas.locator('button').click();
 const receipt=await page.locator('.review-dialog').waitFor({state:'visible',timeout:5000}).then(()=>true,()=>false);
 if(receipt)await page.locator('.review-dialog [data-guide="review-dismiss"]').first().click();
 await expect(cas.locator('.task-groups-counts dd').nth(1)).toHaveText('10');
 await expect(cas.locator('.task-groups-status')).toContainText(language==='tr'?'günden itibaren görevde':'On station from day');
 // The panel stays inside the window at phone width (no horizontal page scroll).
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(overflow).toBeLessThanOrEqual(1);
 await panel.screenshot({path:`test-results/task-groups-0913-${language}-${width}.png`});
 expect(errors).toEqual([]);
});

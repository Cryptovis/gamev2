import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';
import {withWarFuel} from '../src/tests/warFixture';
import {applyGameCommand} from '../src/engine/commands';

/** Phase 4: the player's task groups in the war theatre (Türkiye → Greece, auto-resolve war with default groups). */
function playerWar(language:'tr'|'en'){
 const s=applyGameCommand(withWarFuel(campaignFixture(language)),{type:'military/declareWar',targetCountryId:'GRC'});
 s.selectedCountryId=null;
 return {s,id:Object.keys(s.wars)[0]};
}

for(const [language,width] of [['tr',1440],['en',390]] as const)test(`${language} ${width}px task groups: assign through the command, enemy groups hidden`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:width<500?844:900});
 const {s,id}=playerWar(language);
 expect(s.wars[id].taskGroups!.length).toBeGreaterThan(0);
 await resumeFixture(page,s);
 await expect(page.locator('.war-theatre-backdrop')).toBeVisible();
 const opened=await page.locator('.review-dialog').waitFor({state:'visible',timeout:5000}).then(()=>true,()=>false);
 if(opened)await page.locator('.review-dialog [data-guide="review-dismiss"]').first().click();
 const panel=page.locator('.task-groups');
 await expect(panel).toHaveCount(1);
 await expect(panel.locator('h3')).toHaveText(language==='tr'?'Görev grupları':'Task groups');
 await expect(panel).toContainText(language==='tr'?'Düşman atamaları görünmez':'Enemy assignments are not visible');
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

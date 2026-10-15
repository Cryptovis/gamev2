import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';
import {withWarFuel} from '../src/tests/warFixture';
import {applyGameCommand} from '../src/engine/commands';
import {resolveStandingRound,startTacticalBattle} from '../src/engine/systems/tactical';

/** A Türkiye → Greece battle whose first round the player's side fought under standing orders (Phase 3 planner). */
function standingBattle(language:'tr'|'en'){
 let s=applyGameCommand(withWarFuel(campaignFixture(language)),{type:'military/declareWar',targetCountryId:'GRC'});
 const id=Object.keys(s.wars)[0];
 s=startTacticalBattle(s,id);s=resolveStandingRound({...s,day:s.day+1},id);
 s.selectedCountryId=null;
 return {s,id};
}

for(const language of ['tr','en'] as const)test(`${language} tactical board shows the player's standing plan but never the opponent's, and survives save/load`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const {s,id}=standingBattle(language);
 expect(s.wars[id].tactical!.plans?.attacker).toBeDefined();expect(s.wars[id].tactical!.plans?.defender).toBeDefined();
 await resumeFixture(page,s);
 // A loaded player war opens its command window with the last round's result; close that review first.
 await expect(page.locator('.war-theatre-backdrop')).toBeVisible();
 const opened=await page.locator('.review-dialog').waitFor({state:'visible',timeout:5000}).then(()=>true,()=>false);
 if(opened)await page.locator('.review-dialog [data-guide="review-dismiss"]').first().click();
 await expect(page.locator('.review-dialog')).toHaveCount(0);
 if(!(await page.locator('[data-testid="tactical-battlefield"]').isVisible()))await page.locator('.hd-war-button').click();
 const plan=page.locator('[data-testid="standing-plan"]');
 await expect(plan).toHaveCount(1);
 await expect(plan).toContainText(language==='tr'?'Kalıcı plan':'Standing plan');
 await page.locator('[data-testid="tactical-battlefield"] .tactical-hint-beacon').click();
 await expect(page.locator('.tactical-hint-popover')).toContainText(language==='tr'?'idame payı':'sustainment share');
 await page.keyboard.press('Escape');
 await page.screenshot({path:`test-results/tactical-plan-0912-${language}.png`,fullPage:true});
 expect(errors).toEqual([]);
});

import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';
import {UI_CATALOG_089_K} from '../src/i18n/uiCatalog089K';
const translateText = (language:string,key:string) => language==='en'?key:UI_CATALOG_089_K[key][['tr','es','zh','ru'].indexOf(language)];
import {TECHNOLOGY_TREE} from '../src/data/technologyTree';
import {unlockTechnology} from '../src/engine/systems/technology';
for(const language of ['en','tr','es','zh','ru'] as const)for(const width of [1440,390])test(`${language} ${width}px research points, blockers and readable cards`,async({page})=>{
 await page.setViewportSize({width,height:900});const s=campaignFixture(language);s.countries.TUR.technology.researchPoints=3.25;
 await resumeFixture(page,s);await page.locator('[data-guide="tab-technology"]').click();
 await expect(page.locator('[data-testid="research-points"]')).toContainText('3.25');
 const first=TECHNOLOGY_TREE.find(n=>n.category==='industry'&&!n.prerequisites.length)!;
 const card=page.locator(`[data-technology="${first.id}"]`);await expect(card.locator('h3')).toHaveText(translateText(language,first.name));await expect(card).toContainText(translateText(language,'Points still needed'));await expect(card).toContainText((first.cost-3.25).toFixed(2));
 await expect(card.locator('.research-card-art img')).toBeVisible();
 await card.locator('.research-review').click();await expect(page.locator('[data-guide="review-confirm"]')).toBeDisabled();await expect(page.locator('.review-dialog')).toContainText(translateText(language,'Not enough research points.'));await page.locator('[data-guide="review-dismiss"]').first().click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const bounds=await card.boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(width);
 if(language==='tr')await page.screenshot({path:`test-results/research-0895-${width}.png`,fullPage:true});
});
test('research active project, progress and cancellation refund agree',async({page})=>{
 const n=TECHNOLOGY_TREE.find(n=>n.category==='industry'&&!n.prerequisites.length)!;let s=campaignFixture('en');s.countries.TUR.technology.researchPoints=100;s=unlockTechnology(s,'TUR',n.id);const project=s.countries.TUR.technology.project!;project.workDone=project.requiredWork/2;
 await resumeFixture(page,s);await page.locator('[data-guide="tab-technology"]').click();await expect(page.locator('.research-active')).toContainText('50%');await page.locator('.research-active button').click();await expect(page.locator('.review-dialog')).toContainText((n.cost*.4).toFixed(2)+' RP');await page.locator('[data-guide="review-confirm"]').click();await expect(page.locator('.research-idle')).toBeVisible();await expect(page.locator('[data-testid="research-points"]')).toContainText((100-n.cost+n.cost*.4).toFixed(2));
});
for(const width of [1440,390])test(`${width}px war blocker is prominent and confirm visibly disabled`,async({page})=>{
 await page.setViewportSize({width,height:900});const s=campaignFixture('tr');s.countries.TUR.processedResources.fuel=0;
 await resumeFixture(page,s);await page.locator('[data-guide="nation"]').first().click();await page.locator('.country-select').selectOption('GRC');await page.locator('[data-guide="tab-war"]').click();await page.locator('.declare-war').click();
 await expect(page.locator('#strategic-decision-title')).toHaveText('Yunanistan ülkesine savaş aç');
 const blocker=page.locator('#strategic-block-reason');await expect(blocker).toBeVisible();await expect(blocker).toContainText('işlenmiş yakıt');
 const confirm=page.locator('.strategic-decision-modal .confirm');await expect(confirm).toBeDisabled();await expect(confirm).toHaveAttribute('aria-describedby','strategic-block-reason');await expect(confirm).toHaveCSS('cursor','not-allowed');await expect(confirm).toHaveCSS('border-top-style','dashed');
 await page.screenshot({path:`test-results/war-blocker-0895-${width}.png`,fullPage:true});
});

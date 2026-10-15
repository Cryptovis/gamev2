import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';
import {proposeResolution} from '../src/engine/systems/organizations/commands';
for(const width of [1440,390])for(const theme of ['light','dark'])test(`1.0 international hub ${theme} ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(theme=>localStorage.setItem('trp-appearance-v1',theme),theme);
 const state=campaignFixture('en');state.council.influenceByCountry.TUR=50;
 const proposed=proposeResolution(state,'un','plenary',{kind:'sanctions',targetId:'GRC',measures:[{scope:'arms',intensity:1,enforcement:1}],exemptions:[{scope:'humanitarian',countryIds:[]}],durationDays:30});
 await resumeFixture(page,proposed);await page.locator('[data-guide="rail-international-affairs"]').click();
 const hub=page.locator('.international-affairs');await expect(hub.locator('.ia-organization-grid>.ia-card')).toHaveCount(14);
 const fits=async()=>expect(await hub.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);await fits();
 for(const label of ['Resolutions & voting','Financial facilities','Commodities & swaps','Sanctions & enforcement','Overview & roster']){
  await hub.getByRole('tab',{name:label,exact:true}).click();await expect(hub.getByRole('tabpanel')).toHaveAttribute('aria-labelledby',await hub.getByRole('tab',{name:label,exact:true}).getAttribute('id')??'');await fits();
 }
 await page.screenshot({path:`test-results/international100-${theme}-${width}.png`});
 await hub.getByRole('tab',{name:'Resolutions & voting',exact:true}).click();
 const resolution=hub.locator('[data-resolution="ORG-1"]');await expect(resolution).toContainText('Greece');await resolution.getByRole('button',{name:'Yes',exact:true}).click();
 const review=page.getByRole('dialog',{name:'Review ballot',exact:true});await expect(review).toContainText('Greece');await expect(review.getByRole('button',{name:'CONFIRM',exact:true})).toBeInViewport();
 await page.screenshot({path:`test-results/international100-review-${theme}-${width}.png`});await review.getByRole('button',{name:'CONFIRM',exact:true}).click();
 await expect(hub.getByRole('status')).toHaveText('Command applied.');await expect(resolution.getByRole('button',{name:'Yes',exact:true})).toBeDisabled();
});
// Regression (9.2b): the unseen hint beacon's pulse ring (scale 1.55) used to extend past the hub's right edge. Frozen at its largest keyframe so the check is deterministic.
for(const width of [1440,390])test(`1.0 hint beacon pulse stays inside the hub ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await resumeFixture(page,campaignFixture('en'));await page.locator('[data-guide="rail-international-affairs"]').click();
 const hub=page.locator('.international-affairs'),beacon=hub.locator('.tactical-hint-beacon');
 await expect(beacon).toHaveAttribute('data-state','unseen');await expect(beacon).toHaveAttribute('data-motion','full');
 await page.addStyleTag({content:'.tactical-hint-beacon,.tactical-hint-beacon::after{animation:none !important}.tactical-hint-beacon[data-state="unseen"]::after{transform:scale(1.55) !important}'});
 expect(await hub.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
});
for(const [language,tab] of [['tr','Kararlar ve oylama'],['es','Resoluciones y votación'],['zh','决议与投票'],['ru','Резолюции и голосование']] as const)test(`1.0 ${language} localized hub`,async({page})=>{
 await resumeFixture(page,campaignFixture(language));await page.locator('[data-guide="rail-international-affairs"]').click();const hub=page.locator('.international-affairs');
 await expect(hub.getByRole('tab')).toHaveCount(5);await hub.getByRole('tab',{name:tab,exact:true}).click();await expect(hub.locator('.ia-composer')).toBeVisible();
});

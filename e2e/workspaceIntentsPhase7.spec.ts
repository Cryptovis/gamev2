import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';
import {processLetters} from '../src/engine/systems/livingEconomy';

for(const width of [1440,390])test(`${width}px unread alert opens inbox and returns focus to Inspect`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const s=campaignFixture('en');s.selectedCountryId=null;s.countries[s.playerCountryId].globalSanctions=true;
 s.leadership.messages=[{id:'p7-unread',senderId:'FRA',day:s.day,kind:'birthday',text:'A message for the commander.',tone:'warm',read:false}];
 await resumeFixture(page,s);await page.locator('[data-guide="rail-alerts"]').click();
 const inspect=page.locator('.command-alert-list article').filter({hasText:'Unread diplomatic messages'}).getByRole('button',{name:'Inspect',exact:true});
 await inspect.click();await expect(page.locator('#diplomacy-window')).toBeVisible();
 await expect(page.locator('.command-panel')).toHaveCount(0);await expect(page.locator('#alerts-window')).toBeHidden();
 await page.keyboard.press('Escape');await expect(page.locator('#alerts-window')).toBeVisible();await expect(inspect).toBeFocused();
 const sanctions=page.locator('.command-alert-list article').filter({hasText:'Country under sanctions'}).getByRole('button',{name:'Inspect',exact:true});
 await sanctions.click();await expect(page.locator('#diplomacy-window')).toBeVisible();await expect(page.locator('.command-panel')).toHaveCount(0);
 await page.keyboard.press('Escape');await expect(sanctions).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.locator('#alerts-window')).toHaveCount(0);
 await expect(page.locator('[data-guide="rail-alerts"]')).toBeFocused();
});

test('incoming-offer alert selects the Executive Desk offers tab',async({page})=>{
 let s=campaignFixture('en');s.selectedCountryId=null;
 s=processLetters({...s,diplomaticOffers:[{id:'p7-offer',type:'embassy',senderId:'BRA',receiverId:s.playerCountryId,createdDay:s.day,expiresDay:s.day+20,message:'Brazil proposes cooperation.'}]});
 await resumeFixture(page,s);await page.locator('[data-guide="rail-alerts"]').click();
 await page.locator('.command-alert-list article').filter({hasText:'Incoming diplomatic offers'}).getByRole('button',{name:'Inspect',exact:true}).click();
 await expect(page.locator('#desk-window [data-desk-tab="diplomacy"]')).toHaveAttribute('aria-selected','true');
 await expect(page.locator('#desk-window .desk-card[data-letter-id]')).toHaveCount(1);
 await expect(page.locator('.command-panel')).toHaveCount(0);
 await page.keyboard.press('Escape');await expect(page.locator('#alerts-window')).toBeVisible();
});

test('assessment review owns Tab, Escape and backdrop; back restores launcher focus',async({page})=>{
 const s=campaignFixture('en');s.selectedCountryId=null;s.countries.TUR.processedResources.fuel=10000;
 await resumeFixture(page,s);await page.locator('[data-guide="rail-world"]').click();
 await page.locator('#pulse-window .ranking-table tbody button').filter({hasText:'France'}).first().click();
 const hub=page.locator('.target-hub'),launcher=hub.locator('.target-hub-warplan');await launcher.click();
 const assessment=page.locator('#operational-assessment-window'),declare=assessment.locator('.war-plan-declare');await expect(declare).toBeEnabled();await declare.click();
 const review=page.locator('.strategic-decision-modal');await expect(review).toBeVisible();
 // An event on the obscured parent's backdrop must not dismiss either managed layer.
 await page.locator('.target-hub-backdrop').dispatchEvent('mousedown');await expect(review).toBeVisible();
 const buttons=review.locator('button:not(:disabled)');await buttons.last().focus();await page.keyboard.press('Tab');await expect(buttons.first()).toBeFocused();
 await page.keyboard.press('Escape');await expect(review).toHaveCount(0);await expect(assessment.locator('.war-plan')).toBeVisible();await expect(declare).toBeFocused();
 await page.keyboard.press('Escape');await expect(hub.locator('.target-hub-grid')).toBeVisible();await expect(launcher).toBeFocused();
 await page.keyboard.press('Escape');await expect(hub).toHaveCount(0);await expect(page.locator('#pulse-window')).toBeVisible();
});

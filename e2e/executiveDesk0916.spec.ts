import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';
import type {GameState} from '../src/domain/game';
import {processLetters} from '../src/engine/systems/livingEconomy';
import {executeCommandResult} from '../src/engine/commands';

/** Phase 6.2: the executive desk gathers incoming proposals (with their expiry), wars, operations and news. */
function deskFixture(language:'tr'|'en'):GameState{
 let s=campaignFixture(language);
 const offer=(senderId:string,type:'embassy'|'trade_pact',expiresIn:number)=>({id:`OFFER-${type}-${senderId}-${s.day}`,type,senderId,receiverId:s.playerCountryId,createdDay:s.day,expiresDay:s.day+expiresIn,message:`${s.countries[senderId].name} proposes cooperation.`});
 // The engine's own step folds offers into pending incoming letters, exactly as during a campaign day.
 s=processLetters({...s,diplomaticOffers:[offer('GRC','trade_pact',20),offer('BRA','embassy',2)]});
 s=executeCommandResult(s,{type:'intelligence/launch',operationType:'gather_intelligence',targetCountryId:'GRC'}).state;
 return s;
}
const TEXT={
 tr:{left2:'Kalan süre: 2 gün',left20:'Kalan süre: 20 gün',result:'Sonuç 5 gün sonra',peace:'Ülken barış içinde.',none:'Yanıtını bekleyen teklif yok.'},
 en:{left2:'Time left: 2 days',left20:'Time left: 20 days',result:'Result in 5 days',peace:'Your country is at peace.',none:'No proposals are waiting for your answer.'},
} as const;

for(const [language,width] of [['tr',1440],['en',390]] as const)test(`${language} ${width}px executive desk: countdown, accept, decline, tabs`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:width<500?844:900});
 await resumeFixture(page,deskFixture(language));
 const rail=page.locator('[data-guide="rail-desk"]');
 await expect(rail.locator('b')).toHaveText('2');
 await rail.click();
 const desk=page.locator('#desk-window');await expect(desk).toBeVisible();
 await expect(desk.locator('[data-desk-tab="diplomacy"]')).toHaveAttribute('aria-selected','true');
 const cards=desk.locator('.desk-card');await expect(cards).toHaveCount(2);
 // Soonest deadline first, marked urgent; the later one is calm.
 await expect(cards.nth(0)).toHaveClass(/urgent/);await expect(cards.nth(0).locator('.desk-countdown')).toContainText(TEXT[language].left2);
 await expect(cards.nth(1)).not.toHaveClass(/urgent/);await expect(cards.nth(1).locator('.desk-countdown')).toContainText(TEXT[language].left20);
 await expect(desk.locator('.desk-news li').first()).toBeVisible();
 expect(await desk.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await page.screenshot({path:`test-results/executive-desk-0916-${language}-${width}.png`});

 // Accept the embassy exchange: reviewed shared fee, typed command, receipt; the card leaves the desk.
 await cards.nth(0).locator('.desk-accept').click();
 await expect(page.locator('.review-dialog')).toBeVisible();await page.locator('[data-guide="review-confirm"]').click();
 await page.locator('[data-guide="review-dismiss"]').first().click();
 await expect(cards).toHaveCount(1);await expect(rail.locator('b')).toHaveText('1');
 // Decline the trade pact: immediate, free.
 await cards.nth(0).locator('.desk-decline').click();await page.locator('[data-guide="review-dismiss"]').first().click();
 await expect(cards).toHaveCount(0);await expect(desk.locator('.desk-panel > .desk-empty')).toHaveText(TEXT[language].none);await expect(rail.locator('b')).toHaveCount(0);

 await desk.locator('[data-desk-tab="intel"]').click();
 await expect(desk.locator('.desk-card[data-operation-id]')).toHaveCount(1);await expect(desk.locator('.desk-card .desk-countdown')).toContainText(TEXT[language].result);
 await desk.locator('[data-desk-tab="war"]').click();
 await expect(desk.locator('.desk-panel > .desk-empty')).toHaveText(TEXT[language].peace);
 await page.keyboard.press('Escape');await expect(page.locator('#desk-window')).toHaveCount(0);
 expect(errors).toEqual([]);
});

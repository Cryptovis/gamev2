import {test,expect,type Page} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';

/** Phase 6.1: selecting another country opens the diplomatic hub, not the player's 14-section panel. */
const FRANCE={en:'France',tr:'Fransa'} as const;
async function openFromRankings(page:Page,language:'en'|'tr'){
 const world=page.locator('#pulse-window');
 if(!await world.isVisible())await page.locator('[data-guide="rail-world"]').click();
 await expect(world).toBeVisible();
 await page.locator('#pulse-window .ranking-table tbody button').filter({hasText:FRANCE[language]}).first().click();
}

for(const [language,width] of [['tr',1440],['en',390]] as const)test(`${language} ${width}px target hub: eight cards, typed actions, Full Dossier`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:width<500?844:900});
 await resumeFixture(page,campaignFixture(language));
 await openFromRankings(page,language);
 const hub=page.locator('.target-hub');
 await expect(hub).toBeVisible();await expect(page.locator('.command-panel')).toHaveCount(0);
 await expect(hub.locator('#target-hub-title')).toContainText(FRANCE[language]);await expect(hub.locator('.target-hub-capital')).toContainText('Paris');
 await expect(hub.locator('.target-hub-stats > div')).toHaveCount(4);
 await expect(hub.locator('.hub-card')).toHaveCount(8);
 // Türkiye and France start as allies: the alliance card shows the green tick instead of an action.
 await expect(hub.locator('[data-action="alliance"]')).toHaveClass(/status-active/);await expect(hub.locator('[data-action="alliance"] .hub-card-check')).toBeVisible();
 if(language==='tr'){await expect(hub.locator('.target-hub-title small')).toHaveText('DİPLOMASİ MASASI');await expect(hub.locator('.target-hub-dossier')).toContainText('Ülke Bilgisi');await expect(hub.locator('[data-action="espionage"] strong')).toHaveText('Casusluk Operasyonu');}
 expect(await hub.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await page.screenshot({path:`test-results/target-hub-0915-${language}-${width}.png`});

 // Economic aid goes through the strategic review and the engine command; relations rise.
 const relation=async()=>Number(await hub.locator('.target-hub-relation dd b').innerText());
 const before=await relation();
 await hub.locator('[data-action="aid"] .hub-card-variants button').nth(1).click();
 await expect(page.locator('.strategic-decision-modal')).toBeVisible();await expect(hub).toBeHidden();
 await page.locator('.strategic-decision-modal .confirm').click();
 await page.locator('[data-guide="review-dismiss"]').first().click();
 await expect(hub).toBeVisible();await expect.poll(relation).toBeGreaterThan(before);

 // 0.91.0: Full Dossier is a sub-view of the hub with a back button; the complete 14-section panel is one more click away.
 await hub.locator('.target-hub-dossier').click();
 await expect(hub.locator('.dossier-sub')).toBeVisible();await expect(page.locator('.command-panel')).toHaveCount(0);
 await hub.locator('.target-hub-back').click();await expect(hub.locator('.target-hub-grid')).toBeVisible();
 await hub.locator('.target-hub-dossier').click();await hub.locator('.dossier-full-panel').click();
 await expect(page.locator('.command-panel')).toBeVisible();await expect(page.locator('.target-hub')).toBeHidden();
 await expect(page.locator('.country-select')).toHaveValue('FRA');
 await page.locator('.country-select').selectOption('GRC');await expect(page.locator('.command-panel')).toBeVisible();await expect(page.locator('.target-hub')).toBeHidden();

 // Back on the map, choosing France again opens its hub, and Escape closes it.
 // Closing returns to the world rankings it was opened from (workspace trail).
 await page.locator('.command-panel [data-guide="close-workspace"]').click();await expect(page.locator('.command-panel')).toHaveCount(0);await expect(hub.locator('.dossier-sub')).toBeVisible();await page.keyboard.press('Escape');await page.keyboard.press('Escape');await expect(page.locator('#pulse-window')).toBeVisible();
 await openFromRankings(page,language);await expect(hub).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('.target-hub')).toHaveCount(0);await expect(page.locator('#pulse-window')).toBeVisible();
 // The player's own nation still opens the full panel.
 await page.keyboard.press('Escape');await expect(page.locator('#pulse-window')).toBeHidden();await page.locator('[data-guide="nation"]').first().click();
 await expect(page.locator('.command-panel')).toBeVisible();await expect(page.locator('.target-hub')).toHaveCount(0);
 expect(errors).toEqual([]);
});

test('espionage card launches one operation and then reports it active',async({page})=>{
 await resumeFixture(page,campaignFixture('en'));await openFromRankings(page,'en');
 const spy=page.locator('.target-hub [data-action="espionage"] .hub-card-main');
 await expect(spy).toBeEnabled();await spy.click();
 await page.locator('[data-guide="review-dismiss"]').first().click();
 await expect(page.locator('.target-hub [data-action="espionage"]')).toHaveClass(/status-active/);await expect(spy).toBeDisabled();
});

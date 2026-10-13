import {test,expect,type Page} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';
import {FACILITIES} from '../src/data/industrialCatalog';
import type {GameState} from '../src/domain/game';
import type {FacilityKind} from '../src/domain/industrial';

/** Phase 6.4: Policies & Laws cards and the factory modal. */
const KINDS=Object.keys(FACILITIES) as FacilityKind[];
const WORDS={
 en:{labour:'Labour Charter',pause:'Pause',resume:'Resume',limit:'Limit Reached',build:'Build another',policies:'Policies & Laws'},
 tr:{labour:'İşçi Şartı',pause:'Duraklat',resume:'Sürdür',limit:'Sınıra ulaşıldı',build:'Bir tane daha inşa et',policies:'Politikalar ve Kanunlar'},
};
function rich(language:'tr'|'en'){
 const s=campaignFixture(language),id=s.playerCountryId;
 s.countries[id].economy={...s.countries[id].economy,treasury:1e5};
 s.countries[id].technology={...s.countries[id].technology,unlocked:[...new Set([...s.countries[id].technology.unlocked,...KINDS.map(k=>FACILITIES[k].tech).filter((t):t is string=>Boolean(t))])]};
 return s;
}
function withFacility(s:GameState,kind:FacilityKind,count:number,projects=0){
 const id=s.playerCountryId,n=s.industrialEconomy[id];
 s.industrialEconomy[id]={...n,facilities:{...n.facilities,[kind]:count},enabled:{...n.enabled,[kind]:true},projects:Array.from({length:projects},(_,i)=>({id:`fx-${i}`,kind:'civil_factory' as const,readyDay:s.day+60+i}))};
 return s;
}
const noOverflow=(page:Page)=>page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1);

for(const [width,lang] of [[1440,'tr'],[390,'en']] as const)test(`${lang} ${width}px policies tab shows six cards; enacting a concession makes that card active`,async({page})=>{
 const w=WORDS[lang],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:900});
 await resumeFixture(page,rich(lang));
 await page.locator('[data-guide="nation"]').click();await page.locator('[data-guide="tab-policies"]').click();
 const cards=page.locator('.policy-card');
 await expect(cards).toHaveCount(6);
 await expect(page.locator('.policy-card-grid')).toContainText(w.policies);
 await expect(page.locator('.policy-card.status-active')).toHaveCount(0);
 await expect(page.locator('.policy-card[data-policy="concession:labour"] h5')).toHaveText(w.labour);
 // The tax panel is still there, below the grid.
 const grid=(await page.locator('.policy-card-grid').boundingBox())!,tax=(await page.locator('.tax-policy-panel').boundingBox())!;
 expect(tax.y).toBeGreaterThanOrEqual(grid.y+grid.height-1);
 await page.locator('.policy-card[data-policy="tax"] .policy-card-action').click();
 await expect(page.locator('.tax-policy-panel input[type="range"]')).toBeFocused();
 await page.locator('.policy-card[data-policy="concession:labour"] .policy-card-action').click();
 await expect(page.locator('.review-confirmation')).toBeVisible();
 await page.locator('[data-guide="review-confirm"]').click();await expect(page.locator('.review-result')).toBeVisible();
 await page.locator('.review-result [data-guide="review-dismiss"]').first().click();
 const labour=page.locator('.policy-card[data-policy="concession:labour"]');
 await expect(labour).toHaveClass(/status-active/);
 await expect(labour.locator('.policy-card-check')).toBeVisible();
 await expect(labour).toContainText('180');
 await expect(page.locator('.policy-card.status-locked')).toHaveCount(4);
 await expect(page.locator('.policy-card.status-locked .policy-card-action')).toHaveCount(0);
 await expect(page.locator('.policy-card[data-policy="tax"]')).toHaveClass(/status-available/);
 expect(await noOverflow(page)).toBe(true);
 await page.screenshot({path:`test-results/card-ui-0918-policies-${lang}-${width}.png`});
 // A foreign country's Full Dossier shows the cards without buttons.
 await page.locator('.country-select').selectOption('GRC');await page.locator('[data-guide="tab-policies"]').click();
 await expect(page.locator('.policy-card')).toHaveCount(6);
 await expect(page.locator('.policy-card-action')).toHaveCount(0);
 expect(errors).toEqual([]);
});

for(const [width,lang] of [[1440,'tr'],[390,'en']] as const)test(`${lang} ${width}px factory modal: two rows, art, pause and resume`,async({page})=>{
 const w=WORDS[lang],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:900});
 await resumeFixture(page,withFacility(rich(lang),'waterworks',2));
 await page.locator('[data-guide="nation"]').click();await page.locator('[data-guide="tab-production"]').click();
 // The tutorial hook stays on the card's own build button.
 await expect(page.locator('.facility-card [data-guide="learn-build"]').first()).toBeAttached();
 const card=page.locator('.facility-card').nth(KINDS.indexOf('waterworks'));
 await card.locator('.facility-details').click();
 const modal=page.locator('.factory-modal');
 await expect(modal).toBeVisible();
 await expect(modal.locator('svg.factory-art')).toBeVisible();
 await expect(modal.locator('.factory-row')).toHaveCount(2);
 await expect(modal.locator('.factory-limit-badge')).toHaveCount(0);
 await expect(modal.locator('.factory-count-chip')).toHaveText('×2');
 await expect(modal.getByRole('button',{name:w.build,exact:true})).toBeEnabled();
 const pause=modal.getByRole('button',{name:w.pause,exact:true});
 await pause.click();
 await expect(modal.locator('.factory-paused-badge')).toBeVisible();
 await expect(modal.getByRole('button',{name:w.resume,exact:true})).toBeVisible();
 await modal.getByRole('button',{name:w.resume,exact:true}).click();
 await expect(modal.locator('.factory-paused-badge')).toHaveCount(0);
 await expect(modal.getByRole('button',{name:w.pause,exact:true})).toBeVisible();
 expect(await noOverflow(page)).toBe(true);
 await page.screenshot({path:`test-results/card-ui-0918-factory-${lang}-${width}.png`});
 // Build another goes through the investment review.
 await modal.getByRole('button',{name:w.build,exact:true}).click();
 await expect(page.locator('.review-confirmation')).toBeVisible();
 await page.locator('[data-guide="review-confirm"]').click();await expect(page.locator('.review-result')).toBeVisible();
 await page.locator('.review-result [data-guide="review-dismiss"]').first().click();
 await modal.locator('[data-guide="close-workspace"]').click();
 await expect(modal).toHaveCount(0);
 await expect(page.locator('.construction-list')).toBeAttached(); // the new project is listed on the panel behind the modal
 expect(errors).toEqual([]);
});

test('en 390px six construction projects: Limit Reached badge and a disabled Build another',async({page})=>{
 const w=WORDS.en;await page.setViewportSize({width:390,height:844});
 await resumeFixture(page,withFacility(rich('en'),'civil_factory',1,6));
 await page.locator('[data-guide="nation"]').click();await page.locator('[data-guide="tab-production"]').click();
 await page.locator('.facility-card').nth(KINDS.indexOf('civil_factory')).locator('.facility-details').click();
 const modal=page.locator('.factory-modal');
 await expect(modal.locator('.factory-limit-badge')).toHaveText(w.limit);
 await expect(modal.getByRole('button',{name:w.build,exact:true})).toBeDisabled();
 await expect(modal.locator('.factory-block-reason')).toContainText(w.limit);
 await expect(modal.locator('.factory-row')).toHaveCount(2);
 expect(await noOverflow(page)).toBe(true);
 await page.screenshot({path:'test-results/card-ui-0918-limit-en-390.png'});
});

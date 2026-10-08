import {test,expect,type Page} from '@playwright/test';
import {makeInitialState} from '../src/data/initialState';
import type {GameState} from '../src/domain/game';
import {UI_CATALOG_POLISH} from '../src/i18n/uiCatalogPolish';
const languages=['en','tr','es','zh','ru'] as const;
function fixture(language:typeof languages[number],advisor=false){
 const s=makeInitialState();s.playerProfile={...s.playerProfile,setupComplete:true,language};s.world.tutorial={active:false,step:0,completed:true};s.eventCooldownUntil=10000;s.advisorCooldownUntil=10000;s.selectedCountryId=null;
 s.countries.TUR.diplomacy.relations.AZE.treaties=['trade'];s.countries.AZE.diplomacy.relations.TUR.treaties=['trade'];
 s.world.living!.letters=(['pending','accepted','rejected'] as const).map((status,i)=>({id:`fixture-${status}`,kind:'embassy',senderId:'TUR',receiverId:['BRA','DEU','USA'][i],sentDay:1,replyDay:4,expiresDay:12,status,incoming:false,years:1,message:'Embassy exchange',read:false}));
 if(advisor)s.activeAdvisor={id:'fixture-contract',resource:'oil',supplierId:'AZE',stage:'contract',createdDay:1,message:'Arrange supplies before reserves run out.'};
 return s;
}
async function load(page:Page,state:GameState){
 await page.goto('/');await page.locator('[data-entry="demo"]').click();await page.locator('[data-entry="new-game"]').click();await expect(page.locator('.campaign-wizard')).toBeVisible();
 await page.locator('.wizard-name-field input').fill('Fixture loader');for(let i=0;i<4;i++)await page.locator('.wizard-next').click();await page.locator('.guided-card footer button').first().click();await page.locator('.leader-avatar-button').click();await page.locator('.profile-tabs button').last().click();await page.locator('.campaign-option-actions button').first().click();await expect(page.locator('.campaign-save-status')).toContainText(/saved/i);
 await page.evaluate(async state=>{
  await new Promise<void>((resolve,reject)=>{const req=indexedDB.open('alpyx-global-command');req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result;const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put({id:'manual',name:'Browser fixture',updatedAt:Date.now(),schemaVersion:state.schemaVersion,state});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
 },state);
 await page.reload();await page.locator('.load-previous').click();await expect(page.locator('.campaign-wizard')).toHaveCount(0);
}
for(const {language,width} of [...languages.map(language=>({language,width:1440})),{language:'tr' as const,width:390}])test(`${width}px ${language} proposal history separates outcomes and keeps supply values clear`,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:900});await load(page,fixture(language));await page.locator('[data-guide="rail-diplo"]').click();
 await expect(page.locator('.letter-list article')).toHaveCount(1);await expect(page.locator('.letter-list article')).toHaveAttribute('data-status','pending');
 const expected=language==='en'?'Proposal history':UI_CATALOG_POLISH['Proposal history'][languages.indexOf(language)-1];await expect(page.locator('[data-proposal-filter="history"]')).toContainText(expected);
 await page.locator('[data-proposal-filter="history"]').click();await expect(page.locator('.letter-list article')).toHaveCount(2);
 const contrast=await page.locator('[data-proposal-filter="history"]').evaluate(el=>{const style=getComputedStyle(el);const luminance=(color:string)=>color.match(/\d+/g)!.slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);const a=luminance(style.color),b=luminance(style.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});expect(contrast).toBeGreaterThanOrEqual(4.5);
 const colors=await page.locator('.letter-list article').evaluateAll(items=>items.map(el=>getComputedStyle(el).borderLeftColor));expect(colors[0]).not.toBe(colors[1]);
 await page.screenshot({path:`test-results/proposal-history-${language}.png`,fullPage:true});
 await page.locator('[data-guide="close-workspace"]').click();await page.locator('[data-guide="rail-supply"]').click();
 const header=page.locator('.resource-command-card > header').first();await expect(header).toBeVisible();
 const bounds=await header.evaluate(el=>({image:el.querySelector('.asset-thumbnail')!.getBoundingClientRect().right,text:el.querySelector('.resource-card-values')!.getBoundingClientRect().left}));expect(bounds.text).toBeGreaterThan(bounds.image);
 expect(await page.locator('.speed-segment strong').first().evaluate(el=>Number(getComputedStyle(el).fontWeight))).toBeGreaterThanOrEqual(800);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
for(const width of [1440,390])test(`${width}px recurring contract review signs a receipt with centered close`,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:900});await page.emulateMedia({reducedMotion:'reduce'});const s=fixture('tr',true);await load(page,s);
 await page.locator('.contract-years button').last().click();await expect(page.locator('.review-dialog h2')).toContainText(/10 yıllık petrol sözleşmesi/i);
 await expect(page.locator('.review-dialog')).not.toContainText('Monthly delivery');await expect(page.locator('.review-dialog .visual-contract svg')).toBeVisible();
 await expect(page.locator('[data-guide="review-confirm"]')).toBeEnabled();await page.screenshot({path:`test-results/contract-review-${width}.png`,fullPage:true});
 await page.locator('[data-guide="review-confirm"]').click();await expect(page.locator('.review-dialog h2')).toHaveText('Tedarik sözleşmesi imzalandı');await expect(page.locator('.visual-contract.is-signed')).toBeVisible();
 const close=await page.locator('.review-result footer button').boundingBox(),modal=await page.locator('.review-result').boundingBox();expect(Math.abs(close!.x+close!.width/2-modal!.x-modal!.width/2)).toBeLessThan(2);
 expect(await page.locator('.contract-signature').evaluate(el=>getComputedStyle(el).strokeDashoffset)).toBe('0px');
 await page.screenshot({path:`test-results/contract-signed-${width}.png`,fullPage:true});await page.locator('.review-result footer button').click();await expect(page.locator('.review-dialog')).toHaveCount(0);
});

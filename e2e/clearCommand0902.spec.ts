import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';
test('exchange purchase review opens, confirms once, and explains a blocked order',async({page})=>{
 const s=campaignFixture('en');s.countries.TUR.economy.treasury=10000;
 await resumeFixture(page,s);await page.locator('[data-guide="rail-market"]').click();await page.locator('.section-menu').getByRole('button',{name:'Commodity Exchange',exact:true}).click();
 await page.getByRole('button',{name:'Review purchase',exact:true}).click();await expect(page.getByRole('dialog',{name:'Review exchange purchase'})).toBeVisible();await expect(page.locator('[data-guide="review-confirm"]')).toBeEnabled();await page.locator('[data-guide="review-confirm"]').click();await expect(page.locator('.review-confirmation')).toHaveCount(0);await expect(page.locator('.review-result')).toBeVisible();await page.locator('.review-result [data-guide="review-dismiss"]').first().click();
 await page.getByRole('spinbutton',{name:'Exchange order quantity'}).fill('0');await page.getByRole('button',{name:'Review purchase',exact:true}).click();await expect(page.locator('.review-dialog')).toBeVisible();await expect(page.locator('[data-guide="review-confirm"]')).toBeDisabled();await expect(page.locator('.review-notes')).not.toBeEmpty();
});
for(const width of [1440,390])test(`${width}px compact tool windows preserve rails; expanded mobile windows fit and never scroll the page`,async({page})=>{
 await page.setViewportSize({width,height:900});await resumeFixture(page,campaignFixture('en'));
 await page.evaluate(()=>{(window as any).scrollSamples=[];document.addEventListener('scroll',()=>{(window as any).scrollSamples.push([window.scrollX,window.scrollY]);},true);});
 for(const [guide,selector] of [['supply','#resource-command-window'],['help','#help-window'],['alerts','#alerts-window'],['market','#market-window']]){
  await page.locator(`[data-guide="rail-${guide}"]`).click();await expect(page.locator(selector)).toBeVisible();
  const frame=await page.locator(selector).boundingBox(),left=await page.locator('.command-rail-left').boundingBox(),right=await page.locator('.map-help-cluster').boundingBox();
  if(guide==='market')for(const button of await page.locator('.section-menu button').all()){const b=await button.boundingBox(),label=await button.locator('.section-menu-label').boundingBox();expect(label!.x).toBeGreaterThanOrEqual(b!.x);expect(label!.x+label!.width).toBeLessThanOrEqual(b!.x+b!.width);}
  if(width<=760&&['supply','market','alerts'].includes(guide)){expect(frame!.x).toBe(12);expect(frame!.width).toBe(width-24);}else{expect(frame!.x).toBeGreaterThanOrEqual(left!.x+left!.width+8);const dock=await page.locator('.command-rail-right').boundingBox();expect(frame!.x+frame!.width).toBeLessThanOrEqual((dock?.x??width)-8);}
  await expect(page.locator('[data-testid="error-boundary"]')).toHaveCount(0);await page.keyboard.press('Escape');
 }
 expect(await page.evaluate(()=>({y:window.scrollY,samples:(window as any).scrollSamples}))).toEqual({y:0,samples:[]});
});
test('nation flag shows name, regime and hint, opens the country window, and is the sole tutorial anchor',async({page})=>{
 const s=campaignFixture('en');s.countries.TUR.name='Turkey';await resumeFixture(page,s);const flag=page.locator('[data-guide="nation"]');await expect(flag).toHaveCount(1);await expect(flag).toContainText('Türkiye');await expect(flag).toContainText('democracy');await expect(flag).toHaveAttribute('title','Open your nation');if((await flag.getAttribute('aria-pressed'))!=='true')await flag.click();await expect(flag).toHaveAttribute('aria-pressed','true');await expect(page.locator('.command-panel')).toBeVisible();await page.locator('.command-panel [data-guide="close-workspace"]').click();await expect(page.locator('.command-panel')).toHaveCount(0);await expect(flag).toHaveAttribute('aria-pressed','false');
});
test('the national flag button toggles the country panel open and closed',async({page})=>{
 const s=campaignFixture('en');s.selectedCountryId=null;await resumeFixture(page,s);const flag=page.locator('[data-guide="nation"]');
 await flag.click();await expect(flag).toHaveAttribute('aria-pressed','true');await expect(page.locator('.command-panel')).toBeVisible();
 await flag.click();await expect(flag).toHaveAttribute('aria-pressed','false');await expect(page.locator('.command-panel')).toHaveCount(0);
});
test('credit, contracts and Help open without any click-time module download; supplier title has its own readable row',async({page})=>{
 await resumeFixture(page,campaignFixture('en'));await page.route(/\/(assets|src)\/.*(HelpPanel|CreditWindow|IndustrialMarketPanel).*\.(js|tsx)/,r=>r.abort());await page.locator('[data-guide="rail-market"]').click();
 for(const [name,selector] of [['Sovereign Credit & Monetary Fund','.credit-compose'],['Supply contracts','.exchange-order'],['Trade partners','.trade-finder']]){await page.locator('.section-menu').getByRole('button',{name,exact:true}).click();await expect(page.locator(selector)).toBeVisible();}
 const hero=page.locator('.supplier-finder-hero');const label=await hero.locator('small').boundingBox(),title=await hero.locator('strong').boundingBox();expect(title!.y).toBeGreaterThanOrEqual(label!.y+label!.height);expect(title!.width).toBeGreaterThan(450);
 await page.screenshot({path:'test-results/supplier-0902.png'});await page.keyboard.press('Escape');await page.locator('[data-guide="rail-help"]').click();await expect(page.locator('#help-window')).toBeVisible();await expect(page.locator('.panel-load-error')).toHaveCount(0);
});
test('national event choices use readable titles and consequences',async({page})=>{
 const s=campaignFixture('en');s.activeEvent={id:'playtest',kind:'inflation_shock',title:'Technology Investment Boom',description:'Choose your next step.',triggeredDay:1,options:[{id:'accept',label:'Fund the project',consequenceHint:'Invest $3B in technology.',effects:{}}]} as typeof s.activeEvent;
 await resumeFixture(page,s);await expect(page.locator('.event-options')).toBeVisible();await page.screenshot({path:'test-results/event-0902.png'});expect(await page.locator('.event-options strong').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);expect(await page.locator('.event-options span').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
});

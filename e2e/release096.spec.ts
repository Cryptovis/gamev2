import {test,expect,type Locator} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';
import {UI_CATALOG_096} from '../src/i18n/uiCatalog096';

async function readableSurface(card:Locator){
 await expect(card).toHaveCSS('background-color','rgb(243, 239, 229)');
 const contrast=await card.evaluate(el=>{
  const text=el.querySelector('strong,b,h3,h2,small,p')??el;
  const lum=(color:string)=>color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
  const fg=lum(getComputedStyle(text).color),bg=lum(getComputedStyle(el).backgroundColor);
  return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
 });
 expect(contrast).toBeGreaterThanOrEqual(4.5);
}
for(const [index,language] of ['en','tr','es','zh','ru'].entries()){
 test(`0.96 ${language} wizard footer, portrait hierarchy and Light review`,async({page})=>{
  await page.setViewportSize({width:language==='en'?1440:390,height:language==='en'?900:language==='tr'?650:844});
  await page.addInitScript(()=>localStorage.setItem('trp-appearance-v1','light'));
  await page.goto('/');await page.locator('.entry-languages button').nth(index).click();
  await expect(page.locator('.entry-languages')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  const languageButton=page.locator('.entry-languages button').nth(index);await languageButton.hover();
  await expect(languageButton).toHaveCSS('border-top-color','rgb(212, 175, 55)');
  await page.locator('[data-entry="demo"]').click();await page.locator('[data-entry="new-game"]').click();
  await page.locator('.wizard-name-field input').fill('Release review');
  const wizard=page.locator('.campaign-wizard');
  await expect(wizard.locator('.wizard-save-tools button').first()).toHaveText(index===0?'Return to sign in':UI_CATALOG_096['Return to sign in'][index-1]);
  const tools=await wizard.locator('.wizard-save-tools button').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height));expect(tools[0]).toBeCloseTo(tools[1]);
  expect(await wizard.locator('.wizard-body').evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(1);
  for(let step=1;step<=4;step++){
   await expect(wizard.locator('.wizard-next')).toBeInViewport();
   if(step===2){
    await expect(wizard.locator('.wizard-intro p')).toHaveCount(0);
    await readableSurface(wizard.locator('.wizard-avatar-preview'));
    await expect(wizard.locator('.wizard-footer .wizard-portrait-helper')).toBeVisible();
   }
   if(step===3)for(const card of await wizard.locator('.wizard-country-preview,.wizard-stat-grid>span,.opening-profile').all())await readableSurface(card);
   if(step===4)for(const card of await wizard.locator('.confirm-leader-card,.confirm-summary-grid>span').all())await readableSurface(card);
   await page.screenshot({path:`test-results/release096-${language}-step${step}.png`});
   if(step<4)await wizard.locator('.wizard-next').click();
  }
  await wizard.locator('.wizard-next').click();
  await expect(page.locator('.campaign-loading')).toBeVisible();
  expect(await page.locator('.campaign-loading').evaluate(el=>getComputedStyle(el,'::before').opacity)).toBe('0.1');
 });
}
test('0.96 return action reaches sign-in and short-screen footer remains reachable',async({page})=>{
 await page.setViewportSize({width:844,height:390});await page.goto('/');
 await page.locator('[data-entry="demo"]').click();await page.locator('[data-entry="new-game"]').click();
 await expect(page.locator('.wizard-footer .wizard-next')).toBeInViewport();
 await page.locator('.wizard-save-tools button').first().click();
 await expect(page.locator('.entry-languages')).toBeVisible();
 expect(await page.evaluate(()=>sessionStorage.getItem('trp-demo-session-v1'))).toBeNull();
});
for(const width of [1440,390])test(`0.96 ${width}px national cards, supplier grid and fuel action routing`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(()=>localStorage.setItem('trp-appearance-v1','light'));
 const state=campaignFixture('en');state.selectedCountryId=null;state.countries.TUR.processedResources.fuel=0;
 await resumeFixture(page,state);
 await expect(page.locator('.clock-speed-card')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
 for(const button of await page.locator('.command-rail .rail-button').all()){
  expect((await button.boundingBox())!.width).toBe(84);
  await expect(button.locator('small')).toHaveCSS('font-size','10px');
  expect(await button.locator('small').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 }
 await page.locator('[data-guide="nation"]').click();
 await expect(page.locator('.identity-scripture')).toHaveCount(1);
 for(const card of await page.locator('.identity-strip > span').all())await expect(card).toHaveCSS('align-items','center');
 for(const tab of ['economy','policies','military']){
  await page.locator(`.command-panel [data-guide="tab-${tab}"]`).click();
  const workspace=page.locator('#country-section-window');await expect(workspace).toBeVisible();
  const selector=tab==='economy'?'.economic-trends,.population-panel,.population-metrics>span':tab==='policies'?'.policy-card,.tax-policy-panel':'.recruitment-panel,.military-score>div,.unit-stat,.quality-bars';
  for(const card of await workspace.locator(selector).all())await readableSurface(card);
  await page.screenshot({path:`test-results/release096-${width}-${tab}.png`});
  await page.keyboard.press('Escape');
 }
 await page.locator('.command-panel [data-guide="tab-economy"]').click();
 await page.locator('#country-section-window .resource-card').first().getByRole('button',{name:'Buy / supply options'}).click();
 const supply=page.locator('#resource-command-window');await expect(supply).toBeVisible();
 for(const card of await supply.locator('.resource-command-summary>span').all())await readableSurface(card);
 const cards=supply.locator('.trade-ranking>.trade-row');await expect(cards.first()).toBeVisible();
 if(width===1440){const a=await cards.nth(0).boundingBox(),b=await cards.nth(1).boundingBox();expect(a!.y).toBeCloseTo(b!.y);expect(b!.x).toBeGreaterThan(a!.x);const c=await cards.nth(2).boundingBox();expect(c!.y).toBeCloseTo(a!.y);expect(c!.x).toBeGreaterThan(b!.x);}
 expect(await supply.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
 await page.screenshot({path:`test-results/release096-${width}-suppliers.png`});
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 await page.locator('[data-guide="rail-world"]').click();await page.locator('#pulse-window .ranking-table tbody button').filter({hasText:'France'}).first().click();
 await page.locator('.target-hub [data-action="embassy"] button').first().click();
 const review=page.locator('.strategic-decision-modal');await expect(review).toBeVisible();
 for(const card of await review.locator('.strategic-decision-visual,.strategic-impact-grid>div,.strategic-warning-list,.strategic-autoconfirm').all())await readableSurface(card);
 await page.screenshot({path:`test-results/release096-${width}-decision.png`});
 await page.keyboard.press('Escape');await page.locator('.target-hub-warplan').click();
 const assessment=page.locator('#operational-assessment-window');
 await expect(assessment.locator('.versus-board [data-guide="fuel-help"]')).toHaveCount(0);
 await expect(assessment.locator('.assessment-actions [data-guide="fuel-help"]')).toBeVisible();
 await assessment.locator('[data-guide="fuel-help"]').click();await expect(page.locator('#fuel-help-window')).toBeVisible();
 await page.keyboard.press('Escape');await expect(assessment.locator('.operational-assessment')).toHaveAttribute('data-country','FRA');
 await page.screenshot({path:`test-results/release096-${width}-assessment.png`});
});

test('0.96 five-language rail labels retain the 10px floor and fit their footprint',async({page})=>{
 await page.setViewportSize({width:390,height:900});
 for(const language of ['en','tr','es','zh','ru'] as const){
  const state=campaignFixture(language);state.selectedCountryId=null;await resumeFixture(page,state);
  for(const label of await page.locator('.command-rail .rail-button small').all()){
   await expect(label).toHaveCSS('font-size','10px');
   const dimensions=await label.evaluate(el=>({text:el.textContent,width:el.clientWidth,scroll:el.scrollWidth}));expect(dimensions.scroll,JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.width);
  }
 }
});

test('0.96 recorded economic chart follows Light/Dark changes without remounting',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(()=>localStorage.setItem('trp-appearance-v1','light'));
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const state=campaignFixture('en');state.selectedCountryId=null;
 const c=state.countries.TUR;state.day=2;
 state.world.economicHistory={countryId:'TUR',points:[{day:1,gdp:c.economy.gdp,treasury:c.economy.treasury,inflation:c.economy.inflation,treasuryChange:0},{day:2,gdp:c.economy.gdp+1,treasury:c.economy.treasury+1,inflation:c.economy.inflation,treasuryChange:1}]};
 await resumeFixture(page,state);await page.locator('[data-guide="nation"]').click();await page.locator('.command-panel [data-guide="tab-economy"]').click();
 const canvas=page.locator('.economic-chart canvas');await expect(canvas).toBeVisible();
 const light=await canvas.evaluate(el=>(el as HTMLCanvasElement).toDataURL());
 await page.evaluate(()=>window.dispatchEvent(new StorageEvent('storage',{key:'trp-appearance-v1',newValue:'dark'})));
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await expect.poll(()=>canvas.evaluate(el=>(el as HTMLCanvasElement).toDataURL())).not.toBe(light);
 await page.evaluate(()=>window.dispatchEvent(new StorageEvent('storage',{key:'trp-appearance-v1',newValue:'light'})));
 await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.screenshot({path:'test-results/release096-economic-chart.png'});
 expect(errors).toEqual([]);
});

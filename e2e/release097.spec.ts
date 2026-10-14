import {test,expect,type Locator} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';
import {UI_CATALOG_097} from '../src/i18n/uiCatalog097';
import {placeIndustrialOrder} from '../src/engine/systems/industrialMarket';
import {applyGameCommand} from '../src/engine/commands';
import {launchIntelOperation} from '../src/engine/systems/espionage';
import {withWarFuel} from '../src/tests/warFixture';
test.setTimeout(30000);

async function surface(card:Locator){
 await expect(card).toHaveCSS('background-color','rgb(243, 239, 229)');
 expect(await card.evaluate(el=>{
  const text=el.querySelector('strong,small,dt,h3,p')??el;
  const lum=(color:string)=>color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
  const fg=lum(getComputedStyle(text).color),bg=lum(getComputedStyle(el).backgroundColor);return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
 })).toBeGreaterThanOrEqual(4.5);
}

for(const [index,language] of (['en','tr','es','zh','ru'] as const).entries())test(`0.97 ${language} tax review and wide relief card preserve routing`,async({page})=>{
 await page.setViewportSize({width:index===0?1440:390,height:900});await page.addInitScript(()=>localStorage.setItem('trp-appearance-v1','light'));
 const state=campaignFixture(language);state.selectedCountryId=null;const player=state.countries.TUR;
 await resumeFixture(page,state);await page.locator('[data-guide="nation"]').click();await page.locator('.command-panel [data-guide="tab-policies"]').click();
 const workspace=page.locator('#country-section-window'),banner=workspace.locator('.policy-relief-banner');
 await surface(workspace.locator('.policy-budget'));await surface(banner);
 expect(await banner.evaluate(el=>el.previousElementSibling?.classList.contains('policy-card-grid'))).toBe(true);
 await expect(banner).toContainText(`${player.politics.approval.toFixed(0)}%`);await expect(banner).toContainText(`${player.politics.stability.toFixed(0)}%`);
 await expect(workspace.locator('.tax-policy-panel .policy-relief-banner')).toHaveCount(0);
 const apply=workspace.locator('.tax-policy-apply');await expect(apply).toHaveText(index===0?'Apply changes on tax policy':UI_CATALOG_097['Apply changes on tax policy'][index-1]);
 await expect(apply).toBeDisabled();await workspace.locator('.tax-policy-panel input[type="range"]').fill('35');await expect(apply).toBeEnabled();
 await apply.click();await expect(page.locator('.review-confirmation')).toBeVisible();
 await expect(workspace.locator('.tax-policy-panel > p strong').first()).toHaveText(`${player.economy.taxRate.toFixed(0)}%`);
 await page.keyboard.press('Escape');await banner.click();await expect(page.locator('.command-window:visible .activity-cards')).toBeVisible();
 await page.keyboard.press('Escape');await expect(workspace).toBeVisible();
 if(index===0){await apply.click();await page.locator('[data-guide="review-confirm"]').click();await page.locator('[data-guide="review-dismiss"]').first().click();await expect(workspace.locator('.tax-policy-panel > p strong').first()).toHaveText('35%');}
 await page.screenshot({path:`test-results/release097-policy-${language}.png`});
});

for(const width of [1440,390])test(`0.97 ${width}px portrait selection expands without duplicated heading or clipped navigation`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(()=>localStorage.setItem('trp-appearance-v1','light'));
 const state=campaignFixture('en');state.playerProfile.setupComplete=false;await resumeFixture(page,state);await page.locator('.wizard-next').click();
 await expect(page.locator('.wizard-portrait-stage .wizard-intro h2')).toHaveCount(0);
 const grid=page.locator('.wizard-avatar-grid'),preview=page.locator('.wizard-avatar-preview');
 if(width===1440){expect(await grid.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBeGreaterThanOrEqual(3);const a=await grid.boundingBox(),b=await preview.boundingBox();expect(a!.y).toBeCloseTo(b!.y);}
 await grid.locator('button').last().scrollIntoViewIfNeeded();await grid.locator('button').last().focus();await expect(grid.locator('button').last()).toBeFocused();
 await expect(page.locator('.wizard-footer .wizard-portrait-helper')).toBeInViewport();await expect(page.locator('.wizard-next')).toBeInViewport();
 const helper=await page.locator('.wizard-portrait-helper').boundingBox(),navigation=await page.locator('.wizard-navigation').boundingBox();expect(helper!.y+helper!.height).toBeLessThanOrEqual(navigation!.y);
 await page.screenshot({path:`test-results/release097-portraits-${width}.png`});
});

for(const width of [1440,390])test(`0.97 ${width}px Light goals, commodity exchange and supply contracts`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(()=>localStorage.setItem('trp-appearance-v1','light'));await page.emulateMedia({reducedMotion:'reduce'});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 let state=campaignFixture('en');state.selectedCountryId=null;state.countries.TUR.economy.treasury=10000;state=placeIndustrialOrder(state,'BGR','fuel',1,'buy',1);expect(Object.keys(state.industrialContracts).length).toBeGreaterThan(0);
 await resumeFixture(page,state);await surface(page.locator('.day-chip'));
 await expect(page.locator('.executive-coordinate-grid')).toHaveCSS('opacity','0.04');await expect(page.locator('.executive-coordinate-grid')).toHaveCSS('pointer-events','none');
 await page.locator('[data-guide="rail-goals"]').click();
 for(const card of await page.locator('#objectives-window .floating-objectives>div').all())await surface(card);
 await page.screenshot({path:`test-results/release097-goals-${width}.png`});await page.keyboard.press('Escape');
 await page.locator('[data-guide="rail-market"]').click();const menu=page.locator('#market-window .section-menu');
 for(const card of await page.locator('#market-window .gold-vault,#market-window .listing-form').all())await surface(card);
 await page.screenshot({path:`test-results/release097-gold-${width}.png`});
 await menu.getByRole('button',{name:'Commodity Exchange',exact:true}).click();const exchange=page.locator('.commodity-exchange');
 for(const card of await exchange.locator('.cx-chart,.cx-order,.cx-limits,.cx-preview,.cx-holdings,.cx-quote').all())await surface(card);
 for(const label of await exchange.locator('.cx-preview dt,.cx-preview dd').all())await expect(label).toHaveCSS('color','rgb(20, 44, 70)');
 await expect(exchange.locator('.cx-board button.active')).toHaveCSS('background-color','rgb(24, 59, 96)');
 const canvas=exchange.locator('canvas');await expect(canvas).toBeVisible();const light=await canvas.evaluate(el=>(el as HTMLCanvasElement).toDataURL());
 await page.evaluate(()=>window.dispatchEvent(new StorageEvent('storage',{key:'trp-appearance-v1',newValue:'dark'})));
 await expect.poll(()=>canvas.evaluate(el=>(el as HTMLCanvasElement).toDataURL())).not.toBe(light);
 await page.evaluate(()=>window.dispatchEvent(new StorageEvent('storage',{key:'trp-appearance-v1',newValue:'light'})));
 await page.screenshot({path:`test-results/release097-commodity-${width}.png`});
 await menu.getByRole('button',{name:'Supply contracts',exact:true}).click();
 for(const card of await page.locator('#market-window .industrial-heading,#market-window .exchange-order,#market-window .industrial-contract-list>article,#market-window .exchange-board>button:not([aria-pressed="true"])').all())await surface(card);
 await expect(page.locator('.exchange-board button[aria-pressed="true"]')).toHaveCSS('background-color','rgb(24, 59, 96)');
 await expect(page.locator('.industrial-heading p')).toHaveCSS('color','rgb(70, 91, 112)');
 for(const input of await page.locator('.exchange-order :is(select,input)').all())await expect(input).toHaveCSS('color-scheme','light');
 await page.screenshot({path:`test-results/release097-contracts-${width}.png`});expect(errors).toEqual([]);
});

for(const width of [1440,390])test(`0.97 ${width}px Light dossier, cabinet, intelligence, affairs and correspondence`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(()=>localStorage.setItem('trp-appearance-v1','light'));
 let state=campaignFixture('en');state.selectedCountryId=null;state=launchIntelOperation(state,'gather_intelligence','FRA');
 expect(Object.keys(state.intelOperations).length).toBeGreaterThan(0);
 state.leadership.messages=[{id:'warm-ui',senderId:'BGR',day:1,kind:'achievement',tone:'warm',text:'A warm message',read:false},{id:'rival-ui',senderId:'FRA',day:1,kind:'achievement',tone:'rival',text:'A rival message',read:false}];
 await resumeFixture(page,state);await page.locator('[data-guide="nation"]').click();await page.locator('[data-guide="tab-power"]').click();const dossier=page.locator('.country-dossier-window');
 for(const [index,selector] of ['.dossier-score-stack>div','.dossier-economy-grid>div','.trade-desk-hero','.society-identity-grid>article,.society-indicators>article'].entries()){
  await dossier.locator('.command-subtabs button').nth(index).click();for(const card of await dossier.locator(selector).all())await surface(card);
 }
 await page.screenshot({path:`test-results/release097-dossier-${width}.png`});await page.keyboard.press('Escape');
 await page.locator('[data-guide="tab-supply-command"]').click();const network=page.locator('.national-supply-window');
 expect(await network.locator('.supply-ring').first().evaluate(el=>getComputedStyle(el).backgroundImage)).toContain('conic-gradient');
 await expect.poll(()=>network.locator('.supply-ring').first().evaluate(el=>getComputedStyle(el,'::after').backgroundColor)).toBe('rgb(243, 239, 229)');
 await network.locator('.command-subtabs button').nth(2).click();for(const card of await network.locator('.reserve-command-card').all())await surface(card);
 await page.screenshot({path:`test-results/release097-supply-${width}.png`});await page.keyboard.press('Escape');
 for(const [tab,selector] of [['cabinet','.cabinet-hero,.ministry-row'],['intel','.intel-hero,.intel-home-grid>div,.intel-log>div']] as const){await page.locator(`.command-panel [data-guide="tab-${tab}"]`).click();for(const card of await page.locator(`.command-panel ${selector.split(',').join(',.command-panel ')}`).all())await surface(card);await page.screenshot({path:`test-results/release097-${tab}-${width}.png`});}
 await page.locator('[data-guide="tab-affairs"]').click();for(const card of await page.locator('.affairs-hero,.affairs-thresholds>div').all())await surface(card);await page.keyboard.press('Escape');
 await page.locator('.command-panel .national-panel-heading [data-guide="close-workspace"]').click();
 await page.locator('[data-guide="rail-diplo"]').click();const inbox=page.locator('#diplomacy-window');await expect(inbox).toBeVisible();
 for(const card of await inbox.locator('.diplomatic-messages article').all())await surface(card);
 await expect(inbox.locator('.diplomatic-messages article.warm')).toHaveCSS('border-left-color','rgb(115, 185, 172)');await expect(inbox.locator('.diplomatic-messages article.rival')).toHaveCSS('border-left-color','rgb(207, 150, 116)');
 await page.screenshot({path:`test-results/release097-letters-${width}.png`});
});

test('0.97 active-war legacy overview uses readable Light metrics',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('trp-appearance-v1','light'));
 let state=withWarFuel(campaignFixture('en'));state=applyGameCommand(state,{type:'military/declareWar',targetCountryId:'GRC'});state.selectedCountryId=null;
 expect(Object.keys(state.wars).length).toBeGreaterThan(0);await resumeFixture(page,state);
 await page.locator('[data-guide="nation"]').click();await page.locator('.country-select').selectOption('GRC');
 await page.locator('.command-panel [data-guide="tab-war"]').click();for(const card of await page.locator('.war-command .war-theatre,.war-command .war-progress,.war-command .front-metrics,.war-command .casualty-grid').all())await surface(card);
 await page.screenshot({path:'test-results/release097-war.png'});
});

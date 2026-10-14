import {test,expect,type Locator} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';
test.setTimeout(30000);
async function surface(card:Locator){
 await expect(card).toHaveCSS('background-color','rgb(243, 239, 229)');
 expect(await card.evaluate(el=>{
  const text=el.querySelector('strong,small,dt,h3,p')??el;
  const lum=(color:string)=>color.match(/[\d.]+/g)!.slice(0,3).map(Number).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
  const fg=lum(getComputedStyle(text).color),bg=lum(getComputedStyle(el).backgroundColor);return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
 })).toBeGreaterThanOrEqual(4.5);
}
for(const width of [1440,390])test(`0.98 ${width}px quote remains readable with reachable wizard footer`,async({page})=>{
 await page.setViewportSize({width,height:width===390?650:900});await page.addInitScript(()=>localStorage.setItem('trp-appearance-v1','light'));
 const state=campaignFixture(width===390?'tr':'en');state.playerProfile.setupComplete=false;await resumeFixture(page,state);
 const quote=page.locator('.wizard-leadership-quote blockquote');await expect(quote).toHaveCSS('font-size',width===390?'14px':'15px');
 expect(await page.locator('.wizard-body').evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(1);
 await expect(page.locator('.wizard-next')).toBeInViewport();await page.screenshot({path:`test-results/release098-quote-${width}.png`});
});
for(const width of [1440,390])test(`0.98 ${width}px Light credit, inbox, help and map notice`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(()=>localStorage.setItem('trp-appearance-v1','light'));await page.emulateMedia({reducedMotion:'reduce'});
 const state=campaignFixture('en');state.selectedCountryId=null;state.countries.TUR.resources.oil=0;
 await resumeFixture(page,state);await page.locator('[data-guide="rail-market"]').click();
 await page.locator('#market-window > .floating-command-body .section-menu').first().getByRole('button',{name:'Sovereign Credit & Monetary Fund',exact:true}).click();
 const credit=page.locator('.credit-desk');await surface(credit.locator('.credit-status'));await surface(credit.getByRole('button',{name:'Credit offers',exact:true}));
 for(const card of await credit.locator('.credit-overview>article,.credit-board>article').all())await surface(card);
 await page.screenshot({path:`test-results/release098-credit-${width}.png`});await page.keyboard.press('Escape');
 await page.locator('[data-guide="rail-diplo"]').click();const inbox=page.locator('#diplomacy-window');await surface(inbox.locator('.proposal-assessment'));
 await expect(inbox.locator('.diplomatic-summary>span')).toHaveCount(2);for(const card of await inbox.locator('.diplomatic-summary>span').all())await surface(card);
 await page.screenshot({path:`test-results/release098-inbox-${width}.png`});await page.keyboard.press('Escape');
 await page.locator('[data-guide="rail-help"]').click();const help=page.locator('#help-window');await surface(help.locator('.help-situation'));
 await expect(help.locator('.help-situation dl>div')).toHaveCount(5);
 for(const card of await help.locator('.help-situation dl>div,.help-goals>li,.help-risks>li').all())await surface(card);
 await expect(help.locator('.help-risks')).toContainText('Oil');await page.screenshot({path:`test-results/release098-help-${width}.png`});await page.keyboard.press('Escape');
 await page.locator('[data-guide="rail-map"]').click();await surface(page.locator('.map-mode-bar .map-notice'));
});
for(const width of [1440,390])test(`0.98 ${width}px energy, bilateral, institutions, dossier and single influence route`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.addInitScript(()=>localStorage.setItem('trp-appearance-v1','light'));await page.emulateMedia({reducedMotion:'reduce'});
 const state=campaignFixture('en');state.selectedCountryId=null;await resumeFixture(page,state);await page.locator('[data-guide="nation"]').click();
 await page.locator('.command-panel [data-guide="tab-production"]').click();await expect(page.locator('.energy-summary>span')).toHaveCount(5);
 for(const card of await page.locator('.energy-summary>span,.power-plant-grid>article').all())await surface(card);
 await page.screenshot({path:`test-results/release098-energy-${width}.png`});await page.keyboard.press('Escape');
 await page.locator('.command-panel [data-guide="tab-world"]').click();const world=page.locator('.world-panel');
 await expect(world.locator('.world-card')).toHaveCount(3);for(const card of await world.locator('.world-card,.institution-card').all())await surface(card);
 for(const mark of await world.locator('.institution-mark').all()){
  expect(await mark.evaluate(el=>{const icon=el.querySelector('.navigation-art')!.getBoundingClientRect(),text=el.querySelector('b')!.getBoundingClientRect(),box=el.getBoundingClientRect();return icon.bottom<=text.top&&text.bottom<=box.bottom&&text.left>=box.left&&text.right<=box.right;})).toBe(true);
 }
 await page.screenshot({path:`test-results/release098-institutions-${width}.png`});await page.keyboard.press('Escape');
 await page.locator('.command-panel [data-guide="tab-power"]').click();const dossier=page.locator('.country-dossier-window');
 await expect(dossier.locator('.command-subtabs button')).toHaveText(['Power','Economy','Trade','Society']);for(const tab of await dossier.locator('.command-subtabs button').all())await expect(tab).toHaveCSS('text-transform','uppercase');
 await dossier.locator('.command-subtabs button').last().click();await surface(dossier.locator('.society-composition'));await page.keyboard.press('Escape');
 await page.locator('.country-select').selectOption('GRC');await page.locator('.command-panel [data-guide="tab-diplomacy"]').click();const bilateral=page.locator('.diplomacy-v2');
 for(const card of await bilateral.locator('.relation-hero,.relation-context>span,.proposal-assessment,.goodwill-card').all())await surface(card);
 await page.screenshot({path:`test-results/release098-bilateral-${width}.png`});
 await page.locator('.command-panel [data-guide="tab-affairs"]').click();const affairs=page.locator('.affairs-shell');
 await expect(affairs.getByRole('button',{name:'Foreign political influence',exact:true})).toHaveCount(1);
 await expect(affairs.locator('#affairs-content button')).toHaveCount(0);
 await affairs.getByRole('button',{name:'Foreign political influence',exact:true}).click();await expect(affairs.locator('.affairs-blockers').first()).toBeVisible();
 for(const blocker of await affairs.locator('.affairs-blockers').all()){await surface(blocker);await expect(blocker.locator('li').first()).toHaveCSS('color','rgb(154, 37, 29)');}
 await page.screenshot({path:`test-results/release098-affairs-${width}.png`});
});
for(const language of ['en','tr','es','zh','ru'] as const)test(`0.98 ${language} cultural titles and target button focus clearance`,async({page})=>{
 await page.setViewportSize({width:language==='en'?1440:390,height:900});await page.addInitScript(()=>localStorage.setItem('trp-appearance-v1','light'));
 const state=campaignFixture(language);state.selectedCountryId='FRA';state.countries.FRA.society.dominantReligion='orthodox_christianity';state.countries.FRA.society.ideology='pluralist';await resumeFixture(page,state);
 const hub=page.locator('.target-hub'),info=hub.locator('[data-guide="open-full-dossier"]');await info.focus();await expect(info).toHaveCSS('margin-top','2px');await info.click();
 const cards=hub.locator('.cultural-identity-cards');await expect(cards).toBeVisible();
 const expected={en:['Orthodox Christianity','Pluralist'],tr:['Ortodoks Hristiyanlık','Çoğulcu'],es:['Cristianismo Ortodoxo','Pluralista'],zh:['东正教','多元主义'],ru:['Православие','Плюрализм']}[language];
 await expect(cards.locator('article').nth(2).locator('small')).toHaveText({en:'REGION',tr:'BÖLGE',es:'REGIÓN',zh:'地区',ru:'РЕГИОН'}[language]);
 await expect(cards.locator('strong').nth(0)).toHaveText(expected[0]);await expect(cards.locator('strong').nth(1)).toHaveText(expected[1]);
 for(const card of await cards.locator('article').all())expect(await card.evaluate(el=>{const icon=el.firstElementChild!.getBoundingClientRect(),box=el.getBoundingClientRect();return Math.abs((icon.left+icon.right-box.left-box.right)/2)<1;})).toBe(true);

 for(const button of await hub.locator('.dossier-tabs button').all()){await button.focus();await expect(button).toHaveCSS('margin-top','2px');await expect(button).toBeInViewport();}
 await expect(hub.locator('.dossier-tabs button')).toHaveCount(4);
 await page.screenshot({path:`test-results/release098-identity-${language}.png`});
});

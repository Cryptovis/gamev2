import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
import {UI_CATALOG_LANDING} from '../src/i18n/uiCatalogLanding';
import {campaignFixture,seedRecords,seedSave,resumeFixture} from './seedCampaign';
import {chooseLanguage,continueCampaign,enterAsGuest,landingReady} from './helpers/enterAsGuest';

// Phase 9.4 landing experience (blueprint section 7.2). Each test starts on a clean browser context.

const hero=(page:Page)=>page.getByTestId('landing-hero');
const menu=(page:Page)=>page.getByTestId('landing-menu');
const card=(page:Page)=>page.getByTestId('save-card');
const quote=(page:Page)=>page.getByTestId('wisdom-widget').first();
const drawer=(page:Page)=>page.getByTestId('profile-drawer');
const insideDrawer=(page:Page)=>page.evaluate(()=>!!document.activeElement?.closest('[data-testid="profile-drawer"]'));

test('1 cold open with no storage shows Play now, an empty save card and no credential fields',async({page})=>{
 await page.goto('/');await landingReady(page);
 await expect(hero(page)).toHaveAttribute('data-action','play_now');
 await expect(hero(page)).toHaveText('Play now');
 await expect(card(page)).toHaveAttribute('data-state','none');
 await expect(page.locator('input[name="username"]')).toHaveCount(0);
 await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test('2 Play now opens setup at once with no credentials and a guest session in storage',async({page})=>{
 await page.goto('/');await landingReady(page);
 await hero(page).click();
 await expect(page.locator('.campaign-wizard')).toBeVisible();
 await expect(page.locator('[name="username"]')).toHaveCount(0);
 await expect(page.getByTestId('math-question')).toHaveCount(0);
 expect(await page.evaluate(()=>sessionStorage.getItem('trp-demo-session-v1'))).toBe('guest');
});

test('3 Continue shows the leader and day, runs the loader and enters the game',async({page})=>{
 const state=campaignFixture('en');state.day=7;state.playerProfile.commanderName='Ada Lovelace';
 await seedSave(page,state);await landingReady(page);
 await expect(menu(page)).toHaveAttribute('data-action','continue');await expect(hero(page)).toHaveCount(0);
 await expect(card(page)).toHaveAttribute('data-state','ready');
 await expect(card(page)).toContainText('Ada Lovelace');await expect(card(page)).toContainText('Day 7');
 await page.getByTestId('save-card-continue').click();
 await expect(page.getByTestId('landing-root')).toHaveCount(0,{timeout:15_000});
 await expect(page.locator('.brand-line')).toBeVisible();
});

test('4 a corrupt save is reported, Continue is disabled and the hero falls back to Play now',async({page})=>{
 const problems:string[]=[];
 page.on('pageerror',error=>problems.push(String(error)));
 page.on('console',message=>{if(message.type()==='error'&&!/Failed to load resource/.test(message.text()))problems.push(message.text());});
 const {schemaVersion}=campaignFixture('en');
 await seedRecords(page,[{id:'manual',owner:'guest',name:'Broken',updatedAt:Date.now(),schemaVersion,state:{schemaVersion,day:'not a day'}}]);
 await landingReady(page);
 await expect(card(page)).toHaveAttribute('data-state','unreadable');
 await expect(page.getByTestId('save-card-continue')).toHaveAttribute('aria-disabled','true');
 await expect(hero(page)).toHaveAttribute('data-action','play_now');
 await page.getByTestId('save-card-continue').click({force:true});
 await expect(page.getByTestId('landing-root')).toHaveAttribute('data-screen','landing');
 expect(problems).toEqual([]);
});

test('5 the dossier traps focus, closes with Escape and shows the signed-in profile on the chip',async({page})=>{
 await page.goto('/');await landingReady(page);
 const chip=page.getByTestId('dock-dossier-chip');
 await chip.click();
 await expect(drawer(page)).toBeVisible();await expect(drawer(page)).toHaveAttribute('aria-modal','true');
 expect(await insideDrawer(page)).toBe(true);
 for(let i=0;i<10;i++){await page.keyboard.press('Tab');expect(await insideDrawer(page),`Tab ${i+1}`).toBe(true);}
 for(let i=0;i<10;i++){await page.keyboard.press('Shift+Tab');expect(await insideDrawer(page),`Shift+Tab ${i+1}`).toBe(true);}
 await page.keyboard.press('Escape');
 await expect(drawer(page)).toHaveCount(0);await expect(chip).toBeFocused();
 await chip.click();await page.getByTestId('profile-tab-register').click();
 await page.locator('[name="username"]').fill('dossierfan');await page.locator('[name="email"]').fill('dossier@example.test');await page.locator('[name="password"]').fill('testpass123');
 const question=await page.getByTestId('math-question').innerText();const values=question.match(/\d+/g)!.map(Number);
 await page.locator('[name="answer"]').fill(String(values[0]+values[1]));await page.getByTestId('profile-submit').click();
 await expect(page.getByTestId('profile-signout')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(chip).toContainText('dossierfan');
});

test('6 the five languages relabel the landing screen without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:1366,height:768});await page.goto('/');await landingReady(page);
 const quotes=new Set<string>();
 for(const language of ['tr','es','zh','ru','en'] as const){
  await chooseLanguage(page,language);
  const expected=language==='en'?'Play now':UI_CATALOG_LANDING['Play now'][['tr','es','zh','ru'].indexOf(language)];
  await expect(hero(page),language).toHaveText(expected);
  await expect(page.getByTestId(`dock-language-${language}`)).toHaveAttribute('aria-pressed','true');
  await expect(quote(page)).toHaveAttribute('lang',language);
  quotes.add((await quote(page).locator('.lw-text').innerText()).trim());
  expect(await page.locator('.l94-hero').evaluate(el=>el.scrollWidth<=el.clientWidth),`${language} overflow`).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${language} page overflow`).toBe(true);
 }
 expect(quotes.size).toBe(5);
});

test('7 the theme toggle switches between the Navy and Ivory backgrounds',async({page})=>{
 await page.goto('/');await landingReady(page);
 const colors=()=>page.evaluate(()=>{
  const probe=document.createElement('div');probe.style.background='var(--surface-inset)';document.body.append(probe);
  const expected=getComputedStyle(probe).backgroundColor;probe.remove();
  return {theme:document.documentElement.dataset.theme,expected,actual:getComputedStyle(document.querySelector('[data-testid="landing-root"]')!).backgroundColor};
 });
 const toggle=page.getByTestId('dock-theme');
 const first=(await colors()).theme as 'dark'|'light';
 const other=first==='dark'?'light':'dark';
 const tokens={dark:'rgb(9, 23, 40)',light:'rgb(233, 231, 223)'};
 await expect.poll(async()=>(await colors()).actual).toBe(tokens[first]);
 await toggle.click();
 await expect(page.locator('html')).toHaveAttribute('data-theme',other);
 await expect(toggle).toHaveAttribute('aria-pressed',other==='light'?'true':'false');
 await expect.poll(async()=>(await colors()).actual).toBe(tokens[other]);
 expect((await colors()).expected).toBe(tokens[other]);
 await toggle.click();
 await expect(page.locator('html')).toHaveAttribute('data-theme',first);
 await expect.poll(async()=>(await colors()).actual).toBe(tokens[first]);
});

test('8 the wisdom widget has no controls, rotates on a timer and holds while hovered',async({page})=>{
 await page.clock.install();
 await page.goto('/');await landingReady(page);
 await expect(page.getByTestId('wisdom-next')).toHaveCount(0);await expect(page.getByTestId('wisdom-pause')).toHaveCount(0);
 await expect(quote(page).locator('button')).toHaveCount(0);
 const id=()=>quote(page).getAttribute('data-quote-id');
 await page.mouse.move(2,2);
 await expect(quote(page)).toHaveAttribute('data-paused','false');
 const first=await id();expect(first).toBeTruthy();
 await page.clock.runFor(18_500);
 await expect.poll(id).not.toBe(first);
 // Hover holds it.
 const second=await id();
 await quote(page).hover();
 await expect(quote(page)).toHaveAttribute('data-paused','true');
 await page.clock.runFor(40_000);
 expect(await id()).toBe(second);
 await page.mouse.move(2,2);
 await expect(quote(page)).toHaveAttribute('data-paused','false');
 await page.clock.runFor(18_500);
 await expect.poll(id).not.toBe(second);
});

test('9 the release notes open on the current version and close with Escape',async({page})=>{
 await page.goto('/');await landingReady(page);
 const button=page.getByTestId('dock-release-notes');
 await button.click();
 const modal=page.getByTestId('release-notes-modal');
 await expect(modal).toBeVisible();await expect(modal).toContainText(`v${version}`);
 await page.keyboard.press('Escape');
 await expect(modal).toHaveCount(0);await expect(button).toBeFocused();
});

test('10 reduced motion keeps the quotes rotating with nothing animating',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.clock.install();
 await page.goto('/');await landingReady(page);await page.waitForTimeout(300);
 const running=()=>page.evaluate(()=>document.querySelector('.landing094')!.getAnimations({subtree:true}).filter(a=>a.playState==='running').length);
 expect(await running()).toBe(0);
 const first=await quote(page).getAttribute('data-quote-id');
 await page.mouse.move(2,2);await page.clock.runFor(18_500);
 await expect.poll(()=>quote(page).getAttribute('data-quote-id')).not.toBe(first);
 expect(await running()).toBe(0);
});

test('11 the layout is one column on a tablet and the drawer fills a phone',async({page})=>{
 await page.setViewportSize({width:820,height:1180});await page.goto('/');await landingReady(page);
 const columns=await page.locator('.l94-stage').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
 expect(columns).toBe(1);
 const heroBox=(await menu(page).boundingBox())!,cardBox=(await card(page).boundingBox())!;
 expect(cardBox.y).toBeGreaterThanOrEqual(heroBox.y+heroBox.height);
 await page.setViewportSize({width:390,height:844});
 await page.getByTestId('dock-dossier-chip').click();
 await expect(drawer(page)).toBeVisible();
 const box=(await drawer(page).boundingBox())!;
 expect(box.width).toBeCloseTo(390,0);
});

test('12 leaving a campaign from the game returns to the landing screen with Continue',async({page})=>{
 const state=campaignFixture('en');state.day=10;state.playerProfile.commanderName='Grace Hopper';
 await resumeFixture(page,state);
 await page.locator('.leader-avatar-button').click();await page.locator('.profile-tabs button').last().click();
 await page.locator('.campaign-option-actions button').first().click();await expect(page.locator('.campaign-save-status')).toContainText('Saved');
 await page.locator('.campaign-option-actions button').last().click();
 await page.getByRole('button',{name:'START NEW CAMPAIGN',exact:true}).click();
 await landingReady(page);
 await expect(menu(page)).toHaveAttribute('data-action','continue');
 await expect(card(page)).toContainText('Grace Hopper');await expect(card(page)).toContainText('Day 10');
 await continueCampaign(page);
 await expect(page.locator('.brand-line')).toBeVisible();
});

test('13 the setup wizard shows the compact quote',async({page})=>{
 await page.goto('/');await enterAsGuest(page);
 const widget=page.getByTestId('wisdom-widget');
 await expect(widget).toBeVisible();await expect(widget).toHaveAttribute('data-variant','compact');
 expect(await widget.getAttribute('data-quote-id')).toBeTruthy();
 await page.locator('.wizard-name-field input').fill('Setup reader');
 await page.locator('.wizard-next').click();
 await expect(page.locator('.wizard-avatar-grid')).toBeVisible();
});

test('14 the preloader advances through its stages to 100% before the game appears',async({page})=>{
 await page.addInitScript(()=>{
  const log={percents:[] as number[],labels:[] as string[]};
  (window as unknown as {__loading:typeof log}).__loading=log;
  new MutationObserver(()=>{
   const percent=document.querySelector('[data-testid="loading-progress-percentage"]');
   const label=document.querySelector('[data-testid="loading-stage-label"]');
   if(percent){const value=parseInt(percent.textContent??'',10);if(Number.isFinite(value)&&value!==log.percents[log.percents.length-1])log.percents.push(value);}
   if(label){const text=(label.textContent??'').trim();if(text&&text!==log.labels[log.labels.length-1])log.labels.push(text);}
  }).observe(document,{subtree:true,childList:true,characterData:true});
 });
 // Slow the pictures a little so every stage is on screen long enough to be seen.
 await page.route('**/assets/**',async route=>{await new Promise(resolve=>setTimeout(resolve,250));await route.continue();});
 await page.goto('/');await enterAsGuest(page);
 await page.locator('.wizard-name-field input').fill('Preload watcher');
 for(let i=0;i<4;i++)await page.locator('.wizard-next').click();
 await expect(page.getByTestId('game-loading')).toBeVisible();
 await expect(page.getByTestId('landing-root')).toHaveCount(0,{timeout:20_000});
 const log=await page.evaluate(()=>(window as unknown as {__loading:{percents:number[];labels:string[]}}).__loading);
 expect(log.percents.length).toBeGreaterThan(2);
 expect([...log.percents]).toEqual([...log.percents].sort((a,b)=>a-b));
 expect(log.percents[log.percents.length-1]).toBe(100);
 expect(log.percents.some(value=>value>=25&&value<=55)).toBe(true);
 const order=['Hydrating simulation and save state…','Pre-decoding vector graphics…','Verifying intelligence indexes and dictionaries…','Preparing executive workspace and audio…','Handing over command…'];
 const indexes=log.labels.map(label=>order.indexOf(label));
 expect(indexes.every(index=>index>=0),JSON.stringify(log.labels)).toBe(true);
 expect(indexes).toEqual([...indexes].sort((a,b)=>a-b));
 expect(log.labels[log.labels.length-1]).toBe('Handing over command…');
});

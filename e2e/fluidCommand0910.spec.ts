import {test,expect,type Page} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';

const LANGUAGES=['en','tr','es','zh','ru'] as const;
const animationOf=(page:Page,selector:string)=>page.locator(selector).evaluate(el=>{const s=getComputedStyle(el);return {name:s.animationName,ms:parseFloat(s.animationDuration)*1000};});

test('windows fade in within 160-220 ms and reduced motion removes every window animation',async({page})=>{
 await resumeFixture(page,campaignFixture('en'));
 await page.locator('[data-guide="rail-supply"]').click();await expect(page.locator('#resource-command-window')).toBeVisible();
 const supply=await animationOf(page,'#resource-command-window');
 expect(supply.name).toBe('ron-fade-in');expect(supply.ms).toBeGreaterThanOrEqual(160);expect(supply.ms).toBeLessThanOrEqual(220);
 await page.keyboard.press('Escape');await expect(page.locator('#resource-command-window')).toHaveCount(0);
 await page.locator('[data-guide="nation"]').click();await page.locator('[data-guide="tab-power"]').click();
 await expect(page.locator('.command-window')).toBeVisible();
 expect((await animationOf(page,'.command-window-backdrop')).name).toBe('ron-fade-in');
 // Geometry is never animated: the dossier keeps its final box while it fades in.
 expect(await page.locator('.command-window').evaluate(el=>getComputedStyle(el).transform)).toBe('none');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.keyboard.press('Escape');await expect(page.locator('.command-panel')).toBeVisible();
 expect(await page.locator('.command-panel').evaluate(el=>getComputedStyle(el).transitionDuration.split(',').every(d=>parseFloat(d)===0))).toBe(true);
 await page.locator('[data-guide="tab-power"]').click();await expect(page.locator('.command-window')).toBeVisible();
 expect((await animationOf(page,'.command-window')).name).toBe('none');expect((await animationOf(page,'.command-window-backdrop')).name).toBe('none');
 expect(await page.locator('.command-window').evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
});

test('returning from a child window restores the parent scroll position, row focus and frame',async({page})=>{
 await resumeFixture(page,campaignFixture('en'));
 await page.locator('[data-guide="rail-world"]').click();const world=page.locator('#pulse-window');await expect(world).toBeVisible();
 const table=page.locator('#pulse-window .ranking-table-wrap');
 await table.evaluate(el=>{el.scrollTop=180;});
 await expect.poll(()=>table.evaluate(el=>el.scrollTop)).toBeGreaterThan(100);
 await page.waitForTimeout(150);
 const offset=await table.evaluate(el=>el.scrollTop),frame=await world.boundingBox();
 // Choose a row that is inside the scrolled view and open it from the keyboard.
 const row=await table.evaluate(el=>{const box=el.getBoundingClientRect();const buttons=[...el.querySelectorAll<HTMLButtonElement>('tbody button')];const i=buttons.findIndex(b=>{const r=b.getBoundingClientRect();return r.top>box.top+30&&r.bottom<box.bottom-10;});buttons[i].focus({preventScroll:true});return i;});
 expect(row).toBeGreaterThan(0);
 await page.keyboard.press('Enter');
 await expect(world).toBeHidden();await expect(page.locator('.command-panel')).toBeVisible();
 await page.locator('.command-panel [data-guide="close-workspace"]').click();
 await expect(world).toBeVisible();
 await expect.poll(()=>table.evaluate(el=>el.scrollTop)).toBe(offset);
 expect(await table.evaluate((el,i)=>document.activeElement===el.querySelectorAll('tbody button')[i],row)).toBe(true);
 const back=await world.boundingBox();expect(back!.x).toBe(frame!.x);expect(back!.y).toBe(frame!.y);
});

test('country panel returns from National power with its tab, scroll and focus',async({page})=>{
 await page.setViewportSize({width:1440,height:760});
 await resumeFixture(page,campaignFixture('en'));
 await page.locator('[data-guide="nation"]').click();const panel=page.locator('.command-panel');await expect(panel).toBeVisible();
 await page.locator('[data-guide="tab-military"]').click();await expect(page.locator('[data-guide="tab-military"]')).toHaveAttribute('aria-pressed','true');
 const scrolled=await panel.evaluate(el=>{el.scrollTop=Math.min(240,el.scrollHeight-el.clientHeight);return el.scrollTop;});
 const power=page.locator('[data-guide="tab-power"]');await power.focus({});await page.keyboard.press('Enter');
 await expect(page.locator('.command-window')).toBeVisible();await expect(panel).toBeHidden();
 // The receding panel cannot be reached while the child is open.
 expect(await panel.evaluate(el=>{const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!hit&&el.contains(hit);})).toBe(false);
 await page.keyboard.press('Escape');
 await expect(panel).toBeVisible();await expect(power).toBeFocused();
 await expect(page.locator('[data-guide="tab-military"]')).toHaveAttribute('aria-pressed','true');
 expect(await panel.evaluate(el=>el.scrollTop)).toBe(scrolled);
 await expect.poll(()=>panel.evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
});

for(const language of LANGUAGES)test(`${language} shows Rule of Nations untranslated in the title, header and help`,async({page})=>{
 const s=campaignFixture(language);s.selectedCountryId=null;await resumeFixture(page,s);
 await expect(page).toHaveTitle('Rule of Nations');
 await expect(page.locator('.brand-block .eyebrow')).toHaveText('Rule of Nations');
 await page.locator('[data-guide="rail-help"]').click();await expect(page.locator('#help-window .game-notes h3')).toHaveText('Rule of Nations');
 expect(await page.locator('body').innerText()).not.toMatch(/Real President|Gerçek Başkan|Gerçekten O'nun|AlpyX(?! Game Studios)/);
});

test('entry and setup screens carry the Rule of Nations mark over the cover art',async({page})=>{
 await page.goto('/');await expect(page.locator('.entry-art .brand-mark')).toContainText('Rule of Nations');
 await expect(page.locator('.entry-art .brand-mark')).toHaveAttribute('translate','no');
 await expect(page.locator('.entry-art .brand-mark-emblem')).toHaveText('RON');
 await page.locator('[data-entry="demo"]').click();await page.locator('[data-entry="new-game"]').click();
 await expect(page.locator('.setup-cover .brand-mark')).toContainText('Rule of Nations');await expect(page.locator('.wizard-header > div > small').first()).toContainText('Rule of Nations');
 await page.screenshot({path:'test-results/ron-setup-0910.png'});
});

for(const [language,width] of [['en',1440],['tr',390],['ru',1440]] as const)test(`${language} ${width}px text is at least 10px, tabs use natural case and nothing overflows the page`,async({page})=>{
 await page.setViewportSize({width,height:width===390?844:900});
 const s=campaignFixture(language);s.selectedCountryId=null;await resumeFixture(page,s);
 const smallest=()=>page.evaluate(()=>{let min=99,where='';for(const el of document.querySelectorAll('body *')){if(el.closest('svg'))continue;const text=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent??'').join('').trim();if(!text||!(el as HTMLElement).getClientRects().length)continue;const style=getComputedStyle(el);if(style.visibility==='hidden')continue;const size=parseFloat(style.fontSize);if(size<min){min=size;where=`${el.className} «${text.slice(0,20)}»`;}}return {min,where};});
 for(const open of [async()=>{},async()=>{await page.locator('[data-guide="rail-supply"]').click();await expect(page.locator('#resource-command-window')).toBeVisible();},async()=>{await page.keyboard.press('Escape');await page.locator('[data-guide="nation"]').click();await expect(page.locator('.command-panel')).toBeVisible();}]){
  await open();
  const result=await smallest();expect(result.min,result.where).toBeGreaterThanOrEqual(10);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
 }
 expect(await page.locator('.command-panel .panel-tabs button span').first().evaluate(el=>getComputedStyle(el).textTransform)).toBe('none');
});

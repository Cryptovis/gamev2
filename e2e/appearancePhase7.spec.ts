import {test,expect} from '@playwright/test';
import {campaignFixture,resumeFixture} from './seedCampaign';

test('System defaults before entry renders and follows live OS changes',async({page})=>{
 await page.emulateMedia({colorScheme:'light'});await page.goto('/');
 await expect(page.locator('.entry-shell')).toBeVisible();await expect(page.locator('html')).toHaveAttribute('data-appearance','system');await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
});
test('existing saved installation retains Dark; Settings persists and updates all portals',async({page})=>{
 await resumeFixture(page,campaignFixture('en'));
 await page.evaluate(()=>localStorage.removeItem('trp-appearance-v1'));await page.reload();await page.locator('.load-previous').click();
 await expect(page.locator('html')).toHaveAttribute('data-appearance','dark');
 await page.locator('.leader-avatar-button').click();await page.locator('.profile-tabs button').filter({hasText:'Settings'}).click();
 await page.locator('[data-appearance="light"]').click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');
 await page.reload();await page.locator('.load-previous').click();await expect(page.locator('html')).toHaveAttribute('data-theme','light');
});
for(const language of ['en','tr','es','zh','ru'] as const)for(const appearance of ['dark','light'] as const)test(`${language} ${appearance} appearance has readable entry and setup`,async({page})=>{
 await page.addInitScript(value=>localStorage.setItem('trp-appearance-v1',value),appearance);await page.goto('/');
 await page.locator('.entry-languages button').filter({hasText:{en:'English',tr:'Türkçe',es:'Español',zh:'中文',ru:'Русский'}[language]}).click();
 await page.locator('[data-entry="demo"]').click();await page.locator('[data-entry="new-game"]').click();
 await expect(page.locator('.appearance-options')).toBeVisible();await expect(page.locator(`button[data-appearance="${appearance}"]`)).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('html')).toHaveAttribute('data-theme',appearance);
 expect(await page.locator('.campaign-wizard').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 const contrast=await page.locator('.appearance-options small').evaluate(el=>{
  const rgb=(v:string)=>v.match(/[\d.]+/g)!.slice(0,3).map(Number).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
  const luminance=(v:string)=>{const [r,g,b]=rgb(v);return .2126*r+.7152*g+.0722*b;};
  const a=luminance(getComputedStyle(el).color),b=luminance(getComputedStyle(el.closest('.appearance-options')!).backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 });expect(contrast).toBeGreaterThanOrEqual(4.5);
 await page.screenshot({path:`test-results/phase7-appearance-${language}-${appearance}.png`});
});

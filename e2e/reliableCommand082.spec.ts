import {readFileSync} from 'node:fs';
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
import {test,expect,type Page} from '@playwright/test';
async function start(page:Page){
 await page.goto('/');await page.getByRole('button',{name:'Türkçe',exact:true}).click();await page.locator('[data-entry="demo"]').click();await page.locator('[data-entry="new-game"]').click();await page.locator('.wizard-name-field input').fill('Playtest');
 for(let i=0;i<4;i++)await page.locator('.wizard-footer .wizard-next').click();
 await expect(page.locator('.guided-tutorial')).toBeVisible();
}
async function skip(page:Page){await page.locator('.guided-card footer button').first().click();await expect(page.locator('.guided-tutorial')).toHaveCount(0);}
for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 test(`${viewport.width}px menus, home camera, supply and reload`,async({page})=>{
  await page.setViewportSize(viewport);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);await skip(page);
  await expect(page.locator('.command-rail-left [data-guide="rail-goals"]')).toHaveCount(0);await expect(page.locator('.command-rail-right [data-guide="rail-goals"]')).toBeVisible();
  const help=page.locator('.map-help-cluster [data-guide="rail-help"]');await expect(help).toHaveAttribute('aria-pressed','false');await help.click();await expect(help).toHaveAttribute('aria-pressed','true');
  await page.locator('[data-guide="close-workspace"]:visible').click();await expect(help).toHaveAttribute('aria-pressed','false');
  await page.getByRole('button',{name:'Ülkene dön',exact:true}).click();await expect(page.locator('.strategy-svg')).toHaveAttribute('data-zoom',/1\.5500/);
  await page.locator('[data-guide="nation"]').first().click();await page.locator('[data-guide="tab-economy"]').click();
  await expect(page.locator('.supplier-board')).toHaveCount(0);
  await page.locator('.resource-card').first().getByRole('button',{name:'Satın al',exact:true}).click();
  await expect(page.locator('#resource-command-window')).toBeVisible();await expect(page.locator('.resource-command-card')).toHaveCount(1);
  await page.locator('#resource-command-window [data-guide="close-workspace"]').click();
  // Save through the actual session UI, then load directly from campaign setup after reload.
  await page.locator('[data-guide="close-workspace"]:visible').click();await page.locator('.leader-avatar-button').click();
  await page.locator('.profile-tabs button').last().click();await page.locator('.campaign-option-actions button').first().click();
  await expect(page.locator('.campaign-save-status')).toContainText('kaydedildi');await page.reload();
  await page.locator('.load-previous').click();await expect(page.locator('.campaign-wizard')).toHaveCount(0);await expect(page.locator('.brand-line')).toContainText('Playtest');
  await expect(page.locator('body')).not.toContainText('Loaded Day');expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/082-${viewport.width}.png`,fullPage:true});
 });
}

for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
test(`${viewport.width}px all ten tutorial lessons including funded construction`,async({page})=>{
 test.setTimeout(120000);await page.setViewportSize(viewport);await start(page);
 const next=page.locator('.guided-card footer .primary');await next.click();
 const lessons=[['nation','economy'],['rail-map',''],['nation','production'],['nation','technology'],['rail-market',''],['rail-supply',''],['rail-diplo',''],['nation','military'],['nation','world']];
 for(let i=0;i<lessons.length;i++){
  const [menu,tab]=lessons[i];await page.locator(`[data-guide="${menu}"]`).first().click();
  if(tab)await page.locator(`[data-guide="tab-${tab}"]`).click();
  if(i===2){
   await page.locator('[data-guide="learn-build"]').first().click();await page.locator('.tutorial-read').click();
   await page.locator('[data-guide="review-confirm"]').click();
   await expect(page.locator('.review-dialog h2')).toContainText('Karar uygulandı');
   await page.locator('[data-guide="review-dismiss"]').first().click();await expect(page.locator('.review-dialog')).toHaveCount(0);
   await expect(page.locator('.construction-list').first()).toBeVisible();
  }else{
   await page.locator('[data-guide="tutorial-detail"]:visible').click();
   const modal=await page.locator('.review-dialog').boundingBox(),guide=await page.locator('.guided-card').boundingBox();expect(guide!.y).toBeGreaterThanOrEqual(modal!.y+modal!.height);
   const ack=await page.locator('.tutorial-read').boundingBox(),nav=await page.locator('.guided-card footer').boundingBox();expect(nav!.y-ack!.y-ack!.height).toBeGreaterThanOrEqual(8);
   await page.screenshot({path:`test-results/tutorial-reading-${viewport.width}-${i}.png`,fullPage:true});
   await page.locator('.tutorial-read').click();
   await page.locator('[data-guide="review-dismiss"]').first().click();
  }
  if(i===8)await page.locator('.command-panel').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  const close=page.locator('[data-guide="close-workspace"]:visible');
  const card=await page.locator('.guided-card').boundingBox(),closeBox=await close.boundingBox();
  expect(card!.y).toBeGreaterThanOrEqual(closeBox!.y+closeBox!.height);
  await expect.poll(()=>close.evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));})).toBe(true);
  await close.click();await expect(next).toBeEnabled();await next.click();
 }
 await expect(page.locator('.guided-tutorial')).toHaveCount(0);
});
}

for(const viewport of [{width:1440,height:900},{width:1280,height:720},{width:390,height:844}]){
 test(`${viewport.width}px stable setup and readable nation selection`,async({page})=>{
  await page.setViewportSize(viewport);await page.goto('/');await page.locator('[data-entry="demo"]').click();await page.locator('[data-entry="new-game"]').click();
  await expect(page.locator('.wizard-release')).toHaveText(version);
  const nextButton=page.locator('.wizard-next');
  const nextBounds=await nextButton.boundingBox(),footerBounds=await page.locator('.wizard-footer').boundingBox();
  expect(nextBounds!.y).toBeGreaterThanOrEqual(footerBounds!.y);
  expect(nextBounds!.y+nextBounds!.height).toBeLessThanOrEqual(footerBounds!.y+footerBounds!.height);
  expect(await nextButton.evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));})).toBe(true);
  const frame=await page.locator('.campaign-wizard').boundingBox();
  await page.locator('.wizard-name-field input').fill('Layout test');
  await expect(page.locator('.wizard-language')).toHaveCount(0);
  await page.locator('.wizard-next').click();await page.locator('.wizard-next').click();
  const current=await page.locator('.campaign-wizard').boundingBox();expect(current!.height).toBeCloseTo(frame!.height,0);
  await page.locator('.country-search').fill('Angola');await page.locator('.country-choice-list button').click();
  const colors=await page.locator('.country-choice-list button.active').evaluate(el=>({small:getComputedStyle(el.querySelector('small')!).color,title:getComputedStyle(el.querySelector('strong')!).color}));expect(colors.small).toBe(colors.title);
  const summary=await page.locator('.wizard-country-preview').boundingBox(),footer=await page.locator('.wizard-footer').boundingBox();expect(summary!.y+summary!.height).toBeLessThanOrEqual(footer!.y+1);
  if(viewport.width>900){expect(await page.locator('.wizard-body').evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);}
  await page.locator('.country-search').fill('');
  expect(await page.locator('.wizard-country-scroll').evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
  await page.screenshot({path:`test-results/setup-patch-${viewport.width}.png`,fullPage:true});
  await page.locator('.wizard-next').click();
  await expect(page.locator('.confirm-summary-grid').getByText('English',{exact:true})).toBeVisible();
  const confirmation=await page.locator('.campaign-wizard').boundingBox();
  expect(confirmation!.height).toBeCloseTo(frame!.height,0);
  await expect(page.locator('.wizard-next.confirm')).toBeInViewport();
  await page.screenshot({path:`test-results/setup-confirm-${viewport.width}.png`,fullPage:true});
 });
}

for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 test(`${viewport.width}px window close controls and plain profile footer`,async({page})=>{
  await page.setViewportSize(viewport);await start(page);await skip(page);
  await page.locator('[data-guide="rail-map"]').click();
  const close=page.locator('.map-dock-header .map-close');await expect(close).toBeVisible();
  await expect.poll(()=>close.evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));})).toBe(true);
  await page.screenshot({path:`test-results/hotfix-map-${viewport.width}.png`,fullPage:true});await close.click();
  await page.locator('[data-guide="nation"]').first().click();await page.locator('[data-guide="tab-production"]').click();
  const panel=page.locator('#country-section-window');
  const hit=await panel.evaluate(el=>{const rail=document.querySelector('.map-help-cluster')!;const a=el.getBoundingClientRect(),b=rail.getBoundingClientRect();const x=Math.max(a.left,b.left)+2,y=Math.max(a.top,b.top)+2;if(x>=Math.min(a.right,b.right)||y>=Math.min(a.bottom,b.bottom))return true;return el.contains(document.elementFromPoint(x,y));});expect(hit).toBe(true);
  await page.locator('[data-guide="close-workspace"]:visible').click();await page.locator('.leader-avatar-button').click();
  await expect(page.locator('.player-options-footer button')).toBeVisible();
  expect(await page.locator('.player-options-footer').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  await page.screenshot({path:`test-results/hotfix-profile-${viewport.width}.png`,fullPage:true});await page.locator('.player-options-footer button').click();
 });
}

test('diplomacy retry tracker and Supply/World atlas artwork',async({page})=>{
 await start(page);await skip(page);await page.locator('[data-guide="rail-diplo"]').click();
 await page.locator('.letter-compose button').click();await page.locator('[data-guide="review-confirm"]').click();await page.locator('[data-guide="review-dismiss"]').first().click();
 await expect(page.locator('.proposal-status:visible').filter({hasText:'zaten gönderildi'})).toContainText('zaten gönderildi');await page.locator('.letter-compose button').click();
 await expect(page.locator('.review-dialog')).toHaveCount(0);await expect(page.locator('.letter-list article[data-status="pending"]')).toHaveCount(1);await expect(page.locator('.proposal-filters .active')).toContainText('Gönderilen');
 await page.locator('.letter-list article[data-status="pending"] > button').click();
 await expect(page.locator('[data-action="embassy"]')).toContainText('takip et');await page.locator('[data-action="embassy"]').click();
 await expect(page.locator('.proposal-status:visible').filter({hasText:'zaten gönderildi'})).toContainText('zaten gönderildi');await expect(page.locator('.letter-list article[data-status="pending"]')).toHaveCount(1);
 await page.locator('[data-guide="close-workspace"]:visible').click();
 for(const menu of ['rail-supply','rail-world']){
  await page.locator(`[data-guide="${menu}"]`).click();const imgs=page.locator('.floating-command-window img[src*="/assets/command/"]');await expect(imgs.first()).toBeVisible();expect(await imgs.count()).toBeGreaterThan(0);
  await expect.poll(()=>imgs.evaluateAll(els=>els.every(el=>(el as HTMLImageElement).complete&&(el as HTMLImageElement).naturalWidth>0))).toBe(true);
  await page.screenshot({path:`test-results/patch4-${menu}.png`,fullPage:true});await page.locator('[data-guide="close-workspace"]:visible').click();
 }
});


test('failed atlas requests retain decorative fallback',async({page})=>{
 await page.route('**/assets/command/resource-atlas.webp*',r=>r.abort());
 await start(page);await skip(page);await page.locator('[data-guide="rail-supply"]').click();
 await expect(page.locator('.floating-command-window .atlas-fallback').first()).toBeVisible();
 await expect(page.locator('.floating-command-window img[src$="resource-atlas.webp"]')).toHaveCount(0);
});


for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 test(`${viewport.width}px localized nation search and warm setup palette`,async({page})=>{
  await page.setViewportSize(viewport);await page.goto('/');await page.getByRole('button',{name:'Türkçe',exact:true}).click();await page.locator('[data-entry="demo"]').click();await page.locator('[data-entry="new-game"]').click();await page.locator('.wizard-name-field input').fill('Palette test');
  await page.locator('.wizard-next').click();await page.locator('.wizard-next').click();
  const search=page.locator('.country-search');
  for(const query of ['Türkiye','Turkiye','TUR']){
   await search.fill(query);await expect(page.locator('.country-choice-list > button')).toHaveCount(1);await expect(page.locator('.country-choice-list > button')).toContainText('Türkiye');
  }
  await page.locator('.country-choice-list > button').click();await expect(page.locator('.country-choice-list > button')).toHaveAttribute('aria-pressed','true');
  expect(await page.locator('.wizard-country-preview').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(29, 37, 35)');
  expect(await page.locator('.wizard-stat-grid span').first().evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(24, 28, 23)');
  await search.fill('zzzz-no-country');await expect(page.locator('.country-search-empty')).toContainText('ülke bulunamadı');
  await page.getByRole('button',{name:'Aramayı temizle',exact:true}).click();await expect(search).toHaveValue('');expect(await page.locator('.country-choice-list > button').count()).toBeGreaterThan(100);
  await expect(page.locator('.wizard-country-preview h2')).toHaveText('Türkiye');
  await page.screenshot({path:`test-results/nation-palette-${viewport.width}.png`,fullPage:true});
  await page.locator('.wizard-next').click();expect(await page.locator('.confirm-leader-card').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(29, 37, 35)');
 });
}


test('credit review explains unaffordable lending and publishes valid terms',async({page})=>{
 await start(page);await skip(page);await page.locator('[data-guide="rail-market"]').click();
 await page.getByRole('button',{name:'Ülkeler Arası Kredi ve Para Fonu',exact:true}).click();
 await page.locator('[aria-label="Credit offer type"]').selectOption('lend');await page.locator('[aria-label="Credit principal millions"]').fill('1000000');
 await page.getByRole('button',{name:'Kredi teklifini incele',exact:true}).click();await expect(page.locator('[data-guide="review-confirm"]')).toBeDisabled();
 await expect(page.locator('.review-notes')).toContainText('hazine yetersiz');await expect(page.locator('.review-metrics')).toContainText('Hazine açığı');await page.screenshot({path:'test-results/credit-feedback.png',fullPage:true});
 await page.locator('[data-guide="review-dismiss"]').first().click();await page.locator('[aria-label="Credit principal millions"]').fill('1000');
 await page.getByRole('button',{name:'Kredi teklifini incele',exact:true}).click();await page.locator('[data-guide="review-confirm"]').click();await expect(page.locator('.review-dialog h2')).toContainText('Karar uygulandı');
 await page.locator('[data-guide="review-dismiss"]').first().click();await expect(page.locator('.credit-board')).toContainText('Türkiye');
});

test('country trade proposal preserves sent receipt and market labels use consistent case',async({page})=>{
 await start(page);await skip(page);await page.locator('[data-guide="rail-diplo"]').click();await page.locator('.letter-compose select').nth(1).selectOption('embassy');
 await expect(page.locator('.proposal-assessment')).toContainText('İyi seviye');
 await page.locator('.letter-compose button').click();await page.locator('[data-guide="review-confirm"]').click();await page.locator('[data-guide="review-dismiss"]').first().click();
 await page.locator('.letter-list article[data-status="pending"] > button').click();
 await page.locator('[data-action="trade"]').click();await expect(page.locator('.strategic-decision-modal')).toBeVisible();await page.locator('.strategic-decision-modal .confirm').click();
 await expect(page.locator('.review-dialog h2')).toContainText('Karar uygulandı');await expect(page.locator('.review-dialog')).not.toContainText('Conditions changed');
 await page.locator('[data-guide="review-dismiss"]').first().click();await page.locator('[data-guide="close-workspace"]:visible').click();
 await page.locator('[data-guide="rail-market"]').click();await expect(page.locator('.exchange-filters')).toBeVisible();
 await expect(page.locator('.exchange-filters button').first()).toHaveText('Gıda');
});

import {test,expect,type Page} from '@playwright/test';
async function start(page:Page){
 await page.goto('/');await page.locator('.wizard-name-field input').fill('Playtest');await page.getByRole('button',{name:'Türkçe',exact:true}).click();
 for(let i=0;i<4;i++)await page.locator('.wizard-footer .wizard-next').click();
 await expect(page.locator('.guided-tutorial')).toBeVisible();
}
async function skip(page:Page){await page.locator('.guided-card footer button').first().click();await expect(page.locator('.guided-tutorial')).toHaveCount(0);}
for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 test(`${viewport.width}px menus, home camera, supply and reload`,async({page})=>{
  await page.setViewportSize(viewport);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);await skip(page);
  await expect(page.locator('.command-rail-left [data-guide="rail-goals"]')).toHaveCount(0);await expect(page.locator('.command-rail-right [data-guide="rail-goals"]')).toBeVisible();
  const help=page.locator('.map-help-cluster [data-guide="rail-help"]');await expect(help).toHaveAttribute('aria-pressed','false');await help.click();await expect(help).toHaveAttribute('aria-pressed','true');
  await page.locator('[data-guide="close-workspace"]').click();await expect(help).toHaveAttribute('aria-pressed','false');
  await page.getByRole('button',{name:'Ülkene dön',exact:true}).click();await expect(page.locator('.strategy-svg')).toHaveAttribute('data-zoom',/1\.5500/);
  await page.locator('[data-guide="nation"]').first().click();await page.locator('[data-guide="tab-economy"]').click();
  await expect(page.locator('.supplier-board')).toHaveCount(0);
  await page.locator('.resource-card').first().getByRole('button',{name:'Satın al',exact:true}).click();
  await expect(page.locator('#resource-command-window')).toBeVisible();await expect(page.locator('.resource-command-card')).toHaveCount(1);
  await page.locator('#resource-command-window [data-guide="close-workspace"]').click();
  // Save through the actual session UI, then load directly from campaign setup after reload.
  await page.locator('[data-guide="close-workspace"]').click();await page.locator('.leader-avatar-button').click();
  await page.locator('.profile-tabs button').last().click();await page.locator('.campaign-option-actions button').first().click();
  await expect(page.locator('.campaign-save-status')).toContainText('kaydedildi');await page.reload();
  await page.locator('.load-previous').click();await expect(page.locator('.campaign-wizard')).toHaveCount(0);await expect(page.locator('.brand-line')).toContainText('Playtest');
  await expect(page.locator('body')).not.toContainText('Loaded Day');expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/082-${viewport.width}.png`,fullPage:true});
 });
}

test('all ten tutorial lessons including funded construction',async({page})=>{
 test.setTimeout(120000);await start(page);
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
   await page.locator('[data-guide="tutorial-detail"]').click();await page.locator('.tutorial-read').click();
   await page.locator('[data-guide="review-dismiss"]').first().click();
  }
  await page.locator('[data-guide="close-workspace"]').click();await expect(next).toBeEnabled();await next.click();
 }
 await expect(page.locator('.guided-tutorial')).toHaveCount(0);
});

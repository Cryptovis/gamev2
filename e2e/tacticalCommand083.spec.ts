import {test,expect,type Page} from '@playwright/test';
async function start(page:Page){
 await page.goto('/');await expect(page.locator('.wizard-release')).toHaveText('0.83.0-playtest.2');
 await page.locator('.wizard-name-field input').fill('Tactical playtest');await page.getByRole('button',{name:'Türkçe',exact:true}).click();
 for(let i=0;i<4;i++)await page.locator('.wizard-footer .wizard-next').click();
 await page.locator('.guided-card footer button').first().click();
}
async function battle(page:Page){
 await start(page);await page.locator('[data-guide="nation"]').first().click();await page.locator('.country-select').selectOption('GRC');await page.locator('[data-guide="tab-war"]').click();
 await page.locator('.declare-war').click();await page.locator('.strategic-decision-modal .confirm').click();
 await expect(page.locator('.war-theatre-backdrop')).toBeVisible();
 await page.locator('.hd-war-button').click();await page.locator('[data-guide="review-dismiss"]').first().click();await expect(page.locator('[data-testid="tactical-battlefield"]')).toBeVisible();
}
for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 test(`${viewport.width}px tactical orders, recorded replay and save/load`,async({page})=>{
  await page.setViewportSize(viewport);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await battle(page);
  await expect(page.locator('.tactical-cell')).toHaveCount(36);await expect(page.locator('.tactical-token.friendly')).toHaveCount(3);
  await page.screenshot({path:`test-results/tactical-083-initial-${viewport.width}.png`,fullPage:true});
  await page.locator('[data-cell="0"]').focus();await page.keyboard.press('ArrowRight');await expect(page.locator('[data-cell="1"]')).toBeFocused();
  await page.locator('[data-unit="attacker-infantry"]').click();await page.locator('[data-order-kind="move"]').click();await page.locator('[data-cell="8"]').click();await page.locator('.tactical-queue').click();
  await expect(page.locator('.tactical-plan li')).toHaveCount(1);await page.locator('.tactical-commit').click();await expect(page.locator('.review-dialog h2')).toHaveText('Taktik emirleri onayla');
  await page.locator('[data-guide="review-confirm"]').click();await page.locator('[data-guide="review-dismiss"]').first().click();await expect(page.locator('.tactical-round-result h4')).toContainText('1');
  const result=await page.locator('.tactical-round-result p').first().innerText();await expect(page.locator('.tactical-commit')).toBeDisabled();
  await page.locator('.tactical-round-result button').first().click();await expect(page.locator('.tactical-round-result p').first()).toHaveText(result);await page.locator('.tactical-round-result button').first().click();
  await page.screenshot({path:`test-results/tactical-083-${viewport.width}.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.war-theatre > header > button').click();await page.locator('.leader-avatar-button').click();await page.locator('.profile-tabs button').last().click();await page.locator('.campaign-option-actions button').first().click();
  await expect(page.locator('.campaign-save-status')).toContainText('kaydedildi');await page.reload();await page.locator('.load-previous').click();await expect(page.locator('.campaign-wizard')).toHaveCount(0);
  await expect(page.locator('[data-testid="tactical-battlefield"]')).toBeVisible();await expect(page.locator('.tactical-round-result p').first()).toHaveText(result);await expect(page.locator('.tactical-commit')).toBeDisabled();expect(errors).toEqual([]);
 });
}
test('economic observations draw a chart and accessible table after a campaign day',async({page})=>{
 await start(page);await page.locator('[data-guide="nation"]').first().click();await page.locator('[data-guide="tab-economy"]').click();
 await expect(page.locator('[data-testid="economic-trends"]')).toContainText('Sonraki verinin');const date=await page.locator('.campaign-clock strong').innerText();
 await page.locator('.speed-segment button').last().click();await expect(page.locator('.campaign-clock strong')).not.toHaveText(date);await page.locator('.speed-segment button').first().click();
 await expect(page.locator('.economic-chart canvas')).toBeVisible();await page.getByRole('button',{name:'Veri tablosunu göster',exact:true}).click();expect(await page.locator('.economic-table-scroll tbody tr').count()).toBeGreaterThanOrEqual(2);
 await page.getByRole('button',{name:'Grafiği göster',exact:true}).click();await expect(page.locator('.economic-chart canvas')).toBeVisible();await page.screenshot({path:'test-results/economic-history-083.png',fullPage:true});
});

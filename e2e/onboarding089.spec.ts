import {test,expect} from '@playwright/test';
for(const viewport of [{width:1440,height:900},{width:1280,height:720},{width:390,height:844}]){
 for(const language of ['English','Türkçe','Español','中文','Русский']){
  test(`${viewport.width}px unified onboarding in ${language}`,async({page})=>{
   await page.setViewportSize(viewport);await page.goto('/');
   await page.getByRole('button',{name:language,exact:true}).click();
   const frame=await page.locator('.entry-shell').boundingBox();
   const background=await page.locator('.entry-shell').evaluate(el=>getComputedStyle(el).backgroundImage);
   await page.locator('[data-entry="demo"]').click();
   await expect(page.locator('.entry-languages')).toHaveCount(0);
   const hub=await page.locator('.entry-shell').boundingBox();
   expect(hub!.height).toBeCloseTo(frame!.height,0);
   await page.locator('[data-entry="new-game"]').click();
   await expect(page.locator('.wizard-language')).toHaveCount(0);
   const wizard=await page.locator('.campaign-wizard').boundingBox();
   expect(wizard!.height).toBeCloseTo(frame!.height,0);expect(wizard!.width).toBeCloseTo(frame!.width,0);
   expect(await page.locator('.campaign-wizard').evaluate(el=>getComputedStyle(el).backgroundImage)).toBe(background);
   await page.locator('.wizard-name-field input').fill('Alper Yıldırım');
   for(let i=0;i<3;i++){await page.locator('.wizard-next').click();await expect(page.locator('.wizard-next')).toBeInViewport();}
   await expect(page.locator('.confirm-summary-grid').getByText(language,{exact:true})).toBeVisible();
   expect(await page.locator('.wizard-body').evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
   await expect(page.locator('.confirm-message')).toBeInViewport();
   await expect(page.locator('.wizard-next.confirm')).toBeInViewport();
   if(language==='English')await expect(page.locator('.confirm-summary-grid')).toContainText('$1.3T');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   if(language==='English')await page.screenshot({path:`test-results/onboarding-confirm-${viewport.width}.png`});
  });
 }
}

for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 test(`${viewport.width}px stable opening quote and bounded portraits`,async({page})=>{
  await page.setViewportSize(viewport);await page.goto('/');await page.locator('[data-entry="demo"]').click();await page.locator('[data-entry="new-game"]').click();
  const quote=page.locator('.wizard-leadership-quote');await expect(quote).toBeVisible();
  const id=await quote.getAttribute('data-quote-id'),text=await quote.locator('blockquote').innerText();
  expect(text.length).toBeGreaterThan(10);await expect(quote.locator('figcaption')).not.toBeEmpty();
  expect(await quote.evaluate(el=>({border:getComputedStyle(el).borderTopWidth,background:getComputedStyle(el).backgroundColor}))).toEqual({border:'0px',background:'rgba(0, 0, 0, 0)'});
  await page.locator('.wizard-name-field input').fill('Quote test');await expect(quote).toHaveAttribute('data-quote-id',id!);
  await page.locator('.wizard-next').click();
  expect(await page.locator('.wizard-avatar-grid>button').evaluateAll(buttons=>buttons.every(button=>{
   const image=button.querySelector('.portrait-generated')!.getBoundingClientRect(),card=button.getBoundingClientRect();
   return image.left>=card.left&&image.right<=card.right&&image.top>=card.top&&image.bottom<=card.bottom;
  }))).toBe(true);
  await page.screenshot({path:`test-results/bounded-portraits-${viewport.width}.png`});
  await page.locator('.wizard-back').click();await expect(quote).toHaveAttribute('data-quote-id',id!);await expect(quote.locator('blockquote')).toHaveText(text);
  await page.screenshot({path:`test-results/opening-quote-${viewport.width}.png`});
 });
}

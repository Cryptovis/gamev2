import {test,expect} from '@playwright/test';
import {landingReady} from './helpers/enterAsGuest';

test('1.6-1 four cards share one row and one height, with the last campaign first', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});await page.goto('/');await landingReady(page);
  const boxes=await Promise.all(['save-card','landing-new-campaign','landing-scenarios','landing-dossier'].map(async id=>(await page.getByTestId(id).boundingBox())!));
  for(const box of boxes){expect(Math.abs(box.y-boxes[0].y)).toBeLessThanOrEqual(1);expect(Math.abs(box.height-boxes[0].height)).toBeLessThanOrEqual(1);}
  for(let i=1;i<boxes.length;i++)expect(boxes[i].x).toBeGreaterThan(boxes[i-1].x);
});

test('1.6-2 the artwork is muted at rest and full colour on hover', async ({page}) => {
  await page.goto('/');await landingReady(page);
  const art=page.getByTestId('landing-new-campaign').locator('.l94-card-art');
  await expect(art).toHaveCSS('opacity',/^(0\.55|0\.75)$/);
  await page.getByTestId('landing-new-campaign').hover();
  await expect(art).toHaveCSS('opacity','1');await expect(art).toHaveCSS('filter','none');
  const urls=await page.locator('.l94-card-art').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).backgroundImage));
  expect(urls.join(' ')).toContain('card-new-campaign.jpg');expect(urls.join(' ')).toContain('card-scenarios.jpg');expect(urls.join(' ')).toContain('card-profile.jpg');
});

test('1.6-3 the header has no Playing as guest button and the footer carries the trademark', async ({page}) => {
  await page.goto('/');await landingReady(page);
  await expect(page.getByTestId('dock-dossier-chip')).toHaveCount(0);
  await expect(page.getByText('Playing as guest')).toHaveCount(0);
  await expect(page.locator('.l94-footer')).toContainText('RON Interactive © 2026. All rights reserved.');
  await expect(page.locator('.l94-footer')).toContainText('Saves are stored per profile on this device');
});

test('1.6-4 the quote box keeps its height from one quote to the next and has no left rule', async ({page}) => {
  await page.clock.install();await page.goto('/');await landingReady(page);
  const widget=page.getByTestId('wisdom-widget').first();
  const first=(await widget.boundingBox())!;const cards=(await page.getByTestId('save-card').boundingBox())!;
  await page.mouse.move(2,2);
  for(let i=0;i<4;i++){await page.clock.runFor(18_500);const box=(await widget.boundingBox())!;expect(box.height).toBeCloseTo(first.height,0);expect((await page.getByTestId('save-card').boundingBox())!.y).toBeCloseTo(cards.y,0);}
  await expect(widget).toHaveCSS('border-left-width','1px');await expect(widget).toHaveCSS('border-left-style','solid');
  expect(Math.abs((first.x+first.width/2)-720)).toBeLessThanOrEqual(2);
});

test('1.6-5 social sign-in shows a Coming soon notice for each provider', async ({page}) => {
  await page.goto('/');await landingReady(page);
  await page.getByTestId('landing-dossier').click();
  for(const provider of ['google','apple','facebook']){
    await page.getByTestId(`social-${provider}`).click();
    await expect(page.getByTestId('social-toast')).toHaveText('Coming soon');
  }
});

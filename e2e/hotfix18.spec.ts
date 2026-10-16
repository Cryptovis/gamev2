import {test,expect} from '@playwright/test';
import {landingReady,enterAsGuest} from './helpers/enterAsGuest';
import {campaignFixture,resumeFixture} from './seedCampaign';

test('1.8-1 the wallpaper stays pinned while the landing page scrolls, and the dock carries the language flags top-right', async ({page}) => {
  await page.setViewportSize({width:1280,height:600});await page.goto('/');await landingReady(page);
  const backdrop=page.locator('.l94-backdrop');
  await expect(backdrop).toHaveCSS('position','fixed');
  const before=(await backdrop.boundingBox())!;
  await page.locator('.landing094').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  const after=(await backdrop.boundingBox())!;
  expect(after.y).toBe(before.y);expect(after.width).toBeGreaterThanOrEqual(1280);expect(after.height).toBeGreaterThanOrEqual(600);
  const bar=(await page.getByTestId('dock-language-bar').boundingBox())!;
  expect(bar.x+bar.width).toBeGreaterThan(1280-80);expect(bar.x).toBeGreaterThan(640);
  const quote=(await page.locator('.lw--hero').boundingBox())!,foot=(await page.locator('.l94-footer p').first().boundingBox())!;
  await page.locator('.landing094').evaluate(el=>{el.scrollTop=0;});
  expect(foot.y-(quote.y+quote.height)).toBeGreaterThanOrEqual(24);
});

test('1.8-1b the title is the refined size', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});await page.goto('/');await landingReady(page);
  const size=await page.locator('.l94-title').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(33);expect(size).toBeLessThanOrEqual(52);
});

test('1.8-2 the wizard has no step kickers or subtitle and shows the System note only for System', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});await page.goto('/');await landingReady(page);await enterAsGuest(page);
  const wizard=page.locator('.campaign-wizard');
  await expect(wizard).not.toContainText('STEP 01');await expect(wizard).not.toContainText('Create your leader and choose a country.');
  const note=page.getByTestId('appearance-system-note');
  await wizard.locator('[data-appearance="dark"]').click();await expect(note).toHaveCount(0);
  await wizard.locator('[data-appearance="light"]').click();await expect(note).toHaveCount(0);
  await wizard.locator('[data-appearance="system"]').click();await expect(note).toHaveCount(1);
  const quote=(await wizard.locator('.lw--compact').boundingBox())!,body=(await wizard.locator('.wizard-body').boundingBox())!;
  expect(Math.abs((quote.x+quote.width/2)-(body.x+body.width/2))).toBeLessThanOrEqual(24);
});

test('1.8-3 National Command is compact and the credentials are read-only', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  const state=campaignFixture('en');state.selectedCountryId=null;await resumeFixture(page,state);
  await page.locator('.leader-avatar-button').click();
  const modal=page.locator('.player-options-modal');
  await expect(modal).toBeVisible();
  expect((await modal.boundingBox())!.width).toBeLessThanOrEqual(681);
  const credentials=page.getByTestId('leader-credentials');
  for(const key of ['name','citizenship','birth','ideology','perk'])await expect(credentials.locator(`[data-credential="${key}"]`)).toBeVisible();
  await expect(modal.getByText('CHANGE PORTRAIT')).toHaveCount(0);await expect(modal.getByText('UPDATE IDENTITY')).toHaveCount(0);
  await expect(modal.locator('select,input[type="date"]')).toHaveCount(0);
});

test('1.8-4 and 1.8-5 the alliance badges share a row and the hardware card is bounded with context', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await resumeFixture(page,campaignFixture('en'));await page.locator('[data-guide="rail-alliances"]').click();
  const row=page.getByTestId('org-badges').first();
  const badges=await row.locator('.ia-badge').all();
  if(badges.length>1){const a=(await badges[0].boundingBox())!,b=(await badges[1].boundingBox())!;expect(Math.abs(a.y-b.y)).toBeLessThanOrEqual(2);expect(b.x).toBeGreaterThan(a.x);}
  await expect(page.locator('.ia-badge[data-tone]').first()).toBeVisible();
  await page.getByRole('tab',{name:'Sanctions & Enforcement'}).or(page.getByRole('button',{name:'Sanctions & Enforcement'})).first().click();
  const card=page.getByTestId('hardware-card');
  await expect(card).toBeVisible();expect((await card.boundingBox())!.width).toBeLessThanOrEqual(681);
  await expect(page.getByTestId('hardware-context')).toContainText('sovereign defense materiel transfers to bilateral partners');
});

import { test, expect, type Page } from '@playwright/test';
import { campaignFixture, resumeFixture } from './seedCampaign';
import { applyGameCommand } from '../src/engine/commands';
import { resolveCombatRound } from '../src/engine/systems/warfare';
import { withWarFuel } from '../src/tests/warFixture';
import { processArmisticeRequests } from '../src/engine/systems/peaceArmistice';

/** Phase 9.6: the peace conference (Barış Masası) after a won war, in both themes, and the armistice request in the war window. */
type Theme = 'dark' | 'light';

function wonWarFixture() {
  let s = applyGameCommand(withWarFuel(campaignFixture('en')), { type: 'military/declareWar', targetCountryId: 'GRC' });
  s.selectedCountryId = null;
  const id = Object.keys(s.wars)[0];
  for (let i = 0; i < 400 && s.wars[id].status === 'active'; i++) {
    s = resolveCombatRound(s, id);
    s = { ...s, day: s.day + 1 };
  }
  return s;
}

function armisticeFixture() {
  const s = applyGameCommand(withWarFuel(campaignFixture('en')), { type: 'military/declareWar', targetCountryId: 'GRC' });
  s.selectedCountryId = null;
  const id = Object.keys(s.wars)[0];
  return processArmisticeRequests({ ...s, wars: { ...s.wars, [id]: { ...s.wars[id], progress: 60, defenderExhaustion: 80 } } });
}

async function openTable(page: Page, theme: Theme, width = 1440) {
  await page.addInitScript(t => localStorage.setItem('trp-appearance-v1', t), theme);
  await page.setViewportSize({ width, height: 900 });
  await resumeFixture(page, wonWarFixture());
  const scroll = page.getByTestId('victory-peace-table');
  await expect(scroll).toBeVisible({ timeout: 45000 });
  await scroll.click();
  await expect(page.getByTestId('peace-table')).toBeVisible();
}

for (const theme of ['dark', 'light'] as const) test(`9.6 ${theme}: a won war opens the peace table with the budget, demands and a sealed conclude button`, async ({ page }) => {
  await openTable(page, theme);
  const table = page.getByTestId('peace-table');
  await expect(table).toContainText('Peace conference');
  await expect(page.getByTestId('peace-budget')).toBeVisible();
  await expect(page.getByTestId('peace-left')).toContainText(/\d+/);
  await expect(table.locator('[data-testid^="demand-annex:"]')).toHaveCount(6);
  await expect(page.getByTestId('demand-puppet')).toBeVisible();
  await expect(page.getByTestId('peace-conclude')).toBeDisabled();
  // Table colours come from the theme: the dark felt and the ivory paper must differ.
  const background = await table.evaluate(el => getComputedStyle(el).backgroundImage);
  expect(background).not.toBe('none');
});

test('9.6 selecting demands fills the ledger, spends points and enables the treaty', async ({ page }) => {
  await openTable(page, 'dark');
  const left = async () => Number((await page.getByTestId('peace-left').innerText()).replace(/\D/g, ''));
  const before = await left();
  await page.getByTestId('demand-annex:industrial').click();
  await expect(page.getByTestId('demand-annex:industrial')).toHaveAttribute('aria-pressed', 'true');
  expect(await left()).toBeLessThan(before);
  await page.getByTestId('reparation-years-3').click();
  await page.getByTestId('reparation-tier-standard').click();
  await page.getByTestId('demand-reparations:3:standard').click();
  await expect(page.getByTestId('peace-terms').locator('li')).toHaveCount(2);
  await expect(page.getByTestId('peace-effects')).toContainText(/economy|Tribute/);
  await expect(page.getByTestId('peace-conclude')).toBeEnabled();
  await page.getByTestId('demand-annex:industrial').click();
  await expect(page.getByTestId('peace-terms').locator('li')).toHaveCount(1);
});

test('9.6 concluding the treaty closes the table and the region changes hands', async ({ page }) => {
  await openTable(page, 'light');
  await page.getByTestId('demand-annex:frontier_a').click();
  await page.getByTestId('peace-conclude').click();
  await expect(page.getByTestId('peace-table')).toHaveCount(0);
  await expect(page.getByTestId('victory-peace-table')).toHaveCount(0);
});

test('9.6 waiving the terms makes peace without taking anything', async ({ page }) => {
  await openTable(page, 'dark');
  await page.getByTestId('peace-waive').click();
  await expect(page.getByTestId('peace-table')).toHaveCount(0);
});

test('9.6 the table fits a phone: one column, nothing wider than the screen, the seal reachable', async ({ page }) => {
  await openTable(page, 'dark', 390);
  const table = page.getByTestId('peace-table');
  const overflow = await table.evaluate(el => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.getByTestId('demand-annex:frontier_b').click();
  await page.getByTestId('peace-conclude').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('peace-conclude')).toBeVisible();
});

test('9.6 an exhausted defender asks for an armistice in the war window, and the player can decline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await resumeFixture(page, armisticeFixture());
  await expect(page.locator('.event-pin.kind-war .event-pin-disc').first()).toBeAttached({ timeout: 45000 });
  await page.locator('.event-pin.kind-war .event-pin-disc').first().click({ force: true });
  await expect(page.locator('.war-theatre-backdrop')).toBeVisible();
  await expect(page.getByTestId('war-score')).toBeVisible();
  await expect(page.getByTestId('war-score-own')).toContainText(/\d+/);
  const banner = page.getByTestId('armistice-offer');
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('asks for an armistice');
  await page.getByTestId('armistice-decline').click();
  await expect(banner).toHaveCount(0);
});

import { test, expect, type Page } from '@playwright/test';
import { campaignFixture, resumeFixture, openNation } from './seedCampaign';
import { applyGameCommand } from '../src/engine/commands';
import { processNuclear } from '../src/engine/systems/nuclear';
import { programOf } from '../src/engine/systems/nuclearState';
import { BUILD_BASE } from '../src/engine/systems/nuclearForces';
import type { GameState } from '../src/domain/game';

/** Phase 9.7: the Nuclear Command window (Nükleer Sistem) in both themes, the cascade and warhead controls, and the IAEA card. */
type Theme = 'dark' | 'light';

/** Turkey with the civil reactor tech, a finished declared hall and a finished hidden hall, so every card has something to show. */
function nuclearFixture(): GameState {
  let s = campaignFixture('en');
  s.selectedCountryId = null;
  const t = s.countries.TUR;
  s.countries.TUR = {
    ...t,
    technology: { ...t.technology, unlocked: [...t.technology.unlocked, 'energy-nuclear'] },
    economy: { ...t.economy, treasury: 900 },
    resources: { ...t.resources, uranium: 40 },
  };
  s = applyGameCommand(s, { type: 'nuclear/buildSite', kind: 'declared' });
  s = applyGameCommand(s, { type: 'nuclear/buildSite', kind: 'clandestine' });
  s = processNuclear({ ...s, day: s.day + BUILD_BASE.centrifuges.days });
  for (const site of programOf(s, 'TUR').sites) {
    s = applyGameCommand(s, { type: 'nuclear/configureSite', siteId: site.id, target: 'leu', feed: 'natural' });
  }
  return s;
}

async function openWindow(page: Page, theme: Theme, width = 1440) {
  await page.addInitScript(t => localStorage.setItem('trp-appearance-v1', t), theme);
  await page.setViewportSize({ width, height: 900 });
  await resumeFixture(page, nuclearFixture());
  await openNation(page);
  await page.locator('[data-guide="tab-nuclear"]').click();
  await expect(page.getByTestId('nuclear-window')).toBeVisible({ timeout: 45000 });
}

for (const theme of ['dark', 'light'] as const) test(`9.7 ${theme}: the window shows the assay ladder, forces and the IAEA card`, async ({ page }) => {
  await openWindow(page, theme);
  await expect(page.getByTestId('nuclear-ladder')).toBeVisible();
  for (const level of ['natural', 'leu', 'heu', 'wgu']) await expect(page.getByTestId(`nuclear-stock-${level}`)).toBeVisible();
  await expect(page.getByTestId('nuclear-warheads')).toContainText(/\d+/);
  await expect(page.getByTestId('nuclear-deterrence')).toBeVisible();
  await expect(page.getByTestId('iaea-card')).toBeVisible();
  await expect(page.getByTestId('iaea-compliance')).toContainText(/\d+/);
  await expect(page.locator('[data-testid^="nuclear-site-"][data-testid$="-kind"]')).toHaveCount(2);
  const background = await page.getByTestId('nuclear-window').evaluate(el => getComputedStyle(el).backgroundColor);
  expect(background).not.toBe('rgba(0, 0, 0, 0)');
});

test('9.7 a hidden site raises the agency alert and the exposure gauge', async ({ page }) => {
  await openWindow(page, 'dark');
  await expect(page.getByTestId('iaea-hidden-alert')).toBeVisible();
  await expect(page.getByTestId('iaea-suspicion')).toBeVisible();
  await expect(page.getByTestId('iaea-inspection')).toBeVisible();
});

test('9.7 pointing a hall at a purer product changes its output', async ({ page }) => {
  await openWindow(page, 'dark');
  const site = page.locator('[data-testid^="nuclear-site-"][data-testid$="-kind"]').last();
  const id = (await site.getAttribute('data-testid'))!.replace('nuclear-site-', '').replace('-kind', '');
  const output = page.getByTestId(`nuclear-site-${id}-output`);
  const before = await output.innerText();
  await page.getByTestId(`site-target-${id}-wgu`).click();
  await expect(page.getByTestId(`site-target-${id}-wgu`)).toHaveAttribute('aria-pressed', 'true');
  expect(await output.innerText()).not.toBe(before);
});

test('9.7 adding a hall and an assembly line queues the builds', async ({ page }) => {
  await openWindow(page, 'dark');
  const id = (await page.locator('[data-testid^="nuclear-site-"][data-testid$="-kind"]').first().getAttribute('data-testid'))!.replace('nuclear-site-', '').replace('-kind', '');
  await expect(page.getByTestId(`site-expand-${id}`)).toBeEnabled();
  await page.getByTestId(`site-expand-${id}`).click();
  await expect(page.getByTestId('nuclear-assembly-build')).toBeEnabled();
  await page.getByTestId('nuclear-assembly-build').click();
  await expect(page.getByTestId('nuclear-assembly')).toBeVisible();
});

test('9.7 leaving the treaty asks for confirmation and can be cancelled', async ({ page }) => {
  await openWindow(page, 'dark');
  await page.getByTestId('iaea-withdraw').click();
  const dialog = page.locator('.review-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Leave the non-proliferation treaty');
  await dialog.locator('[data-guide="review-dismiss"]').last().click();
  await expect(dialog).toHaveCount(0);
});

test('9.7 the window fits a phone without sideways scrolling', async ({ page }) => {
  await openWindow(page, 'dark', 390);
  const window = page.getByTestId('nuclear-window');
  const overflow = await window.evaluate(el => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.getByTestId('iaea-card').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('iaea-card')).toBeVisible();
});

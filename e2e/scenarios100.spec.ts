import { test, expect, type Page } from '@playwright/test';
import { makeInitialState } from '../src/data/initialState';
import { chooseLanguage, landingReady } from './helpers/enterAsGuest';

/** Phase 10.0: the Historical scenarios window, the three opening situations and the adaptive ambience readout. */
type Theme = 'dark' | 'light';
const ids = ['modern-2026', 'resource-crisis', 'regional-conflicts'] as const;
type Id = typeof ids[number];

async function openPicker(page: Page, theme: Theme = 'dark', width = 1280) {
  await page.addInitScript(t => localStorage.setItem('trp-appearance-v1', t), theme);
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/');
  await landingReady(page);
  await page.getByTestId('landing-scenarios').click();
  await expect(page.getByTestId('scenario-picker')).toBeVisible();
}

/** Picks a scenario (and a nation), walks the setup wizard and lands in the game. */
async function startScenario(page: Page, id: Id, nation?: string) {
  await openPicker(page);
  await page.getByTestId(`scenario-${id}`).click();
  if (nation) await page.getByTestId(`scenario-nation-${nation}`).click();
  await page.getByTestId('scenario-begin').click();
  await expect(page.locator('.campaign-wizard')).toBeVisible();
  await expect(page.getByTestId('wizard-scenario')).toHaveAttribute('data-scenario', id);
  await page.locator('.wizard-name-field input').fill('Scenario tester');
  for (let i = 0; i < 4; i++) await page.locator('.wizard-next').click();
  await page.locator('.guided-card footer button').first().click();
  await expect(page.locator('.leader-avatar-button')).toBeVisible({ timeout: 45000 });
}

/** Saves from the Options window and reads the newest save straight out of IndexedDB. */
async function savedState(page: Page) {
  await page.locator('.leader-avatar-button').click();
  await page.locator('.profile-tabs button').last().click();
  await page.getByRole('button', { name: /SAVE CAMPAIGN/ }).click();
  await expect(page.locator('.campaign-save-status')).toContainText('Saved Day');
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('alpyx-global-command'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const rows = await new Promise<any[]>((resolve, reject) => { const r = db.transaction('saves').objectStore('saves').getAll(); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    db.close();
    return rows.sort((a, b) => b.updatedAt - a.updatedAt)[0].state;
  });
}

for (const theme of ['dark', 'light'] as const) test(`10.0 ${theme}: the window lists three scenarios and the detail follows the choice`, async ({ page }) => {
  await openPicker(page, theme);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  for (const id of ids) await expect(page.getByTestId(`scenario-${id}`)).toBeVisible();
  await expect(page.getByTestId('scenario-modern-2026')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('scenario-detail')).toHaveAttribute('data-scenario', 'modern-2026');
  await page.getByTestId('scenario-regional-conflicts').click();
  await expect(page.getByTestId('scenario-regional-conflicts')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('scenario-detail')).toHaveAttribute('data-scenario', 'regional-conflicts');
  await expect(page.getByTestId('scenario-detail')).toContainText('Active war in Eastern Europe');
  // Each level carries a shape as well as a word.
  await expect(page.getByTestId('scenario-level-regional-conflicts')).toContainText('◆');
  await expect(page.getByTestId('scenario-level-modern-2026')).toContainText('●');
  await expect(page.getByTestId('landing-scenarios')).not.toContainText('Coming soon');
  await page.getByTestId('scenario-nation-POL').click();
  await expect(page.getByTestId('scenario-nation-POL')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('scenario-nation-any')).toHaveAttribute('aria-pressed', 'false');
  await page.getByTestId('scenario-close').click();
  await expect(page.getByTestId('scenario-picker')).toHaveCount(0);
});

test('10.0 Escape closes the window and a plain new campaign carries no scenario', async ({ page }) => {
  await openPicker(page);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('scenario-picker')).toHaveCount(0);
  await page.getByTestId('landing-new-campaign').click();
  await expect(page.locator('.campaign-wizard')).toBeVisible();
  await expect(page.getByTestId('wizard-scenario')).toHaveCount(0);
});

test('10.0 Modern World 2026 starts the shipped world with the scenario recorded', async ({ page }) => {
  await startScenario(page, 'modern-2026');
  const s = await savedState(page);
  expect(s.world.scenario).toEqual({ id: 'modern-2026', startedDay: 1 });
  expect(s.simulationSeed).toBe(0xA17E5EED);
  expect(Object.values(s.wars).filter((w: any) => w.status === 'active')).toHaveLength(0);
});

test('10.0 Global Resource Crisis starts short of fuel and food with high inflation, for the chosen nation', async ({ page }) => {
  await startScenario(page, 'resource-crisis', 'EGY');
  const s = await savedState(page);
  const base = makeInitialState().countries.EGY;
  expect(s.playerCountryId).toBe('EGY');
  expect(s.world.scenario.id).toBe('resource-crisis');
  expect(s.countries.EGY.economy.inflation).toBeGreaterThan(base.economy.inflation + 5);
  expect(s.countries.EGY.resources.oil).toBeLessThan(base.resources.oil * 0.6);
  expect(s.countries.EGY.resources.food).toBeLessThan(base.resources.food * 0.65);
  expect(s.world.commodities.shocks.map((x: any) => x.good).sort()).toEqual(['food', 'fuel', 'oil', 'uranium']);
});

test('10.0 Regional Conflicts starts with wars burning and the Taiwan Strait hostile', async ({ page }) => {
  await startScenario(page, 'regional-conflicts', 'UKR');
  const s = await savedState(page);
  expect(s.playerCountryId).toBe('UKR');
  const wars = Object.values(s.wars).filter((w: any) => w.status === 'active').map((w: any) => `${w.attackerId}>${w.defenderId}`);
  expect(wars).toContain('RUS>UKR');
  expect(s.countries.CHN.diplomacy.relations.TWN.status).toBe('hostile');
  expect(s.world.scenario.id).toBe('regional-conflicts');
});

test('10.0 sound options stay clean without adaptive ambience drone', async ({ page }) => {
  await startScenario(page, 'regional-conflicts', 'UKR');
  await page.locator('.leader-avatar-button').click();
  await page.locator('.profile-tabs button').filter({ hasText: /Sound/ }).click();
  await expect(page.getByTestId('audio-options')).toBeVisible();
  await expect(page.getByTestId('audio-adaptive')).toHaveCount(0);
  await expect(page.getByTestId('audio-mood')).toHaveCount(0);
});

test('10.0 the window fits a phone and its buttons can be tapped', async ({ page }) => {
  await openPicker(page, 'dark', 390);
  const modal = page.getByTestId('scenario-picker');
  expect(await modal.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  for (const id of ids) expect((await page.getByTestId(`scenario-${id}`).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page.getByTestId('scenario-begin').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('scenario-begin')).toBeVisible();
  expect((await page.getByTestId('scenario-begin').boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

for (const language of ['tr', 'es', 'zh', 'ru'] as const) test(`10.0 ${language}: the window is translated`, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await landingReady(page);
  await chooseLanguage(page, language);
  await page.getByTestId('landing-scenarios').click();
  await expect(page.getByTestId('scenario-picker')).toBeVisible();
  for (const id of ids) {
    const text = await page.getByTestId(`scenario-${id}`).innerText();
    expect(text).not.toMatch(/Global Resource Crisis|Regional Conflicts|Modern World 2026/);
  }
  await expect(page.getByTestId('scenario-begin')).not.toHaveText('Begin scenario');
});

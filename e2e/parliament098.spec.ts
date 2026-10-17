import { test, expect, type Page } from '@playwright/test';
import { campaignFixture, resumeFixture, openNation } from './seedCampaign';
import { processParliament, recordOf } from '../src/engine/systems/parliament';
import { factionsFor } from '../src/engine/systems/factions';
import { FACTION_KEYS, type FactionKey } from '../src/domain/politics';
import type { GameState } from '../src/domain/game';

/** Phase 9.8: the Parliament window (Meclis) in both themes: the hemicycle, the blocs and the strike panel with its talks dialog. */
type Theme = 'dark' | 'light';

/** Turkey with a seated chamber and a healthy cabinet. */
function chamberFixture(): GameState {
  const s = campaignFixture('en');
  s.selectedCountryId = null;
  return processParliament(s);
}

/** The cabinet is the premier's bloc alone, every other bloc is willing to join, and the unions are about to strike. */
function troubledFixture(): GameState {
  let s = chamberFixture();
  const lead = recordOf(s, 'TUR')!.coalition[0];
  const c = s.countries.TUR, f = factionsFor(c);
  const satisfaction = Object.fromEntries(FACTION_KEYS.map(k => [k, k === lead ? f.satisfaction[k] : 60])) as Record<FactionKey, number>;
  s = {
    ...s,
    countries: { ...s.countries, TUR: { ...c, economy: { ...c.economy, treasury: 600 }, politics: { ...c.politics, factions: { ...f, satisfaction } } } },
    world: {
      ...s.world,
      parliament: { countries: { ...s.world.parliament!.countries, TUR: { ...recordOf(s, 'TUR')!, coalition: [lead], support: {}, unrest: 74, strike: { ...recordOf(s, 'TUR')!.strike, level: 'sectoral', disorder: 30, startedDay: 1 } } } },
    },
  };
  return s;
}

async function openWindow(page: Page, theme: Theme, state: GameState, width = 1440) {
  await page.addInitScript(t => localStorage.setItem('trp-appearance-v1', t), theme);
  await page.setViewportSize({ width, height: 900 });
  await resumeFixture(page, state);
  await openNation(page);
  await page.locator('[data-guide="tab-parliament"]').click();
  await expect(page.getByTestId('parliament-window')).toBeVisible({ timeout: 45000 });
}

for (const theme of ['dark', 'light'] as const) test(`9.8 ${theme}: the window shows the hemicycle, five blocs and the strike card`, async ({ page }) => {
  await openWindow(page, theme, chamberFixture());
  await expect(page.getByTestId('hemicycle')).toBeVisible();
  await expect(page.locator('[data-testid="hemicycle"] .seat')).toHaveCount(200);
  await expect(page.locator('[data-testid^="bloc-card-"]')).toHaveCount(5);
  await expect(page.getByTestId('parliament-reliable')).toContainText(/\d+ \/ 101/);
  await expect(page.getByTestId('parliament-mandate')).toHaveAttribute('data-ok', 'true');
  await expect(page.getByTestId('strike-card')).toBeVisible();
  await expect(page.getByTestId('strike-risk')).toContainText('Calm');
  const seat = await page.locator('[data-testid="hemicycle"] .seat.is-cabinet').first().evaluate(el => getComputedStyle(el).fill);
  expect(seat).not.toBe('none');
});

test('9.8 the seats on the chart add up to the numbers in the legend', async ({ page }) => {
  await openWindow(page, 'dark', chamberFixture());
  let total = 0;
  for (const key of FACTION_KEYS) {
    const legend = Number(await page.getByTestId(`bloc-seats-${key}`).innerText());
    await expect(page.locator(`[data-testid="hemicycle"] .seat[data-bloc="${key}"]`)).toHaveCount(legend);
    total += legend;
  }
  expect(total).toBe(200);
});

test('9.8 a cabinet without a majority blocks war and tax reform, and inviting a bloc restores the mandate', async ({ page }) => {
  await openWindow(page, 'dark', troubledFixture());
  await expect(page.getByTestId('parliament-mandate')).toHaveAttribute('data-ok', 'false');
  await expect(page.getByTestId('parliament-mandate')).toContainText('blocked');
  const invites = page.locator('[data-testid^="bloc-invite-"]:enabled');
  await expect(invites.first()).toBeVisible();
  await invites.first().click();
  await page.locator('[data-testid^="bloc-invite-"]:enabled').first().click();
  await expect(page.locator('[data-testid^="bloc-card-"][data-cabinet="true"]')).toHaveCount(3);
  await expect(page.getByTestId('parliament-mandate')).toHaveAttribute('data-ok', 'true');
});

test('9.8 the strike card names the causes and the talks dialog lowers the grievance', async ({ page }) => {
  await openWindow(page, 'dark', troubledFixture());
  await expect(page.getByTestId('strike-card')).toHaveAttribute('data-level', 'sectoral');
  await expect(page.getByTestId('strike-effect-output')).toHaveText('75%');
  await expect(page.getByTestId('strike-effect-tax')).toHaveText('10%');
  const before = Number(await page.getByTestId('strike-unrest').innerText());
  await page.getByTestId('strike-open-talks').click();
  const dialog = page.getByTestId('talks-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-testid^="talks-option-"]')).toHaveCount(4);
  await page.getByTestId('talks-option-shorterHours').click();
  await expect(page.getByTestId('talks-option-shorterHours')).toHaveAttribute('aria-checked', 'true');
  await page.locator('[data-guide="review-confirm"]').click();
  await expect(dialog).toHaveCount(0);
  const after = Number(await page.getByTestId('strike-unrest').innerText());
  expect(after).toBeLessThan(before);
});

test('9.8 the snap election asks for confirmation and can be cancelled', async ({ page }) => {
  await openWindow(page, 'dark', chamberFixture());
  const snap = page.getByTestId('parliament-snap');
  await expect(snap).toBeEnabled();
  await snap.click();
  const dialog = page.locator('.review-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Call a snap election');
  await dialog.locator('[data-guide="review-dismiss"]').last().click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('parliament-election')).toContainText(/Next election in \d{3,4} days/);
});

test('9.8 the window fits a phone without sideways scrolling', async ({ page }) => {
  await openWindow(page, 'dark', troubledFixture(), 390);
  const window = page.getByTestId('parliament-window');
  expect((await window.evaluate(el => el.scrollWidth - el.clientWidth))).toBeLessThanOrEqual(1);
  await page.getByTestId('strike-card').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('strike-open-talks')).toBeVisible();
});

import { test, expect, type Page, type Route } from '@playwright/test';
import { campaignFixture, resumeFixture } from './seedCampaign';
import { continueCampaign } from './helpers/enterAsGuest';

/** Phase 9.9: the simulation-thread readout and the cloud save panel in Options, against a fake Supabase (PostgREST) project. */
const PROJECT = 'https://ron-test.supabase.co';
const KEY = 'anon-test-key-at-least-20-chars';
type Row = Record<string, unknown> & { campaign_id: string; revision: number };

/** A tiny in-memory ron_cloud_saves table behind page.route; the real network is never touched. */
async function fakeSupabase(page: Page) {
  const rows: Row[] = [];
  const log: string[] = [];
  const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) });
  await page.route(`${PROJECT}/rest/v1/**`, async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    log.push(`${method} ${url.search}`);
    if (method === 'OPTIONS') return json(route, 204, null);
    const id = url.searchParams.get('campaign_id')?.replace('eq.', ''), rev = url.searchParams.get('revision')?.replace('eq.', '');
    if (method === 'GET') {
      const hit = rows.filter(r => !id || r.campaign_id === decodeURIComponent(id));
      return json(route, 200, hit);
    }
    if (method === 'POST') { const row = request.postDataJSON() as Row; if (rows.some(r => r.campaign_id === row.campaign_id)) return json(route, 409, {}); rows.push(row); return json(route, 201, [row]); }
    if (method === 'PATCH') {
      const at = rows.findIndex(r => r.campaign_id === decodeURIComponent(id ?? '') && String(r.revision) === rev);
      if (at < 0) return json(route, 200, []);
      rows[at] = request.postDataJSON() as Row; return json(route, 200, [rows[at]]);
    }
    if (method === 'DELETE') { const keep = rows.filter(r => r.campaign_id !== decodeURIComponent(id ?? '')); const gone = rows.length - keep.length; rows.length = 0; rows.push(...keep); return json(route, 200, Array(gone).fill({})); }
    return json(route, 405, {});
  });
  return { rows, log };
}

async function openSettings(page: Page) {
  await page.locator('.leader-avatar-button').click();
  await page.locator('.profile-tabs button').filter({ hasText: 'Settings' }).click();
}

async function openSettingsWith(page: Page, width = 1280) {
  await page.setViewportSize({ width, height: 900 });
  await resumeFixture(page, campaignFixture('en'));
  await openSettings(page);
}

test('9.9 the simulation readout names where the days are computed and the mode choice sticks', async ({ page }) => {
  await openSettingsWith(page);
  const options = page.getByTestId('sim-options');
  await expect(options).toBeVisible();
  await expect(page.getByTestId('sim-status')).toHaveAttribute('data-mode', /^(worker|main|auto)$/);
  await expect(page.getByTestId('sim-mode-auto')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('sim-mode-main').click();
  await expect(page.getByTestId('sim-mode-main')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('sim-mode-auto')).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => localStorage.getItem('ron-sim-mode-v1'))).toBe('main');
  await page.reload();
  await continueCampaign(page);
  await openSettings(page);
  await expect(page.getByTestId('sim-mode-main')).toHaveAttribute('aria-pressed', 'true');
});

test('9.9 days are computed off the page at the fastest speed and the readout counts them', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await resumeFixture(page, campaignFixture('en'));
  await page.locator('.speed-segment button').last().click();
  await page.waitForTimeout(3000);
  await openSettings(page);
  const state = await page.getByTestId('sim-status').getAttribute('data-state');
  expect(['worker', 'main-host', 'fallback', 'starting']).toContain(state);
  await expect(page.getByTestId('sim-metrics')).toBeVisible();
  if (state !== 'starting') expect(Number(await page.getByTestId('sim-metric-days').innerText())).toBeGreaterThan(0);
  expect(['smooth', 'busy', 'stalled', 'measuring']).toContain(await page.getByTestId('sim-health').getAttribute('data-health'));
});

test('9.9 the metrics fit a phone and the mode switch stays reachable', async ({ page }) => {
  await openSettingsWith(page, 390);
  const box = page.getByTestId('sim-options');
  await box.scrollIntoViewIfNeeded();
  expect(await page.locator('.player-options-modal').evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  for (const mode of ['auto', 'worker', 'main']) await expect(page.getByTestId(`sim-mode-${mode}`)).toBeVisible();
  const height = await page.getByTestId('sim-mode-main').evaluate(el => el.getBoundingClientRect().height);
  expect(height).toBeGreaterThanOrEqual(40);
});

test('9.9 cloud saves start unconfigured and refuse an address that is not https', async ({ page }) => {
  await openSettingsWith(page);
  await expect(page.getByTestId('cloud-options')).toBeVisible();
  await expect(page.getByTestId('cloud-status')).toHaveAttribute('data-phase', 'unconfigured');
  await page.getByTestId('cloud-url').fill('http://example.com');
  await page.getByTestId('cloud-key').fill('anon-key');
  await page.getByTestId('cloud-connect').click();
  await expect(page.getByTestId('cloud-status')).toHaveAttribute('data-phase', 'unconfigured');
  expect(await page.evaluate(() => localStorage.getItem('ron-cloud-config-v1'))).toBeNull();
});

test('9.9 a campaign uploads, shows as in step, and the project key never leaves the browser in the page', async ({ page }) => {
  const cloud = await fakeSupabase(page);
  await openSettingsWith(page);
  await page.getByTestId('cloud-url').fill(PROJECT);
  await page.getByTestId('cloud-key').fill(KEY);
  await page.getByTestId('cloud-connect').click();
  await expect(page.getByTestId('cloud-status')).toHaveAttribute('data-phase', 'no-key');
  await page.getByTestId('cloud-enable').click();
  const row = page.locator('[data-testid^="cloud-row-"]').first();
  await expect(row).toHaveAttribute('data-status', 'local-only', { timeout: 15000 });
  await row.locator('[data-testid^="cloud-push-"]').click();
  await expect(row).toHaveAttribute('data-status', 'synced', { timeout: 15000 });
  await expect(page.getByTestId('cloud-message')).toContainText('Uploaded as revision 1');
  expect(cloud.rows).toHaveLength(1);
  // The row is addressed by a hash of the sync key, never by the key itself.
  const key = await page.evaluate(() => JSON.parse(localStorage.getItem('ron-guest-profile-v1') ?? '{}').syncKey as string);
  expect(key.length).toBe(43);
  expect(JSON.stringify(cloud.rows)).not.toContain(key);
  expect(cloud.log.join('\n')).not.toContain(key);
});

test('9.9 an encrypted upload carries no readable save and the row has to be unlocked with the passphrase', async ({ page }) => {
  const cloud = await fakeSupabase(page);
  await openSettingsWith(page);
  await page.getByTestId('cloud-url').fill(PROJECT);
  await page.getByTestId('cloud-key').fill(KEY);
  await page.getByTestId('cloud-connect').click();
  await page.getByTestId('cloud-enable').click();
  await page.getByTestId('cloud-passphrase').fill('correct horse battery');
  const row = page.locator('[data-testid^="cloud-row-"]').first();
  await row.locator('[data-testid^="cloud-push-"]').click();
  await expect(row).toHaveAttribute('data-status', 'synced', { timeout: 20000 });
  const envelope = cloud.rows[0].envelope as { encoding: { cipher: string }; payload: string };
  expect(envelope.encoding.cipher).toBe('aes-gcm');
  expect(atob(envelope.payload.replace(/-/g, '+').replace(/_/g, '/'))).not.toContain('Turkey');
});

test('9.9 a remote copy that moved on is offered for download, and a lost connection says so', async ({ page }) => {
  const cloud = await fakeSupabase(page);
  await openSettingsWith(page);
  await page.getByTestId('cloud-url').fill(PROJECT);
  await page.getByTestId('cloud-key').fill(KEY);
  await page.getByTestId('cloud-connect').click();
  await page.getByTestId('cloud-enable').click();
  const row = page.locator('[data-testid^="cloud-row-"]').first();
  await row.locator('[data-testid^="cloud-push-"]').click();
  await expect(row).toHaveAttribute('data-status', 'synced', { timeout: 15000 });
  // Another device uploaded a newer revision.
  cloud.rows[0] = { ...cloud.rows[0], revision: 2, day: Number(cloud.rows[0].day) + 40 };
  await page.getByTestId('cloud-refresh').click();
  await expect(row).toHaveAttribute('data-status', /cloud-ahead|conflict/, { timeout: 15000 });
  await page.unroute(`${PROJECT}/rest/v1/**`);
  await page.route(`${PROJECT}/rest/v1/**`, route => route.abort('internetdisconnected'));
  await page.getByTestId('cloud-refresh').click();
  await expect(page.getByTestId('cloud-status')).toHaveAttribute('data-phase', /offline|error/, { timeout: 25000 });
});

test('9.9 a transfer code moves the profile to another device and a wrong passphrase is refused', async ({ page }) => {
  await openSettingsWith(page);
  await page.getByTestId('cloud-url').fill(PROJECT);
  await page.getByTestId('cloud-key').fill(KEY);
  await page.getByTestId('cloud-connect').click();
  await page.getByTestId('cloud-enable').click();
  await page.getByTestId('cloud-code-pass').fill('open sesame');
  await page.getByTestId('cloud-code-create').click();
  const code = await page.getByTestId('cloud-code-output').inputValue();
  expect(code.startsWith('RON-SYNC-1E:')).toBe(true);
  await page.getByTestId('cloud-join-input').fill(code);
  await page.getByTestId('cloud-join-pass').fill('wrong words');
  await page.getByTestId('cloud-join').click();
  await expect(page.getByTestId('cloud-join-error')).toBeVisible();
  await page.getByTestId('cloud-join-pass').fill('open sesame');
  await page.getByTestId('cloud-join').click();
  await expect(page.getByTestId('cloud-join-ok')).toBeVisible();
});

for (const theme of ['dark', 'light'] as const) test(`9.9 ${theme}: the panels keep readable text and shape cues on the status badge`, async ({ page }) => {
  await page.addInitScript(t => localStorage.setItem('trp-appearance-v1', t), theme);
  await openSettingsWith(page);
  const contrast = await page.getByTestId('cloud-status').evaluate(el => {
    const rgb = (v: string) => v.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
    const lum = (v: string) => { const [r, g, b] = rgb(v); return .2126 * r + .7152 * g + .0722 * b; };
    const bg = getComputedStyle(el.closest('fieldset')!).backgroundColor;
    const a = lum(getComputedStyle(el).color), b = lum(bg);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  const badge = page.getByTestId('cloud-status').locator('.sys-badge');
  await expect(badge).toHaveAttribute('data-kind', 'plain');
  const border = await badge.evaluate(el => getComputedStyle(el).borderTopStyle);
  expect(border).toBe('solid');
});

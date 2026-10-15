import {expect, test} from '@playwright/test';
import {detMathCorpusHash, probeHash} from '../src/tests/crossEngineProbe';

/**
 * Stage 1b.2: the simulation must produce the same bits in every engine. Node (V8) is the reference; the page runs the
 * same modules in whatever browser Playwright launched. Run it against Chromium and WebKit:
 *   PLAYWRIGHT_DEV_SERVER=1 npx playwright test e2e/crossEngineDeterminism.spec.ts --browser=chromium
 *   PLAYWRIGHT_DEV_SERVER=1 npx playwright test e2e/crossEngineDeterminism.spec.ts --browser=webkit
 * It needs the Vite dev server (source modules), so it is skipped unless PLAYWRIGHT_DEV_SERVER=1.
 */
const DAYS = 60;
test.skip(!process.env.PLAYWRIGHT_DEV_SERVER, 'needs the Vite dev server: set PLAYWRIGHT_DEV_SERVER=1');
test.setTimeout(240_000);

test('detMath returns the same bits in the browser as in Node', async ({page}) => {
  await page.goto('/');
  const [node, browser] = await Promise.all([
    detMathCorpusHash(),
    page.evaluate(async () => (await import('/src/tests/crossEngineProbe.ts')).detMathCorpusHash()),
  ]);
  expect(browser).toBe(node);
});

test(`${DAYS} headless days end in the same state in the browser as in Node`, async ({page}) => {
  await page.goto('/');
  const node = await probeHash(DAYS);
  const browser = await page.evaluate(async days => (await import('/src/tests/crossEngineProbe.ts')).probeHash(days), DAYS);
  expect(browser).toBe(node);
});

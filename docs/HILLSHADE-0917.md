# Phase 6.3 — Tactile hillshade map (0.90.0-playtest.17)

Implementation: **Claude (Sonnet 5.5)**, from the Opus 5.5 handoff of 13 October 2026 (owner: Alper). Base: playtest.16, GitHub `2ce704d`. Branch `dev/ron-living-world-0915`. Save schema 17 and game numbers are unchanged; no file under `src/engine/`, `src/domain/` or `src/persistence/` changed (empty `git diff` for all three). Within `src/map/` only the files Alper approved for this phase changed: `WorldMap.tsx`, `GeographicSurface.tsx`, `surfaceRaster.ts`, `geographic.worker.ts`, plus new files. `mapSelection.ts` and `cameraControls.ts` are untouched, so which country a click selects is decided by the same rules as before.

## What the player sees

The flat map reads as a relief map lying on a desk: a shaded-relief texture under the labels, the map tipped back 18 degrees with a soft shadow along the far edge, and miniature capital pins (a small domed capitol with a round flag). Three settings in the map dock (MAP → Desk tilt, Relief shading, Capital pins) turn each part off; they are remembered in this browser (`localStorage` key `trp-map-desk-v1`) and never enter a save.

The tilt applies only to the flat map on screens wider than 760 px; the globe and phones stay upright. The HUD, hover readout and legends sit outside the SVG and stay flat.

## Hillshade layer

| Item | Value |
|---|---|
| Source | Natural Earth *Gray Earth with Shaded Relief, Hypsography, Ocean Bottom and Drainages* (GRAY_50M_SR_OB, public domain). Supplied by Alper as a zip because the Natural Earth host answered 403 from this session. |
| Build | `scripts/build-hillshade.mjs` (one-off; `sharp` from a global install, not a project dependency): greyscale, resized from 10800 × 5400 to 2048 × 1024, levels black point 40 / white point 230, WebP quality 82. |
| Result | `public/assets/geography/hillshade-2048.webp`, 126 kB (target < 450 kB), credit in `HILLSHADE-ATTRIBUTION.md`, row in `ASSET_MANIFEST.md`. |
| Grey levels (sampled) | flat land about 145–180, lit mountain slopes up to about 215, deep ocean about 64. |

The relief is its own layer, not painted into the Blue Marble raster. `GeographicSurface` gained `src` and `variant` props and one decoded-texture cache keyed by source; the relief instance owns its own worker. `renderSurface` has a `'relief'` mode (luminance only, no globe limb shading, alpha 255 inside the projection, transparent outside), passed through the worker message. The layer sits above the country shapes and below the labels, uses `mix-blend-mode: multiply` at opacity .55 (.35 over the geographic presentation), has `pointer-events: none`, and its own no-op `onReady`, so it never delays the Blue Marble `surfaceReady` flag. Its full-resolution frame is 960 × 560 instead of 1200 × 700; the low-resolution frame is the same as the surface's. The `geographic-frame` event now carries `variant`, and the relief image uses `data-relief-render` so existing selectors for the surface are unaffected.

## Desk tilt and pointer mapping

`getScreenCTM()` is a 2D affine matrix and cannot express CSS perspective, so under the tilt every click would have selected the wrong country. `src/map/deskTilt.ts` (pure) un-projects analytically: `untilt`, its inverse `tilt`, and `toViewBox` for the letterboxing of the 1200 × 700 viewBox. One `toMapPoint` helper in `WorldMap.tsx` replaces `getScreenCTM()` in click selection, drag and the wheel zoom anchor; drag pans by the difference of two un-projected points, so a drag near the far edge moves the map the same visual distance as near the bottom. The tilt state is read through a ref because the native wheel listener is not re-created per render. Hover keeps using the browser's own hit-testing of the `<path>` elements.

Checked: round trip `untilt(tilt(p))` error 5e-13 px over 10 000 random points; the bottom-centre point maps to itself; the top edge of a 1440 × 900 box lands 9.6 px below the top. In the browser, the e2e spec computes the screen pixel of Brazil, Russia (near the top edge) and Australia from the page's own projection and `tilt()`, moves the mouse there and expects that country's hub; the same two clicks with the tilt off use the plain mapping.

## Capital pins

`src/map/capitalPins.ts` (pure) decides which of the 201 capitals to draw; `WorldMap.tsx` renders them in a `pointer-events: none` layer above the relief and below the labels. Rules are those of the handoff: skip annexed and occupied countries, skip microstates (they already have a map marker), skip points outside the screen (12 px margin) or on the far side of the globe; the player's, selected and hovered capitals are always shown; roles from the player's relations (war = enemy, alliance = ally, any other treaty or an embassy = partner); priority player 1000, selected 900, hovered 800, enemy 600, ally 500, partner 400, then population; cut at 48; pins closer than 18 px to a higher-priority pin are dropped; scale 0.8 + 0.15 × zoom, clamped to 0.8–1.4.

Interpretations the handoff left open (please confirm):

1. **Relation pins show at every zoom; only "other" countries wait for zoom ≥ 1.8 (flat) / 1.4 (globe).** Reading "others appear only when zoom ≥ …" as "other" in the role sense. Consequence: the real start gives the player NATO and other treaties, so many ally and partner pins appear at zoom 1 (the 18 px rule thins the European cluster; I did not count them in a browser). If that is too busy, the alternative is to gate every non-player pin by zoom.
2. **Embassies** are not in the relation record, so `capitalPins` takes an optional `embassyPartners` set (from the existing `connectionIndex`).
3. **Population priority** is squashed below the partner tier (`399·m/(m+400)`, m in millions) so a large "other" country can never outrank a partner; the order among "other" countries is still by population.
4. **The player's, selected and hovered pins are never dropped by the 18 px rule** (they are the ones the player is looking at); everything else yields to them.
5. **Selected pin** gets a brighter, thicker ring (pale gold) because the handoff lists no selected colour; the other roles use the handoff colours.
6. **Pins are not counter-rotated under the tilt.** A CSS `rotateX` on an SVG child has no 3D context in Chromium and flattens to a 2D scale, and the foreshortening of a 30 px pin is about 5 %. I did not verify the alternative in a browser (no browser or build was possible here), so this is a design call, not a measured one.
7. **Flag emoji:** like the TopBar and the other panels, the round flag is a regional-indicator emoji. Browsers on Windows without an emoji flag font show two letters inside the ring.

## Translations

`src/i18n/uiCatalog0917.ts` (tr, es, zh, ru), merged after `UI_CATALOG_0916`: "Desk tilt", "Relief shading", "Capital pins", "Applies to the flat map on wide screens" (tooltip of the tilt setting) and "Shaded relief: Natural Earth (public domain)" (shown under the settings while relief is on). "Natural Earth" stays untranslated.

## Existing test changed

`e2e/commandCredit0904.spec.ts` ("every command menu works without click-time module downloads", 1440 and 390): it aborts and counts every `/assets/*.js` request after the campaign loads. The relief layer now starts its worker on load, also in the default political view, which landed inside that window (2 downloads: the worker, then the fallback chunk after the test aborted the worker). The test now first waits for the relief layer. Its intent, that opening a menu never fetches a chunk, is unchanged.

## Tests

- `src/tests/mapDesk0917.test.ts` (33 tests): tilt round trip and hand-checked points, letterboxing at 1440 × 900 and 390 × 844, relief reprojection against the colour mode (unshaded luminance, no limb shading, transparent outside, banded rendering equal to a single pass), settings parsing (defaults, partial, invalid JSON, wrong types), capital pin roles, zoom gating, `maxPins`, the 18 px rule at 17 and 18 px, far side, off-screen margin, annexed and occupied countries, microstates, determinism, scale, no state mutation, and the five-language catalog.
- `e2e/mapDesk0917.spec.ts` (5 scenarios; Turkish 1440 px and English 390 px): 3D transform, relief layer with `pointer-events: none`, pins (player always, "other" only after zooming, never more than 48), exact clicks under the tilt, the same clicks with the tilt off, each setting turning its layer off and persisting after a reload, phone without tilt or overflow, and the upright globe.
- `performance/browser.spec.ts`: new "map relief layer: frame cost with and without the hillshade" (relief off and on, flat and globe, geographic presentation; budget relief full frame ≤ 1.5 × surface full frame).

## Not done in this session

- **Performance numbers.** The measurement is written but the performance specs are not part of CI (`npm run measure:browser`) and the registry was unreachable here, so there is no before/after yet. Relief is on by default as the handoff specifies; if the measured ratio exceeds 1.5 the handoff's rule applies (ship relief off by default rather than lowering the surface quality).
- **Screenshots at 1440 (tr) and 390 (en).** The e2e spec saves `test-results/map-desk-0917-*.png`, but CI artifacts live on blob storage that was blocked; nothing was rendered locally. To be attached after a browser run.
- **Visual judgement of the relief strength** (opacity .55 over the political fills) has not been seen by a person yet.

## Validation

- CI 38387235473 (GitHub-hosted Chromium): Vitest (762 tests / 88 files: 729 earlier + 33; counted from the sources because the log was not readable), TypeScript, production build and all 175 Playwright scenarios passed.
- First run 38385269101: Vitest, TypeScript, build and 173 of 175 scenarios passed. The two failures were `commandCredit0904` at 1440 and 390 (2 unexpected downloads), fixed as described in "Existing test changed". All five new map desk scenarios passed on that first run, including the exact clicks under the tilt.
- Not run locally: the npm registry was unreachable (no `node_modules`), so there was no local Vitest, `vite build` or browser. Before pushing I type-checked the new files with `tsc` against the global tool packages and ran the 33 unit tests under a small compatibility shim; this is not a substitute for CI, whose result is the one recorded above.
- No file under `src/engine/`, `src/domain/` or `src/persistence/` changed (empty `git diff 2ce704d`).

# Open Command — 0.75.0-playtest.1

## What changed

The full-width HUD has been replaced by two floating islands: commander and national indicators at the left, calendar and simulation speed at the right. Slate surfaces, lighter oceans, softer shadows and less vignette give the map room. Active rail tools, national tabs and map choices share amber text and an amber outline. Rails expose `aria-pressed`; hovered tools explain whether they are open or closed. The national panel has an explicit close action. Supporting industry, market, research and profile surfaces follow the same palette. Desktop and compact viewport layouts retain the indicators.

Twenty generated leader faces replace the vector placeholders. Four clothing categories (civilian, army, air force and labour) each contain five distinct fictional faces. Category filters are present in onboarding and the profile picker. Clothing is cosmetic. Existing `avatar-01` through `avatar-20` slots still resolve; saved profiles use their corresponding new artwork. No schema bump or restart is necessary.

Camera input normalizes pixel, line and page wheel deltas. Small trackpad movement is preserved, large individual events are capped, zoom is proportional, and events are coalesced per animation frame. A native non-passive listener owns wheel input only over the SVG. Flat-map zoom anchors to the cursor unless constrained by the map bounds. Pan bounds keep the map reachable, globe drag slows as zoom increases, and camera bounds are 100–1200% flat / 72–600% globe. Persistent zoom sensitivity lives in local device preferences, separate from campaign saves. Buttons provide zoom level, +/- and reset without opening a settings window.

## Player acceptance path

1. Update the development branch, install dependencies, run the app; version is 0.75.0-playtest.1.
2. Open the commander portrait and choose **CHANGE PORTRAIT**. Filter each category, preview a face, cancel or apply. Save/load retains the chosen slot.
3. Open **MARKET**, **MAP**, **DIPLO**, and a national tab. Amber text and outline identify open/selected items. Closing the window clears its rail state. Clicking **Close country panel** restores map space.
4. In **MAP**, move **ZOOM SPEED** between slow, normal and fast; use a mouse wheel and a trackpad. Flat view should hold the point under the cursor during zoom. Drag, zoom to the limits, and reset.
5. Switch Geographic/Political and Globe/Flat. Check readability and that scrolling a window does not zoom the underlying map.
6. Try your usual Mac browser window sizes; report clipping or gestures that feel wrong with viewport and input-device details.

## Verified

- `npm run check`: 32 files, 113 tests, TypeScript and production build.
- Five new camera tests cover device normalization, small deltas, inverse travel, event-count independence, sensitivity, input validation, cursor anchoring and bounds.
- Chromium onboarding: all 20 portrait entries and five entries in each filter; new portrait flows into HUD.
- Actual wheel events, default-prevention, camera buttons, amber selected states and close-state clearing.
- Zoom slider writes local preference; real IndexedDB save/load retains portrait selection.
- Existing profile picker: filter, preview and apply; rendered face stays inside the top HUD.
- HUD separation at 1440x1000, 1280x800, 1024x768 and 390x844; geographic surface renders; no page/console errors.
- Screenshots reviewed and portrait positioning / narrow national-panel overlap corrected before publishing.

Native Mac trackpad feel still needs player acceptance; browser event checks do not simulate every physical device. The pre-existing >500KB main JavaScript bundle warning remains. Headless Linux has no flag emoji font; generated portraits are local images and do not depend on emoji rendering.

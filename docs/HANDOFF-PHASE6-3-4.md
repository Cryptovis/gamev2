# Handoff — Phase 6.3 (tactile hillshade map) and 6.4 (card UI and factory modal)

Prepared by **Claude (Opus 5.5)**, 13 October 2026, for the next implementer (Claude Sonnet). Owner: **Alper**. Read `CLAUDE.md` first; everything there still applies.

## 0. Starting point and ground rules

| Item | Value |
|---|---|
| Repository / branch | `Cryptovis/gamev2`, continue on `dev/ron-living-world-0915` |
| Base | `0.90.0-playtest.16` (Phase 6.2), fast-forwarded into `dev/clear-command-090` |
| Target versions | 6.3 → `0.90.0-playtest.17`, 6.4 → `0.90.0-playtest.18` (one release each; 6.3 first) |
| Save schema | **17, unchanged.** New UI settings go to `localStorage` (pattern: `src/audio/audioSettings.ts`), never into `GameState` |
| Engine | No change in `src/engine/`, `src/domain/`, `src/persistence/`. UI talks to the engine only through typed `GameCommand`s |
| `src/map/` | Alper approved 6.3, which needs presentation-only changes in `src/map/`. Allowed: `WorldMap.tsx`, `GeographicSurface.tsx`, `surfaceRaster.ts`, `geographic.worker.ts`, new files. Not allowed: `mapSelection.ts` rules, `cameraControls.ts` limits, anything that changes which country a click selects (other than fixing the tilt mapping below) |
| i18n | Every new string in en, tr, es, zh, ru. New catalogs `src/i18n/uiCatalog0917.ts` (6.3) and `uiCatalog0918.ts` (6.4), registered in `src/i18n/localeText.tsx` in the loop that already merges `UI_CATALOG_0914/0915/0916` (later catalogs override earlier ones). Templates use `{0}` (see `uiCatalog0916.ts`) |
| Merge gate | Full CI green on the branch (Vitest, `tsc`, build, all Playwright). Merge into `dev/clear-command-090` only with Alper's approval, fast-forward |
| Release records | `docs/RELEASING.md`: version in `package.json` and both root records in `package-lock.json`, CHANGELOG entry, README (title, Current release table, Recent changelog, milestone row), `docs/PLAYTEST-090.md`, `docs/ROADMAP.md`, a phase record (`docs/HILLSHADE-0917.md`, `docs/CARD-UI-0918.md`). Record validation only after it passed |

### Working environment notes (learned in Phase 6.1–6.2)

- The previous sessions could not reach the npm registry (`npm ci` failed: DNS / proxy 403), so nothing could run locally; GitHub Actions CI was the verifier. Try `npm ci` first; if it fails, work the same way.
- CI job logs and artifacts live on Azure blob storage, which may be blocked. **Playwright failures are reported as check-run annotations** (added in playtest.16). Read them with:
  `JID=$(gh api repos/Cryptovis/gamev2/actions/runs/<RUN>/jobs --jq '.jobs[0].id'); gh api repos/Cryptovis/gamev2/check-runs/$JID/annotations --jq '.[]|.path+":"+(.start_line|tostring)+" "+.message'`
  TypeScript errors appear there too.
- `npm run check` = Vitest, then `vite build` (which runs `tsc`). A failure in "Test and build" with exit code 2 usually means `tsc`.
- For a local type check of plain `.ts` files without `node_modules`: `tsc --ignoreConfig --noEmit --strict --skipLibCheck --moduleResolution bundler --module esnext --target es2022 --resolveJsonModule --allowImportingTsExtensions --esModuleInterop <files>` and filter the output to your files. (Without `--ignoreConfig` it silently does nothing; do not add `--types node`.)
- Phone e2e fixtures: `campaignFixture()` starts with the player's country selected; on phones (≤ 760 px) the right information rail is hidden while a country panel is open. Set `s.selectedCountryId=null` when a phone test needs the rail.
- Right-rail icon colours are keyed by `data-guide` in `src/styles.css` (not `nth-child`); keep it that way when adding buttons.

---

## A. Phase 6.3 — Tactile hillshade map (playtest.17)

### A.1 Goal

The flat world map reads as a physical relief map lying on a desk: a hillshade texture under the borders, an 18° desk tilt, and miniature capital pins with round flags. Simulation, selection rules and camera limits are unchanged.

### A.2 How the map works today (read before changing)

- `src/map/WorldMap.tsx` (447 lines) renders one `<svg viewBox="0 0 1200 700" class="strategy-svg">` inside `<div class="world-map political-map">`. Order: `<defs>` (terrain patterns), ocean (`.flat-ocean` or globe sphere), `GeographicSurface` (only when `mapPresentation==='geographic'`), `<g class="map-viewport" transform={flatTransform}>` with `.country-layer` paths, globe shade, `.screen-label-layer` (labels in screen space), `FlightLayer`, `.screen-microstate-layer`.
- Projections: flat = `geoNaturalEarth1().fitExtent([[34,34],[1166,666]])`, zoom/pan applied by `flatTransform`; globe = `geoOrthographic()` with rotation. `projectToScreen(lonLat)` and `flightProjector` already give screen positions (flat includes pan/zoom; globe returns `null` on the far side via `visibleOnGlobe`).
- `src/map/GeographicSurface.tsx` loads one texture (`/assets/geography/blue-marble-surface.svg`, NASA Blue Marble 4096×2048 embedded JPEG), copies it into a worker (`geographic.worker.ts`), which calls `renderSurface()` (`surfaceRaster.ts`) to reproject it into the current view, and returns a WebP blob shown as `<image x=0 y=0 width=1200 height=700>`. It renders a quick low-resolution frame, then a 1200-wide frame after a settle timeout. Main-thread fallback exists. The module keeps a single module-level `texture` cache.
- **Pointer mapping:** `screenPoint()` (click selection), the wheel handler (zoom anchor) and drag use `svg.getScreenCTM()` + `DOMPoint.matrixTransform(inverse)`. `getScreenCTM()` returns a 2D affine matrix and **cannot represent CSS perspective**. With the desk tilt, clicks would select the wrong country unless this is replaced (A.5).
- Map presentation (`'political'|'geographic'`) and mode live in `GameState` (`src/domain/map.ts`) — do not add values there.

### A.3 Settings (new, localStorage)

New file `src/presentation/mapDeskSettings.ts`, modelled on `src/audio/audioSettings.ts`:

```ts
export interface MapDeskSettings { tilt: boolean; relief: boolean; pins: boolean }
export const MAP_DESK_KEY = 'trp-map-desk-v1';
export const DEFAULT_MAP_DESK: MapDeskSettings = { tilt: true, relief: true, pins: true };
export function parseMapDesk(raw: string | null): MapDeskSettings; // tolerant: bad JSON or wrong types → defaults per field
export const useMapDesk = create<MapDeskSettings & { set(patch: Partial<MapDeskSettings>): void }>(...); // try/catch around storage
```

UI: three checkboxes in `src/ui/hud/MapModeBar.tsx` (the map dock, opened by the MAP rail button): "Desk tilt", "Relief shading", "Capital pins".

### A.4 Hillshade texture

**Asset.** Natural Earth *Gray Earth with Shaded Relief, Hypsography, Ocean Bottom and Drainages* (public domain), 1:50m: `https://naciscdn.org/naturalearth/50m/raster/GRAY_50M_SR_OB.zip` (fallback `SR_50M.zip`, the shaded relief only). If the host is blocked in the session, ask Alper to attach the zip or a converted file; do not substitute another source.

**Conversion (one-off, committed result).** Add `scripts/build-hillshade.mjs` (uses `sharp`, which is available globally in these sessions; do not add a dependency to `package.json`): read the GeoTIFF, convert to single-channel grayscale, resize to **2048×1024** (equirectangular, same as Blue Marble's frame), apply a mild level curve (black point 40, white point 230) so flat land sits near mid-grey, write `public/assets/geography/hillshade-2048.webp` (quality 82; target < 450 kB). Add `public/assets/geography/HILLSHADE-ATTRIBUTION.md` (source URL, "Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com", public domain) and a row in `docs/ASSET_MANIFEST.md`.

**Rendering.** Do not paint relief into the Blue Marble raster. Render it as its **own layer** with the same reprojection so it lines up in both presentations:

1. `GeographicSurface.tsx`: add props `src: string` (default the Blue Marble path), `variant: 'surface' | 'relief'` (default `'surface'`), and replace the single module-level cache with a `Map<string, Promise<ImageData>>` keyed by `src`. One worker per instance (the relief instance and the surface instance each own one). Keep the low-res → full-res sequence and the fallback path.
2. `surfaceRaster.ts`: `renderSurface(source, view, w, h, existing?, startRow?, endRow?, mode: 'color' | 'relief' = 'color')`. In `'relief'` mode write the luminance sample to RGB, skip the globe limb shading and keep alpha 255 for every projected pixel (land and ocean: `GRAY_50M_SR_OB` also shades the ocean floor, which reads well under a multiply blend). Pixels outside the projection stay transparent (alpha 0) exactly as today.
3. `geographic.worker.ts`: pass `mode` through the message (`{type:'render', view, id, width, height, mode}`).
4. `WorldMap.tsx`: when `useMapDesk().relief` is on, render `<GeographicSurface variant="relief" src="/assets/geography/hillshade-2048.webp" …/>` **above** `<g class="map-viewport">` and **below** `.screen-label-layer`, wrapped in `<g class="relief-layer" pointer-events="none">`. CSS: `.relief-layer image{mix-blend-mode:multiply;opacity:.55}`; with `mapPresentation==='geographic'` use `opacity:.35` (Blue Marble already carries shading). The image must keep `pointerEvents="none"` so clicks reach country paths.
5. The relief layer must not delay `onReady`/`surfaceReady` (that flag belongs to the Blue Marble surface); give the relief instance its own no-op `onReady`.

**Performance budget.** The relief worker doubles raster work on camera moves. Keep the low-res frame for both; the relief full-res frame may be 960 wide instead of 1200. Measure with the existing `geographic-frame` event (the component dispatches `{duration,width,worker}`); add the relief frames to `performance/browser.spec.ts` "map camera" measurement and record before/after in the phase record. Budget: relief full-res frame ≤ 1.5× the surface frame on GitHub Chromium.

### A.5 Desk tilt (18°)

**CSS** (new `src/ui/styles/mapDesk0917.css`, imported last in `src/main.tsx`):

```css
.world-map{overflow:hidden}
.world-map.desk-tilt{perspective:1600px;perspective-origin:50% 40%}
.world-map.desk-tilt .strategy-svg{transform-origin:50% 100%;transform:rotateX(18deg) scale(1.12);transition:transform 190ms var(--motion-ease,ease-out)}
.world-map.desk-tilt::before{/* soft desk edge shadow at the top */content:"";position:absolute;inset:0 0 auto 0;height:90px;pointer-events:none;background:linear-gradient(#000a,#0000);z-index:1}
@media (max-width:760px){.world-map.desk-tilt .strategy-svg{transform:none}}
@media (prefers-reduced-motion:reduce){.world-map.desk-tilt .strategy-svg{transition:none}}
```

Apply `desk-tilt` to `.world-map` only when **all** hold: setting `tilt` on, `projectionMode==='flat'` (the globe stays upright), viewport wider than 760 px (`matchMedia`, re-evaluated on resize). The HUD (`.map-camera-hud`, hover readout, legends) sits outside the SVG and stays flat.

**Pointer mapping (required).** Add `src/map/deskTilt.ts` (pure, no DOM):

```ts
export const DESK_TILT = { degrees: 18, perspective: 1600, scale: 1.12, originX: 0.5, originY: 1, perspectiveX: 0.5, perspectiveY: 0.4 };
/** Element-local point (px, relative to the untransformed SVG box) for a point on screen (px, relative to the same box). */
export function untilt(X: number, Y: number, boxW: number, boxH: number, t = DESK_TILT): [number, number] {
  const th = t.degrees * Math.PI / 180, c = Math.cos(th), s = Math.sin(th), d = t.perspective;
  const cx = boxW * t.originX, cy = boxH * t.originY, ox = boxW * t.perspectiveX, oy = boxH * t.perspectiveY;
  const v = d * ((Y - oy) - (cy - oy)) / (d * c + (Y - oy) * s);   // scaled offset below the origin, before rotation
  const k = d / (d - v * s);                                        // perspective factor at that depth
  const u = (X - ox) / k + ox - cx;
  return [cx + u / t.scale, cy + v / t.scale];
}
/** Inverse of untilt (for tests and for placing DOM overlays). */
export function tilt(x: number, y: number, boxW: number, boxH: number, t = DESK_TILT): [number, number] {
  const th = t.degrees * Math.PI / 180, d = t.perspective, cx = boxW * t.originX, cy = boxH * t.originY, ox = boxW * t.perspectiveX, oy = boxH * t.perspectiveY;
  const u = (x - cx) * t.scale, v = (y - cy) * t.scale, X1 = cx + u, Y1 = cy + v * Math.cos(th), Z1 = v * Math.sin(th), k = d / (d - Z1);
  return [ox + (X1 - ox) * k, oy + (Y1 - oy) * k];
}
/** SVG viewBox point (1200×700, preserveAspectRatio xMidYMid meet) from element-local pixels. */
export function toViewBox(x: number, y: number, boxW: number, boxH: number): [number, number] {
  const k = Math.min(boxW / 1200, boxH / 700), ox = (boxW - 1200 * k) / 2, oy = (boxH - 700 * k) / 2;
  return [(x - ox) / k, (y - oy) / k];
}
```

The formulas above were verified numerically (10 000 random points, round-trip error < 1e-12 px; with these constants the top edge lands about 10 px below the top of a 1440×900 box). The perspective is set on `.world-map` and the SVG fills it (`inset:0`), so the "box" for both is `.world-map`'s client rect.

In `WorldMap.tsx` add one helper and use it in **all three** places that use `getScreenCTM()` (click selection `screenPoint`, the native wheel handler, and drag if it converts to viewBox units):

```ts
const toMapPoint = (clientX: number, clientY: number): MapPoint => {
  const svg = svgRef.current!, box = svg.parentElement!.getBoundingClientRect();
  if (!deskTiltActive) { const m = svg.getScreenCTM(); if (!m) return [NaN, NaN]; const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse()); return [p.x, p.y]; }
  const [lx, ly] = untilt(clientX - box.left, clientY - box.top, box.width, box.height);
  return toViewBox(lx, ly, box.width, box.height);
};
```

Hover uses native hit-testing on `<path>` elements, which browsers resolve correctly through 3D transforms; it needs no change. Drag panning: when tilted, convert both drag points with `toMapPoint` and pan by their difference (so a drag near the far edge moves the map the same visual distance as near the bottom).

### A.6 Capital pins

Data: `CAPITAL_POSITIONS` (`src/data/capitalPositions.ts`, 201 `[lon,lat]`) and `capitalName()` (`src/data/capitalNames.ts`).

New file `src/map/capitalPins.ts` (pure):

```ts
export interface CapitalPin { id: string; x: number; y: number; scale: number; priority: number; role: 'player' | 'selected' | 'ally' | 'enemy' | 'partner' | 'other' }
export function capitalPins(input: {
  countries: Record<string, CountryState>; playerCountryId: string; selectedCountryId: string | null; hovered: string | null;
  project: (lonLat: [number, number]) => [number, number] | null; // pass WorldMap's flightProjector (handles pan/zoom and the far side of the globe)
  zoom: number; flat: boolean; maxPins?: number; // default 48
}): CapitalPin[];
```

Rules: skip annexed/controlled countries (`annexedBy`, `controllerCountryId`) and microstates already drawn by `MICROSTATE_POINTS`; skip points off screen (outside 0..1200 × 0..700 with a 12 px margin) or on the far side of the globe (`project` returns `null`). Always include the player, the selected and the hovered country. Role from the player's relation (`relationFor(player,id)`): `war` → enemy, alliance treaty → ally, any other treaty or embassy → partner. Others appear only when `zoom ≥ 1.8` (flat) / `≥ 1.4` (globe). Priority: player 1000, selected 900, hovered 800, enemy 600, ally 500, partner 400, then population (millions). Sort by priority, cut at `maxPins`, then drop pins closer than 18 px to a higher-priority pin. `scale = clamp(0.8 + 0.15*zoom, 0.8, 1.4)`.

Rendering in `WorldMap.tsx`: `<g class="capital-pin-layer" pointer-events="none">` **after** `.country-layer`/relief and **before** `.screen-label-layer`, so labels stay on top. Each pin:

```tsx
<g className={`capital-pin role-${pin.role}`} transform={`translate(${pin.x},${pin.y}) scale(${pin.scale})`} data-capital={pin.id}>
  <use href="#capital-building" x={-7} y={-14} width={14} height={14}/>   {/* miniature building sprite */}
  <circle className="capital-flag-ring" cy={-22} r={8}/>
  <text className="capital-flag" y={-18.5} textAnchor="middle">{flagEmoji(iso2)}</text>   {/* round flag: emoji clipped by clipPath circle r=7 */}
</g>
```

Add to `<defs>`: `<symbol id="capital-building" viewBox="0 0 14 14">` — an **original** isometric civic building (dome or columned front, 2–3 flat colours, 1 px dark outline), and `<clipPath id="capital-flag-clip"><circle r="7" cy="-22"/></clipPath>` applied to the flag text. Role colours on `.capital-flag-ring`: player gold `#e7c35a`, ally green `#3fa66b`, enemy red `#d0533e`, partner blue `#5a9fd0`, other ivory `#efe6cf`; 1.5 px stroke. Pins are decorative (`pointer-events:none`): a click on a pin lands on the country polygon underneath, which is the same country, so selection still goes through `selectFromSurface`/the hub. Hover title is not needed.

When the desk tilt is on, pins stand upright: the pin layer is inside the tilted SVG, so counter-rotate each pin with CSS `.desk-tilt .capital-pin{transform-box:fill-box;transform-origin:50% 100%}` and apply `rotateX(-18deg)` only if it renders cleanly in Chromium; otherwise leave them tilted (document the choice with screenshots in the record).

### A.7 Tests for 6.3

Unit (`src/tests/mapDesk0917.test.ts`):
- `untilt(tilt(p)) ≈ p` for random points (error < 1e-6) and two hand-checked points (bottom-centre maps to itself; a top-edge point maps above the box top in local space).
- `toViewBox` with letterboxing (box 1440×900 and 390×844).
- `parseMapDesk`: defaults, partial objects, invalid JSON, wrong types.
- `capitalPins`: player/selected/hovered always present; enemy/ally/partner roles from a constructed state; `maxPins` and the 18 px collision rule; far side of the globe excluded (projector returns `null`); controlled countries excluded; deterministic order.
- Catalog: every `UI_CATALOG_0917` key translates in tr/es/zh/ru (pattern in `src/tests/executiveDesk0916.test.ts`).

Browser (`e2e/mapDesk0917.spec.ts`, tr 1440 and en 390):
- 1440: `.world-map` has `desk-tilt`; computed transform of `.strategy-svg` is a 3D matrix. **Click accuracy:** compute the screen position of a known interior point of a large country (for example Brazil `[-52,-10]`) with the page's own projection through `tilt()` (expose nothing new: evaluate the same math in the test), click it, expect the target-country hub for Brazil. Repeat near the top edge (Russia `[100,62]`) and with tilt off.
- The relief layer exists (`.relief-layer image`), has `pointer-events:none`, and the map still selects countries.
- Capital pins: the player's pin `[data-capital="TUR"]` exists; after zooming in, more pins appear but never more than 48.
- 390: no `desk-tilt` class; no horizontal overflow.
- Turning each setting off in the map dock removes the class/layer and persists after reload.
- Existing map specs must still pass: `clearCommand090` (keyboard selection), `mapConnections0906`, `reliableCommand082` (home zoom `data-zoom` 1.5500), `targetHub0915` (opens the hub from rankings, not the map).

### A.8 i18n keys (6.3)

"Desk tilt", "Relief shading", "Capital pins", "Shaded relief: Natural Earth (public domain)", plus any setting hints you add.

---

## B. Phase 6.4 — Card UI and the factory modal (playtest.18)

### B.1 What exists (and what does not)

- There is **no laws system** in the engine. Do not invent one. The "Policies & Laws" grid is built from two existing, typed, rule-checked mechanics:
  - **Faction concessions** (`src/engine/systems/factions.ts`): five factions `business | labour | security | traditional | liberal` (`FACTION_LABEL`), one concession at a time, `CONCESSION_DAYS = 180`, cost `concessionStatus(country, day).costB` (GDP-scaled), active state `factionsFor(country).concession = { faction, untilDay }`, typed command `{type:'politics/concession', faction}` (currently sent from `src/ui/panels/PoliticsSection.tsx`).
  - **Tax policy**: the existing review lives in `PopulationPanel` with `policyOnly` (class `.tax-policy-panel`); the Policies tab already renders it.
- Policies tab: `CountryPanel.tsx`, `tab==='policies'` block (`.country-policies`, `.policy-heading`, `PopulationPanel policyOnly`, `.policy-budget`).
- Industry: `src/ui/panels/IndustrialPanel.tsx` (37 lines) renders `.facility-grid` of `.facility-card`s from `FACILITIES` (`src/data/industrialCatalog.ts`, `FacilityDefinition {label,cost,days,output?,yield,inputs,power,upkeep,tech?,deposit?,description}`) with state from `state.industrialEconomy[countryId]` (`NationalIndustrialEconomy {facilities, enabled, lastOutput, bottlenecks, projects, deposits, potential}`). Build goes through `ReviewDialog {...investmentReview(state,kind)}` → `state.buildFacility(kind, commandId)` (typed `industry/build`); pause/resume is `state.toggleFacility(kind)` (typed `industry/toggleFacility`). The build button carries `data-guide="learn-build"`, which the **tutorial targets — keep it on the facility card**.
- Engine facts for the modal: per-facility daily electricity = `FACILITIES[kind].power` × count (see `processIndustrialEconomy`, `energy.ts`); actual daily output = `n.lastOutput[FACILITIES[kind].output]`; projected output of one more facility = `facilityDailyEconomics(state, id, kind).output`; `n.bottlenecks[kind]` holds the limiting input label (`'electricity'`, `'treasury'` or an input good) when production was throttled; at most **6** construction projects at once (`buildFacility` refuses beyond that; `IndustrialPanel` repeats the same condition).

### B.2 Policies & Laws card grid (2 × 3)

New `src/ui/panels/policyCards.ts` (pure view model) and `src/ui/panels/PolicyCardGrid.tsx`.

```ts
export type PolicyCardId = 'tax' | `concession:${FactionKey}`;
export interface PolicyCard {
  id: PolicyCardId; title: string; subtitle: string;          // i18n keys
  art: { set: 'command' | 'civic'; kind: string };             // CommandArt/CivicArt kinds that exist
  status: 'active' | 'available' | 'locked';
  activeUntilDay?: number; daysLeft?: number;                  // concessions
  reason?: string;                                             // engine reason when locked (concessionStatus.reason)
  costB?: number;                                              // concessionStatus.costB
  satisfaction?: number;                                       // factionsFor(c).satisfaction[faction], 0–100
  command?: GameCommand;                                       // {type:'politics/concession', faction}
}
export function policyCards(state: GameState, countryId: string): PolicyCard[]; // order: tax, labour, business, security, traditional, liberal
```

Card titles (i18n keys): "Tax Code" (subtitle: current rate, `country.economy.taxRate` is already a percentage, e.g. "Rate 28%"), "Labour Charter", "Business Relief Act", "Security Mandate", "Traditional Values Act", "Urban Reform Act" — each subtitle "Courts {faction} for 180 days". These are presentation names for the existing concessions; the review dialog must still say "Concession to {faction}" so players can match it to the Politics section.

Behaviour:
- Active concession card: green 2 px border, green ✓ badge top-right, "Active · {n} days left". All other concession cards: `locked` with the engine reason ("A concession to … runs until day …") — use `concessionStatus().reason`, do not rebuild the text.
- Available card: button "Enact · {cost}" → `ReviewDialog` (title "Concession to {faction}", metrics: cost, duration 180 days, faction satisfaction now) → `state.dispatchWithReceipt(card.command)`.
- Tax Code card: never locked; button "Adjust" scrolls to and focuses the existing `.tax-policy-panel` slider below the grid (do not move or replace that panel; `e2e/marketPolicies0903.spec.ts` depends on it).
- Only for the player's own country; for a foreign country in the Full Dossier the grid is read-only (status shown, no buttons).
- Layout: 3 columns × 2 rows ≥ 900 px; 2 × 3 below; 1 column ≤ 420 px. Same ivory card tokens as `targetHub0915.css`/`executiveDesk0916.css` (`--hub-*` values; AA contrast). Art 64 px in a circle.

Placement: inside `CountryPanel.tsx` `tab==='policies'`, directly after `.policy-heading` and before `<PopulationPanel policyOnly/>`. One-line change in `CountryPanel.tsx`.

CSS classes: `.policy-card-grid`, `.policy-card`, `.policy-card.status-active|status-available|status-locked`, `.policy-card-check`, `.policy-card-meta`, `.policy-card-action`. New file `src/ui/styles/cardUi0918.css`.

### B.3 Factory modal

New `src/ui/panels/factoryView.ts` (pure) and `src/ui/panels/FactoryModal.tsx`; new original art component `src/ui/icons/FacilityArt.tsx`.

```ts
export type BuildBlock = 'limit' | 'tech' | 'treasury' | 'deposit' | 'foreign' | null;
/** Same condition IndustrialPanel uses today (move it here and make IndustrialPanel call it). */
export function facilityBuildBlock(state: GameState, countryId: string, kind: FacilityKind): BuildBlock;
export interface FactoryView {
  kind: FacilityKind; label: string; count: number; enabled: boolean;
  dailyOutput: { good: IndustrialGood | null; amount: number; healthy: boolean };   // n.lastOutput[output] ?? 0; healthy = count>0 && enabled && !bottleneck
  dailyPower: { amount: number; healthy: boolean };                                  // FACILITIES[kind].power * count; healthy = bottleneck !== 'electricity'
  bottleneck: string | null;                                                         // n.bottlenecks[kind] ?? null
  projects: number; projectLimit: 6; limitReached: boolean;                          // n.projects.length >= 6
  build: BuildBlock;
}
export function factoryView(state: GameState, countryId: string, kind: FacilityKind): FactoryView | null;
```

`FactoryModal({ countryId, kind, onClose })`, rendered through `CommandWindow` (or a centred modal with `useWindowLifecycle`, layer `command`):
- Centre: `<FacilityArt kind={kind} size={160}/>` — original isometric SVG building, three variants chosen by kind: mine (`*_mine`, `waterworks`), works (`*_works`, `armor_mill`, `rubber_plant`), plant (`civil_factory`). Flat colours, no external images, `aria-hidden`.
- Exactly two data rows:
  - "Daily production": amount + unit (`GOODS[good].unit`), green when `healthy`, red otherwise, with the bottleneck text when present ("Limited by electricity").
  - "Electricity use": `amount.toFixed(3)` + "/day", green when `healthy`, red when the bottleneck is electricity.
- Badges: "Limit Reached" (red pill, `.factory-limit-badge`) when `limitReached`; "Paused" when `!enabled`; "×{count}" count chip.
- Actions: "Build another" → the existing investment review (`investmentReview(state, kind)` → `state.buildFacility(kind, commandId)`), disabled with the block reason when `build !== null`; "Pause"/"Resume" → `state.toggleFacility(kind)`, disabled when `count === 0`. Nothing else.
- Opening: in `IndustrialPanel.tsx` make the card header (`.facility-card header`) a button "Details" that opens the modal. Keep the existing footer buttons (and `data-guide="learn-build"`) on the card.

CSS: `.factory-modal`, `.factory-art`, `.factory-rows`, `.factory-row.healthy|.factory-row.unhealthy`, `.factory-limit-badge`, `.factory-paused-badge`, `.factory-actions` (in `cardUi0918.css`).

### B.4 Optional (only if time remains, separate commit): operation poster cards

The handoff's 3:4 "cinematic cover" cards for military/covert operations can reuse `CommandArt`/`CivicArt` at 3:4 in the Full Dossier's Intelligence tab (`.intel-actions`). Skip if 6.4 core is not green yet; list it as remaining in the records otherwise.

### B.5 Tests for 6.4

Unit (`src/tests/cardUi0918.test.ts`):
- `policyCards`: six cards in order; with no concession all five concession cards `available` (given treasury) and the command is `{type:'politics/concession', faction}`; after applying the command through `executeCommandResult`, that card is `active` with `daysLeft === 180` and the other four are `locked` with `concessionStatus().reason`; with insufficient treasury they are `locked` with the engine reason; foreign country → no commands.
- `facilityBuildBlock` equals the engine: for each `FacilityKind` and several constructed states (6 projects, missing tech, low treasury, empty deposit, foreign country), `facilityBuildBlock(...) === null` **iff** `executeCommandResult(state, {type:'industry/build', kind})` changes the state. This guards against the UI and engine drifting.
- `factoryView`: output/power numbers from `lastOutput`/`power×count`; bottleneck `'electricity'` → power row unhealthy; `limitReached` at 6 projects.
- Catalog translation test for `UI_CATALOG_0918`.

Browser (`e2e/cardUi0918.spec.ts`, tr 1440 and en 390):
- Policies tab: `.policy-card` × 6; enact Labour Charter through the review → that card has `status-active` and the check; the other concession cards are locked; the `.tax-policy-panel` is still below and the existing `marketPolicies0903` flow still passes.
- Production → industry: open a facility's Details → modal shows exactly two `.factory-row`s and the art; fixture with 6 projects shows "Limit Reached" and a disabled "Build another"; Pause toggles to "Resume".
- No horizontal overflow at 390.

### B.6 i18n keys (6.4)

"Policies & Laws", "Tax Code", "Rate {0}%", "Labour Charter", "Business Relief Act", "Security Mandate", "Traditional Values Act", "Urban Reform Act", "Courts {0} for 180 days", "Active · {0} days left", "Enact", "Adjust", "Concession to {0}", "Details", "Daily production", "Electricity use", "Limited by {0}", "Limit Reached", "Paused", "Build another", "Pause", "Resume" (check existing catalogs first with `translateText`; reuse reviewed wording where it exists).

---

## C. Definition of done (each phase)

1. All new logic in pure `.ts` modules with unit tests; components only render and send typed commands.
2. `git diff -- src/engine src/domain src/persistence` is empty; for 6.4 also `src/map`.
3. Five languages for every new visible string; no artefacts (`src/tests/i18nArtifacts.test.ts`).
4. Full CI green on the branch; existing e2e unchanged unless a test relied on behaviour that the phase intentionally changes (explain each such edit in the record).
5. Screenshots at 1440 (tr) and 390 (en) attached to the phase record or sent to Alper.
6. Release records per `docs/RELEASING.md`; ask Alper before merging into `dev/clear-command-090`.

## D. Open questions to raise with Alper (do not decide alone)

- 6.3: if the Natural Earth host is blocked, Alper supplies the raster. If the hillshade frame exceeds the performance budget, ship relief off by default rather than lowering the surface quality.
- 6.4: the concession "law" names are presentation names; confirm them before release. Folding the Diplomatic Inbox, Alerts and News windows into the Executive Desk (raised in 6.2) remains a separate decision.

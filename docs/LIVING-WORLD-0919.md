# Phase 6.5 — Living world polish (0.90.0-playtest.19)

Implementation: **Claude (Sonnet 5.5)**, scope approved by Alper on 13 October 2026. Base: playtest.18, GitHub `2a4c622`. Branch `dev/ron-living-world-0915`. Save schema 17 and game numbers are unchanged; no file under `src/engine/`, `src/domain/` or `src/persistence/` changed. Within `src/map/` only `WorldMap.tsx` changed (plus the new `eventPins.ts`); `mapSelection.ts` and `cameraControls.ts` are untouched.

## What the player sees

**Live change counters.** A strip under the commander name shows Treasury, Food and Oil. Each is an arrow, a signed amount and "/day": ▲ +$1.2B/day (green), ▼ -0.4/day (red), ■ when the change is under the noise floor (grey). Treasury is the strategic daily balance the top bar already computes (budget minus input use, maintenance, industry, academy and energy costs); food and oil are production minus consumption from `simulateResources`, without trade flows. The strip wraps inside the commander block so the top bar keeps its width. For screen readers each counter says "Rising", "Falling" or "Steady" before the amount.

**Event pins.** A pure model (`src/map/eventPins.ts`) decides what to draw; `WorldMap.tsx` renders it in a layer above the capital pins and below the labels.

| Pin | Where | When | Click |
|---|---|---|---|
| Crossed swords (red) | the middle of the two capitals' screen positions (the one that is visible, on the globe) | every active war; yours first, at most 12 | opens that war's window |
| Megaphone (amber) | 18 px above the capital | an open regime crisis, or stability under 30; the player first, then by level, at most 12 | opens that country's hub |

Annexed and occupied countries get none. Pins pulse gently unless the browser asks for reduced motion. Clicks go through the same nearest-marker path the microstate markers use (14 px), because the map captures the pointer on press and a click on an SVG child would never arrive; `mapSelection.ts` is not involved.

**Portrait mood.** The commander portrait glows red (alarm) in an active war of yours, an open regime crisis of yours or stability under 30; gold at approval ≥ 70% with stability ≥ 60% and none of those; otherwise it is unchanged. The button also contains the words "Crisis alert" or "Prosperity" (visually hidden). The glow is static under reduced motion.

**Operation posters (B.4).** The four covert operation buttons in the Full Dossier's Intelligence tab are 3:4 cards with a circular drawing, a title and the day/cost line. Same buttons, same `launchIntelOperation` calls.

## Interpretations the scope left open (please confirm)

1. **"Border" is the middle of the two capitals.** The engine has no front line coordinates; the pin sits halfway between the capitals (on the visible one when the other is on the far side of the globe).
2. **Unrest is stability under 30 or an open regime crisis.** The engine has no strike state, only the `general_strike` event, which is not a lasting condition. A strike therefore does not get its own pin.
3. **Food and oil exclude trade.** A country that imports most of its oil shows a deficit here although the market covers it. The strip's tooltip says "Production minus consumption, per day". Say if you want trade included.
4. **Treasury is the daily balance, not the stock.** The stock is already in the top bar next to it.
5. **No new setting.** The event pins have no on/off checkbox (the 6.3 checkboxes and their stored shape are unchanged); say if you want one.
6. **Thresholds** (alarm under 30 stability, gold at 70/60, 12 pins per kind) are my choices.
7. **The pin layer is hidden from assistive technology** (`aria-hidden`); the war and unrest information is available in the war and country windows. A keyboard route to the pins was not added.

## Tests

- `src/tests/livingWorld0919.test.ts` (20 tests): money and stock formats, arrow direction and noise floor, portrait priority (alarm before gold, thresholds), war pin position, ended and unknown wars, player-first ordering and caps, one-sided visibility, off-screen pins, unrest by stability and by crisis, ranking, annexed and occupied countries, determinism and no mutation, schema 17, the five-language catalog.
- `e2e/livingWorld0919.spec.ts` (6 scenarios; Turkish 1440 px and English 390 px): three counters with arrow, "/day" and a spoken word; gold mood; war and unrest pins on the flat map, clicking the megaphone opens the hub and clicking the swords opens the war window; phone width without overflow; a quiet world has no pins and a calm portrait; four poster cards at 3:4 at both widths.
- No existing test changed. The first CI run failed four existing top-bar checks that my change broke (the 10 px text floor in `fluidCommand0910`, and the Russian overview width limit in `compactWorkspaces0908`); the code was fixed, the tests were not touched.

## Not done in this session

- **Screenshots at 1440 (tr) and 390 (en).** The specs save `test-results/living-world-0919-*.png`; CI artifacts live on blob storage that was blocked.
- **Visual judgement** of the glow, the pins and the posters has not been made by a person.
- **The 6.3 relief frame-cost measurement** is still open.

## Validation

- CI 38408670761 (GitHub-hosted Chromium): Vitest, TypeScript, production build and all 186 Playwright scenarios passed (180 earlier + 6 new).
- First run 38406424038: 182 of 186; the four failures were the two issues above (9 px arrows; Russian top bar 803 px against a 780 px limit), fixed in the code.
- Unit tests: 813 / 90 files (793 earlier + 20), counted from the sources because the CI log was not readable; the 20 new tests also ran locally under a small compatibility shim before pushing.
- Not run locally: Vitest, `vite build` and the browser, because the npm registry was unreachable.
- No file under `src/engine/`, `src/domain/` or `src/persistence/` changed.

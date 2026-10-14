# 0.97.0 — Semantic Light Panels & Policy Workspace

Development release on `dev/ron-phase7`; not merged into `main`.

## Delivered behavior

The portrait step has one heading, a wider selection grid and a balanced preview. On ordinary desktop heights the grid uses the available body height; small/short screens retain scrolling and an accessible navigation footer. The helper stays directly above Back/Continue. Long perk titles fit the preview.

Leader name/day badge alignment and the day badge's Light surface/border/ink are corrected. The map gains a static SVG coordinate grid at 4% opacity in Light only, behind globe/land layers, with pointer events disabled. No geometry, projection or hit-testing formula changed.

Semantic Light cards cover goals/victory paths, gold vault/listing forms, commodity chart/order/limits/preview/holdings, industrial heading/order/contracts, dossier statistics/society/trade, cabinet, intel/home/logs, affairs, war readouts and state spending. Selected/hovered industrial and commodity cards preserve contrasting selection text, critical stocks retain warning semantics, supply rings retain their conic progress and readable centers. Commodity chart labels/series follow theme changes with a scoped observer disconnected on unmount. Diplomatic warm/rival message borders retain their existing colors.

The new five-language tax action opens the existing review; confirmation and the typed store command remain unchanged. Public Events & Relief moves from the tax controls to a wide banner immediately below the six policy cards, displaying live national approval/stability and opening the existing Society workspace. Foreign policies remain read-only.

## Boundaries and validation

`appearance.ts` retains the default Light preference; `appearancePhase7.css` is untouched. Scoped overrides are in `release097.css`. No engine/domain/persistence/audio/dependency changes, new save fields or migrations. Save schema 17 and deterministic RNG are retained.

`npm run check`: 922/922 unit tests in 99 files, TypeScript and production Vite build passed with zero build errors. `release097.test.ts` checks version/schema, the same seeded intel resolution and simulation snapshots, JSON save/load seed/country preservation and English/Turkish/Spanish/Chinese/Russian copy. Existing bundle-size/dynamic-import warnings remain.

Targeted Chromium production preview: 12/12 release scenarios passed in 47.9 seconds, plus 3/3 existing HUD/Dark-modal checks in 12.9 seconds. Covers five-language tax review/confirmation and Society return, desktop/mobile portrait hierarchy/navigation, day badge/4% pointer-transparent grid, goals, gold/listings, commodity labels/selection/chart theme repaint, industrial orders/contracts, all four dossier tabs, cabinet, active intel logs, affairs, supply reserve cards/progress rings, warm/rival correspondence and active-war metrics. Screenshots inspected.

Two initial navigation tests were corrected to follow the real UI: close the country drawer before the mobile diplomacy rail, and select Greece through the country selector rather than looking for it in the first virtualized ranking page. Final release run is green. Full browser/native macOS suites were not rerun.

See [playtest](PLAYTEST-097.md), [changelog](../CHANGELOG.md) and [roadmap](ROADMAP.md).

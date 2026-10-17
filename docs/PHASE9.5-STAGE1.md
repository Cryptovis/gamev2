# Phase 9.5, Stage 1: Living Geographic Map

Scope: `WorldMap.tsx`, new `src/map/LivingMapLayers.tsx` and helpers, `src/ui/styles/livingMap095.css`. Nothing under `src/engine` or `src/simulation` changed. The layers draw only when the base map is Geographic (the Blue Marble surface), in both the globe and the flat projection.

The brief points at `docs/MASTER-HANDOFF-AND-ROADMAP.md`. That file is not in the repository, so this stage follows the brief alone.

## Layers, bottom to top

1. Shelf halo (`ShelfHalo`). The union outline of every country, stroked three times with non-scaling widths of 8, 5.5 and 3 px in turquoise at rising opacity, and masked to the sea (`#shelf-sea-mask`: land is black, with a 2 px black stroke that closes the seams between neighbours). It reuses the country path strings WorldMap already builds each frame, so it adds no geometry work.
2. Rivers (`RiverLayer`). Danube, Rhine, Nile, Tigris, Euphrates (continuing as the Shatt al-Arab), Amazon, Yangtze, Mississippi and Volga as one path each, a 4 px soft glow under a 1.35 px crisp line. They sit above the country layer, so they run across national borders.
3. Night (`NightLayer`). Four circles around the antisolar point (radius 96, 90, 84, 78 degrees, that is penumbra, terminator, civil and nautical twilight) fill with a faint shade. Cities in `nightCities.ts` (67 metropolitan areas, weight 1 to 3) get a gold point light whose opacity follows `nightFactor`, a ramp through twilight, so lights fade in with the evening.

## The sun

`solarTerminator.ts` is pure. Declination uses Cooper's formula from the campaign date (`gameDate`, derived from the day counter and campaign start), the equation of time shifts the meridian by up to 4 degrees, and the hour angle comes from the viewer's UTC clock, refreshed once a minute. The game itself has no time of day, so the clock supplies it. The map is therefore live at the viewer, but nothing reads the clock in the engine, and the 120-day trajectory is untouched. `window.__RON_SUN_HOUR` pins the hour for tests.

## Themes

Navy: turquoise shelf, cyan rivers, blue-black night, gold lights with a radial glow. Ivory: deeper teal shelf, ink-blue rivers, a sepia (74,48,22) night shade, and lights that become sepia ink dots (#6a4220) with a faint ring and a quarter of the glow. All colours are custom properties declared for both themes; a test asserts every token exists in both.

## Performance

No new raster work and no per-frame timers. Each frame adds one concatenated land path, one river path, four circle paths and at most 67 light groups, all from the projection already computed for the frame. The sheet is imported before `hotfix15.css`, so the hotfix sheets keep the last word.

## Deviations and caveats

- River geometry is hand-digitised: 12 to 24 waypoints per river from gazetteer positions of towns and confluences, smoothed with Catmull-Rom. This sandbox has no network access, so Natural Earth `ne_50m_rivers_lake_centerlines` could not be fetched. Accuracy is roughly 10 to 30 km, under a pixel at the zoom levels the game offers. Replacing `riverData.ts` with the Natural Earth centerlines is the follow-up if exact courses are wanted.
- The shelf glow follows the political outlines (Natural Earth admin-0), not a bathymetric contour, which is what the brief asked for ("hugging coastlines").
- The brief named capitals such as Istanbul; Istanbul is not a capital, so the lights come from a metropolitan list rather than `CAPITAL_POSITIONS`.
- Not run here: vitest itself, real `tsc`, `vite build`, Playwright and the determinism replay. Frame rate was not measured; the cost argument above is analytic. Colours were checked by value, not by eye, because screenshots cannot be inspected in this environment.

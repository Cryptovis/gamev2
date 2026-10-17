# Phase 9.5, Stage 2: Living World and Strategic Overlays

Baseline 538b63b (Stage 1 merged). Presentation only: nothing under `src/engine` or `src/simulation` changed, nothing here writes to the store, and the 120-day determinism trajectory is untouched. The new layers read game state (wars, trade deals, supply contracts, relations) through the existing store selectors and draw it.

## 1. Alpine relief

`mountainData.ts` holds 13 ridge spines (Alps, Himalaya, Karakoram, Hindu Kush, Tian Shan, Rockies, Cascades-Sierra, Andes, Taurus, Caucasus, Pyrenees, Zagros, Carpathians) and a seeded generator that scatters about 1,000 peaks along them (three height tiers, a level-of-detail rank each). The same seed gives the same peaks on every machine. `mountainRelief.ts` projects the peaks that pass a zoom-dependent detail test and builds four path strings (lit face, shaded face, snow, shaded snow), so a whole mountain range is four `<path>` elements. Light falls from the upper left; tier 2 and 3 peaks get snow caps, tier 3 the deeper cap. Nothing shows until the camera reaches 5.5 px per degree (about globe zoom 1.1 or flat zoom 1.8); the main summits appear first, lesser peaks fill in as you zoom. On the globe, peaks near the limb shrink in height and the far side is skipped. It sits directly above the hillshade layer and follows its toggle (Relief in the map desk).

## 2. Trade convoys, cargo fleets and air corridors

- `seaLanes.ts`: a graph of about 150 open-water waypoints and 180 legs, threading Dover, Gibraltar, Suez, Bab-el-Mandeb, Hormuz, Malacca, Lombok, Panama, the Bosphorus, the Danish belts and the Cape, plus offshore anchorages for 73 trading nations (several have more than one coast). A sea route is the shortest path between the two countries' nearest anchorages. Every node, leg and anchorage was checked against the bundled country outlines (no land hits except straits and canals narrower than the outline resolution, listed in `NARROW`).
- `tradeRoutes.ts`: active `tradeDeals` and `industrialContracts` are grouped by country pair. Bulk goods (food, oil, iron, coal, copper, steel, fuel and so on) sail; uranium, gold, silver, silicon, rare earths, engines and electronics fly. Countries without a listed port (landlocked or minor) always fly. Air corridors are great-circle arcs bowed sideways.
- Rendering: each lane is a glow plus a line (teal for sea, dotted amber for air). One container ship per lane (two on the player's lanes) or one cargo aircraft (the existing freighter silhouette) moves along it. A single `requestAnimationFrame` loop writes the carriers' `transform` attributes directly, so React never re-renders per frame; it pauses while the tab is hidden and stops entirely for `prefers-reduced-motion`.
- Sanctions: where either government has sanctions recorded against the other (the engine sets this for any war pair), the lane is drawn dashed red with an animated march and a blockade marker (a ringed warship with a bar) at its midpoint, and no carriers run. Sanctions the player is under with no deal show as blocked corridors too (up to 8). Total routes are capped at 32, the player's first.

## 3. Frontlines, artillery smoke and combat flashes

- `frontlines.ts`: the front of a land war is the stretch of the defender's outline within 0.45 degrees of the attacker's, found with a spatial hash (a millisecond per pair, cached). The bundled outlines are coarse, so the line is blocky but it follows the real border. An overseas war gets a short beachhead on the defender's coast nearest the attacker by great circle.
- `frontlinesView.ts`: two interleaved dashed bands in the belligerents' national colours (if their themes collide the defender takes its accent colour) over a warm glow; troop-density chevrons every 26 px on each side, stacked one to five deep by each army's share of the two armies' personnel (parity reads as three). The player's wars first, up to 12.
- Combat effects: while a war's last combat round is at most two days old, up to three anchors (one for other nations' wars, eighteen in all) show an artillery flash, six sparks and three rising smoke puffs. All motion is CSS keyframes staggered per anchor (no JavaScript per frame), positions come from a hash of the war id, so they are stable.

## 4. Landmark capital pins

`landmarkIcons.tsx` has 29 original 24x24 drawings in one three-tone isometric style (lit face, shaded face, accent): Anıtkabir (Türkiye), Eiffel Tower, Big Ben, White House, Kremlin, Temple of Heaven, torii and tower (Japan), Brandenburg Gate, Colosseum, pyramids, India Gate, Brasília's Congress, Parthenon, Peace Tower, Angel of Independence, Azadi Tower, Kingdom Centre, Monas, Namdaemun, Faisal Mosque, Palace of Culture, Grand Palace chedi, Sheikh Zayed Mosque, Obelisco, St Sophia (Kyiv), Union Buildings, Baiterek, Petronas Towers, Puerta de Alcalá, Parliament House (Canberra), canal houses (Netherlands). They replace the generic capitol on those pins (26 px, with the flag ring lifted above them); every other capital keeps the generic pin. Colours are tokens, so Navy and Ivory restyle them.

## Themes

Everything is tokenised in `livingWorld095.css` (29 colour tokens, each declared for Navy and Ivory; a test enforces it). The Blue Marble surface stays dark in Ivory, so Ivory keeps the lanes, ships and fronts light enough to read on it; only the landmark outlines and fills shift to the parchment palette.

### Stage 1 follow-up

Stage 1's Ivory night lights (`#6a4220`) and river and shelf tints were dark browns and blues, which are nearly invisible on the dark surface. They are now a warm sepia (`#e8c48c`, glow `#c8914a`), a lighter river blue and a lighter teal shelf. The Stage 1 unit and e2e assertions were updated to the new values.

## Performance

No new raster work. Per frame the map adds: about one projection per visible peak (a few hundred at most, culled by detail and viewport), the route polylines (cached per camera), and the front lines. Carriers move through direct attribute writes and the effects through CSS animation, so panning cost is dominated by what Stage 1 and the existing country layer already paid. Frame rate was not measured here.

## Deviations and caveats

- The sandbox has no network, so there is no real river, port or sea-lane dataset: waypoints, anchorages and ridge spines are hand-entered and checked against the bundled outlines (176 countries, coarse). They are stylised, not survey data.
- A war's front covers the attacker and the primary defender only; allies fighting on the defender's side do not get their own front.
- The coarse outlines make fronts blocky and a few borders short (a handful of vertices).
- Not run here: vitest itself, real `tsc` over the whole project (the pure modules were type-checked on their own, clean), `vite build`, Playwright and the determinism replay. Rendering was checked in Chromium against the real outlines and CSS, and read visually, in Navy and Ivory.

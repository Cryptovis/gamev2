# Phase 6.4 — Card UI and factory modal (0.90.0-playtest.18)

Implementation: **Claude (Sonnet 5.5)**, from the Opus 5.5 handoff of 13 October 2026 (owner: Alper). Base: playtest.17, GitHub `f29ab60`. Branch `dev/ron-living-world-0915`. Save schema 17 and game numbers are unchanged; no file under `src/engine/`, `src/domain/`, `src/persistence/` or `src/map/` changed (empty `git diff` for all four). Dependencies unchanged.

## What the player sees

**Policies & Laws.** The Policies tab (`CountryPanel`, `tab==='policies'`) opens with a grid of six ivory cards, then the unchanged tax slider, then the state spending block. The grid is 3 × 2 from 900 px, 2 × 3 below and one column at 420 px or less; each card has a 64 px circular drawing, a title and a subtitle.

| Card | Built from | Subtitle |
|---|---|---|
| Tax Code | the existing tax policy (`country.economy.taxRate`) | "Rate 28%" (the country's rate); button **Adjust** scrolls to and focuses the existing slider |
| Labour Charter | faction concession `labour` | "Courts Labour for 180 days" |
| Business Relief Act | `business` | same pattern |
| Security Mandate | `security` | same pattern |
| Traditional Values Act | `traditional` | same pattern |
| Urban Reform Act | `liberal` | same pattern |

The engine has no laws system and none was invented: the five law names are presentation names for the five existing concessions. The review dialog still says "Concession to {faction}", so a player can match it to the Politics section. The running concession has a green 2 px frame, a green ✓ and "Active · N days left"; the other four cards are locked and show the engine's own reason (`concessionStatus`), so the "one concession at a time" and "insufficient treasury" texts are never re-implemented. An available card shows "Enact · $cost" (GDP-scaled by the engine) and the faction's current satisfaction. Enact opens the review (cost, duration 180 days, satisfaction) and sends the typed `politics/concession` command through `dispatchWithReceipt` with the review's command id. For a foreign country in the Full Dossier the same six cards are shown without any button.

**Factory modal.** Every facility card on the Production tab has a **Details** button in its header. It opens a plain window: an original isometric drawing (`FacilityArt`, three variants: mines and waterworks, works and mills, the industrial park), a ×count chip, a "Paused" badge when the facility is paused, a red **Limit Reached** badge at six construction projects, exactly two rows, and two actions.

- **Daily production**: the last tick's output of the facility's good with its unit, green when healthy and red otherwise; when the engine reported a limiting input the row says "Limited by electricity", "... treasury", "... Water" and so on.
- **Electricity use**: the facility's `power × count` per day, red only when electricity is the limit.
- **Build another** goes through the existing investment review and the typed `industry/build` command; it is disabled with its reason (limit, research, treasury, empty deposit, not your country) shown under the buttons. **Pause / Resume** sends `industry/toggleFacility` and is disabled when none is built.

The card's own footer buttons, including the tutorial hook `data-guide="learn-build"`, are unchanged.

## Pure view models

- `src/ui/panels/policyCards.ts`: `policyCards(state, countryId)` returns the six cards (id, status `active|available|locked`, days left, engine reason, cost, satisfaction, typed command). Commands exist only for the player's own country and only on available cards. `reasonParts` splits the engine's "A concession to X runs until day N." into a translatable template and values; the text still comes from the engine.
- `src/ui/panels/factoryView.ts`: `facilityBuildBlock(state, countryId, kind)` mirrors `buildFacility` condition by condition (`foreign`, `limit`, `tech`, `deposit`, `treasury`); `IndustrialPanel` now calls it for the card's build button, so the card and the modal cannot disagree. `factoryView` gives the two rows, the bottleneck, the project count and the block. The engine writes `'operational'` as the bottleneck of a healthy tick; the view treats that as no bottleneck.

## Interpretations the handoff left open (please confirm)

1. **Law names.** "Labour Charter", "Business Relief Act", "Security Mandate", "Traditional Values Act" and "Urban Reform Act" are the handoff's names. They sound like enacted laws, which is a promise the engine does not make: each is a 180-day concession that courts one faction (+15 satisfaction target, +5 on enactment). Say if you want plainer names.
2. **Tax Code card** is always "available" (never locked, never highlighted) and has no cost.
3. **Idle factories.** The handoff says rows are red when not healthy. A facility that is not built or is paused would show two red rows, which reads as a failure; those rows keep the `unhealthy` class but are drawn in muted ink (`.factory-row.idle`). Say if you want them red.
4. **Industrial park.** It produces no good (its gain is GDP and factories when built), so its production row shows "—".
5. **Non-finite treasury.** The old card button compared the treasury with the cost directly; `facilityBuildBlock` follows the engine and also refuses a non-finite treasury. This cannot occur in a normal game.
6. **Satisfaction on available cards** ("Satisfaction 55/100") was added so a player can see which faction needs courting; the handoff lists it in the data but not on the card.
7. **Non-English lock reason.** The "runs until day" reason is translated through a template; the other two engine reasons ("Insufficient treasury.", the controlled-government text) were already in the catalogs.

## Translations

`src/i18n/uiCatalog0918.ts` (tr, es, zh, ru), merged after `UI_CATALOG_0917`: the card titles and subtitles, "Policies & Laws", "Active", "Active · {0} days left", "Enact", "Adjust", "Concession to {0}", the lock template, "Details", "FACILITY DETAILS", "Daily production", "Electricity use", "Limited by {0}", "Limit Reached", "Paused", "Build another", "Resume" and the not-your-country text. Existing wording was reused (Pause, Satisfaction, Duration, Insufficient treasury., "/day", Research {0}).

## Tests

- `src/tests/cardUi0918.test.ts` (31 tests): six cards in order with typed commands; after the command through `executeCommandResult` the labour card is active with 180 days left and the other four are locked with the engine reason; the days-left countdown and the end of the concession; too little treasury; a controlled government; a foreign country has no commands; no mutation; `facilityBuildBlock` is `null` exactly when `industry/build` is applied, for all 13 facilities in nine situations (ready, six and five projects, no technology, treasury just below and exactly at the cost, empty and full deposits, non-finite treasury); factory view numbers, the electricity and other bottlenecks, paused and unbuilt, the park, the six-project limit; the three drawings; schema 17; the five-language catalog and the placeholders.
- `e2e/cardUi0918.spec.ts` (5 scenarios; Turkish 1440 px and English 390 px): six cards, the tax panel still below the grid, Adjust focuses the slider, enacting the Labour Charter through the review makes that card active with the ✓ and locks the other four, a foreign country is read-only, no horizontal overflow; the factory modal shows the drawing, exactly two rows, the ×count chip, Pause/Resume, Build another through the review, and closing; with six projects "Limit Reached" shows and Build another is disabled.
- No existing test was changed.

## Not done in this session

- **Screenshots at 1440 (tr) and 390 (en).** The e2e spec saves `test-results/card-ui-0918-*.png`; CI artifacts live on blob storage that was blocked. Nothing was rendered locally.
- **Visual judgement** of the drawings, the ivory cards on the dark Policies tab and the muted idle rows has not been made by a person.
- **B.4 operation poster cards** (optional in the handoff) were not started.

## Validation

- CI 38395400923 (GitHub-hosted Chromium): Vitest, TypeScript, production build and all 180 Playwright scenarios passed (175 earlier + 5 new).
- Unit tests: 793 / 89 files (762 earlier + 31), counted from the sources because the CI log was not readable; the 31 new tests also ran locally under a small compatibility shim before pushing (no `node_modules`; not a substitute for CI).
- Not run locally: Vitest, `vite build` and the browser, because the npm registry was unreachable.
- No file under `src/engine/`, `src/domain/`, `src/persistence/` or `src/map/` changed.

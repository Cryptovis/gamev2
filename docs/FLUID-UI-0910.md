# Phase 2 — Fluid UI, typography and Rule of Nations (0.90.0-playtest.10)

Owner: **Claude (Opus 5.5)**. 12 October 2026. Base: playtest.9, GitHub `6dd8a3691cc1d6132da94d972b3a5c517ac4eeca` (CI 38242251836 completed/success). Alper authorized Phase 2 and the Rule of Nations rebrand only; Phase 3 tactical AI code is untouched. Save schema 17, simulation rules, seeded RNG and dependencies are unchanged.

## Working environment

The npm registry is blocked by the session's network policy, so no local install, test or browser run was possible. Every check below ran on GitHub Actions. `measure/**` branches run a separate `Measure` workflow (`.github/workflows/measure.yml`) that does not gate releases; it publishes its output, JSON reports and screenshots to `results/<branch>` because artifact downloads were also blocked. The release gate remains `CI` on the `dev/**` branch.

## 1. Store subscriptions

### Method

`npm run measure:renders` builds an unminified React profiling bundle (`RON_PROFILE=1`, served from `dist-profile/`, never mixed with `dist/`). A minimal DevTools hook counts function components that actually re-ran in each commit (start time after the previous commit and changed props or hook state, so ancestors that only pass work down are excluded). Each of 17 scenarios resumes the same seeded day-31 campaign, opens one window or country tab, runs 6.2 s at 5x and records renders and React self time. Timings include probe overhead and CI noise; they are used only for comparison.

### Changes

- No UI component calls parameterless `useGameStore()` any more; a unit test guards this.
- Always-mounted dialogs (advisor, economic advice, victory, war command, tutorial) and the lesson briefing inside every workspace window subscribe only to the flag that opens them; their full bodies mount only while shown.
- Panels that display a few values use slice selectors or `useStoreView`, which compares the displayed values (affairs previews, integration requirements, Help programs, Supply investment costs, objectives, market quotes).
- Panels whose displayed figures come from engine previews over the whole campaign use the existing `useWorldView`: they still update on each simulated day (their numbers change) but no longer on receipts, save messages, camera or map-control changes.
- Aircraft vector shapes are memoised; the flight layer still animates at ~30 frames per second.

### Results (GitHub runner, Chromium, 1440×900)

| Scenario group | Component renders, before → after | React self time ms, before → after | Renders of the 23 audited panels, before → after |
|---|---:|---:|---:|
| Map and 7 rail windows | 49,489 → 25,355 | 1,440 → 1,432 | 473 → 280 |
| 9 country tabs | 123,833 → 95,635 | 1,881 → 1,816 | 551 → 154 |
| **All 17 scenarios** | **173,322 → 120,990 (−30%)** | **3,321 → 3,249 (≈ unchanged)** | **1,024 → 434 (−58%)** |

Audited-panel counts come from each scenario's 25 most frequently rendered components. Render work fell, but React render time did not measurably change: it was already 2–5% of the main thread, and the remaining cost is real daily work (supplier ranking ≈15 ms per simulated day, map and flight layer). No general speed-up, mobile or low-power improvement is claimed. The remaining audited-panel renders are the gated dialogs returning `null` when their parent shell re-renders once per day.

## 2. Window motion and return state

- One opacity-only fade (`motion0910.css`): 190 ms for windows and dialogs, 160 ms for backdrops. Position, size and transform never animate, so layout, hit-testing and focus are identical with and without motion. `prefers-reduced-motion: reduce` removes every window animation and the country-panel transition.
- A parent window hidden for a child fades back in when it returns, because the animation restarts with `display`. The country panel fades back from its hidden state.
- `useScrollMemory` remembers the player's scroll offsets inside command and workspace windows and restores them before the returning window paints. Existing tab state, frame position and opener focus are kept; the hidden parent remains non-interactive.
- An exit fade for the receding parent was not added: keeping the old window rendered during a fade would let it catch clicks and duplicate visible controls. This is deliberate.

## 3. Typography and case

`performance/visual.spec.ts` (Measure workflow, `measure/visual-*`) opens 22 screens in en 1440, tr 390 and ru 1440 plus entry and setup, records every visible text element's computed size and case, overflow, and saves screenshots.

| Audit (9,303 visible text elements) | Before | After |
|---|---:|---:|
| HTML/SVG text below 10 px | 2,477 | 24 (SVG supply-diagram text in scaled user units only) |
| Below 11 px | 3,481 | 3,168 |
| Long (>18 characters) capital text instances | 280 | 155 (eyebrow labels and cartographic water names) |
| Page-level horizontal overflow | 0 | 0 |

- 212 sub-10 px declarations in existing sheets were raised to 10 px in place (values only; SVG/map text excluded). `typography0910.css` sets 11 px for notes and explanations, tabular figures, lighter secondary text, and phone rules so HUD labels and country tabs keep whole words.
- Buttons, tabs, section menus and section headings use natural capitalization in all five languages (new reviewed catalog entries). Capitals remain for short eyebrow/stat labels. Machine-translation errors found during review were corrected: the window handle hint (Russian "fight"), map readout title, projection names and the map hint.
- Not converted in this phase: other long-tail capital button labels (for example setup wizard "CONTINUE"), and Russian/Spanish wording beyond the strings listed above.

## 4. Rule of Nations

- Page title and description, HUD eyebrow, entry and setup cover mark (`BrandMark`, `translate="no"`), wizard and loading headers, Help, victory notice, opening news and map notice use **Rule of Nations / RON**, untranslated in every language. Messages already stored in older saves display the new name.
- The cover art had "THE REAL PRESIDENT" painted into the image; the title band was cropped (900×1350 → 900×1088) and the name is now HTML text over the art.
- Package name `rule-of-nations`. Kept on purpose: IndexedDB `alpyx-global-command`, local storage keys `alpyx-map-zoom` and `trp-*`, and the footer credit "AlpyX Game Studios" pending Alper's decision. Historical release notes keep the names they were published under.

## 5. Validation

Recorded in `docs/PLAYTEST-090.md` → playtest.10 after the release CI run.

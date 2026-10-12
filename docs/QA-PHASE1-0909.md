# Phase 1 — QA reconciliation and baseline (0.90.0-playtest.9)

Owner: **Codex**. 12 October 2026. Base: playtest.8, GitHub `cdba582b7aeb319af10af3f2af18699b2923af34`; source tree `1c15b0edbc506d4b68a6456dc34a257c5f6648e6`. Alper authorized Phase 1 only. Original input: Antigravity `qa-report-v090.md`, dated 11 October, describing playtest.6. Claims are not accepted as bugs without evidence.

## Findings and disposition

| Claim | Evidence on current code / behavior | Phase 1 disposition |
|---|---|---|
| Zod strips save fields | `domain/gameSchema` is used to seed country data, not to load saved campaigns. Persistence checks a loose schema; `migrateSave` retains the original state and fills defaults. | No loss reproduced. Real save/load adapter tests for schemas 12–17 compare every country field and war; factions/crisis/concession, annexedBy, welfare, sanctions/deadline and eventFlags included. Actual IndexedDB roundtrip browser coverage added. No speculative schema rewrite. |
| Commodity price impact exceeds budget | `commodityOrderPreview` computes impacted fill, fee and freight before treasury comparison; execution uses that preview. | Below/exact-total physical order test passes; no budget fix required. |
| Double command / delivery / settlement | Command IDs survive snapshots within the existing 512-command retention window; flights mark arrivals; exchange removes settlements and guards lastDay. | New tests repeat after reload; stock and money apply once. Gold settlement compares against a matching state without the player's payment, preserving unrelated AI settlements and daily costs. |
| Missing victory/crisis focus | Both old components rendered unmanaged sections; two production-browser tests failed on initial focus before the fix. | Fixed through existing ManagedDialog. Initial focus, forward/backward Tab, Escape and translated labels; crisis retains alertdialog semantics and Escape acknowledges without selecting a response. Victory Escape dismisses the notice. |
| Tutorial must be trapped like a modal | Tutorial has interactive map/panel/production phases and its own reserved control area. | No tutorial conversion. Existing ten-lesson desktop/mobile production flows included in validation. |
| Hidden country panel remains accessible | `visibility:hidden` applies to descendants; lifecycle is disabled while hidden. | Browser accessibility snapshot, programmatic focus rejection and parent return test added. No blanket inert/aria patch without reproduced failure. |
| Double day advancement | tickGame calculates `state.day+1` twice from the same original day, not cumulatively. Auto/tactical round guards use lastCombatDay. | Typed same-ID day command, repeated combat and save-mid-war tests pass for both resolution paths; no engine edit. |
| 23 broad subscriptions / five renders per second | 23 UI files use parameterless useGameStore. Clock 5x interval is 1000 ms, not 200 ms. | Baseline CDP CPU sampling below. No claim that 23 components are all mounted or that clock changes equal React render counts. Selector optimization belongs to Phase 2 after attribution. |
| O(N²) relations | processTradeRelations traverses stored relation keys daily, skipping the reverse pair. Dense worst case is quadratic; current scenarios have about 1,870 entries, not a full Cartesian matrix. | Measured below; no hotspot established on this machine. Dense/strained graphs and mobile remain performance risks for Phase 2. |
| Cargo asymmetry | Bilateral contracts transfer under their own rules and `cargoFlight` defaults to payload:none; commodity flights carry goods on arrival. | Confirmed differing semantics, not double delivery. Ownership/cancellation/conquest rules remain Phase 4; do not change the logistics model in this patch. |
| Defender fuel advantage | Auto resolver charges attacker's base fuel; tactical code additionally charges order fuel to both sides. | Code asymmetry confirmed; passive defence versus active operations needs paired balance scenarios in Phase 3. No gameplay-number changes here. |
| Air superiority is a 3.5× power multiplier | Actual front delta adds `(airSuperiority/100)*3.5`; power modifiers are separate and clamped. | Claim as stated is inaccurate. Balance evaluation stays Phase 3. |
| Rescue lending missing | `sovereignCredit` already has bounded three-year rescue offers, ratings and delayed applications from .4. | Do not reimplement. Small-economy effectiveness is a Phase 3 balance follow-up. |
| Catalogue / validation consolidation, renderer and audio packages | Technical debt and future feature proposals, not verified critical Phase 1 defects. | Deferred; no library, consolidation, renderer or sound changes. |

## Test scope and limits

`reliableFoundation0909.test.ts` adds 13 safety tests: six migration-shaped schema fixtures, absent optional fields, invalid write protection, budget boundary, duplicate/cargo, settlement and two combat/day cases. Node tests mock only the IndexedDB table and guest ownership while using real saveGame/loadSave, snapshot and migration functions. Fixtures deliberately include preservation sentinels; they are not claimed to be archived user saves. Existing schema-16 6×6 tactical migration test now also verifies the second save/load.

`reliableFoundation0909.spec.ts` adds ten modal tests across en/tr/es/zh/ru, one hidden-panel accessibility/focus check and one actual IndexedDB manual save/resume cycle. Before-fix failures were initial-focus assertions, not browser startup failures. An earlier unusable local Chromium copy was replaced from the already installed Brotli package; no project dependency was added.

No absolute guarantee for every possible historical or corrupt save is implied. Supported schema boundary, legacy tactical shape, populated/absent optional fields and invalid-write preservation are tested explicitly.

## Initial performance measurement

Optional commands: `npm run measure:engine -- -t 'Phase 1'` and `npm run measure:browser -- -g 'Phase 1'`. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE when using an existing browser. Do not run production browser measurements concurrently with another build/E2E process.

Node v24.19.0, AMD EPYC 9V74; 203 countries. Two warmups + 20 independent samples per operation against identical seeded inputs. War scenarios contain one player tactical front and remaining auto-resolved fronts; an assertion checks all 4/8 fronts actually resolve. These are synthetic prepared workloads, not 365-day balance results. Milliseconds are median / p95. Engine measurement overlapped browser playtests, so shared-machine noise applies; no speedup claim is made.

| Wars | Relation entries | Relations ms | Combat ms | Whole tick ms |
|---|---:|---:|---:|---:|
| 0 | 1864 | 0.52 / 0.87 | 0.01 / 0.01 | 15.39 / 26.91 |
| 4 | 1864 | 0.41 / 0.68 | 0.77 / 2.11 | 9.65 / 14.01 |
| 8 | 1870 | 0.49 / 0.65 | 0.90 / 1.03 | 11.82 / 16.68 |

The lower/higher timings across scenarios are not causal comparisons; warmup and scheduler effects matter. The earlier .6 long-campaign measurements remain in PERFORMANCE-0906.md and were not repeated as if new work.

Production Chromium 153.0.8010.0, headless software graphics, 1440×900, no CPU/network throttle. CDP CPU profiler sampled at requested 1 ms intervals during about 6.2 seconds at 5x; panel opening is outside that window. Clock text mutations count displayed day changes, not React renders. The summary uses minified production symbols and cannot attribute individual React component cost.

| Open panel | Observed day changes | CPU samples | Idle samples |
|---|---:|---:|---:|
| supply | 6 | 6168 | 5740 |
| world | 6 | 5791 | 5476 |

No general performance improvement or mobile suitability is asserted. Component-level React profiling/long-task attribution, dense strained diplomacy graphs, low-power devices and actual StackBlitz remain Phase 2/6 follow-ups. Local raw JSON is reproducible under ignored performance/results; the measured summary above is retained in git.

## Release gate

`npm run check`: 635 tests / 80 files, TypeScript and production build passed. All 12 focused production-browser scenarios passed (1.1m). Local full run was interrupted after 78 successful scenarios by a workspace reset; do not claim a complete local run. Full 146-scenario GitHub CI is the final release gate. The recovery check again passed 635 tests, TypeScript and build. Remote CI must be verified against the published commit, not a previous green run. Schema 17, simulation rules, RNG, dependencies and five languages retained. Phase 2 has not started.

## Workspace recovery

A later workspace reset removed the external Git directory referenced by the old worktree. Every tracked source/asset was hashed against the complete, non-truncated GitHub .8 tree: only the 13 intended tracked files differed; three intended new files were present. No tracked file was missing. A standalone local source mirror was initialized from that verified .8 tree, preserving all working changes. Its local baseline commit is `0c88ed084e119d781150715b2268c95b57d3c7d6`; it is not GitHub history and must not be pushed natively. The remote release is a connector-created child of the freshly checked GitHub HEAD with expected_sha protection.

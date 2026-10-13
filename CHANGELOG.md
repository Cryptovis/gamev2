# Changelog

## 0.90.0-playtest.17 — Tactile hillshade map (Phase 6.3)
Implementation: **Claude (Sonnet 5.5)**. Branch: `dev/ron-living-world-0915`. Save schema 17, simulation and game numbers unchanged; no file under `src/engine`, `src/domain` or `src/persistence` changed; dependencies unchanged.

- **Shaded relief under the labels.** A Natural Earth hillshade (public domain, 126 kB) is drawn as its own layer above the country shapes and below the labels, in the flat and globe views and over both base maps. It takes no clicks and never delays the satellite surface.
- **Desk tilt.** The flat map tips back 18° on screens wider than 760 px, with a soft shadow along the far edge; the globe and phones stay upright. Clicks, drag and wheel zoom use an analytic un-projection (`deskTilt.ts`) instead of `getScreenCTM()`, so the country you click is the one under the cursor.
- **Capital pins.** Miniature domed capitols with round flags on the 201 Natural Earth capitals: your capital, the selected and the hovered one always; enemies, allies and partners (ring colours); other countries once zoomed in. At most 48, never closer than 18 px.
- **Three settings** in the map dock (Desk tilt, Relief shading, Capital pins), remembered in this browser and never in a save; labels and the Natural Earth credit in five languages. [Phase 6.3 record](docs/HILLSHADE-0917.md).
- **One existing test adjusted:** the click-time-download test now waits for the map's relief worker, which starts on load.

Validation: 762 unit tests / 88 files (729 earlier + 33 map desk tests; counted from the test sources, because the CI log was not readable here), TypeScript and production build passed; the 365-day long-run invariant passes. All 175 production-browser scenarios passed on GitHub-hosted Chromium (170 earlier + 5 map desk scenarios at 1440 px Turkish and 390 px English; CI 38387235473). The first run (38385269101) passed Vitest, TypeScript and the build and 173 of 175 scenarios; the two failures were the existing click-time-download test, adjusted as described in the phase record. Relief frame cost has not been measured yet. Nothing ran locally: the npm registry is unreachable in this session, so GitHub Actions was the verifier. Limits: relief is on by default but its frame cost is not measured yet (the measurement is in `performance/browser.spec.ts`; if it exceeds the budget the rule is to ship relief off by default); no screenshots attached yet; pins are not counter-rotated under the tilt; browsers without an emoji flag font show the pin flags as letters.

## 0.90.0-playtest.16 — Executive desk (Phase 6.2)
Implementation: **Claude (Opus 5.5)**. Branch: `dev/ron-living-world-0915`. Save schema 17, simulation and game numbers unchanged; dependencies unchanged. No new engine rule: proposals still expire exactly as before (no relation penalty).

- **One desk for what needs an answer.** A new Desk button tops the right rail (badge: proposals awaiting your answer) and opens three tabs: ✉️ Diplomacy, 🪖 Wars, 🕵️ Intelligence & crises.
- **Countdown on every proposal.** Incoming embassy and trade proposals show "Time left: X days ⏳" from their existing expiry day, soonest first; three days or fewer is urgent (red), day 0 reads "Last day". Each card shows both sides' share of the setup fee.
- **Decide on the card.** Decline is immediate and free; Accept opens the familiar shared-fee review. Both send the existing typed `diplomacy/resolveLetter` command, with the usual receipt.
- **Wars and operations.** Your wars with the front from your side and a direct Open war command button; your running operations with days until the result.
- **Reports about you.** Each tab lists up to 12 categorised reports from your own commands, offers, wars, events and crises, or naming your country; AI-to-AI treaties and foreign elections stay in News.
- **Translations** for all desk labels and countdowns in five languages, ten news categories that had none, and the previously untranslated "proposal received" notice. Right-rail icon colours now follow each tool instead of its position. [Phase 6.2 record](docs/EXECUTIVE-DESK-0916.md).

Validation: 729 unit tests / 87 files (714 earlier + 15 desk tests), TypeScript and production build passed; the 365-day long-run invariant passes. All 170 production-browser scenarios passed on GitHub-hosted Chromium (168 earlier + 2 desk scenarios at 1440 px Turkish and 390 px English; CI 38376708485). Playwright failures are now also reported as GitHub check-run annotations. Not run on StackBlitz: the npm registry is blocked in this session.

## 0.90.0-playtest.15 — Target-country diplomatic hub (Phase 6.1)
Implementation: **Claude (Opus 5.5)**. Branch: `dev/ron-living-world-0915`. Save schema 17, simulation and game numbers unchanged; dependencies unchanged.

- **Another country opens a diplomatic hub.** Selecting a foreign nation on the map or in World rankings opens a centred card instead of the player's 14-section panel: the two flags facing each other, country and capital (201 Natural Earth capitals), treasury, GFP rank, population and the relationship (mood, stance, index).
- **Eight actions, same rules.** Open Embassy, Trade Pact, Non-Aggression Pact, Defensive Alliance, Impose/Lift Embargo, Economic Aid ($1/5/10B), Diplomatic Mission and Espionage Operation each send a typed command with the Full Dossier's strategic review and engine validators; active agreements show a green tick, blocked ones the engine's reason, pending letters link to the proposal tracker. The embassy card uses the typed `diplomacy/request` command.
- **Full Dossier.** One button opens the existing country panel; its country list keeps the full panel, and requests from other windows for a country's tab open the panel directly. The player's own nation always opens the full panel.
- **Light card theme** with WCAG AA text contrast, a two-column phone layout, and no flag motion with reduced motion or Low effects.
- **Translations.** All new labels in five languages, three previously untranslated diplomatic-mission reasons, and reviewed replacements for machine translations shown on the hub (relationship stances, embassy, embargo and Turkish pact capitalisation; game-wide). [Phase 6.1 record](docs/TARGET-HUB-0915.md).

Validation: 714 unit tests / 86 files (699 earlier + 15 hub tests), TypeScript and production build passed; the 365-day long-run invariant passes. All 168 production-browser scenarios passed on GitHub-hosted Chromium (165 earlier + 3 hub scenarios; 2 ranking specs updated to expect the hub; CI 38364367517 first run, and CI 38366955805 on the release tree after two style fixes). Not run on StackBlitz: the npm registry is blocked in this session.

## 0.90.0-playtest.14 — Sound, battle effects and terrain (Phase 5)
Implementation: **Claude (Opus 5.5)**. Branch: `dev/clear-command-090`. Save schema 17 and simulation unchanged; new dependency Howler.js 2.2.4 (MIT).

- **Sound.** One audio service plays interface clicks and confirmations, war alarms, radio round reports, artillery, impacts, captures and losses, and a peacetime or wartime ambience. Interface, battle and ambience have their own volumes, plus master volume and mute (Player options → Sound, stored in this browser only). Nothing plays before your first click or key press; at most four sounds play at once; each event sounds once. If sound cannot load, the game continues silently.
- **Battle effects from recorded results only.** Replays draw movement trails, artillery arcs with impacts or misses, recon sweeps, contact flashes and objective captures from the round's recorded actions. Watching, summarising or skipping never changes casualties, fuel or the random sequence (tests prove the state is identical).
- **Summaries.** At 4× replay, the 5× clock, with the new low-effects option or with reduced motion, each round shows one summary (moves, bombardments, losses, captures, front change) instead of step animation; at 5× an auto-resolved war gives one radio report per five rounds.
- **Terrain.** Original tiles for plains, forest, mountain, desert, urban and coastal sectors; the earlier colours remain as the fallback and hidden sectors stay dark.
- All sounds are original (synthesized; generator in `docs/audio/`) and recorded with the terrain tiles in `docs/ASSET_MANIFEST.md`. [Phase 5 record](docs/AUDIOVISUAL-0914.md).

Validation: 699 unit tests / 85 files, TypeScript and production build passed; the 365-day long-run invariant passes. All 165 production-browser scenarios passed on GitHub-hosted Chromium (162 earlier + 3 Phase 5 specs: sound options with every sound file blocked, recorded-effect replay and low-effects summary, reduced motion; CI 38323118652 and the full Measure suite on the release tree). The war-balance measurement is line-for-line identical to playtest.13 (`measure/war-av-0914`). Not run on StackBlitz: the npm registry is blocked in this session.

## 0.90.0-playtest.13 — Air/naval task groups and the cargo chain (Phase 4)
Implementation: **Claude (Opus 5.5)**. Branch: `dev/clear-command-090`. Save schema 17 (new optional fields), dependencies unchanged.

- **Task groups.** Each side of a war assigns fighters, bombers and warships to air superiority, close air support, interdiction, shore support, blockade or convoy escort. Only assigned, ready forces fight in that war; one aircraft or ship serves one war at a time; assignments never exceed the national stock and losses come out of the groups. Bases are capitals (own, controlled or allied, nearest to the front), with fighter and bomber ranges and 1–3 preparation days; warships need ports and coasts. Only assigned aircraft burn mission fuel.
- **Same rules for the AI.** One engine preview and validator serve the player's new war-theatre panel and the AI, which reviews its groups every 14 days without seeing the enemy's assignment.
- **Balance kept.** A new war starts with groups equal to the earlier fixed 25% share: all 14 playtest.12 scenarios measure the same (one rounding difference: attacker 1.5× forces +3.61 → +3.62 per day). Air superiority with close air support stops at the mountain defensive edge; blockade cuts at most 12% and interdiction at most 15% of enemy front supply, escorts and air cover cancel up to half; shore support is worth a quarter of close air support. Wars saved before this version keep the fixed share.
- **Cargo chain.** A commodity cargo is one shipment: the map flight and the exchange delivery share an id and land on the same day. Fixed: with many flights in the air, the oldest cargo was delivered at once while the purchase still showed it in transit. Unescorted cargo for a blockaded country may be partly intercepted (seeded, reported, no refund); paid cargo is never cancelled and still lands if the countries go to war or the buyer is occupied.
- [Phase 4 record](docs/TASKGROUPS-0913.md); capital positions from Natural Earth (public domain).

Validation: 686 unit tests / 84 files, TypeScript and production build passed; the 365-day long-run invariant passes. All 162 production-browser scenarios passed on GitHub-hosted Chromium (160 earlier + 2 task-group specs at 1440 px Turkish and 390 px English; CI 38312328349 and the full Measure suite on the release tree). War balance measured before and after on GitHub (`measure/war-tg-base`, `measure/war-tg-after`). Not run on StackBlitz: the npm registry is blocked in this session.

## 0.90.0-playtest.12 — Multi-round tactical AI and war balance (Phase 3)
Implementation: **Claude (Opus 5.5)**. Branch: `dev/clear-command-090`. Save schema 17 (new optional plan field), dependencies unchanged.

- **Tactical AI plans ahead.** AI sides choose a reconnoitre, seize, flank, secure or withdraw plan, project it three rounds ahead, keep it unless a clearly better one appears, and remember enemy groups they have actually seen. Orders use the player's validator, budget and fuel; a deterministic work budget falls back to the previous single-round AI. The player's board shows its own standing plan. Goal switches by a stronger attacker fell from 0.18 to 0.05 per round while it advanced further.
- **Fog of war.** Objective holders are known only where visible; tests prove plans do not change when unseen enemies move.
- **War balance.** Equal forces on plains now hold the front (+0.31 per day, was −0.93). Air superiority counts once and equals the mountain defensive edge. Attacker and defender follow one fuel rule: attacks pay operational fuel, holding pays a smaller sustainment share and is never blocked. The attacker/defender supply gap narrows from 13% to 4%. Small economies can reach a rescue line from any non-hostile lender during a war.
- [Phase 3 record](docs/WAR-AI-0912.md), `npm run measure:war` paired-scenario harness.

Validation: 660 unit tests / 83 files, TypeScript and production build passed; the 365-day long-run invariant passes. All 160 production-browser scenarios passed on GitHub-hosted Chromium (158 earlier + 2 standing-plan specs; full suite on the release tree before merge). Not run on StackBlitz: the npm registry is blocked in this session.

## 0.90.0-playtest.11 — RON Interactive credit
Implementation: **Claude (Opus 5.5)**. Branch: `dev/clear-command-090`. Schema 17, simulation and dependencies unchanged.

- The studio credit in the footer is **RON Interactive** (untranslated); the last visible "AlpyX" text is removed. Guards now reject any AlpyX text in the interface.

Validation: 639 unit tests / 81 files, TypeScript and production build passed; all 158 production-browser scenarios passed on GitHub-hosted Chromium (15.4 min). CI on the published commit is the release gate.

## 0.90.0-playtest.10 — Rule of Nations: fluid command (Phase 2)
Implementation and validation: **Claude (Opus 5.5)**. Branch: `dev/clear-command-090`. Save schema 17, simulation rules, seeded RNG and dependencies unchanged; existing saves continue.

- **Rule of Nations (RON).** New name in the page title, HUD, entry and setup screens, wizard, Help, victory notice and opening news, untranslated in all five languages. The old title painted into the cover art is cropped away and replaced by an HTML mark. Messages stored in older saves show the new name. Save storage names are unchanged so existing campaigns load.
- **Store subscriptions.** No component subscribes to the whole store. Always-mounted dialogs and the lesson briefing in every window watch only their opening flag; small panels select what they display; engine-preview panels use the simulation view. Over 17 measured 5x scenarios, component renders fell 30% and audited-panel renders 58%; React render time was already small and is unchanged, so no speed-up is claimed.
- **Window motion and return.** Windows, dialogs and backdrops fade in (190/160 ms, opacity only). A returning parent window fades back with its tab, scroll position, frame and opener focus; reduced motion removes all window animation.
- **Typography.** HTML text is at least 10 px (2,477 → 0 sub-10 px HTML elements in the review), notes and explanations 11 px, tabular figures, clearer secondary text. Buttons, tabs, section menus and headings use natural capitalization in five languages; capitals stay on short labels. Phone HUD labels and country tabs keep whole words. Corrected machine translations include the Russian window-drag hint, map readout and projection names.
- New evidence and tooling: [Phase 2 record](docs/FLUID-UI-0910.md), `npm run measure:renders`, a typography/visual review and a non-gating `Measure` workflow for `measure/**` branches.

Validation: 639 unit tests / 81 files, TypeScript and production build passed (run on the release tree). All 158 production-browser scenarios passed on GitHub-hosted Chromium (15.7 min; 146 earlier + 12 new for motion, return state, brand and typography). Not run locally or on StackBlitz: the npm registry was blocked in this session. CI on the published commit is the release gate.

## 0.90.0-playtest.9 — Reliable foundation (Phase 1)
Implementation and validation: **Codex**. Branch: `dev/clear-command-090`.

- Victory and Regime Crisis use the existing managed focus/Tab/Escape lifecycle, with translated labels and preserved crisis acknowledgement. Save/load, exact-budget, duplicate command, cargo, settlement and same-day combat coverage expanded. No simulation, schema or dependency change.
- Original QA claims reconciled against code and focused behavior; existing credit, market and compact-workspace work retained. Baseline CPU/relations/war measurements added without speculative optimization.
- [Phase 1 evidence and remaining risks](docs/QA-PHASE1-0909.md). 635 unit tests / 80 files, TypeScript and production build passed. All 12 new focused production-browser scenarios passed; the local full run was interrupted after 78 passes by a workspace reset. The full 146-scenario suite must pass on the published GitHub commit. Phase 2 has not started.

## 0.90.0-playtest.8 — Compact workspaces
Implementation and validation: **Codex**. Branch: `dev/clear-command-090`.

- Fit the top-left HUD to its contents; remove the oversized brand/metric spacing on desktop.
- Narrow World to 940 px, compact activities and ranking controls, measure the translated first ten rows for the table viewport. Continue scrolling through all 203 countries; preserve ranking/country return state and bottom padding. Small screens scroll the workspace as needed.
- Use three Supply resource cards per row when the body has at least 980 px, two at intermediate widths and one on small screens. Compact filters and supplier rows without dropping prices, relations or cargo information.
- Bound Dossier to 920 px and Supply command to 980 px; keep mobile frames within the viewport. Trade Desk artwork and heading now form a left-aligned title block instead of running together at the right edge.
- Society separates religious/ideological identity, estimated religious composition and five icon indicators. Infrastructure adds repo-native road, rail, port and hub illustrations with clearer labels and capacity bars; existing reviewed investments are retained.
- Correct context-specific Power, Delivery and visible supply/society labels in all five languages. Compact commander HUD and World rankings with ten visible rows and scroll access to every country; denser Supply cards, a readable Trade Desk hero, illustrated Society and Infrastructure workspaces. Existing parent-return and reviewed investment flows are preserved. Save schema 17, simulation rules and dependencies unchanged.

Validation: 622 unit tests / 79 files, TypeScript and production build passed. All 8 final focused production-browser scenarios passed (2.2m), covering 390/1440/2048 px, five languages, all ranking pages, Supply readability, Society/Infrastructure and parent/review return. The local full run was interrupted at scenario 58 after finding two Supply font-size failures and one mobile bottom-padding failure; these real UI issues were corrected and covered by the final focused run. The full 134-scenario suite runs in exact-head GitHub CI after publication. Final desktop/mobile screenshots inspected; actual StackBlitz testing was not performed. V3 remains conditional on complete playability.

## 0.90.0-playtest.7 — Command intelligence
Implementation and validation: **Codex**. Branch: `dev/clear-command-090`. Save schema 17 and dependencies unchanged.

- Compact two-column Open Market on desktop; stacked mobile layout, independent purchase/sale quantities and existing engine review/receipt flows.
- National Alerts filters resources, finance, security, domestic politics and diplomacy with icons, severity and contextual inspection. Presentation thresholds do not change engine rules.
- News has an actual campaign briefing and history. Empty journal no longer hides starting messages; untimestamped messages do not acquire a fabricated current date.
- Source-linked offline starting diplomacy: NATO alliances, EU economic integration, regional cooperation and selected bilateral allies/rivals. Numeric scores are authored game estimates, not official ratings. Existing saves are preserved; contemporary scenario data is not a reconstruction of January 2026. [Coverage and sources](docs/DIPLOMACY-SNAPSHOT-0907.md).
- Relations map adds alliance/friendly/hostile colors while preserving active-trade and embassy precedence. Isolate authored coalition/map tests from opening alliances. CI job budget increases to 20 minutes for the expanded browser suite.

Validation: 621 unit tests / 78 files (including the 365-day invariant), TypeScript and production build passed. Full production browser run: 127/128 passed (17.1m); the sole failure was an obsolete mobile rail-exposure expectation, updated for expanded Alerts. All 9 affected desktop/mobile scenarios passed again (1.4m), covering all 128 unique scenarios. Final mobile screenshots were inspected. Exact-head remote CI is checked after publication; actual StackBlitz testing was not performed. V3 remains conditional on complete playability.

## 0.90.0-playtest.6 — Measured performance
Implementation and validation: **Codex**. Branch: `dev/clear-command-090`. Save schema 17, simulation rules and dependencies unchanged.

- Add opt-in engine and production-browser measurement commands for day-1, one-year and three-year seeded campaigns. Record tick, snapshot/validation, entry/resume, Market/World/Supply and camera distributions with explicit sample counts and environment limits.
- Relations-map colors use a ledger index instead of scanning trade/contract/embassy records for every polygon. Memoize until the relevant inputs change; preserve color precedence and inactive-record semantics. Three-year all-country lookup median: approximately 0.89 → 0.016 ms, including index construction.
- Collapsed supplier disclosures defer up to 30 extra rows each until expanded. Mouse collapse/expansion and keyboard reopening preserve routes and actions. Browser latency samples remain variable; no consistent Supply or startup speedup is claimed.
- Preserve the full historical releases/milestones and record further performance scopes in [the measurement report](docs/PERFORMANCE-0906.md). No new UI wording or translation changes are needed.

Validation: 610 unit tests / 77 files, TypeScript and production build passed. Engine and both production-browser measurement runs passed; all 118 production browser correctness scenarios passed (15.6m). Remote CI is verified after publication. Actual StackBlitz/device performance remains a follow-up; compatible saves need no new campaign. V3 remains conditional on complete playability.

## 0.90.0-playtest.5 — Spacious command windows
Implementation and validation: **Codex**. Branch: `dev/clear-command-090`. Save schema 17, dependencies and simulation numbers unchanged.

- Tech, national World, War readiness and Production open in expanded windows; left Supply, Market and World rankings also gain room. Fix width caps and right-rail placement measurements; mobile expanded frames use the available screen width.
- Child workspaces hide their parent without discarding its component state. Close/Escape returns to the previous menu; root rail choices start a new navigation path. Nested reviews and portrait selection show only the child. Navigation history is transient and is cleared on load/new campaign.
- Group Overview, renamed Power with a pentagonal radar icon, and Supply command. Separately group Tech, World and War readiness with equal-sized buttons. Religion, ideology and military rank cards gain legible labels/artwork; Cabinet uses the existing reliable icon atlas.
- National popups follow changes of selected country, including World → another country’s War assessment, without disappearing.
- Restore World activities (wars, trade flows, operations, blocs and sanctions) above ranking controls. Initially render 20 countries; scrolling adds the next 20. Country details return to the previous ranking state. Duplicate scroll events request one page; switching ranking resets the scrollbar.
- Modernize commander profile, remove blue rail containers, frame individual buttons with selected accents, and separate the top-right country shortcut from the speed/date card. Date moves below the existing speed controls; country shortcut gets a gold accent.
- New labels cover English, Turkish, Spanish, Chinese and Russian. The .4 credit mechanism and completed .3 market behavior are preserved.

Validation: 607 unit tests / 76 files, TypeScript and production build passed. All 115 production browser scenarios verified: 111 passed in the full run; two ambiguous selectors caused by retained hidden parents and one portrait-focus regression were corrected. Twelve focused navigation/focus scenarios, eight final language/visual scenarios and three final Tech → research → Tech checks passed. A first CI run passed 113/114 and exposed duplicate scroll-page requests; this was fixed with a rapid-event regression. Eleven navigation/focus checks and four final workspace/country/pagination checks passed after the last fixes. Desktop/mobile screenshots inspected. GitHub CI runs independently on publication. StackBlitz itself is not directly exercised; compatible saves require no new campaign. V3 remains the complete-playability milestone.


## 0.90.0-playtest.4 — Reliable command menus & sovereign credit
Implementation and validation: **Codex**. Branch: `dev/clear-command-090`. Save schema stays 17; new credit fields are optional, with legacy loan terms preserved. No dependency changes.

- Ordinary command panels, country research/charts and tactical surfaces load with the startup graph. Tech and other menus no longer request a panel module at click time; network-blocking regressions cover desktop/mobile navigation. This increases the startup bundle; catalogue splitting and measured performance remain open.
- Investments moves under Tech; Pilot training moves under Military, with shared engine eligibility/cost/duration previews. Country and Supply navigation use consistent capitalization, larger supplier facts and an All resources icon. Remove excess space above the Supply contracts summary.
- World opens beside the left rail with Military, Financial and Diplomacy rankings, live metrics, player position and country links.
- Sovereign credit shows partner flags and simulated AAA–D ratings for every country. Applications remain pending for three game days; relations, rating, sanctions, available cash and debt capacity determine approval. Strong finances broaden lender choice and lower quoted lending APR.
- Cash-poor eligible players can receive reserved, targeted three-year rescue offers from friendly rich countries, at a higher APR. Credit remains funded by lenders, not newly created money.
- Loans & early repayment reviews the exact accrued-interest payment and future-interest saving. Material early payments improve capped credit history with cooldown and minimum-age safeguards; unaffordable, duplicate and foreign repayments are blocked.
- Optional credit fields survive reload, historical offers may be pruned without invalidating applications, and absorbed countries' pending applications are cancelled. All new wording covers English, Turkish, Spanish, Chinese and Russian.

Validation: 600 unit tests / 75 files, TypeScript and production build passed. All 111 production browser scenarios verified: full run 108 passed, three outdated menu/atlas assertions corrected and rechecked successfully. See [playtest record](docs/PLAYTEST-090.md). GitHub CI runs independently on publication. StackBlitz/WebContainer itself is not directly exercised; no new campaign is required. V3 remains conditional on complete playability.

## 0.90.0-playtest.3 — Clear markets & policies
Implementation and validation: **Codex**. Branch: `dev/clear-command-090`. Save schema stays 17.

- Successful commodity orders show the purchased/sold amount, actual all-in debit, current treasury and green incoming cargo or vault holdings. Physical reserves stay unchanged until cargo arrives; sales show pending proceeds payable on the next game day. Failed and duplicate orders retain their explanation without reporting another gain.
- Supply contracts use five desktop columns for 15 goods, centered artwork, readable stock counts and red zero-stock warnings. Positive stock below the existing protected-reserve threshold is marked low. Hover and keyboard focus highlight choices. Direction, partner, quantity and term share one desktop row and the panel background; narrow screens wrap controls and tiles.
- Trade partners show all 19 goods in two desktop rows, with readable names and hover/focus feedback, replacing horizontal scrolling. Remove the redundant World prices section; live quotes remain in all trading screens and the shared selector remains available to other callers.
- Add Policies to the country menu. Move the existing reviewed tax control out of Economy/Overview, show current budget and provide the existing ministry-budget route. Foreign policies remain read-only. No new tax formula, balance or gameplay command is introduced.
- Review new wording in Turkish, English, Spanish, Chinese and Russian. Preserve prior releases, save compatibility and the dependency graph.

Validation: 582 unit tests, TypeScript/production build and 98 production-preview browser scenarios passed; see [playtest record](docs/PLAYTEST-090.md) for final focused visual checks. GitHub CI runs independently on push. StackBlitz/WebContainer itself is not exercised by local Chromium tests.

## 0.90.0-playtest.2 — Market & window hotfix
Implementation and validation: **Codex**. Branch: `dev/clear-command-090`. Save schema stays 17.

- Restore the missing Commodity Exchange review dialog. Both allowed and blocked orders open a review; blocked orders list the engine reasons and cannot be confirmed. Successful purchases use the existing typed command, receipt and duplicate-submit guard.
- Load Help, Supply, credit and industrial-contract panels with the startup graph instead of fetching these frequently used panels when clicked. Other lazy panels keep bounded retries and local recovery. Floating loading indicators, scroll-free focus restoration and a non-scrolling root prevent tool transitions from moving the page.
- Fit draggable tool frames between visible rails, including resize and dragging. Right-side tools start beside the right rail; mobile Map/Help buttons stack vertically to leave room for content. Confirmation and national-decision dialogs remain centred. Mobile market icons sit above wrapped labels so long credit titles stay inside their buttons.
- Move the single national shortcut below the top-right flag, with country, regime, visible opening hint and selected state. Tutorial targeting and its five-language budget lesson follow this shortcut.
- Use **Türkiye**, **North Macedonia** and **Eswatini** in country data. Known historical names in existing saves refresh without changing IDs or custom names; setup search accepts Turkey/Turkiye and Macedonia aliases. Names checked against [UN membership](https://www.un.org/en/about-us/member-states) and [Türkiye's UN record](https://www.un.org/en/about-us/member-states/turkiye).
- Give the supplier finder a separate title/description column, replace the credit section's outline icon with treasury artwork, increase national-event option titles and consequences, and remove Help's obsolete 0.83 label.

Validation: **578 unit tests / 73 files**, TypeScript and production build passed. **Six focused scenarios passed against the Vite development server**, including blocked/successful purchase reviews, desktop/mobile rail clearance, zero page scrolling on Supply/Help transitions, flag state and old-save naming, credit/contracts/Help without click-time downloads and readable decision options. All 90 production-preview browser scenarios passed (7.7m); final mobile-menu layout rechecked in nine focused scenarios (50.7s). StackBlitz itself is not directly exercised; the eager panels increase startup loading, while charts and larger optional windows remain deferred. No dependency or simulation-balance changes.

## 0.90.0-playtest.1 — Clear Command
Implementation, QA reconciliation and validation: **Codex**. Branch: `dev/clear-command-090`. Save schema remains 17. User-supplied Antigravity report reviewed against current code; report authorship does not imply implementation authorship.

- Replace repeated artwork logo text with a localized presidential tagline. Choose a new leadership quote on each fresh wizard opening, excluding the last stored quote; retain it while moving between steps.
- Rebuild Affairs as illustrated, bounded sections: overview, administration, integration, foreign influence and history. Show only sections appropriate to the selected country. Display actual approval/stability/military/ideology conditions, exact costs, budget shortfalls and cooldowns before action. Reviews and execution share engine-owned previews. Preparation is no longer offered for independent countries; outreach displays its actual scaled cost.
- Add Affairs to the country menu, remove the duplicate Trade Desk shortcut, distinguish war planning/readiness with a full-width red action, and make identity labels wrap without ellipsis. Refine HUD selected borders/backgrounds, remove the redundant dot and rename DIPLO to DIPLOMACY while retaining tutorial anchors.
- Add keyboard map movement, zoom, return-home and dossier opening with visible focus and instructions. Standalone integration uses the common modal lifecycle; embedded integration avoids an unnecessary extra window. Affairs transitions respect reduced motion. Exclude unrelated notices/map preferences from country-panel subscriptions; no measured FPS claim.
- Close other active fronts when a participant loses independence, including stale saved fronts. Preserve the winning outcome, release defending allies and avoid another combat round. Require the proposer to fund $5B council aid before influence/vote changes. Advance election countdowns only in democracies/republics.
- Increase the CI job budget from 10 to 15 minutes for the expanded browser suite; the previous successful run took about 9m23s. No checks are skipped.
- Translate new messages in all five supported languages. Remove the hardcoded 0.83 version from new-campaign opening news. Preserve the Market sections/artwork recovery delivered in 0.89.7; no new dependency or lockfile graph change.

Validation: 572 unit tests and TypeScript/production build passed. All 84 Playwright browser scenarios passed locally; the final visual/localization adjustments are rechecked in the nine focused 0.90 scenarios. See [playtest record](docs/PLAYTEST-090.md). [QA reconciliation](docs/QA-RECONCILIATION-090.md) distinguishes confirmed defects from obsolete and unmeasured claims. V3, audio, rendering migration, complete catalogue consolidation and deeper war AI are not part of this release.

## 0.89.0-playtest.7 — Focused markets & artwork recovery
Implementation and validation: **Codex**. Branch: `dev/trade-markets-089`. Save schema stays 17.

- Replace the stacked market landing page with six icon sections: open market, commodity exchange, sovereign credit, partners, supply contracts and world prices. Only selected content mounts; the menu remains above its own scrolling content. External credit/exchange links select the same market shell. Direct shipments and recurring contracts remain available.
- Add reusable section navigation, compact two-column mobile resource choices, and bottom spacing beneath horizontal scrollers. This starts the pattern in Market; other long game screens remain follow-up work.
- Recover exhausted shared artwork requests when a window reopens, use a fresh retry cycle URL, ignore stale load errors and time out stalled downloads after eight seconds. Administration art now uses the same resilient atlas component. Retries remain bounded and failed artwork keeps a fallback.
- Four new navigation labels reviewed in all five languages. No engine balance, dependency graph or save migration changes.

Validation: 562 unit tests, TypeScript and production build passed; artwork regressions rechecked after the fresh-URL fix. All 75 Playwright browser scenarios passed locally; desktop/mobile market screenshots were inspected. GitHub CI runs separately on push.

## 0.89.0-playtest.6 — Window flow & diplomatic recovery
Implementation and validation: **Codex**. Branch: `dev/trade-markets-089`. Save schema stays 17.

- Fix the country Trade Desk hero: separate title lines and a full-width relations/cargo row, with readable font sizes and wrapped country names.
- Extend transient module retries to all lazy panels in CommandRails, including DiplomaticPost. Keep module selection after the raw import so cache-busted named exports remain valid. Persistent panel errors get a local recovery window; manual retry recreates the rejected React.lazy loader and uses fresh retry URLs. The root campaign stays mounted. Programming errors remain visible and no page reload is forced.
- Share focus restoration, keyboard cycling, top-window Escape and bounded stacking across command/floating windows, reviews, strategic decisions, war, commander/portrait dialogs, advisor and economic advice, and national events. Mandatory events cannot be dismissed with Escape; their choices stay keyboard-accessible.
- Nested reviews keep one pause owner across confirmation → receipt and resume the prior speed only after the final owner and engine blockers release.
- Centralize page-level z-index tokens, remove conflicting forced command/avatar z-index overrides, reserve tutorial space for command/strategic windows, keep command headers on screen while content scrolls, and clamp dragged windows after resizing. Full legacy CSS cascade migration and remaining specialized windows are still open audit work.
- New recovery text is translated in all five languages. No gameplay balance or dependency graph changes.

Validation: 555 unit tests, including the 365-day invariant, TypeScript and production build passed. All 72 Playwright browser scenarios passed locally; desktop/mobile trade and tutorial screenshots were inspected. GitHub CI runs separately on push.

## 0.89.0-playtest.5 — Research & readiness clarity
Implementation and validation: **Codex**. Branch: `dev/trade-markets-089`. Save schema stays 17.

- War review puts the blocking reason at the top. Confirmation is visibly inactive with a dashed border, an unavailable label and an accessible link to the reason. Fuel, foreign-control and existing-war failures come from the same eligibility rules as the command.
- Research uses responsive illustrated cards instead of a fixed-size canvas. Saved points, cost, missing points, prerequisites, duration and active-project progress are readable. Blocked discoveries remain inspectable; starting them is still disabled.
- Research/refund previews are engine-owned. Cancellation, automatic duplicate-discovery cleanup and integration reuse one refund helper. Costs, throughput, effects and the 14-day war-fuel threshold are unchanged.
- Reviewed technology names and new prompts in Turkish, Spanish, Chinese and Russian; country-specific war titles now translate too. This is a focused review, not a claim that every old game sentence is fully reviewed.
- [Audit reconciliation](docs/AUDIT-PROGRESS-089.md) preserves Claude's original findings and identifies delivered Phases 1–3 and open Phase 4 work. No new dependencies or save migration.

Validation: 554 unit tests, including the 365-day invariant, TypeScript and production build, and all 65 Playwright browser scenarios passed locally. All five languages were tested at 1440px and 390px; desktop/mobile research and blocked-war screenshots were inspected. GitHub CI runs separately on push.

## 0.89.0-playtest.4 — Supply contracts & war readiness
Implementation and validation: **Codex**. Branch: `dev/trade-markets-089`. Save schema stays 17; existing campaigns load unchanged.

- Raw-resource import reviews now offer long-term supply agreements for 1, 3, 5 or 10 years. Monthly deliveries use a fixed unit price; payment occurs on delivery. Relations must exceed 40/100, a trade pact must be active, surplus must exist and the treasury must cover one monthly payment. The preview and all contract creation paths share the validator. Duplicate active agreements are rejected; signing replaces the same supplier's daily flow for that resource. Manage or cancel contracts in Diplomacy.
- Player and AI war declarations share a minimum of 14 operational days of **refined fuel**, matching the existing AI threshold. The war review shows current stock, required stock and shortfall; crude oil alone is insufficient. Fuel can still run out in a long war: shortages keep their combat penalties but no longer create oil/fuel popups that stop time. Existing saved oil/fuel prompts are cleared when auto assault resumes; other national decisions still pause time.
- Auto assault selects 5× and advances one campaign day per second. Tactical turn, replay and save/load tests now begin from explicitly prepared fuel stocks rather than bypassing readiness.
- Lazy panels retry transient module fetch failures twice, with a fresh URL for the known same-origin panel when the browser cached a failed request. Programming errors and persistent failures remain visible through the error boundary; there is no automatic page reload or campaign reset.
- Contract reviews use compact metrics and keep their action buttons visible while scrolling on small screens. New prompts are reviewed in all five languages. No balance rewrite or new save migration.

Validation: 548 unit tests (including the 365-day invariant), TypeScript and production build, and all 52 Playwright browser scenarios passed locally. Contract/retry and translation regressions were rechecked after the final edits. CI runs separately on push.

## 0.89.0-playtest.3 — Portrait tiles & leadership quotes (Codex)
- Setup portraits fit inside their selection cards, with softer shadows and no overlap into neighbouring tiles.
- The identity step shows one randomly selected, sourced saying from Atatürk, Lincoln or Mandela, translated into all five game languages. It uses open quotation marks and serif text without a box, and stays stable while editing or moving between steps.
- Compact money explicitly omits unnecessary trailing decimal zeros across Node/browser versions (fixes the Node 22 CI failure from the previous patch).
- Validation: 534 unit tests passed; compact-money and quote suites rechecked after the Node 22 formatting fix. TypeScript/production build and 17 targeted browser tests passed; desktop/mobile portrait and quote screenshots inspected.
- UI-only random selection; simulation rules and save schema remain unchanged. Source links live in `src/data/leadershipQuotes.ts`; translated wording is maintained by the project.

## 0.89.0-playtest.2 — Unified onboarding (Codex)
- Choose the language on the first sign-in screen; registration, the game menu and setup keep that language without repeating the picker.
- Sign-in and campaign setup share the same card size, cover image, warm palette, inputs and heading style. Mobile keeps a fixed frame with scrollable form content and visible setup navigation.
- The final review uses a compact leader strip and a full-width information grid, with a denser layout on shorter desktop screens. GDP and treasury use localized compact USD amounts (for example, $1.3T instead of $1300B).
- Save schema and simulation rules are unchanged.
- Validation: 532 unit tests, TypeScript/production build and 22 targeted Playwright tests passed; all five languages at 1440×900, 1280×720 and 390×844. Desktop and mobile final-review screenshots were inspected.

## 0.89.0-playtest.1 — Trade & Markets
- Entry/setup hotfix (Codex, 2026-10-09): restore the setup language picker and its missing import, keep mobile navigation within the viewport, and exclude decorative menu markers from accessible button names. Verified with 530 unit tests, production build and five targeted browser tests.
Playtest feedback pack: finding trade partners, a commodity exchange, and aircraft on the map. No schema change; new state (`world.flights`, `world.commodities`) is optional and 0.88 saves load unchanged.
- Trade discovery: suppliers for a good are ranked in tiers — can trade now (access and surplus), one step away (surplus, no pact, relations ≥ 20/100, so propose a pact), needs more diplomacy, and no access or surplus — then scored by surplus (35%), price (25%), relations (25%) and distance (15%). Each row gives the reason and the next step, and the actions use the existing import, order and proposal commands. Strategic Resources and a new Supplier Finder in the market show the best three first, with the rest collapsed. A new TRADE tab on the country panel and the dossier lists what you can buy from and sell to that country. The resource advisor now prefers a supplier you already have a pact with.
- Commodity exchange: food, oil, fuel, iron, coal, copper, aluminum, uranium, gold and silver trade at a daily spot price that reverts toward a fundamental price (from world stocks and consumption) with seeded volatility (gold 0.9%/day, oil 2.2%/day). Shocks from droughts, floods, pandemics, banking stress, energy windfalls, new wars in producer regions and world news headlines move prices and decay over weeks. Trading has a 1–3% spread (wider during shocks), a 0.25% fee, market impact, freight by distance, a daily order limit of 10% of world volume, a position limit of 5% of GDP and storage capacity with a yearly holding cost. Physical purchases arrive by cargo flight from the largest eligible exporter; sales are flown to the neediest importer and settle the next day; gold and silver sit in an exchange vault. AI countries buy dips and sell spikes under the same rules. The Exchange window shows a board with sparklines, a 30/90/180-day price chart with shock markers, a cost breakdown from an engine preview, limit bars, holdings with P&L, recent headlines and a link to borrow through the existing credit window.
- Flights: the engine now knows each country's position and computes great-circle distance. Diplomatic jets take 1–3 days and cargo aircraft 2–6 days. Diplomatic missions, proposals, signed pacts and alliances, accepted letters and grants send a small jet; new import deals, industrial orders and contracts, exchange purchases and aid send a cargo plane, plus one monthly cargo flight per active player trade deal. A diplomatic mission's goodwill now arrives with the delegation instead of immediately. AI-to-AI visual flights are limited to 2 per 4 days.
- Graphics: small vector jets and freighters fly along great-circle arcs with dashed routes, rotate to their heading, keep a constant on-screen size, pause with the game and move smoothly between days; an arrival pulse marks the destination. An "In transit" chip lists your flights with ETAs. The globe gains an atmosphere glow. The trade desk and exchange use resource art, flags and small bars.
- Known limits: buying below the fundamental price and selling above it is reliably profitable (about $0.8B a year for Türkiye, capped by the daily order limit). Bilateral contracts and the open listing market keep their own reference prices, so the exchange is a separate benchmark. Gold and silver trades have no counterparty country. Raw goods other than food and oil may not find AI buyers on the open listing market. Diplomatic missions now take 1–3 days to raise relations.

## 0.88.0-playtest.1 — Politics & Victory
Phase 2 of the [0.83 audit](docs/AUDIT-0.83.md), second part (B9, E1–E5). No schema change; new fields are optional and 0.87 saves load unchanged.
- AI wars (E1): AI countries can declare war under the same rules as the player (shared `warRules`). An AI attacks only with hostile relations (score ≤ −50), a target in its region, a fitting strategic goal, stability ≥ 45, at least 14 days of fuel, no pact, alliance or shared bloc, and a power ratio of at least 1.6 after counting the target's likely allies. Weekly reviews with a 20% chance, at most 3 concurrent AI-started wars, 60 days between them worldwide, 365 days between wars for one attacker and 1,095 days between the same pair. AI attackers withdraw at high exhaustion, heavy losses or a stalled front; after 150 days an uninvolved country may propose a Council ceasefire. AI occupiers return a country after 365 days. Regional rivalries now lower some AI relations so that wars can arise. A 4-year headless run saw 3–6 AI wars a year.
- Player as defender (B9): an AI declaration on the player pauses the game with a notice and opens War Command as defender; HD War works as defender; withdrawing as defender runs the full end-of-war process. If the player's home country falls, the campaign is lost.
- Allies join (E5): allies of the defender (80%) and members of its collective-security bloc (60%) may join, adding 12.5% of their military power to the defender (at most doubling it). The player is never committed automatically and is notified instead.
- Politics (E2): five factions per country (business, labour, security, traditional, liberal) with weights from the country's profile and satisfaction driven by policy, economy, ministries and war. Coalition support shifts stability by up to ±4. Elections are a seeded contest of vote shares (approval, coalition support, economy, incumbency and a bounded swing), so a narrow loss at 47% approval or a narrow win at 43% is possible; AI election dates are spread over the cycle and a defeated AI government is replaced. Autocracies, monarchies and theocracies track legitimacy and regime pressure; a crisis gives 45 days to respond (concessions to the security forces, a crackdown or reforms) before a seeded coup or mass unrest. A coup ends the player's campaign. A Politics section in the domestic window shows factions, coalition support, the election forecast or coup risk, faction concessions and crisis responses.
- Events (E3): a data-driven catalogue of 32 event kinds with conditions, weights, cooldowns and 2–3 options; all money in events now scales with GDP and option hints are computed from the same numbers. 21 new events and five chains (investigation → findings → trial; breakthrough → investment boom; grid failure → inquiry; refugee influx → integration; outbreak → second wave). Old saved events still load and resolve. About 7 events a year instead of 4–5. Advisor pop-ups share a 30-day gap: about 11 a year instead of about 42.
- Campaign victory (E4): three victory paths after day 730: Enduring Mandate (win two elections; other regimes 8 years in power with stability ≥ 60), Economic Leadership (GDP ≥ 1.25× the start, approval ≥ 50, inflation ≤ 10, held 180 days) and Regional Leadership (≥ 4 allied partners, reputation ≥ 70, no war, held 180 days). Progress shows in Goals; on victory the player can continue in sandbox mode or start a new campaign.
- Known limits: AI wars are short (about 9 days on average) and usually end in conquest, because the 1.6 power threshold rarely loses. The AI targets the player only when relations are already hostile. AI approval still drifts high, so AI governments rarely lose elections (about 8%) and AI coups are rare. Democracies have no unrest path yet. Event food and fuel amounts are still flat. A strategic goal set by an election or coup can be overwritten at the next doctrine review. The loss overlay uses one generic text for all loss reasons (the reason is in the news bar).

## 0.87.0-playtest.1 — Living World
Phase 2 of the [0.83 audit](docs/AUDIT-0.83.md), first part: economy pressure, the industrial market, diplomatic rule parity and command/save cleanup. No schema change; new fields are optional and 0.86 saves load unchanged.
- Repeated actions (C4): each domestic action builds fatigue that halves every 30 days (60 for research and education), and the next use pays `1/(1+fatigue)` of its effect. Related actions share fatigue at half weight (public events; civic campaigns; development; military research; intelligence research). Religious outreach and civic campaigns have a 14-day cooldown, research actions 30 days. Gains to approval, stability and cohesion shrink as they approach 100 (full effect up to 50, half at 75). Tax above 30% costs a further 0.003 approval per point per day. In a 2-year headless run, 60% tax plus daily activity spam now ends at 37 approval / 72 stability (was 99 / 100); moderate play ends at 96 / 91.
- GDP-scaled costs (C15): flat $B costs for missions, pacts, alliances, blocs, research, outreach, campaigns, programmes, activities, letters, embassies and infrastructure are scaled by GDP relative to Türkiye's opening economy (between 0.02× and 20× the base). The AI pays the same prices. A diplomatic mission to the same country is possible once every 30 days, with fading goodwill on repeats; it is refused during war.
- Industrial market (C10–C12): one reference price table for raw and industrial goods. At reference conditions every facility's output is worth at least 1.3× its inputs and upkeep, so refineries and steelworks add value and mines cover their upkeep; mine upkeep follows deposit grade. AI buyers accept sales only up to a real shortfall, at most 5% of their treasury per shipment and contracts of at most 3 years; deliveries to an AI with no current need are declined. The AI builds industrial parks only toward a GDP-based factory target, and a finished park adds a bounded GDP gain. AI park construction fell from 273 to 63 in the first year of a headless run. C13 (idle lines gaining efficiency) was confirmed fixed.
- Diplomacy (D8, D12): one rule set for agreements. The player's commands, letters and offers and AI-to-AI diplomacy share eligibility, GDP-scaled fees, acceptance odds and a 14-day retry after a rejected proposal; the AI still never signs anything with the player without consent. Intelligence success and detection use separate seeded rolls. Finished intelligence operations are pruned to the 24 most recent. An alliance below 50/100 or a non-aggression pact below 25/100 gets 14 days to recover and then ends, with notices.
- Commands and saves (A5, A6): facility toggles, contract cancellation, tutorial steps, inbox reads and notice dismissal run as engine commands instead of store-side edits. Save migrations use a per-version step table; saves older than schema 12 or newer than the game are refused with a warning, and the final migrated state is validated again.
- Known limits: moderate play still drifts toward ~96 approval because nothing pulls approval back down; event-option costs, occupation actions and power plants are not GDP-scaled yet; steel can still trade below the iron it uses in a glutted market; base-mineral deposit potential is stuck at 0.15 for every country (data issue); intelligence operation costs are flat.

## 0.86.0-playtest.1 — HD War Playback
Builds on 0.85 HD War v2. No save schema change: battles gain an optional RNG state, and 0.85 saves load unchanged.
- Playback: replaying a round now steps through its recorded action timeline on the board. Groups move one action at a time, and the board shows hit and miss bursts, casualty counts, destroyed groups and depot captures. Controls: play/pause, previous and next step, 1×/2×/4× speed and skip to result. The round log highlights the current step. With reduced motion, playback opens at the result without animation. Playback only reads recorded actions and never resolves combat. Rounds migrated from 0.83/0.84 have no timeline and play as a single before/after step.
- Battle RNG stream: combat rolls in a tactical battle come from the battle's own stream, which starts from its seed and is saved with the battle. World events can no longer change a battle's dice, and a battle no longer consumes the world stream.
- Tactical AI: each group proposes scored options and the AI takes the best ones that fit the command budget, one per group, under the same validator as the player. In order of priority it holds a depot under threat, bombards visible enemies (above all on depots), takes an open depot, contests an enemy-held depot, then advances.
- Known limits: effects are glyph and CSS animations, not sprites or 3D. Simultaneous actions play one after another in a fixed order (attacker orders, defender orders, then losses and captures). The AI still plans one round at a time without a multi-round plan. AI countries still never declare war (B9/E1). Phase 2 items remain open.

## 0.85.0-playtest.1 — HD War v2
Phase 3 of the [0.83 audit](docs/AUDIT-0.83.md) (HD War foundation) plus the first Phase 2 economy item. Save schema 17: 0.84 saves (schema 16) migrate automatically, and an open 6×6 battle keeps its board, units and recorded rounds.
- Battlefield: new tactical battles use a 10×8 board with five force groups per side (two infantry, two armor, one artillery) and two supply depots. Terrain comes from a battle seed and, like deployment and the depots, is point-symmetric through the board centre, so neither side starts on better ground. The two deployment columns on each edge stay open.
- Depots (audit B5): a side holds a depot only while one of its groups stands on it and no enemy group is adjacent. Reaching a depot first no longer locks it for the rest of the battle. Each held depot adds combat power; the map marks friendly and enemy holders.
- Position matters: groups in contact with the enemy (adjacent, or within three sectors for artillery) count fully; groups far from the fighting add less power and take fewer losses. Campaign losses are split across a side's groups, with groups in contact taking a double share and bombarded groups half again. National and group losses stay reconciled.
- Action timeline: every resolved round records moves, blocked moves, holds, recon, bombardment hits and misses, casualties per group, destroyed groups and depot captures. The round result shows this log. Future playback and animation will read these records and cannot reroll combat.
- Auto-resolve parity (audit B8): auto-resolve and legacy assaults commit the same 25% of national forces per round as a tactical battle. Losses per round are on the same scale in both modes, so auto-resolved wars now last several times more rounds than in 0.84 and use proportionally less fuel per round.
- Reliability: error boundaries at the app root and around HD War. A render error now shows its message with Try again and Return/Reload actions instead of a blank page.
- Economy (audit C4, first part): debt now carries interest (3% a year plus up to 5% by debt-to-GDP leverage). Tax rates above 25% dampen productive growth by 1% per point, down to 70% of normal growth.
- Saves: tactical validation checks every sector reference against the battle's own grid and reconciles group losses per role. The validator also accepts the numbered group ids of v2 battles.
- Known limits: the battle seed drives terrain only; combat rolls still use the shared world RNG stream. The round log is text; animated playback is not built yet. The AI moves greedily toward the nearest open depot and does not yet coordinate groups. AI countries still never declare war, so the player-as-defender path (B9) is only covered by unit tests. The C4 activity-repetition limit and the remaining Phase 2 items are still open. The blank page reported in a 0.84 StackBlitz preview was not reproduced; if it recurs, the new boundary shows the error text to report.

## 0.84.0-playtest.1 — Stable Command
Stabilization release driven by the full 0.83 audit ([docs/AUDIT-0.83.md](docs/AUDIT-0.83.md)). No new save schema: added fields are optional and schema-16 saves load unchanged.
- World balance: oil shortage is now measured in days of reserve, counting contracted imports and exports, and consumption scales with economic size. Food output has a per-capita floor just below consumption, so populous states are mild food importers instead of starving. Infrastructure and small-economy facility upkeep scale with GDP. AI importers pick the most urgent need not already covered by a deal, add a second supplier when one deal does not close the gap, and spread purchases across sellers. AI countries in a deep power outage can build up to three plants at once.
- Four years with no player actions, 0.83 → 0.84: AI median approval 0 → 75; bottom-decile AI approval 0 → 64; countries in oil shortage 184 → 10; countries with treasury below $1B 144 → 28; China 0 → 81; India 0 → 55.
- A passive player still loses, because the player must secure oil imports. One trade pact plus one oil import keeps a default campaign healthy through its first election.
- Politics: stability drifts toward a target driven by approval, cohesion and ministry support, instead of climbing while approval collapses. Events use a seeded pressure-weighted pick with a 60-day per-kind cooldown, so earthquakes, inflation and health events now occur. War weariness requires an active war. The food crisis fires ahead of the shortage threshold. Unknown or unaffordable event options are refused.
- World and AI: Global Council sanctions expire after 365 days. A ceasefire needs an active war, and humanitarian-aid support depends on relations. AI no longer signs trade pacts with the player without consent, no longer piles every import onto one seller, and no longer runs a random tax walk; its stabilize goal now lowers tax. Occupation records reset when control ends. Iron/uranium advice no longer shares the inflation suppression key. Productivity has one cap of 100.
- War: holding still no longer wins. Defender base exhaustion only accrues under attack, and victory requires an attacking round. Collapse thresholds use war-start strength, so tiny militaries no longer fall in round one. War cannot be declared on annexed or controlled states. Legacy assaults respect pending national decisions. Missed bombards no longer penalise the target. The HD War button no longer logs a spurious "auto assault halted".
- Commands: non-finite numeric command fields are rejected (e.g. a NaN tax rate). Multi-year industrial orders are now recognised as applied and deduplicated.
- Saves: autosaves are per campaign, keeping the newest 5 per account, so a new campaign no longer overwrites the previous one. Saves are validated before writing. StrictMode no longer makes every autosave fail once. The game flushes a save when the tab is hidden or closed.
- Performance: the industrial tick no longer copies the world map per facility, and exchange prices are computed once per AI market pass. Median headless tick time is about 66 ms → 19 ms. The app shell subscribes only to the player's ISO code, the world map is memoized and no longer remounts every path on drag, and economic charts update in place.
- UI and language: the integration review no longer opens hidden behind its overlay, which had left the game paused. The map shows a retry when country data fails to load. The page `lang` follows the chosen language. Victory quotes show a translation to non-Turkish players. Machine-translation artefacts were removed from es/zh/ru/tr (HTML entities, subtitle markup, nonsense phrases, repeated words), and a regression test guards them.
- Repository: about 3.0 MB of unreferenced assets removed from `public/`, stale `dist/` untracked, `CLAUDE.md` working rules added, and new regression suites (war, economy, politics, persistence, i18n artefacts, integration) plus a 365-day long-run invariant test.
- Known limits: a player who signs one oil import climbs steadily to about 95% approval over four years, so tax, activity and debt pressure still need tuning (audit C4, Phase 2). The tactical depot can still be locked by whichever side reaches it first (B5, planned for HD War v2). Auto-resolve and tactical combat still use different loss scaling (B8).

## 0.83.0-playtest.3 — Guided Play
- Rebuilt README around the current release, added recent patch summaries and retained milestone history, removed obsolete 0.40 run/save instructions, and documented the per-release update checklist.
- Added sign-in/create-account screens, random math checks and account-free Demo entry. Local demo profiles use salted password hashes; online identity/email verification is explicitly not connected.
- Added a New game/Continue menu with compatible-save detection, device-local account save namespaces and legacy guest-save continuity. Paused/unmounted the campaign behind entry screens and preserved autosave ownership.
- Added guided tactical plan handoff and round-result choices for next turn, replay, withdrawal or map. Next turn advances one campaign day and directs blocked players to national decisions; combat remains simultaneous and deduplicated.
- Updated tactical cards, status guidance and scrollbar presentation for desktop/mobile. Added multi-action shared dialogs.
- Added shared bounded image retries with recovery on focus/online and a manual retry control. Extracted existing leader/cover WebP pixels from SVG wrappers without changing the artwork.
- Added all five language labels for entry, validation and guided turns; added local-account, image-recovery and guided-turn regressions.

## 0.83.0-playtest.2 — Clear Command
- Separated pending diplomatic letters from a persistent history tab; accepted/rejected outcomes use green/red borders and explicit status labels. Existing resolved records move automatically without save migration.
- Fixed supply icons overlapping stock totals, localized supplier captions and aligned supply/advisor trade eligibility with the shared 20/100 trust rule.
- Strengthened the game-speed control, centered single-action receipt/profile footers, and added subject artwork to shared reviews/results.
- Added paper/pen signing presentation to recurring supply contract receipts, clearer monthly-payment/cancellation terms and translated whole duration labels. Existing delivery and billing rules remain authoritative.
- Completed static translation gaps across Turkish, Spanish, Chinese and Russian, added cross-language dynamic news templates and value-safe formatting, preserved existing translations, and reviewed key contract/credit/energy/history wording. Simplified selected English explanations. No online translator or model is shipped.
- Added placeholder/news regressions and production-browser checks for five-language history, supply geometry, stronger speed text and desktop/mobile contract receipts with reduced motion.

## 0.83.0-playtest.1 — Tactical Command
- Added a playable 6×6 battlefield with allocated infantry/armor/artillery groups, a three-point command budget, fuel reviews and simultaneous AI orders under the same validator.
- Added movement/path/visibility constraints, recon, terrain defense, forward flanking, prepared reserves, targeted artillery and a supply depot objective. Existing national strength, supply, exhaustion and victory rules remain authoritative.
- Routed tactical auto assault through the same engine and retained up to 60 round events for movement replay without repeated casualties or new RNG draws.
- Added schema-16 save migration and deep validation for tactical groups/events and economic history; kept existing reviewed-command deduplication and one-round-per-day safeguards.
- Added up to 180 actual national economic observations, lazy Chart.js GDP/treasury/inflation/net-change charts, range controls and an accessible data table.
- Added responsive keyboard/touch controls, reduced motion, Turkish feedback/help and explicit defender-withdrawal consequences. Preserved old war records when redeclaring on the same day.
- Deferred PixiJS/3D rendering until measured need; V3 remains the later complete-playability milestone.

## 0.82.0-playtest.6 — Credit feedback and trade trust
- Unified market filter labels; credit reviews now share engine validation, show cash/GDP/offer limits and quantified shortfall, and offer an affordable lending amount.
- Stopped strategic confirmation from overwriting command receipts or treating a posted diplomatic letter as a failed action.
- Tutorial spotlights reveal controls clipped by scrolling windows, including the World panel close button.
- Above 50/100 relations now read Good; eligible trade acceptance rises at that threshold. Trade requests below 20/100 explain the missing trust and missions/aid needed to improve it.
- Active pacts below 20/100 receive a saved 14-day recovery period, player warnings and bilateral shipment cancellation if trust stays low. Restoring 20 clears the risk.
- Added acceptance estimates, points-to-Good, clearer rejection reasons and Turkish feedback/news coverage.
- Updated the HD War roadmap for a bounded turn-based tactical slice; the battlefield is not enabled and no rendering dependency is added.

## 0.82.0-playtest.5 — Nation setup polish
- Matched nation preview, statistics, opening profile, confirmation cards and inactive steps to the charcoal/gold onboarding palette.
- Added localized, accent-insensitive country search with English names and country-code aliases, localized sorting, empty-result feedback and clear search.
- Added accessible search naming and selected-country button states.

## 0.82.0-playtest.4 — Tutorial, proposal tracking and artwork hotfix
- Reserved a compact bottom tutorial area; shortened open windows and review dialogs to keep close controls and content clear. Separated acknowledgement and navigation buttons.
- Added sent/received proposal filters, pending/retry status and inline help. Both inbox and country diplomacy detect pending, incoming, active and cooldown proposals before reopening confirmation.
- Shared proposal availability with engine command receipts; no repeated proposal or fee while pending. Clarified that outgoing fees apply only on acceptance.
- Served the existing resource/civic/navigation atlas pixels as native WebP instead of nested SVG images; added a visible load-failure fallback.
- Extended browser regressions for tutorial controls, proposal retries and loaded supply/world artwork.

## 0.82.0-playtest.3 — UI hotfix
- Reserved explicit setup navigation and save-tool rows so Continue cannot spill below the footer.
- Put navigation rails behind national/floating windows, keeping tutorial construction targets clickable.
- Rebuilt the map dock with an integrated close header and a bounded scrolling body.
- Removed the forced profile footer background and let full campaign dates wrap.
- Added browser checks for unclipped setup buttons, window hit-testing and plain profile footer surfaces.

## 0.82.0-playtest.2 — Onboarding layout patch
- Fixed the setup frame dimensions across steps and language changes.
- Matched country-list scrollbars to portrait selection and bounded desktop list height.
- Kept national summary information visible with a compact responsive layout.
- Fixed selected nation secondary-text contrast and added a visible setup release identifier.

## 0.82.0-playtest.1 — Reliable Command
- Added validated schema-15 save migration, compatible-record fallback, retryable autosave and direct setup loading.
- Routed reviewed commands through bounded persisted confirmation identities and retained tutorial construction identity.
- Added daily research work, campus capacity, shared AI rules, completion effects and unfinished-work refunds.
- Added 200 dated NEWS reports with Turkish historical rendering.
- Added player-country location beside zoom, resource-specific supply popups and Buy actions; removed the duplicated national supply board.
- Moved Goals right and grouped Map/Help bottom-right; fixed Help pressed state and added colored civic/diplomacy/world artwork.
- Split heavy UI modules, narrowed panel subscriptions and added production-browser regression coverage. See docs/PLAYTEST-082.md for verification and remaining debt.

## 0.76.0-playtest.1 — Decisions & World Institutions
- Added factory investment review, before/after capacity, input/power/upkeep previews and timed construction cancellation with an explicit partial refund.
- Added advisor pact/contract review, locked-price monthly payment summaries, duplicate contract protection, diplomatic settlement checks and visible command receipts.
- Added actionable Low Relations explanations and direct diplomacy navigation, plus infrastructure investment review.
- Generated a 25-tile resource/industry/military illustration atlas and integrated colorful thumbnails across market, supply and equipment views.
- Fixed geographic surface delivery/rendering using a local embedded satellite SVG and standard image layer with visible terrain fallback; added continuous-score Relations map colors.
- Added persistent ten-step English/Turkish onboarding, context navigation and HELP replay.
- Added simulated UN/WHO/Security Council applications, achievement gates, five-day member votes, membership benefits and public diplomacy research.
- Added attack debates, player voting, AI ballots and condemnation when a rejected attack proceeds, including attacks begun while voting is open.
- Added probabilistic voluntary religious outreach, small normalized demographic shifts and target cooldowns.
- Migrated campaign schema 12/13 to 14; verified 133 tests, production build and browser flows. See docs/PLAYTEST-076.md.

## 0.75.0-playtest.1 — Open Command
- Replaced the full-width HUD with floating commander/indicator and date/speed islands.
- Added a lighter slate interface, softer vignette, brighter geographic surface, responsive layouts and shared supporting surfaces.
- Added explicit amber open/selected states, accessible pressed states, shorter rail labels and a national-panel close control.
- Generated and bundled 20 realistic painted leader portraits in four cosmetic clothing styles, with filters in onboarding and the existing profile picker. Stable portrait IDs retain save compatibility.
- Normalized wheel/trackpad input, coalesced camera updates per frame, anchored flat zoom to the cursor, bounded panning and expanded zoom limits.
- Added persistent local zoom-speed preference and always-available camera controls.
- Verified 113 tests, production build and browser interactions/layouts. See docs/PLAYTEST-075.md.

## 0.74.0-playtest.1 — Industry & Living Diplomacy
- Fixed active national-command tab contrast; selected text stays readable on a dark active surface.
- Refreshed all 20 bundled vector portraits with shaded faces, tailored clothing and more detailed features.
- Added citizenship independent of the commanded nation and optional validated date of birth in onboarding and profile settings.
- Added a persistent UTC campaign calendar beginning 1 January 2026, shown in the HUD.
- Added once-per-year birthdays: approval >=65 and stability >=50 grant +12% agricultural/industrial production for seven days.
- Friends and rivals send deterministic birthday and performance correspondence to the diplomatic inbox, with read state and bounded message history.
- Added 13 industrial-market goods alongside the original four commodities: fresh water, coal, copper, silicon, aluminum, rare earths, rubber, armor plates, engines, electronics, steel, fuel and armored vehicles.
- Added supply/demand prices, stock-protected imports/exports, real treasury settlement and 1/3/5/10-year monthly supply contracts with locked unit prices, failed-delivery tracking and diplomatic restrictions.
- Defense exports require both a trade pact and an alliance; traded armored vehicles transfer real military equipment reserves.
- Added national water/resource potential, finite mineral deposits, eleven investable facilities, construction queues, operating costs, pause/resume and actual input bottlenecks.
- Industrial parks add five factories and a refinery; mines and waterworks grow production; factories consume metals, fuel and power to create components.
- Tank production now consumes two armor plates, one engine and one electronics module per vehicle, with existing steel/fuel/power needs and a research prerequisite. Imported components can satisfy assembly needs.
- Expanded the existing research tree to seventeen programs and exposed prerequisite connections in a grouped development interface.
- AI nations research, invest and trade through the same industrial systems without flooding the player's reports.
- Geographic view uses a bundled NASA Blue Marble surface, reprojected for Globe/Flat while retaining sovereign selection and map labels.
- Save schema v13; existing v12 campaigns migrate automatically, retaining equipment, infrastructure, wars and prior systems.

## 0.73.1-playtest.2 — Cartography & Decision Review Follow-up
- High-impact decisions (war, alliance, embargo, bloc, treasury/resource aid) always require confirmation, including with stale skip preferences.
- Added Escape cancellation, dialog semantics, keyboard focus containment/restoration and duplicate-confirm protection.
- Added exact resource shipment/reserve and bloc establishment cost previews; bloc buttons expose actual prerequisites.
- Repeated treaty commands no longer charge treasury or grant goodwill twice.
- Visible microstate targets take precedence over neighboring simplified polygons; hidden markers cannot intercept clicks.
- Focus uses registered microstate positions even without polygons; added Luxembourg, Qatar, Cyprus and Brunei anchors.
- Microstate labels now share country/ocean collision suppression; selected edge labels stay within the map.
- Added 85–140% map label sizing; label priority now uses projected land area rather than bounding rectangles.
- Corrected click coordinates on letterboxed SVGs, flat-map drag distance at higher zoom, and zoom centering after focus.
- Removed duplicate React shape/label keys for multipart sovereign profiles.
- Cached projected geometry to avoid recomputing paths on hover and simulation ticks.
- Repaired missing optional dependency lock entries for clean npm ci installations.
- Save schema remains v12; 0.73 campaigns remain compatible.

## 0.73.1-playtest.1 — Cartography & Interaction Stabilization
- Rebuilt country labeling into a collision-aware screen-space cartography engine instead of scaling text with map geometry
- Flat-map zoom no longer magnifies country names into unreadable giant labels
- Added priority-based label placement using projected country area, player/selected/hover priority and population weight
- Added progressive zoom thresholds and maximum visible-label budgets; large states appear first and smaller states reveal as the player zooms in
- Selected-country labels are forced through collision resolution and displace lower-priority labels
- Ocean/sea labels now participate in the same decluttering pass instead of freely overlapping country labels
- Added non-scaling map borders for calmer Flat projection zoom behavior
- Corrected invalid [0,0] microstate coordinates for Andorra, Micronesia, Sao Tome and Principe, and Vatican City
- Microstates now use screen-pixel hit testing with enlarged click targets, making tiny states and island countries selectable without giant fake geometry
- Added regression tests preventing zero-coordinate microstates from returning
- Rebuilt left command rail sizing/alignment so long labels such as RESOURCES remain centered and do not spill out of buttons
- Added category color language to right information rail and diplomatic action icons
- Added shared Strategic Decision confirmation framework for diplomatic missions, embassies, trade pacts, non-aggression pacts, alliances, embargoes, strategic blocs, treasury aid, resource aid and war declarations
- Strategic Decision modal includes national flags, themed visual emblem, treasury/relationship/strategic impacts and contextual warnings
- Trade-pact previews explicitly warn when hostile rivals may react negatively
- High-impact decision modals pause the simulation and resume the player's previous speed when closed
- Added optional per-action 'automatically approve similar decisions this session' behavior; preference applies only after the current action is confirmed
- Added relationship gating directly to Trade Pact, Non-Aggression and Alliance buttons instead of allowing a doomed confirmation flow
- Resource supplier PACT shortcuts now use the same confirmation framework and expose low-relationship gating
- War declarations now require a consequence preview showing relationship collapse, reputation loss and trade cancellation
- Added another targeted typography debt sweep across diplomacy, advisor, event, command-window, supply and floating-tool interactive text
- Save schema remains v12; existing 0.73 campaigns remain compatible
- Added dedicated cartography, microstate and strategic-decision regression tests

## 0.73.0-playtest.1 — Command Architecture & Logistics Foundation
- Rebuilt the strategic HUD around a governance-first command hierarchy
- Top HUD now prioritizes Treasury, strategic Budget/Day, Approval and Stability; raw resource clutter moved into a dedicated Resources command window
- Budget/Day now includes infrastructure maintenance and production operating costs in addition to the base economy forecast
- Added left-rail MAP and RESOURCES command tools; map controls no longer float permanently over the map
- Removed the legacy bottom-right MAP trigger and consolidated Layers, Political/Geographic, Globe/Flat, Zoom, Focus and Reset inside the left MAP command
- Added Strategic Resources command window with reserve days, self-sufficiency, best suppliers and direct Pact/Import actions
- Added persistent national infrastructure state for every country: Roads, Rail, Ports and Supply Hubs
- Added infrastructure maintenance, degradation when underfunded, player investments and monthly AI investment behavior
- Connected infrastructure throughput directly to Supply Command and warfare supply calculations
- Expanded Supply Command with an Infrastructure tab, national throughput, bottleneck, maintenance and investable network assets
- Added colored visual language for Overview/Economy/Production/Diplomacy/Military/Intel/Cabinet/Tech/World/War icons and active states
- Enlarged and upgraded campaign nation-selection rows for readable country name, flag, region/regime and capability data
- Increased readability floors in dense Intel, Cabinet, Tech and World UI surfaces
- World Command footer now reports player map layer, presentation and Globe/Flat projection state
- Save schema bumped to v12 for infrastructure persistence
- Added infrastructure tests covering initialization, treasury cost, maintenance, supply impact, warfare impact and silent AI investment
- 0.73 is intentionally a broad foundation build; next step should be one focused hotfix/playtest pass before additional major systems

## 0.72.1-playtest.1 — Strategic UI / Map Readability
- Increased sovereign country-label readability with zoom-aware 11–14px sizing and stronger map contrast
- Increased selected-country label prominence while keeping dense regions controlled with revised reveal thresholds
- Removed the redundant bottom-center PLAYER / map-state chip from the map surface
- Moved player/map-state context into the right side of the WORLD COMMAND CHANNEL / SITREP footer
- Reworked National Command into a viewport-safe panel with maximum height, internal vertical scrolling and no horizontal overflow
- Widened National Command on desktop so Production, Diplomacy and War content have more breathing room
- Rebalanced the ten country tabs into a 4+4+2 layout; WORLD and WAR are centered instead of being pushed to the far-right edge
- Strengthened Declare War and operational-assessment wrapping so long country names and war content remain inside the panel
- Repositioned strategic map modes into a compact bottom-left MAP LAYERS command card inspired by clearer grand-strategy HUD hierarchy
- Map Layers now uses grouped 2-column controls and retains the current selection notice without occupying the top-left map surface
- Adjusted right command rail spacing to track the wider National Command panel
- No save-schema change; schema v11 remains compatible with 0.72 campaigns

## 0.72.0-playtest.1 — Production / Industry & Equipment
- Added persistent national production state for every sovereign country
- Added six equipment classes: infantry equipment, artillery, armor, fighters, logistics equipment and naval equipment
- Added deterministic daily production lines with factory allocation, efficiency growth/decay and daily output
- Manufacturing consumes real steel, fuel, electricity and treasury inputs
- Added throughput and bottleneck detection for steel, fuel, electricity, treasury and factory capacity
- Added military-factory share policy (25–80% of usable factories)
- Added strategic equipment stockpiles and deployment actions that reinforce active military forces
- Added Production tab to National Command with stockpiles, production lines, inputs, efficiency and factory controls
- Added AI production allocation; AI countries rebalance factories every 14 days according to strategic goals
- Connected strategic equipment reserves to warfare combat sustainment
- Added production reserve score to reflect the depth of national replacement capacity
- Save schema bumped to v11 for persistent production state
- Added dedicated production tests covering throughput, shortages, factory caps, deployment, reserve effects and AI allocation

## 0.71.1-playtest.1 — Commander UX
- Moved SAVE / LOAD / NEW out of the permanent top HUD and into a commander campaign-options center
- Clicking the top-left commander portrait now opens Commander & Campaign options instead of immediately showing avatar presets
- Added commander identity card, nation flag, campaign day, speed, treasury and GDP summary to the options center
- Added manual Save, Load Latest and New Campaign actions inside the options center
- Added confirmation guard before starting a new campaign
- Rebuilt avatar editing as a separate viewport-safe portal with portrait preview and explicit APPLY PORTRAIT action
- Avatar selection no longer changes instantly on first click
- Fixed profile/avatar modal clipping with viewport max-height, internal scrolling and responsive layouts
- Simplified the permanent top HUD so speed controls and national identity have more breathing room
- Kept 0.72 reserved for the upcoming Production / Industry & Equipment major build

## 0.71.0-playtest.1
- Added Living Diplomacy foundation with persistent embassy missions and incoming diplomatic offers
- Added player and AI embassy creation; embassies improve relationship growth and reduce bilateral trade friction
- Added Diplomatic Inbox rail with embassy/trade proposals and accept/decline actions
- Reworked domestic events into pressure-based weekly agenda checks instead of frequent random popup rolls
- Added earthquake, public-health, tax-protest, reform-demand and foreign-policy backlash event categories
- Added variable post-event cooldowns so campaigns can have quiet periods or clustered political pressure
- Added zoom-aware country labels for sovereign states; smaller countries reveal progressively with zoom
- Added national flags to observed-country command cards
- Added unified line icons to country-panel tabs and diplomatic actions
- Completed another readability sweep across advisor, alert, event, map and floating-window microcopy
- Save schema bumped to v10 for embassies and diplomatic-offer persistence

## 0.70.0-playtest.1
- Standardized UI typography with reusable readable font scales
- Portaled Strategic Dossier and Supply Command above panel clipping and stacking contexts
- Rebuilt campaign setup as a four-step wizard: name/language, portrait, nation, final confirmation
- Added animated command-transfer / first-day-in-office transition before campaign start
- Added MA3-style 0–100 Relationship Index and stance bands
- Added treasury grants and strategic resource aid as bilateral goodwill actions
- Trade pacts and successful trade deliveries now improve bilateral relations
- Cooperation with a country’s hostile rival can damage third-party relations
- Added dedicated diplomacy panel with relation meter, treaty context, aid tools and trade flows
- Expanded typography/readability across dense HUD, panel, rail and modal surfaces

## 0.62.0-playtest.1
- Replaced fragile event image URLs with bundled inline SVG event illustrations
- Added unique visual scenes for food, inflation, war weariness, corruption, fuel and intelligence crises
- Increased global HUD and national-command typography for readability
- Replaced tiny bottom-left market, pulse and objectives ribbons with left/right command rails
- Added badge-driven Objectives, Market, World Pulse, Resource Alerts and SITREP tools
- Added persistent draggable command windows that remain open until dismissed
- Added larger event decision cards and consequence text
- Preserved 0.61 map dock, ocean labels and open-water deselection

## 0.61.0-playtest.1
- Enlarged Strategic Objectives panel for practical playtest readability
- Moved Political/Geographic, Globe/Flat, zoom, focus and reset controls into a MAP popover docked to SITREP
- Clicking open water now clears country selection
- National Command panel disappears when no sovereign state is selected
- Added dark navy ocean treatment with softer globe graticule
- Added contextual labels for oceans and regional seas
- Preserved sovereign surface selection and expanded map zoom controls

## 0.60.0-playtest.1
- Added campaign onboarding: commander name, 20 leader portraits, language and country selection
- Added English, Turkish, Spanish, Chinese and Russian core UI localization
- Added player avatar editing from the top-left HUD
- Added national flag identity and country-driven UI accent themes
- Added political/geographic base-map presentation modes
- Added geographic biome textures for plains, forest, desert, mountain, urban and coastal terrain
- Expanded globe and flat-map zoom ranges, plus +/- and focus controls
- Added preferred-speed memory so event/advisor pauses resume the player's last speed
- Added adaptive resource advisor with friendly supplier recommendations
- Added 1/3/5/10-year fixed-price monthly supply contracts
- Bumped save schema to v9

## 0.50.1-playtest.2
- Added geometry-based sovereign territory selection instead of marker-first selection
- Reduced microstate debug labels; full names reveal only on hover/select/high zoom
- Added Strategic Dossier command window with radar visualization
- Added Supply Command window with flow network, reserves and front logistics views
- Unified warfare supply calculation with the national supply network model
- Increased national command panel typography and information density

## 0.50.0-playtest.1
- Promoted Living World branch to the first integrated playtest build
- Added in-game playtest objectives with live completion tracking
- Added World Pulse HUD and autonomous AI-to-AI diplomacy
- CI release gate green after gameplay, performance and build checks

## 0.40.0
- Added Cabinet ministries and daily ministry effects
- Added Technology Tree v1 and research-point economy
- Added processed fuel, steel and electricity
- Switched combat logistics from raw oil to fuel
- Added Alliance Bloc v1
- Added Global Council v1
- Added Visual Pack 1 and ministry artwork
- Added Foundation Pack 1 documentation and schema-v7 save guard

## 0.31.0
- Strategic resource specialization and dynamic market
- Flat map pan/zoom and 5× clock speed
- First command-interface visual pass

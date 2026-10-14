# Rule of Nations (RON) — 0.94.0

Rule of Nations is a browser-based geopolitical grand-strategy prototype built with React, TypeScript, Zustand, D3 Geo and Dexie. Lead a country through its economy, resources, diplomacy, development and military conflicts. Chart.js provides economic charts; Vitest and Playwright verify gameplay and browser flows.

## Current release

| Item | Current state |
|---|---|
| Version | **0.94.0 — Audio, UI & Character Perks** |
| Development branch | `dev/ron-phase7` (development release; not merged into main) |
| Save schema | 17; optional leader archetype metadata, old records retain neutral gameplay; existing migrations unchanged |
| Validation | 909/909 unit tests / 97 files; TypeScript and production build passed, zero build errors; 365-day invariant passed; 8/8 targeted production-browser scenarios passed. Full browser/native macOS suites were not rerun for 0.94. [Validation record](docs/RELEASE-094.md) |
| V3 | Reserved for the complete-playability milestone; the current plan builds on the existing engine |

These details describe this development branch. Another branch, including `main`, can contain an older release. Check `package.json` and your checked-out branch when comparing previews.

## Run and play

```bash
npm ci
npm run dev
```

At Sign in, choose **Demo** to play without an account. **New game** opens leader and country setup; **Continue** loads the latest compatible save for the current local account. Existing saves from before demo accounts remain available through **Demo → Continue**. Incompatible saves are skipped; compatible saves do not require a new campaign.

Demo accounts and saves stay in this browser on this device. Username/password entry and the random math question are local demo features. Online authentication, verified email, cloud saves and server-side bot protection are not connected.

```bash
npm run check
npx playwright install chromium
npm run test:e2e
```

`check` runs tests, TypeScript checks and the production build. Browser tests run separately against the production preview. Optional `npm run measure:engine`, `npm run measure:browser` `npm run measure:renders` (React render attribution on a profiling build) and `npm run measure:war` (paired war-balance scenarios) write local performance reports; run browser measurements separately from other builds/tests. See [measurement method](docs/PERFORMANCE-0906.md).

## Recent changelog

- **0.94.0:** owner soundtrack, MP3 priority, independent HUD surfaces, Light ivory globe viewport, bottom-left notifications, drawer/wizard polish and six deterministic leader perks. [Release record](docs/RELEASE-094.md). Schema 17, old saves remain compatible.

- **0.91.0 (Claude):** The Living World & Executive Release — macOS case-collision fix, a calmer top bar with trends inside their own cards, War Planning and a four-tab Full Dossier inside the diplomatic hub, a three-tab Help (Briefing, Programs, Questions), a four-card feature tour, and the [Astra handoff](docs/HANDOFF-ASTRA.md). [Release record](docs/RELEASE-091.md). Schema 17, simulation unchanged.
- **0.90.0-playtest.19 (Claude):** Phase 6.5 — live ▲/▼ counters for treasury, food and oil in the top bar, swords and megaphone event pins on the map, a red or gold mood glow on the commander portrait, and poster-style covert operations. [Phase 6.5 record](docs/LIVING-WORLD-0919.md). Schema 17, simulation unchanged.

- **0.90.0-playtest.18 (Claude):** Phase 6.4 — the Policies tab opens with six cards (Tax Code and five faction concessions with a green ✓ on the active one), and every facility has a plain factory modal with two rows and a Limit Reached badge. [Phase 6.4 record](docs/CARD-UI-0918.md). Schema 17, simulation unchanged.

- **0.90.0-playtest.17 (Claude):** Phase 6.3 — tactile hillshade map: Natural Earth shaded relief as its own layer, an 18° desk tilt on the flat map with exact click mapping, and miniature capital pins with round flags; three map-dock settings. [Phase 6.3 record](docs/HILLSHADE-0917.md). Schema 17, simulation unchanged.

- **0.90.0-playtest.16 (Claude):** Phase 6.2 — executive desk: incoming proposals with an expiry countdown and Accept/Decline through the typed command, your wars and operations, and reports about your country in three tabs. [Phase 6.2 record](docs/EXECUTIVE-DESK-0916.md). Schema 17, simulation unchanged.

- **0.90.0-playtest.15 (Claude):** Phase 6.1 — selecting another country opens a diplomatic hub (flags, capital, four indicators, eight typed actions with the Full Dossier's review) instead of the player's 14-section panel; Full Dossier one click away. [Phase 6.1 record](docs/TARGET-HUB-0915.md). Schema 17, simulation unchanged.

- **0.90.0-playtest.14 (Claude):** Phase 5 — Howler.js sound with interface, battle and ambience volumes, mute and a silent fallback; battle effects drawn only from recorded results, summarised at high speed, with low effects or reduced motion; original terrain tiles and sounds. [Phase 5 record](docs/AUDIOVISUAL-0914.md). Schema 17, simulation unchanged.

- **0.90.0-playtest.13 (Claude):** Phase 4 — air and naval task groups (six missions, bases, range, preparation, stock limits) for the player and the AI with the same validator; a new war starts at the earlier balance; one-record cargo chain with blockade interception; early cargo delivery fixed. [Phase 4 record](docs/TASKGROUPS-0913.md). Schema 17.

- **0.90.0-playtest.12 (Claude):** Phase 3 — the tactical AI follows multi-round plans under fog of war with a deterministic fallback; equal forces hold the front, air superiority counts once, one fuel rule for attack and defence, rescue lines reachable during war. [Phase 3 record](docs/WAR-AI-0912.md). Schema 17 kept.

- **0.90.0-playtest.11 (Claude):** footer credit is now RON Interactive; no AlpyX text remains in the interface.

- **0.90.0-playtest.10 (Claude):** the game is now **Rule of Nations (RON)**; store subscriptions narrowed (−30% component renders), fading windows that return with their scroll and focus, a 10 px text floor and natural-case buttons and headings in five languages. [Phase 2 record](docs/FLUID-UI-0910.md). Schema 17, simulation and dependencies unchanged.

- **0.90.0-playtest.9 (Codex):** managed victory/crisis keyboard focus; expanded save/load and transaction safety tests. [Phase 1 evidence](docs/QA-PHASE1-0909.md). Schema 17, simulation and dependencies unchanged.

- **0.90.0-playtest.8 (Codex):** compact HUD and ten-row World rankings, three-column Supply cards where space permits; clearer Trade Desk, Society cards and illustrated Infrastructure. Compatible saves continue without a new campaign.

- **0.90.0-playtest.7 (Codex):** compact buy/sell Open Market, national alerts and opening news; source-linked contemporary starting diplomacy. [Sources and coverage](docs/DIPLOMACY-SNAPSHOT-0907.md). Existing saves retain their relations.


### 0.90.0-playtest.6 — Measured performance (Codex)

- Repeatable engine and production-browser measurements cover fresh, one-year and three-year seeded campaigns, saves, menus and camera input.
- Index Relations-map connections once per ledger change; collapsed supplier disclosures create rows only when opened. Ranking, prices and actions retain their existing rules.
- [Measured results and limits](docs/PERFORMANCE-0906.md): approximately 0.89 → 0.016 ms for three-year connection lookup; Supply timings remain variable. Save schema 17, balance and dependencies stay unchanged.

### 0.90.0-playtest.5 — Spacious command windows (Codex)

- Tech, World, War readiness, Production, Supply and Market open in wider workspaces. Child windows hide their parent; closing them restores the previous menu and its selection.
- Overview/Power/Supply command and Tech/World/War readiness form separate groups. Illustrated identity cards, atlas-backed Cabinet artwork, modern commander profile and framed HUD controls improve readability.
- World activities return above rankings; the first 20 countries appear initially, with more on scrolling. Date sits beneath unchanged speed controls in its own shared card. Five languages; schema 17 and simulation balance unchanged. See [full changelog](CHANGELOG.md).

### 0.90.0-playtest.4 — Reliable command menus & sovereign credit (Codex)

- Command panels are available from startup; Tech contains Investments and Military contains Pilot training. Consistent labels, readable Supply details, its missing icon and contract spacing are corrected.
- World docks beside the left rail with military, financial and diplomacy rankings.
- Flagged credit partners, simulated AAA–D ratings, three-day decisions, targeted rescue loans and reviewed early repayment with credit-history rewards. Five languages; compatible schema-17 saves. Startup bundle size and catalogue loading remain known limits. See [full changelog](CHANGELOG.md).

### 0.90.0-playtest.3 — Clear markets & policies (Codex)

- Purchase/sale receipts distinguish actual payment, treasury, delivered reserves, incoming cargo and pending proceeds.
- Compact centered supply tiles with clear stock warnings, one-row contract controls, and two-row partner goods. Hover and keyboard focus highlight choices; the redundant World prices section is removed.
- Country Policies contains the reviewed tax control and ministry-budget route. All new wording covers five languages; saves and engine balance stay compatible.

### 0.90.0-playtest.2 — Market & window hotfix (Codex)

- Exchange purchase reviews now open and explain blocked orders. Help/Supply/credit/contracts avoid click-time module downloads; tool focus and loading no longer move the page.
- Tool windows leave the rails exposed. The national flag contains the country/regime shortcut and opening hint; tutorial points to it.
- Current country names, readable supplier headings, treasury artwork for credit and larger event choices. Historical save names and old search terms remain compatible.

### 0.90.0-playtest.1 — Clear Command (Codex)

- Illustrated Affairs sections, visible action requirements and exact costs replace silent failures. Controlled territory and independent-country actions are separated.
- Country navigation has a matching Affairs button, a distinct war-planning action and readable identity cards; the duplicate Trade Desk shortcut is removed. HUD selection no longer adds a yellow dot.
- Entry artwork gets a short tagline; fresh wizard openings avoid the last quote. Keyboard map controls and managed integration dialogs extend accessibility.
- Confirmed QA fixes close conquered countries’ other fronts, prevent unfunded council aid from spending influence, and stop election countdowns in non-electoral regimes.
- [QA findings and verdicts](docs/QA-RECONCILIATION-090.md), [playtest record](docs/PLAYTEST-090.md), and [full changelog](CHANGELOG.md) preserve evidence and remaining work.

### 0.89.0-playtest.7 — Focused markets & artwork recovery (Codex)
- Six icon sections replace stacked market content; the menu stays visible while the selected section scrolls.
- Failed atlas downloads retry on reopening, stalled downloads time out, and stale errors cannot hide recovered art. Mobile resource choices fit in two columns.
- Existing supply contracts, exchange orders and sovereign credit use the same engine rules. See [changelog](CHANGELOG.md).

### 0.89.0-playtest.6 — Window flow & diplomatic recovery (Codex)

- Country Trade Desk separates its label, country name, route status and facts into a readable header on desktop and mobile.
- Command panels retry brief download failures. A lasting failure stays in its own recovery window; manual retry uses a fresh loader and keeps the campaign open.
- Shared window focus, Escape, tab cycling and review pause ownership replace duplicate handlers. Only the top managed window handles Escape; mandatory national events still require a choice.
- Page-level layer tokens keep menus below windows, and tutorial reading reserves a separate bottom area. Phase 4 remains incremental; see [audit progress](docs/AUDIT-PROGRESS-089.md).

### 0.89.0-playtest.5 — Research & readiness clarity (Codex)

- War confirmation clearly shows why the action is blocked and uses an inactive button style. Refined fuel, not crude oil, funds the military reserve.
- Research uses compact illustrated cards: saved points, cost, exact shortfall, prerequisites and project progress. Blocked discoveries can still be opened to see what is needed.
- Shared engine previews keep research duration and refunds consistent with execution. Technology names and the country-specific war title are reviewed in all five languages.
- [Audit progress](docs/AUDIT-PROGRESS-089.md) distinguishes delivered Phases 1–3 from the remaining Phase 4 work. See the full [changelog](CHANGELOG.md).

### 0.89.0-playtest.4 — Supply contracts & war readiness (Codex)

- Import reviews offer 1/3/5/10-year monthly supply agreements when relations exceed 40/100 and a trade pact is active. Existing daily flows from that supplier are replaced.
- War declarations require 14 operational days of refined fuel, with exact required stock and shortfall shown. Auto assault uses 5× (one day per second); fuel warnings stay in the war window.
- Transient panel downloads retry twice without restarting the campaign. Full history: [Changelog](CHANGELOG.md).

### 0.89.0-playtest.3 — Portrait tiles & leadership quotes (Codex)

- Portrait tiles keep images and soft shadows within their cards.
- A sourced leadership quote appears below the identity fields; it is randomly chosen per setup opening and available in all five languages.

### 0.89.0-playtest.2 — Unified onboarding (Codex)

- Language selection stays on the first sign-in screen. Later steps keep the chosen language.
- Entry and setup share one frame and theme; the final review has compact profile details and localized GDP/treasury amounts.
- Save compatibility remains unchanged. Full history: [Changelog](CHANGELOG.md).

### 0.89.0-playtest.1 — Trade & Markets

- Entry/setup hotfix by Codex: language selection restored, mobile navigation stays visible, and the missing import that blocked the build is fixed.
- Find trade partners fast: ranked supplier lists (who can sell to you now, who is one pact away) and a TRADE tab on every country.
- A commodity exchange for food, oil, metals, gold and silver with moving prices, news-driven shocks, charts, realistic spreads, limits and storage costs.
- Diplomatic jets and cargo planes fly across the map; travel time follows real distance, and mission goodwill arrives with the delegation.

### 0.88.0-playtest.1 — Politics & Victory

- AI countries now go to war with each other, and can declare war on you; you can defend, win or lose as the defender. Allies may join the defender.
- Factions, contested elections with real margins, and regime crises and coups in non-democracies, shown in a new Politics section.
- 32 event kinds, including chains, at about 7 a year; far fewer advisor pop-ups.
- Three ways to win the campaign: Enduring Mandate, Economic Leadership, Regional Leadership. You can keep playing after victory.

### 0.87.0-playtest.1 — Living World

- Repeating the same domestic action now gives less each time, with cooldowns; high tax costs extra approval. The old "60% tax + activity spam" strategy no longer keeps approval at the ceiling.
- Most flat costs scale with GDP, so they matter for large and small countries alike. Diplomatic missions have a 30-day cooldown per country.
- One price scale for the industrial market: refineries add value, mines pay for themselves, and the AI only buys what it needs.
- Player and AI share the same treaty rules and fees; alliances break when relations collapse; intelligence uses separate dice for success and detection.

### 0.86.0-playtest.1 — HD War Playback

- Round replays now play step by step on the board: moves, hits and misses, casualties, destroyed groups and depot captures, with play/pause, step, 1×/2×/4× speed and skip to result.
- Each tactical battle rolls its own dice from a saved stream, so world events no longer change battle outcomes.
- The tactical AI weighs all its options: it defends threatened depots, bombards visible enemies and goes for open depots.

### 0.85.0-playtest.1 — HD War v2

- New tactical battles: 10×8 board, five groups per side, two supply depots, seeded terrain that is symmetric for both sides.
- A depot counts only while no enemy is adjacent, so reaching it first no longer locks it. Groups in contact fight at full strength and take the larger share of losses.
- Each round records an action log (moves, blocked moves, hits, losses, captures) for review now and animated playback later.
- Auto-resolve uses the same force share as tactical battles. Debt carries interest and taxes above 25% slow growth.
- Error boundaries replace blank-page crashes with an error message and recovery buttons. Save schema 17; 0.84 saves load automatically.

See [CHANGELOG.md](CHANGELOG.md) for details and known limits.

### 0.84.0-playtest.1 — Stable Command

- Rebalanced world oil, food, energy and upkeep, and made AI trade cover real deficits. After four idle years the AI median approval is 75 instead of 0. One oil import keeps a default campaign healthy; a passive player still loses.
- Stability follows approval; events are varied and weighted; Council sanctions expire; AI trades and taxes follow the player's rules more closely.
- Closed the hold-still war victory and the round-one collapse of small militaries, and blocked wars on controlled states.
- Autosaves are per campaign and validated before writing; a new campaign no longer overwrites the previous one.
- Faster ticks and fewer re-renders, the integration review lock fixed, translation artefacts removed. Full findings and the phased plan are in the [0.83 audit](docs/AUDIT-0.83.md).

### 0.83.0-playtest.3 — Guided Play

- Added sign-in, local account creation, a random math check and Demo entry, followed by a New game/Continue menu with separate account saves.
- Guided tactical battles through plan review, opponent handoff and a result popup offering next turn, replay, withdrawal or map. Next turn advances one campaign day and explains pending national decisions; combat remains simultaneous.
- Updated tactical cards and turn guidance; continuing a save reopens an active tactical war.
- Added shared automatic image retries, recovery on reconnect/focus and a manual retry in Profile → Session. Leader images now use native WebP assets.
- Supplied entry and guided-turn text for all five supported languages; paused time and autosave behind entry screens.

### 0.83.0-playtest.2 — Clear Command

- Separated pending diplomatic proposals from saved outcome history, with green/red status borders and written labels.
- Fixed supply image/quantity overlap, strengthened game-speed typography and centered single-action close controls.
- Clarified recurring supply contract terms and added paper/pen signing presentation to receipts.
- Filled static language gaps and dynamic news templates, with reviewed wording for key economic and diplomatic actions.

### 0.83.0-playtest.1 — Tactical Command

- Added the playable 6×6 battlefield, real allocated force groups, a three-point command budget and simultaneous opponent orders.
- Added terrain, movement constraints, recon, reserves and saved combat replay without charging losses twice.
- Added retained national economic observations, Chart.js charts and an accessible data table.
- Introduced schema-16 save migration, keyboard/touch controls and reduced-motion support.

See the [full changelog](CHANGELOG.md) for every recorded patch, including all six 0.82 playtest patches. Detailed checks and known limits are in the [0.83 playtest notes](docs/PLAYTEST-083.md).

## Milestone history

Delivered milestones are retained here when new releases are added. This table summarizes development releases; it does not imply that they have been merged into `main`.

| Milestone | Delivered foundation | Record |
|---|---|---|
| 0.94 — Audio, UI & Character Perks | Phase 7 Sprint 4: audio integration, independent HUD, viewport/notification polish and six persistent campaign archetypes | [Playtest 0.94](docs/PLAYTEST-094.md) |
| 0.90 — Clear Command | 0.91.0 release: war planning and dossier inside the hub, three-tab Help, feature tour, top-bar redesign, Astra handoff; Phase 6.5 living world polish; Phase 6.4 card UI and factory modal; Phase 6.3 tactile hillshade map; Phase 6.2 executive desk; Phase 6.1 target-country diplomatic hub; Phase 5 sound, battle effects and terrain; Phase 4 air/naval task groups and the cargo chain; Phase 3 multi-round tactical AI and war balance; Rule of Nations name; Phase 2 store subscriptions, window motion/return state and typography; Phase 1 managed victory/crisis focus and save/transaction regressions; compact ten-row World rankings, dense Supply and illustrated national workspaces; compact two-column Open Market, national intelligence alerts and opening news, source-linked contemporary diplomacy; repeatable long-campaign performance measurements, indexed map connections and deferred supplier disclosures; spacious workspaces with parent return navigation, framed HUD and world activity/list scrolling; illustrated Affairs and shared action gates; reliable command panels, separated investments/pilots, World rankings and rated/delayed sovereign credit with early repayment; market review/window hotfix, compact trading choices and execution receipts, Policies, national flag shortcut, current country names, readable events, quote rotation, keyboard map controls and verified simulation fixes | [Playtest 0.90](docs/PLAYTEST-090.md) |
| 0.89 — Trade & Markets + onboarding polish | Icon market sections and bounded artwork recovery; shared window lifecycle and local panel recovery; illustrated research and clear action blockers; monthly supply contracts, shared war fuel readiness and 5× auto assault; unified entry/setup theme and compact final review; supplier ranking and country trade desk, commodity exchange with shocks and charts, diplomatic and cargo flights on the map | [Playtest 0.89](docs/PLAYTEST-089.md) |
| 0.88 — Politics & Victory | AI wars and the defender path, allies joining, factions and contested elections, regime crises, data-driven events with chains, campaign victory | [Playtest 0.88](docs/PLAYTEST-088.md) |
| 0.87 — Living World | Repeat fatigue and GDP-scaled costs, one market price scale, demand-bound AI buyers, shared treaty rules, command and migration cleanup | [Playtest 0.87](docs/PLAYTEST-087.md) |
| 0.86 — HD War Playback | Step-by-step round playback with effects and controls, battle RNG stream, scored tactical AI | [Playtest 0.86](docs/PLAYTEST-086.md) |
| 0.85 — HD War v2 | 10×8 symmetric battlefield, contested depots, contact-based combat, action timeline, auto-resolve parity, error boundaries | [Playtest 0.85](docs/PLAYTEST-085.md) |
| 0.84 — Stable Command | Audit-driven world balance, war exploit fixes, per-campaign validated autosaves and performance | [Audit 0.83](docs/AUDIT-0.83.md), [Playtest 0.84](docs/PLAYTEST-084.md) |
| 0.83 — Tactical Command / Clear Command / Guided Play | Playable tactical battles, combat replay, economic charts, diplomatic history, local demo entry and guided turns | [Playtest 0.83](docs/PLAYTEST-083.md) |
| 0.82 — Reliable Command | Compatible-save recovery, command deduplication, timed research, NEWS archive, home camera and command layout | [Playtest 0.82](docs/PLAYTEST-082.md) |
| 0.81 — Powered World | Power plants, grid demand, fuel-backed generation, energy construction and tutorial recovery | [Playtest 0.81](docs/PLAYTEST-081.md) |
| 0.80 — Sovereign Horizons | Engine-backed victory notices and territory management | [Playtest 0.80](docs/PLAYTEST-080.md) |
| 0.79 — The Real President | Population, welfare, migration and reviewed tax policy | [Playtest 0.79](docs/PLAYTEST-079.md) |
| 0.78 — Civic Command | Funded tutorial construction, research institutions and pilot training | [Playtest 0.78](docs/PLAYTEST-078.md) |
| 0.77 — Guided Command | Shared workspace and contextual onboarding | [Playtest 0.77](docs/PLAYTEST-077.md) |
| 0.76 — Decisions & World Institutions | Persistent tutorial, institution applications, membership votes and attack debates | [Playtest 0.76](docs/PLAYTEST-076.md) |
| 0.75 — Open Command | Floating HUD, painted leader portraits and improved map controls | [Playtest 0.75](docs/PLAYTEST-075.md) |
| 0.74 — Industry & Living Diplomacy | Industrial goods, facilities, recurring supply contracts and diplomatic correspondence | [Playtest 0.74](docs/PLAYTEST-074.md) |
| 0.73 — Command Architecture / Cartography | Reviewed commands, logistics and map interaction stabilization | [Follow-up notes](docs/PLAYTEST-0731-2.md) |
| 0.60–0.72 — Commander foundations | Leader setup, five core languages, persistent command windows, embassies and equipment production | [Changelog](CHANGELOG.md) |
| 0.50 — Living World | Integrated playtest, World Pulse, AI diplomacy and sovereign territory selection | [Release 0.50](docs/RELEASE_0_50_ALPHA.md) |
| 0.40 — Three-track foundation | Cabinet, technology, processed resources, alliance blocs, Global Council and visual pack | [Release 0.40](docs/RELEASE_0_40.md) |
| 0.31 — Early strategy foundation | Resource specialization, dynamic market, flat-map controls and deterministic clock | [Changelog](CHANGELOG.md) |

## Development records

- [Roadmap and remaining work](docs/ROADMAP.md)
- [0.83 full audit and phased plan](docs/AUDIT-0.83.md)
- [HD War roadmap](docs/ROADMAP-HD-WAR.md)
- [Architecture](docs/ARCHITECTURE.md)
- [0.91.0 release record](docs/RELEASE-091.md) and [handoff to Astra (cloud layer)](docs/HANDOFF-ASTRA.md)
- [Release documentation checklist](docs/RELEASING.md)
- [Asset manifest](docs/ASSET_MANIFEST.md), [content pipeline](docs/CONTENT_PIPELINE.md) and [data sources](docs/DATA_SOURCES.md)

The latest patch summary is updated with each release, while the full changelog and delivered milestone records preserve the project's history. V3 remains a future readiness milestone.

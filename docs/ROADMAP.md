# Rule of Nations roadmap (formerly AlpyX) after 0.31

## 0.99.0 — Phase 8 Slice 8.1 Domain & Schema Migration

Delivered on `dev/ron-phase7`: typed organization domain, 14-record initialization, pure/idempotent 17→18 adapter, UN/P5 metadata, legacy ballot/sanction preservation and strict organization validation. [Release](RELEASE-099.md) · [Playtest](PLAYTEST-099.md) · [Model notes](ORGANIZATIONS-099.md). Supported saves 12–18; 1026 tests, TypeScript and Vite passed. Slice 8.2 must activate commands/voting with legacy authority reconciliation; complete financial/trade/private-forum membership datasets and later mechanics remain pending. Browser/native suites were not rerun. V3 remains the complete-playability milestone.


## 0.98.1 — Phase 8 Slice 8.0 Foundation

Delivered on `dev/ron-phase7`: Astra H1–H4 fixes for institution save validation, AI/player proposal costs and daily benefits, shared outreach preview, and atomic autosave put/prune. [Release](RELEASE-0981.md) · [Playtest](PLAYTEST-0981.md). Schema 17 retained; 962 tests, TypeScript and production build passed. Targeted browser checks were blocked at Chrome launch. Schema 18 and Global Organizations remain planned; audit H5–H8 and full browser profiling remain open. V3 remains the complete-playability milestone.


## 0.98.0 — Phase 7 Sprint 8

Delivered on `dev/ron-phase7`: readable wizard quote, remaining specified Light subpanels, single foreign-influence navigation, uppercase Dossier tabs, separated institution icons/abbreviations and localized cultural titles. [Release](RELEASE-098.md) · [Playtest](PLAYTEST-098.md). Schema 17, deterministic RNG and engine formulas unchanged. V3 remains the complete-playability milestone; existing profiling/bundle work remains pending.

## 0.97.0 — Phase 7 Sprint 7

Delivered on `dev/ron-phase7`: portrait workspace, day badge, subtle viewport grid, specified Light subpanels and policy action/relief banner. [Release](RELEASE-097.md) · [Playtest](PLAYTEST-097.md). Schema 17, deterministic RNG and engine formulas unchanged; V3 remains the complete-playability milestone. Existing profiling/bundle work remains pending.

## 0.96.0 — Phase 7 Sprint 6

Delivered on `dev/ron-phase7`: entry/wizard layout polish, consistent Light command and strategic review surfaces, supply card grid, assessment fuel-action placement and balanced HUD rails. [Release](RELEASE-096.md) · [Playtest](PLAYTEST-096.md). Schema 17 and deterministic simulation unchanged; V3 remains the complete-playability milestone. Existing profiling work remains pending.

## 0.95.0 — Phase 7 Sprint 5

Delivered on `dev/ron-phase7`: National Command Light surfaces, readable audio settings and one scrolling body with a persistent exit footer. [Release](RELEASE-095.md) · [Playtest](PLAYTEST-095.md). Schema 17 and deterministic simulation unchanged. V3 remains the complete-playability milestone; existing profiling work remains pending.

## 0.94.0 — Phase 7 Sprint 4

Delivered on `dev/ron-phase7`: audio integration, independent HUD, Light viewport, notification clearance, drawer/wizard polish and six deterministic character perks. [Release](RELEASE-094.md) · [Playtest](PLAYTEST-094.md). Schema 17, optional backward-compatible archetype metadata; V3 remains the complete-playability milestone. Initial-bundle profiling and hidden-workspace computation remain pending.

## Current playable spine
World map → national economy/resources → diplomacy → bilateral commodity flows → development → military conflict → occupation → political consequences.

## 0.32–0.4 priorities
1. Ministries and budget allocation: finance, defense, education/research, interior and foreign affairs.
2. Technology tree with prerequisites and multi-day research rather than instant R&D buttons.
3. Alliance blocs and collective-defense logic.
4. UN v1: sanctions, ceasefire motions, diplomatic reputation and voting influence.
5. Industry chains: crude oil → refined fuel; iron → military/industrial capacity; uranium → reactor/enrichment path.
6. Strategic infrastructure and logistics.

## Later simulation depth
- Religion and ideology as influence networks rather than static labels.
- Internal factions, regime pressure and government legitimacy.
- Nuclear deterrence and escalation.
- Smarter AI strategic goals.
- Web Worker simulation as country count / AI cost rises.
- Cloud saves and optional authoritative multiplayer service.

## Engineering rules
- UI issues typed commands; engine owns simulation rules.
- No `Math.random()` inside simulation: use deterministic seeded RNG.
- Save schema is versioned.
- Features must ship with regression tests.

## 0.40 completed foundations
- Cabinet ministries
- Technology Tree v1
- Processed industrial resources
- Alliance Bloc v1
- Global Council v1
- Visual Pack 1
- GitHub CI / release checklist foundation

## Next candidate: 0.50 Living World
- AI strategic goals and bloc behavior
- Espionage operations and counter-intelligence
- ideology / religion influence propagation
- deeper production chains and military manufacturing
- front geography / terrain / supply routes
- event art expansion and audio foundation

## 0.78 Civic Command delivered
- Practical first-construction tutorial and illustrated national controls.
- Popup research branches, education campuses, funded pilot training and crew effectiveness.
- Occupation unrest, resource relief, costly suppression, territorial transfer and transition elections.
- Conditional foreign political campaigns with seeded outcomes, eligibility checks and cooldown.
- Single-clock auto war and satellite connection overlays.

## Next development candidates
- 0.83 delivers the first playable HD War tactical board with bounded orders and recorded replay. Next: balance playtests, AI counterplay and measured rendering improvements; see ROADMAP-HD-WAR.md.
- Specialized researcher staffing; 0.82 adds funded multi-day projects and campus capacity.
- AI campus investment and pilot recruitment policies, with upkeep and reserve constraints.
- Territory taxation, autonomous administration and peace settlements; current control governs occupation consequences without merging sovereign economies.
- Multiple connection badges on country hover, richer trade route visualization and logistics bottlenecks.
- Fully templated localization for dynamic reports and remaining legacy descriptions.

## After The Real President 0.79

Delivered: welfare-driven population, reviewed taxes, civilian recruitment, open-market escrow and asking prices, precious-metal inputs and separate vaults, diplomatic letters, shared incoming fees, public events, contextual advice and live tutorial briefings.

Next candidates:
- Expand verified official gold holdings with dated provenance once the complete workbook is obtainable; replace estimates only with source-backed observations.
- Calibrate legacy strategic resource lots into explicit physical units and retune factory capital/upkeep against a consistent game time scale.
- Negotiated commodity-price offers, counteroffers and treaty duration renewals in the post office.
- More nuanced migration permission, skills, housing capacity and return migration; demographic cohorts.
- Specialized crew readiness and sanctions-driven production substitutions; multi-day research delivered in 0.82.
- Worker-based simulation and more lazy UI modules as the existing main bundle grows.
- HD War Experience camera/terrain/animation/playback work remains in ROADMAP-HD-WAR.md.

## After Sovereign Horizons 0.80

Delivered: sourced victory parchment, reviewed 90-day territorial integration with welfare failure, asset/liability consolidation, annual-rate sovereign credit offers and requests, maturity collateral transfers, arrears/tax restoration, charcoal/gold setup and worker-based geographic projection.

Follow-up candidates: counteroffers and loan restructuring, early repayment, broader reserve data, nuanced language/civic cohorts, housing/migration capacity, cached or GPU satellite projection, separate simulation worker, and the existing HD War Experience roadmap.

## 0.81 — Powered World

Delivered: tutorial read/acknowledge/close phases, lighter spotlight shading and cancellation recovery; Turkish UI/news template coverage with historical rendering; profile/history/session tabs; production-based resource map imagery; six fuel-backed or renewable power plant types, commissioned construction/refunds, power demand/shortfalls, AI energy investment/research, save continuity and annexation transfers.

Next energy work: regional grid capacity and transmission loss, paid electrical interconnectors, safety inspections/civil nuclear incidents, forecasts with uncertainty, additional language translations and further bundle splitting. HD War Experience remains a separate future project.

## 0.82 — Reliable Command

Delivered: save compatibility/fallback/retry, bounded command deduplication, funded tutorial identity, timed research, dated NEWS archive, resource popup consolidation, home camera, right-side Goals and bottom-right Map/Help. Added lazy windows and production Chromium regression tests. See PLAYTEST-082.md.

Next priorities: long-campaign profiling and balance; deep legacy save validation; durable autosave scheduling; structured per-system events; native-language wording review and per-language bundle loading. Static five-language gaps and generic dynamic templates are covered in 0.83.0-playtest.2. Preserve current completed systems. V3 remains conditional on measured performance constraints or an authoritative multiplayer requirement, not on interface rearrangement.

## V3 milestone
V3 is reserved for the release where the whole game is ready for complete playability. Continue incremental gameplay and reliability improvements in this repository; no V3 rewrite is required for the 0.83 tactical slice.

## 0.83 Guided Play follow-up
Delivered in playtest.3: local demo entry, per-account local saves, guided combat results/next-turn flow and shared image recovery. Real online accounts need a backend, verified email and server authorization; the local demo form is not that service. Keep simultaneous combat and one-round-per-day accounting. Next: native wording review, deployment/cache observability, extended turn-flow balance and per-language loading.

## 0.84 Stable Command and the phased plan
Delivered: Phase 1 of the [0.83 audit](AUDIT-0.83.md), covering world oil/food/upkeep balance, stability and events, AI rule parity fixes, war exploit fixes, per-campaign validated autosaves, tick performance and translation clean-up.

Next, in order:
- **Phase 2, living world and politics:** tax/activity/debt pressure (C4), unified price scale and AI market demand (C10–C12), treaty rule parity (D8), AI-declared wars, factions, legislature, coups for every regime, data-driven event chains, win conditions, and store actions routed through typed commands (A5).
- **Phase 3, HD War:** a grid abstraction, TacticalBattle v2 (schema 17), unit-level engagements, an action timeline, a per-battle RNG stream, seeded terrain, a 10×8 board and contested objectives (B5, B8, B9).
- **Phase 4, technical debt:** a single translation catalog per language with lazy loading, CSS layers and a z-index scale, a shared modal hook, engine preview functions for UI forecasts, WebP map texture, and a regenerated npm lockfile.

## 0.85 HD War v2
Delivered: Phase 3 foundation from the [0.83 audit](AUDIT-0.83.md). A sized tactical grid (10×8 for new battles), TacticalBattle v2 with save schema 17, seeded point-symmetric terrain, five groups per side, two depots held only while uncontested (B5), contact-based power and loss distribution, a recorded action timeline, auto-resolve parity (B8) and error boundaries. Also the first C4 item: debt interest and tax friction on growth. Checks and limits: [Playtest 0.85](PLAYTEST-085.md).

Next, in order:
- **HD War playback:** animate rounds from the action timeline (movement, fire, losses, captures) with pause, speed and skip; a per-battle RNG stream for combat rolls; AI that coordinates groups; then measured rendering work (PixiJS only if needed).
- **Phase 2 remainder:** activity repetition limits (rest of C4), unified price scale and AI market demand (C10–C12), GDP-scaled flat costs (C15), treaty rule parity (D8), espionage and alliance fixes (D12), AI-declared wars with the defender path (B9, E1), deeper politics and a victory condition (E2–E5), command-path and migration-table cleanup (A5, A6).
- **Phase 4, technical debt:** unchanged from the 0.84 plan.

## 0.86 HD War Playback
Delivered: step-by-step round playback driven by the action timeline (effects, play/pause, step, speed, skip, reduced-motion support), a saved per-battle RNG stream for combat rolls and a scored tactical AI. Checks and limits: [Playtest 0.86](PLAYTEST-086.md).

Next, in order:
- **Phase 2 remainder:** activity repetition limits (rest of C4), unified price scale and AI market demand (C10–C12), GDP-scaled flat costs (C15), treaty rule parity (D8), espionage and alliance fixes (D12), AI-declared wars with the defender path (B9, E1), deeper politics and a victory condition (E2–E5), command-path and migration-table cleanup (A5, A6).
- **HD War presentation:** sprites or a measured PixiJS layer, terrain art, sound, and multi-round AI plans, after playtest feedback on 0.86.
- **Phase 4, technical debt:** unchanged from the 0.84 plan.

## 0.87 Living World
Delivered: Phase 2 economy and rule-parity items (C4 rest, C10–C13, C15, D8, D12, A5, A6). Checks and limits: [Playtest 0.87](PLAYTEST-087.md).

Next: 0.88 Politics & Victory (AI-declared wars and the player-as-defender path B9/E1, factions, contested elections and coup risk E2, a data-driven event catalogue with chains E3, campaign victory paths E4, allies joining wars E5).

## 0.88 Politics & Victory
Delivered: B9 and E1–E5. Phase 2 of the 0.83 audit is complete. Checks and limits: [Playtest 0.88](PLAYTEST-088.md).

Next candidates:
- **Balance from playtests:** approval baseline pull (so approval does not drift to the ceiling), AI war outcome variety, AI targeting of the player, democratic unrest.
- **Phase 4, technical debt:** single translation catalogue per language with lazy loading, CSS layers and a z-index scale, a shared modal hook, engine preview functions for the remaining UI forecasts, map texture conversion, Prettier, docs archive, demo-account hashing.
- **HD War presentation:** sprites or a measured PixiJS layer, terrain art, sound, multi-round AI plans.

## 0.89 Trade & Markets
0.89.0-playtest.4 (Codex): discoverable monthly supply agreements with relation/access checks; shared 14-day refined-fuel war readiness; 5× auto assault with nonblocking fuel warnings; transient module-load recovery.
0.89.0-playtest.3 (Codex): bounded portrait tiles and sourced, localized leadership sayings on the identity step.
0.89.0-playtest.2 onboarding polish (Codex): language selection only at sign-in, one entry/setup frame and theme, compact confirmation and localized money. No gameplay balance changes.
Delivered: supplier ranking and the country trade desk, the commodity exchange, diplomatic and cargo flights on the map, and related visual polish. Checks and limits: [Playtest 0.89](PLAYTEST-089.md).

Next candidates: one price level for contracts, listings and the exchange; exchange balance (reversion speed, spreads); approval baseline pull and AI war variety from 0.88; Phase 4 technical debt.

## 0.89.0-playtest.5 — Research & readiness clarity (Codex)
Visible war block reasons and disabled styling; responsive research cards with branch art, saved/required/missing points, prerequisites and active-project progress; shared engine research/refund previews. Phase 4 is started, not complete. [Audit reconciliation and next scopes](AUDIT-PROGRESS-089.md) preserve the original 0.83 findings without repeating delivered Phases 1–3. Save schema stays 17; simulation balance is unchanged.

## 0.89.0-playtest.6 — Window flow & diplomatic recovery (Codex)
Delivered: shared focus/top-window Escape/tab handling and review pause ownership, page-level z-index tokens with tutorial space, local recoverable lazy command panels, and a readable country Trade Desk hero. Phase 4 G5/G6 progress is partial: specialized overlays, keyboard map navigation and full CSS cascade migration remain. Checks: [Playtest 0.89](PLAYTEST-089.md); remaining scope: [audit progress](AUDIT-PROGRESS-089.md).

## 0.89.0-playtest.7 — Focused markets & artwork recovery (Codex)
Delivered: six icon sections in one market shell, compact mobile choices, separate scroller space and bounded resilient atlas recovery. Continue this navigation pattern on other long windows after playtest feedback; remaining Phase 4 items stay in [audit progress](AUDIT-PROGRESS-089.md). Save schema and balance unchanged.

## 0.90 — Clear Command (Codex)
Delivered: section-based Affairs, shared command eligibility/cost previews, country/HUD navigation clarity, non-repeating entry quotes, keyboard map controls and integration modal lifecycle. Confirmed Antigravity findings on dependent wars, council aid affordability and election clocks are fixed. [QA reconciliation](QA-RECONCILIATION-090.md) records the claims that were already fixed or remain unmeasured; [playtest](PLAYTEST-090.md) records validation.

Next priorities: measured long-save/map performance; remaining supply/population and specialized investment previews; translation override inventory and per-language loading; remaining victory/campaign-end accessibility; campaign balance and a focused HD War AI/art/audio slice. No V3 declaration or rendering-engine migration in this release.

### 0.90.2 hotfix
Delivered: mounted commodity review with engine rejection reasons, eagerly available Help/Supply/credit/contracts, scroll-free tool focus/loading, rail-aware movable windows, flag-based nation shortcut and tutorial, current country names compatible with saves/search, supplier heading and larger event choices. Six focused Vite-dev regressions and 578 unit tests/build passed; All 90 production-preview browser scenarios passed (7.7m); final mobile-menu layout rechecked in nine focused scenarios (50.7s). This patch continues Phase 4 window/navigation work; measured startup/translation splitting, remaining previews and HD War AI still remain.

### 0.90.3 market/policy patch
Delivered: execution-based commodity receipts including freight and cargo/settlement timing; compact centered supply goods with clear stock levels; four contract fields in one desktop row; two-row partner goods; removal of the redundant World prices section; reviewed tax controls and ministry-budget access grouped under Policies. Responsive layouts and hover/focus feedback continue the window/usability work. No balance, save-schema or dependency changes. Five-language wording is covered. Remaining Phase 4 translation loading/consolidation, preview extraction and HD War AI work are unchanged; see [validation record](PLAYTEST-090.md).

### 0.90.4 command menus / sovereign credit (Codex)
Delivered: startup-loaded command panels; Tech investments and Military pilot training; readable/capitalized Supply and contracts; rail-adjacent World rankings. Engine-owned credit ratings, personalized quotes, delayed applications, bounded targeted rescue offers and reviewed early repayment/history rewards. Optional schema-17 fields preserve old saves. Campus/pilot previews now share execution helpers; remaining supply/population forecasts are still open. Catalogue consolidation/loading, measured startup/long-save performance and war AI/balance remain pending. V3 is not declared. Evidence: [playtest record](PLAYTEST-090.md).

## 0.90.0-playtest.5 — Spacious command windows (Codex)

- Expanded national/market/supply/world windows, parent navigation, grouped controls, restored world activity and incremental rankings, profile/Cabinet/HUD readability.
- Validation: 607 unit tests/76 files, TypeScript/build and 115 production browser scenarios verified (111 initial full-run passes, corrected regressions and a new cross-country route rechecked in focused runs); save schema 17 and gameplay balance unchanged. Translation catalogue consolidation, remaining action previews, measured performance and war AI/balance remain separate pending work; V3 is conditional on complete playability.

## 0.90.0-playtest.6 — Measured performance (Codex)

- Delivered measurement slice: seeded day-1/366/1096 engine, snapshot/validation and production entry/resume/menu/camera probes; indexed Relations connections and deferred collapsed supplier rows.
- [Measured distributions](PERFORMANCE-0906.md) establish a cheaper connection lookup, with varying Supply/browser timings. This does not close performance work. Next: StackBlitz/mobile, Supply CPU traces/larger samples, geographic raster and flight/war-heavy campaigns; translation override inventory before per-language splitting.
- 610 unit tests/77 files and TypeScript/build passed; all 118 production browser correctness scenarios passed (15.6m). Save schema 17, simulation rules and dependencies unchanged. Remaining action previews and war AI/balance stay separate; V3 remains conditional on complete playability.

## 0.90.0-playtest.7 — Command intelligence (Codex)

Compact independent buy/sell forms, national alert categories and populated opening news. Offline source-linked contemporary diplomacy and Relations map colors; existing saves are not reseeded. See [sources/coverage](DIPLOMACY-SNAPSHOT-0907.md). 621 unit tests / 78 files (including the 365-day invariant), TypeScript and production build passed. Full production browser run: 127/128 passed (17.1m); the sole failure was an obsolete mobile rail-exposure expectation, updated for expanded Alerts. All 9 affected desktop/mobile scenarios passed again (1.4m), covering all 128 unique scenarios. Final mobile screenshots were inspected. Exact-head remote CI is checked after publication; actual StackBlitz testing was not performed. Broader bilateral research and actual StackBlitz/device checks remain follow-ups. V3 remains the complete-playability milestone.


## 0.90.0-playtest.8 — Compact workspaces (Codex)

Compact commander HUD and World rankings with ten visible rows and scroll access to every country; denser Supply cards, a readable Trade Desk hero, illustrated Society and Infrastructure workspaces. Existing parent-return and reviewed investment flows are preserved. Save schema 17, simulation rules and dependencies unchanged.

622 unit tests / 79 files, TypeScript and production build passed. All 8 final focused production-browser scenarios passed (2.2m), covering 390/1440/2048 px, five languages, all ranking pages, Supply readability, Society/Infrastructure and parent/review return. The local full run was interrupted at scenario 58 after finding two Supply font-size failures and one mobile bottom-padding failure; these real UI issues were corrected and covered by the final focused run. The full 134-scenario suite runs in exact-head GitHub CI after publication. Final desktop/mobile screenshots inspected; actual StackBlitz testing was not performed. V3 remains conditional on complete playability.

Translation catalogue consolidation/loading, remaining previews, measured performance follow-ups, diplomacy coverage and campaign/war AI balance remain separate pending scopes.


## Major patch — six-phase plan (Codex, 2026-10-12)

This plan supersedes older phase numbering for the current work. Phases 1–5 are delivered; Phase 6 (Closed Beta acceptance) needs Alper's authorization.

1. **Reliable foundation:** proven save/transaction/interaction bugs, regression coverage and initial performance measurements. Playtest.9 implements managed victory/crisis focus and expands safety coverage; release CI 38242251836 passed. [Evidence](QA-PHASE1-0909.md).
2. **UI flow and targeted performance:** measured expensive selectors, typography, parent/child focus and transitions, five languages and zoom/mobile usability. Delivered in playtest.10 together with the Rule of Nations name. [Evidence](FLUID-UI-0910.md).
3. **Multi-turn tactical AI and balance:** deterministic bounded planning, fog of war, common player/AI costs; fuel/air/small-economy balance measured before changes. Delivered in playtest.12. [Evidence](WAR-AI-0912.md).
4. **Air/naval task groups and logistics:** allocation, range, readiness and shared validators; unify cargo ownership/cancellation semantics. Delivered in playtest.13. [Evidence](TASKGROUPS-0913.md).
5. **Terrain, playback and audio:** resolved events drive effects; skip/replay cannot change simulation; accessible static/silent fallbacks. Delivered in playtest.14. [Evidence](AUDIOVISUAL-0914.md).
6. **Closed Beta acceptance:** complete campaigns, multiwar/defeat, 365/1095 days, all languages, actual StackBlitz/mobile, full tests and CI.

No large refactoring, catalogue consolidation or new libraries in Phase 1. Typed commands, seeded RNG, migrations and existing .8 work are preserved. V3/major naming remains conditional on complete playability. Stop before Phase 2 for Alper's decision.

## 0.90.0-playtest.10 — Rule of Nations: fluid command (Claude)

Delivered Phase 2: narrowed store subscriptions with render attribution (`npm run measure:renders`), opacity-only window motion with reduced-motion support, parent return with scroll/tab/focus, a 10 px text floor with natural-case buttons, tabs and headings in five languages, and the Rule of Nations name. Remaining for later phases: long-tail capital labels, wider translation review, mobile/low-power and StackBlitz measurement (Phase 6). Phase 3 (multi-turn tactical AI) has not started.

## 0.90.0-playtest.11 — RON Interactive credit (Claude)

Footer credit is RON Interactive. Phase 3 (multi-turn tactical AI and balance) starts after Alper's StackBlitz check and authorization.

## 0.90.0-playtest.12 — Multi-round tactical AI and war balance (Claude)

Delivered Phase 3: bounded deterministic multi-round planner with plan memory, fog-of-war knowledge and single-round fallback; log-ratio front, single-counted air, symmetric fuel and supply roles, rescue lenders during war. Remaining: mountain assaults stay very hard on the tactical board; planner projection is heuristic. Phase 4 (air/naval task groups) has not started.

## 0.90.0-playtest.13 — Air/naval task groups and the cargo chain (Claude)

Delivered Phase 4: six air/naval missions with bases, range, preparation days and stock limits; one preview and validator for the player panel and the AI; the default assignment keeps the playtest.12 balance; one-record cargo chain with blockade interception and the early-delivery fix. Remaining: no air/naval units on the tactical board, no individual airfields or carriers, trade-deal and contract flights stay visual, the AI assumes the enemy's default assignment. Phase 5 (terrain, playback and audio) has not started.

## 0.90.0-playtest.14 — Sound, battle effects and terrain (Claude)

Delivered Phase 5: a central Howler.js sound service (interface, battle and ambience channels, mute, four-sound limit, once-per-event cues, gesture start, silent fallback); battle effects and summaries derived only from recorded round actions; original terrain tiles and synthesized sounds in the asset manifest. Remaining: no map sound or effects, synthesized placeholder sounds, event memory per tab. Phase 6 (Closed Beta acceptance) has not started.

## 0.90.0-playtest.15 — Target-country diplomatic hub (Claude)

Delivered package 6.1 of the Living World & Executive handoff (Alper, 13 October 2026), a visual/UX track on branch `dev/ron-living-world-0915`; the Closed Beta acceptance step above keeps its own authorization. Foreign countries open a diplomatic hub with eight typed actions and a Full Dossier link. Remaining in this track: 6.2 executive inbox with expiring requests (needs an engine rule, Alper's decision on save fields), 6.3 hillshade map with desk tilt and capital pins, 6.4 card-based policies, factory detail and operation posters. [Evidence](TARGET-HUB-0915.md).

## 0.90.0-playtest.16 — Executive desk (Claude)

Delivered package 6.2 under Alper's decision to keep the engine unchanged: an executive desk over the existing letters (expiry), wars, operations and journal, with Accept/Decline through the typed `diplomacy/resolveLetter` command. Not implemented by decision: relation penalties for unanswered requests. Remaining in this track: 6.3 hillshade map with desk tilt and capital pins, 6.4 card-based policies, factory detail and operation posters (and a decision on folding the Diplomatic Inbox, Alerts and News windows into the desk). [Evidence](EXECUTIVE-DESK-0916.md).


## 0.90.0-playtest.17 — Tactile hillshade map (Claude)

Delivered package 6.3 of the Living World & Executive handoff: a Natural Earth hillshade layer, an 18° desk tilt on the flat map with an analytic pointer mapping, and miniature capital pins, with three map-dock settings; engine, domain and saves unchanged. Remaining for 6.3: the relief frame-cost measurement (`npm run measure:browser`; if over the 1.5× budget, relief ships off by default), screenshots at 1440 (tr) and 390 (en), and Alper's decisions listed in the phase record (when relation pins appear). Remaining in this track: 6.4 card-based policies, factory detail and operation posters (and a decision on folding the Diplomatic Inbox, Alerts and News windows into the desk). [Evidence](HILLSHADE-0917.md).

## 0.90.0-playtest.18 — Card UI and factory modal (Claude)

Delivered package 6.4 of the Living World & Executive handoff: a six-card Policies & Laws grid built from the existing tax policy and faction concessions, and a plain factory modal with an original drawing, two rows and a Limit Reached badge; engine, domain and saves unchanged. Remaining for 6.4: screenshots at 1440 (tr) and 390 (en), Alper's confirmation of the law names, and the optional operation poster cards (not started). Remaining in the track: the 6.3 relief frame-cost measurement; folding the Diplomatic Inbox, Alerts and News into the Executive Desk stays a separate decision.

## 0.90.0-playtest.19 — Living world polish (Claude)

Delivered package 6.5: live change counters in the top bar, swords and megaphone event pins on the map, a mood glow on the commander portrait, and the optional poster-style covert operations (B.4); engine, domain and saves unchanged. Remaining: screenshots at 1440 (tr) and 390 (en), Alper's judgement of the visual strength, the 6.3 relief frame-cost measurement; strikes as a separate engine state (the megaphone reads stability and regime crises only).

## 0.91.0 — The Living World & Executive Release (Claude)

Delivered: macOS case-collision fix, top-bar redesign, War Planning and a four-tab Full Dossier inside the diplomatic hub, a three-tab Help, a four-card feature tour and the Astra handoff ([record](RELEASE-091.md)); engine, domain and saves unchanged. Next: the cloud layer (Supabase Auth, Cloud Save, Cloudflare Pages) is delegated to Astra in [HANDOFF-ASTRA](HANDOFF-ASTRA.md). Remaining: screenshots at 1440 (tr) and 390 (en), Alper's judgement of the new cards and war briefing, unit labels on the Food and Oil cards, the 6.3 relief frame-cost measurement, and Phase 6 Closed Beta acceptance (needs Alper's authorization).


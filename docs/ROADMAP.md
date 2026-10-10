# AlpyX Roadmap after 0.31

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

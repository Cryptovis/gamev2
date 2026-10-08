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
- HD War Experience remains planned in ROADMAP-HD-WAR.md: first record deterministic combat events, then build a renderer that cannot change outcomes.
- Timed research projects and researcher staffing; current unlocks remain immediate after confirmation.
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
- Longer research projects, specialized crew readiness and sanctions-driven production substitutions.
- Worker-based simulation and more lazy UI modules as the existing main bundle grows.
- HD War Experience camera/terrain/animation/playback work remains in ROADMAP-HD-WAR.md.

## After Sovereign Horizons 0.80

Delivered: sourced victory parchment, reviewed 90-day territorial integration with welfare failure, asset/liability consolidation, annual-rate sovereign credit offers and requests, maturity collateral transfers, arrears/tax restoration, charcoal/gold setup and worker-based geographic projection.

Follow-up candidates: counteroffers and loan restructuring, early repayment, broader reserve data, nuanced language/civic cohorts, housing/migration capacity, cached or GPU satellite projection, separate simulation worker, and the existing HD War Experience roadmap.

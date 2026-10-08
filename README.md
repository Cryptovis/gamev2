# The Real President — 0.84.0-playtest.1

A browser-based grand-strategy prototype built with React, TypeScript, Zustand, D3 Geo and Dexie. Lead a country through its economy, resources, diplomacy, development and military conflicts. Chart.js provides economic charts; Vitest and Playwright verify gameplay and browser flows.

## Current release

| Item | Current state |
|---|---|
| Version | **0.84.0-playtest.1 — Stable Command** |
| Development branch | `dev/audit-fixes-084` |
| Save schema | 16 (0.84 adds optional fields only); schemas 12–15 migrate automatically |
| Validation | Engine unit and 365-day invariant suites pass locally; TypeScript, production build and browser scenarios are verified by CI on push |
| V3 | Reserved for the complete-playability milestone; no rewrite is required for 0.83 |

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

`check` runs tests, TypeScript checks and the production build. Browser tests run separately against the production preview.

## Recent changelog

### 0.84.0-playtest.1 — Stable Command

- Rebalanced world oil, food and upkeep so the world no longer collapses within two years. One oil import keeps a default campaign healthy, while a passive player still loses.
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
- [Release documentation checklist](docs/RELEASING.md)
- [Asset manifest](docs/ASSET_MANIFEST.md), [content pipeline](docs/CONTENT_PIPELINE.md) and [data sources](docs/DATA_SOURCES.md)

The latest patch summary is updated with each release, while the full changelog and delivered milestone records preserve the project's history. V3 remains a future readiness milestone.

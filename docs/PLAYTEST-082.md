# 0.82.0-playtest.1 — Reliable Command

Base: `dev/powered-world-081` at `fc9bcb2`. Release branch: `dev/reliable-command-082`.

## Delivered

- Schema 15 preserves schemas 12–14 through migration, validates finite campaign fields and research projects, and searches earlier records if the newest save is incompatible. New campaigns have separate identities. Autosave coalesces concurrent campaign/day requests, marks success only after persistence, and retries errors while the checkpoint remains active. Manual failure is visible. Setup can load previous progress directly.
- Reviewed economic actions route through typed commands and pass a confirmation identity. The engine retains the latest 512 applied identities; the same request cannot spend twice across save/load. Separate confirmations remain separate investments. Failed prerequisites remain retryable. This is bounded local protection, not an unlimited transactional server ledger.
- Tutorial construction stores its funded project ID, survives save/load, and recovers after cancellation without charging for an already funded project. Ten lessons retain read, acknowledge and close phases.
- Research is one funded national project at a time. Prerequisites and cost are checked at start; discoveries and bonuses arrive only after accumulated daily work. Universities/institutes improve capacity, occupied teams pause, and player/AI use the same project rules. Cancellation refunds 80% of unfinished work. Existing unlocked technologies remain unlocked.
- NEWS / HABERLER retains up to 200 dated reports captured at command/tick boundaries, beyond the twelve-line live feed. Older migrated lines are marked legacy and use the save day because their original event dates were never stored. Events discarded by the live feed within a tick cannot be reconstructed.
- A location button beside zoom returns the camera to the player country even when another country is selected. Resource headings and Buy open a left supply window filtered to that resource; the duplicated national supply board is removed.
- Goals move to the right rail. Map and Help have a bottom-right group; Help's pressed state follows the open window. Public events, diplomacy, aid and world institutions use bundled colored artwork. No new external image provenance is claimed.
- Heavy windows load on demand; simulation-panel subscriptions exclude unrelated camera-control, receipt and save-message changes. Currency formatting accepts the player's locale. New Turkish research/save/navigation/report text is covered; other languages and legacy dynamic descriptions still need work.

## Verification

- `npm run check`: Vitest regression suite, TypeScript and production build.
- `npm run test:e2e`: builds and serves the production output, then runs Chromium scenarios at 1440×900 and 390×844 for rail placement, Help pressed state, home camera, resource popup, manual save/reload, translated load notification, page errors and horizontal overflow; also walks all ten tutorial lessons including a funded construction.
- CI runs the same checks and retains browser traces on failure. Locally, Chromium can be supplied with `PLAYWRIGHT_CHROMIUM_EXECUTABLE`; normal CI installs Playwright Chromium.
- Build entry JavaScript: approximately 330 KB raw / 105 KB gzip versus the prior approximately 1,103 KB raw entry. Shared locale and simulation chunks remain substantial; entry reduction is not a measurement of total transfer, frame rate or simulation latency.

## Remaining debt and V3 decision

Continue on this repository. V3 is not justified by these changes: the existing deterministic engine, migration path and map already support them. Reconsider a major architecture migration only after a measured simulation/frame-time budget fails under sustained play, or authoritative multiplayer requirements change the state model. Next work: deep validation of all legacy subsystem records, broader transactional coverage and durable autosave scheduling, structured event capture inside ticks, complete localization, consistent economic units/balance and long-campaign profiling. HD War remains separately scoped.

## Onboarding patch — 0.82.0-playtest.2

Setup now shows the exact package version. The cover/frame keeps fixed dimensions across identity, portrait, nation, confirmation and language changes. Desktop nation selection confines scrolling to the list; its scrollbar matches the portrait list. The nation summary is compact, and mobile puts it above the list. Selected secondary text has dark contrast against the gold background. Browser layout checks cover 1440×900, 1280×720 and 390×844.

## UI hotfix — 0.82.0-playtest.3

The identity footer's fourth item previously wrapped Continue into a clipped second row. Save utilities and navigation now have separate bounded rows. Rails sit behind national and floating windows, so the Map/Help cluster cannot cover a tutorial investment. The map dock has a close header outside its scrolling body; the profile return footer is transparent and campaign dates wrap instead of truncating. Production browser checks additionally verify footer button geometry/hit-testing, map close hit-testing, overlapping panel priority and profile footer background.

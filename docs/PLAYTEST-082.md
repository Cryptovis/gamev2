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


## Tutorial and diplomacy hotfix — 0.82.0-playtest.4
The active tutorial reserves the bottom 220px and bounds open windows/reviews above it; only their bodies scroll, with close controls available. Acknowledgement has its own margin above navigation. Browser coverage walks all ten lessons and checks close-control hit-testing.

Diplomacy now includes Proposal tracker with sent/received filters and inline help. Pending outgoing offers, pending incoming offers, active agreements, sanctions, insufficient funds and the existing 14-day cooldown explain why another request is unavailable. The country diplomacy entry uses the same check before showing another confirmation; legacy command receipts also receive specific proposal reasons. Requests cost nothing at submission; outgoing fees are charged once if accepted (existing engine behavior). Replies take three campaign days, so advance time to receive them. Repeat clicks do not speed up replies.

Existing atlas pixels are served directly as native WebP with a decorative fallback on load failure. Production browser checks assert successful image decoding in Supply and World and that retrying a pending embassy creates no confirmation or second letter. This improves the proposal workflow; other legacy commands still need a broader audit of prerequisite messages and localization.


## Nation setup polish — 0.82.0-playtest.5
Nation preview, statistics, profile and confirmation now share the onboarding charcoal/gold palette, including inactive step markers and secondary text. Existing fixed frame, summary and footer dimensions are retained. Country search accepts the displayed localized name, accent-insensitive input, original English name and country codes; sorting follows the chosen language. Empty results offer Clear search and preserve the selected country. Selected buttons expose aria-pressed. Browser checks cover Turkish search variants, empty-state recovery and rendered palette on desktop/mobile, alongside the existing layout and playtest suite. This handles a small piece of the localization backlog; long-campaign profiling, deep legacy validation, durable autosaves and broader dynamic translations remain separate work.


## Credit feedback and trade trust — 0.82.0-playtest.6
Credit publication uses one validator in the UI, command result and engine. Invalid terms display all reasons, spendable treasury, cash shortfall, GDP-based principal cap and current open-offer count. Lending reserves principal immediately; publication does not guarantee a borrower. The maximum-affordable button respects both cash and the GDP cap. The strategic confirmation now preserves action receipts and recognizes changes to retained world letters, preventing a successfully sent pact from appearing unavailable.

Diplomatic UI uses the displayed 0–100 relationship index consistently: 50 is neutral, above 50 is Good (or a stronger tier), and below 20 blocks new trade proposals. Trade acceptance is probabilistic: neutral 50 has a 50% base chance, Good 51 starts at 75%, higher trust rises toward 90%, and partner resource need adds 10 points capped at 95%. War, sanctions and missing sender fee funding set the outgoing chance to zero. The UI shows the current index, points to Good, mission gain and estimate; incoming fee sharing retains its own budget checks.

Daily pact maintenance warns when either side remains below 20, stores tradeStrainSinceDay in existing relation records, and cancels the treaty and active bilateral commodity shipments after 14 campaign days. Restoring at least 20 resets the warning. The optional date survives schema-15 save/load, so old saves remain compatible. New pacts reset old strain dates. This changes diplomacy balance and should be observed in long campaigns.

Regression checks cover credit cap/cash/offer count, valid reservation, trust boundaries and acceptance ordering, changed funding at reply time, saved warning/cancellation/recovery, successful strategic receipts and market filter case. HD War remains a proposed 0.83 tactical slice documented in ROADMAP-HD-WAR.md, not a shipped battlefield.

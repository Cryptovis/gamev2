# Phase 6.2 — Executive desk (0.90.0-playtest.16)

Owner: **Claude (Opus 5.5)**. 13 October 2026. Base: playtest.15, GitHub `2eea213` (fast-forwarded into `dev/clear-command-090` after CI 38368724992). Branch `dev/ron-living-world-0915`. Alper's decision for package 6.2: no new engine rules or penalties (the handoff's "−15 trust for an unanswered aid call" is not implemented); use the expiry data that already exists. No file under `src/engine/`, `src/domain/`, `src/persistence/` or `src/map/` changed; save schema 17 and game numbers are unchanged.

## Where the data comes from

| Desk item | Source | Note |
|---|---|---|
| Incoming proposals | `world.living.letters` (incoming, pending, not a closure, addressed to the player, `expiresDay ≥ day`) | `processIncomingDiplomaticOffers` creates `diplomaticOffers`; `processLetters`, which runs right after it in the same tick, folds every offer into a pending incoming letter and empties `diplomaticOffers`. The desk therefore reads letters only. |
| Countdown | `expiresDay − day` | 0 = "Last day" (the engine expires a letter when `expiresDay < day`); ≤ 3 days is urgent (red border and red chip, with text). |
| Shared fee | `letterCost` × 0.5 for each side | Same figures as the Diplomatic Post review. |
| Wars | `state.wars`, active, player as attacker or defender | Front shown from the player's side. |
| Operations | `state.intelOperations`, active, player as source | `completeDay − day` until the result. |
| Reports | `newsEntries` (dated journal, then undated sitrep) | Up to 12 per tab; see filtering below. |

## Decisions

Accept opens the existing review dialog (your share, partner share, treasury after; disabled when either side cannot pay) and sends `{type:'diplomacy/resolveLetter', id, accept:true, commandId}` through `dispatchWithReceipt`. Decline is immediate and free and sends the same command with `accept:false`. The engine's validators and receipts apply; the card leaves the desk once the letter is accepted, rejected or expired.

The desk does not mark letters read: `inbox/read` would also mark outgoing replies read and hide them from the Diplomatic Inbox badge. The Desk rail badge counts proposals awaiting an answer instead.

## Tabs and news filtering

| Tab | Cards | News categories |
|---|---|---|
| ✉️ Diplomacy | Proposals, soonest deadline first | DIPLOMACY, DIPLOMATIC OFFER, TRADE, BLOC, COUNCIL, WORLD, SUPPLY CONTRACT, EMBASSY |
| 🪖 Wars | Player's wars + Open war command | WAR, ALLIANCE, VICTORY, CAMPAIGN LOST, BLOCKADE, TRAINING |
| 🕵️ Intelligence & crises | Running operations | INTEL, EVENT, EVENT RESOLVED, UNREST, REBELLION, REGIME, POLITICAL, POLITICS, ELECTION |

The desk is about the player. A report enters it when it came from the player's own command, belongs to an always-relevant category (offers to the player, events, intelligence, regime, unrest, rebellion, alliance, campaign lost, blockade, training, every war report), or names the player's country. AI-to-AI treaties ("Afghanistan and Iran signed a trade pact"), AI trade and foreign elections stay in the News window. A 60-day headless run showed 23 DIPLOMACY and 12 AI TRADE lines that would otherwise have buried the one offer to the player.

## Presentation

A Desk button tops the right rail (on phones, like the other information tools, it is available while no country panel is open) (letter art; badge = proposals awaiting an answer). The window uses the shared draggable command window with the Phase 6.1 ivory card theme: 84 px art per card (56 px beside the text on phones), sender flag, kind, countdown chip, message, fee shares, Decline/Accept. The intelligence tab count is neutral because a running operation needs no decision. Reduced motion removes the card entry fade. The Diplomatic Inbox, Alerts and News windows are unchanged.

## Translations

`src/i18n/uiCatalog0916.ts`: all desk labels and countdown templates ("Time left: {0} days", "Result in {0} days") in tr, es, zh and ru; ten news category names that had no translation; and templates for the previously untranslated "X: Trade pact / Embassy exchange proposal received." notice.

## Validation

- `src/tests/executiveDesk0916.test.ts` (15 tests): an engine offer folded by `processLetters` becomes a desk card with typed accept/decline; countdown 4 → 3 (urgent) → 0 (last day) → expired by the engine and gone; soonest first; accepting opens the embassy and clears the card; declining is free; fee shares and affordability; outgoing, closure and third-party letters ignored; wars with the front from the player's side, oldest first; operations with days to result; category parsing; player-focused news filter; 12-report limit; no state mutation, schema 17; every catalog label and the countdown templates translate.
- `e2e/executiveDesk0916.spec.ts` (Turkish 1440 px, English 390 px): rail badge 2; urgent 2-day card first, calm 20-day card second; no horizontal overflow; accept through the review and receipt (badge 1); decline (no badge, empty message); intelligence tab shows the operation with "Result in 5 days"; war tab shows peace; Escape closes.
- CI 38376708485 (GitHub-hosted Chromium): Vitest, TypeScript, production build and all 170 Playwright scenarios passed. Two earlier runs failed and were fixed on the branch: a `DeskOffer` type widening caught by `tsc` (38371553088), and the desk scenario itself (38373980391) — its phone fixture started with the player's country panel open, which hides the information rail on phones by design, and it expected reports on the diplomacy tab that the fixture never produced. That run also added GitHub annotations for Playwright failures, so a failing scenario can be read without the job log.

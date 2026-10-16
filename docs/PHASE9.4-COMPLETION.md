# Phase 9.4 completion summary

Modern landing screen with zero-friction entry, dynamic leadership quotes, a commander dossier drawer, release notes and a real multi-stage preloader. Tasks T0 to T18, one commit per task, base 0220ed1 on dev/ron-phase9.

## What players get

- A cover-art landing screen in Navy and Ivory with one hero action: Play now (no account, no maths question), Continue (newest readable save) or New campaign (signed-in profile).
- A save card with flag, leader, campaign date, Day N and relative save time, with loading, none and unreadable states.
- A dock with the five languages, theme, sound, release notes and the dossier chip.
- A right-hand dossier drawer (sign in, create profile, account) with focus trapping and Escape. The maths check is kept on registration only.
- A leadership wisdom widget (hero, compact for setup, loading, outcome) that rotates every 18 s and pauses on hover, focus, a hidden tab or the pause button.
- A loading screen that runs four real stages (0-25 hydrate and validate, 25-55 decode graphics, 55-80 verify dictionaries and indexes, 80-99 prepare fonts and audio), shows 100% for the hand-off, and recovers from a failed load with a Main menu button.

## Invariants

| Invariant | Status |
|---|---|
| No changes under src/engine or src/simulation | `git diff --stat 0220ed1..HEAD -- src/engine src/simulation` is empty |
| 120-day trajectory hash | audited identical by the QA auditor after T16; nothing since touches engine, store actions or persistence |
| No new runtime dependency | package.json unchanged |
| Five-language text | every new string is in the landing catalog (tr, es, zh, ru) and checked by landingCatalog094 and the hint registry test |
| Navy and Ivory parity | landingStyles094 token and contrast tests, plus worst-pixel rendered checks (docs/PHASE9.4-CONTRAST.md) |
| Test count grows | T17 adds e2eMigration094 (5 tests) and landingExperience.spec.ts (14 Playwright tests); audited baseline after T16 was 139 files and 1,584 tests |
| One commit per task | yes |

## Verification split

Run in the authoring sandbox (no node_modules, npm blocked): every Phase 9.4 unit test file except saveSummary (needs zod and Dexie) through a Vitest stand-in in headless Chromium, and rendered contrast, overflow and screenshot checks. Not run there, and run by the QA auditor locally: real vitest, `tsc --noEmit`, `vite build`, the trajectory hash and Playwright. The T17 e2e migration and landingExperience.spec.ts have not been run by anyone yet; they are the first thing to run.

## Known gaps and decisions

See docs/PHASE9.4-DEVIATIONS.md (items 1 to 18). The visual QA matrix screenshots at 1920x1080, 1366x768, 1024x768, 820x1180 and 390x844 in en and zh are a manual step for the PR. The blueprint's axe pass is skipped because @axe-core/playwright is not a dev dependency; the keyboard checks (drawer and modal focus, Escape, focus return) are covered by landingExperience tests 5 and 9.

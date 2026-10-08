# 0.84.0-playtest.1 — Stable Command

Branch: `dev/audit-fixes-084`. Base: 0.83.0-playtest.3 at `54ec9e7`. Source of the work: [0.83 audit](AUDIT-0.83.md), Phase 1.

## Checks already run (headless, bun, test-only stubs for zod/zustand/dexie/d3-geo)

- Full unit suite: every test that passes at the 0.83 baseline still passes. The only failures are the same four validation/geometry tests that need the real zod and d3-geo packages and cannot run on stubs. New suites: `audit084War`, `audit084Economy`, `audit084Politics`, `audit084Persistence`, `audit084Integration`, `i18nArtifacts`, `longRunInvariants` (365 days).
- 4-year default campaign with no player actions, events answered with their first option:

| Day 1460 | 0.83 | 0.84 |
|---|---|---|
| AI median approval | 0.0 | 65.2 |
| AI countries in oil shortage | 184 | 63 |
| AI countries with treasury < $1B | 144 | 31 |
| Event kinds seen | 3 | 7 |
| Player (TUR, no actions) | Lost the election with 0% approval | Lost the election with 0% approval |

- The same campaign with one player action (trade pacts offered to six oil exporters on day 20, an oil import from the first acceptance on day 24): approval 69 at year 1, 80 at year 2 and 95 at year 4, and the player is re-elected.
- Median headless tick: about 66 ms before, 19 ms after.

Still to verify in CI or a browser: `tsc --noEmit`, `vite build`, and the Playwright scenarios.

## How to playtest

1. Start a new campaign and play about 60 days without trading. Watch for the oil reserve warnings, then sign a trade pact and an oil import. Approval should recover over the following months.
2. Start a second new campaign, play past day 5, then reload. The first campaign's autosave should still be in the save list (Continue loads the most recent). With the dev server (StrictMode), autosave should report "Autosaved Day N" at the first checkpoint, without a "failed; retrying" message first.
3. Declare a war, open HD War, and commit only Defend orders for several rounds. The war must not end in victory. Attacking rounds should move the front and exhaustion as before.
4. Try to declare war on a country you already occupy: the command should be refused with a sitrep note.
5. Open Integration on an occupied territory and confirm an action. The review dialog must appear in front of the overlay, and cancelling must bring the overlay back.
6. Switch the language to zh, es and ru, then scan the economy, credit and contract windows for leftover markup or nonsense phrases.
7. Take the world map offline (block `/data/countries.geojson` in devtools) and confirm the map shows a retry instead of "INITIALIZING" forever.

## Known limits

- One oil import makes the default campaign fairly comfortable; tax, activity and debt pressure are Phase 2 (C4).
- The tactical depot can still be locked by whichever side reaches it first, and auto-resolve still uses different loss scaling from tactical combat. Both are planned for HD War v2 (B5, B8).
- Saves made before this release keep their original food production numbers, so China and India in an old save can still run short.
- Manual saves still use one shared slot per account. The UI can only load the most recent save; older campaigns are kept but cannot be picked yet.

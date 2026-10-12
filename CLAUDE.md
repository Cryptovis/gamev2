# Working rules for this repository

Rule of Nations (RON), formerly The Real President / AlpyX: a browser grand-strategy game (React 19, TypeScript, Zustand, Dexie, zod, D3 Geo, Chart.js, Vite, Vitest, Playwright). The name is a proper noun and is never translated. Storage names (`alpyx-global-command`, `alpyx-map-zoom`, `trp-*`) are kept so existing saves and settings load.

## Architecture (from docs/ARCHITECTURE.md; non-negotiable)
- UI sends typed commands (`src/domain/commands.ts` → `src/engine/commands.ts`). UI never edits simulation numbers and never re-implements engine formulas for previews; add an engine preview function instead.
- Simulation systems in `src/engine/systems/` are pure functions of `GameState`. No `Math.random()` or `Date.now()` in simulation; use the seeded RNG in `src/engine/rng.ts` and thread the seed back into state.
- AI uses the same rules, costs and validators as the player.
- Saves are schema-versioned. Adding an optional field needs no schema bump, but `src/persistence/validation*.ts` must accept saves both with and without it. A required or changed field needs a schema bump, a migration step in `src/persistence/migrations.ts`, and a test that loads the previous schema.

## Before you change gameplay numbers
- Run the long-run invariant test (`src/tests/longRunInvariants.test.ts`). It plays 365 headless days and fails on non-finite values, world oil or food collapse, or mass bankruptcy.
- Scale costs and upkeep with GDP where they apply to every country. A flat $B cost is trivial for the USA and impossible for microstates.

## Tests and release
- Every bug fix ships with a regression test that fails without the fix.
- `npm run check` runs Vitest, `tsc --noEmit` and the Vite build. `npm run test:e2e` runs Playwright. CI (`.github/workflows/ci.yml`) runs both on `dev/**` pushes.
- Follow `docs/RELEASING.md` for every version: package version, CHANGELOG entry, README release table and recent changelog, and the PLAYTEST and ROADMAP records. Record validation only after it has passed.
- Branches are `dev/<name>-0XX`. Do not push to `main` directly.

## Code style
- Existing files use a dense style. Keep diffs surgical: don't reformat lines you aren't changing, and write new code readably.
- Components select only what they display (`useGameStore(selector)`, `useStoreView`, or `useWorldView` for engine-preview panels); parameterless `useGameStore()` is guarded by a test.
- User-facing text must go through the i18n layer (`LocaleText`, `translateLive`) and exist in all five languages (en, tr, es, zh, ru). `src/tests/i18nArtifacts.test.ts` guards against translation artefacts.

## Known open work
See `docs/AUDIT-0.83.md` (findings with IDs such as B5 and C4) and `docs/ROADMAP.md` (Phases 2–4).

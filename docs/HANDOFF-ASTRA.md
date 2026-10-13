# Handoff to Astra (GPT-Sol): from Claude's Phase 1–6.5 to the cloud layer

Prepared by **Claude (Sonnet 5.5)** for **Astra / GPT-Sol**, release **0.91.0 — The Living World & Executive Release**. Owner: **Alper**. Read `CLAUDE.md` and `docs/ARCHITECTURE.md` first; both still apply in full.

## 1. Where the project stands

| Item | State |
|---|---|
| Game | **Rule of Nations (RON)**, formerly The Real President / AlpyX. A browser grand-strategy game: 203 sovereign profiles, economy, population, resource markets, diplomacy, research, covert operations, tactical war, AI that follows the player's rules. The name is a proper noun and is never translated |
| Stack | React 19, TypeScript, Zustand, Dexie (IndexedDB), zod, D3 Geo, Chart.js, Howler, Vite 8, Vitest 5, Playwright |
| Version / branch | `0.91.0` on `dev/ron-release-091` (continues `dev/clear-command-090`). `main` is older; **never push to `main` directly** |
| **Save schema** | **17 — unchanged by 0.91.0.** 0.86–0.89 added optional fields; 0.90 and 0.91 preserve the schema. Schemas 12–16 migrate automatically; older or newer saves are refused with a warning |
| Tests | **826 unit tests** in 91 files (813 at Phase 6.5 + 13 in 0.91.0), **191 Playwright production-browser scenarios** in CI (about 16 minutes of browser time; the job timeout is 25 minutes). `npm run check` = Vitest + `tsc --noEmit` + Vite build; `npm run test:e2e` = Playwright |
| Languages | en, tr, es, zh, ru. Every user-facing string goes through `LocaleText` / `translateLive` / `formatText` and a catalog under `src/i18n/uiCatalog*.ts` (later catalogs override earlier ones; keys are matched case-insensitively) |

## 2. What was delivered (phases 1–6.5)

| Phase | Release | Delivered | Record |
|---|---|---|---|
| 1 Reliable foundation | playtest.9 | Save/transaction/interaction fixes, victory/crisis keyboard focus, regression coverage | [QA-PHASE1-0909](QA-PHASE1-0909.md) |
| 2 Fluid command | playtest.10 | Narrowed store subscriptions (−30% renders), opacity-only window motion, 10 px text floor, **Rule of Nations** name, five languages | [FLUID-UI-0910](FLUID-UI-0910.md) |
| 3 Tactical AI | playtest.12 | Deterministic multi-round plans under fog of war, war balance | `WAR-AI-0912.md` |
| 4 Task groups | playtest.13 | Air and naval task groups, cargo chain, shared player/AI validators | `TASKGROUPS-0913.md` |
| 5 Sound and battle presentation | playtest.14 | Howler channels, battle effects derived from recorded rounds, terrain | [AUDIOVISUAL-0914](AUDIOVISUAL-0914.md) |
| 6.1 Target-country hub | playtest.15 | Diplomatic hub on selecting a foreign country, eight typed actions | [TARGET-HUB-0915](TARGET-HUB-0915.md) |
| 6.2 Executive desk | playtest.16 | Inbox of proposals, wars, operations and reports | [EXECUTIVE-DESK-0916](EXECUTIVE-DESK-0916.md) |
| 6.3 Tactile map | playtest.17 | Hillshade relief layer, desk tilt with exact click mapping, miniature capital pins | [HILLSHADE-0917](HILLSHADE-0917.md) |
| 6.4 Card UI | playtest.18 | Six Policy & Law cards, factory modal | [CARD-UI-0918](CARD-UI-0918.md) |
| 6.5 Living world | playtest.19 | Live ▲/▼ counters, event pins, portrait mood, operation posters | [LIVING-WORLD-0919](LIVING-WORLD-0919.md) |
| 0.91.0 release | 0.91.0 | macOS case-collision fix, top-bar redesign, War Planning and Dossier sub-views, three-tab Help, feature tour | [RELEASE-091](RELEASE-091.md) |

## 3. Architecture you must keep

1. `UI -> typed command (src/domain/commands.ts) -> src/engine/commands.ts -> pure systems -> GameState -> UI`. The UI never edits simulation numbers and never re-implements engine formulas; add an engine preview function instead (see `src/ui/panels/targetBriefing.ts`: a read-only view model over `getWarPreview` / `warDeclarationStatus`).
2. Systems in `src/engine/systems/` are pure functions of `GameState`. No `Math.random()` or `Date.now()` in simulation; use `src/engine/rng.ts` and thread the seed back into state.
3. AI uses the same rules, costs and validators as the player.
4. Saves are schema-versioned. An optional field needs no bump, but `src/persistence/validation*.ts` must accept saves with and without it. A required or changed field needs a schema bump, a step in `src/persistence/migrations.ts` and a test that loads the previous schema. **Do not add cloud metadata to `GameState`; keep it in the save record or beside it.**
5. Components select only what they display (`useGameStore(selector)`, `useStoreView`, `useWorldView`); a test guards parameterless `useGameStore()`.
6. Dense existing style: keep diffs surgical, write new code readably. Storage names (`alpyx-global-command`, `alpyx-map-zoom`, `trp-*`) are kept so existing saves and settings load.
7. Gameplay numbers: run `src/tests/longRunInvariants.test.ts` (365 headless days) first; scale costs with GDP.
8. Every bug fix ships with a regression test that fails without the fix. Follow `docs/RELEASING.md` for every version.

## 4. Tasks delegated to Astra: the cloud layer

None of this exists yet. Today accounts are **local demo accounts** (`src/session/demoAccounts.ts`; "Demo" at Sign in), saves live in this browser's IndexedDB, and there is no server, no verified email and no server-side bot protection. The game is a static Vite build.

### 4.1 Supabase Auth — Apple, Google, Discord

- Add `@supabase/supabase-js`; read the project URL and anon key from `import.meta.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). The anon key is public by design; **never commit a service-role key**.
- Providers: Apple, Google, Discord through `signInWithOAuth`. Configure the redirect URLs for `https://ruleofnations.com`, the Cloudflare preview domains and `http://localhost:5173`.
- Keep Demo mode working without a network: auth is an addition at the Sign in screen (`src/ui/panels/CampaignEntry.tsx`), not a replacement. `demoOwner()` is the single place that names the current save owner; map an authenticated user to an owner string such as `sb:<user id>` so the existing per-owner save scoping (`scopedId`, `owned` in `src/persistence/saveGame.ts`) keeps working.
- Account text (Sign in with Apple/Google/Discord, errors, sign out) needs all five languages in a new catalog registered in `src/i18n/localeText.tsx`.
- The privacy and consent copy must say what is sent to the cloud before the first sync.

### 4.2 Cloud Save

- Table (suggested): `saves(id text, owner uuid references auth.users, name text, schema_version int, updated_at timestamptz, state jsonb, primary key (owner, id))` with Row Level Security: `owner = auth.uid()` for select, insert, update and delete. No public read.
- Reuse, do not fork, the local path: `snapshotGame` → `canLoadSave` → write. Upload only what `saveGame()` would accept; on download run `migrateSave()` and refuse invalid or newer-schema records exactly as `loadSave()` does (the existing warning is the user-facing behaviour). Schema 17 stays the contract; a cloud record carries its own `schema_version`.
- Conflict rule: last write wins by `updated_at`, with a visible "newer on the other device" prompt instead of silent overwrite. Autosaves stay local (the 5-per-campaign pruning in `pruneAutosaves` is the rule); sync manual saves and one latest checkpoint per campaign.
- Saves are large JSON. Measure size and compress (gzip before upload) before choosing between a `jsonb` column and Supabase Storage. Record the measurement in a new `docs/CLOUD-*.md`.
- Offline-first: the game must stay fully playable and saveable with no session; sync is a queue that retries.
- Tests: unit tests with a faked client for upload/download/conflict, a migration test for a previous-schema cloud record, and one Playwright scenario that runs signed-out (Demo) unchanged.

### 4.3 Cloudflare Pages — ruleofnations.com

- Build command `npm run build`, output directory `dist`, Node version as in `.github/workflows/ci.yml`. It is a static single-page app; add the SPA fallback and long-cache headers for `/assets/*` (hashed) and `no-cache` for `index.html` (`public/_headers`, `public/_redirects`).
- Domain `ruleofnations.com` (and `www`) on Cloudflare; production deploys from the branch Alper names as the release branch, previews from `dev/**`. **Do not make `main` the production source until Alper decides.**
- Keep CI as the gate: `.github/workflows/ci.yml` runs `npm run check` then `npm run test:e2e` on `dev/**` pushes. Deploy only after it is green.
- Security headers worth setting: `Content-Security-Policy` (allow the Supabase origin and the self-hosted assets), `X-Content-Type-Options`, `Referrer-Policy`. Check the map's blob workers (`geographic.worker.ts`) before tightening `worker-src`.
- The in-game footer credit is RON Interactive; no AlpyX text may appear in the interface.

## 5. Working environment notes

- Earlier sessions often could not reach the npm registry (DNS / proxy 403), so GitHub Actions was the verifier. Try `npm ci` first.
- CI logs and artifacts can be on blob storage that is blocked. Playwright failures are reported as **check-run annotations**: `JID=$(gh api repos/Cryptovis/gamev2/actions/runs/<RUN>/jobs --jq '.jobs[0].id'); gh api repos/Cryptovis/gamev2/check-runs/$JID/annotations --jq '.[]|.path+":"+(.start_line|tostring)+" "+.message'`. TypeScript errors appear there too; "Test and build" failing with exit code 2 usually means `tsc`.
- Branches are `dev/<name>-0XX`. Alper approves merges into `dev/clear-command-090`.
- **macOS is case-insensitive.** Never keep two files whose names differ only by case (this broke `ExecutiveDesk.tsx` / `executiveDesk.ts` in 0.90 playtests; `src/tests/release091.test.ts` now guards it).
- Playwright: 5 s default expect timeout, `workers: 1`, about 15 minutes for the whole suite. Phone fixtures: `campaignFixture()` starts with the player's country selected; the right rail is hidden while a country panel is open at ≤ 760 px.

## 6. Known open work (not delegated)

- Audit findings in `docs/AUDIT-0.83.md` (IDs such as B5 and C4) and `docs/ROADMAP.md` Phases 2–4.
- Phase 6 of the six-phase plan, Closed Beta acceptance (complete campaigns, multiwar/defeat, 365/1095 days, all languages, real mobile), needs Alper's authorization.
- The relief frame-cost measurement from Phase 6.3; strikes as a separate engine state (the megaphone pin reads stability and regime crises only).
- Food and Oil cards in the top bar show stock numbers without a unit label.
- The Full Dossier still has the complete 14-section panel behind "Open complete country panel"; the in-hub dossier is a four-tab read-only summary.

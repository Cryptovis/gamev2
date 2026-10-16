# Phase 9.4 T0: baseline and discovery

Branch dev/ron-phase9 at 0220ed1. Findings verified against the code, not taken from the blueprint.

## Baseline status

| Check | Result |
|-------|--------|
| Test files in src/tests | 120 (matches the brief) |
| Playwright specs in e2e | 42 |
| Package version | 1.0.0 (the blueprint's release-notes example "0.9.4" is wrong; use the real package version) |
| vitest, tsc, vite build | NOT RUN in the authoring sandbox. registry.npmjs.org returns 403 from the session egress proxy, so dependencies could not be installed. The brief's figures (1326 tests, 991.5 kB gzip) are therefore unverified here and must be re-measured locally before and after the phase. |

## Assumptions A1 to A10

| ID | Verdict | Finding |
|----|---------|---------|
| A1 | Confirmed | Light selector is `:root[data-theme="light"]` (double quotes). Dark is the default `:root,[data-theme="dark"]` block in src/ui/styles/appearancePhase7.css. |
| A2 | Confirmed, with a different shape than the blueprint assumed | Catalogs are `Record<string,[tr,es,zh,ru]>` keyed by the English text (case and whitespace insensitive), merged through `MERGED_CATALOG_GROUP` in src/i18n/localeText.tsx. Placeholders are positional (`{0}`), not named. `hintRegistry.test.ts` fails if two catalogs define the same key differently. |
| A3 | Partly wrong | `SaveRecord` is `{id,name,owner?,updatedAt,schemaVersion,state:GameState}`. There is no separate summary metadata. `PlayerProfile` has no `country` field; the ruled country is `GameState.playerCountryId`, the commander is `playerProfile.commanderName`. The save summary (T6) must read these from the parsed state. |
| A4 | Confirmed | `enterDemoSession('guest')` already needs no credentials or math challenge. Session lives in sessionStorage under `trp-demo-session-v1`, so a guest session is per tab. `hasDemoSession()` and `demoOwner()` exist. |
| A5 | Wrong in the blueprint | An audio system exists: src/audio/audioSettings.ts (`trp-audio-v1`, zustand store with `muted`, `master`, channels ui/war/ambient) plus audioService.ts and AudioDirector.tsx. The dock mute toggle must bind to this store. Default is muted=false, not the blueprint's default of muted. T13 changes accordingly. |
| A6 | Confirmed | `flagEmoji(iso2)` in src/data/countryThemes.ts. |
| A7 | Partly wrong | `VictoryScroll.tsx` exists, with its own quote list in src/data/victoryQuotes.ts. There is no defeat screen. Loading lives inside CampaignSetup.tsx (class `campaign-loading`, strings loading_1 to loading_4 in gameI18n.ts). |
| A8 | Confirmed, ids differ from the blueprint | Legacy ids are `ataturk-peace`, `ataturk-sovereignty`, `lincoln-people`, `mandela-education`. Legacy `source` is an https URL and `src/tests/leadershipQuotes.test.ts` requires it. CampaignSetup stores the last quote id in localStorage key `trp-last-leadership-quote`. |
| A9 | Confirmed | `import {version} from '../../../package.json'` in CampaignEntry.tsx. |
| A10 | Confirmed | Screen state is plain React state, `'login'|'register'|'hub'|'setup'|'game'`, initialised to `'hub'` when `hasDemoSession()` else `'login'`. It is not persisted, so no legacy-screen migration is needed. |

## Repo constraints the blueprint did not know

1. vitest only runs `src/tests/**/*.test.ts` (vitest.config.ts). The blueprint's test paths beside the source files, and any `.test.tsx` file, would never run. All new tests live in src/tests and are `.ts`. Component and hook tests in later tasks need either a config change or tests written without JSX.
2. `GameLanguage` and `IdeologyType` come from src/domain/game.ts. Ideologies are `pluralist | state_centric | state_socialist | royalist | religious_state`.
3. CLAUDE.md: new user-facing text must go through the i18n layer in all five languages, diffs stay surgical, and new code is written readably.
4. docs/RELEASING.md requires a version bump, CHANGELOG, README and playtest records for a release. That is a release task, outside T0 to T5.
5. The blueprint file itself is not in docs/ at this commit.

## Decisions taken for T1 to T5

1. Shared quote types live in src/data/leadershipTypes.ts to avoid a runtime import cycle between quotes, authors and selection.
2. `nextLeadershipQuote` stays defined in leadershipQuotes.ts and calls the selection module, rather than the other way round, for the same reason. Its signature `(roll, previousId?: string | null)` is unchanged.
3. Legacy quotes keep their ids, source URLs and existing translations and stay first in the corpus. New quote ids drop the blueprint's `q-` prefix to match the legacy style.
4. New quotes carry a citation string in `source`, and the existing source-URL assertion is narrowed to the four legacy quotes. All quotes must carry `provenance.citation`.
5. Appendix A strings that already exist (New campaign, Settings, Language, Sign in, Close) are reused, not redefined. `Day {0}` and `Saved {0}` are not added because a broad template key would rewrite unrelated strings; the save card composes them in code.

# 0.98.1 — Phase 8 Foundation Sprint (Slice 8.0)

Development patch on `dev/ron-phase7`, based on v0.98.0 commit `2e51181ee9af514eced073c12575ffefa93e8ffd`. Save schema remains 17.

## Delivered behavior

- **H1:** Replace loose institution/council bags with typed runtime schemas and country-reference checks. Missing UN membership arrays, malformed ballot/mission/history records, invalid vote choices, unknown country references and non-finite/out-of-range influence are refused. Existing Schema 12–17 migration fixtures and optional legacy country fields still roundtrip.
- **H2:** Human membership/attack commands and AI attack proposals use the same actor-aware proposal validator and executor. Attack proposals consume 8 influence and insufficient influence blocks AI proposals. Daily UN/Security Council influence, public-diplomacy technology benefits and WHO cohesion apply to every active eligible country, with existing caps. Initial onboarding memberships retain their existing behavior.
- **H3:** `previewOutreach` is the engine-owned source for allowed status, cost, chance and resulting treasury. UI and execution use it; all missions participate in cooldown checks.
- **H4:** Checkpoint put, stale-key selection and deletion are one Dexie readwrite transaction. Abort restores both inserted/overwritten checkpoint data and deleted stale saves. A write from another open connection queues after the transaction and survives stale deletion.

No new gameplay fields, migration steps or Schema 18 mechanics are introduced. `fake-indexeddb` is a development dependency for exercising the real Dexie transaction path, rather than simulating transaction behavior in a table mock.

## Validation

- `npm run check`: **962/962 tests across 102 files**, TypeScript and Vite production build passed with zero errors.
- The existing 365-day long-run invariant passed before changing benefit distribution and is included in the final successful check.
- **32 new regressions** cover corrupted saves, finite influence, save/load, actor costs, deterministic/pure previews and ticks, daily benefits, rollback, overwrite rollback, owner/manual retention and concurrent connections.
- New tests were run against the unfixed implementation: both rollback regressions fail; the dedicated interleaving test fails because a refreshed checkpoint is deleted. World regressions also fail for validation and actor parity (new selector/executor APIs are absent in the baseline).
- Five targeted unit files passed 70 tests during development. The transaction suite passed all five tests after opening the second connection before scheduling its write.
- Three targeted production-browser scenarios were attempted (desktop/mobile institutions and real IndexedDB manual resume). Chrome aborted at launch in this restricted environment; no application assertions ran. No browser pass is claimed. CI retains its full Playwright job.

## Known limits

Existing Vite warnings remain: large main bundle and ineffective dynamic import of `saveGame.ts` because entry code also imports it statically. Save validation is stronger for these institution/council payloads; other legacy subsystem bags still need deeper validation. Atomic pruning is not conflict resolution for two divergent campaign snapshots. Astra H5–H8 and the Schema 18/Global Organizations blueprint remain separate work.

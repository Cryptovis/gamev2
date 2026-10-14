# Playtest 0.98.1 — Foundation Sprint

Branch `dev/ron-phase7`; patch version `0.98.1`; Schema 17.

`npm run check`: **962/962 tests, 102/102 files**, TypeScript and production Vite build passed with zero errors. The suite includes the 365-day world invariant and all existing Schema 12–17 roundtrip fixtures.

New coverage (`foundationWorldPhase8.test.ts`, `foundationPersistencePhase8.test.ts`):

- Reject missing/unknown/duplicate institution members, malformed ballots/missions/history, invalid vote choices, unknown references and non-finite/out-of-range influence.
- Preserve valid ballots, outreach missions, council state and older schema fixtures through migration/save/load.
- Charge AI and human attack proposals the same 8 influence; reject insufficient funds, duplicate open proposals through the shared validator.
- Apply member and public-diplomacy benefits to all active states with caps; exclude annexed legacy members.
- Match outreach preview costs/chance and execution; recheck funds, relations and cooldown boundaries without mutating state or consuming RNG.
- Exercise real Dexie readwrite transactions with test IndexedDB: rollback of insert and delete, restoration of overwritten checkpoints, serialized stale deletion versus another open connection, and owner/manual retention.

Rollback and concurrent-refresh regressions were also checked against the unfixed save implementation and failed as expected. The concurrent-refresh failure was a deleted refreshed checkpoint, not a timing-only assertion.

Three targeted production-browser checks were attempted with the installed Chrome executable. The browser aborted at launch before application assertions. Desktop/mobile UI and native macOS are not claimed verified in this patch; CI runs the normal full browser suite on `dev/**` pushes.

Existing large-bundle/ineffective-import warnings remain. H5–H8 and Schema 18 implementation remain open. See [release record](RELEASE-0981.md).

# Playtest 0.99.0 — Slice 8.1

Branch `dev/ron-phase7`; version `0.99.0`; current schema 18; supported load schemas 12–18.

`npm run check` passed: **1026 tests across 104 files**, TypeScript and production Vite build, zero errors. Existing bundling warnings remain.

New regressions in `release099.test.ts` and `organizationMigration099.test.ts` (63 tests):

- All 14 records exist in fresh and selected-country campaigns; separate instances do not share mutable organization state.
- P5 metadata, Chair+PermanentCouncil coexistence, strict membership/bodies and malformed-data refusal.
- All eleven typed payloads and six voting-rule snapshots persist through JSON save/load; unknown country/body references, invalid voter/choice, duplicate electorate members, invalid ratios, missing effects and NaN totals/funds are refused.
- Genuine 12–17 fixture shapes migrate with unchanged countries/RNG; the existing enriched roundtrip suite additionally checks native 18 saves and old tactical/optional fields.
- Frozen input remains unchanged, repeated migration is deterministic, the adapter returns the same 18 object on a second call, and normalized migrateSave outputs are reference-idempotent.
- Missing legacy industrial stock defaults fill once without breaking idempotency.
- Legacy UN/security memberships, overflow security seats, WHO ballots, outreach, journal and world fields are retained. Existing ballot processing produces identical country/ballot results after migration.
- Sanction expiry and missing-expiry defaults, overdue sanctions and annexed P5 identities survive migration without double-applying gameplay effects.
- Real Dexie writes use Schema 18 envelopes; malformed new organization data cannot replace a valid save; a resumed JSON state produces the same seeded tick.

The full check also includes the 365-day invariant and existing atomic put/prune transaction tests. Browser/native suites were not rerun; no production-browser result is claimed for 0.99.0.

Organization data remains dormant until the command/voting slices. Legacy-to-new authority reconciliation, complete legal financial/trade membership data and deep mechanics are follow-up work. [Release record](RELEASE-099.md) · [Model and roster notes](ORGANIZATIONS-099.md).

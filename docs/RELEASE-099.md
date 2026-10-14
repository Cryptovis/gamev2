# 0.99.0 — Organization Domain & Controlled Schema 18 Migration

Slice 8.1 on `dev/ron-phase7`, based on v0.98.1 commit `e9e6953e1a0f783e2b7e9d12f92604058e712e19`.

## Delivered

- A shared `CURRENT_SCHEMA_VERSION=18` in `src/domain/schema.ts`, re-exported from migrations for existing callers. Fresh/reset/selected-country campaigns and saved envelopes use Schema 18.
- Serializable domain types for 14 organizations, separate Chair offices, membership statuses, organization bodies, six voting-rule families, eleven resolution payload families, electorate snapshots, execution receipts, legacy sanction snapshots and financing records.
- Required `world.organizations` with catalog version, all 14 records, resolution/effect/financing tables, deterministic sequence and processing day.
- A pure `17: migrateOrganizations17To18` step. It preserves existing world/country data, ballots (including WHO), missions, journal, command receipts, wars, finances and RNG. No wall clock or random identifier is read.
- Legacy UN and security members remain represented. Only explicitly identified P5 countries receive PermanentCouncil metadata; the new security council has up to ten additional seats. Overflow legacy seats remain in the separate legacy body, and the original legacy roster/ballots stay intact.
- Active legacy sanction flags produce stable `legacy-sanctions:<countryId>` records. Existing expiry is preserved; absent expiry receives a deterministic day+365 snapshot; overdue expiry remains representable. Original sanction flags and expiry fields are retained.
- Strict organization validation rejects missing/unknown organization IDs, malformed memberships/bodies/resolutions, invalid P5/veto metadata, unknown country/body references, invalid ballots, inconsistent electorate totals, non-finite amounts and unsupported opaque effect/financing records.
- Default filling now reuses already-normalized objects. Both the adapter and repeated successful `migrateSave` calls are reference-idempotent, while genuine missing legacy defaults are still filled.

## Compatibility and scope

Valid Schema 12–17 saves migrate through the existing steps and the new adapter to 18; older than 12 and newer than 18 remain refused. Existing older-version fixture shapes omit the containers unavailable in that version, rather than merely changing their version label. Migration never writes back to IndexedDB automatically; callers retain the original saved record until an explicit save/checkpoint succeeds. Snapshot and checkpoint transactions keep the Slice 8.0 guarantees.

New organization data is a foundation for later slices. Legacy world/council gameplay remains authoritative for this release; migration records are snapshots, not additional sanction effects or duplicate voting processors. Legacy decisions made after loading can update the legacy containers; authority handoff/reconciliation is required before the new organization executor activates. WHO/outreach remain in their existing containers.

Versioned default rosters reuse the existing offline NATO/EU/ASEAN scenario and add CSTO/SCO/OPEC+/G20/OIC/BRICS templates. IMF, World Bank, WTO and WEF initialize observer-only participation without granting voting rights or funding. Their legal membership/quota/participation datasets must be resolved before activation. EU/AU institution-level G20 seats and BRICS partner categories are not fabricated as countries. See [roster and model notes](ORGANIZATIONS-099.md).

## Validation

- `npm run check`: **1026/1026 tests, 104/104 files**; TypeScript and Vite production build passed with zero errors.
- 63 tests in the two new files cover all eleven payloads, all six voting-rule families, rejection cases, real IndexedDB/Dexie persistence, legacy compatibility, deterministic frozen-input migration, reference idempotency, sanction snapshots and JSON replay equivalence. The previous save roundtrip suite now also includes native Schema 18 (one additional test).
- Existing 365-day invariant and the Slice 8.0 atomic checkpoint regressions remain green.
- Production browser/native macOS suites were not rerun for this domain/migration slice. The prior environment's Chrome-launch limitation remains; no new browser pass is claimed.

Existing Vite large-bundle and ineffective-dynamic-import warnings remain. This release does not implement new organization commands, voting effects, finance disbursements, sanctions enforcement or a new International Affairs interface.

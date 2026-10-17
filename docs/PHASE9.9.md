# Phase 9.9: Web Worker Simulation and Cloud Saves (Simülasyon İş Parçacığı ve Bulut Kayıt)

The daily pass for all 195 countries can now run in a module Web Worker, and a campaign can be kept in a Supabase project you control, encrypted if you want, and moved between devices with a guest profile. The simulation stays pure and seeded: the worker runs the same `tickGame` code the main thread ran before, so a day computed in the worker equals a day computed on the page.

## Files

- `src/sim/stateSync.ts`: the state keys that matter to the simulation, a two-level diff (`diffState`, `applyPatch`), a cheap digest of the numbers that drive the economy, and `simKeysEqual` for detecting changes made outside the command path.
- `src/sim/protocol.ts`: the messages (`load`, `batch`, `ping` and their answers).
- `src/sim/simulationCore.ts`: the worker's brain, free of DOM and worker globals, so vitest runs it directly. `simWorker.ts` is the thin shell; `hosts.ts` has `WorkerHost` and `MainThreadHost`.
- `src/sim/simulationBridge.ts`: the page side. `storeSimulation.ts` picks the mode and is what `useGameClock` calls (`tickClockDay`). `commandTap.ts` records every command the store applies. `perfMonitor.ts` and `simulationStats.ts` feed the Options readout.
- `src/cloud/`: `envelope.ts` (format, compression, AES-GCM), `guest.ts` (profile and transfer codes), `cloudConfig.ts`, `cloudStore.ts` (PostgREST client), `sync.ts` (planning and push, pull, resolve), `localSaves.ts`, `cloudControl.ts` (what the panel calls), `autoSync.ts`.
- `supabase/migrations/20261017000000_ron_cloud_saves.sql`: the table and its row-level-security policy.
- `src/domain/lineage.ts`, `src/persistence/validation099.ts`: the optional `world.lineage` field and its validator (saves with and without it load).
- UI: `SimulationOptions.tsx`, `CloudOptions.tsx` (both in the settings view), `system099.css`, `uiCatalog099System.ts` (tr, es, zh, ru).

## How a day is computed

The page still owns the state and commands still apply instantly, so the interface never waits. The worker holds a mirror. On each clock beat the bridge sends one `batch`: the commands recorded since the last sync, then one tick. The worker applies them with the same command executor, runs `time/advanceDay`, and answers with a patch of the countries and sub-objects that changed. Untouched entries keep their object identity, so React selectors that read them do not re-render.

Safety checks, all deterministic:

- A digest of the mirror is compared with the page before and after every tick. A mismatch drops that day, reloads the mirror under a new epoch, and counts a divergence. Three divergences switch to main-thread ticks for the rest of the session.
- If the store was changed by something other than a tracked command during a flight, the result is dropped and the mirror reloaded. Commands issued during a flight are replayed on top of the result.
- A beat that arrives while a day is still in flight is skipped and counted (backpressure), so the clock never queues work.
- A worker that fails to start (4 s), errors, or stops answering (15 s) is dropped for the session and the days continue on the main thread.

Modes (Options, Simulation thread; stored in `ron-sim-mode-v1`): Automatic uses a worker in a real browser and the main thread in headless runs and where `Worker` does not exist; Web Worker insists on a worker when one exists; Main thread keeps the old behaviour. Vitest runs in Automatic and so uses the main thread, which is why existing tests are unchanged.

## Cloud saves

A save envelope holds a header (campaign id, revision, device id, summary, encoding) and a base64url payload, with a SHA-256 checksum over both. Compression is gzip where `CompressionStream` exists. Encryption is AES-GCM with a key from PBKDF2-SHA256 (210,000 iterations); the header is the additional authenticated data, so a header cannot be swapped under a payload. The passphrase lives in memory only.

The guest profile (`ron-guest-profile-v1`) holds a device id and a 43-character sync key. Rows are addressed by `owner_key`, the SHA-256 of the sync key; the key itself travels in the `x-ron-sync-key` header and the policy in the migration compares its hash with the row. A transfer code (`RON-SYNC-1:` or, with a passphrase, `RON-SYNC-1E:`, plus a six-character checksum) carries the profile to another device.

Writes are optimistic: a new campaign is a POST, an update is a PATCH filtered on the revision the client last saw, and an empty answer is a conflict. Each campaign is planned as local-only, cloud-only, synced, local-ahead, cloud-ahead or conflict. A conflict offers keep this device, keep the cloud copy, or keep both (the cloud copy becomes a separate campaign). A pulled save is validated and migrated through the normal chain before anything is written, so a damaged or newer-schema cloud copy never replaces a local save. Automatic upload after an autosave is off by default, throttled to one a minute, and only uploads when this device is ahead.

## Interface

Settings gets two fieldsets. Simulation thread: a three-way mode switch, a status sentence, and a metrics grid (time to compute a day, round trip, time to apply the result, queued commands, days computed, skipped beats, discarded days, state reloads, frame rate, longest frame, stutters). Cloud saves: project address and key, turning the profile on, sync now, a row per campaign with its status and actions, passphrase, profile name, automatic upload, and transfer code create and join. Status badges differ by shape (circle, triangle, dashed ring, square) as well as colour.

## Caveats

- The cloud is a Supabase project you set up; nothing is hosted for you. The anon key is public by design; privacy rests on the policy plus the sync key, and on the passphrase if you set one. Anyone holding a sync key or an unencrypted transfer code can read and replace that profile's saves.
- Without a passphrase, an upload is readable by the project owner. With one, losing the passphrase loses the cloud copy.
- Compressing and encrypting a save runs on the main thread (a few milliseconds for a typical save). Only the daily pass moved to the worker.
- Commands issued while a day is in flight take effect on the page at once but reach the worker with the next beat.
- An untracked state change during a flight costs that day's result, not the player's change.
- Dexie stays at version 1; cloud metadata lives in localStorage (`ron-cloud-meta-v1:<owner>`), not IndexedDB.
- The worker may be created lazily; the first campaign day starts it.

## Validation

Run here: 54 simulation tests and 64 cloud tests (parity of worker and main-thread days over many ticks, patch and digest properties, divergence and conflict recovery, fallback, backpressure, envelope round trips, tamper detection, wrong passphrase, optimistic concurrency against a fake PostgREST, transfer codes), 9 text and layout tests, the full existing suite, and `tsc` over the changed graph. A real module worker in headless Chromium gave results identical to the main thread and cut the worst main-thread stall in a 5x run from 117 ms to 20 ms. Not run here (no network, no real toolchain): the real Vitest, `vite build`, Playwright (`e2e/system099.spec.ts`), a live Supabase project, and `tsc` over the TSX files with real React types. IndexedDB tests ran against an in-memory stand-in.

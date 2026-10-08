# Architecture Contract

1. UI sends typed commands; UI never edits simulation numbers directly.
2. Simulation systems are pure TypeScript where practical.
3. Randomness inside simulation uses the stored deterministic seed; no `Math.random()` in game logic.
4. Render clock and simulation clock remain separate.
5. Saves are schema-versioned and store only serializable GameState.
6. AI uses the same simulation state and relation model as the player.
7. New systems must add regression tests before being considered stable.
8. Release scope is recorded in versioned playtest notes; new architecture requires measured evidence and a save compatibility plan.

## 0.40 strategic systems boundary

Simulation remains command-driven and UI-independent:

`UI -> typed command -> pure simulation systems -> GameState -> UI`

New 0.40 systems:
- `systems/ministries.ts` owns cabinet allocation normalization and daily administrative effects.
- `systems/industry.ts` owns raw-to-processed conversion for fuel, steel and electricity.
- `systems/technology.ts` owns prerequisite checks and technology unlock effects.
- `systems/blocs.ts` owns alliance bloc formation and membership.
- `systems/council.ts` owns deterministic Global Council voting and resolution effects.

The UI may display forecasts and invoke commands, but may not calculate or directly mutate simulation outcomes.

## 0.82 command, persistence and research boundaries

Reviewed actions carry a UI confirmation ID into the typed command boundary. Only successful state changes retain that ID, bounded to 512 receipts. Dialog submission guards complement engine deduplication. Journal capture records observable reports at command/tick boundaries, capped at 200 entries.

Research costs are paid at project start; daily work and effects are engine-owned. Existing discoveries survive migration. Autosave success is recorded only after IndexedDB completes; failed writes remain retryable. Campaign IDs are UI persistence metadata, not simulation randomness.

Save validation currently checks critical campaign/country/research fields and finite values, but not every nested legacy subsystem. The simulation worker, full event journal and deeper schema validation remain future work.

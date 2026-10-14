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

Save validation checks critical campaign/country/research fields and finite values. Slice 8.0 also validates institution memberships, ballots, missions, religious shares and council state, including country references; not every nested legacy subsystem is covered. The simulation worker, full event journal and deeper schema validation remain future work.


## 0.98.1 organization foundation boundaries

World membership and attack-proposal commands share `validateWorldProposal` / `executeWorldProposal` with the actor explicitly supplied by the AI path and defaulting to the player in the UI command path. Proposal costs and daily institutional benefits do not depend on which actor is human. `previewOutreach` owns eligibility, cost and probability for both execution and UI review.

Autosave checkpoint writes and owner-scoped stale pruning run in one Dexie readwrite transaction. A prune failure aborts the checkpoint write as well. The per-instance autosave coordinator still orders snapshots, but atomic pruning does not establish a cross-tab single-writer policy for the same campaign.


## 0.99.0 organization domain and save boundary

Schema 18 requires the serializable `world.organizations` container. `domain/schema.ts` owns the version; migrations re-export it. `17: migrateOrganizations17To18` validates legacy data, adds versioned records and legacy sanction snapshots, and preserves the actual legacy ballots/rosters and all other world/country fields. It is deterministic and input-pure. Already-normalized save objects are reused on repeated migration.

`validationOrganizations.ts` strictly validates all fourteen IDs, membership/body identity, separate Chair offices, P5 metadata, rule/payload unions, electorate totals, country references and supported effect/financing shapes. No new organization executor is active in Slice 8.1: existing world/council logic remains authoritative until an explicit reconciliation/authority handoff in the next slice. Observer-only finance/trade/private-forum rosters grant no voting or funding privileges. [Full model and compatibility notes](ORGANIZATIONS-099.md).


## 0.99.1 voting and leverage boundary

Organization commands are typed GameCommands and share `applyOrganizationCommand` / `validateOrganizationCommand` for human and explicit AI actors. Proposal fees, payload validation and fixed rule/electorate snapshots are engine-owned. Rule/payload/electorate schemas are shared domain contracts; no UI formula is duplicated. Quota votes require explicit charter vote units rather than silently treating GDP as quota.

`processOrganizations` runs at the beginning of the next campaign day: close expired votes, record outcomes and standing, execute due decisions once, expire new sanction records, then cast seeded AI votes only on still-open ballots. AI draws thread the stored seed in stable ID order. Closing-day submissions/repeats/rejected commands/previews consume no RNG.

UN membership transitions mirror affected legacy rosters; completed legacy ballots update new metadata without changing their historical rule. Scoped new sanction records coexist with the preserved legacy flags but do not yet enforce trade/credit channels. Optional outcome/quota/failure metadata and the new typed effect branch retain forward loading of existing Schema 18 saves; older v0.99.0 cannot read the new sanction branch. [Execution policy and limits](RELEASE-0991.md).

# Phase 4 — Air/naval task groups and the cargo chain (0.90.0-playtest.13)

Owner: **Claude (Opus 5.5)**. 12 October 2026. Base: playtest.12, GitHub `6e279f4` (CI 38302601169 completed/success). Branch `dev/ron-taskgroups-0913`. Alper authorized Phase 4 only; Phase 5 (sound, animation, visuals) is untouched. Save schema 17 is kept: every new field is optional.

## Decisions approved by Alper

1. Schema 17: `WarState.taskGroups`, `WarState.taskReviewDay`, `Flight.shipmentId/delivered/lost` and `CommodityDelivery.id` are optional. Wars saved without task groups keep the fixed 25% share.
2. A new war starts with the default groups, equal to the fixed share, so the playtest.12 baseline is kept.
3. Balance targets: equal plains within ±0.5 front per day; air superiority plus close air support never above the mountain defensive edge; blockade at most 12% and interdiction at most 15% of enemy front supply, escorts (blockade) and air cover (interdiction) cancel at most half; shore support at most half of close air support; fuel only for assigned aircraft at the earlier per-aircraft rate.
4. Cargo in flight: paid cargo is never cancelled; war between the endpoints does not stop it; an unescorted cargo for a blockaded country may lose part of its goods (seeded roll, sitrep, no refund); goods for an occupied buyer go to the buyer of record.
5. Out of scope: air/naval units on the tactical board, real flights for trade deals and supply contracts (they stay visual), new map art.

Alper's two architecture notes are implemented: assigned forces are always cut to `min(assigned, national stock)` (`clampTaskGroups` daily and after every round, plus a read-time cap in `readyCounts`), and distances use a base's capital with a deterministic fallback to the country's map position.

## 1. Task groups (`src/engine/systems/taskGroups.ts`)

| Mission | Forces | Effect |
|---|---|---|
| Air superiority | fighters | Air superiority from assigned aircraft (CAS/interdiction aircraft count half, bombers 0.45); air cover for the ground battle |
| Close air support | fighters, bombers | Fighters: up to +12% power at a default share; bombers keep their strike value in power |
| Interdiction | fighters, bombers (×2 strike) | Up to −15% enemy front supply; the enemy's air-superiority fighters cancel up to half |
| Shore support | warships | Warships' power on a coastal front |
| Blockade | warships | Up to −12% enemy front supply and interception of unescorted cargo; escorts cancel up to half |
| Convoy escort | warships | Counters an enemy blockade and protects cargo |

- **Allocation:** whole aircraft and ships; one war and one mission at a time; total across a country's active wars never above its stock. Combat losses come out of the war's ready groups.
- **Bases and range:** a side flies from its capital, a country it controls or an independent ally (alliance treaty), whichever is nearest the front (the defender's map position). Capitals: Natural Earth 10m populated places (public domain) for 201 countries (`src/data/capitalPositions.ts`); four without one (ATA, ATF, NRU, NTS) fall back to `COUNTRY_POSITIONS`. Fighter radius 2,500 km, bomber 6,000 km. Warships need a home port; a blockade needs an enemy coast, shore support a coastal front.
- **Preparation:** a new or enlarged group is on station after 1–3 days (aircraft 1 + km/1000, ships 1 + km/4000); recall is immediate. Default groups of a new war are ready at once.
- **Fuel:** only ready assigned aircraft, at the earlier coefficients (fighter 0.02, bomber 0.032 per full offensive round; holding pays the sustainment share).
- **Shared preview and validator:** `taskGroupPreview` (reasons, max, base, distance, ready day, fuel) gates the typed `war/assignTaskGroup` / `war/recallTaskGroup` commands and the AI; `taskGroupSummary` drives the panel.
- **AI (`aiTaskGroups.ts`):** every 14 days each AI side scores at most six candidate assignments (default, air dominance, ground support, interdiction, blockade, escort) by projected log power ratio against the enemy's *default* assignment (plus a blockade when its own supply shows one) and switches only for ≥5% gain, through the same assignment function. Moving the enemy's hidden groups does not change its decision (test). The player's groups are never changed.

## 2. Cargo chain

- A commodity purchase is one shipment: the cargo flight and the exchange delivery share `shipmentId`; the position is booked from the flight's landing on the same day, with what actually arrived.
- **Fixed:** when the flight list was full, the oldest flight was removed and its cargo delivered immediately, while the buyer's position still showed it in transit and the route vanished from the map. Now landed and visual-only flights make room; cargo and goodwill flights stay listed until they land (hard limit 400 records; validation follows it). Regression test: `flights089.test.ts`.
- Blockade interception: chance 60% × the blockader's commitment; an intercepted cargo loses 25–75% (seeded); reported in the sitrep; the buyer has already paid.

## 3. Measured results

Paired twin countries, 24 seeds, auto-resolve front change per day over the first 30 days (`npm run measure:war`, Measure workflow `measure/war-tg-base` on playtest.12 and `measure/war-tg-after` on this branch).

All 14 playtest.12 scenarios give identical results (front, losses, fuel, air, supply) except **attacker 1.5× forces**: +3.605 → +3.619 per day (the default assignment rounds a quarter of each force up; 6 bombers → 2 rather than 1.5). Small-economy defence runs are identical (no bankruptcy or lasting arrears). Tactical board, 12 seeds × 20 rounds: unchanged except attacker 1.5× forces 73.63 → 73.88 (planner) and 66.64 → 66.85 (single-round).

| Task-group scenario (plains, twins) | Front / day | Air | Supply A / D |
|---|---:|---:|---:|
| Default groups (= fixed share, = older save) | **+0.31** | 0 | 54.9 / 57.2 |
| Attacker adds close air support (AS + CAS) | +3.35 | +19.8 | 56.0 / 58.6 |
| Attacker all fighters on CAS (no AS) | −0.89 | −32.9 | 55.0 / 57.3 |
| Attacker all fighters on air superiority | +4.95 | +59.4 | 56.4 / 59.0 |
| AS + CAS, defender grounded (cap) | +8.95 | +100 | 56.9 / 60.2 |
| Attacker interdiction, AS covered | +2.88 | +19.8 | 55.7 / 54.0 |
| Attacker interdiction, defender grounded | +10.43 | +100 | 56.9 / 51.6 |
| Attacker without shore support | −0.46 | 0 | 55.0 / 57.3 |
| Attacker blockade, no escorts | +1.17 | 0 | 54.8 / 50.4 |
| Attacker blockade vs defender escorts | +1.10 | 0 | 54.9 / 53.8 |
| Defender adds close air support | −2.72 | −19.8 | 56.0 / 58.3 |
| Attacker assigns no aircraft | −8.16 | −100 | 57.7 / 59.3 |

- Air superiority plus close air support reach exactly the mountain edge (+8.95, the same as full air superiority in playtest.12) and no further.
- Shore support is worth +0.77 per day, a quarter of close air support (+3.04).
- Interdiction stacks with full air superiority up to +10.4 because it is a separate, bounded supply effect (−15% at most).

## 4. Limits

- The tactical board stays ground-only; task groups act through the round's power, losses and fuel.
- Distances are capital to the front country's map position; there are no individual airfields or carriers.
- The AI's projection assumes the enemy's default assignment; it is bounded and explainable, not optimal.
- Trade deals and industrial supply contracts keep their own delivery rules; their cargo flights remain visual.
- A warship term no longer counts in battles on a landlocked front (it had no mission there). No harness scenario is affected.

## 5. Validation

686 unit tests / 84 files, TypeScript and production build passed; the 365-day long-run invariant passes. All 162 production-browser scenarios passed on GitHub-hosted Chromium (160 earlier + 2 task-group specs at 1440 px Turkish and 390 px English; CI 38312328349 and the full Measure suite on the release tree). War balance measured before and after on GitHub (`measure/war-tg-base`, `measure/war-tg-after`). Not run on StackBlitz: the npm registry is blocked in this session.

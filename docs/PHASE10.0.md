# Phase 10.0: Historical Scenarios, Adaptive Ambience and the Release Candidate Pack (Tarihî Senaryolar ve Uyarlanabilir Ses)

The Historical scenarios card on the landing screen now opens a window with three playable starts. A scenario is a pure, seeded rewrite of the opening state; once the campaign runs, the ordinary simulation owns everything. The ambience also follows the mood of the player's country, with light interface sounds, and all of it is in five languages.

## Files

- `src/domain/scenario.ts`: scenario ids and `world.scenario` (optional: `{id, startedDay}`). `src/persistence/validation100.ts` accepts saves with and without it, refuses an unknown id or a start day in the save's future.
- `src/scenarios/scenarios.ts`: the definitions (`SCENARIOS`) and `applyScenario(state, id)`. `scenarioSelection.ts` holds the pick between the landing window and the setup wizard (memory only, cleared when the campaign starts or the player returns to the menu).
- `src/store/gameStore.ts`: `startCampaign` takes an optional `scenarioId` and applies the scenario last, so a campaign without one is byte-for-byte what it was.
- `src/engine/systems/commodityExchange.ts`: `addShock` is now exported (the scenario opens the exchange with price shocks through the same function the exchange uses).
- UI: `ScenarioPicker.tsx`, a banner in `CampaignSetup.tsx`, `LandingShell.tsx` (opens the window), `scenarios100.css`.
- Audio: `ambientMood.ts` (pure mood), `moodBed.ts` (procedural bed), `uiChimes.ts` (interface sounds), `synth.ts` (a typed slice of Web Audio), `adaptiveAudio.ts` (shared instances and the preference), `AudioDirector.tsx`, `AudioOptions.tsx`.
- Text: `uiCatalog100Scenarios.ts` (tr, es, zh, ru), last in `MERGED_CATALOG_GROUP`.

## The scenarios

Each pins the simulation seed, so two starts of one scenario are identical, and records itself in `world.scenario`. The player still chooses a name, portrait and nation in the setup wizard; the window offers suggested nations (the wizard opens on the one picked) and the scenario suggests a portrait if the player has not changed the default.

- Modern World 2026 (standard): the shipped world. Same seed and same state as before; no war.
- Global Resource Crisis (demanding): in every country oil and food stocks are about halved (x0.5 and x0.55), uranium x0.55, iron x0.8, refined fuel x0.6, steel x0.85; oil, food and uranium production x0.85, x0.88 and x0.9; inflation +6 points (cap 45), unemployment +2.5, treasury x0.85, debt x1.08, productivity x0.95, approval -6, stability -7; freight throughput x0.82. The commodity exchange is opened on the untouched world, so its baseline remembers normal supply and the cuts read as a shortage, and it starts with shocks on oil (+0.35), fuel (+0.30), food (+0.30) and uranium (+0.22) that decay on their own. There is no interest-rate model in the game; the credit squeeze is represented by the inflation, the debt and the thin treasuries.
- Regional Conflicts (brutal): Russia attacks Ukraine and Israel attacks Iran (opened with the same `openWar` the AI uses, so the rules, relations, task groups and allies follow). The rules require fourteen days of refined fuel, so each attacker is topped up to that before it opens. Hostile pairs at the start: China and Taiwan (-78), China and the United States, Russia and Poland, Iran and Saudi Arabia, Israel and Syria, Iran and the United States. Stability is -8 and inflation +1.5 in the war zones, and the exchange opens with an oil premium (+0.12) and a gold shock (+0.07) beside its own war news. A war the rules block is skipped, never forced.

## Adaptive ambience

The mood is a pure function of the player's country: at war (war footing), else the number of pressures: inflation at 12 or more, stability at 35 or less, unions' unrest at 70 or more or a sectoral or general strike, and an IAEA standing of non-compliant, referred or sanctioned. One pressure is tense, two or more is a crisis. Pressures leave at 9, 42 and 60 (hysteresis), so a figure hovering at a line does not make the sound flutter.

The bed is a quiet procedural drone (three voices and a slow swell, no sound files) that glides over three seconds to a lower root, a darker filter, more beating and a deeper swell as the mood darkens. It sits under the recorded ambient track, follows mute, master and the ambience slider (at 55 percent of the ambience level), and fades in and out. Interface sounds: a soft tick for tabs (the recorded click still plays for buttons), a two-note chime when a new event opens, and a low hum when the mood darkens (never at load, never for war, which has its own alarm). They follow mute, master and the interface slider, are rate-limited, and at most three sound at once. If the browser has no audio, or anything throws, the layer switches itself off and the game continues silently.

Options, Sound: a switch for adaptive ambience (stored in `ron-audio-adaptive-v1`, on by default; the 9.14 audio settings keep their stored shape) and a line naming the current mood and what is pressing on the country.

## Caveats

- Scenario figures are game-scale tuning, not historical data. Titles name current regions in game terms; nothing here claims to predict anything.
- The crisis numbers were tuned for a 120-day run in which the world stays finite and few treasuries collapse; they have not been tuned for a full year of play.
- A scenario applies on the first day only. Saves made from a scenario campaign carry `world.scenario` for display and for support; nothing in the simulation reads it.
- The bed and chimes were tested with a recording stand-in for the audio context. They have not been listened to on real hardware here.
- The recorded war ambience is unchanged; the bed adds a layer under it.

## Validation

Run here: 23 scenario tests (catalogue, determinism, per-scenario effects, 120 simulated days each, saves with and without the field), 27 audio tests (mood, hysteresis, bed, chimes, failure paths, hand-off), 14 text and layout tests, the full existing suite against the 9.9 baseline, `tsc` over the changed graph, and Chromium renders of the window (Navy and Ivory, 1280 and 390 px, English, Turkish and Russian). Not run here (no network, no real toolchain): the real Vitest, `vite build`, Playwright (`e2e/scenarios100.spec.ts`), `tsc` over the TSX files with real React types, and a listening pass on real audio hardware.

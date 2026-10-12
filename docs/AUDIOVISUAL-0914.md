# Phase 5 — Sound, battle effects and terrain (0.90.0-playtest.14)

Owner: **Claude (Opus 5.5)**. 13 October 2026. Base: playtest.13, GitHub `37a1ec3` (CI 38316233545 completed/success). Branch `dev/ron-audiovisual-0914`. Alper authorized Phase 5. Simulation, seeded RNG, save schema 17 and game numbers are unchanged; no file under `src/engine/` or `src/persistence/` changed.

## Rules from Alper and how they are met

| Rule | Implementation |
|---|---|
| Central Howler.js service: UI, battle/radio, ambience | `src/audio/audioService.ts`: one service, three channels plus master volume; `AudioDirector` turns store events into cues |
| Concurrent limit, mute | At most 4 effects at once (extra cues are dropped); mute and volumes in Player options → Sound |
| Autoplay rule | No sound is created or played before the first pointer or key press; Howler (9.6 kB gzip) is bundled so menus never wait for a module download at click time |
| Silent fallback | Library or file failure leaves the service `unavailable`; every call is a no-op and the options show "Sound could not be loaded"; a browser test aborts every sound request and checks for no page errors |
| Effects only from resolved events | `src/presentation/battleEffects.ts` derives effects and cues from `TacticalRoundEvent.actions` only; pure, no `GameState`, no RNG, no clock |
| State never changes with effects on, off or skipped | Tests: deriving every effect and summary leaves a frozen state byte-identical; a battle continued after "watching" equals one continued without; the final playback frame equals the recorded units |
| Motion rules | Effects use transform/opacity and SVG stroke drawing only; `prefers-reduced-motion` and the new low-effects option replace step animation with one round summary |
| Summaries at high speed | 4× playback or the 5× clock: one summary per round, at most two cues per round; auto-resolved wars at 5× give one radio report per five rounds |
| Asset licences | All sounds and terrain tiles are original (sounds synthesized by `docs/audio/synthesize_audio.py`); recorded in `docs/ASSET_MANIFEST.md` |
| D3 world map untouched | No change under `src/map/`; no PixiJS or Motion |

## 1. Sound

- **Library:** Howler.js 2.2.4 (MIT) and `@types/howler` 2.2.13 (MIT, dev). The npm registry is blocked in this session, so the lockfile was produced by npm on a GitHub-hosted runner (`measure/lock-howler`, run 38319516957). The reviewed diff adds exactly these two packages, with no transitive dependencies, from registry.npmjs.org with sha512 integrity.
- **Cues** (each played at most once per event id): war alarm when a war involving the player starts (not for wars already in a loaded save); radio report per resolved round of a player war; capture or group-lost when the player's war ends; artillery fire with impact (hit) or distant impact (miss), capture and group lost during step replay; click and confirm sounds for buttons, tabs and selectors. Ambience: command loop in peacetime, war loop while the player is at war, with a 1.5 s fade.
- **Settings** (`trp-audio-v1` in this browser): mute, master 80%, interface 60%, battle and radio 80%, ambience 35%, low effects off. Malformed values fall back to the defaults. Settings are never written to a save.
- **Files:** 11 sounds × (WebM/Opus + MP3) = 1.3 MB, loaded only when first played.

## 2. Battle effects and terrain

- **Effect layer** (`BattleFxLayer`, SVG): movement trail and arrival, blocked move, artillery arc with impact burst or miss ring, recon sweep, contact flash for casualties and lost groups, objective ring for capture or contest. Decorative (`aria-hidden`), never interactive; the existing step glyph and caption remain.
- **Round summary strip:** moves, bombardments and hits, personnel lost on each side, objectives captured, groups lost and front change, shown when effects are summarised. Replay then jumps straight to the recorded result.
- **Terrain tiles:** six original SVG tiles (plains, forest, mountain, desert, urban, coastal) over the earlier gradients, which stay as the fallback. Fogged sectors keep their plain dark fill, so hidden terrain is not revealed.

## 3. Limits

- The world map has no sound or effects of its own (out of scope).
- Sounds are synthesized placeholders of acceptable quality, not studio recordings; replacing them only needs new files with the same names.
- Event ids are remembered for the tab's lifetime (last 600); reloading the page can play a report again for a round resolved after the reload.
- A browser that blocks audio entirely simply stays silent; no prompt is shown.

## 4. Validation

See CHANGELOG and PLAYTEST-090 for the release validation of this branch.

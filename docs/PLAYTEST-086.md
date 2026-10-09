# 0.86.0-playtest.1 — HD War Playback

Branch: `dev/hd-playback-086`. Base: 0.85.0-playtest.1 (`dev/hd-war-085`). Source: the "HD War playback" step in [ROADMAP.md](ROADMAP.md).

## Checks run

- GitHub CI on `dev/hd-playback-086` (run 37893781764) passed: Vitest unit suites, `tsc --noEmit`, production build and the Playwright browser scenarios. The tactical scenario now also opens the playback controls, skips to the result and checks the recorded losses are unchanged.
- New unit suite `tactical086`: the battle RNG stream leaves the world seed untouched, gives the same result under any world seed and survives save/load; the AI holds a threatened depot, bombards a visible enemy in range, takes an open depot, and stays within budget with one order per group over six rounds; playback starts at the pre-round units, moves a group exactly at its move action and ends at the recorded result; a migrated round without a timeline plays as one step.
- All earlier tactical, war and migration suites pass unchanged.

## How to playtest

1. Open HD War, commit a round, then choose **Replay recorded result**. Groups should move one action at a time, with ✹/○ for hits and misses, −N for losses and ◆ for captures.
2. Try pause, previous/next step, the 1×/2×/4× speed button and **Skip to result**. The losses line must not change.
3. Open **Round log**: the highlighted line should follow the current step.
4. Turn on reduced motion in the operating system and replay a round: it should open at the result.
5. Play several rounds against the AI and watch whether it defends depots you threaten and bombards your groups when they come into artillery range.
6. Load a 0.85 save with an open battle and continue it.

## Known limits

- Effects are glyphs and CSS animation; there are no sprites, terrain models or sound yet.
- Simultaneous actions play one after another in a fixed order: attacker orders, defender orders, then losses and captures.
- The AI plans one round at a time and does not keep a multi-round plan.
- AI countries still never declare war (B9/E1). The remaining Phase 2 items are open.

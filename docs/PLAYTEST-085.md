# 0.85.0-playtest.1 — HD War v2

Branch: `dev/hd-war-085`. Base: 0.84.0-playtest.1 (`dev/audit-fixes-084`) plus the first C4 economy change from `dev/economy-balance-085`. Source of the work: [0.83 audit](AUDIT-0.83.md), Phase 3 (section F, B5, B8) and part of C4.

## Checks run

- GitHub CI on `dev/hd-war-085` (run 37866096694) passed: Vitest unit suites, `tsc --noEmit`, production build and the Playwright browser scenarios. The tactical scenario opens a 10×8 board with 80 sectors and five friendly groups, commits a move, replays the recorded round and reloads a save mid-battle.
- New unit suite `tactical085`: board size and group count; point-symmetric terrain, deployment and depots; seeded terrain; contested depots; contact measurement; loss distribution across groups; action timeline; national/group loss reconciliation; auto-resolve force share and loss scale against a tactical round; schema 16 → 17 migration of an open 6×6 battle; rejection of out-of-grid sectors.
- Existing `tactical083` and `audit084War` suites were moved to v2 coordinates and group ids and still pass. Migration tests now expect schema 17.
- New suite `economy085`: debt service grows with leverage; growth is unchanged up to 25% tax and lower above it, with a floor.

## How to playtest

1. Start a new campaign, declare war and open HD War. The board should be 10 columns × 8 rows, with five groups per side and two ◆ depots.
2. Compare your side with the enemy's: the terrain pattern and deployment should mirror through the centre.
3. Move a group onto a depot. Its ◆ turns green while no enemy is next to it. Move an enemy-adjacent group nearby, or wait for the AI, and the depot shows as contested.
4. After a round, open **Round log** in the result panel and check that moves, blocked moves, hits/misses, losses and captures match what happened on the board.
5. Load a 0.84 save that has an open tactical battle. It should continue on its 6×6 board.
6. Fight one war with auto-resolve and compare its length and losses per round with HD War. Both should lose forces at a similar rate per round.
7. With a high debt or a tax rate above 25%, watch the daily balance and growth in the economy panel.

## Known limits

- The battle seed drives terrain only; combat rolls still use the shared world RNG stream.
- The round log is text. Animated playback driven by the action timeline is the next HD War step.
- The AI pushes groups greedily toward the nearest open depot and does not coordinate an attack.
- AI countries still never declare war, so the player-as-defender path (B9) has unit coverage only.
- C4 is partial: activity repetition is not limited yet. The rest of Phase 2 remains open.
- The `artillery` role label still lacks es/zh/ru translations (unchanged from 0.84).

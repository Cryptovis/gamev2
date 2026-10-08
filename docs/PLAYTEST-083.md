# 0.83.0-playtest.1 — Tactical Command

Branch: `dev/tactical-command-083`. Base: 0.82.0-playtest.6 at `30bc453`.

## Delivered

- HD War Experience opens a playable 6×6 tactical board during an active player war. One infantry, armor and artillery group per side represent up to 25% of the corresponding national forces, rather than invented units. Groups cannot be committed to two tactical wars involving the same country.
- Three command points per round; one order per surviving group. Advance, defend, flank, recon, reserve and bombard have visible costs and limits. Movement checks range, occupied destinations, intermediate routes, fog and mountain restrictions. Flanking must advance toward the opposing front. Recon reveals a target area for the next planning round. Reserves reduce present losses and prepare a bounded later offensive bonus. Artillery increases losses for the targeted force type.
- One resolved round per campaign day, with a review before spending fuel. Player and AI use the same order validator and budget. Both plans execute simultaneously; competing destinations leave both groups in place. National force strength, crew coverage, supply, air support, terrain and exhaustion remain authoritative in the shared combat resolver. Defensive holds cannot gain offensive territory for free.
- Tactical casualties debit the real armies once and reduce the corresponding committed groups. Fuel is charged to both sides. The existing strategic victory/defeat lifecycle controls territory and victory notices. Attacker withdrawal establishes a ceasefire; defender withdrawal concedes national control, with an explicit review warning.
- Up to 60 versioned round records retain orders, before/after positions, losses, fuel, visibility and front changes. Replay selects a retained round and animates its recorded movement without changing game state or drawing new random values. Draft orders are local to the screen; committed battlefield state survives save/load. Auto assault routes tactical wars through the same resolver; returning to manual tactical command stops auto assault.
- National Economy includes Chart.js line charts for GDP, treasury, inflation and net treasury change, with 30/90/180-day ranges and an accessible data table. Up to 180 actual daily samples persist. Net treasury change includes all observed treasury movement, not just tax income. Migration begins history on the loaded day; historical observations are not fabricated.
- Save schema 16 migrates schemas 12–15 and validates the new tactical and history records. Round identity and existing bounded command deduplication prevent repeat confirmation/reload spending.
- Tactical and Chart.js screens load on demand. Existing bundled military atlas assets provide the unit artwork. Keyboard sector navigation, touch controls and reduced-motion behavior are included. No PixiJS/Phaser runtime or 3D battlefield is introduced.

## How to playtest

1. Update to the release branch, run `npm ci` and `npm run dev`; verify 0.83.0-playtest.1 in setup. Previous saves can be loaded directly.
2. Select another country → War → review a declaration. Inside War Command open HD War Experience.
3. Select a group, choose an order, and choose a target sector if needed. Queue up to three command points, review fuel and confirm. Compare the army totals and recorded result.
4. Replay the recorded movement; verify fuel, losses and front progress do not change. Close, save, reload and reopen War Command to resume the same battlefield.
5. Advance a campaign day to give new orders. Pending national decisions must be resolved first. Try blocked targets, two-point movement, low fuel, reserves, recon and artillery.
6. Return to War Command and enable auto assault; confirm days/rounds advance once and stop when returning to manual tactics. Review withdrawal before confirming it.
7. National Economy → Economic history: advance time, change metric/range and compare the chart with its data table. Load an old save and verify no invented earlier history appears.

## Validation and limits

`npm run check` runs engine/persistence regressions, TypeScript and the production build. `npm run test:e2e` exercises the production site, including the previous 0.82 scenarios, tactical orders/replay/save/load at desktop and mobile sizes, and economic chart/table controls.

This is the first playable tactical slice. AI is a deterministic rules-based commander, not a competitive search engine. The board is an abstract theatre rather than a geographic military map; representative force groups do not model every soldier. Air/naval contributions remain in the strategic resolver. Long campaign balance, sustained mobile profiling, audio and richer animation still need playtesting. PixiJS remains a later rendering candidate when measured needs justify it.

V3 is deferred until the whole game is ready for the complete-playability milestone; it is not a prerequisite or rewrite for 0.83.

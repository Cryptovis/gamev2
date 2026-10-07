# Guided Command · 0.77.0-playtest.1

Based on dev/decisions-world-076. Schema remains 14; existing compatible campaigns can load. Replaying the tutorial is available from Help for existing saves.

## Changes

- A shared workspace replaces the previous independently openable rail panels. Country selection, rail windows, Help and the war command replace one another. Commander options close when another workspace opens.
- A ten-step tutorial dims the screen around the current control. Players open the menu, choose a tab where applicable, read it and close it using X. Next stays disabled until the required actions finish. Time is paused; tutorial step/completion persists.
- A shared visible-text localization layer covers setup, country display names, menus, reviews, Help, tutorial, programs and the war window. The catalog provides Turkish, Spanish, Chinese and Russian translations alongside English. Dynamic simulation prose and unmatched legacy descriptions retain their English fallback; they should be added as full templates, rather than translated word by word.
- A generated nine-tile navigation atlas adds globe, goal, market, map, diplomacy, alert, intelligence, Help and military artwork. Image elements preserve source artwork when active-tab background styles change.
- Geographic surface uses NASA's 5400×2700 Blue Marble source, locally reduced to 4096×2048. Projection raster doubles to 1200×700 and uses bilinear sampling with dateline wrap. Country hit-testing still uses real geometry. This is a satellite visualization, not a fabricated map or street-level terrain renderer.
- Lighter slate panels and gold active states improve contrast and visibility.
- Help offers first-day shortcuts, twelve searchable FAQs, tutorial replay and national development programs. Each program has a pre-spend review, a one-time cost, a duration and an explicit effect applied exactly once. Pending programs persist in saves.
- War declaration opens a two-country comparison with actual inventory, readiness, morale, supply, losses, front position and power ratio. Combat uses the existing engine. The window can resolve a round, toggle automatic assault, or advance a day.
- HD War Experience is a gold button that opens a localized work-in-progress explanation. A separate roadmap specifies future milestones; no cinematic battle renderer is implemented yet.

## Manual playtest

1. Change each setup language; verify headings, stepper, country names and portrait controls. Change language again after startup.
2. Complete the tutorial by clicking each highlighted menu, tab and X. Skip and replay it from Help. Check that Next cannot skip a required click.
3. Alternate Market, Supply, Diplomacy, nation tabs, Help and commander options. Exactly one main workspace should remain open.
4. Select Military repeatedly; the tank picture must stay visible. Check other active-state icons.
5. Switch to geographic flat and globe projections; zoom, pan, rotate and click countries. Compare image smoothness at 500% zoom.
6. Search FAQs in the selected language. Fund a development program, try starting it twice, save/load before completion, advance its required days and verify its benefit applies once.
7. Declare war after the existing strategic confirmation. Inspect both sides, resolve a round, advance a day and reopen from the war tab or World pulse. Click HD War Experience; verify the WIP explanation.
8. Repeat window and review checks on a narrow viewport.

# HD War Experience roadmap

The current button remains a clearly marked work-in-progress entry point. No HD battlefield or tactical mode is released in 0.82.0-playtest.6. The direction now includes meaningful player decisions, rather than only passive playback. The deterministic TypeScript combat engine stays authoritative; visual libraries cannot decide casualties or award resources.

## Proposed first playable slice (0.83 candidate)

- A small turn-based sector board (for example 6×6) with terrain, supply lines and representative infantry, armor and artillery groups. Unit icons represent allocated force groups, not every soldier.
- Each side receives a bounded command budget each turn. Recon reveals information, defensive orders improve cover, flanking spends supply and exposes units, and reserves trade immediate pressure for future strength. A stronger economy still matters; tactical choices offer bounded modifiers and cannot grant unlimited troops or erase logistics.
- The player reviews costs and risks, commits orders, the AI chooses under the same rules, and the engine resolves one round into a retained event record. Then the UI animates that record and shows losses, supply and objective changes. Reloading or replaying cannot reroll the round or apply losses twice.
- Auto-resolve remains available, with comparable rules and AI strength. Retreat, victory/defeat and campaign transfers share the current strategic war lifecycle. Mid-battle saves need versioned tactical state before the feature is enabled.
- Prototype the choices with React/SVG first. Add a lazy-loaded PixiJS battlefield renderer only after the gameplay loop and measured sprite/animation needs justify it. Phaser is a full game framework, so importing a second game lifecycle into this React project needs a stronger reason than prettier icons. No new runtime dependencies are added in this patch.
- Start with one terrain set, three unit roles, one supply objective and a short battle. Release gates: deterministic orders/events, bounded force allocation, AI parity, save/load/replay reconciliation, accessible touch/keyboard controls and measured mobile performance.

Official implementation references: [PixiJS architecture](https://pixijs.com/8.x/guides/concepts/architecture), [Phaser documentation](https://docs.phaser.io/), [Chart.js modular integration](https://www.chartjs.org/docs/latest/getting-started/integration.html). Chart.js is a separate candidate for GDP/inflation trends after a retained economic time series exists; it does not implement tactics.

## Subsequent visual development

1. **Combat events:** emit a deterministic, replayable record of each round, force snapshots, terrain, supply, losses and outcome. Rendering must never reroll casualties.
2. **Battlefield prototype:** terrain mesh, tactical camera, representative tank/aircraft/infantry models and a bounded pool of visual units. Separate actual force counts from rendered representatives.
3. **Playback:** animations, paths, effects and sound driven by recorded events. Pause, speed controls and skip-to-result. No requirement to watch a cinematic to continue a campaign.
4. **Campaign integration:** front changes, reserve deployment, logistics disruption and diplomatic consequences reflected consistently in both the strategic UI and battle playback.
5. **Performance and accessibility:** low/medium/high quality presets, mobile fallback, reduced motion, readable overlays and keyboard controls. Validate GPU/memory budgets before enabling large battles.
6. **Release gate:** deterministic replays, save/load compatibility, loss reconciliation, tested retreat/victory/defeat flows and no simulation changes from changing visual quality.

Later candidates: ministers with measurable bonuses and costs; debt and loan repayment; domestic approval events; energy security; more institution resolutions. Add these with financial reviews, balanced AI and save compatibility rather than empty menu entries.

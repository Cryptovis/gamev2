# HD War Experience roadmap

0.83.0-playtest.1 enables the first playable tactical battlefield from HD War Experience. See PLAYTEST-083.md for delivered orders, committed forces, replay and verification. Visuals use responsive React/CSS with bundled artwork; this is not a 3D cinematic release. The deterministic TypeScript combat engine stays authoritative; visual libraries cannot decide casualties or award resources.

## First playable slice (0.83 delivered)

- A 6×6 turn-based sector board with terrain, a supply depot objective and representative infantry, armor and artillery groups. Unit icons represent allocated force groups, not every soldier.
- Each side receives a bounded command budget each turn. Recon reveals information, defensive orders improve cover, flanking spends supply and exposes units, and reserves trade immediate pressure for future strength. A stronger economy still matters; tactical choices offer bounded modifiers and cannot grant unlimited troops or erase logistics.
- The player reviews costs and risks, commits orders, the AI chooses under the same rules, and the engine resolves one round into a retained event record. Then the UI animates that record and shows losses, supply and objective changes. Reloading or replaying cannot reroll the round or apply losses twice.
- Auto-resolve remains available, with comparable rules and AI strength. Retreat, victory/defeat and campaign transfers share the current strategic war lifecycle. Mid-battle saves retain versioned tactical state and validated round records.
- The first prototype uses React/CSS. Add a lazy-loaded PixiJS battlefield renderer only after the gameplay loop and measured sprite/animation needs justify it. Phaser is a full game framework, so importing a second game lifecycle into this React project needs a stronger reason than prettier icons. Chart.js is added for the separate economic history panel; PixiJS/Phaser are not installed.
- Start with one terrain set, three unit roles, one supply objective and a short battle. Release gates: deterministic orders/events, bounded force allocation, AI parity, save/load/replay reconciliation, accessible touch/keyboard controls and measured mobile performance.

Official implementation references: [PixiJS architecture](https://pixijs.com/8.x/guides/concepts/architecture), [Phaser documentation](https://docs.phaser.io/), [Chart.js modular integration](https://www.chartjs.org/docs/latest/getting-started/integration.html). Chart.js now draws retained GDP/inflation/treasury observations in National Economy; it does not implement tactics.

## Subsequent visual development

1. **Combat events:** extend the delivered deterministic round records with finer actions and effects. Rendering must never reroll casualties.
2. **Battlefield prototype:** terrain mesh, tactical camera, representative tank/aircraft/infantry models and a bounded pool of visual units. Separate actual force counts from rendered representatives.
3. **Playback:** animations, paths, effects and sound driven by recorded events. Pause, speed controls and skip-to-result. No requirement to watch a cinematic to continue a campaign.
4. **Campaign integration:** front changes, reserve deployment, logistics disruption and diplomatic consequences reflected consistently in both the strategic UI and battle playback.
5. **Performance and accessibility:** low/medium/high quality presets, mobile fallback, reduced motion, readable overlays and keyboard controls. Validate GPU/memory budgets before enabling large battles.
6. **Release gate:** deterministic replays, save/load compatibility, loss reconciliation, tested retreat/victory/defeat flows and no simulation changes from changing visual quality.

Next playtests: campaign balance over sustained wars; AI choices around recon and prepared reserves; broader defender-side browser coverage; mobile memory and frame-rate budgets. Existing credit, domestic events, energy and institutions should be extended through their current systems, with financial reviews and save compatibility. V3 remains the whole-game playability milestone.

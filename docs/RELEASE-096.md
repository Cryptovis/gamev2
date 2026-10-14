# 0.96.0 — Master UI/UX, War Planning & HUD Symmetry

Development release on `dev/ron-phase7`, not merged into `main`.

## Delivered

- Language buttons have transparent enclosing space and gold hover/keyboard-focus borders.
- Wizard header/footer remain outside the scrolling body. Matched Return to sign in / Load previous progress buttons and compact identity quote eliminate Step 1 scrolling at tested ordinary desktop/mobile sizes. Return to sign in clears the local session and opens sign-in, retaining saved campaigns. Exception: unusually short screens or added error/status content may scroll so every field stays reachable.
- Portrait guidance sits below selection, above navigation; style filters remain by the title. Portrait, country, opening profile and confirmation cards use semantic Light surfaces. The loading backdrop has a static grid watermark at 10% opacity.
- Economy, living standards, policies, recruitment, military status and pilot-training cards use Light surface/border/ink tokens. Canvas chart colors follow the root theme with a scoped observer that disconnects on chart unmount; history and calculation rules are unchanged.
- Identity cards center their contents; a decorative neutral gold scripture icon accompanies the explicit religion text.
- Supply summaries use Light tokens; desktop suppliers form three columns, wrap on narrower containers, and put actions below facts to retain readable country names. Removed the old 640 px single-resource constraint.
- Transparent clock/speed wrapper, distinct date/speed pills, semantic strategic review cards/warnings/auto-confirm controls, secondary fuel help beside declaration actions and equal 72 px rail footprints with a 10 px text floor.
- English, Turkish, Spanish, Chinese and Russian return/status translations; remaining copy reuses existing localization.

## Boundaries and validation

Schema 17, RNG, engine formulas, command dispatch and persistence untouched. `appearance.ts` and `appearancePhase7.css` are unchanged; default Light and existing contrast rules remain authoritative. UI overrides live in `release096.css`. No new dependency, audiovisual asset or save field.

`npm run check`: 915/915 unit tests in 98/98 files, TypeScript and Vite production build passed with zero build errors. Existing large-chunk and ineffective dynamic-import warnings remain; bundling is outside this sprint.

Targeted Chromium production preview: 10/10 release scenarios passed in 43.1 seconds, plus 2/2 existing HUD notification-clearance regressions in 10.4 seconds. Covers five-language wizard review/contrast, no Step 1 scrolling at desktop 1440×900, Turkish 390×650 and other mobile 390×844 viewports; footer access on 844×390 landscape; actual sign-in return; national cards, desktop three-column/mobile suppliers, fuel helper return to France, rail text at 10 px in every language, and recorded chart repaint on theme change. Screenshots inspected for onboarding, suppliers, command cards, negotiation and chart.

Initial focused runs exposed overridden gold borders/selected text, the old 640 px supplier cap, compact identity overflow and an over-wide Russian rail label. All fixed; the final 10-scenario release run is green. Full browser/native macOS suites were not rerun.

See [playtest](PLAYTEST-096.md), [changelog](../CHANGELOG.md) and [roadmap](ROADMAP.md).

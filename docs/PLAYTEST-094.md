# Playtest 0.94.0

Branch: `dev/ron-phase7`. See [release contract](RELEASE-094.md).

- `npm run check`: **909/909 unit tests in 97 files**, TypeScript and Vite production build passed (zero build errors).
- The 365-day long-run invariant passed before gameplay changes and in the final full check. The release adds 22 focused role/version/localization regressions, including seeded combat, save round trips, neutral old records and portrait immutability.
- **8/8 targeted production-browser scenarios passed** in 40.7 seconds: five-language portrait/perk flow, desktop/mobile HUD/globe/drawer/toast geometry and toast focus/expiry. Linux Chromium with software rendering; no full browser suite or native macOS run was performed.
- `git diff --check`, case-fold audit of 631 existing paths and release Markdown/version consistency checks passed. The command MP3 exactly matches the supplied soundtrack blob; the staging file is absent.
- Appearance defaults to Light; appearancePhase7.css and migration steps are unchanged.

Manual acceptance: start a fresh game, review all six archetype descriptions in Step 2 and the opening treasury in confirmation. Start as each role; inspect output/tax, recovery, embassy fee, recruitment/training, defensive odds, interest or food/water as applicable. Save/load and change the portrait: the campaign perk remains fixed. Resume an older Schema-17 record: it remains neutral.

At 1440px and 390px, check independent HUD cards and Map/Help buttons, Light ivory viewport/globe shadow, readable identity badges, tactile enabled actions and bottom-left toast separation from camera/rails. Check keyboard focus and reduced motion. The MP3 command soundtrack starts only after a gesture; mute/volume and WebM codec fallback remain available.

Remaining measured-performance work: initial bundle size and hidden retained workspace computations. V3 remains the complete-playability milestone.

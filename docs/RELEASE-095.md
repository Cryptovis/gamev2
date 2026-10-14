# 0.95.0 — National Command & Audio Settings Polish

Development release on `dev/ron-phase7`, not merged into `main`.

National Command uses Light semantic surfaces for the shell, commander sidebar, profile, history and session controls. Sound labels, mute/low-effects checkboxes, status and percentage badges use high-contrast ink; sliders have visible tracks and blue focus thumbs. A single scrolling body leaves the header and Return to Command footer outside the scroll region, including short mobile landscape screens.

Backdrop mouse-down now prevents the browser from clearing the restored portrait focus after dismissal. The existing managed-dialog lifecycle, command handlers and localized text are preserved. No engine, domain, persistence, audio playback or translation behavior changed. Schema 17, deterministic RNG, existing saves and the default Light appearance remain unchanged. `appearancePhase7.css` was not edited; overrides live in `release095.css`.

Validation: `npm run check` passed: 909 unit tests in 97 files, including release/schema, localization, case-collision and long-run invariants; TypeScript and Vite production build passed with zero build errors. Vite still reports the existing large-chunk warning; this sprint does not address bundling.

Seven targeted production-preview browser scenarios passed: five languages with every profile tab, visible footer, no horizontal body overflow, readable audio labels/outputs and working volume/mute controls; short landscape scrolling with footer dismissal; Dark backdrop dismissal and focus return. Light scenarios also verify Escape focus return. Screenshots inspected for desktop, mobile and landscape. Full browser and native macOS suites were not rerun.

See [playtest record](PLAYTEST-095.md) and [changelog](../CHANGELOG.md).

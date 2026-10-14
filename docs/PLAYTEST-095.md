# Playtest 0.95.0

Branch: `dev/ron-phase7`; package version: `0.95.0`; save schema: 17.

- `npm run check`: 909/909 unit tests, 97/97 files; TypeScript and production Vite build passed, zero build errors.
- Targeted Chromium production preview: 7/7 scenarios in `e2e/nationalCommand095.spec.ts`. English desktop 1440×900; Turkish, Spanish, Chinese and Russian mobile 390×650; English landscape 844×390; Dark backdrop/focus regression.
- All five tabs retain the footer inside the viewport and avoid horizontal content overflow. Sound labels/outputs use semantic ink, master volume updates its percentage, mute disables controls and unmute enables them. Escape/backdrop restore focus to the portrait.
- Desktop, mobile and landscape screenshots inspected; no full browser suite or native macOS run. Existing Vite chunk-size warning remains.

Manual follow-up: verify native Firefox/WebKit range styling and device-specific scrolling on actual mobile hardware. No change to existing audio preferences, campaign data, RNG or translations.

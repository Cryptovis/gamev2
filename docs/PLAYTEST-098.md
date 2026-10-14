# Playtest 0.98.0

Branch `dev/ron-phase7`; official version `0.98.0`; save schema 17.

`npm run check`: 930/930 unit tests, 100/100 files; TypeScript and Vite build passed with zero build errors. Existing bundling warnings remain.

Targeted Chromium production preview: 11/11 release scenarios passed in 35.4 seconds with one worker and a 30-second per-scenario timeout. Three existing HUD/Dark-modal regressions also passed in 12.4 seconds. The full browser suite was not launched.

Coverage in `e2e/release098.spec.ts`:

- 1440×900 desktop and 390×650 Turkish mobile quote sizing, body fit and footer access.
- Desktop/mobile semantic Light credit guidance/cards/active tab, inbox guidance/counters, Help situation/goals/risks including an oil shortage, and map notice. Card foreground contrast is checked against its computed background.
- Desktop/mobile energy counters/plant cards, bilateral relationship/goodwill, three World influence cards, institution icon/abbreviation separation and religious composition. Dossier navigation is uniformly uppercase.
- A foreign country has exactly one Foreign political influence action; the remaining tab opens the existing engine-backed blocked actions. Blocker text retains a contrasting red warning treatment.
- English, Turkish, Spanish, Chinese and Russian cultural titles, centered identity icons and target-button/tab focus clearance.

Screenshots inspected for mobile quote/footer, credit navigation, institution marks and localized cultural identity cards. Case-folded repository filenames and README local links verified.

Full browser suite, native macOS and Firefox/WebKit were not rerun. Existing long-run engine invariants are included in the unit suite; no gameplay numbers were changed.

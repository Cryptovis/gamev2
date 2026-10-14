# 0.98.0 — Readable Light Subpanels & Menu Cleanup

Development release on `dev/ron-phase7`; not merged into `main`.

## Delivered behavior

Step 1 leadership quotations use 15px on desktop and 14px on mobile, overriding the old compact 13px rule while retaining reachable footer navigation. Very short screens retain the existing scrolling fallback.

Semantic Light surfaces cover the sovereign credit guidance/offer cards and active Credit offers tab, diplomatic inbox guidance/counters, Help situation/goals/risks, five energy counters and plant cards, bilateral relationship/goodwill/status cards, map notices, foreign-affairs requirements, religious composition, diplomatic influence and institution/world cards. Active credit navigation uses an inset focus-colored line. Warning/success states remain differentiated; blocked Affairs requirements use readable red text and a red edge.

Foreign political influence is available through one top navigation tab; the duplicate Overview shortcut is removed. Controlled-territory Administration stays available. Strategic Dossier titles share uppercase presentation in all languages, retaining the existing national-power translation without changing electrical Power labels.

Institution icons and UN/WHO-style abbreviations occupy separate vertical rows, with space for the adjacent institution name. Cultural identity values are translated before locale-aware title casing, including Turkish dotted I; their icons are centered. Target-country buttons and tabs reserve 2px vertical clearance for existing hover/focus movement.

## Boundaries and validation

Default Light appearance and `appearancePhase7.css` are unchanged; overrides live in `release098.css`. No engine/domain/data/persistence formulas, RNG, schema fields, dependencies or migrations change. Schema 17 saves remain compatible. Existing English, Turkish, Spanish, Chinese and Russian translations are reused; the previously untranslated Region caption is supplied in all five languages.

`npm run check`: 930/930 unit tests in 100 files, TypeScript and Vite production build passed with zero build errors. `release098.test.ts` checks official version, schema, seeded intel/tick replay, JSON save loading, all five language labels and cultural identity formatting. Existing bundle-size/dynamic-import warnings remain.

Targeted Chromium production preview: 11/11 release scenarios passed in 35.4 seconds, plus 3/3 existing HUD/Dark-modal regressions in 12.4 seconds. Desktop/mobile semantic cards and five-language cultural titles, institution geometry, single influence navigation and focus spacing are checked; screenshots inspected. Case-folded filenames and README links verified. Details are recorded in [Playtest 0.98](PLAYTEST-098.md). Full browser/native macOS suites were not rerun. See [changelog](../CHANGELOG.md) and [roadmap](ROADMAP.md).

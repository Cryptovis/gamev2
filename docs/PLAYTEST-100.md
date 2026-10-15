# Playtest 1.0.0 — Grand Launch International Affairs

Branch: `dev/ron-phase7` · Schema 18 retained · Slice 8.5.

## Verified

- `npm run check`: 1221/1221 tests in 108 files; TypeScript and Vite production build passed with zero errors.
- Thirty new mounted React tests exercise all five tabs and rail routing, arrow/Home/End focus, separate Chair offices, all executable proposal adapters, ballot/finance/quota/hardware command dispatch, cancel/stale/invalid reviews and listener/clock cleanup.
- Four language catalogs and translated mounted tabs pass. Existing translation regressions remain green; a finance-label collision found during verification was corrected.
- The actual daily engine runs 365 days with quota controls mounted. An IndexedDB save/load midway preserves state exactly; final snapshots validate and normalize idempotently. Existing schema migration and finance/trade conservation regressions remain green.
- In-app browser QA covered 1440px/390px, Light/Dark, all tabs, costs/terms reviews, proposal/ballot dispatch, cancellation and manual save/resume. Screenshots inspected; narrow hub has no horizontal overflow. Long review actions remain sticky while terms scroll.

## Browser runner limitation and remaining work

Eight new `internationalAffairs100.spec.ts` scenarios are committed. The standalone Chromium executable exits with SIGTRAP before executing page assertions in this environment, so the local Playwright run is blocked rather than passed. CI runs browser coverage separately from `npm run check`. Full native/browser suites and profiling were not rerun. Existing bundling warnings remain. Scenario/legal data, unsupported future payload engines and deeper monetary/migration/evasion mechanics remain outside this UI slice. See [release details](RELEASE-100.md). V3 remains the complete-playability milestone.

# Playtest 0.96.0

Branch `dev/ron-phase7`; official version `0.96.0`; save schema 17.

`npm run check`: 915/915 unit tests, 98/98 files; TypeScript and production Vite build passed, zero build errors. Existing bundle warnings remain.

- `e2e/release096.spec.ts`: 10/10 production-preview scenarios passed in 43.1 seconds, one worker.
- Two existing `release094` HUD scenarios: 2/2 passed in 10.4 seconds; independent surfaces and mobile camera/Map/Help/toast clearance retained.
- Wizard: English 1440×900, Turkish 390×650, Spanish/Chinese/Russian 390×844, footer/sign-in return 844×390. Step 1 body has no overflow at tested ordinary sizes; all four steps retain reachable navigation and readable preview/confirmation metrics. Unusually short screens preserve body scrolling instead of hiding fields.
- National workspaces, suppliers and fuel routing: 1440×900 and 390×900. Three supplier cards share a desktop row; mobile wraps. Five-language rail labels fit without dropping below 10 px.
- Economic chart: two recorded observations, Light→Dark→Light palette change repaints the mounted canvas without JavaScript errors.
- Regression checks retain declaration review and helper return to the original France assessment target. No declaration or treaty command rules changed.

Screenshots inspected during implementation for desktop/mobile onboarding, command cards and suppliers. Native macOS, Firefox/WebKit and the full browser suite were not rerun. Verify those platforms before a wider release.

# Playtest 0.97.0

Branch `dev/ron-phase7`; official version `0.97.0`; save schema 17.

`npm run check`: 922/922 unit tests, 99/99 files; TypeScript and Vite build passed with zero build errors. Existing bundling warnings remain.

- `e2e/release097.spec.ts`: 12/12 production-preview scenarios passed in 47.9 seconds, one worker; per-scenario timeout bounded to 30 seconds.
- Existing regressions: Dark modal backdrop/focus return and desktop/mobile independent HUD/globe/toast clearance, 3/3 passed in 12.9 seconds.
- Five languages: localized primary tax action, unchanged rate before confirmation, Society banner with live approval/stability, return to Policies; English also confirms the change and checks the receipt/rate.
- 1440×900 and 390×900: portrait navigation, goals/gold/commodity/industrial panels, dossier's four tabs, cabinet, populated intel log, affairs, supply rings/reserve cards and diplomatic edge colors. Recorded commodity canvas changes palette with the theme without errors.
- Active-war legacy overview uses Light theatre/progress/front/casualty surfaces; no declaration or combat command changed.
- Selected commodity and industrial cards retain navy/white contrast; cost labels are ink on ivory. Pointer-transparent 4% map grid and semantic day badge are checked.

Screenshots inspected for portrait layout, commodity chart/order, goals, dossier and policy banners. Native macOS, Firefox/WebKit and the complete browser suite were not rerun; verify those platforms before a wider release.

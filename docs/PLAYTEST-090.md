# 0.90.0-playtest.1 — Clear Command

Owner: **Codex**. Branch: `dev/clear-command-090`. Starting release: 0.89.0-playtest.7 (`8322a3f`). Save schema: 17, unchanged. Existing schema-17 saves resume; no new campaign required.

## Executed validation

- Baseline 365-day invariant passed before simulation edits.
- `npm run check`: **572 unit tests / 72 files passed**, including the annual invariant, followed by TypeScript and production build.
- Focused Playwright: **9 passed**, covering Affairs in en/tr/es/zh/ru, 1440px/390px controlled-territory navigation and reviewed preparation/cooldown, fresh quote rotation with fixed randomness, and keyboard map controls.
- Desktop/mobile Affairs and country screenshots inspected; disabled button contrast, the war-action selector and the History translation were corrected during visual review.
- Full production-preview Playwright suite: **84 passed (7.5 minutes)**. Final CSS/label adjustments are rechecked in the nine focused scenarios.
- The prior 0.89.7 CI passed in about 9m23s (run 38034143515). With nine more browser scenarios, the job timeout is raised from 10 to 15 minutes; no checks are removed.
- GitHub CI is separate and starts on push. Local runs use Node 24 and Chromium; CI uses its configured Node 22 environment. StackBlitz itself is not exercised by these local browser tests.

## Manual acceptance route

1. Sign in → Demo → New game: artwork has one logo and a short tagline. Reopen the wizard: quote changes; step navigation keeps the same quote.
2. Resume → nation → Greece → Affairs: Overview explains independent-country limits; Foreign political influence shows current values, required thresholds and explicit blockers even with ample funds. No foreign integration preparation button.
3. On a controlled territory: Administration has relief/elections/transfer/candidate actions; Integration shows all thresholds and preparation. One reviewed preparation costs $0.25B and starts a seven-day cooldown. The menu stays outside the scrolling content.
4. Country dossier: Affairs matches the other menu buttons; one Trade entry; full-width red war-planning/readiness entry; identity values wrap.
5. HUD: DIPLOMACY label, visible selected state without a yellow dot. Market retains its six sections and resilient artwork.
6. Focus map: arrows move, +/− zoom, Home returns to your country, Enter opens the dossier. Modal focus prevents map shortcuts from hijacking dialog input.
7. Insufficient council aid funds: precise $5B notice, unchanged influence and council history. A conquered country's remaining wars close without another round.

## Limits and next work

- [QA reconciliation](QA-RECONCILIATION-090.md) is a current-code assessment, not endorsement of all 0.40 findings. Resource balance and performance require measurements before further changes.
- Translation catalogues remain a large eager chunk (build warning); new messages have all five languages, but a complete linguistic/override audit is still open.
- Other long windows and specialized victory/campaign-end surfaces need gradual adoption of shared navigation/accessibility.
- Quotes avoid immediate repeats when local storage is available; denied/cleared storage falls back to random selection.
- No online authentication, multiplayer, new renderer or sound engine. V3 remains the complete-playability milestone.

## 0.90.0-playtest.2 — Market & window hotfix (Codex)

- `npm run check`: **578 tests / 73 files**, TypeScript and production build passed.
- `PLAYWRIGHT_DEV_SERVER=1 npm run test:e2e -- e2e/clearCommand0902.spec.ts`: **6 passed (36.8s)** against Vite dev, not only built chunks.
- Purchase review and confirmation/receipt, blocked-order reason dialog, 1440px/390px rail separation, Supply/Help root scroll samples, nation hint/state/old-save name, credit/contracts/Help with click-time panel requests blocked, supplier text geometry and 16px/14px event choices covered.
- Supplier finder, national-event and final desktop/mobile market screenshots inspected. Final market menu labels stay inside their own buttons; mobile icons sit above text. The supplier text has its own full-width column rather than wrapping beside its kicker.
- All 90 production-preview browser scenarios passed (7.7m); final mobile-menu layout rechecked in nine focused scenarios (50.7s).
- Previous 0.90.1 GitHub CI run **38064636235 passed**. This patch's CI is checked separately after push.
- No new campaign required. Türkiye/North Macedonia/Eswatini refresh only known old names on load; stable country IDs and custom names remain intact.
- Manual StackBlitz route: update `dev/clear-command-090`, confirm package version `0.90.0-playtest.2`, start Vite, resume, Market → Commodity Exchange → Review purchase; test zero quantity for reasons. Open credit/contracts, Supply and Help. Check supplier heading, flag shortcut, tutorial Budget step and national-event choices.
- Limitation: WebContainer itself was not run here. Startup includes four core panels to remove their click-time import failures; this trades some initial loading for more reliable tool transitions. Remaining optional windows retain retries. Large translation chunks, dependency-lock cleanup and deeper war AI remain on the roadmap.

## 0.90.0-playtest.3 — Clear markets & policies (Codex)

- `npm run check`: **582 tests / 74 files**, TypeScript and production build passed on the final release version.
- Focused Vite-dev Playwright: **8 passed (1.4 minutes)**. The tests cover 1440px five-column/three-row stocks and four-field contract form, 390px wrapping with no horizontal overflow, zero-stock warning, hover/focus, 19 partner goods in two desktop rows, the removed World prices section, centered receipt art and execution metrics, and Policies/tax confirmation/ministry-budget access plus foreign read-only state in all five languages.
- Four unit regressions cover all-in buy cost including fees/freight; physical reserves unchanged while cargo is inbound; immediate precious-metal holdings; T+1 sale proceeds; failed/duplicate orders without invented gains; and every new translated key.
- Desktop/mobile supply, partner picker, contract form, receipt and policy screenshots reviewed. Long mobile names wrap into readable columns. No save-schema, economy-balance or dependency-graph changes.
- Full production-preview suite: **98 passed (20.9 minutes)**. After the final text/field-alignment adjustments, the eight focused production scenarios passed again (**2.6 minutes**).
- Final picker row expansion: **2 desktop/mobile scenarios passed (36.0s)**, verifying no horizontal/text overflow, two desktop rows and the full Electronics label on one line. Contract inputs are aligned even when a label wraps. Final screenshots inspected.
- Previous 0.90.2 GitHub CI **38067393720 passed**. New patch CI runs separately after publication.
- Manual acceptance: update `dev/clear-command-090` and confirm version `0.90.0-playtest.3`. Market → Commodity Exchange → review/confirm an affordable oil purchase: green purchased/incoming amount, red actual total debit, current reserves/treasury and delivery days; reserves grow only on arrival. A sale shows next-day pending payment. Supply contracts: centered tiles, stock level, hover/focus and direction/partner/quantity/term. Trade partners: all goods available without horizontal scrolling. Nation → Policies → change the tax slider → review/confirm; ministry budget opens its existing controls. Another country's Policies has no editable controls.
- StackBlitz/WebContainer itself is not run here. Narrow screens wrap into additional rows rather than forcing two desktop rows. Stock warnings use the existing protected-reserve amounts; this patch does not tune them. Translation catalogue splitting and deeper war AI remain pending.

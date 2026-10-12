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

## 0.90.0-playtest.4 — Reliable command menus & sovereign credit (Codex)

Starting GitHub HEAD: `6f3695811a6f7834ca6091da80e8bb7a1d0160ff`; its CI run **38073189084 completed successfully** before development. Local mirror history differs, but its starting tree matched GitHub. Publish against the verified GitHub parent without force-pushing the mirror.

- Baseline 365-day invariant passed before credit changes. Final `npm run check`: **600 unit tests / 75 files**, TypeScript and production build passed on `0.90.0-playtest.4`, including the annual invariant and the credit maturity experiment.
- Focused Vite-dev rerun: **12 passed, one desktop repayment scenario hit the 60-second test timeout**. The prior focused run passed that repayment scenario; the complete production suite will recheck it against stable built assets. The last mobile World label layout is also rechecked there. Final production run: **108 passed / 3 failed (19.8m)**. Failures were two unscoped `.section-menu` assertions now seeing the new credit subnavigation, and a WebP-only image assertion now encountering the existing SVG command atlas. Scope the menu to its market parent and validate all command atlas images; retain visibility/loaded-image/geometry checks. Targeted production recheck: **3 passed (1.7m)**. Thus **all 111 scenarios are covered successfully** on the final executable code; GitHub CI repeats the whole suite after publication.
- New unit regressions cover three-day credit decisions without premature proceeds/debt, duplicate/competing applications, relationship/sanction/expiry rejection, cash and aggregate capacity, country ratings/APR/lender choice, targeted rescue escrow and three-year maturity, exact early repayment and history safeguards, arrears/tax restoration, old schema-17 saves, malformed optional data, pruned historical offers, absorbed countries, ranking order and shared campus/pilot preview parity. A 1,100-day credit-maturity experiment checks finite balances and valid saves.
- New browser scenarios cover desktop/mobile command panels with click-time module requests blocked, separated Tech investments/Military pilots, three live World rankings and left-rail placement, readable Supply/All resources artwork and contract spacing, all five languages, real ticking application approval/rejection and reviewed early repayment.
- Save schema remains 17. New credit history/applications, extended offer terms and repayment bookkeeping are optional. Existing mandatory offer `days` keeps its old type; longer terms use optional `extendedDays`. Old campaigns require no reset. Dependency graph unchanged; package-lock changes only its two root version records.
- Local Chromium does not reproduce WebContainer itself. Panels no longer require click-time module downloads, but initial startup loading is larger (2,296.14KB raw / 760.15KB gzip for the main JS chunk); translation catalogue loading/consolidation and measured performance remain pending. Credit ratings are simulation ratings, not real-world agency data. Rescue offers are conditional, lender-funded and never guaranteed; financial balance still needs player feedback.

### Manual StackBlitz acceptance

1. Stop Vite. Verify working directory, local changes and branch before updating. Use `git checkout`, not the unsupported `git switch`/`git stash` route; preserve local changes rather than resetting them.
2. Update `dev/clear-command-090`; verify `package.json` is `0.90.0-playtest.4`; install from the preserved lock and start Vite from the repo directory. Resume an existing compatible save.
3. Nation → Tech → Investments, then Military → Pilot training. Repeat other rail/country menus without a chunk-error recovery window.
4. World: Military / Financial / Diplomacy rankings, current player position and country links. Supply: consistent labels, All resources icon and readable supplier details. Market → Supply contracts: no excessive summary gap.
5. Market → Sovereign Credit & Monetary Fund: flags/rating/quoted rate; submit one application, check pending with unchanged treasury, resume the game clock for three days, then inspect the decision. Poor relations may reject it.
6. Loans & early repayment: review payment, saved future interest, treasury after and history reward before confirming. If cash is low and eligibility permits, inspect the targeted higher-APR three-year rescue offers. These do not appear for every country or every financial situation.

## 0.90.0-playtest.5 — Spacious command windows (Codex)

- Wider national Tech/World/War/Production and left Supply/Market/World workspaces; parent restoration and root navigation regression coverage.
- Three-button command groups, identity/profile/Cabinet artwork, independent speed/date and gold country cards, quiet framed rails.
- World activity summary and 20-row incremental rankings, preserving list state through country details.
- `npm run check`: **607 unit tests / 76 files**, TypeScript and production build passed.
- Full production browser run: **111 passed / 3 failed (23.2m)**. The failures were two selectors matching retained hidden parent content and a real portrait-focus regression. Selectors now target the displayed result/dialog; lifecycle captures the opener before the parent is hidden and restores it on close.
- **12/12 focused production scenarios passed (4.0m)**, covering the three failures, country trade, nested Escape/Tab, pause ownership and desktop/mobile parent restoration with dragged position preserved.
- **8/8 final language/visual scenarios passed (2.1m)**; **3/3 final workspace checks passed**, including Tech → standalone research → Tech with Investments and keyboard focus preserved. The added country-switch regression brings total unique browser scenarios to **115 verified**.
- Desktop/mobile Tech, Production, World, Supply, Market, Cabinet and profile screenshots inspected. The Cabinet atlas images all loaded. National Power uses a context-specific key so energy wording remains intact.
- Initial GitHub CI (38094494139, c7af244) passed 113/114, exposing fast duplicate scroll events requesting two pages. Requests now use the committed page limit; changing ranking resets the scrollbar. The regression dispatches two rapid scroll events and checks exactly 40 rows, then 20 rows at the top after a ranking change.
- National World → Greek War assessment reproduced an invisible popup before the fix. National frames now follow country changes while separate tools still hide their parent. **11/11 navigation/focus checks passed (2.5m)**; **4/4 final desktop/mobile/country/pagination checks passed (1.5m)**.
- Final GitHub CI is checked independently after publication. WebContainer/StackBlitz remains a separate manual check. No new save schema or campaign required.

Manual route: nation → Tech → Investments → close → Cabinet → Affairs → close (Cabinet returns); World → scroll → country → close (ranking returns); Supply/Market → review → dismiss; commander → portrait → close; confirm date below speed and right popups beside their rail. On mobile, close the full-width workspace before choosing another rail tool.

## 0.90.0-playtest.6 — Measured performance (Codex)

- User-selected scope: measured startup/menu/long-save performance. Compare fresh, one-year and three-year seeded campaigns; keep simulation, schema 17 and dependency graph unchanged.
- Add `measure:engine` and `measure:browser`; opt-in output is ignored machine-specific JSON. Method, all measured distributions and limits: [performance record](PERFORMANCE-0906.md).
- Index map Relations connections and defer collapsed supplier rows. Unit coverage checks legacy-result parity, stale-ledger replacement and linear record access. Browser regressions cover active/inactive trade/contract/embassy precedence and supplier disclosure mouse/keyboard behavior.
- `npm run check`: **610 unit tests / 77 files**, TypeScript and production build passed. Final engine measurement passed (21.9s); baseline and candidate production-browser measurement probes passed (1.1m / 1.0m). Full **118/118 production browser scenarios passed (15.6m)**.
- Three-year connection scan median ~0.89 ms versus ~0.016 ms including index build. Supply timing varies; no universal startup/menu/camera speedup is claimed. No direct StackBlitz run; compatible saves continue without a new campaign. V3 is not declared.

Manual route: continue an existing save → Map → Relations → move/zoom the map; Supply → expand/collapse extra suppliers with mouse and Enter → open a route/review → close back to Supply. Existing playtest.5 window-return behavior is preserved.

## 0.90.0-playtest.7 — Command intelligence (Codex)

Compact independent buy/sell forms, national alert categories and populated opening news. Offline source-linked contemporary diplomacy and Relations map colors; existing saves are not reseeded. See [sources/coverage](DIPLOMACY-SNAPSHOT-0907.md). 621 unit tests / 78 files (including the 365-day invariant), TypeScript and production build passed. Full production browser run: 127/128 passed (17.1m); the sole failure was an obsolete mobile rail-exposure expectation, updated for expanded Alerts. All 9 affected desktop/mobile scenarios passed again (1.4m), covering all 128 unique scenarios. Final mobile screenshots were inspected. Exact-head remote CI is checked after publication; actual StackBlitz testing was not performed. Broader bilateral research and actual StackBlitz/device checks remain follow-ups. V3 remains the complete-playability milestone.


## 0.90.0-playtest.8 — Compact workspaces (Codex)

Compact commander HUD and World rankings with ten visible rows and scroll access to every country; denser Supply cards, a readable Trade Desk hero, illustrated Society and Infrastructure workspaces. Existing parent-return and reviewed investment flows are preserved. Save schema 17, simulation rules and dependencies unchanged.

622 unit tests / 79 files, TypeScript and production build passed. All 8 final focused production-browser scenarios passed (2.2m), covering 390/1440/2048 px, five languages, all ranking pages, Supply readability, Society/Infrastructure and parent/review return. The local full run was interrupted at scenario 58 after finding two Supply font-size failures and one mobile bottom-padding failure; these real UI issues were corrected and covered by the final focused run. The full 134-scenario suite runs in exact-head GitHub CI after publication. Final desktop/mobile screenshots inspected; actual StackBlitz testing was not performed. V3 remains conditional on complete playability.

Manual route: World → each ranking → scroll past ten countries → country → close; Supply → all resources / one resource → suppliers; nation → Power → Trade / Society → close → Supply command → Infrastructure → review / cancel. Check compact desktop spacing, mobile frame edges and bottom padding. Existing saves require no new campaign.


## 0.90.0-playtest.9 — Reliable foundation (Codex)

Victory and Regime Crisis use the existing managed focus/Tab/Escape lifecycle, with translated labels and preserved crisis acknowledgement. Save/load, exact-budget, duplicate command, cargo, settlement and same-day combat coverage expanded. No simulation, schema or dependency change.

635 unit tests / 80 files, TypeScript and production build passed. All 12 new focused production-browser scenarios passed; the local full run was interrupted after 78 passes by a workspace reset. The full 146-scenario suite must pass on the published GitHub commit. QA classification and performance method: [Phase 1 evidence](QA-PHASE1-0909.md).

## 0.90.0-playtest.10 — Rule of Nations: fluid command (Claude, Phase 2)

Phase 2 and the Rule of Nations name only; Phase 3 untouched. Save schema 17, simulation rules, RNG and dependencies unchanged. Evidence and measurement method: [Phase 2 record](FLUID-UI-0910.md).

Validation: 639 unit tests / 81 files, TypeScript and production build passed (run on the release tree). All 158 production-browser scenarios passed on GitHub-hosted Chromium (15.7 min; 146 earlier + 12 new for motion, return state, brand and typography). Not run locally or on StackBlitz: the npm registry was blocked in this session. CI on the published commit is the release gate. Typography review and render attribution runs are recorded in the Phase 2 record. Two earlier assertions changed with the intended design: tabs are no longer CSS-uppercase (`commandCredit0904`) and the trade action is named "Import" (`tradeWar0894`).

### Manual acceptance route

1. Entry and setup show the RON mark and "Rule of Nations" over the cover art; the browser tab reads Rule of Nations. Switch to tr/es/zh/ru: the name stays untranslated.
2. Open World, scroll the rankings, open a country from a visible row with Enter, close the country panel: World fades back at the same frame and scroll offset with focus on that row.
3. Nation → Military → National power → Escape: the panel returns on Military with the same scroll and focus on National power. With the OS "reduce motion" setting, windows appear without fades.
4. At 390 px in Turkish: HUD labels stay inside the card; country tabs show whole words (Genel, Ekonomi, Tedarik komutanlığı). Buttons such as "Propose trade pact" read in natural case.
5. Run 5x for a minute with Supply open: values update daily; no console errors.

### Known limits

- Not run locally or on StackBlitz: the npm registry was blocked in this session. All results come from GitHub-hosted Chromium.
- React render time is unchanged; mobile and low-power performance were not measured.
- Remaining capital-only button labels outside the reviewed set (for example setup "CONTINUE"), and translation quality beyond the corrected strings, are left for later polish.

## 0.90.0-playtest.11 — RON Interactive credit (Claude)

Footer credit changed to RON Interactive; interface guards now reject any AlpyX text. No simulation, schema or dependency change.

Validation: 639 unit tests / 81 files, TypeScript and production build passed; all 158 production-browser scenarios passed on GitHub-hosted Chromium (15.4 min). CI on the published commit is the release gate.

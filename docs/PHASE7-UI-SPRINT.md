# Phase 7 executive UI sprint — A02–A05

Base: 8d559e04cfc430fed41da6758ee3ffa95d8094ca on dev/ron-phase7. Schema 17 and existing browser keys remain intact. Ticket implementation commits are kept separate; validation below is observed, not projected.

## A02 — appearance

Single Zustand preference in presentation/appearance.ts, outside GameState. Fresh installations use System; legacy settings/session or the existing IndexedDB database select Dark when no appearance preference exists. Initialization runs before mounting React. Explicit preference, OS changes in System mode and cross-tab preference changes are supported. No old storage key or database version changes.

Settings and Campaign Setup use the same AppearanceOptions controls. Navy/Ivory semantic tokens cover UI surfaces and portal content; photographs, SVG artwork and country map colors remain authored. Reduced-motion behavior retains the existing motion contract.

Initial validation: four focused unit tests, TypeScript, and twelve appearance browser cases passed (five languages × both themes, System/OS change, persistence/legacy restoration). Caption contrast is checked at 4.5:1. Visual inspection identified legacy forced control colors; the semantic overrides address those declarations. Final integrated validation and screenshots follow below.

## A03 — executive workspaces

ExecutiveWorkspaceShell now hosts Policies, Military, Economy, Diplomatic Inbox and Executive Desk. Header/tab rows stay fixed; the body scrolls, retains per-section offsets and releases managed ownership for children. Arrow/Home/End tab navigation, topmost backdrop dismissal, Escape and opener focus use the existing lifecycle. Existing content, commands, receipts and unread/read handlers are retained.

The right rail has enough width for single-line en/tr/es/zh/ru labels at the existing 10px minimum. Core workspace browser cases cover centered desktop/phone geometry, Tab/Escape and backdrop restoration, plus localized rail sizing. The A01 routing/lifecycle regressions also passed during the initial focused run; legacy forced rail widths were then corrected without reducing the text floor.

## A04 — player-visible operational assessment

Engine-owned operationalVisibility applies the existing 35-point reconnaissance coverage gate. Below it, enemy inventory/supply/air/outlook are Unknown, never zero. Above it, personnel and equipment use stable ranges, military quality uses three broad grades, and supply uses 20-point bands. Forecast composition consumes these projected inputs through the same warForceComparison formulas used by getWarPreview; combat formulas and threshold values are unchanged. UI output carries outlook/air categories, not exact hidden ratios or air decimals.

Coverage labels are ledger categories, not probabilities. Last reconnaissance is successful operation metadata, not a stored historical force snapshot; absent metadata remains Unknown. Own figures are national inventory, not a claim that committed task groups are available. Declaration eligibility, fuel have/required/missing, structured WarBlock and active-war identity come from existing validators.

Five focused regressions cover unseen enemy mutations, stable intra-band mutations, engine-owned own-supply values, range boundaries, determinism and fuel/control/active-war eligibility. The old exact-enemy-preview test was updated to assert the new visibility contract; formula thresholds remain tested.

## A05 — hub and unified assessment

The footer now offers War Planning, Country Info and Complete Panel & Trade directly. Country Info has Overview, Society, Economy and Military tabs with arrow/Home/End navigation. Its foreign military inventory/readiness uses the same visibility projection as the assessment. The third action selects the observed country's Trade tab in one click.

OperationalAssessmentModal is the sole renderer for hub, full-panel and national World launchers. National readiness remains its existing player panel. The responsive board places own forces and opposing forces around the terrain/forecast/logistics centre on desktop, then two readable force wings above the theatre on phones. Own identity uses the chosen player portrait; the opponent uses a neutral emblem rather than an invented leader. Unknowns remain labeled Unknown, and outlook bars explicitly describe a forecast rather than a victory probability.

Engine blockers disable declaration while a separate Review declaration action preserves access to the existing detailed strategic review and its disabled confirmation. Allowed declarations still require explicit confirmation and retain the original war-command handoff. Existing wars expose Open War Command rather than redeclaration. Hub diplomacy still uses existing receipts.

CountryWorkspace retains source frames with explicit country/navigation ownership; suspended portal descendants release focus and Escape. Returning to Trade or national World preserves its selected tab/target and scroll memory rather than switching the source to the assessment country. UI context remains outside saves.

Focused regressions cover unknown/banded Country Info and active defender terrain/supply. Browser coverage includes direct hub actions, four tabs, shared launchers, parent restoration, declaration handoff, active wars, keyboard/backdrop ownership and five-language layouts in both themes. Historical drawer/sub-view assertions have been updated to the intended centered/shared UI; command and review assertions are retained.

## Integrated verification

- Final `npm run check`: **94 test files / 861 unit tests passed**, followed by a successful TypeScript + Vite production build.
- Browser sweep: **228 scenarios**, **223 passed / 5 failed initially**. The five failures were scoped to the opening quotation surface and legacy flows that clicked rails/profile before closing their restored centered parent.
- After restoring the quotation's transparent background and updating those flows to close the restored modal, the focused rerun completed **5/5 passed**. Thus all 228 distinct scenarios have passing evidence; this is a full sweep plus corrected-case rerun, not a claimed final single 228/228 green run.
- Browser environment: Linux, Chromium 153, two workers, software rendering with GPU disabled. Production builds were used. Native macOS/APFS browser execution is left to the owner's existing verification workflow; no native Mac run is asserted here.
- Case-fold audit: **605 tracked files**, no collisions. `git diff --check` passes.
- No changes to persistence, migrations, Save Schema 17 or domain save types. The warfare helper extraction preserves the original formula operations and thresholds; read-only previews remain deterministic and covered by mutation/RNG regressions.
- New Phase 7 copy is covered by the catalog regression in en/tr/es/zh/ru. Desktop and phone assessment screenshots were inspected in both themes; the Light declaration action and terrain captions retain their intended contrast.
- Existing build warnings about the saveGame static/dynamic import and large bundle remain; no new dependency is added to the application.

## Changed files

- `docs/PHASE7-UI-SPRINT.md`
- `e2e/appearancePhase7.spec.ts`
- `e2e/assessmentPhase7.spec.ts`
- `e2e/audiovisual0914.spec.ts`
- `e2e/cardUi0918.spec.ts`
- `e2e/commandCredit0904.spec.ts`
- `e2e/commandWindows0905.spec.ts`
- `e2e/executivePhase7.spec.ts`
- `e2e/fluidCommand0910.spec.ts`
- `e2e/release091.spec.ts`
- `e2e/reliableCommand082.spec.ts`
- `e2e/researchReadiness0895.spec.ts`
- `e2e/tacticalCommand083.spec.ts`
- `e2e/targetHub0915.spec.ts`
- `e2e/tradeWar0894.spec.ts`
- `e2e/workspaceIntentsPhase7.spec.ts`
- `src/engine/systems/operationalVisibility.ts`
- `src/engine/systems/warfare.ts`
- `src/i18n/localeText.tsx`
- `src/i18n/uiCatalogPhase7.ts`
- `src/main.tsx`
- `src/presentation/appearance.ts`
- `src/store/gameStore.ts`
- `src/tests/appearancePhase7.test.ts`
- `src/tests/operationalAssessmentPhase7.test.ts`
- `src/tests/release091.test.ts`
- `src/tests/workspaceIntentsPhase7.test.ts`
- `src/ui/hud/CommandRails.tsx`
- `src/ui/panels/AppearanceOptions.tsx`
- `src/ui/panels/CampaignSetup.tsx`
- `src/ui/panels/CountryPanel.tsx`
- `src/ui/panels/CountrySectionFrame.tsx`
- `src/ui/panels/CountryWorkspace.tsx`
- `src/ui/panels/ExecutiveDesk.tsx`
- `src/ui/panels/OperationalAssessmentModal.tsx`
- `src/ui/panels/PlayerOptionsMenu.tsx`
- `src/ui/panels/TargetCountryModal.tsx`
- `src/ui/panels/TargetSubviews.tsx`
- `src/ui/panels/estimateText.ts`
- `src/ui/panels/targetBriefing.ts`
- `src/ui/styles/appearancePhase7.css`
- `src/ui/styles/assessmentPhase7.css`
- `src/ui/styles/executivePhase7.css`
- `src/ui/windows/ExecutiveWorkspaceShell.tsx`
- `src/ui/windows/useWorkspaceVisibility.ts`
- `src/ui/windows/workspaceActivity.ts`

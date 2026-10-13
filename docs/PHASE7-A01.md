# P7-A01 — Typed workspace intents and lifecycle contract

Implementation on `dev/ron-phase7`, based on `cf07393ec9fc4873e65fd0413b595349177ceb2a`. This is unreleased ticket work; version remains 0.91.0.

## Delivered contract

`routeWorkspace(WorkspaceIntent)` adapts typed semantic destinations to the existing WorkspaceFrame/navigation/trail mechanism. Destination variants cover the target hub, Country Info, full country panel with a typed tab, Operational Assessment with a distinct targetCountryId, fuel-help context, player factory focus, market section/good focus, inbox offers/correspondence, and future news filter context. `returnTo` is a typed, nonrecursive destination.

- Factory intents always select the player and Production, with a real FacilityKind focus. `civil_factory` is the existing Industrial Park that adds refinery capacity; no invented oil_refinery command.
- Market intents select the open exchange or supply-contract section and focus the requested IndustrialGood. Selecting/opening a destination performs no purchase or construction.
- Inbox offers select the Executive Desk Diplomacy tab. Correspondence selects the Diplomatic Inbox. Alert Inspect now uses these scopes rather than the player's bilateral country tab.
- The hub's War Planning action and explicit assessment navigation requests use the common operational-assessment intent. The adapter can also launch from a full country-panel frame and return to its original tab. The full panel's existing War tab renderer is retained: replacing all legacy launchers/renderers belongs to A05.
- Implicit return walks the existing parent trail. Explicit assessment return can skip the generic helper, retaining the original target and avoiding a duplicate assessment parent. Root rail navigation still discards the trail.
- Missing/annexed targets reject new requests without changing the current workspace; invalid parent targets are skipped on return. Self assessment is refused. All gameplay eligibility remains engine-owned.
- Hidden assessment parents remain mounted across player-factory navigation, retaining their local view/scroll. Full-panel parents can remain mounted and suspended during a typed assessment. Country-layer visibility distinguishes panel, hub, info and assessment, even for the same country ID.
- Lifecycle activation remembers the last focused control in a hidden parent. Escape and Tab remain owned by the topmost managed layer; backdrop dismissal checks the same owner. Returning from an assessment restores its hub launcher. The existing CampaignTutorial keyboard inclusion is unchanged.

Fuel-help currently carries target/return context to the existing Help workspace; A06 owns its dedicated content and public shortcuts. Country Info remains the existing four-tab DossierSubview. News filter context is carried only; A11 implements archive filtering. A04/A05 own intelligence projection, active-war assessment presentation and the full shared-modal redesign.

## Invariants

No engine/system, GameCommand, RNG, migration, save validation, database version, package dependency or browser storage key changed. Workspace intent is UI state and is omitted by snapshotGame; the existing selectedCountryId behavior remains. Schema 17 stays unchanged. No new user-facing strings were added; existing labels retain en/tr/es/zh/ru coverage.

## Validation

- Final `npm run check`: **92 files / 850 unit tests passed**, TypeScript and production build passed. The 24 new unit cases cover each section-2.2 destination, both assessment source contexts, explicit/implicit helper returns, player versus target ownership, invalid/self/annexed targets, root navigation, inbox alert routing and snapshot/RNG boundaries.
- An unread-alert regression was run against the untouched baseline and failed as expected (`diplomacy` versus `diplomacy-inbox`); it passes in the implementation.
- Four new production Playwright cases cover desktop/phone unread-alert routing and trigger restoration, incoming-offer routing, and assessment/review Tab/Escape/backdrop ownership.
- A supplemental local Vite browser harness verified assessment → help → real Industrial Park / Refined Fuel contract market → assessment; focused card/good, original France target, unchanged fuel/treasury/seed/command IDs; and same-target full-panel/assessment suspension and Trade-tab/focus restoration. This harness is supplemental verification outside the production suite, not a new public helper UI.
- Complete fresh production-browser suites: **baseline 191/191 passed (9.1m)**; **implementation 195/195 passed (9.2m)**. Both exited 0 with no retries and no excluded tests. The implementation's four new cases include unread messages and sanctions on desktop/phone, incoming offers, and assessment/review lifecycle ownership.
- The initial SwiftShader configuration was CPU-bound and produced timing failures, including on the untouched baseline. The final acceptance runs use Chromium 153 with GPU acceleration disabled, two workers, and the original expectations/test timeouts. Temporary browser tooling/configuration remains outside the project. A real legacy World-launcher incompatibility found during validation was corrected by preserving navigate('war') while exposing the explicit assessment route; the existing World-launcher test passes unchanged.
- Implementation browser command: `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/tmp/ron-browser-runtime/chromium npx playwright test --config /tmp/ron-phase7-software.config.ts`. The override imports the repository playwright.config.ts, points to the full e2e directory, runs production build/preview on port 5184, sets workers to 2, and supplies `--no-sandbox --disable-dev-shm-usage --disable-gpu`.
- Tested application source commit: `abccbdd`. Final documentation amendments change no application or test source. Native macOS and GitHub CI were not run in this task.
- Existing build chunk-size and mixed import warnings remain. No assertions or old test files were removed to maintain the counts.

## Changed files

| Files | Purpose |
| --- | --- |
| docs/PHASE7-MASTER-BLUEPRINT.md, docs/PHASE7-BASELINE.md | Supplied primary contract and verified integration map (P7-00); final evidence recorded in baseline note. |
| src/store/workspaceNavigation.ts, src/store/gameStore.ts | Typed route adapter, context-preserving return trail, invalid-target handling and legacy compatibility. |
| src/store/commandIntelligence.ts, src/ui/panels/CommandIntelligence.tsx | Correct inbox-scope alert Inspect routes. |
| src/ui/panels/CountryWorkspace.tsx, CountryPanel.tsx, targetCountryHub.ts, TargetCountryModal.tsx | Semantic assessment/info selection, suspended parents and hub launcher context. |
| src/ui/panels/ExecutiveDesk.tsx | Offers intent resets the correct desk tab. |
| src/ui/panels/MarketWindow.tsx, OpenExchange.tsx, IndustrialMarketPanel.tsx, IndustrialPanel.tsx | Consume market section/good and real facility focus without engine commands. |
| src/ui/windows/useWindowLifecycle.ts, useWorkspaceVisibility.ts; src/ui/panels/CommandWindow.tsx | Focus/visibility ownership and topmost backdrop dismissal. |
| src/tests/workspaceIntentsPhase7.test.ts, e2e/workspaceIntentsPhase7.spec.ts | 24 unit and four production-browser regressions. |
| docs/PHASE7-A01.md | Ticket contract, scope and verification handover. |

No push, merge, release or deployment has been performed. Next implementation ticket: P7-A02.

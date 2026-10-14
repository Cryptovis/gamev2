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

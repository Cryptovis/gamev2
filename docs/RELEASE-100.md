# 1.0.0 — Grand Launch International Affairs Hub

Slice 8.5 on `dev/ron-phase7`; Schema 18 retained. This is the requested Phase 8 launch milestone on the development branch. V3 remains the complete-playability milestone; this release does not imply a merge into `main`.

## Delivered behavior

The command rail and CountryPanel open the same International Affairs workspace. Five keyboard-accessible tabs replace the old institutions view:

1. **Overview & roster:** all fourteen canonical organizations, own membership/status/standing, funding pools, separate Chair offices and paged country rosters. ASEAN and WEF remain in the catalog. NDB and IDB appear under BRICS+ and OIC financial facilities; they do not create additional organization IDs.
2. **Resolutions & voting:** active and completed decisions, deadlines, phases, target/terms, rule thresholds, counts/weights and frozen electorates/ballots. Typed proposal forms cover admission, discipline, sanctions, finance, oil quotas, trade remedies, market integration and local swaps. Yes/No/Abstain commands preserve shared eligibility, deadline and vote-change rules.
3. **Financial facilities:** loan/grant status, tranches/reform dates, outstanding principal, APR/daily/accrued interest, next service and maturity, treasury-backed principal/interest repayments and cancellation of undrawn commitments. Cancelled/expired facilities with unpaid debt remain visible.
4. **Commodities & swaps:** active quotas, physical output and standing, the player's bounded deviation control, WTO tariffs/caps/collections, EU/ASEAN integration multipliers and BRICS+ swap authorization/clearing balances.
5. **Sanctions & enforcement:** active multilateral arms/trade/finance restrictions, humanitarian tags and dates, plus reserve armor/fighter transfers through the existing alliance/access/stock validator.

Every proposal, ballot, repayment, cancellation, deviation and transfer opens the shared ReviewDialog. Pure engine previews expose costs and effects; the review holds an immutable draft, updates eligibility against live state and checks again immediately before dispatch. Existing command receipts prevent replay. Review focus trapping, Escape/cancel and clock pause are shared with other command dialogs; sticky review actions keep confirmation reachable on narrow screens. No action bypasses the organization validator.

All new text is registered for English, Turkish, Spanish, Chinese and Russian. Layouts use semantic theme variables, wrapping metrics/cards, 44px controls and responsive tabs. Inactive tabs unmount; roster, resolution and financing histories are paged. New preview functions consume no RNG and change no simulation state.

## Compatibility and scope

No save fields or accounting formulas change. Schema 18 and valid Schema 12–17 migration paths remain supported. Legacy ballots, WHO/outreach/council data and engine processing remain loadable, while their old direct-action panel is replaced by the new command UI. Scenario rosters/charters are clearly identified as game scenarios. Existing unsupported defense/peacekeeping/investment payload execution, autonomous proposal agendas, legal datasets, dedicated medicine/FX/SDR mechanics, free-movement migration policy and sanctions evasion remain future work; the hub does not claim to add those engines.

`happy-dom` is pinned as a development-only dependency for mounted React regressions. Runtime dependencies are unchanged. Existing release-version assertions track 1.0.0, and the old institutions browser geometry check now checks the fourteen-card hub.

## Verification

`npm run check` passed: **1221/1221 tests across 108 files**, followed by `tsc --noEmit` and a successful Vite production build with zero errors. Existing Node localStorage warnings and Vite ineffective-dynamic-import/chunk-size warnings remain.

Thirty new mounted UI tests cover all tabs, command-rail routing, keyboard navigation, chair offices, proposal/ballot/repayment/quota/hardware dispatch, live stale-review rejection, malformed input, debt visibility, cancellation, unmount listener/pause cleanup, translated copy and pure payload adapters. A full 365-day simulation runs with the quota UI mounted, saves and resumes through IndexedDB midway, and finishes with strict/idempotent snapshots. Existing migration, finance/trade, player/AI parity and long-run invariants remain green.

In-app browser QA at 1440px and 390px checked Light/Dark rendering, tab navigation, reviewed proposals/ballots, manual save/resume and overflow. Eight dedicated Playwright scenarios cover the four theme/width combinations plus the four translated hub paths. Their local run is **blocked before page execution**: the installed standalone Chromium exits with SIGTRAP in this environment. No standalone browser-suite pass is claimed; CI must run these scenarios. Native macOS coverage and full browser performance profiling were not rerun.

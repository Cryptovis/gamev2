# 0.89.0-playtest.5 — Research & readiness clarity

Branch: `dev/trade-markets-089`. Base: 0.88.0-playtest.1. Source: playtest feedback (finding trade partners, a commodity exchange, aircraft on the map, more graphics).

## Checks run

- Previous playtest.4 GitHub CI on `dev/trade-markets-089` passed: Vitest unit suites, `tsc --noEmit`, production build and the Playwright browser scenarios.
- New unit suites: `flights089` (distances, travel days, delivery on arrival, pruning, caps, saves), `tradeOptions089` (tier ranking, block reasons and next steps, per-country buy/sell lists, advisor preference), `commodityExchange089` (determinism, mean reversion, shocks and decay, spread/fee/impact/freight against the preview, limits, cargo delivery, storage, P&L and settlement, AI trades, saves), `flightHooks089` (goodwill on arrival, one cargo flight per new deal plus monthly flights, AI flight limit, great-circle helpers).
- Headless measurements: two-year exchange run with 30 shocks (21 news, 5 war, 4 events); measured daily volatility food 2.3%, oil 2.6%, gold 0.9%; median tick 17–21 ms (18.4 ms without the exchange). Strategy results over 5 worlds × 365 days: random trading −$0.21B, stockpiling food and selling into a spike −$0.10B on average (wins only when a spike comes), buying below the fundamental and selling above it +$0.83B.

## How to playtest

1. Run short of oil, open Strategic Resources → Supply: the first rows should be countries that can sell to you now; others show the next step (e.g. propose a trade pact).
2. Open any country and its TRADE tab: check "You can buy" and "You can sell" and try an action.
3. Open Market → Commodity Exchange. Watch prices move for a few weeks, buy food or oil, and see the cargo plane fly in; check holdings, storage cost and P&L. Wait for a shock headline and sell into it.
4. Send a diplomatic mission: a small jet should fly; relations rise when it lands (1–3 days).
5. Watch the map on both globe and flat views, at several speeds and paused, and with reduced motion on.

## Known limits

- Buying below the fundamental and selling above it is reliably profitable, though small and capped by the daily limit.
- The exchange price is separate from the reference prices used by bilateral contracts and the open listing market.
- Gold and silver trades have no counterparty country.
- Diplomatic missions now raise relations 1–3 days later.

## Onboarding patch 0.89.0-playtest.2 (Codex)

- Check the first sign-in screen in each of the five languages, then enter Demo → New game. Later screens should keep the language and show no second language picker.
- Compare the card bounds across entry, game menu and all four setup steps. The final review should fit at 1440×900, 1280×720 and 390×844 with visible confirmation controls.
- Check GDP and treasury number formatting; Turkey starts with $1.3T GDP in English. Schema remains 17.

- Patch validation: 532 unit tests, TypeScript/production build and 22 targeted Playwright tests passed; all five languages at 1440×900, 1280×720 and 390×844. Desktop and mobile final-review screenshots were inspected.

## Portrait/quote patch 0.89.0-playtest.3 (Codex)

- Open a new setup: a box-free leadership quote and its author should appear below the identity fields in the chosen language. It stays the same while typing or navigating back from the portrait step; a fresh setup opening selects randomly (repeats are possible).
- Check portrait thumbnails at desktop and mobile widths: no image may extend beyond its card. Scroll and filters should still work.

- Patch validation: 534 unit tests passed; compact-money and quote suites rechecked after the Node 22 formatting fix. TypeScript/production build and 17 targeted browser tests passed; desktop/mobile portrait and quote screenshots inspected.

## Supply/war patch 0.89.0-playtest.4 (Codex)

1. Strategic Resources → Oil → supplier IMPORT → LONG-TERM AGREEMENT. At 40/100 it must be disabled with a reason; above 40/100 with a pact, surplus and funds, choose 1/3/5/10 years and sign. Check the active agreement in Diplomacy. Delivery is every 30 days; there is no upfront full-term payment. A daily flow from the same supplier is replaced.
2. Try declaring war without refined fuel. Confirmation must be disabled; the review shows stock, required amount and shortfall. Buy **refined fuel**, not only crude oil, or refine oil locally. Player and AI need at least 14 operational days.
3. Enable auto assault: 5× becomes active and days advance once per second. Short fuel is shown inside War Command and reduces combat strength; it must not open an oil/fuel advice popup. Other campaign decisions still pause the clock. Preparation does not guarantee unlimited supplies during a long war.
4. A briefly interrupted panel download retries without resetting the leader/profile. Persistent server outages still show the recoverable error screen; restart Vite and use Reload if necessary.

Validation: 548 unit tests (including the 365-day invariant), TypeScript and production build, and all 52 Playwright browser scenarios passed locally. The five contract/war/retry browser cases and 19 relevant unit/translation tests were rechecked after the compact mobile review fix; the mobile screenshot was inspected. CI runs separately on push. Existing schema-17 saves remain compatible.

## Research/readiness patch 0.89.0-playtest.5 (Codex)

1. With insufficient refined fuel, open the war review. The top banner must explain the 14-day requirement and how to buy/refine fuel; confirmation must be grey, dashed and unavailable. The stock/required/shortfall metrics remain visible. Crude oil alone does not enable war.
2. Open TECH: saved points and work/day are separate. Read cost and missing points on each illustrated card; open a locked discovery to inspect its reason and required discoveries. Confirm remains disabled until the engine requirements pass.
3. Start research with enough points and no active project. Check progress and remaining days; cancel halfway and compare the displayed refund with the points received. Only one project runs at a time.
4. Check all five languages at desktop and mobile widths. No card should overflow horizontally; prerequisite buttons open the required discovery. Review the corrected technology names and translated war title.
5. Read [audit progress](AUDIT-PROGRESS-089.md) for remaining scopes. Phases 1–3 are historical deliveries; Phase 4 is only partly addressed. Save schema remains 17 and gameplay balance is unchanged.

Validation: 554 unit tests, including the 365-day invariant, TypeScript and production build, and all 65 Playwright browser scenarios passed locally. All five languages were tested at 1440px and 390px; desktop/mobile research and blocked-war screenshots were inspected. GitHub CI runs separately on push.

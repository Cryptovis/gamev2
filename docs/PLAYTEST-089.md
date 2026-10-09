# 0.89.0-playtest.1 — Trade & Markets

Branch: `dev/trade-markets-089`. Base: 0.88.0-playtest.1. Source: playtest feedback (finding trade partners, a commodity exchange, aircraft on the map, more graphics).

## Checks run

- GitHub CI on `dev/trade-markets-089` passed: Vitest unit suites, `tsc --noEmit`, production build and the Playwright browser scenarios.
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

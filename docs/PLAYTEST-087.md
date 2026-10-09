# 0.87.0-playtest.1 — Living World

Branch: `dev/living-world-087`. Base: 0.86.0-playtest.1. Source: Phase 2 of the [0.83 audit](AUDIT-0.83.md): C4 (rest), C10–C13, C15, D8, D12, A5, A6.

## Checks run

- GitHub CI on `dev/living-world-087` passed: Vitest unit suites, `tsc --noEmit`, production build and the Playwright browser scenarios.
- New unit suites: `economyPressure087` (cost scaling and bounds, mission cooldown, fatigue and pools, headroom, high-tax penalty, a 120-day spam run), `industrialMarket087` (one price scale, facility margins, AI demand limits, park target and GDP gain), `diplomacyParity087` (shared treaty rules and fees, AI rejection and retry, separate intel dice, pruning, pact strain and dissolution, save validation), `commandPath087` (new commands, deduplication, migration table).
- Headless measurements (2 years unless noted):

| Measure | 0.86 | 0.87 |
|---|---|---|
| 60% tax + daily spam, approval / stability | 99 / 100 | 37 / 72 |
| Moderate play, approval / stability | 100 / 100 | 96 / 91 |
| AI industrial parks started, year 1 | 273 | 63 |
| Refinery: share of oil value kept as fuel | 1.5% | 120% |
| Coal mine output ÷ upkeep, reference conditions | 0.025 | 1.38 |
| Intel operations stored, day 730 | 243 | 26 |
| Alliances surviving with negative relations, 130 days after a collapse | 6 | 0 |

## How to playtest

1. Hold a festival or start a programme several times in a row. Each repeat should show a smaller effect and, for some actions, a cooldown.
2. Set tax to 50% or more and watch approval fall faster than in 0.86.
3. Compare diplomatic costs for a large and a small country; send a diplomatic mission and check the 30-day cooldown.
4. Build a refinery or a mine and check its estimated daily margin in the build review.
5. Offer an AI country a long contract for goods it does not need: it should refuse.
6. Let relations with an ally collapse below 50/100: you should get an "at risk" notice and, 14 days later, the alliance should end.

## Known limits

- Moderate play still drifts toward ~96 approval; approval has no pull back toward a baseline.
- Event-option costs, occupation actions and power plants are not GDP-scaled yet; intelligence operation costs are flat.
- Steel can still sell below the value of its iron when the market is glutted.
- Base-mineral deposit potential is 0.15 for every country (data issue).

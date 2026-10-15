# Playtest 0.99.3 — Trade, Commodity & Regional Blocs

Branch: `dev/ron-phase7` · Schema 18 retained · Slice 8.4.

## Verified

- `npm run check`: 1191/1191 tests in 107 files; TypeScript and Vite production build passed with zero errors.
- 60 new trade regressions: organization authority/fees/duplicate topics, physical OPEC+ extraction and same-seed crude prices, overproduction standing, WTO quotes/capped customs, real regional deliveries, swap consent/limits/FX clearing, military/trade/credit embargoes, humanitarian access, expiry and strict save replay.
- Baseline 365-day headless invariant passed before changes and in the full check. Another full world year with all four new effects checks progress, finite resources/economy, strict saves and clean expiry.
- Existing Schema 12–17 migration fixtures, earlier optional Schema 18 records, finance lifecycle, atomic autosave and player/AI parity regressions remain green.
- Existing market listing reviews now consume the engine's tariff-inclusive quote and actual treasury preview. IndustrialMarketPanel and commodity orders use the shared access/settlement validators.

## Limits and next work

Browser/native suites were not rerun. No production browser pass is claimed. Existing bundling warnings remain. New International Affairs UI belongs to Slice 8.5. Scenario tariffs/quota units, consolidated customs accounting, legacy reserve proxies, outstanding local clearing balances and binary sanction access are documented in [release notes](RELEASE-0993.md). Dedicated medicine stock, central-bank FX conversion, free-movement migration policy, legal WTO adjudication and evasion mechanics are not delivered. V3 remains the complete-playability milestone.

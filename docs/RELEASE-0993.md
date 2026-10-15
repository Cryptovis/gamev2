# 0.99.3 — Slice 8.4 Trade, Commodity & Regional Blocs

Development release on `dev/ron-phase7`, based on v0.99.2 commit `1a17a82d1a78e2b86081d74066554fa0b350aab9`. Schema 18 retained.

## Delivered behavior

Economic resolutions now use the existing shared proposal/vote command boundary. `oilQuota` belongs to OPEC+, `tradeRemedy` to WTO, `marketIntegration` to EU/ASEAN and `localCurrencySwap` to BRICS+. All use their plenary electorate, freeze the voting rule and pay the same 5 influence for player and explicit AI actors. Authorities, participants, country references, finite values and deadlines are rechecked at execution. Duplicate topics use a quota-wide key, dispute identity, sorted regional participants or an unordered currency pair. The optional `tradeVersion: 1` activates the previously dormant scenario WTO roster once, without changing authored membership decisions.

### Physical oil and fundamentals

Adoption stores a source-linked, timed `organizationOilQuota` effect. Effective extraction is `min(physical capacity, quota + allowed deviation)` for active participating OPEC+ members. Capacity is never overwritten, so expiry restores available extraction. Raw oil enters stocks in `tickCountry` / `simulateResources`, before the military-equipment production system; `production.ts` exports the extraction helper rather than pretending its equipment loop produces crude.

The same constrained flow is used by global resource prices, commodity-exchange world supply, export-capacity quotes and trade-demand previews. It feeds the existing consumption/production fundamental and mean-reversion momentum once; no second arbitrary quota price shock is added. Same-seed tests verify cuts tighten crude prices and reopening lowers momentum. Units are existing RON oil units/day, not an unsupported real-barrel conversion.

`organization/setOilQuotaDeviation` lets a member request additional extraction up to 10% of physical daily capacity. Actual output above its quota costs up to 2 OPEC+ standing/day. Standing is charged once per effect/day and only for the selected effective quota. Overlapping decisions select the latest effective quota per country; they do not multiply restrictions. Expiry is exclusive (`day >= endsDay`).

### WTO countermeasures and regional integration

`organizationTradeRemedy` stores dispute, commodity, target exporter, tariff rate, cumulative collected customs and expiry. The strongest applicable remedy is selected, with no additive stacking. `maximumValueB` is the cumulative customs-revenue cap; reaching it exhausts the remedy. Active WTO importing members levy it only on the specified exporter/commodity.

Raw import quotes, industrial quotes, market-listing previews and physical commodity-exchange orders include the live surcharge. Existing base-price contracts cannot lock out subsequently adopted customs. Raw supplier demand falls as the tariff-inclusive price rises, and trade-desk ranking sees that price. The importing treasury receives a customs credit, and `economy.tariffRevenueB` records that already-booked revenue.

Accounting is explicit: debit the importer the gross invoice, pay the exporter the customs base, then credit the importer its own customs revenue. Thus the importing state's consolidated treasury falls by the base payment; the gross invoice is still required as spendable liquidity. The tariff credit is not a second asset or free money. Regression tests conserve the two treasuries and check the cumulative cap. Listing cards/reviews use `listingPurchasePreview`, the same authoritative quote as execution, including the actual net treasury afterward.

`organizationMarketIntegration` stores participants, tariff/friction reduction, free-movement authorization and expiry. Active participants receive a friction multiplier `1 - .05 * reduction` and a feasible raw-trade volume multiplier `1 + .2 * reduction`, bounded by actual stock, export capacity and liquidity. The strongest agreement applies once. Customs countermeasures and sanctions remain enforceable; integration does not waive them. Benefits come from real deliveries, lower transaction prices and increased trade receipts/supplies, not an instant fabricated GDP bonus. Free movement is persisted authorization; a dedicated migration-policy executor is later work.

### Local-currency settlement

`organizationCurrencySwap` is a bilateral clearing authorization under BRICS+, with an approved limit, cumulative gross usage and equal-and-opposite local balances. Both countries must explicitly vote yes, even if the wider bloc passes the resolution. The scenario limit is capped at 5% of the smaller economy's GDP. It never funds either government's domestic budget.

Shared bilateral/industrial/listing/physical-exchange settlement can use the remaining swap authorization first and USD only for the excess. A zero-USD-reserve buyer can settle within the swap limit if its treasury can pay. Reverse transactions consume gross authorization rather than replenishing the limit. FX/local balances, tariff receipts and remaining limits are engine-owned and saveable; expired/suspended or financially restricted routes cannot draw another local tranche.

`economy.foreignReservesB` is optional. An explicit reserve is enforced; old campaigns without one retain their legacy treasury-based settlement until an explicit reserve/swap route is used. At that point the existing treasury is the legacy reserve proxy and subsequent USD flows are tracked. Treasury stays denominated in $B equivalent, including local payments. This is an authored game accounting model, not a live USD/SDR FX or central-bank balance sheet. Expiry stops new draws but preserves historical local clearing balances; future FX revaluation/net liability restructuring is not claimed.

### Sanctions field enforcement

`organizationSanctionsBlock` is the common country-pair/channel guard. Active member implementers enforce the issuer's scope against its target; unrelated countries/channels are not silently given a legacy global-sanctions flag. Any positive intensity and enforcement activates the specified access block in this slice; graduated evasion/friction calibration remains future work.

- Arms: industrial tank orders and deliveries, plus typed `organization/transferMilitaryHardware` transfers of armor/fighter stockpiles. Transfers move existing reserves, require alliance/trade access, bind the actor at the shared command boundary and honor command receipts. Domestic production and already deployed inventories are not erased.
- Trade: bilateral imports/deliveries, industrial orders/contracts, open listings, physical commodity exchange counterparties and resource gifts. Existing cargo already dispatched remains a settled shipment. Anonymous financial/vault orders cannot use an undisclosed counterparty to escape target trade/finance restrictions.
- Finance: publishing new sovereign offers, pair-based acceptance/applications, new international organization facilities, local swap draws and treasury gifts. Existing debt service/cancellation/repayment remains possible; no debt, treasury or inventory disappears when a restriction starts.
- Humanitarian: food/medicine exceptions apply only to their commodity and listed implementing partners; an empty country list means all implementing partners. General humanitarian exceptions cover food, medicine and water, never weapons or oil. Medicine has no standalone market/stock yet; its access rule is covered without inventing one.

All four new effects and sanctions use absolute start/end days and clean expiry in `processOrganizations`. Durations are not destructively decremented, preserving idempotence, delayed execution and save/resume behavior.

## Persistence and verification

The optional trade initialization marker, optional reserve/customs fields and new strict economic effect branches retain Schema 18. Existing Schema 12–17 fixtures continue to migrate; earlier Schema 18 shapes without the additions still load. Validation checks source resolution and immutable terms, membership/country identities, exact expiry, finite amounts, quota deviations, remedy caps, swap limits and net-zero local clearing. Older executables with strict effect unions cannot load the new branches; downgrade compatibility is not promised.

`npm run check` passed: **1191/1191 tests across 107 files**, TypeScript passed, Vite production build succeeded with zero errors. `organizationTrade099.test.ts` adds **60 regressions** covering all economic payloads, quotas and same-seed price direction, actual tariff receipts, regional deliveries, bounded local settlement, embargo channels/exemptions, invalid commands/effects, expiry and frozen save replay.

The baseline 365-day world invariant passed before gameplay changes and remains green. An additional full 365-day world simulation with all four economic effects checks daily progress, strict saves, finite economy/resource values and eventual expiry. Browser/native suites were not rerun. Existing Node localStorage and Vite ineffective-import/chunk-size warnings remain.

## Remaining work

Slice 8.5 owns the new International Affairs program/action UI and browser accessibility/localization playtesting. This release updates existing listing reviews and shared market validators, not the whole organization workspace. Historical legal charter/roster datasets, formal WTO adjudication, central-bank FX/SDR conversion, migration authorization execution, evasion/secondary sanctions, regional physical transport expansion and autonomous economic proposal agendas remain later work. V3 remains the complete-playability milestone.

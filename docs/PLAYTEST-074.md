# 0.74.0-playtest.1 — Industry & Living Diplomacy

## Player path

- Create a commander with citizenship and an optional date of birth. Citizenship does not restrict which nation is commanded.
- Existing campaigns can add these details in the commander options menu.
- The campaign calendar starts at 2026-01-01 and advances one UTC day per simulation day.
- Birthdays grant seven days of +12% agricultural/industrial production only with approval >=65 and stability >=50. Friend/rival reactions appear in the diplomatic inbox rather than blocking gameplay.
- Production now starts with National Industry: stockpiles, deposits, facility investments, input bottlenecks and construction queues. Scroll down for the established military production and deployment controls.
- TECH contains seventeen programs grouped by branch; cards show real prerequisites.
- MARKET retains Food/Oil/Iron/Uranium and adds thirteen industrial goods with immediate buy/sell settlement and monthly supply contracts.
- Geographic presentation now uses bundled NASA Blue Marble imagery in both projections. Political and strategic overlays remain available.

## Tank production

Existing equipment stocks remain deployable. New tank output requires:

1. Advanced Metallurgy and Networked Command, followed by Armored Vehicle Assembly research.
2. Factories allocated to the armor line, with its established steel/fuel/power/treasury inputs.
3. Two armor plates, one engine and one electronics module per output vehicle.

Manufacture parts via researched facilities or import them from trade-pact partners. Tank purchases/exports additionally require an alliance. All transfers affect the same reserve used for military deployment.

## Trade rules

- Every completed shipment conserves stock and treasury between the two countries.
- Export reserves are protected and unaffordable orders are rejected.
- Monthly contracts lock unit price, pay on delivery, track missed shipments and stop when diplomatic restrictions block access.
- Sanctions and war block industrial commerce. Treaty status is checked at settlement, not just when the order screen opens.
- No infinite-stock external market exists. Partner inventory and liquidity matter.
- Resource potential and deposit quantities are balanced gameplay estimates, not asserted real-world geological measurements.
- Mineral deposits are finite. Water potential is renewable.

## Persistence

Schema v13 persists leader identity, calendar/celebration state, correspondence, industrial inventory/facilities/deposits/construction and contracts.
Existing v12 records migrate automatically. Previous equipment, infrastructure, wars, treaties and other simulation systems are preserved.
New tank construction is subject to the expanded research/component pipeline after migration.

## Verification

- 31 test files / 108 tests passed, including twenty new industrial/leadership regressions.
- TypeScript and Vite production build passed.
- Full simulation compared across identical seeds for 35 days, with nonnegative industrial stocks.
- Local Chromium at 1440×1000: complete onboarding, independent citizenship/DOB, refreshed portraits, readable active tab text, actual facility investment, prerequisite research, thirteen additional exchange cards, reviewed stock transfer, recurring contract, birthday bonus and real IndexedDB save/load persistence.
- Both geographic projections rendered the bundled raster; screenshots visually reviewed.
- Completed browser run had no console errors or uncaught page errors.

## Remaining playtest

User acceptance on StackBlitz is still required before merging PR #2.
This is a playable industrial-system expansion; long-campaign balance and every viewport have not been exhaustively tested.
The existing large main-bundle warning remains. Headless Linux lacks some emoji fonts; flag appearance should be checked in the user's browser.

# Data sources and confidence

This build deliberately separates **source-backed indexes** from **gameplay estimates**.

- **Military strength:** Global Firepower 2026 ranking / PowerIndex is attached to 145 countries where matched. GFP states that its index uses 60+ factors and that some inputs are estimates when official figures are unavailable. The game converts the GFP index to a 0–100 conventional-capability indicator. Unit inventory counts outside the hand-authored core are gameplay estimates, not claims of exact current holdings.
- **Military expenditure:** SIPRI's 2025 military-expenditure release/database is the preferred future source for budget calibration.
- **Population/economy:** World Bank country/indicator APIs are the planned production source. This preview uses a mixture of authored major-country values and approximate catalog values so the complete world is immediately playable.
- **Political system:** regime labels are coarse game classifications inspired by public V-Dem / Our World in Data regime datasets. They are not evaluations of individual governments or political actors.
- **Religion:** broad dominant-tradition categories are gameplay baselines informed by Pew's global religious-composition work. They are intentionally coarse and do not represent every community inside a country.
- **Ideology:** the ideology field is explicitly a **gameplay archetype**, derived from the simplified regime model. It is not presented as an objective real-world ideological measurement.

Every uncertain military profile carries `dataConfidence: estimated`; GFP-matched profiles carry `gfp-2026`.

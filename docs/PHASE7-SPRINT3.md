# Phase 7 Sprint 3 — A06–A11

Baseline: af2e6f6fd71ca1598f0dc2566e1c5daa4da6460a on dev/ron-phase7.

The owner reported additional local Light/contrast QA changes. They were not present on the fetched remote baseline. appearancePhase7.css is kept byte-for-byte unchanged by this sprint. New layout rules use its semantic tokens in a separate stylesheet. Fresh installations now default to Light; saved explicit Dark/System choices and legacy Dark installations are preserved.

## A06 — fuel guidance

A pure engine-backed planning estimate reads refinery output, industrial use, crude-oil flow and war readiness without advancing time/RNG. National Alerts and Production expose low refined-fuel/negative flow guidance. The assessment's structured fuel blocker opens a dedicated helper. Its shortcuts carry the original assessment target and open player-owned production or a Refined Fuel market/contract tab without dispatching an economic action.

The existing construction catalogue has no standalone refinery project: Industrial Park adds five factories and one refinery on completion. The helper names that actual project and its 25-day duration, then focuses its real review-build button. It explains crude oil versus refined fuel, production prerequisites and immediate versus day+30 monthly deliveries. Closing a factory deep link restores its explicit return destination.

## A07 — refined-fuel contracts

Existing IndustrialContract and industry/order remain authoritative. Fuel is already an IndustrialGood and is transferred through changeGoodStock into processedResources.fuel. No TradeResource extension or schema change. Supply contracts expose 1/3/5/10 years, monthly quantity, locked unit price, per-delivery cost, first delivery and active contract schedule. Fuel text separates operational reserves from crude oil/electricity.

Regression fixtures cover signing without creation/debit, duplicate route rejection, day+30 and repeat settlement conservation, schema-17 round trips, expiry/cancel and failure under embargo/war, supplier stock shortage or buyer liquidity failure. No gameplay prices, costs or thresholds are changed.

## A08 — tactical drafts and guidance

The engine projects replacement-aware queued CP/fuel costs and validates capabilities, targets and stale rounds. The sector review card includes the full draft batch, Queue/Cancel controls and existing final commit/handoff receipts. Three nonblocking steps can be skipped or replayed; completion is an optional UI-only local key (trp-tactical-guide-v1), not a save field. Hidden opposing sectors remain governed by existing visibility.

## A09 — culture and Cyprus

Country Info Overview displays model religion, ideology and region cards with localized unknown fallback. Duplicate CYP seed/profile data is consolidated without changing economic/military values. The two existing island polygon pieces are combined under one CYP MultiPolygon feature; no coordinate/boundary is redrawn and no other country changes. ID-scoped display projections normalize old CYP names/ISO labels without writing the projection to saves, annexation or relationships.

## A10 — HUD and map vectors

Ten map layer/projection controls now use 24px stroked vectors rather than generated raster/glyph icons. Camera controls share that vocabulary. Leader capsule and the five metric cards have independent surfaces; the overview enclosure is transparent and pointer gaps pass through. Oil is explicitly crude oil with stock units, not operational fuel. Existing mood/day, deltas, clock and country actions remain. A controlled Chromium 153/software-rendering sample at 1440×900 compared P7-00 cf07393 to the sprint. Across 120 idle rAF intervals, both medians were 16.70 ms; repeat p95 was 16.70 ms versus 16.80 ms. Median automation time for eight drags after warmup was 4.665 s versus 3.186 s (three samples each). The earlier single cold sample was 2.537 s versus 8.082 s, demonstrating substantial run-to-run noise. These are local diagnostic samples, not a native-device frame-rate guarantee or a claimed speedup. Both views retained five metric cards.

## A11 — transient reports

The permanent bottom letterbox and development metadata are removed. New journal IDs and newly triggered critical/fuel alerts feed a bounded priority/coalescing presentation queue. Each toast expires after six seconds, pauses while hovered/focused, can be dismissed and opens the archive; archive records are never deleted by UI dismissal. Load/history baselines are silent. Filters include All, Wars, Economy, Diplomacy and Trade, classified by canonical engine report prefixes before translation; unclassified legacy entries remain in All. Redundant archive navigation buttons are removed while the Alerts rail remains.

## Verification

Pending final integrated results. Record only observed checks here.

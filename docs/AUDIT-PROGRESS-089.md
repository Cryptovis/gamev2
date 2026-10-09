# 0.83 audit reconciliation — 0.89.0-playtest.5

Maintained by **Codex**, against `dev/trade-markets-089`. The [original audit](AUDIT-0.83.md) remains a historical record authored by Claude. Its line numbers and counts describe 0.83, not the current source. This is a source/test reconciliation, not a new full-file security audit or a repeat of every historical multi-year experiment.

## Delivered foundations: do not repeat

| Audit scope | Delivery and current evidence |
|---|---|
| Phase 1: save safety, war exploits, resource/upkeep balance, events and critical UI/performance | 0.84; `audit084Persistence`, `audit084War`, `audit084Economy`, `audit084Politics`, `audit084Integration`, `longRunInvariants` tests. No tracked `dist/` files remain (H2); repository rules exist (H6). |
| Phase 2: C4, C10–C13, C15, D8, D12, A5–A6 | 0.87; `economyPressure087`, `industrialMarket087`, `diplomacyParity087`, `commandPath087`. See [0.87 measurements and limits](PLAYTEST-087.md). |
| Phase 2: B9 and E1–E5 | 0.88; `aiWar088`, `politics088`, `eventsVictory088`. AI wars, defender path, political crises, event chains and victory exist. These remain foundations, not final game balance. |
| Phase 3: F first slice, B5/B8 | 0.85–0.86; `tactical085`, `tactical086`: sized grid, schema-17 migration, symmetric terrain/depots, group contact/losses, action timeline, battle RNG and playback. B9 arrived in 0.88. See [0.85](PLAYTEST-085.md) and [0.86](PLAYTEST-086.md). |
| G2/G9 critical fixes | `WorldMap` is memoized and geometry errors show retry; `EconomicTrends` updates the existing chart. This does not prove every subscription or rendering path is optimal. |
| War/research clarity and part of G3 | This patch: visible shared-engine war block reason; readable disabled confirmation; research cards with branch art, exact saved/cost/missing points and prerequisites; shared research duration/progress/refund previews. Cancellation and integration reuse the same refund helper. No cost, capacity or fuel threshold change. |

## Still open or only partially addressed

| ID | Current state | Next concrete scope |
|---|---|---|
| G3 | Research previews covered here; other windows still contain forecasts/formulas | Move remaining supply/investment/population/top-bar forecasts to engine previews, with command-parity tests. |
| G4 / G8 | New strings reviewed in all five languages; multiple catalogues still eagerly imported | Build an explicit duplicate/override inventory, then consolidate and lazy-load by language without losing saved news translations. Do not claim all old translations have been linguistically reviewed. |
| G5 | `html.lang` updates; strategic/review dialogs manage focus individually | Shared modal lifecycle for remaining windows, keyboard country navigation, and keyboard regression coverage. |
| G6 | Scoped styles added without new `!important`; existing layering debt remains | Central z-index tokens and an incremental CSS layer migration, preserving tutorial and nested-dialog ordering. |
| G7 | Unused-asset cleanup previously delivered; map texture conversion remains | Measure and convert the globe raster with image sampling checks. |
| H1 | Lockfile still has the `lightningcss-wasm` alias; of 71 non-root package records, 47 lack `resolved` and `integrity` | Regenerate and verify on native Node, then verify StackBlitz separately. This patch preserves the existing dependency graph and changes only root version records. |
| H4 | New research view is readable; many older engine files remain dense | Format one touched module at a time. Keep formatting commits separate from rule changes. |
| H5 | Historical playtest records remain linked in `docs/` | Archive obsolete records with every inbound link updated; keep changelog and milestones intact. |
| A7 | Local demo hash still uses 210,000 iterations; email is local and unverified | Version stored hash parameters before raising work factor so existing users can still sign in; decide whether to remove the unused email field. This remains a local demo, not online authentication. |
| F beyond first slice | Tactical foundation is delivered | Terrain art/sound, air/naval groups and deeper multi-round AI need their own measured gameplay slice; no rendering-library migration justified by this patch. |

Balance follow-ups remain: approval baseline, democratic unrest, AI war variety and exchange/contract price consistency. The annual invariant checks collapse and non-finite values, not full campaign fairness. V3 stays the complete-playability milestone; no engine rewrite is required to continue these steps.

Validation for this patch is recorded in [Playtest 0.89](PLAYTEST-089.md). Historical delivery claims above are backed by the linked release records and named current test suites; they are not a claim that every Phase 4 item is now closed.

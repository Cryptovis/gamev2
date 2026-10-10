# Antigravity report reconciliation — 0.90

Reviewed by **Codex**, 2026-10-10, against `dev/clear-command-090` (starting from 0.89.0-playtest.7). The supplied `qa-reportantigravity.md` is dated 2026-10-10 but labels its target **0.40**. Its findings are leads, not proof of defects in the current release. This is a source review with targeted regressions, not a complete security or performance audit.

| Report claim | Current evidence and decision |
|---|---|
| 1. Resource consumption is applied twice | **Not demonstrated as duplicate execution.** `resources.ts` charges base economic consumption: oil scales with GDP/utilization/readiness; iron uses factories × .004 × utilization. `industry.ts` separately converts refinery oil (.055) into fuel and factory iron (.022) into steel. Different rates and outputs are present. Removing either unconditionally changes balance and manufacturing. Their combined balance and clarity remain measurable follow-up work; this release does not claim the rates are ideal. |
| 2. Victory threshold shrinks with current forces | **Already addressed.** `warfare.ts` uses stored starting forces; `audit084War.test.ts` checks the 8% baseline and defender behavior. No second rewrite. |
| 3. Conquered countries keep other wars active | **Confirmed and fixed.** Shared outcome settlement closes dependent fronts, turns off auto assault and releases defending allies. `processAutoWars` also cleans older saved fronts even with auto assault disabled. No extra combat round or fuel charge. Tests preserve the winning front and check idempotence. |
| 4. Council aid spends influence without money to deliver | **Confirmed and fixed.** The proposer must have $5B before voting; otherwise no influence, money or council-history entry is consumed. A precise notice explains the block. Player and AI use the same function. Funded aid still works. |
| 5. Unfunded trade remains active and spams news | **Already addressed.** `trade.ts` sets the deal inactive when the buyer cannot pay. Resource shortage behavior is a separate policy; not changed on this claim. |
| 6. Optional event choices ignore affordability | **Already addressed.** `events.ts` rejects unaffordable choices when an affordable option exists; tests in `audit084Politics` cover this. An unavoidable crisis cost is intentionally distinct from a free optional purchase. |
| 7. Autocracies lose election days | **Confirmed and fixed.** `simulatePolitics` advances the countdown only for democracy and republic, matching `factions.ts`. Tests cover both electoral regimes plus autocracy and monarchy. |
| 8. AI tax policy is random | **Already addressed.** Goal-directed tax decisions in `strategicGoals.ts` replaced random tax movement. Seeded randomness elsewhere does not establish this claim. |
| 9. Country panel subscribes to all state | **Partially valid.** A shallow selector now excludes receipt/save notices and map control preferences. Actual simulation changes still update the dossier. No FPS improvement is claimed without profiling; 5× is currently one day per second, not five. |
| 10. SVG map needs PixiJS to scale | **Unproven recommendation.** The map is memoized, has selective subscriptions and geographic worker support. No frame-time trace or controlled comparison was supplied. Retain D3/SVG and measure before choosing a rendering rewrite. |
| 11. Snapshot cloning blocks the main thread | **Possible cost, not measured here.** Snapshot isolation and coordinated saves protect persistence. Do not weaken them without long-save timing data and an equivalent safe design. |

## UI, coverage and infrastructure claims

- **Keyboard map access was missing:** added focus, arrow movement, +/− zoom, Home to the player's country and Enter to open its/selected country's dossier. Country selection remains available through the native dossier selector. This is not a claim that every polygon is individually keyboard navigable.
- **No focus styles / no modal focus management:** obsolete as blanket claims. Focus-visible styles and the shared window lifecycle already exist, including EventModal. Integration now also uses the shared lifecycle when opened as a standalone modal; Affairs embeds it as a section.
- **No animation / no tokens:** existing transitions and CSS variables disprove absence. 0.90 adds a short, reduced-motion-aware Affairs transition and refines selected HUD states. The legacy CSS cascade is still technical debt.
- **No bloc/council/industry tests:** filenames are not coverage. `strategicSystems`, `audit084Politics`, `audit084Economy`, `industrial074`, `industrialMarket087` and other current suites cover these systems. 0.90 adds the specific aid and multi-front regressions that were missing. This does not claim exhaustive coverage.
- **No espionage, cultural spread or military production:** outdated. Current intelligence, world institutions, ideology pressure, production and logistics paths exist. Further depth is still on the roadmap.
- **Sound manager:** remains open. No audio library was added merely to satisfy a library list.
- **Immer, PixiJS, Phaser, Framer Motion and other library suggestions:** not adopted without a measured need. Zustand is already used. CSS handles the requested small transitions. Multiplayer and 3D are separate product decisions, not fixes for this patch.

## Additional user-reported fixes

Foreign integration preparations previously opened even without territorial control, then produced a generic unavailable receipt. Engine-owned Affairs previews now expose ownership, exact cost/shortfall, thresholds, cooldowns and duplicate activity before review and again at execution. Foreign countries receive influence options; controlled territories receive administration and integration sections. Outreach uses its real scaled cost instead of a hardcoded $2B display.

See [0.90 playtest](PLAYTEST-090.md) for executed validation and [the continuing 0.83 audit ledger](AUDIT-PROGRESS-089.md) for remaining Phase 4 items. V3 remains the complete-playability milestone.

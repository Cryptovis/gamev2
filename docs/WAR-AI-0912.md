# Phase 3 — Multi-round tactical AI and war balance (0.90.0-playtest.12)

Owner: **Claude (Opus 5.5)**. 12 October 2026. Base: playtest.11, GitHub `50c75ab` (CI 38270240857 completed/success). Alper authorized Phase 3 only; Phase 4 air/naval task-group code is untouched. Save schema 17 is kept: the new plan memory is an optional field.

## Decisions approved by Alper

1. AI plan memory lives in `TacticalBattle.plans` (optional, schema 17). Battles saved without it plan afresh.
2. Fog of war: an order into an unseen occupied sector must resolve as blocked rather than be rejected, for both sides alike.
3. Balance targets: equal forces on plains within ±0.5 front per day; full air superiority on the order of the mountain defensive edge; small economies can reach a rescue line during a 90-day defence without bankruptcy.

## 1. Multi-round planner (`src/engine/systems/tacticalPlanner.ts`)

- Each round an AI side (the opponent, and the player's side under standing orders, auto mode or an unanswered defence) evaluates five plans — reconnoitre, seize, flank, secure, withdraw — around each objective and projects them three rounds ahead (discount 0.8): objectives held, distance closed, cover, artillery support and exposure weighted by the strength ratio.
- **Plan consistency:** a plan is kept for at least two rounds, and afterwards replaced only when a challenger projects at least 25% better or the plan becomes impossible. A taken objective converts to "secure" when consolidation is the better choice.
- **Fog of war:** knowledge is the side's current vision plus enemy groups it saw in the last three rounds (`known`, saved with the plan). Objective holders are known only where visible. The enemy's total strength comes from published casualty reports, not positions. A test moves every unseen enemy group and checks that plans and orders do not change.
- **Same rules as the player:** the plan sets a goal and posture; the shared order scorer turns it into orders that pass the player's validator, command budget and fuel rules.
- **Budget and fallback:** work is counted in deterministic evaluation steps (limit 3,000; measured decisions use about 1,000), never a clock. Above the limit the side uses the previous single-round AI (`chooseSingleRoundOrders`).
- The player's tactical board shows the player's own standing plan; the opponent's plan is never shown.

About decision 2: the review found no case to convert. Movement range (two sectors) never exceeds vision range (two sectors around each own group), so every move target and route sector is already visible and the validator never reads a hidden sector. A regression test fixes this property; if movement or vision ranges change, the blocked-at-resolution rule must be added.

## 2. Balance changes

| Change | Before | After |
|---|---|---|
| Front formula | Linear in power ratio plus a fixed +1.2 for any fuelled attack | Log of the ratio (`FRONT_SCALE` 11), so doubling and halving move the front equally; +1.2 initiative only while the attacker attacks with fuel |
| Air superiority | Counted twice: a power multiplier and up to +3.5 front per day | Counted once: a power factor; full superiority equals the mountain defensive edge (def/atk 1.28/0.68) |
| Fuel | Auto-resolve defender burned nothing and had no shortage effect | Same rule both sides: offensive orders pay operational fuel, holding pays 25% sustainment; holding is never blocked by fuel |
| Supply role | Attacker ×0.92, defender ×1.04 (13% gap) | Attacker ×0.96 (extended lines), defender ×1.00 |
| Rescue lenders | Offers needed relations ≥ 20 with a lender; 70 of 96 small economies had no possible lender at campaign start | Non-hostile lenders (relations ≥ 0), same as the approval rule; countries at war with the borrower are still excluded |

All other numbers (losses, exhaustion, coalition, terrain table) are unchanged. The 365-day long-run invariant passes.

## 3. Measured results

Paired twin countries cloned from one template, changing one factor at a time; 24 seeds; auto-resolve front change per day over the first 30 days (`npm run measure:war`, Measure workflow `measure/war-*`).

| Scenario | Before | After |
|---|---:|---:|
| Equal forces, plains | −0.93 | **+0.31** (target ±0.5) |
| Equal, desert / coastal / forest / urban | −2.8 / −3.6 / −4.3 / −5.0 | −1.7 / −2.8 / −3.9 / −4.8 |
| Equal, mountain | −7.2 | −8.0 (edge vs plains 8.4) |
| Attacker full air superiority, plains | +6.7 | +9.0 (effect +8.6) |
| Defender full air superiority, plains | −6.9 | −8.2 (effect −8.5) |
| Attacker air superiority in mountains | — | −1.5 (they nearly cancel) |
| Attacker 1.5× forces | +2.9 | +3.6 |
| Attacker low supply / exhausted (50) | −4.5 / −6.0 | −4.1 / −5.6 |
| Attacker without fuel / defender without fuel | −16.7 / +16.0 | −17.5 / +11.0 |
| Defender fuel burned in 90 days (equal plains) | 0 | 36.5 (attacker 146) |

Tactical board, 12 seeds × 20 rounds, defender on the planner in both columns:

| Scenario | Attacker AI | Goal switches per round | Front after 20 rounds |
|---|---|---:|---:|
| Attacker 1.5× forces | single-round | 0.179 | +66.6 |
| Attacker 1.5× forces | planner | **0.050** | **+73.6** |
| Equal, plains | single-round | 0.171 | +8.7 |
| Equal, plains | planner | 0.113 | +12.8 |
| Equal, mountain | single / planner | 0.242 / 0.115 | −100 (attacker defeated in ~13 rounds) |

Small economies (Armenia defending against Georgia and Azerbaijan, Georgia against Russia, with and without low cash, 90 days): no bankruptcy or lasting arrears in any run. During a war, rescue lines are offered by countries not at war with the borrower and approved after the normal review.

## 4. Limits

- Mountain battles remain very hard for an attacker on the tactical board; this is the existing terrain table, unchanged.
- The planner's projection is heuristic (greedy unit paths, no enemy reaction model). It is bounded and explainable, not optimal.
- Equal-force tactical battles drift slightly toward the attacker (+12.8 over 20 rounds) because the attacker keeps the initiative; the auto-resolve target is met.

## 5. Validation

660 unit tests / 83 files, TypeScript and production build passed; the 365-day long-run invariant passes. All 160 production-browser scenarios passed on GitHub-hosted Chromium (158 earlier + 2 standing-plan specs; full suite on the release tree before merge). Not run on StackBlitz: the npm registry is blocked in this session.

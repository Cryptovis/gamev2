# Civic Command · 0.78.0-playtest.1

Base: dev/guided-command-077. Save schema remains 14. Migration preserves existing governance and seeds crews for existing aircraft; old saves can replay onboarding from Help.

## Delivered

- Practical ten-step onboarding: the player selects a real affordable facility, reads the financial review, confirms construction, dismisses the result and inspects the queue. Cancel returns to selection. This spends actual campaign funds; skipping remains available.
- Generated sixteen-tile administration artwork: all ten country tabs and four HUD indicators now have images; menu icon/label spacing is separated. Investment and territory shortcuts are near the top of the country panel.
- Automatic war assault uses the single campaign clock at one day per two seconds. Halting pauses time. Decision interruptions and tutorial pause it. No separate advance-day button. No cinematic HD renderer is included.
- Research is a popup with eight branches, linked prerequisites, costs and confirmation. Education and diplomacy unlocks have simulation effects. New windows load lazily.
- Universities ($5B, 30 days) add 0.05% research rate each; institutes ($7B, 40 days) add 0.06%, require laboratories. Military academies ($6B, 30 days) improve pilot training rate 0.5% each and require command systems. Upkeep is $0.002B/$0.003B/$0.002B daily respectively. Education discoveries add separate research bonuses.
- Pilot cohorts recruit from a pool capped at 5% of military personnel. Each costs $0.0001B upfront, trains for approximately 30 days and adds $0.0000002B daily wages. Training acceleration rounds to whole days. Uncrewed aircraft lose effective air strength; unpaid crew coverage halves. Air casualties can reduce trained crews.
- Occupied territories accumulate unrest from food/oil/water shortages and poor stability/approval. At 80% unrest production loses 30%; at 95% there is a seeded daily rebellion chance. Relief transfers real reserves; suppression has military, cohesion and reputation costs. Seven-day policy cooldown prevents repeated instant relief/suppression.
- Territorial control can transfer to another independent country. A $3B, 21-day transition election restores independence. Three candidate offers differ: trade, non-aggression or defense alliance. $1B support improves chances without guaranteeing victory; the winner’s treaty is reviewed and accepted separately.
- Foreign political campaigns cost $5B and take 30 days. Low approval (<40), low stability (<50) and military weakness or strong ideological pressure are required. Success chance is bounded 10–65%; recovered eligibility fails the campaign, failure damages relations, and a 90-day post-completion cooldown applies. This fictional mechanic changes government, not territorial ownership.
- Geographic imagery remains visible in all map modes using real NASA Blue Marble terrain. The reprojection uses WebP to reduce image transfer size. Connections replaces the old Relations label and colors active trade, embassies, non-aggression and trade pacts; Diplomacy remains separate. Multiple connections use legend priority; select a country for all agreements.
- New screen labels, instructions and Help entries have English, Turkish, Spanish, Chinese and Russian catalogs. Unmatched legacy and generated simulation prose retain English fallback.

## Validation

159 automated tests across 35 files, TypeScript and production build. Browser checks complete all ten tutorial steps including real construction, verify visible HUD/tab artwork and menu spacing, research confirmation, campus/pilot recruitment, occupation elections and support, satellite connections mode, exactly two automatic war days in 4.3 seconds, halt/pause, narrow viewport and absence of runtime console errors.

## Manual checks

1. Load an older save; verify existing aircraft keep crews and pending governance survives save/load.
2. Replay tutorial; cancel the production review then confirm one construction. Budget and queue must change exactly once.
3. Switch all languages in setup and campaign; inspect new popup labels and Help searches.
4. Build a campus, advance to completion, then drain treasury. Bonuses and crew funding must reflect upkeep.
5. Win territory; create shortages, send relief, try repeated suppression, transfer control and run elections in separate campaigns. Inspect independence and treaty offers after day 21.
6. Attempt ineligible foreign campaigns, fund an eligible target, then improve target conditions before resolution. Failure must not create automatic control.
7. Start auto assault, open a decision interruption, halt, and reopen the war. Check a single clock and no duplicate casualties.
8. Compare satellite flat/globe views with all map overlays, zoom and narrow screens. Verify the country selection remains based on geometry.

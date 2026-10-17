# Phase 9.8: Living Parliament, Domestic Factions and the General Strike Engine (Meclis, Siyasi Gruplar ve Genel Grevler)

Every self-governing country now has a 200-seat chamber, a cabinet that governs through a coalition, and unions that can strike. It builds on the 0.88 factions (`factions.ts`) instead of replacing them: the five blocs are the five factions, and elections are still held there. All of it is a pure function of `GameState` driven by typed `parliament/*` commands. No random number is drawn, so the simulation seed is untouched.

## Files

- `src/domain/parliament.ts`: types and the command union. `world.parliament` is optional; a country's record is created on its first daily pass.
- `src/engine/systems/parliamentSeats.ts`: lead bloc, seat allocation, coalition arithmetic, loyalty.
- `src/engine/systems/parliamentStrikes.ts`: grievance, strike levels and effects, talks.
- `src/engine/systems/parliament.ts`: daily pass, mandate, commands, AI, the `parliamentView` preview and the hooks other systems read.
- `src/persistence/validation098.ts`: validator (saves with and without the field load).
- UI: `ParliamentWindow.tsx`, `hemicycle.ts` (seat layout), `parliament098.css` (Navy and Ivory tokens), `uiCatalog098Parliament.ts` (tr, es, zh, ru).

## Blocs and seats

Blocs: Industrialists (business), Organised labour (labour), Military and nationalists (security), Traditionalists (traditional), Civil technocrats (liberal). The premier's bloc is the one with the largest strength once the national ideology has weighed in (for example state socialism favours labour, a religious state the traditionalists).

Seats are allocated at an election by largest remainder: weight = strength x (0.6 + 0.8 x satisfaction / 100), and the lead bloc is also lifted by approval and stability. The chamber always holds exactly 200 seats. After each election (including a snap one) the chamber is reseated and a cabinet formed.

## Coalition

A new cabinet is the lead bloc plus the best willing partners (satisfaction of at least 42) until it holds 109 seats, a bare majority of 101 plus a cushion of 8. A bloc's votes count for less as it grows unhappy: loyalty = satisfaction / 45, capped at 1. Reliable seats are the cabinet's and its supply partners' seats weighted by loyalty.

A partner below satisfaction 32 counts days; after 20 it walks out of the cabinet (the premier's bloc never does). Unhappiness drains twice as fast as it builds. Commands: invite a willing bloc, drop a partner (6 points of snub), buy a confidence-and-supply deal (3 B at the reference GDP, 120 days, +6 satisfaction), or make concessions (the 0.88 courting rules; also clears the partner's unhappy counter). All costs scale with GDP. The AI repairs its own coalition with the same invitations and deals.

## Mandate

Governments with free elections need 101 reliable seats to push a major decree through, and a caretaker cabinet can pass none:

- Declaring war: a `parliament` block in `warDeclarationStatus`, so the player and the AI follow the same rule.
- Tax reform: a change of the rate by more than 4 points in one command (the player's `economy/setTaxRate`; routine adjustments never need the chamber).

Regimes without free elections, countries whose chamber has not met yet, and controlled governments are never blocked.

## No confidence, resignation, snap elections

After 10 days without a reliable majority the opposition tables a motion. The vote comes 10 days later: ayes are the reliable seats. If the government survives, approval rises by 2 and no new motion can be tabled for 90 days. If it loses, the cabinet resigns (stability -4, approval -3), becomes a caretaker government, and the election is called within 30 days. The election itself is the 0.88 one, so a player who loses it loses the campaign. The player may also call a snap election (approval -1, countdown to 30 days) when the next one is more than 60 days away; a win resets the electoral clock.

## Strikes

A grievance meter (0 to 100) is pushed up each day by: union satisfaction under 45 (0.04 per point), approval under 40 (0.02), inflation over 12 (0.03), unemployment over 14 (0.015), welfare under 40 (0.015), a society budget share under 9 percent (0.03) and unpaid civil wages, meaning an empty treasury (0.6). When nothing pushes it falls by 0.3 a day; a running strike adds 0.12 a day of its own momentum.

Levels start at 50 (local), 70 (sectoral) and 88 (general) and ease 15 points lower. Effects: factory output 92, 75 and 40 percent; trade flow 95, 80 and 45 percent; tax revenue lost 3, 10 and 25 percent. Output and tax go through the leader-modifier object (`strikePerks`) in the country tick and in production; trade goes through the contracted trade inflow (the worse of the two ends). A general strike raises public disorder by 0.9 a day; above 50 it drains stability, and at 80 riots break out once a month (stability -3, approval -2). In a regime without elections a general strike also feeds regime pressure.

Talks (14 days apart, each further offer within a year 30 percent weaker): a collective agreement (4 B at the reference GDP, -30 grievance, 120 days of quiet, +0.4 inflation, +8 labour), shorter working hours (free, -22, productivity -2, business -8), a wage subsidy (0.004 percent of GDP a day for 180 days, -12, ends if the treasury empties) and a police crackdown (free, -18, approval -4, reputation -3, labour -12, liberals -8, disorder +10). Offers that cost money are refused when the treasury cannot pay; the free ones are always available. The AI answers strikes with the same offers and prices.

## Interface

Country panel, Parliament button (player only). A hemicycle (filled seat: in the cabinet; half-filled: backs the government from outside; ring: opposition), a legend, the reliable-votes meter against the 101 line, the mandate line, the election forecast and the snap-election button; five bloc cards with the actions the engine allows (each disabled button carries the engine's own reason); the strike card with the risk word, grievance meter with the three thresholds, effects, the causes and the talks dialog; and a record of recent events. Navy and Ivory re-tint every token; the five bloc colours are checked for contrast on both. All text is in en, tr, es, zh and ru.

## Caveats

- Parliament is a layer over the 0.88 factions: policies still move faction satisfaction exactly as before, and nothing here changes those formulas.
- The AI is gated on declaring war but not on tax reform (it adjusts its rate in small steps).
- Strikes also touch the AI. Countries that are broke for long enough will strike, and the effects (lower tax income) can deepen their deficit; the long-run invariant test still passes.
- Strike effects reach steel and production output and contracted trade, not the energy grid or food production.
- Units are game scale. The chamber has no individual members, only blocs.

## Validation

Run here: 76 parliament unit tests, the war, peace, nuclear, i18n, persistence and long-run regressions, `tsc` over the engine graph, and Chromium renders of the window (calm, crisis and caretaker, dark and light, 1440 and 390 px). Not run here (no network): real Vitest, `vite build`, Playwright (`e2e/parliament098.spec.ts`), and `tsc` over the TSX files with real React types.

# Phase 9.7: Strategic Uranium Enrichment, Nuclear Deterrence and IAEA (Nükleer Sistem)

A country with the civil reactor technology can open an enrichment programme, climb the assay ladder, build a strategic triad and live with the IAEA. Everything is a pure function of `GameState`, driven by typed `nuclear/*` commands.

## Files

- `src/domain/nuclear.ts`: types and the command union. `src/data/nuclearArsenals.ts`: legacy arsenals.
- `src/engine/systems/nuclearEnrichment.ts`: separative work, cascades, daily product.
- `src/engine/systems/nuclearForces.ts`: triad numbers, build costs, upkeep, deterrence inputs.
- `src/engine/systems/nuclearIaea.ts`: suspicion, inspections, exposure, Board and Security Council, treaty withdrawal.
- `src/engine/systems/nuclear.ts`: eligibility, command handler, daily processing, `nuclearView` preview for the UI.
- `src/persistence/validation097.ts`: optional `world.nuclear` validator (saves with and without it load).
- UI: `NuclearCommandWindow.tsx`, `nuclearCommand097.css` (Navy and Ivory tokens), `uiCatalog097Nuclear.ts` (tr, es, zh, ru).

## Enrichment

Standard SWU formula with `detMath.log`: natural assay 0.711%, tails 0.25%; enriched feed uses natural assay as tails. Levels: LEU 3.67%, HEU 20%, weapons grade 90%. SWU per kg from natural feed is about 4.5, 41.6 and 208; weapons grade from LEU feed is about 72.

One uranium resource unit is 20,000 kg natural uranium. A centrifuge gives 5 SWU a year; a block is 1,000 centrifuges; at most 10 blocks per site and 6 sites. A civil plant burns 3 kg LEU a day; stored LEU displaces raw uranium. A warhead core needs 25 kg of weapons grade.

## Triad

Warheads per launcher: ICBM 3, SSBN 16, bomber 4. First-strike survival: silo 0.6, SSBN on patrol 0.95 (in port 0.25), bomber 0.3. Deterrence = 100 x (1 - exp(-survivable / 25)) x readiness. Build days and costs (billions, scaled by clamp(GDP / 1500, 0.4, 5)): centrifuge block 90 / 0.8, assembly line 180 / 2.5 per level, ICBM 240 / 1.2, SSBN 720 / 9, bomber 360 / 2.2; hidden blocks cost 1.6 times more; a warhead 0.04. Upkeep per year: warhead 0.004, ICBM 0.05, SSBN 0.8, bomber 0.12, block 0.03, assembly 0.05, patrol 0.3. Unpaid upkeep drains readiness (0.5 a day) and stability.

A deterrence of at least 50 shields a state from attack by a state below 25 (`WarBlock` `deterrence`, same rule for the AI).

## IAEA

Declared sites are open. Hidden sites add suspicion: centrifuges / 1000 x level weight (0.4, 0.9, 1.7) x visibility x 0.9 x world scrutiny, 1.8 times with the additional protocol. Concealment falls with size and purity. Exposure comes at suspicion 100 or from a seeded snap inspection (no seed mutation). Inspections run every 90 days (30 when queried, 60 with the protocol).

Exposure: compliance -35, reputation -20, stability -5, approval -3, relations -15 with every state. The Board meets after 14 days; the Security Council votes after 45. A permanent member friendly to the violator (relation 50 or more) vetoes; a permanent-member violator vetoes itself; otherwise sanctions pass at 50 percent GDP-weighted support and last 730 days. Leaving the treaty: vote after 30 days, reputation -25, relations -20.

## Caveats

- No AI nuclear programmes yet; AI states only keep the legacy arsenals from data.
- No nuclear use: the arsenal deters and shields, it cannot be fired.
- Legacy arsenal upkeep is covered by the defence budget; only growth above the baseline is billed.
- Units are game scale, not literal.

## Validation

Run here: 45 nuclear unit tests, the war, peace and i18n regressions, tsc over the engine graph, and Chromium renders of the window in dark, light and 390 px. Not run here (no network): real Vitest, `vite build`, Playwright (`e2e/nuclear097.spec.ts`), and tsc over the TSX files with real React types.

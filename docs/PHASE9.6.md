# Phase 9.6: Multilateral Peace Conference and War Settlement Table (Barış Masası)

Victory no longer hands the loser to the winner. A decisive war, an armistice or a collapse opens a peace table where the winner spends war score on demands. A concluded treaty is applied once, deterministically.

## Flow

1. `settleWarOutcome` calls `openPeaceConference`. `warfare.ts` and `concedeWar` no longer set `controllerCountryId`.
2. AI winners dictate (`aiTerms`) and conclude at once. A player who lost sees an unread treaty notice.
3. A player winner gets an open table after the victory scroll ("Take your seat at the peace table"). The table signs its current demands after 30 days.
4. Armistice: an AI defender with exhaustion or front progress of at least 70 asks the player for an armistice (needs a player war score of at least 15). The offer lasts 20 days; a decline silences it for 30. Accepting ends the war and opens a table limited to the ground held.

## War score

Eight lines for each side: casualties 22, divisions destroyed 12, occupation 42, capital 10, blockade 8, embargo 8, air 10, exhaustion 8 (maximum 120). A decisive war raises the winner to at least 100. The breakdown is shown in the war window (`WarScorePanel`) and in the left column of the table.

## Regions

The engine has no provinces, so each country is split into six abstract regions (capital, heartland, industrial, resource, frontier_a, frontier_b) with fixed population, output and resource shares that each sum to one. The front (`war.progress`) occupies them in a fixed order.

## Demands and costs (war score)

- Annex a region: round(6 + 64 x regionWeight x (0.45 + 0.55 x sizeFactor)).
- Puppet government (attackers only): round(40 + 20 x sizeFactor). Needs the capital occupied.
- Demilitarized zone (frontier_a or frontier_b): 8. Five years: the bound country cannot declare war on the beneficiary and its readiness ceiling drops by 8 points per zone.
- Reparations, 1 to 5 years: years x 4 (light, 2% of monthly GDP), 7 (standard, 4%) or 11 (heavy, 7%). Paid every 30 days, capped by the payer's treasury, with a stability strain.
- Disarmament: armour 70/50/30 percent (base 6/12/20), fleet 70/50/25 percent (base 5/10/16), scaled by 0.7 + 0.3 x sizeFactor. Caps hold for 5 years.

Reparations and each disarmament branch are single choice. A puppet cannot be combined with taking every remaining region.

## Applying the treaty

`concludePeace` re-validates every term (a stale one is dropped), orders them (annex, puppet, disarm, dmz, reparations), applies each once, then sets relations to hostile and charges the winner reputation. Cession moves proportional shares of population, workforce, GDP, treasury, debt, industry, resources, production and processed goods, so totals are conserved. When all six regions are ceded, the loser is folded in with `consolidateTerritory`.

## Determinism and saves

All of it is pure; no randomness and no clock. `world.peace` is optional; `validPeaceState` accepts saves with and without it and rejects unknown demands, countries and out-of-range days.

## Known limits

- Partial cessions transfer economy and population at country level; the map is not recoloured.
- Allied delegations are informational; there is no bidding between allies.
- A DMZ is a war-declaration bar plus a readiness ceiling, not a map restriction.
- Puppets are available to attackers only. Council ceasefires do not open a table.

## Validation

Unit tests: `src/tests/peaceConference096.test.ts`. End to end: `e2e/peaceConference096.spec.ts`. The spec and `npm run check` were written in an environment without vitest, vite or Playwright; run them before release.

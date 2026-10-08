# The Real President · 0.79.0-playtest.1

Based on `dev/civic-command-078`. Preview branch: `dev/real-president-079`.

## Playable changes

- Daily population now responds to food availability, GDP per person, tax rates, inflation, unemployment and stability. Births, deaths, welfare and migration are visible in the economy panel. Emigrants are routed to safe, stable countries; when there is no safe destination they remain in the origin. The original demographic growth baseline is preserved instead of compounding yesterday's calculated rate.
- A tax review compares projected revenue, welfare and birth trends before applying policy. Public approval responds over time. Recruitment transfers civilians to military service, pays a mobilization cost and adds recurring personnel upkeep; it does not delete total national population.
- Open Market offers 19 raw and industrial products. Countries post quantities at their own asking prices. Posting reserves real stock; money moves only on a purchase. Partial fills, returning unsold stock, expiry, trade-access restrictions, AI bargain buying and overpriced unsold offers are implemented. Weekly AI supply and purchases have bounded listing history.
- Gold and silver have finite mines, production stock and electronic-component inputs. Central-bank gold is a separate vault that can release tonnes into industrial inventory or receive them back. Transfers do not create money. Global scarcity and active wars affect precious-metal prices.
- Generic finished armored vehicles require an alliance, a trade pact and sufficiently good relations. Their import offer is at least 35% above the estimated domestic marginal assembly cost. Domestic production still requires components, factories, power, funding and time.
- Festivals, sports events and food relief have generated artwork, an upfront review, daily effects, durations and cooldowns. Food relief also uses real food stock. Contextual cabinet advice can be inspected, skipped or suppressed by category, then restored in Help.
- Diplomatic Post retains outgoing proposals and incoming letters. Outgoing embassy and trade proposals receive a seeded acceptance/rejection after three game days; no setup cost is paid unless accepted. Incoming setup costs are shared equally by both governments. Replies expire, existing agreements cannot charge twice, and hostile deterioration can close an embassy with a retained letter and a popup.
- The title is The Real President, with a generated portrait cover and a small AlpyX Game Studios footer. World Pulse uses illustrated cards. Core new controls and prices have readable contrast and dollar/K/M/B formatting; engine/save amounts remain in billions.
- Ten tutorial steps now include live reading briefings. First construction remains a real reviewed action. Highlighting the workspace close control leaves its content readable. Supply → Open Diplomacy selects and focuses the relevant supplier country. War planning and active war screens warn about inadequate/critical fuel.
- Help collects release notes, new mechanics and FAQ entries; old redundant architecture notes were removed from country panels. Turkish strings were added for the new screens. Other languages retain their established catalog and English fallback for new text without a translation.

## Compatibility and scope

Schema 14 saves remain compatible: missing precious-metal stocks, deposits and facilities are merged with defaults while existing progress is preserved. Living-world listings, letters, activities, gold vaults and suppressed advice persist in snapshots. Reserve gold is initialized as described in ECONOMY-079.md.

This is a strategy simulation with abstract resource lots and game balancing. New units explicitly use tonnes for gold/silver and vehicles for tanks. The complete older economy has not been converted into a real-world logistics model. HD War Experience remains on the roadmap; it is not represented as a completed 3D battlefield mode.

## Validation

- `npm run check`: **185 tests across 36 files passed**, TypeScript check and production build passed. The existing main application bundle still exceeds Vite’s 500 kB advisory; further simulation/UI splitting remains a performance follow-up.
- Browser checks: generated cover loads, all ten tutorial steps, actual initial construction, live reading dialogs, tax review, festival confirmation, reserve release and listing escrow, outgoing proposal, Supply target navigation, low-fuel warning, suppressed advice and Help restoration, Turkish titles and narrow viewport.
- Simulation tests cover stock/cash conservation, partial fills, cancellation/expiry, overpriced unsold offers, safe migration, recruitment, assembly/import pricing, scarce gold inputs, timed benefits, proposal delays/rejection, joint setup fees, embassy closure and old save migration.

## Run

Stop the existing Vite process, then:

```bash
git fetch origin
git checkout dev/real-president-079
git pull --ff-only origin dev/real-president-079
npm ci
npm run dev
```

If Git reports local changes would be overwritten, preserve them before changing branches. This release does not require deleting browser saves.

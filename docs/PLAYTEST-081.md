# The Real President — Powered World 0.81.0-playtest.1

Based on `dev/sovereign-horizons-080`, including its cover/portrait layout hotfix. Published on `dev/powered-world-081`. Save schema remains 14; `world.energy` is optional for older saves.

## Guided learning

The ten lessons pause the clock and require the player's clicks. Non-production lessons use actual live briefings. Reading is now a separate acknowledgement, followed by a spotlight around only the briefing X, followed by only the workspace X. Production includes a funded first facility, its cost review, construction confirmation and receipt; cancellation returns to the construction choice instead of advancing an unexecuted investment.

Shading is lighter (46%); tutorial reviews avoid a second opaque/blurred backdrop. Close instructions illuminate only the requested control, including when another tab remains selected. Escape/cancellation recovers the lesson phase. Small screens use a compact reading instruction to preserve more space for the briefing.

## Energy simulation

Production now contains National Energy Grid, with illustrated plant cards, demand, generation, reserves, coverage, outages, fuel consumption, upkeep and construction projects.

| Plant | Cost ($B) | Build days | Base power/day | Fuel/day per plant | Operating $B/day | Research |
|---|---:|---:|---:|---|---:|---|
| Coal | 0.80 | 60 | 0.60 | 0.20 coal | 0.00008 | None |
| Oil | 0.65 | 45 | 0.50 | 0.12 oil | 0.00010 | None |
| Solar | 0.60 | 40 | 0.32 | None | 0.00002 | None |
| Wind | 0.75 | 50 | 0.40 | None | 0.00003 | None |
| Hydro | 1.80 | 120 | 0.80 | None; water potential | 0.00005 | Grid Modernization |
| Civil nuclear | 6.00 | 365 | 2.40 | 0.003 uranium | 0.00030 | Civil Nuclear Infrastructure |

These are authored gameplay units and balancing values, not real electrical measurements or current plant quotations. Civil nuclear energy adds no nuclear weapon mechanic.

- Coal uses industrial coal stocks. Oil/uranium use actual country resource stocks. Generation scales down to available fuel and operating cash; resources and money do not become negative.
- Solar and wind follow deterministic 30-day output cycles. Hydro follows water potential and seasonal variation; low-water countries cannot build it. Grid Modernization adds 22% generation.
- Existing generic capacity migrates once to coal/oil plants plus a retained legacy grid. Legacy capacity keeps earlier infrastructure investments relevant. Disabling a named plant never converts it into free legacy generation.
- Civilian needs are served first from current production and stored electricity. Planned demand also includes enabled industrial facilities and military production lines. Existing production systems consume the remaining power and constrain their own output when short.
- Below 95% coverage, the outage counter rises. Unmet demand reduces approval, stability and productivity in proportion to the shortfall. Player warnings occur on onset and every seven outage days; recovery resets the counter. New shortages may therefore change balances in existing campaigns.
- Pay construction once. At most three active power projects. Generation starts on completion; daily operating funds are additional. Review research, cost, completion day, fuel and upkeep before confirming.
- Unfinished power construction can be cancelled after review. Refund is 80% of remaining unbuilt value, paid once. Completed projects cannot be cancelled.
- Every 14 days, non-player, non-occupied governments review generation against demand. They choose affordable locally supported coal/oil/hydro, researched civil nuclear, or renewable fallback; eligible grid/nuclear research progresses using actual research points. This is a deterministic strategic rule, not a claim of general intelligence.
- Integration transfers plants and unfinished power projects along with other assets. Retired sovereign profiles do not generate again. Save/load preserves funded projects without charging twice.

## Localization, profile and resource overlay

Turkish coverage extends static menu labels, event choices, equipment/facility/technology explanations, tutorial briefings and common status values. Dynamic SITREP/news templates translate at display time, retaining numbers and translating country/resource names. Historical English reports therefore change when selecting Turkish; stored reports are not destructively rewritten.

Whitespace fragments are normalized without introducing duplicate separators. New English fallback entries do not overwrite existing Spanish/Chinese/Russian translations; this patch's new copy is authored in Turkish and English. A complete new-copy translation into every other language is not claimed.

Profile has Profile, Campaign History and Session tabs. History shows recent reports and campaign victory/integration/credit/power counts. The stale 0.75 product footer is removed. Long rail/tab labels use whole words instead of splitting a final letter onto its own line.

Resources map displays up to two dominant resources beneath each visible country label. Values come from positive raw production and actual last-day industrial output, weighted for readability. Resources are not invented for a country merely because a symbol would look appropriate. Collision boxes reserve space for the icons; country labels use their translated width. Existing sprite imagery is reused rather than loading separate large pictures for each country.

## Performance and limitations

Energy demand uses the current country directly rather than cloning the full country map for every national calculation. Numerical-only UI values skip news-template matching. The earlier geographic worker/camera cache remains in use.

Main bundle still exceeds Vite's advisory 500 KB threshold (about 1.10 MB minified / 332 KB gzip before subsequent copy/layout-only adjustments). This patch does not claim a universal frame-rate improvement. Legacy generic grid capacity remains an abstraction; solar/wind cycles, fuel units and plant costs are game rules. Full incident management, electrical interconnectors, per-region grids, nuclear safety events and weapon development remain future systems.

## Validation

- 226 tests across 38 files, including 18 new checks: fuel/cash conservation, no double uranium use, paused generation, construction limits/completion/refund, shortfalls/recovery, AI/player separation, daily tick integration, save continuity, Turkish dynamic reports and icon collision space.
- TypeScript and production build.
- Chromium: all ten tutorial steps, actual first facility, close-only spotlight geometry, real solar construction/cancellation, resource images, Turkish historical SITREP/profile history, 390 px mobile profile and tutorial reading/closing. No runtime page errors in these flows.

## Run

Stop older Vite servers first; use the port reported by the new server.

```bash
git fetch origin
git checkout dev/powered-world-081
git pull --ff-only origin dev/powered-world-081
npm ci
npm run dev
```

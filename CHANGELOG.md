# Changelog

## 0.86.0-playtest.1 — HD War Playback
Builds on 0.85 HD War v2. No save schema change: battles gain an optional RNG state, and 0.85 saves load unchanged.
- Playback: replaying a round now steps through its recorded action timeline on the board. Groups move one action at a time, and the board shows hit and miss bursts, casualty counts, destroyed groups and depot captures. Controls: play/pause, previous and next step, 1×/2×/4× speed and skip to result. The round log highlights the current step. With reduced motion, playback opens at the result without animation. Playback only reads recorded actions and never resolves combat. Rounds migrated from 0.83/0.84 have no timeline and play as a single before/after step.
- Battle RNG stream: combat rolls in a tactical battle come from the battle's own stream, which starts from its seed and is saved with the battle. World events can no longer change a battle's dice, and a battle no longer consumes the world stream.
- Tactical AI: each group proposes scored options and the AI takes the best ones that fit the command budget, one per group, under the same validator as the player. In order of priority it holds a depot under threat, bombards visible enemies (above all on depots), takes an open depot, contests an enemy-held depot, then advances.
- Known limits: effects are glyph and CSS animations, not sprites or 3D. Simultaneous actions play one after another in a fixed order (attacker orders, defender orders, then losses and captures). The AI still plans one round at a time without a multi-round plan. AI countries still never declare war (B9/E1). Phase 2 items remain open.

## 0.85.0-playtest.1 — HD War v2
Phase 3 of the [0.83 audit](docs/AUDIT-0.83.md) (HD War foundation) plus the first Phase 2 economy item. Save schema 17: 0.84 saves (schema 16) migrate automatically, and an open 6×6 battle keeps its board, units and recorded rounds.
- Battlefield: new tactical battles use a 10×8 board with five force groups per side (two infantry, two armor, one artillery) and two supply depots. Terrain comes from a battle seed and, like deployment and the depots, is point-symmetric through the board centre, so neither side starts on better ground. The two deployment columns on each edge stay open.
- Depots (audit B5): a side holds a depot only while one of its groups stands on it and no enemy group is adjacent. Reaching a depot first no longer locks it for the rest of the battle. Each held depot adds combat power; the map marks friendly and enemy holders.
- Position matters: groups in contact with the enemy (adjacent, or within three sectors for artillery) count fully; groups far from the fighting add less power and take fewer losses. Campaign losses are split across a side's groups, with groups in contact taking a double share and bombarded groups half again. National and group losses stay reconciled.
- Action timeline: every resolved round records moves, blocked moves, holds, recon, bombardment hits and misses, casualties per group, destroyed groups and depot captures. The round result shows this log. Future playback and animation will read these records and cannot reroll combat.
- Auto-resolve parity (audit B8): auto-resolve and legacy assaults commit the same 25% of national forces per round as a tactical battle. Losses per round are on the same scale in both modes, so auto-resolved wars now last several times more rounds than in 0.84 and use proportionally less fuel per round.
- Reliability: error boundaries at the app root and around HD War. A render error now shows its message with Try again and Return/Reload actions instead of a blank page.
- Economy (audit C4, first part): debt now carries interest (3% a year plus up to 5% by debt-to-GDP leverage). Tax rates above 25% dampen productive growth by 1% per point, down to 70% of normal growth.
- Saves: tactical validation checks every sector reference against the battle's own grid and reconciles group losses per role. The validator also accepts the numbered group ids of v2 battles.
- Known limits: the battle seed drives terrain only; combat rolls still use the shared world RNG stream. The round log is text; animated playback is not built yet. The AI moves greedily toward the nearest open depot and does not yet coordinate groups. AI countries still never declare war, so the player-as-defender path (B9) is only covered by unit tests. The C4 activity-repetition limit and the remaining Phase 2 items are still open. The blank page reported in a 0.84 StackBlitz preview was not reproduced; if it recurs, the new boundary shows the error text to report.

## 0.84.0-playtest.1 — Stable Command
Stabilization release driven by the full 0.83 audit ([docs/AUDIT-0.83.md](docs/AUDIT-0.83.md)). No new save schema: added fields are optional and schema-16 saves load unchanged.
- World balance: oil shortage is now measured in days of reserve, counting contracted imports and exports, and consumption scales with economic size. Food output has a per-capita floor just below consumption, so populous states are mild food importers instead of starving. Infrastructure and small-economy facility upkeep scale with GDP. AI importers pick the most urgent need not already covered by a deal, add a second supplier when one deal does not close the gap, and spread purchases across sellers. AI countries in a deep power outage can build up to three plants at once.
- Four years with no player actions, 0.83 → 0.84: AI median approval 0 → 75; bottom-decile AI approval 0 → 64; countries in oil shortage 184 → 10; countries with treasury below $1B 144 → 28; China 0 → 81; India 0 → 55.
- A passive player still loses, because the player must secure oil imports. One trade pact plus one oil import keeps a default campaign healthy through its first election.
- Politics: stability drifts toward a target driven by approval, cohesion and ministry support, instead of climbing while approval collapses. Events use a seeded pressure-weighted pick with a 60-day per-kind cooldown, so earthquakes, inflation and health events now occur. War weariness requires an active war. The food crisis fires ahead of the shortage threshold. Unknown or unaffordable event options are refused.
- World and AI: Global Council sanctions expire after 365 days. A ceasefire needs an active war, and humanitarian-aid support depends on relations. AI no longer signs trade pacts with the player without consent, no longer piles every import onto one seller, and no longer runs a random tax walk; its stabilize goal now lowers tax. Occupation records reset when control ends. Iron/uranium advice no longer shares the inflation suppression key. Productivity has one cap of 100.
- War: holding still no longer wins. Defender base exhaustion only accrues under attack, and victory requires an attacking round. Collapse thresholds use war-start strength, so tiny militaries no longer fall in round one. War cannot be declared on annexed or controlled states. Legacy assaults respect pending national decisions. Missed bombards no longer penalise the target. The HD War button no longer logs a spurious "auto assault halted".
- Commands: non-finite numeric command fields are rejected (e.g. a NaN tax rate). Multi-year industrial orders are now recognised as applied and deduplicated.
- Saves: autosaves are per campaign, keeping the newest 5 per account, so a new campaign no longer overwrites the previous one. Saves are validated before writing. StrictMode no longer makes every autosave fail once. The game flushes a save when the tab is hidden or closed.
- Performance: the industrial tick no longer copies the world map per facility, and exchange prices are computed once per AI market pass. Median headless tick time is about 66 ms → 19 ms. The app shell subscribes only to the player's ISO code, the world map is memoized and no longer remounts every path on drag, and economic charts update in place.
- UI and language: the integration review no longer opens hidden behind its overlay, which had left the game paused. The map shows a retry when country data fails to load. The page `lang` follows the chosen language. Victory quotes show a translation to non-Turkish players. Machine-translation artefacts were removed from es/zh/ru/tr (HTML entities, subtitle markup, nonsense phrases, repeated words), and a regression test guards them.
- Repository: about 3.0 MB of unreferenced assets removed from `public/`, stale `dist/` untracked, `CLAUDE.md` working rules added, and new regression suites (war, economy, politics, persistence, i18n artefacts, integration) plus a 365-day long-run invariant test.
- Known limits: a player who signs one oil import climbs steadily to about 95% approval over four years, so tax, activity and debt pressure still need tuning (audit C4, Phase 2). The tactical depot can still be locked by whichever side reaches it first (B5, planned for HD War v2). Auto-resolve and tactical combat still use different loss scaling (B8).

## 0.83.0-playtest.3 — Guided Play
- Rebuilt README around the current release, added recent patch summaries and retained milestone history, removed obsolete 0.40 run/save instructions, and documented the per-release update checklist.
- Added sign-in/create-account screens, random math checks and account-free Demo entry. Local demo profiles use salted password hashes; online identity/email verification is explicitly not connected.
- Added a New game/Continue menu with compatible-save detection, device-local account save namespaces and legacy guest-save continuity. Paused/unmounted the campaign behind entry screens and preserved autosave ownership.
- Added guided tactical plan handoff and round-result choices for next turn, replay, withdrawal or map. Next turn advances one campaign day and directs blocked players to national decisions; combat remains simultaneous and deduplicated.
- Updated tactical cards, status guidance and scrollbar presentation for desktop/mobile. Added multi-action shared dialogs.
- Added shared bounded image retries with recovery on focus/online and a manual retry control. Extracted existing leader/cover WebP pixels from SVG wrappers without changing the artwork.
- Added all five language labels for entry, validation and guided turns; added local-account, image-recovery and guided-turn regressions.

## 0.83.0-playtest.2 — Clear Command
- Separated pending diplomatic letters from a persistent history tab; accepted/rejected outcomes use green/red borders and explicit status labels. Existing resolved records move automatically without save migration.
- Fixed supply icons overlapping stock totals, localized supplier captions and aligned supply/advisor trade eligibility with the shared 20/100 trust rule.
- Strengthened the game-speed control, centered single-action receipt/profile footers, and added subject artwork to shared reviews/results.
- Added paper/pen signing presentation to recurring supply contract receipts, clearer monthly-payment/cancellation terms and translated whole duration labels. Existing delivery and billing rules remain authoritative.
- Completed static translation gaps across Turkish, Spanish, Chinese and Russian, added cross-language dynamic news templates and value-safe formatting, preserved existing translations, and reviewed key contract/credit/energy/history wording. Simplified selected English explanations. No online translator or model is shipped.
- Added placeholder/news regressions and production-browser checks for five-language history, supply geometry, stronger speed text and desktop/mobile contract receipts with reduced motion.

## 0.83.0-playtest.1 — Tactical Command
- Added a playable 6×6 battlefield with allocated infantry/armor/artillery groups, a three-point command budget, fuel reviews and simultaneous AI orders under the same validator.
- Added movement/path/visibility constraints, recon, terrain defense, forward flanking, prepared reserves, targeted artillery and a supply depot objective. Existing national strength, supply, exhaustion and victory rules remain authoritative.
- Routed tactical auto assault through the same engine and retained up to 60 round events for movement replay without repeated casualties or new RNG draws.
- Added schema-16 save migration and deep validation for tactical groups/events and economic history; kept existing reviewed-command deduplication and one-round-per-day safeguards.
- Added up to 180 actual national economic observations, lazy Chart.js GDP/treasury/inflation/net-change charts, range controls and an accessible data table.
- Added responsive keyboard/touch controls, reduced motion, Turkish feedback/help and explicit defender-withdrawal consequences. Preserved old war records when redeclaring on the same day.
- Deferred PixiJS/3D rendering until measured need; V3 remains the later complete-playability milestone.

## 0.82.0-playtest.6 — Credit feedback and trade trust
- Unified market filter labels; credit reviews now share engine validation, show cash/GDP/offer limits and quantified shortfall, and offer an affordable lending amount.
- Stopped strategic confirmation from overwriting command receipts or treating a posted diplomatic letter as a failed action.
- Tutorial spotlights reveal controls clipped by scrolling windows, including the World panel close button.
- Above 50/100 relations now read Good; eligible trade acceptance rises at that threshold. Trade requests below 20/100 explain the missing trust and missions/aid needed to improve it.
- Active pacts below 20/100 receive a saved 14-day recovery period, player warnings and bilateral shipment cancellation if trust stays low. Restoring 20 clears the risk.
- Added acceptance estimates, points-to-Good, clearer rejection reasons and Turkish feedback/news coverage.
- Updated the HD War roadmap for a bounded turn-based tactical slice; the battlefield is not enabled and no rendering dependency is added.

## 0.82.0-playtest.5 — Nation setup polish
- Matched nation preview, statistics, opening profile, confirmation cards and inactive steps to the charcoal/gold onboarding palette.
- Added localized, accent-insensitive country search with English names and country-code aliases, localized sorting, empty-result feedback and clear search.
- Added accessible search naming and selected-country button states.

## 0.82.0-playtest.4 — Tutorial, proposal tracking and artwork hotfix
- Reserved a compact bottom tutorial area; shortened open windows and review dialogs to keep close controls and content clear. Separated acknowledgement and navigation buttons.
- Added sent/received proposal filters, pending/retry status and inline help. Both inbox and country diplomacy detect pending, incoming, active and cooldown proposals before reopening confirmation.
- Shared proposal availability with engine command receipts; no repeated proposal or fee while pending. Clarified that outgoing fees apply only on acceptance.
- Served the existing resource/civic/navigation atlas pixels as native WebP instead of nested SVG images; added a visible load-failure fallback.
- Extended browser regressions for tutorial controls, proposal retries and loaded supply/world artwork.

## 0.82.0-playtest.3 — UI hotfix
- Reserved explicit setup navigation and save-tool rows so Continue cannot spill below the footer.
- Put navigation rails behind national/floating windows, keeping tutorial construction targets clickable.
- Rebuilt the map dock with an integrated close header and a bounded scrolling body.
- Removed the forced profile footer background and let full campaign dates wrap.
- Added browser checks for unclipped setup buttons, window hit-testing and plain profile footer surfaces.

## 0.82.0-playtest.2 — Onboarding layout patch
- Fixed the setup frame dimensions across steps and language changes.
- Matched country-list scrollbars to portrait selection and bounded desktop list height.
- Kept national summary information visible with a compact responsive layout.
- Fixed selected nation secondary-text contrast and added a visible setup release identifier.

## 0.82.0-playtest.1 — Reliable Command
- Added validated schema-15 save migration, compatible-record fallback, retryable autosave and direct setup loading.
- Routed reviewed commands through bounded persisted confirmation identities and retained tutorial construction identity.
- Added daily research work, campus capacity, shared AI rules, completion effects and unfinished-work refunds.
- Added 200 dated NEWS reports with Turkish historical rendering.
- Added player-country location beside zoom, resource-specific supply popups and Buy actions; removed the duplicated national supply board.
- Moved Goals right and grouped Map/Help bottom-right; fixed Help pressed state and added colored civic/diplomacy/world artwork.
- Split heavy UI modules, narrowed panel subscriptions and added production-browser regression coverage. See docs/PLAYTEST-082.md for verification and remaining debt.

## 0.76.0-playtest.1 — Decisions & World Institutions
- Added factory investment review, before/after capacity, input/power/upkeep previews and timed construction cancellation with an explicit partial refund.
- Added advisor pact/contract review, locked-price monthly payment summaries, duplicate contract protection, diplomatic settlement checks and visible command receipts.
- Added actionable Low Relations explanations and direct diplomacy navigation, plus infrastructure investment review.
- Generated a 25-tile resource/industry/military illustration atlas and integrated colorful thumbnails across market, supply and equipment views.
- Fixed geographic surface delivery/rendering using a local embedded satellite SVG and standard image layer with visible terrain fallback; added continuous-score Relations map colors.
- Added persistent ten-step English/Turkish onboarding, context navigation and HELP replay.
- Added simulated UN/WHO/Security Council applications, achievement gates, five-day member votes, membership benefits and public diplomacy research.
- Added attack debates, player voting, AI ballots and condemnation when a rejected attack proceeds, including attacks begun while voting is open.
- Added probabilistic voluntary religious outreach, small normalized demographic shifts and target cooldowns.
- Migrated campaign schema 12/13 to 14; verified 133 tests, production build and browser flows. See docs/PLAYTEST-076.md.

## 0.75.0-playtest.1 — Open Command
- Replaced the full-width HUD with floating commander/indicator and date/speed islands.
- Added a lighter slate interface, softer vignette, brighter geographic surface, responsive layouts and shared supporting surfaces.
- Added explicit amber open/selected states, accessible pressed states, shorter rail labels and a national-panel close control.
- Generated and bundled 20 realistic painted leader portraits in four cosmetic clothing styles, with filters in onboarding and the existing profile picker. Stable portrait IDs retain save compatibility.
- Normalized wheel/trackpad input, coalesced camera updates per frame, anchored flat zoom to the cursor, bounded panning and expanded zoom limits.
- Added persistent local zoom-speed preference and always-available camera controls.
- Verified 113 tests, production build and browser interactions/layouts. See docs/PLAYTEST-075.md.

## 0.74.0-playtest.1 — Industry & Living Diplomacy
- Fixed active national-command tab contrast; selected text stays readable on a dark active surface.
- Refreshed all 20 bundled vector portraits with shaded faces, tailored clothing and more detailed features.
- Added citizenship independent of the commanded nation and optional validated date of birth in onboarding and profile settings.
- Added a persistent UTC campaign calendar beginning 1 January 2026, shown in the HUD.
- Added once-per-year birthdays: approval >=65 and stability >=50 grant +12% agricultural/industrial production for seven days.
- Friends and rivals send deterministic birthday and performance correspondence to the diplomatic inbox, with read state and bounded message history.
- Added 13 industrial-market goods alongside the original four commodities: fresh water, coal, copper, silicon, aluminum, rare earths, rubber, armor plates, engines, electronics, steel, fuel and armored vehicles.
- Added supply/demand prices, stock-protected imports/exports, real treasury settlement and 1/3/5/10-year monthly supply contracts with locked unit prices, failed-delivery tracking and diplomatic restrictions.
- Defense exports require both a trade pact and an alliance; traded armored vehicles transfer real military equipment reserves.
- Added national water/resource potential, finite mineral deposits, eleven investable facilities, construction queues, operating costs, pause/resume and actual input bottlenecks.
- Industrial parks add five factories and a refinery; mines and waterworks grow production; factories consume metals, fuel and power to create components.
- Tank production now consumes two armor plates, one engine and one electronics module per vehicle, with existing steel/fuel/power needs and a research prerequisite. Imported components can satisfy assembly needs.
- Expanded the existing research tree to seventeen programs and exposed prerequisite connections in a grouped development interface.
- AI nations research, invest and trade through the same industrial systems without flooding the player's reports.
- Geographic view uses a bundled NASA Blue Marble surface, reprojected for Globe/Flat while retaining sovereign selection and map labels.
- Save schema v13; existing v12 campaigns migrate automatically, retaining equipment, infrastructure, wars and prior systems.

## 0.73.1-playtest.2 — Cartography & Decision Review Follow-up
- High-impact decisions (war, alliance, embargo, bloc, treasury/resource aid) always require confirmation, including with stale skip preferences.
- Added Escape cancellation, dialog semantics, keyboard focus containment/restoration and duplicate-confirm protection.
- Added exact resource shipment/reserve and bloc establishment cost previews; bloc buttons expose actual prerequisites.
- Repeated treaty commands no longer charge treasury or grant goodwill twice.
- Visible microstate targets take precedence over neighboring simplified polygons; hidden markers cannot intercept clicks.
- Focus uses registered microstate positions even without polygons; added Luxembourg, Qatar, Cyprus and Brunei anchors.
- Microstate labels now share country/ocean collision suppression; selected edge labels stay within the map.
- Added 85–140% map label sizing; label priority now uses projected land area rather than bounding rectangles.
- Corrected click coordinates on letterboxed SVGs, flat-map drag distance at higher zoom, and zoom centering after focus.
- Removed duplicate React shape/label keys for multipart sovereign profiles.
- Cached projected geometry to avoid recomputing paths on hover and simulation ticks.
- Repaired missing optional dependency lock entries for clean npm ci installations.
- Save schema remains v12; 0.73 campaigns remain compatible.

## 0.73.1-playtest.1 — Cartography & Interaction Stabilization
- Rebuilt country labeling into a collision-aware screen-space cartography engine instead of scaling text with map geometry
- Flat-map zoom no longer magnifies country names into unreadable giant labels
- Added priority-based label placement using projected country area, player/selected/hover priority and population weight
- Added progressive zoom thresholds and maximum visible-label budgets; large states appear first and smaller states reveal as the player zooms in
- Selected-country labels are forced through collision resolution and displace lower-priority labels
- Ocean/sea labels now participate in the same decluttering pass instead of freely overlapping country labels
- Added non-scaling map borders for calmer Flat projection zoom behavior
- Corrected invalid [0,0] microstate coordinates for Andorra, Micronesia, Sao Tome and Principe, and Vatican City
- Microstates now use screen-pixel hit testing with enlarged click targets, making tiny states and island countries selectable without giant fake geometry
- Added regression tests preventing zero-coordinate microstates from returning
- Rebuilt left command rail sizing/alignment so long labels such as RESOURCES remain centered and do not spill out of buttons
- Added category color language to right information rail and diplomatic action icons
- Added shared Strategic Decision confirmation framework for diplomatic missions, embassies, trade pacts, non-aggression pacts, alliances, embargoes, strategic blocs, treasury aid, resource aid and war declarations
- Strategic Decision modal includes national flags, themed visual emblem, treasury/relationship/strategic impacts and contextual warnings
- Trade-pact previews explicitly warn when hostile rivals may react negatively
- High-impact decision modals pause the simulation and resume the player's previous speed when closed
- Added optional per-action 'automatically approve similar decisions this session' behavior; preference applies only after the current action is confirmed
- Added relationship gating directly to Trade Pact, Non-Aggression and Alliance buttons instead of allowing a doomed confirmation flow
- Resource supplier PACT shortcuts now use the same confirmation framework and expose low-relationship gating
- War declarations now require a consequence preview showing relationship collapse, reputation loss and trade cancellation
- Added another targeted typography debt sweep across diplomacy, advisor, event, command-window, supply and floating-tool interactive text
- Save schema remains v12; existing 0.73 campaigns remain compatible
- Added dedicated cartography, microstate and strategic-decision regression tests

## 0.73.0-playtest.1 — Command Architecture & Logistics Foundation
- Rebuilt the strategic HUD around a governance-first command hierarchy
- Top HUD now prioritizes Treasury, strategic Budget/Day, Approval and Stability; raw resource clutter moved into a dedicated Resources command window
- Budget/Day now includes infrastructure maintenance and production operating costs in addition to the base economy forecast
- Added left-rail MAP and RESOURCES command tools; map controls no longer float permanently over the map
- Removed the legacy bottom-right MAP trigger and consolidated Layers, Political/Geographic, Globe/Flat, Zoom, Focus and Reset inside the left MAP command
- Added Strategic Resources command window with reserve days, self-sufficiency, best suppliers and direct Pact/Import actions
- Added persistent national infrastructure state for every country: Roads, Rail, Ports and Supply Hubs
- Added infrastructure maintenance, degradation when underfunded, player investments and monthly AI investment behavior
- Connected infrastructure throughput directly to Supply Command and warfare supply calculations
- Expanded Supply Command with an Infrastructure tab, national throughput, bottleneck, maintenance and investable network assets
- Added colored visual language for Overview/Economy/Production/Diplomacy/Military/Intel/Cabinet/Tech/World/War icons and active states
- Enlarged and upgraded campaign nation-selection rows for readable country name, flag, region/regime and capability data
- Increased readability floors in dense Intel, Cabinet, Tech and World UI surfaces
- World Command footer now reports player map layer, presentation and Globe/Flat projection state
- Save schema bumped to v12 for infrastructure persistence
- Added infrastructure tests covering initialization, treasury cost, maintenance, supply impact, warfare impact and silent AI investment
- 0.73 is intentionally a broad foundation build; next step should be one focused hotfix/playtest pass before additional major systems

## 0.72.1-playtest.1 — Strategic UI / Map Readability
- Increased sovereign country-label readability with zoom-aware 11–14px sizing and stronger map contrast
- Increased selected-country label prominence while keeping dense regions controlled with revised reveal thresholds
- Removed the redundant bottom-center PLAYER / map-state chip from the map surface
- Moved player/map-state context into the right side of the WORLD COMMAND CHANNEL / SITREP footer
- Reworked National Command into a viewport-safe panel with maximum height, internal vertical scrolling and no horizontal overflow
- Widened National Command on desktop so Production, Diplomacy and War content have more breathing room
- Rebalanced the ten country tabs into a 4+4+2 layout; WORLD and WAR are centered instead of being pushed to the far-right edge
- Strengthened Declare War and operational-assessment wrapping so long country names and war content remain inside the panel
- Repositioned strategic map modes into a compact bottom-left MAP LAYERS command card inspired by clearer grand-strategy HUD hierarchy
- Map Layers now uses grouped 2-column controls and retains the current selection notice without occupying the top-left map surface
- Adjusted right command rail spacing to track the wider National Command panel
- No save-schema change; schema v11 remains compatible with 0.72 campaigns

## 0.72.0-playtest.1 — Production / Industry & Equipment
- Added persistent national production state for every sovereign country
- Added six equipment classes: infantry equipment, artillery, armor, fighters, logistics equipment and naval equipment
- Added deterministic daily production lines with factory allocation, efficiency growth/decay and daily output
- Manufacturing consumes real steel, fuel, electricity and treasury inputs
- Added throughput and bottleneck detection for steel, fuel, electricity, treasury and factory capacity
- Added military-factory share policy (25–80% of usable factories)
- Added strategic equipment stockpiles and deployment actions that reinforce active military forces
- Added Production tab to National Command with stockpiles, production lines, inputs, efficiency and factory controls
- Added AI production allocation; AI countries rebalance factories every 14 days according to strategic goals
- Connected strategic equipment reserves to warfare combat sustainment
- Added production reserve score to reflect the depth of national replacement capacity
- Save schema bumped to v11 for persistent production state
- Added dedicated production tests covering throughput, shortages, factory caps, deployment, reserve effects and AI allocation

## 0.71.1-playtest.1 — Commander UX
- Moved SAVE / LOAD / NEW out of the permanent top HUD and into a commander campaign-options center
- Clicking the top-left commander portrait now opens Commander & Campaign options instead of immediately showing avatar presets
- Added commander identity card, nation flag, campaign day, speed, treasury and GDP summary to the options center
- Added manual Save, Load Latest and New Campaign actions inside the options center
- Added confirmation guard before starting a new campaign
- Rebuilt avatar editing as a separate viewport-safe portal with portrait preview and explicit APPLY PORTRAIT action
- Avatar selection no longer changes instantly on first click
- Fixed profile/avatar modal clipping with viewport max-height, internal scrolling and responsive layouts
- Simplified the permanent top HUD so speed controls and national identity have more breathing room
- Kept 0.72 reserved for the upcoming Production / Industry & Equipment major build

## 0.71.0-playtest.1
- Added Living Diplomacy foundation with persistent embassy missions and incoming diplomatic offers
- Added player and AI embassy creation; embassies improve relationship growth and reduce bilateral trade friction
- Added Diplomatic Inbox rail with embassy/trade proposals and accept/decline actions
- Reworked domestic events into pressure-based weekly agenda checks instead of frequent random popup rolls
- Added earthquake, public-health, tax-protest, reform-demand and foreign-policy backlash event categories
- Added variable post-event cooldowns so campaigns can have quiet periods or clustered political pressure
- Added zoom-aware country labels for sovereign states; smaller countries reveal progressively with zoom
- Added national flags to observed-country command cards
- Added unified line icons to country-panel tabs and diplomatic actions
- Completed another readability sweep across advisor, alert, event, map and floating-window microcopy
- Save schema bumped to v10 for embassies and diplomatic-offer persistence

## 0.70.0-playtest.1
- Standardized UI typography with reusable readable font scales
- Portaled Strategic Dossier and Supply Command above panel clipping and stacking contexts
- Rebuilt campaign setup as a four-step wizard: name/language, portrait, nation, final confirmation
- Added animated command-transfer / first-day-in-office transition before campaign start
- Added MA3-style 0–100 Relationship Index and stance bands
- Added treasury grants and strategic resource aid as bilateral goodwill actions
- Trade pacts and successful trade deliveries now improve bilateral relations
- Cooperation with a country’s hostile rival can damage third-party relations
- Added dedicated diplomacy panel with relation meter, treaty context, aid tools and trade flows
- Expanded typography/readability across dense HUD, panel, rail and modal surfaces

## 0.62.0-playtest.1
- Replaced fragile event image URLs with bundled inline SVG event illustrations
- Added unique visual scenes for food, inflation, war weariness, corruption, fuel and intelligence crises
- Increased global HUD and national-command typography for readability
- Replaced tiny bottom-left market, pulse and objectives ribbons with left/right command rails
- Added badge-driven Objectives, Market, World Pulse, Resource Alerts and SITREP tools
- Added persistent draggable command windows that remain open until dismissed
- Added larger event decision cards and consequence text
- Preserved 0.61 map dock, ocean labels and open-water deselection

## 0.61.0-playtest.1
- Enlarged Strategic Objectives panel for practical playtest readability
- Moved Political/Geographic, Globe/Flat, zoom, focus and reset controls into a MAP popover docked to SITREP
- Clicking open water now clears country selection
- National Command panel disappears when no sovereign state is selected
- Added dark navy ocean treatment with softer globe graticule
- Added contextual labels for oceans and regional seas
- Preserved sovereign surface selection and expanded map zoom controls

## 0.60.0-playtest.1
- Added campaign onboarding: commander name, 20 leader portraits, language and country selection
- Added English, Turkish, Spanish, Chinese and Russian core UI localization
- Added player avatar editing from the top-left HUD
- Added national flag identity and country-driven UI accent themes
- Added political/geographic base-map presentation modes
- Added geographic biome textures for plains, forest, desert, mountain, urban and coastal terrain
- Expanded globe and flat-map zoom ranges, plus +/- and focus controls
- Added preferred-speed memory so event/advisor pauses resume the player's last speed
- Added adaptive resource advisor with friendly supplier recommendations
- Added 1/3/5/10-year fixed-price monthly supply contracts
- Bumped save schema to v9

## 0.50.1-playtest.2
- Added geometry-based sovereign territory selection instead of marker-first selection
- Reduced microstate debug labels; full names reveal only on hover/select/high zoom
- Added Strategic Dossier command window with radar visualization
- Added Supply Command window with flow network, reserves and front logistics views
- Unified warfare supply calculation with the national supply network model
- Increased national command panel typography and information density

## 0.50.0-playtest.1
- Promoted Living World branch to the first integrated playtest build
- Added in-game playtest objectives with live completion tracking
- Added World Pulse HUD and autonomous AI-to-AI diplomacy
- CI release gate green after gameplay, performance and build checks

## 0.40.0
- Added Cabinet ministries and daily ministry effects
- Added Technology Tree v1 and research-point economy
- Added processed fuel, steel and electricity
- Switched combat logistics from raw oil to fuel
- Added Alliance Bloc v1
- Added Global Council v1
- Added Visual Pack 1 and ministry artwork
- Added Foundation Pack 1 documentation and schema-v7 save guard

## 0.31.0
- Strategic resource specialization and dynamic market
- Flat map pan/zoom and 5× clock speed
- First command-interface visual pass

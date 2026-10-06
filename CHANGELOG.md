# Changelog

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

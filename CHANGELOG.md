# Changelog

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

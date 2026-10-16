# Rule of Nations (RON): Living Master Roadmap & Track Record

Last Updated: 2026-10-16
Status: Active Living Record
Working Directory: /Users/alpy/.gemini/antigravity/scratch/gamev2
Active Branch: dev/ron-phase9
Current HEAD Commit: 19404cd
Baseline Verification: 144/144 test files passed (1,663 unit tests passed, 0 failures, 1 expected seed invariant, tsc --noEmit clean with 0 errors, Vite build in 564 ms, Playwright 26/26 passed)
Bundle Baseline: ~946.9 kB gzip (JS) + 88.3 kB gzip (CSS)

---

## 1. Operating Pipeline & 4-Tier Team Architecture

Rule of Nations is a high-fidelity web grand strategy game simulating geopolitics, living macroeconomics, military logistics, diplomacy, and global intelligence. It is built on React 19, TypeScript, Vite, KaTeX, and modern semantic CSS.

The project operates under a strictly coordinated 4-tier pipeline:

1. Producer & Lead Game Designer: Alper
- Sets creative vision, aesthetic standards, historical priorities, and conducts hands-on browser playtests.
- Gives final go/no-go approval on visual and mechanical changes.

2. System Architect & UX Director: Claude Opus
- Operates in dedicated architecture sessions.
- Authors comprehensive system blueprints (such as docs/PHASE9.4-BLUEPRINT.md) and state machine specifications without burning context on iterative coding.

3. Core Implementer: Claude Sonnet
- Executes code changes on branch dev/ron-phase9.
- Refactors components, updates CSS styles, ensures localization completeness, and keeps CI checks green.

4. Local Pair Programmer & QA Auditor: Antigravity (YOU)
- Operates locally on Alper's Mac in /Users/alpy/.gemini/antigravity/scratch/gamev2.
- Audits git commits, executes npm run check, monitors bundle size, manages the dev server.
- Drafts airtight technical prompts for Sonnet and Opus without bold asterisks.
- Maintains this living record across sessions and transitions.

---

## 2. Non-Negotiable Core Invariants

Whenever proposing, verifying, or drafting tasks, these invariants must be enforced without exception:

1. 120-Day Deterministic Engine Trajectory Hash Invariant:
- The core simulation engine trajectory hash must NEVER change unless an explicit re-baseline is approved.
- Menus, modals, sound, quotes, and visuals must never touch or consume the engine RNG or simulation tick math.
- Engine and simulation directories are strictly read-only for UI phases.

2. Strict 5-Language Localization Invariant:
- Every user-facing label, button, modal text, and receipt metric must support all 5 localized languages:
  English (en), Turkish (tr), Spanish (es), Chinese (zh), and Russian (ru).
- No temporary English fallbacks in production merges.

3. Phase 7 Semantic Dual-Theme Fidelity:
- The game supports both dark and light modes via semantic tokens:
  - Dark Slate/Navy: --surface: #0e2035, --surface-raised: #182e46, --ink: #eef3f8, --border: #526c86
  - Light Cream/Ivory: --surface: #fffdf7, --surface-raised: #f3efe5, --ink: #142c46, --border: #8192a1, gold accents #d4af37
- Never allow unreadable text contrasts (e.g. white or pale gold text on cream surfaces).

4. Bundle Size Budget:
- Gzip bundle size is tightly tracked (~991.5 kB gzip baseline).
- Phase 9.4 delta cap is +25 kB gzip (target under +15 kB).
- No new runtime dependencies. No heavy raster art in JS bundles.

5. Strictly No Bold Asterisks in Prompts:
- All prompts and instructions prepared for Claude Sonnet or Claude Opus must NEVER contain double asterisks.
- Keep formatting clean, using backticks, capitalization, and dashes.

6. Dev Server Policy:
- Do NOT start the localhost dev server (npm run dev) automatically.
- Keep background tasks clear and launch the server ONLY when Alper explicitly requests to playtest.

---

## 3. History of Recent Work: Playtests 1.1 Through 1.4

All playtest hotfixes are merged, committed, and fully verified on origin/dev/ron-phase9:

### Playtest 1.1 (Commit 6220ed9)
- Separated Alliances into its own dedicated workspace (ExecutiveWorkspaceShell) with custom crest icon.
- Fixed stuck focus outlines on Country Panel tabs after mouse clicks.
- Repositioned Tactical Hint beacon (?) and docked map HUD camera zoom controls.
- Corrected light-theme contrast on research campus cards, development summaries, and event buttons.

### Playtest 1.2 (Commits ab7217e -> 4f77abf)
- Critical Crash Fix: Resolved React Hook Violation crash in src/ui/panels/TradeDesk.tsx caused by conditional useState calls.
- Replaced fixed trade suggested quantities with an interactive quantity stepper respecting seller surplus and buyer treasury.
- Lowered foreign embassy exchange cost from $3.0B to realistic $0.05B ($50M).
- Added out-of-stock and embargo explanations for commodity purchases.

### Playtest 1.3 (Commits ce49a74 -> e1a4622)
- Docked Hint Beacon: Grouped the ? beacon in ExecutiveWorkspaceShell.tsx into a right-aligned flex container alongside [x].
- Country Panel Solid Title Bar: Adjusted .command-panel > .national-panel-heading to span flush edge-to-edge as a solid pinned window title bar.
- 14 Original Symbolic Vector Emblems: Populated src/ui/icons/OrganizationIcons.tsx with 14 legal, original vector emblems (UN, NATO, CSTO, SCO, EU, OPEC, IMF, World Bank, WTO, G20, WEF, ASEAN, OIC, BRICS) avoiding restricted trademark issues, set in a responsive 4-5 column grid.
- 3-Column Open Exchange: Reorganized OpenExchange.tsx so Buy, Sell, and Central-Bank Gold Vault sit in three side-by-side balanced columns.
- 4-Tab Sovereign Credit: Restructured credit navigation into 4 distinct segmented tabs with hint popover.
- Diplomatic Inbox Dashboard: Relocated message/embassy widgets to the top of DiplomaticPost.tsx in a 3-box dashboard with [x Decline] and [v Accept] action icons.

### Playtest 1.5 (Commits 4dbb1bc -> 919ac4e)
- Top-Centered Language Selector: Relocated language selector to top center with elegant localized "Language" label and wavy national flags (🇬🇧, 🇹🇷, 🇪🇸, 🇨🇳, 🇷🇺) with golden yaldiz glow on hover.
- Landing Screen Action Cards: Removed duplicate left Continue Campaign button; added distinct New Campaign and Historical Scenarios action cards; removed underlined text links above wisdom quote.
- Simplified Leadership Wisdom Widget: Removed media-player style Pause quotes and Next quote buttons; wisdom quotes now display as clean, dignified presidential aphorisms.
- Single-Line Title & Auto-Scaling Wallpaper: Locked Rule of Nations title to a single line with responsive clamp scaling; integrated full-bleed cinematic grand strategy backdrop (landing-backdrop.jpg) with dual-theme protective vignettes.
- Setup Wizard Step 1 Header: Removed RON fake circular badge and text overlay from poster art; elevated Rule of Nations to an elegant gold brand heading above Choose your portrait; stripped 1.0.0 version string.
- Setup Wizard Step 3 Leader & Flag Integration: Displayed selected leader portrait thumbnail directly alongside national flag; formatted opening profile stats as clean, capitalized status chips (Opening Profile, Sovereign Stance, Dominant Faith).
- Executive Desk Proportions: Constrained maximum width to 780px with balanced internal padding and centered, bordered empty states.
- Alliances Roster Equal-Height Grid: Normalized organization card heights, aligned metrics grid across cards, pinned action buttons to bottom via margin-top: auto, and upgraded alliance insignia to distinct colored emblems (NATO, CSTO, SCO, UN, IMF, World Bank, OPEC, G20).
- Title Case Headers & Arms Transfer Clarity: Strictly enforced Title Case across modal headers and tabs; added contextual subheader for sovereign military hardware aid and defense transfers with full 5-language localization.
### Playtest 1.6 (Commits 671cfb4 -> 13dcc45)
- Landing Action Cards & Artwork: Mapped action cards to dedicated artwork (/assets/command/card-new-campaign.jpg, card-scenarios.jpg, card-profile.jpg); muted at rest with smooth transition to full-color vivid saturation, lift, and golden glow on hover.
- Player Profile B1 Rewording: Renamed Commander Dossier to Player Profile (localized across en, tr, es, zh, ru).
- 4-Card Equal Height Row: Aligned the Last Campaign summary card in the same unified row with the 3 action cards, sharing identical height and responsive grid step-down (4 columns -> 2 -> 1).
- Centered Footer & Trademark: Centered device save notice with legal line: "RON Interactive © 2026. All rights reserved."
- Framed Leadership Wisdom Box: Removed left rule; encased quote in a centered translucent dark frame with fixed height and adaptive font sizing that prevents layout shifting.
- Header Cleanup & Social Sign-In: Removed top-right "Playing as guest" button; added Google, Apple, and Facebook sign-in options in the profile drawer with localized "Coming soon" toasts.
- Tutorial Button Contrast: Styled NEXT button on light theme with dark executive navy (#0e2035) on gold with bold weight, guaranteeing >7:1 contrast.
- Diplomatic Inbox Proportions & Clean Rows: Capped modal at 820px and centered; cleaned up relations assessment into borderless, structured stat rows with soft green (#4ade80 / #166534) and soft red (#f87171 / #991b1b) accents.
- Covert Operations Intelligence Briefing: Replaced generic building with tactical intelligence artwork (/assets/command/intel-espionage.jpg) in a 600px executive briefing card with target nation, operation type, risk rating, intel yield, and live budget deduction.
- Country Info Proportions: Capped modal at 760px and centered for balanced presentation.
### Playtest 1.7 (Commits 94dabf3 -> fea8ef3)
- Centered Brand Header: Centered "Rule of Nations" title and "Be the president you have always dreamed of." on the landing page; stripped "RON GRAND STRATEGY" pill and "v1.0.0" subtitle label.
- Landing 3-Card Row & Full-Width Resume Bar: Structured landing actions into 3 equal-width cards (New Campaign, Historical Scenarios, Player Profile) in a clean top row, with a full-width horizontal resume card below ("Continue with Last Saved Campaign") spanning all 3 cards with flag, leader, date, and Continue action.
- Setup Wizard Atmospheric Backdrop & Narrow Poster: Added graticule and vignette backdrop to CampaignSetup in both themes; normalized left poster column to compact 34% width across all 4 steps, expanding room for configuration controls.
- Tutorial Button Contrast: Enforced dark executive navy (#0e2035) with bold weight (700) on NEXT button in light theme across all states (normal, hover, focus, disabled).
- Top-Left Player Capsule & Clock Tenure Relocation: Relocated "Days in Office: [N]" to top-right clock container beneath campaign calendar date; top-left player capsule now tightly hugs portrait avatar and commander name with 20-character graceful ellipsis truncation.
- Diplomatic Hub Action Buttons Clean Icons: Removed circular/oval clipping borders and backgrounds behind the 8 diplomatic action icons.
### Playtest 1.8 (Commits 01c86a0 -> 19404cd)
- Pinned Fullscreen Wallpaper: Pinned background art to position: fixed; inset: 0; width: 100vw; height: 100vh; background-size: cover; background-attachment: fixed; preventing detachment during scroll.
- Lifted Quote Box & Scaled Title: Lifted leadership quote card higher with breathing room above footer disclaimer; scaled Rule of Nations title to clamp(2.1rem, 4.2vw, 3.2rem).
- Language Selector Relocated to Top-Right: Moved 5-language flag switcher (🇬🇧, 🇹🇷, 🇪🇸, 🇨🇳, 🇷🇺) into the top-right header dock.
- Setup Wizard Kicker Cleanups & Centered Quote: Dropped redundant step subtitles (STEP 01 to STEP 04) and top subtitle; centered leadership quote in right panel; conditioned "System follows device appearance" note strictly to active System preference.
- National Command Permanent Leader Credentials: Compacted modal to 680px; removed editable input fields (change portrait, update identity, country dropdown, birth date); displayed leader credentials as clean, immutable presidential records.
- Alliances Organization Badges in One Row: Aligned Member and Active badges side-by-side in a horizontal row; styled Member in soft green and Non-member in soft amber across dual themes.
- Compact Arms Hardware Transfer Card: Bound hardware transfer section to 680px with clear diplomatic context explaining defense materiel aid and embargo compliance.
- Visual Pack 2 Expansion: Added and committed high-fidelity artworks for Ministry of Economy (ministry-economy.jpg) and Science Directorate (ministry-science.jpg).


---

## 4. Master Strategic Roadmap (Phase 9.4 Through Phase 10.0)

```
[Phase 9.4: Landing & Quotes & Preloader] (COMPLETED 100%)
       │
       ▼
[Phase 9.5: Physical Map Visual Revolution]
       │
       ▼
[Phase 9.6: Multilateral Peace Conference Table]
       │
       ▼
[Phase 9.7: Strategic Uranium Enrichment, Triad & IAEA]
       │
       ▼
[Phase 9.8: Living Parliament, Factions & General Strikes]
       │
       ▼
[Phase 9.9: 60 FPS Web Worker & Supabase Cloud Persistence]
       │
       ▼
[Phase 10.0: Grand Release Candidate, Scenarios & Orchestral Soundtrack]
```

### Phase 9.4: Modern Grand Strategy Landing Screen, Dynamic Leadership Quotes & Preloader Pipeline (COMPLETED 100%)
Objective: Replace administrative login with an immersive grand-strategy entry experience, a 27-entry leadership wisdom engine, and a genuine 5-stage preloading pipeline.
Key Deliverables:
1. AAA Grand Strategy Landing Screen (CampaignEntry / LandingShell):
   - Cinematic cartographic graticule backdrop with atmospheric vignette.
   - Zero-friction Play Now hero button (creates silent guest session, zero credentials or math checks).
   - Rich SaveGameCard showing country flag, leader name, campaign date, Day N, and one-click Continue.
   - Utility dock for 5-language switcher, theme toggle, audio mute, and release notes.
   - Commander Dossier slide-out drawer for local demo account login/registration.
2. Dynamic Leadership Wisdom Engine (leadershipQuotes / LeadershipWisdomWidget):
   - 27 curated timeless historical quotes from 23 world leaders (Marcus Aurelius, Sun Tzu, Atatürk, Lincoln, Churchill, Machiavelli, Bismarck, Mandela, etc.).
   - Pure context-aware selection weighting by national ideology and war status.
   - 18s smooth cross-fade rotation, pause/resume WCAG controls, upright CJK typography, and localized author metadata.
3. Deterministic Asset & State Preloader Pipeline (GameLoadingScreen & useGamePreloader):
   - Active, non-cosmetic 5-stage preloader executing between setup/continue and the command desk.
   - Stage 1 (0-25%): Simulation & Save State Hydration / Trajectory validation.
   - Stage 2 (25-55%): Vector Graphics Pre-decoding (14 national SVG emblems, country flags, UI icons).
   - Stage 3 (55-80%): Intelligence Indexes & 5-Language Dictionary verification.
   - Stage 4 (80-99%): Executive Workspace layout & Web Audio readiness.
   - Stage 5 (100%): Clean handoff to ExecutiveWorkspaceShell with zero frame drops or pop-in.
   - Live percentage counter (0% to 100%), stage status subtitle, and loading quote card.

### Phase 9.5: Physical Map Visual Revolution & Living World Overlays (Fiziki Harita Devrimi) (NEXT FOCUS)
Objective: Transform the game map into a living, tactile, AAA stylized physical relief globe and flat map.
Key Deliverables:
1. Turquoise Coastal Shelf & Shallow Waters Glow: Soft turquoise illuminated halo hugging all continental and island coastlines, providing rich ocean depth.
2. Curving Blue River Vector Networks: Natural Earth river layers rendering major global waterways (Mississippi, Danube, Nile, Tigris-Euphrates, Amazon, Yangtze, Volga) as vibrant blue paths.
3. Stylized Snowy Peaks & Alpine Relief: High-elevation relief shading displaying stylized snow-capped peaks on major mountain chains (Alps, Himalayas, Rockies, Andes, Taurus).
4. Animated Trade Convoys, Cargo Fleets & Air Corridors: Active trade agreements generate animated shipping arcs on sea lanes with cargo vessels and air transport paths. Sanctioned routes turn dashed red with naval blockades.
5. Visual Frontlines, Artillery Smoke & Combat Flash FX: Contested war borders render glowing colored dashed frontline bands with troop density markers and tactical artillery smoke/flash bursts.
6. Day / Night Terminator Line & Glowing City Lights: Dynamic solar terminator band sweeping across the globe; night quadrant territories display golden urban clusters (Istanbul, London, Tokyo, New York, etc.).
7. 3D Architectural Landmark Capital Pins: Major historical capitals display bespoke miniature architectural 3D icons (Anitkabir/Hagia Sophia, Eiffel Tower, Big Ben, White House, Kremlin) replacing flat pins.

### Phase 9.6: Multilateral Peace Conference & War Settlement Table (Baris Masasi)
Objective: Replace abrupt auto-annexation with an authentic grand-strategy peace conference table.
Key Deliverables:
1. Dynamic War Score System: Points calculated from casualties inflicted, occupied provinces, capital capture, naval blockades, and air superiority.
2. Multilateral Peace Conference Modal: Triggered upon surrender, armistice request, or total capitulation.
3. War Score Expenditure Options:
   - Territorial Annexation: Annexing specific conquered frontier provinces.
   - Puppet / Regime Change: Installing an ideologically aligned satellite government.
   - Demilitarized Zones (DMZ): Forbidding military troop deployments along border provinces.
   - War Reparations: Mandating recurring economic tribute payments (1 to 5 years).
   - Disarmament: Imposing naval vessel and armored division limits on defeated nations.

### Phase 9.7: Strategic Uranium Enrichment, Nuclear Deterrence & IAEA (Nukleer Sistem)
Objective: Deep geopolitical nuclear simulation, non-proliferation treaties, and strategic deterrents.
Key Deliverables:
1. Centrifuge Cascade Facilities & Enrichment Levels:
   - 3.67% Enrichment: Civilian reactor fuel for electric power grids.
   - 20.0% Enrichment: Medical, isotope, and naval propulsion grade.
   - 90.0%+ Weapons-Grade: Fissile core assembly for nuclear warheads.
2. Strategic Nuclear Triad:
   - Assembly, silo maintenance, and enormous security budget drains.
   - Triad Delivery: Intercontinental Ballistic Missiles (ICBMs), Nuclear Submarines (SSBNs), and Stealth Strategic Bombers.
3. International Atomic Energy Agency (IAEA) & Deterrence:
   - Clandestine enrichment facilities vs mandatory IAEA snap inspections.
   - Exposure risks leading to global economic sanctions and UN Security Council resolutions.
   - Mutually Assured Destruction (MAD) deterrence preventing conventional invasions.

### Phase 9.8: Living Parliament, Domestic Factions & General Strike Engine (Meclis ve Grevler)
Objective: Deep domestic political simulation, coalition governance, and social unrest.
Key Deliverables:
1. Legislative Decrees & Coalition Bargaining: Major policy shifts and war declarations require parliamentary votes or ruling coalition approval.
2. General Strike Simulation: Crashing public approval or extreme economic austerity triggers nationwide general strikes halting factories, transportation, and power.
3. Coup Attempts & Early Elections: Low military loyalty and high faction dissatisfaction risk military coups, cabinet resignations, and snap elections.

### Phase 9.9: High-Performance Web Worker Simulation & Supabase Cloud Persistence
Objective: Zero UI frame drops and cross-device cloud save synchronization.
Key Deliverables:
1. Off-Thread Web Worker Simulation: Relocating daily tick calculations for 195 nations to a background Web Worker, guaranteeing locked 60 FPS on the UI thread even at 5x game speed.
2. Supabase Cloud Save Layer: Encrypted multi-campaign cloud envelopes, guest sessions, and seamless cross-device play (desktop to laptop to mobile).

### Phase 10.0: Grand Release Candidate (RC) & Production Launch
Objective: Final release candidate packaging and multi-year campaign stability.
Key Deliverables:
1. Historical Campaign Scenarios: Pre-configured start dates (2026 Modern World, Global Resource Crisis, Regional Conflicts).
2. Orchestral Soundscapes & Audio Polish: Adaptive grand-strategy musical themes and dynamic ambient sound effects.
3. Cross-Engine Verification: Full automated end-to-end multi-year testing across Chromium, WebKit, and Gecko.

---

## 5. Phase 9.4 Task Breakdown & Execution Status

Total Tasks: T0 through T18

| Task | Title | Description | Status |
|------|-------|-------------|--------|
| T0 | Baseline & Discovery | Run baseline checks, verify A1-A10 codebase assumptions | COMPLETED (Verified locally) |
| T1 | Author Profiles & Types | src/data/leadershipAuthors.ts & types in leadershipTypes.ts | COMPLETED (Commit 9dfb5fb) |
| T2 | Corpus & Quote Merge | 28 curated quotes + 4 legacy quotes preserved with IDs | COMPLETED (Commit ed5e0c3) |
| T3 | Selection Engine | Context-aware quote selection & ideology weighting | COMPLETED (Commit 7538959) |
| T4 | Quote & Selection Tests | Unit test suite for quotes, determinism, source scan | COMPLETED (Commit ad77e55) |
| T5 | Localized UI Strings | 5-language dictionary catalog in src/i18n/uiCatalogLanding.ts | COMPLETED (Commit 1f96bb2) |
| T6 | Save Summary Peek | Read save metadata without hydrating engine | COMPLETED (Commit 4b43307) |
| T7 | Guest Session | Silent one-click guest play in src/session/demoAccounts.ts | COMPLETED (Commit fd5be83) |
| T8 | Landing State Machine | landingMachine.ts reducer and hero action resolver | COMPLETED (Commit ba97e8b) |
| T9 | Rotation Hook & Wisdom Widget | useQuoteRotation.ts and LeadershipWisdomWidget.tsx | COMPLETED (Commit 4f82a42) |
| T10 | Landing Styles | landing094.css with Navy and Ivory token parity | COMPLETED (Commit 660dc8f, 55944fd) |
| T11 | Presentational Components | HeroBrand, CommandMenu, SaveGameCard, UtilityDock, Backdrop | COMPLETED (Commit d70e935) |
| T12 | Profile Drawer | ProfileDrawer.tsx with dialog semantics and focus trap | COMPLETED (Commit 4b01872) |
| T13 | Release Notes & Ambience | ReleaseNotesModal.tsx and audio preference hook | COMPLETED (Commit f135b24) |
| T14 | Landing Shell & Entry Swap | LandingShell.tsx replacing legacy CampaignEntry hub | COMPLETED (Commit aae6e63) |
| T15 | Setup Wizard Integration | LeadershipWisdomWidget (compact) in CampaignSetup.tsx | COMPLETED (Commit 182d1c7) |
| T16 | Deterministic Preloader Pipeline | GameLoadingScreen.tsx (0-100%, 4 stages + handoff) | COMPLETED (Commit a2fe997) |
| T17 | Tests & E2E Migration | Unit tests + Playwright e2e (14/14 scenarios green) | COMPLETED (Commit 6a91afb, 6867430) |
| T18 | Verification & Visual QA | Trajectory hash invariant, bundle budget, final record | COMPLETED (Commit b6cdba7) |

---

## 6. Ground Truth Reference Data for Implementers (T0 Verified)

1. Repository Coordinates:
- Remote: https://github.com/Cryptovis/gamev2.git
- Repo: Cryptovis/gamev2
- Active Branch: dev/ron-phase9 (HEAD: 0220ed1)

2. T0 Ground Truth Answers (Verified on live codebase):
- A1: Light theme root selector in src/ui/styles/appearancePhase7.css is:
  :root[data-theme="light"]
- A2: Localization uses src/i18n/gameI18n.ts (D dictionary catalog keyed by GameLanguage, tr helper, LANGUAGE_OPTIONS) and src/i18n/localeText.tsx (LocaleText component, translateText, translateLive).
- A3: SaveRecord in src/persistence/database.ts stores:
  id, owner ('guest' or username), updatedAt (ms), schemaVersion, and state (snapshot).
  state includes playerProfile (country, commanderName, setupComplete, language) and day.
- A4: In src/session/demoAccounts.ts, enterDemoSession('guest') already sets sessionStorage without credentials or math challenges.
- A5: An ambient audio system already exists at src/audio/audioSettings.ts (key 'trp-audio-v1', useAudioSettings store, channels: ui, war, ambient).
- A6: Country flags are rendered using flagEmoji(iso2) from src/data/countryThemes.ts.
- A7: VictoryScroll.tsx exists for victory; CampaignSetup.tsx contains the legacy loading step.
- A8: The 4 legacy quote IDs in src/data/leadershipQuotes.ts are:
  - ataturk-peace
  - ataturk-sovereignty
  - lincoln-people
  - mandela-education
- A9: Version is imported directly from package.json:
  import { version } from '../../../package.json';
- A10: Screen state is managed in React state:
  const [screen, setScreen] = useState<'login' | 'register' | 'hub' | 'setup' | 'game'>(hasDemoSession() ? 'hub' : 'login');

3. Ideology Types in src/domain/game.ts:
export type IdeologyType = 'pluralist' | 'state_centric' | 'state_socialist' | 'royalist' | 'religious_state';

Quote Category Weights:
- pluralist: liberty, diplomacy
- state_centric: statecraft, war_and_peace
- state_socialist: economics, liberty
- royalist: statecraft, diplomacy
- religious_state: wisdom, statecraft

---

## 7. Standard Operating Procedure for Antigravity

When resuming or starting a new conversation session:

1. Read this file first (docs/MASTER-TRACK-RECORD-ROADMAP.md).
2. Verify git state:
   ```bash
   git status -s
   git log -n 3 --oneline
   ```
   Ensure HEAD is on dev/ron-phase9 and working directory is clean.
3. Run verification baseline:
   ```bash
   npm run check
   ```
   Confirm all test files pass and tsc --noEmit exits with 0 errors.
4. When Sonnet provides code or pushes commits:
   - If git commits pushed: git fetch origin dev/ron-phase9 && git merge --ff-only origin/dev/ron-phase9
   - If raw code provided: write to files, run typecheck, run test suite.
   - Verify bundle size: npx vite build.
   - Verify 120-day trajectory hash is untouched.
5. When Alper requests playtesting:
   - Launch dev server: npm run dev (background task).
   - Inform Alper that http://localhost:5173/ is ready.
   - Stop dev server when playtest is concluded.
6. Update this document:
   - Whenever a task, playtest, or phase is completed, update the status and commit history in this document.

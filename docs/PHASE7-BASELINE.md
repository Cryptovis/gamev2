# Phase 7 baseline and integration map — P7-00

## Pinned source

- Repository: Cryptovis/gamev2.
- User-confirmed baseline: `cf07393ec9fc4873e65fd0413b595349177ceb2a` on `origin/dev/clear-command-090`.
- Dedicated development branch: `dev/ron-phase7`, created directly from that SHA. The first implementation commits descend from it; no integration merge, push or deployment is part of this kickoff.
- Clean checkout before copying the blueprint or editing application files. No applicable AGENTS.md was found in the repository or workspace ancestor paths. Read CLAUDE.md, docs/ARCHITECTURE.md, docs/HANDOFF-ASTRA.md and docs/RELEASING.md.
- Remote `dev/ron-release-091` also pointed to that exact SHA. The handover's branch name therefore identifies the same release snapshot; the user's `dev/clear-command-090` remains the governing base.
- No remote tag matching `v0.91*` was returned by `git ls-remote --tags origin 'v0.91*'`. This is a pinned branch commit, not an asserted release tag. The implementation checkout is shallow; historical ancestry beyond the pin has not been inferred.
- The initially supplied `2ed2bf3` was unavailable from Git/GitHub. Alper explicitly replaced it with the pin above and supplied the blueprint attachment. `docs/PHASE7-MASTER-BLUEPRINT.md` is an unchanged copy of that attachment, not a reconstruction.

## Baseline verification

`npm ci` succeeded. On the untouched pinned source, `npm run check` passed: **91 test files, 826 unit tests**, TypeScript and Vite production build. Existing large-chunk and mixed static/dynamic import warnings remain.

The initial browser attempt could not launch the cached Chromium (segmentation fault); the standard Playwright browser download failed with a truncated archive. An isolated, freshly extracted `@sparticuz/chromium@153.0.0` executable works. This tooling lives outside the repository; package.json and package-lock.json are unchanged.

The complete **191-scenario production-browser baseline run** is being verified in a detached worktree at the pinned SHA. Final results are recorded below when observed; no launch failure is counted as a gameplay failure or a pass.

## Integration points

| Capability | Existing integration and Phase 7 boundary |
| --- | --- |
| Target hub assessment launcher | `src/ui/panels/TargetCountryModal.tsx`, `TargetSubviews.tsx`: existing WarPlanningBrief renderer and managed strategic review. P7-A01 gives it a semantic operational-assessment intent; A04/A05 own intelligence and presentation redesign. |
| Full country launcher | `CountryWorkspace.tsx`, `CountryPanel.tsx`, `targetCountryHub.ts`: country selection, dossier choice and War Planning tab. Foreign pre-war launchers converge on the assessment intent; active-war command/national readiness retain their current behavior. |
| Engine assessment | `targetBriefing.ts` reads engine `getWarPreview`, `warDeclarationStatus`, `warFuelReadiness`; `warRules.ts` owns declaration eligibility and `tacticalRules.ts` owns tactical validation/preview. No UI formula changes. |
| Workspace routing | `src/store/gameStore.ts`: navigate/openTool/openWarWindow/closeWorkspace. `workspaceNavigation.ts`: WorkspaceFrame, bounded 16-frame parent trail, market sibling frames and visibility. Extend this adapter; do not add another router. |
| Window lifecycle | `useWindowLifecycle.ts`: ordered managed layers, Escape, one topmost Tab handler, trigger restoration, optional clock pause. `useWorkspaceVisibility.ts` and `useScrollMemory.ts` suspend hidden parents. CampaignTutorial's dock remains outside modal content and keyboard-accessible. |
| Inbox offers | `CommandIntelligence.tsx` + `commandIntelligence.ts` produce Inspect destinations. `ExecutiveDesk.tsx`/`executiveDeskModel.ts` present incoming offers; `DiplomaticPost.tsx` tracks sent/incoming letters and correspondence. Inbox intent distinguishes offers from correspondence and never selects a bilateral player panel. |
| Actual refinery construction | `ProductionPanel.tsx` → `IndustrialPanel.tsx` → `FactoryModal.tsx`. The existing typed command is **industry/build, kind=civil_factory**. `industrialEconomy.ts` adds five factories and **one refinery on completion**. InfrastructureAsset only includes roads/rail/ports/hubs. There is no dedicated refinery infrastructure command and no oil_refinery FacilityKind; the focus destination is civil_factory. |
| Refined fuel market | `MarketWindow.tsx`: open market and contracts sections. `OpenExchange.tsx`: fuel spot listings. `IndustrialMarketPanel.tsx`: direct shipments and monthly supply contracts. `industrialMarket.ts` owns industry/order and 1/3/5/10-year terms, quotes, protected reserves and delivery validation; `industrialEconomy.ts` goodStock/changeGoodStock use processedResources.fuel. |
| Journal/news | `world.journal`, `eventJournal.ts`, `commandIntelligence.ts` newsEntries, `CommandNews` in CommandIntelligence.tsx. Journal kinds are command/world/legacy, not the proposed war/diplomacy/trade filters. A11 will derive stable categories; A01 only carries filter context. |
| Theme/preferences | `audio/audioSettings.ts` and `presentation/mapDeskSettings.ts` use local stores; CSS themes are existing fixed presentation. A02 owns appearance preference/tokens. |
| Campaign identity/persistence | `world.campaignId` exists; `startCampaign`, migrations and `autosaveId` use it. `snapshotGame.ts` explicitly selects persisted GameState fields: workspace intents/trail are excluded. `saveGame.ts` scopes records with demoOwner/scopedId/owned. |

## Existing browser storage contract

| Key/database | Owner |
| --- | --- |
| `alpyx-global-command`, Dexie version 1, saves table | src/persistence/database.ts |
| `alpyx-map-zoom` | src/map/cameraControls.ts and gameStore.ts |
| `trp-demo-accounts-v1` (local), `trp-demo-session-v1` (session) | src/session/demoAccounts.ts |
| `trp-audio-v1` | src/audio/audioSettings.ts |
| `trp-map-desk-v1` | src/presentation/mapDeskSettings.ts |
| `trp-last-leadership-quote` | src/ui/panels/CampaignSetup.tsx |

All names and database/schema versions are preserved. Save Schema **17** remains frozen; no cloud metadata or route intent enters the simulation schema.

## Source discrepancies to retain for later tickets

1. Religion is `CountryState.society.dominantReligion`, ideology is `society.ideology`, region is `CountryState.region`. There is no top-level country.religion. P7-A09 must use these actual fields.
2. The handover says five autosaves per campaign, but `pruneAutosaves` currently slices autosave keys per owner across campaigns (including the legacy autosave). P7-B02 owns that correction and ownership regression coverage. P7-A01 does not alter retention.
3. The blueprint's suggestion to locate a dedicated infrastructure/refinery action does not match this release's command types. Reuse civil_factory's existing refinery gain; do not invent a parallel refinery system in the routing ticket.

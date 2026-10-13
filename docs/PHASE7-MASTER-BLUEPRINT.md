# Rule of Nations — Phase 7 Master Architecture & Implementation Blueprint

**Planning baseline:** v0.91.0, “The Living World & Executive Release”  
**Requested baseline branch:** dev/clear-command-090  
**Prepared for:** Alper / GPT-Sol  
**Date:** 14 October 2026, Europe/Malta  
**Status:** Architecture proposal and execution specification. No application code, database, infrastructure, branch, or deployment changes made.

## 1. Executive decisions and evidence

Phase 7 should preserve the deterministic client simulation and add two bounded capabilities: a consistent executive command interface, and an optional cloud persistence service. Neither track should rewrite the engine, introduce server-authoritative gameplay, or require login to play.

This document is based on direct reads from Cryptovis/gamev2 on dev/clear-command-090: docs/HANDOFF-ASTRA.md, CLAUDE.md, docs/ARCHITECTURE.md, package.json, CI, target hub/subviews/briefing, command types/dispatch, country types, local persistence/session, and industrial market/economy modules. It is a targeted architectural review, not an exhaustive audit or a new test run. The 826 unit tests and 191 browser scenarios are the reported baseline; they were not rerun in this planning turn.

### Findings that change implementation

| Area | Verified finding | Phase 7 decision |
| --- | --- | --- |
| Release branch | User specifies dev/clear-command-090; handover names dev/ron-release-091 | User's branch governs this plan. Resolve exact commit and ancestry in P7-00; do not infer production branch from either name. |
| Country hub | TargetCountryModal already has hub/war/dossier local subviews and two footer buttons | Retain the hub and four-tab briefing; replace the war subview with one shared assessment route and add the third direct footer action. |
| War preview | targetBriefing reads getWarPreview, warDeclarationStatus and warFuelReadiness; exact enemy state currently feeds preview | Preserve engine formula ownership. Add a player-visible intelligence projection before claiming estimated forces or confidence. |
| Refined fuel | IndustrialGood includes fuel; industry/order supports buy and 1/3/5/10 years; IndustrialContract already exists | Expose and verify the existing industrial import contract path. Do not add fuel to raw TradeResource merely to make a menu work. |
| Fuel inventory | goodStock/changeGoodStock map fuel to country.processedResources.fuel | All purchases, deliveries and war readiness use this one inventory. No parallel fuel stock. |
| Supply timing | Existing industrial contracts deliver first at day +30 and then every 30 days | Say “monthly delivery”; a signed contract does not fix today's fuel shortage. Keep spot purchases available. |
| Religion | CountryState has society.dominantReligion, not country.religion | Bind RELIGION to society.dominantReligion and IDEOLOGY to society.ideology; REGION to country.region. No invented schema field. |
| Save retention | saveGame.pruneAutosaves slices autosaves across one owner; handover describes five per campaign | Preserve current behavior initially. P7-B02 explicitly fixes retention to the documented five-per-campaign intent, with multi-campaign regression coverage. |
| Ownership | demoOwner, scopedId and owned control local save visibility | Introduce a compatible owner adapter; keep old guest/demo IDs intact. Capture ownership before asynchronous saves. |
| Deployment | CI uses Node 22 and runs check then browser tests | Deploy the tested artifact after that exact commit passes, not independently on every push. |

### Non-negotiable boundaries

- UI → typed command → engine validator/system → GameState → UI remains authoritative.
- Simulation time, costs, outcomes and randomness remain deterministic. Wall clocks and random operation IDs belong only to UI/persistence infrastructure.
- AI and player share applicable engine validators; Phase 7 introduces no hidden player-only resource grants.
- Save Schema 17 remains unchanged. Dexie database version and cloud envelope version are separate contracts and may increase.
- Preserve existing storage/database keys and old save ownership. No destructive migration or mass formatting.
- New UI copy is translated in en, tr, es, zh and ru through the existing catalog system.
- Reuse window lifecycle, confirmation receipts, selector subscriptions and existing icon primitives.
- Cloud failure must never invalidate a successful local save or freeze simulation.
- No realtime multiplayer, accounts/password backend, new diplomacy simulation, global refactor, or general balance overhaul in this phase.
- No direct pushes to main; integration merges and production publication follow Alper's existing approval boundaries.

## 2. System architecture specification

### 2.1 State ownership and data flow

| Layer | Owns | Must not own |
| --- | --- | --- |
| GameState and pure engine | Countries, wars, rounds, orders, stock, contracts, diplomacy, deterministic journal | JWTs, auth identity, cloud revisions, network state, theme |
| Existing game store | Command dispatch, receipt handling, narrowly selected engine state | Cloud transport or duplicate business formulas |
| UI workspace state | Active workspace, country context, tab, focused good/factory, return destination, draft orders | Authoritative inventory or completed orders |
| Local preferences | Theme, accessibility preferences, tutorial completion keyed by local owner/version | Required GameState fields |
| Session adapter | Demo/cloud identity, auth lifecycle, owner namespace, session generation | Simulation permissions or campaign results |
| Dexie persistence | Save records, immutable upload snapshots, queue, sync bindings, recovery copies | OAuth provider secrets |
| Cloud repository | Private save envelopes, server revisions/timestamps, operation receipts and deletion tombstones | Simulation ticks, hidden gameplay mutation |
| Deployment layer | Static assets, HTTP security, domain, build provenance | Service-role keys in browser builds |

**Gameplay flow:** a button or tactical confirmation dispatches a typed command with an existing receipt mechanism. The engine validates against current state, applies once, and returns the result. Read-only previews call engine-owned selectors. Networking is never part of that transaction.

**Local save flow:** snapshotGame → canLoadSave → capture owner/campaign/local revision → atomic Dexie save + durable sync intent → report local success. Serialization/compression/upload happen after local commit.

**Download flow:** authenticated metadata fetch → conflict comparison → bounded download/decode → hash and envelope checks → migrateSave and normal validation → local recovery copy + local write → explicit Continue/Load. Download never silently replaces a running campaign.

**Cloud availability:** absent configuration yields a fully functional local application with cloud options unavailable. Signed-out Demo creates no Supabase anonymous user and makes no save-upload requests.

### 2.2 Component layout and navigation

Names below are proposed roles, not assertions that these files already exist. Reuse equivalent current modules after P7-00.

| Proposed role | Integration and responsibility |
| --- | --- |
| Workspace intent adapter | Extend the existing navigate/workspace-trail machinery; do not introduce a second router |
| OperationalAssessmentModal | Sole pre-war assessment renderer for hub, national workspace and other launchers |
| OperationalAssessmentView | Engine-derived, player-visible forces, terrain, odds, blockers and intelligence data |
| CountryInfoSubview | Existing DossierSubview retained/renamed; four in-modal tabs |
| ExecutiveWorkspaceShell | Shared centered framing for Policies, Military, Economy and Diplomatic Inbox |
| FuelHelp | Contextual explanation plus factory and market intents; preserves return target |
| TacticalOrderDraftCard | UI draft selection, cost preview, queue/cancel; no simulation mutation on selection |
| LeaderCapsule / MetricsIsland | Independent HUD children with narrow selectors |
| SitrepToastController | New-event detection and bounded transient presentation; archive remains authoritative |
| AppearancePreferences | Dark/Light/System, effective theme and pre-paint preference application |
| AuthSessionAdapter | SDK lifecycle and stable owner mapping behind CampaignEntry |
| CloudSaveRepository / SyncCoordinator | Transport boundary and durable local-first state machine |

Workspace intents carry explicit countryId where relevant, a validated tab identifier, optional focus target, and a return destination. They do not overload “selected country” to mean both player and target. Invalid/deleted targets resolve gracefully.

Required semantic destinations:

| Action | Destination | Context |
| --- | --- | --- |
| Hub: War Planning | Shared operational assessment | Selected target |
| Hub: Country Info | Four-tab in-hub briefing | Selected target; Overview initially |
| Hub: Complete Panel & Trade | Existing 14-tab workspace, Trade selected | Selected target; all existing tabs directly selectable |
| 14-tab workspace: War Planning | Same operational assessment | Same selected target |
| Fuel: Build Refineries | Player Factory workspace, Oil Refineries focused | Player ownership; return to assessment target |
| Fuel: Commodity Market | Market, Refined Fuel selected | Player purchase context; available supply tab |
| Alert: unread diplomatic messages | Diplomatic Inbox / Executive Desk offers | Inbox scope, not player bilateral country tab |
| NEWS rail | News Archive with event filters | Current campaign |

Foreign Cabinet/Tech pages retain existing read-only/eligibility rules. Opening the full workspace never grants authority over another nation. Trade is the initial tab because the new footer action explicitly promises it.

A single primary workspace is active at a time. A confirmation or helper is a managed child layer. Preserve the existing hidden-parent/return-trail behavior where useful, but suspend the parent's focus trap and shortcuts while its child is active. Escape closes the topmost layer and restores the relevant trigger. Opening help and returning must retain the target and scroll/focus context. CampaignTutorial stays interactive and is not placed in an inert modal subtree.

### 2.3 Operational assessment and war declaration

Desktop composition is three zones: own forces, central theatre, opposing forces. On narrow screens it becomes own/target compact comparison followed by theatre and action, with no unreadable compressed columns.

- **Own wing:** flag, available leader portrait or neutral fallback, personnel, tanks, air/naval counts, supply and fuel. Define counts precisely: available versus committed assets must not be mixed.
- **Centre:** existing terrain classification and artwork, power ratio, qualitative outlook, air indicator, logistics and declaration blocker. Retain current outlook thresholds unless separately justified; do not rebalance through CSS.
- **Target wing:** visible estimates, capability, confidence and information age. Unknown values display Unknown, not zero.
- **Ratio:** tactical forecast, not a probability of winning. If based on estimates, identify it as estimated; do not reveal exact hidden strength via a two-decimal ratio or air badge.
- **Fuel:** stock/required and readiness directly from warFuelReadiness; structured blocker code drives the helper, not matching translated error text.
- **War CTA:** “DECLARE WAR ON [COUNTRY]” is the primary red action. Keep the existing StrategicDecisionModal/receipt safeguards; this pass removes navigation steps, not consequential-action protection.
- Revalidate at actual dispatch: diplomacy, fuel, ownership or an active war can change while the modal is open.
- Existing war uses the same assessment shell with “Open War Command” and disables redeclaration. Do not silently route one entry point to a different legacy assessment.

Intelligence projection belongs to the engine visibility boundary. First reuse existing reconnaissance/intelligence estimates. If there is no pre-war estimate contract, return stable coarse bands or Unknown; do not fabricate probabilistic confidence from raw exact state. Document the confidence mapping and ensure repeated rendering neither reveals more data nor advances RNG. Both launcher paths consume the identical view model.

### 2.4 Fuel guidance and bilateral supply

“Build Refineries” focuses the existing refinery infrastructure action inside the Factory experience. FacilityKind in industrial.ts does not currently contain an oil-refinery entry; do not invent one and create a second refinery system. Locate and adapt the existing infrastructure/refinery command.

The helper must distinguish crude Oil from Refined Fuel, current shortage from future supply, refinery construction time from production, and monthly contractual deliveries from immediate market settlement.

Reuse industry/order with good=fuel, direction=buy, term 1/3/5/10. Show supplier, trade-pact requirement, protected seller reserves, amount per shipment, unit price, shipment cost, first/next delivery day, term, cancellation and missed-delivery status. Existing industrialOrderError/industrialQuote/processIndustrialContracts own those rules.

Preserve the current locked-price and monthly-settlement model. Payment and stock transfer happen at delivery; signing is not an immediate fuel transfer. War/sanctions/trade restrictions, supplier stock and buyer liquidity are revalidated. A blocked shipment cannot grant fuel or charge only one party. Duplicate route restrictions and cancellation remain engine-owned. This is primarily discoverability plus regression coverage, not a new contract simulation.

### 2.5 Tactical board interaction

Use a UI state progression: no selection → selected force → selected order → selected sector → reviewed draft → queued order. Changing an earlier choice clears incompatible later choices.

- First entry presents three lightweight anchors: Select Force → Choose Order → Target Sector.
- The overlay advances on actual actions; highlights never intercept necessary board clicks.
- Highlight Advance, Defend, Flank, Recon and Bombard when force selection makes them relevant; disabled actions retain visible reasons. Available orders come from engine capability rules.
- Sector selection opens a micro-card with force/order/sector, CP and fuel costs, and Queue Order / Cancel.
- Queue reserves preview capacity across the UI draft so combined orders cannot appear affordable individually while exceeding the total. Use an engine-owned batch preview; never deduct live resources at queue time if the current engine commits at round submission.
- Final commit continues through tactical/commit with expectedRound and existing receipts. Reject stale rounds, destroyed forces and illegal targets without charging.
- Cancelling a draft restores selection without a command. Avoid double deduction between Queue and Commit.
- Track onboarding completion per local owner and tutorial version outside GameState; offer replay in Help. Pause/dismiss on unrelated higher-priority modals and honor reduced motion.

### 2.6 Cultural, map, HUD and theme design

Country Info Overview adds three data cards from the actual country model: society.dominantReligion, society.ideology and region. Missing legacy values display a localized fallback; religion/ideology do not become mandatory schema additions.

Change the CYP display/profile label to Cyprus and audit the relevant ISO/map bindings before editing. Preserve stable country IDs, geometry mappings, capital references and save relationships. Legacy saves embedding “N. Cyprus” need an ID-scoped presentation normalization so old saves display correctly too; do not globally replace unrelated Cyprus strings or change boundaries.

Reuse/extend CivicArt and CommandArt or their established SVG family:

| Layer | Icon |
| --- | --- |
| Political | Capitol/government |
| Relations | Handshake |
| Diplomacy | Sealed scroll |
| Resources | Barrels/gems |
| Military | Crossed swords |
| Religion | Sacred scripture |
| Ideology | Scales of justice |
| Globe | 3D sphere |
| Flat | 2D projection |
| Geographic | Relief terrain |

All controls have localized labels, selected state, visible focus and accessible names. Do not use generated raster imagery for these system icons.

Remove the heavy .command-overview-island enclosure. LeaderCapsule and MetricsIsland become independent map overlays. The metrics are Treasury, Food, Oil, Approval and Stability; clarify stock units and keep Oil distinct from Refined Fuel. Container backing is transparent; individual cards may have a restrained adaptive surface/scrim for legibility over bright terrain. Empty overlay space passes pointer events to the map; buttons do not.

Theme preferences are Dark, Light and System. A new installation defaults to System; migration preserves the previous dark appearance for existing installations unless the user changes it. NATO navy is the structural/accent color and crisp ivory/white the light surface. Use semantic tokens for surface, text, border, focus, danger, success and map-overlay contrast; avoid a global CSS inversion/filter. Theme affects every portal/modal, onboarding, Campaign Setup and loading/auth screen. Apply the stored preference before first paint and listen for OS changes only in System mode.

Centered core workspaces have a fixed header/tab region and one intentional scrolling body, with a visible close control. At small widths they may occupy almost the full viewport. “Centered” does not mean fixed dimensions that overflow. Target 4.5:1 normal-text contrast, 3:1 large text/control boundaries and approximately 44px touch targets; verify 200% zoom and all languages. Single-line DIPLOMACY uses adequate rail width/localized short labels with full accessible text, not tiny unreadable text.

### 2.7 News and notifications

Remove the permanent bottom bar and obsolete developer strings. Subscribe to new journal/event identities, not every render or translated message text. Seed the seen cursor on load so historical events do not replay as new toasts.

Default presentation: one floating toast, approximately six seconds visible, short opacity transitions, pause on hover/focus, close button, polite announcement, optional “View in News” action. Reduced motion removes transition. Prioritize victory/war over routine trade, coalesce bursts and bound the pending queue; events remain in the archive within the existing retention policy. Toast expiry never removes an archive record.

News Archive filters All, Wars, Diplomacy, Trade use stable event categories. If existing records lack categories, add a derived adapter from available structured journal data; old unclassifiable records remain visible under All. Do not classify by translated text. Remove the redundant World activities and National Alerts buttons without removing the separate Alerts routing feature.

### 2.8 Identity and session architecture

Use one lazily initialized @supabase/supabase-js client. Configuration comes from VITE_SUPABASE_URL and the public browser key convention specified in the handover; no service-role/provider secret enters Vite variables, dist, logs, saves or source control.

Session states: local Demo, initializing cloud session, signed-in, offline/refresh pending, signed-out/error. Initialization has a finite UI wait; Demo is always immediately reachable. UI subscribes through an adapter; auth callbacks do not dispatch gameplay mutations.

Use signInWithOAuth for apple, google and discord with PKCE. Handle the application callback exactly once, clean code/error parameters from the URL, validate return destinations, and recover from cancellation/expired code without losing the local game. Provider callback configuration points to Supabase Auth; Supabase redirect allowlisting then permits the application callback. These are different settings.

Use exact production and localhost callback URLs. Use a separate nonproduction Supabase project for authorized previews, scoped to the project's preview host pattern; never allow arbitrary preview origins into production. Apple web OAuth needs provider configuration and secret rotation, with an assigned operator before release. Do not depend on Apple supplying a commander name; retain the game's profile flow.

A static SPA cannot provide HttpOnly protection for SDK-persisted tokens. Use SDK-managed storage/refresh, do not duplicate tokens into the game store, reduce XSS exposure with CSP and safe rendering, and keep cloud privileges restricted by RLS. A server session proxy would be a different architecture and is outside Phase 7.

Owner mapping:
- Guest and existing local demo usernames retain their exact old owner strings and scoped IDs.
- Cloud accounts map to sb:<Supabase user UUID>.
- Session owner resolution remains accessible through the old demoOwner integration while callers migrate to a clearly named adapter.
- The owner and session generation are captured when an async operation begins. On sign-out/account change, abort work and discard stale results; never relabel queued saves to the next account.
- Expired auth pauses cloud sync. Local play and saves remain available under the captured local identity.
- Demo saves are not uploaded automatically after login. Offer an explicit copy/import selection with disclosure before first sync; originals remain intact.
- Active campaign ownership cannot silently switch when an auth event arrives. Complete a local save under its current owner, then return to campaign selection or explicitly import/copy.
- Cloud identity is determined by Supabase user ID, not email, display name or assumed cross-provider equivalence.

### 2.9 Local persistence and durable sync

Upgrade Dexie in place without renaming alpyx-global-command. Preserve existing saves. Add separate tables for sync bindings, immutable queued snapshots/operations and recovery records as needed. These tables and optional SaveRecord envelope fields are not GameState.

A binding records owner, local record ID, opaque remote save ID, campaign ID, save kind, local sequence, last acknowledged local sequence, remote revision and payload hash. Distinguish identity from name: two saves called “Manual Save” must not collide. Preserve the existing local default manual-slot semantics; cloud import allocates a new local slot when necessary.

A queue operation records operation ID, owner, local sequence, remote ID, expected remote revision, immutable validated snapshot reference, operation kind, attempts, next-attempt time and status.

Required lifecycle: pending → preparing → uploading → acknowledged, with retry-wait, auth-paused, conflict and permanent-error exits. Acknowledgement clears only the exact uploaded sequence; newer local saves stay queued.

- Commit save + sync intent atomically in Dexie; do not await network or compression inside the transaction.
- Queue only after cloud opt-in; no cloud upload of guest data by inference.
- Coalesce unstarted checkpoint writes per campaign; never mutate an in-flight snapshot.
- Retry transient failures with bounded exponential backoff and jitter, honoring Retry-After. Auth failures pause; invalid/oversized payloads remain local with an actionable status.
- Use a single queue worker per origin/account, with a durable lease or tested browser locking and crash recovery. Server conditional writes remain the cross-device authority.
- Browser close need not flush: the next run resumes durable work. Do not rely on unload requests.
- Local save failure is shown as failure; cloud queue failure cannot be falsely labeled “Synced.”
- Maintain five local autosaves per campaign after the explicit retention fix. Sync manual saves plus one latest checkpoint per campaign, not all five rotating local autosaves.
- Deletion is an explicit queued operation with a tombstone revision, preventing stale devices resurrecting a removed save. Separate “remove local copy” from “delete cloud save.”
- Local recovery copies are excluded from cloud queueing and autosave pruning until the user has resolved the conflict.

### 2.10 Cloud envelope, schema and access control

**Recommended initial storage:** one private PostgreSQL save row with gzip payload in bytea, accessed through bounded repository operations. This keeps revision/payload commit atomic. The REST/RPC wire envelope may encode gzip bytes as base64; measure that overhead. Do not put compressed binary into jsonb or assume setting Content-Encoding alone compresses an SDK request.

P7-B03 measures small/new, 365-day, 1095-day and multiwar saves: JSON bytes, gzip bytes, encoded wire size, encode/decode time and peak memory on desktop and phone. Proposed initial limits are 8 MiB compressed and 32 MiB expanded, with 100 manual cloud slots per account and one checkpoint per campaign; these are design defaults, not measured provider limits. Record validated limits before freezing the schema, including aggregate account quota. If legitimate saves exceed the chosen safe database/API envelope, select private Supabase Storage plus a Postgres metadata pointer before implementing B04. That alternative must upload immutable blobs first, conditionally commit pointers, and garbage-collect orphaned/superseded blobs under owner-scoped policies. It is not a casual mid-ticket switch.

Conceptual tables:

| Table | Essential fields | Invariants |
| --- | --- | --- |
| cloud_saves | owner UUID, id, campaign_id, kind, name, schema_version, envelope_version, codec, payload, hash, compressed_bytes, expanded_bytes, revision, updated_at, deleted_at | Primary key owner + id; one live checkpoint per owner/campaign; schema version describes payload, not table |
| cloud_save_operations | owner, operation_id, save_id, request hash, result revision, result status/time | Unique owner + operation_id; same ID with different content rejected; receipt and write commit together |

updated_at and revision are server-controlled. Device timestamps may be diagnostic/display metadata but never decide overwrite rights. Hash refers to the exact serialized UTF-8 payload bytes before compression; do not require gzip output to be byte-for-byte stable across implementations.

RLS/grants contract:
- No anonymous read/write/execute permission for save data.
- Authenticated reads require owner = auth.uid().
- Inserts check owner = auth.uid(); updates check both existing and resulting owner; deletes check existing owner.
- Owner, timestamps and revisions cannot be freely reassigned by a browser.
- Mutations go through a restricted conditional-write RPC; do not expose an unrestricted direct-upsert path that bypasses concurrency/quota rules.
- If a narrowly privileged SECURITY DEFINER function is required to enforce the RPC-only boundary, explicitly verify auth.uid(), derive owner server-side, fix search_path, revoke public execution, and test its bypass risks. RLS alone does not secure privileged functions.
- Apply equivalent restrictions to operation receipts and any Storage fallback.
- Enforce payload, name and account quotas server-side; client validators are not a security boundary.
- Tombstones and idempotency receipts require a documented retention policy. For Phase 7 keep tombstones until account cleanup, and do not prune unacknowledged-operation receipts in a way that permits resurrection/replay.

Never trust downloaded JSON because it came from the same account. Bound encoded and decompressed sizes, verify codec/hash/version/envelope consistency, parse, migrate supported schemas 12–16 to 17 and validate. Refuse unsupported older/newer schemas or invalid content without replacing a good local save. Preserve all existing save fields, including factions, annexedBy, welfare and optional subsystem state.

### 2.11 Conflict semantics: guarded last-write-wins

“Last write wins” means the latest server-accepted revision after conflict review, not the largest untrusted laptop timestamp. This interpretation satisfies the requested overwrite prompt and avoids offline clock-skew loss.

1. Before upload, compare the local binding's acknowledged revision to remote metadata.
2. The upload RPC atomically checks expected revision and applies only on match, assigning server time and the next revision.
3. If another device wins between comparison and upload, RPC returns conflict with current metadata; it does not overwrite.
4. If remote changed and local is dirty, pause that save and show local/remote name, campaign/day, server time and device label if available.
5. Choices: **Use cloud**, **Keep this device**, **Keep both**, **Later**. Keep this device is explicit authorization to overwrite the displayed remote revision, still guarded against a subsequent race.
6. Keep both creates a new remote/local identity. Use cloud validates first and preserves a local recovery copy. Later allows continued local play with sync paused.
7. Even a clean local copy receives a visible “newer on another device” choice before replacing an existing save. First-time cloud downloads may be explicitly selected from the cloud list.
8. Never auto-merge GameState fields or choose the highest simulation day as the winner.
9. Equal payload hashes reconcile without a conflict dialog; lost acknowledgements use operation receipts to avoid repeating a write.

Account switching, deletion and checkpoint coalescing obey the same revision rules. One conflicted save must not block unrelated saves.

### 2.12 Offline application and deployment

“Offline Demo” has two cases: continuing without network in an already loaded app, and reopening after a prior successful visit. The first is a core invariant; the second requires the application shell/assets to be available offline. P7-B09 supplies a narrowly scoped, versioned static-asset service worker if the repository does not already provide one. No OAuth/API response or cloud payload is cached there; IndexedDB owns saves. First-ever loading of an uncached website without a network is inherently unavailable.

Deploy Cloudflare Pages using Node 22, npm ci, npm run check, npm run test:e2e and the resulting dist artifact. Preferred path is CI-gated Direct Upload with pinned tooling. Git integration must not independently publish a failing commit. Only the explicitly selected release branch can publish production; dev/** uses preview deployments with nonproduction configuration.

- Canonical domain: https://ruleofnations.com; redirect www to canonical, preserving paths/query as appropriate.
- Configure custom-domain association and DNS/TLS before enabling production OAuth.
- SPA routes, including /auth/callback, must resolve to the app. Do not rewrite missing JavaScript/assets into HTML. Use Pages SPA behavior or a tested explicit fallback; avoid conflicting rules and top-level 404 behavior.
- Hashed /assets/*: long immutable cache. index.html, service worker and version/update manifest: revalidate/no-cache. Other stable filenames get deliberate finite cache policies.
- Preserve the tested build's public environment configuration; Vite variables are build-time. Never promote a staging-configured artifact as if it were a production build.
- Start CSP in report-only in preview, inventory required sources, then enforce before release.
- CSP baseline: self for scripts and assets; object-src none; base-uri self; frame-ancestors none; connect-src restricted to the project HTTPS endpoint and only necessary endpoints. Add worker-src self/blob only if the production map worker needs it.
- Existing React inline styles may require an explicit style-src concession until audited; do not promise a strict hash-only style policy without checking the render paths. Do not add unsafe-eval for convenience.
- Permit image/data/blob/media/font sources only when actual assets need them. Self-host/fallback avatars can avoid granting arbitrary provider image origins.
- Add nosniff and an intentional Referrer-Policy. Verify headers on real responses, not only source files.
- Pages _headers applies to static responses; any Pages Function/Worker response must set its own security headers. No new Worker backend is required for this design.
- Stage HSTS only after apex/www HTTPS is verified; no speculative preload commitment.
- Roll back by redeploying a known-good artifact. Keep database upgrades additive and test the prior application against them; disable cloud sync before rolling back to a build that cannot safely read new local metadata.

## 3. Phase 7 master roadmap

Tracks are architecturally separable, but GPT-Sol should execute the ticket order below sequentially. Synchronization points keep shared navigation, save compatibility and release work aligned.

| Milestone | Track A | Track B | Exit gate |
| --- | --- | --- | --- |
| M0: Baseline and contracts | Inventory launchers, modals and UI regressions | Pin save/session/CI behavior | P7-00; commit and test evidence recorded |
| M1: Shared shell and identity boundary | Typed navigation, themes, centered workspaces | Optional auth adapter and owner isolation | Demo intact; navigation/focus and owner tests pass |
| M2: War and fuel experience | Unified versus assessment, helpers, contracts, tactical onboarding | Durable local queue and measured encoding | Combat receipts intact; save+queue transaction proven |
| M3: Executive polish and secure cloud | Info cards, map icons, HUD, news | RLS/RPC, retry/idempotency, conflict UX | Two-user isolation and two-device conflict tests pass |
| M4: Deployable candidate | Five-language/responsive/theme audit | Offline shell, Pages preview, security and provider setup | Exact candidate CI green; preview checks complete |
| M5: Phase 7 release | Integrated user journeys | Domain, production smoke, recovery procedure | Alper's release decision; no unverified “complete” claims |

This is not automatic approval of the separate full Closed Beta campaign program mentioned in the handover. Phase 7 must run targeted multiwar and long-run checks for changed gameplay/save paths; any broader release acceptance program remains separately scoped.

## 4. Sequential execution tickets for GPT-Sol

Each ticket is one reviewable implementation unit. “Done” means acceptance evidence plus the relevant regression test, all five translations for new copy, and a concise handover. Paths not verified above must be located during P7-00; do not fabricate existing filenames.

### P7-00 — Pin baseline and map integration points
**Depends:** none. **Risk:** medium.

1. Read repository instructions, handover, architecture and releasing rules from the chosen commit; locate all applicable AGENTS.md.
2. Record branch head/ancestry, clean/dirty status and release-tag relationship. Resolve the handover branch mismatch using Git evidence while keeping the user-specified baseline.
3. Inventory assessment launchers, workspace route types, refinery command, tactical preview, journal categories, theme/settings, campaign IDs and browser storage.
4. Run baseline npm run check and npm run test:e2e; record actual counts and failures. A missing environment is a reported limitation, not a pass.
5. Create a dedicated Phase 7 development branch from the verified base only when implementation begins; keep freeze branch unchanged until approved integration.

**Acceptance:** docs/PHASE7-BASELINE.md includes exact SHA, file map, baseline evidence and the two source discrepancies on religion/autosaves. No unrelated fixes.

### P7-A01 — Typed workspace intents and lifecycle contract
**Depends:** P7-00. **Risk:** high.

1. Extend existing navigation with target, tab, focused good/factory and return context.
2. Add a common intent for operational assessment and inbox offers.
3. Preserve managed layer ordering, hidden parents, back navigation and focus restoration.
4. Add route tests for every required mapping in section 2.2.

**Acceptance:** alerts never open the player's bilateral tab; round-trip assessment → helper → factory/market → assessment retains target. No simultaneous focus traps; CampaignTutorial remains usable.

### P7-A02 — Theme tokens and appearance preference
**Depends:** A01. **Risk:** medium.

1. Introduce semantic Navy/Ivory theme tokens within existing CSS conventions.
2. Add Dark/Light/System to Settings and Campaign Setup with one preference source.
3. Preserve current users' appearance and initialize new installs to System.
4. Apply preference before paint, including portals/auth entry; honor OS changes and reduced motion.

**Acceptance:** persistence/reload/system-change tests pass; representative screens have legible contrast in both themes. No GameState/schema or storage-key rename.

### P7-A03 — Centered core workspaces and Diplomatic Inbox
**Depends:** A01, A02. **Risk:** medium.

1. Adapt Policies, Military, Economy and Inbox to the shared centered shell.
2. Preserve panel bodies, command handlers and scroll state while removing drawer constraints.
3. Correct unread-message Inspect routing and open offers directly.
4. Fix single-line localized DIPLOMACY rail sizing without shrinking below the text floor.

**Acceptance:** keyboard/Escape/backdrop/focus tests and phone/desktop scenarios pass; every card and close control is reachable. Reading offers preserves existing unread/read command behavior.

### P7-B01 — Optional OAuth session and stable owners
**Depends:** P7-00, A01, A02. **Risk:** high.

1. Add only the required Supabase SDK dependency and lazy configuration adapter.
2. Integrate Apple/Google/Discord buttons, PKCE callback, refresh/sign-out/error lifecycle and five-language copy into CampaignEntry.
3. Implement compatible local/cloud owner resolution and session-generation guards.
4. Keep Demo available without config/network; introduce pre-sync disclosure and explicit import intent, not automatic migration.

**Acceptance:** mocked lifecycle tests include cancelled login, stale callback, refresh failure and A→B account switch. Signed-out browser play/save/load still works. Provider credentials/configuration are documented separately; mocks do not certify live OAuth.

### P7-A04 — Player-visible operational assessment model
**Depends:** A01. **Risk:** high.

1. Extend targetBriefing using engine preview/visibility helpers for both force wings, terrain, odds, air and logistics.
2. Add structured blocker codes for fuel/helper routing.
3. Audit exact information leakage in counts, ratio, labels and tooltips; reuse intel estimates or stable Unknown/bands.
4. Preserve existing formula thresholds and deterministic behavior.

**Acceptance:** repeated preview calls do not change state/seed; fog-of-war fixtures do not leak hidden exact values. Eligibility matches dispatch validators for allowed/blocked/already-at-war cases.

### P7-A05 — Three-button hub and single versus modal
**Depends:** A02, A04. **Risk:** medium.

1. Add War Planning, Country Info, Complete Panel & Trade directly in the footer.
2. Route every assessment launcher to the same modal component.
3. Build the symmetrical desktop and readable mobile layouts.
4. Preserve declaration confirmation/receipt behavior and active-war alternative.
5. Remove legacy assessment rendering only after all launchers are covered.

**Acceptance:** hub and full-workspace scenarios render the same assessment and dispatch the same command once. Third button opens Trade in one click; Country Info retains four tabs.

### P7-A06 — Fuel helper and refinery/market deep links
**Depends:** A05. **Risk:** medium.

1. Place [?] How to get Fuel? alongside the structured fuel blocker.
2. Add Build Refineries and Commodity Market shortcuts with player-owned destination context.
3. Focus the actual refinery infrastructure action and Refined Fuel good.
4. Explain production prerequisites/time and spot versus future supply.

**Acceptance:** no command or purchase occurs merely by opening a helper; return restores assessment; gaining fuel updates readiness from the engine. Crude oil alone does not falsely satisfy fuel checks.

### P7-A07 — Expose and verify refined-fuel import contracts
**Depends:** A06. **Risk:** high.

1. Expose fuel in Market/Supply imports using industry/order and existing IndustrialContract.
2. Present 1/3/5/10-year terms, monthly quantity, locked price, delivery costs/date and active status.
3. Reuse industrialOrderError/industrialQuote; ensure delivery writes through changeGoodStock.
4. Test signing, first day+30 delivery, repeat delivery, expiry, cancel, duplicate route, embargo/war, stock shortage and liquidity failure.
5. Run longRunInvariants before any gameplay-number change; avoid changing balance unless a demonstrated bug requires it.

**Acceptance:** neither signing nor failed delivery creates fuel; successful settlement conserves buyer/seller transfer and funds. Schema-17 save/load retains contracts. No raw TradeResource expansion.

### P7-A08 — Tactical selection, review card and onboarding
**Depends:** A02, A04, A05. **Risk:** high.

1. Build the selection/draft state progression and engine-backed batch cost preview.
2. Highlight valid actions; show reasons for unavailable orders.
3. Implement sector micro-card with Queue Order / Cancel and CP/fuel.
4. Add three-step nonblocking first-entry guidance and replay.
5. Preserve expectedRound and command receipts at final commit.

**Acceptance:** invalid/stale/duplicate orders charge nothing; queued totals account for all drafts; final commit charges once. Mouse, touch and keyboard scenarios complete onboarding and a real tactical round.

### P7-B02 — Dexie queue, campaign metadata and retention
**Depends:** B01. **Risk:** high.

1. Upgrade Dexie additively with bindings, immutable operation snapshots and recoveries.
2. Atomically write save plus durable sync intent using captured owner/generation.
3. Define stable save and campaign identity without changing GameState.
4. Fix documented five-per-campaign autosave retention, isolating legacy unassigned saves in a defined legacy bucket and enforcing owned() before pruning.
5. Preserve manual slot behavior and add one cloud checkpoint binding per campaign.

**Acceptance:** old database upgrades preserve every save; transaction/crash tests recover without phantom “Synced” status. Two campaigns retain five autosaves each; guest pruning never touches another owner. Newer local sequences survive older upload acknowledgement.

### P7-B03 — Compression, envelope and size decision
**Depends:** B02. **Risk:** medium.

1. Measure representative schema-17 saves, including long-run/multiwar fixtures.
2. Specify gzip codec, envelope version, exact-payload hash and encoded/expanded bounds.
3. Use native compression when supported; test supported Safari/Chrome/Firefox targets. If a required target lacks support, select a small audited fallback explicitly instead of silently sending uncompressed data.
4. Record database bytea versus private Storage decision and measured budgets in docs/CLOUD-PHASE7.md.

**Acceptance:** round-trip semantic equality preserves all fields; corrupted/truncated/oversized/zip-bomb/newer-schema payloads fail safely. No measured size/time results are invented.

### P7-A09 — Country cultural cards and Cyprus correction
**Depends:** A05. **Risk:** low.

1. Add religion/ideology/region to the four-tab Overview using actual model fields.
2. Localize values and numeric formatting instead of hardcoded en-US where touched.
3. Correct CYP data/display labels and provide ID-scoped old-save presentation normalization.
4. Audit map/ISO binding without rewriting country IDs or unrelated geography.

**Acceptance:** fresh and old saves display Cyprus consistently; unknown cultural values are readable; saved military/economic/annexation state is unchanged.

### P7-A10 — Map icons and transparent HUD composition
**Depends:** A02. **Risk:** medium.

1. Extend the established vector icon family for all ten requested map controls.
2. Split LeaderCapsule and MetricsIsland; remove the enclosing dark island.
3. Preserve leader mood/day and five metric behaviors, adding clear stock units.
4. Check layout around rails, flag card, relief map and pointer targets.

**Acceptance:** all labels/states remain accessible; transparent gaps pan the map; card clicks do not. Small-screen/long-language layouts do not overlap. Measure render/frame impact against P7-00 without inventing performance claims.

### P7-A11 — Transient sitrep and filtered archive
**Depends:** A01, A02. **Risk:** medium.

1. Remove permanent bottom letterbox and listed dev strings.
2. Add ID-based new-event toast queue, priority/coalescing, timing and reduced-motion behavior.
3. Retain archive records and add All/Wars/Diplomacy/Trade filtering from stable categories.
4. Remove redundant archive buttons while retaining Alerts elsewhere.

**Acceptance:** loading history produces no toast flood; victory appears once; dismissal does not delete history. Filter changes do not depend on active language, and unclassified old records remain under All.

### P7-B04 — Private cloud schema and conditional-write API
**Depends:** B03. **Risk:** critical.

1. Implement reviewed migrations for save envelopes, operation receipts and constraints.
2. Add server-controlled revisions/time, compare-and-swap, idempotency, quotas and tombstones.
3. Restrict grants/RLS and privileged RPC execution as specified.
4. Add database tests with user A, user B, signed-out caller and forged owner/revision attempts.

**Acceptance:** cross-owner select/insert/update/delete and RPC attacks fail; duplicate operations apply once; concurrent writers produce one success and one conflict. Direct writes cannot bypass revision rules. Test actual Postgres policies, not only a fake SDK.

### P7-B05 — Background sync coordinator
**Depends:** B02, B04. **Risk:** high.

1. Connect the durable queue to the cloud repository.
2. Implement per-owner worker coordination, retry/backoff, refresh pause, checkpoint coalescing and exact-sequence acknowledgement.
3. Resume after restart and bound in-memory work.
4. Add Local only / Pending / Synced / Conflict / Sign in to sync statuses outside the main HUD.

**Acceptance:** network loss, timeout after server success, HTTP rate limit, account switch, browser restart and duplicate tab workers do not lose or cross-upload saves. Local play/save remains responsive during every case.

### P7-B06 — Conflict choices, validated downloads and deletion
**Depends:** B05, A03. **Risk:** critical.

1. Implement visible newer-remote prompts and four resolution choices.
2. Preserve recovery copies and prevent running-game replacement.
3. Verify/download/migrate with the same local load contract.
4. Add cloud list metadata retrieval without fetching every full payload.
5. Implement distinct local removal and tombstoned cloud deletion.

**Acceptance:** two devices, equal timestamps, skewed clocks, delayed offline upload, second race during overwrite, lost acknowledgement and deletion races preserve the specified winner/recovery. Schemas 12–16 migrate; unsupported/invalid saves never replace valid local state.

### P7-B07 — Consent, Demo import and account transitions
**Depends:** B06. **Risk:** high.

1. Finish the first-sync disclosure with an accurate list of uploaded campaign/profile content and no end-to-end-encryption claim.
2. Let the user select local campaigns/saves to copy into their cloud namespace; preserve originals.
3. Handle active campaigns at sign-in/sign-out explicitly and cancel stale tasks.
4. Add cloud opt-out and clear retained-local-copy behavior.

**Acceptance:** login alone sends no campaign payload; cloud opt-out stops queue transmission; import retries do not duplicate selected saves. Switching providers does not assume identical accounts.

### P7-I01 — Integrated accessibility, localization and compatibility gate
**Depends:** A03, A07–A11, B07. **Risk:** high.

1. Run full check and browser suites on the integrated commit.
2. Cover five languages × both themes with focused long-label/contrast checks; verify System separately.
3. Test target selection → assessment → fuel purchase/contract → war → tactical orders → victory/news.
4. Test Demo → local save → explicit cloud copy → offline edits → newer remote prompt → resolution.
5. Round-trip old/current saves with fixtures covering factions, annexedBy, welfare, contracts, wars and optional fields.

**Acceptance:** no removed tests or reduced assertions to maintain a green count; baseline scenarios plus new regression cases pass. Test counts are recorded as observed. Known exclusions have reasons and owners.

### P7-B08 — CI-gated Pages preview and security headers
**Depends:** I01. **Risk:** high.

1. Add a deploy job dependent on successful checks/browser tests, with least-privilege deployment secrets.
2. Build with correct environment, retain exact SHA/artifact provenance, and disable independent auto-publication.
3. Configure SPA fallback, asset caching, CSP and static/worker header handling.
4. Deploy authorized preview only; keep production gated to Alper's chosen release branch.

**Acceptance:** a failed CI run produces no deployment; preview serves nested routes and auth callback, real JS MIME types, working map workers/audio and expected response headers. No secrets in dist.

### P7-B09 — Offline shell and update recovery
**Depends:** B08. **Risk:** medium.

1. Audit existing offline shell support; add minimal versioned app/asset caching only if absent.
2. Exclude auth/API/cloud responses and sensitive callback requests from caching.
3. Provide a safe update notification; do not forcibly reload an active campaign.
4. Verify additive Dexie upgrades and prior-build rollback behavior.

**Acceptance:** after a successful online visit, offline reload can start Demo and load/save locally. Cold uncached visits show a truthful limitation. Old cached chunks, queued saves and an interrupted update recover without data loss.

### P7-B10 — Provider configuration, domain and production readiness
**Depends:** B08, B09. **Risk:** high. **External prerequisite:** credentials/domain authority.

1. Prepare provider-specific configuration checklist for Apple, Google and Discord, including Supabase callback and application redirects.
2. Validate staging live OAuth with test accounts; record Apple rotation ownership.
3. Prepare apex/www DNS/TLS/canonical routing and production environment values.
4. Prepare release-branch selection, quota/backup/restore runbook and deployment rollback artifact.
5. Obtain the final production release decision only after the candidate and evidence are reviewable.

**Acceptance:** live provider tests are distinguished from mocked tests; domain/callback return paths pass; staging cannot access production saves. If external access is missing, report exactly which configuration is blocked and complete all available preparation.

### P7-R01 — Release and implementation handover
**Depends:** B10 and final green candidate CI. **Risk:** high.

1. Follow docs/RELEASING.md for the selected version; do not predeclare a release number.
2. Update README, changelog, playtest, roadmap and architecture/cloud notes with real evidence.
3. After authorized publication, smoke-test production Demo, OAuth, manual sync, refresh/deep links and previous-save compatibility.
4. Deliver commit/branch/CI/deployment identifiers, completed ticket matrix, limitations and rollback instructions.

**Acceptance:** publication is only claimed after verification. No direct main push, unauthorized integration merge or silent production-branch switch.

## 5. Verification matrix and release gates

| Boundary | Required evidence |
| --- | --- |
| Simulation | Existing invariants, war declaration parity, no cost deduction on invalid/double/stale orders, fuel settlement conservation |
| UI/navigation | Every launcher and return route; topmost focus/Escape; interactive tutorial; desktop and phone layouts |
| Save compatibility | Local/cloud load-save-load for schemas 12–17; invalid and future schema rejection; optional fields preserved |
| Offline reliability | No config, signed-out, expired token, disconnected mid-upload, restart, concurrent tabs, disk/quota failure |
| Cloud security | Real RLS/grant/RPC tests for two users + anonymous; owner spoofing; direct-write bypass; malformed payloads |
| Cloud consistency | Two devices, revision race, clock skew, duplicate operation, newer local sequence, deletion tombstone |
| Appearance | Five languages, dark/light/system, long text, 200% zoom, keyboard, reduced motion and readable map overlays |
| Deployment | Exact CI-passed SHA, SPA callback/deep links, missing asset behavior, headers, secret scan, offline/update/rollback |
| External OAuth | Live Apple/Google/Discord staging checks and documented production setup; expiry/rotation responsibility |

New browser cases may make the 25-minute existing CI timeout tight. Measure duration first; split test jobs/shards only when necessary, preserving the complete suite and its deployment dependency. Do not relax coverage or mark intermittent failures passed.

## 6. GPT-Sol working protocol

Implement tickets in the order printed above. Within each ticket: inspect current files → add a meaningful failing regression where applicable → make the smallest coherent change → validate → record evidence and remaining risk.

Each completion report includes:
- Ticket ID and observable behavior delivered.
- Files changed and why.
- Commands/scenarios run, actual results, and unavailable verification.
- Save/schema/ownership impact.
- Branch and commit when created; no push/merge/deployment claim without evidence.
- Next ticket and any concrete external prerequisite.

Only @supabase/supabase-js is preplanned as a new application dependency. Compression/tooling additions require a documented capability gap; avoid a new UI library, router, icon pack or state framework. Do not fold unrelated audit issues into these tickets.

## 7. Sources and traceability

Repository sources were read through authenticated GitHub access on the requested branch. Branch URLs are navigational references, not immutable commit proof; P7-00 must record the exact commit.

- [HANDOFF-ASTRA.md](https://github.com/Cryptovis/gamev2/blob/dev/clear-command-090/docs/HANDOFF-ASTRA.md)
- [CLAUDE.md](https://github.com/Cryptovis/gamev2/blob/dev/clear-command-090/CLAUDE.md)
- [Architecture contract](https://github.com/Cryptovis/gamev2/blob/dev/clear-command-090/docs/ARCHITECTURE.md)
- [Target country hub](https://github.com/Cryptovis/gamev2/blob/dev/clear-command-090/src/ui/panels/TargetCountryModal.tsx)
- [Target briefing view models](https://github.com/Cryptovis/gamev2/blob/dev/clear-command-090/src/ui/panels/targetBriefing.ts)
- [Local persistence](https://github.com/Cryptovis/gamev2/blob/dev/clear-command-090/src/persistence/saveGame.ts)
- [Industrial contracts](https://github.com/Cryptovis/gamev2/blob/dev/clear-command-090/src/engine/systems/industrialMarket.ts)
- [Supabase OAuth API](https://supabase.com/docs/reference/javascript/auth-signinwithoauth)
- [Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Supabase redirect allowlists](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Apple setup and secret rotation](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Cloudflare Pages Direct Upload with CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
- [Cloudflare Pages serving and SPA behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/)
- [Cloudflare Pages headers](https://developers.cloudflare.com/pages/configuration/headers/)
- [Cloudflare Pages redirects](https://developers.cloudflare.com/pages/configuration/redirects/)

Provider/platform documentation supports capability and configuration statements. Component roles, revision protocol, bytea recommendation, budgets, milestones and ticket design are architectural decisions proposed here, not claims made by those documentation sources.


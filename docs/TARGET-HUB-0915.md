# Phase 6.1 — Target-country diplomatic hub (0.90.0-playtest.15)

Owner: **Claude (Opus 5.5)**. 13 October 2026. Base: playtest.14, GitHub `5971fa7` (CI 38326506368 completed/success). Branch `dev/ron-living-world-0915`. Alper authorized package 6.1 of the "Living World & Executive" handoff (its Phase 6 is the visual/UX track; the Closed Beta acceptance step in [ROADMAP](ROADMAP.md) keeps its own authorization). No file under `src/engine/`, `src/domain/`, `src/persistence/` or `src/map/` changed; save schema 17 and game numbers are unchanged.

## Problem

Selecting France or Qatar on the map opened the same 14-section panel as the player's own country, so players confused their nation with the one they were looking at.

## What the player sees

| Area | Content | Source |
|---|---|---|
| Header | Player flag ⇄ target flag (gently waving), "France · Paris" | `flagEmoji`, `src/data/capitalNames.ts` (201 capitals generated from the Natural Earth comments in `capitalPositions.ts`) |
| Status bar | Treasury, GFP rank (capability score when unranked), population, relation mood + stance + index with a meter | `targetHubSummary` → `relationshipIndex` / `relationshipStance` |
| War banner | Shown only during a war with the target; opens the war command | `state.wars` |
| Eight cards (4 × 2, 2 × 4 on phones) | Open Embassy, Trade Pact, Non-Aggression Pact, Defensive Alliance, Impose/Lift Embargo, Economic Aid ($1/5/10B), Diplomatic Mission, Espionage Operation | `targetHubActions` |
| Footer | "Full Dossier" opens the existing country panel | `CountryWorkspace` |

Card states: **ready**; **active** (green border and ✓, e.g. Türkiye–France alliance at the start; red for an embargo in force); **locked** (grey art, 🔒 and the engine's reason). A pending or recently answered embassy/trade letter turns the card into a link to the proposal tracker, as in the Full Dossier.

## Commands and rules

| Card | Typed command | Enabled by |
|---|---|---|
| Open Embassy | `diplomacy/request` · `embassy` | `diplomaticProposalStatus` |
| Trade Pact | `diplomacy/request` · `trade_pact` | `diplomaticProposalStatus` |
| Non-Aggression Pact | `diplomacy/signNonAggression` | `agreementEligibility` |
| Defensive Alliance | `diplomacy/signAlliance` | `agreementEligibility` |
| Embargo | `diplomacy/toggleEmbargo` | not at war |
| Economic Aid | `diplomacy/giftTreasury` (1, 5 or 10) | not at war, treasury ≥ amount |
| Diplomatic Mission | `diplomacy/improveRelations` | `diplomaticMissionStatus` |
| Espionage Operation | `intelligence/launch` · `gather_intelligence` | no identical operation active (cost checked by the engine) |

Every card goes through `dispatchWithReceipt`, so the engine validators and receipts apply, and through the same `StrategicDecisionModal` review as the Full Dossier (auto-approval settings are shared). Espionage has no review kind and shows its receipt directly, as the intelligence tab already did. The embassy card now uses the typed `diplomacy/request` command instead of the store's direct `openEmbassyWith` path.

## Routing

`workspaceForSelection` decides: the player's nation → full panel; a foreign nation → hub; "Full Dossier" → full panel for that country; a tab request from another window (`navigate('diplomacy', id)`, e.g. "open partner diplomacy") → full panel. Choosing another country from the full panel's own country list keeps the full panel (`CountryPanel` gained an optional `onBrowse` callback). The dossier choice is component state: never saved, ended when the workspace returns to the map. While a child window opened from the hub is in front, the hub stays mounted but hidden and returns afterwards.

## Presentation

Light, high-contrast card theme (ink `#18212b` on ivory; every text size meets WCAG AA), Georgia headings like the country panel, 190/160 ms entry. Reduced motion removes all hub motion; the "Low effects" option stops the flag motion. At 390 px the hub has no horizontal scroll.

## Translations

`src/i18n/uiCatalog0915.ts` adds every new label in tr, es, zh and ru, three previously untranslated diplomatic-mission engine reasons, and reviewed replacements for machine translations that the hub shows prominently (stances such as TENSE → ru "ДЕСЯТЬ", COLD → tr "COLDU"; Open Embassy → es "Embajada abierta"; embargo labels; Turkish "Ticaret Paktı" and "Saldırmazlık Paktı" in title case like the other cards). These replacements apply game-wide.

## Validation

- `src/tests/targetHub0915.test.ts` (15 tests): routing rules; eight cards in order with typed commands aimed at the target; enablement equals the engine validators; every card command runs through `executeCommandResult` without changing the schema; aid changes treasury and relations; espionage starts one operation and then reports it active; a sent embassy proposal becomes a tracker link; war locks embargo and aid; summary matches the engine; building the hub never mutates state; 201 capitals; every catalog key and every card title/subtitle (peace and war) translates in four languages.
- `e2e/targetHub0915.spec.ts` (3 scenarios: Turkish 1440 px, English 390 px, espionage): opened from World rankings, no country panel, capital and four stats, eight cards, alliance tick, Turkish labels, no horizontal overflow, aid through the strategic review raises relations, Full Dossier and its country list, return to rankings, Escape, the player's nation still opens the full panel.
- Updated browser specs: `commandWindows0905` and `fluidCommand0910` open a country from the rankings and now expect the hub (frame position, scroll and focus return are still checked). The other specs that switch countries through the full panel's list are unchanged by design.
- CI 38364367517 (GitHub-hosted Chromium): Vitest, TypeScript, production build and all Playwright scenarios passed on the first run; CI 38366955805 passed again on the release tree after two style fixes (darker gold for AA contrast, card art clipped on phones, Turkish pact title case).

## Known limits

- The hub shows the same treasury and population as the country panel did; it does not apply intelligence fog (unchanged behavior).
- The espionage card always launches *Gather Intelligence*; the other three operations remain in the Full Dossier's intelligence tab.
- Card artwork reuses the existing illustration atlases; dedicated 3D-style card art belongs to package 6.4.

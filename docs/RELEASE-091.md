# 0.91.0 — The Living World & Executive Release (Claude, Phase 6 close-out)

Implementation: **Claude (Sonnet 5.5)**. Owner: **Alper**. Branch `dev/ron-release-091` (from `dev/clear-command-090` at playtest.19). Save schema 17, simulation and game numbers unchanged; no file under `src/engine`, `src/domain`, `src/persistence` or `src/map` changed; dependencies unchanged.

## What changed

### Task 0 — macOS case-collision hotfix
`src/ui/panels/executiveDesk.ts` collided with `ExecutiveDesk.tsx` on case-insensitive file systems (APFS), which gave TS1149 / TS2305 and a white screen. The model is now `src/ui/panels/executiveDeskModel.ts`; the imports in `CommandRails.tsx`, `ExecutiveDesk.tsx` and `executiveDesk0916.test.ts` follow. Regression test: no two source files may differ only by case, and the model file name is fixed.

### Task 1 — top bar
- The cramped three-line live-flow block beside the portrait is gone; the profile shows the leader's name, title and the day.
- The left island uses the clock card's glass style (`linear-gradient(135deg,#24373df2,#162730f2)`, champagne border `#a991625c`, soft shadow) on the island and on every metric card.
- Five cards: **Treasury** (balance and, under it, ▲/▼ amount per day), **Food** and **Oil** (stock, with the daily change under it), **Approval** and **Stability**. The trend sits inside its own card and never repeats the label. The amounts come from `liveDeltas()` (Phase 6.5), which only formats numbers the engine already keeps.
- Food and Oil show stock numbers; units are not labelled yet (listed in the handoff).

### Task 2 — Target Country modal
- Footer: a red **War Planning** pill next to **Full Dossier**. If a war is already active it opens that war's command window instead.
- **War Planning** is a sub-view of the hub (header kicker `WAR PLANNING`, back button `← Diplomatic Hub`): an ivory card holding a dark-slate glass briefing with a **power-ratio bar** (our share, with a favourable/balanced/unfavourable label), an **air badge** (superiority/contested/inferiority), **logistics readiness** (our supply, enemy supply, fuel against the 14-day requirement), the engine's own reason when war cannot be declared, and a full-width **DECLARE WAR ON [COUNTRY]** button. The button opens the same strategic review as before, and `declareWar` is the existing store action. Hover and focus states on every button; motion is removed by reduced motion.
- **Full Dossier** is a four-tab read-only sub-view (Overview, Economy, Military, Policies & Laws) with the same back button. The complete 14-section panel is still available from it with **Open complete country panel**, so nothing was removed.
- Escape returns from a sub-view to the hub first; a second Escape closes the hub.
- Figures come from `src/ui/panels/targetBriefing.ts`: `getWarPreview`, `warDeclarationStatus`, `warFuelReadiness`. The only local logic is the three colour bands.

### Task 3 — version
`package.json` and both root records in `package-lock.json` are `0.91.0`. The entry screen and the setup wizard read the package version; the entry badge carries the release name as its tooltip.

### Task 4 — Help
Three tabs on the shared section menu: **Briefing** (brand heading, strategic situation card with day, treasury, approval, stability, wars, the next three goals, up to four urgent risks, then the first-days shortcuts and the war roadmap), **Programs** (the existing national-program cards and review dialog) and **Questions** (search and FAQ). `guidedCommand.css` styles it. The goals list now lives in `strategicObjectives()` in `src/store/commandIntelligence.ts`, shared by the GOALS rail and Help.

The brief asked for the "modern HelpPanel design from the Cursor backups". No such backup exists in the repository or on the build machine, so the three-tab design was written from scratch to that description.

### Task 5 — feature tour
The engine limits the tutorial to steps 0–9 (`setTutorialStep`), and changing the engine was out of scope, so the four new cards are a **UI-only tour** (never saved): live trend arrows, Target Country Hub and War Planning, Policy cards and the factory window, Executive Desk. It starts after FINISH on the ten-step tutorial and from **Help → Replay feature tour**; every card has SKIP, BACK and NEXT, Escape ends it, and it has no shade, so nothing is blocked.

### Task 6 — micro fixes
Resource alerts read **Oil · Import Needed** (title-cased from the engine's `IMPORT NEED` status; the engine string is unchanged). The DIPLOMACY rail label is `white-space: nowrap`.

### Task 7 — handoff
[HANDOFF-ASTRA.md](HANDOFF-ASTRA.md): phases 1–6.5, schema 17, test counts, and the cloud tasks for Astra (Supabase Auth with Apple/Google/Discord, Cloud Save, Cloudflare Pages for ruleofnations.com).

## Tests

- `src/tests/release091.test.ts` (13): case collisions, model file name, version and schema, war-planning view against the engine, bands, dossier figures finite for 40 countries, shared objectives, alert wording, feature tour translations, the new catalog in four languages.
- `e2e/release091.spec.ts` (5 scenarios): War Planning at 1440 and 390 px (bar, badge, three meters, back and Escape, no overflow), Help tabs, feature tour, top bar.
- Existing tests changed (each by necessity of the requested behaviour):
  - `e2e/compactWorkspaces0908.spec.ts`: the top bar has five `.top-metric` cards instead of two, and the island limit of 780 px became "under 960 px and ending before the clock island" (measured 788–910 px with five cards at 1440 px in en, es, zh and ru, and 852 px for tr at 2048 px).
  - `e2e/livingWorld0919.spec.ts`: the live counters are read from `.top-metric .live-delta` because the old `.live-flows` block was removed.
  - `e2e/targetHub0915.spec.ts`: Full Dossier now opens the in-hub sub-view; the test goes back, reopens it and uses "Open complete country panel" to reach the old panel before the unchanged remainder of the scenario.
  - `src/tests/executiveDesk0916.test.ts`: import path only.

## Validation


826 unit tests / 91 files (813 earlier + 13 release tests; counted from the test sources, because the CI log was not readable here), TypeScript and production build passed; the 365-day long-run invariant passes. All 191 production-browser scenarios passed on GitHub-hosted Chromium (186 earlier + 5 release scenarios; CI 38429509251, browser step 16.1 min). Earlier runs on this branch failed and were fixed: the first release test used Node types the project does not have (now `import.meta.glob`), and 7 browser scenarios failed once: the five top-bar width checks (the island is up to 910 px wide with five cards, so the old 780 px limit became "under 960 px and ending before the clock island") and my two new Help scenarios (they now close the country panel first). The CI job timeout was raised from 20 to 25 minutes because the whole job takes about 19.8 minutes. Nothing ran locally: the npm registry is unreachable in this session, so GitHub Actions was the verifier. Screenshots and the visual judgement are still to do.


## Manual acceptance route

1. Top bar: no three-line block beside the portrait; five glass cards; ▲/▼ amounts under Treasury, Food and Oil; the DIPLOMACY label stays on one line in every language.
2. Select a foreign country: War Planning and Full Dossier side by side. War Planning shows the ratio bar, air badge and logistics; Escape returns to the hub. Check that the red button is armed only when the engine allows war, and that it asks for review.
3. Full Dossier: four tabs, back button, and "Open complete country panel" for the old panel.
4. Help: Briefing / Programs / Questions; Briefing lists risks and goals. Replay feature tour: four cards.
5. Supply alerts: "Oil · Import Needed".
6. Repeat in Turkish and at 390 px.

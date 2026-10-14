# 0.94.0 — Audio, UI & Character Perks

Development branch: `dev/ron-phase7`. Baseline: `0dac37c70ba22bf10f6d780514e72cd69666540e`. This is a development release; no merge into main is claimed.

## Delivered

- The owner-supplied Diplomatic-Tension2.mp3 replaces ambient-command.mp3; its staging filename is removed. Audio selects MP3 before the existing WebM codec fallback. Playback remains gesture-unlocked, bounded and independent of simulation.
- Topbar overview, metrics, clock and clock-speed wrappers and the Map/Help cluster are transparent. Leader, metrics, speed/date and national flag retain independent semantic surfaces. Light uses a warm ivory radial viewport and a soft globe shadow.
- Sitrep toasts sit at the bottom left. Their observed height reserves space for camera and command controls on narrow or short viewports. Action cards and modal controls have hover/focus elevation; reduced motion suppresses movement.
- Country-drawer religion, ideology and military-rank badges use Light semantic surfaces. The close button has a fixed 44px target and one accessible label, without the overlapping native tooltip.
- The setup Game menu action is inside the wizard footer. The selected portrait preview aligns with its grid, remains available on mobile and shows the localized perk. Confirmation previews opening bonuses through the engine.

## Archetype contract

`leadership.archetype` is optional metadata under Schema 17. Old records without it stay neutral; no migration, required-field or schema-number change. New campaigns set it once, before economic seeding. Loading or changing a portrait never reapplies opening bonuses or changes the active perk. Invalid optional role values are rejected by save validation.

| Role | Active perk |
|---|---|
| Executive / Industrialist | Factory equipment, steel and manufacturing output +10%; daily tax revenue +5% |
| Reformer / Civil Harmonizer | Positive stability recovery +10%; opening approval multiplied by 1.08, capped at 100 |
| Diplomat / Global Envoy | Opening bilateral relations +15 within existing bounds and war rules; own embassy setup fee −20% |
| Commander / Supreme Marshal | Recruitment batch intake +10%, with real personnel costs/population limits; pilot-training rate +10%; defensive combat power +15% |
| Chancellor / Fiscal Architect | Opening treasury +20%; ongoing national debt-service interest −15% |
| Governor / Civic Planner | Civilian food and consumer water consumption −15% |

The current personnel command completes immediately; recruitment speed is represented by intake per command plus faster existing pilot training. Consumer water is the model's consumed civilian industrial good; no new commodity is invented. Chancellor's unspecified interest reduction is set to 15% and shown in all five languages; signed sovereign-credit APRs are not rewritten.

Canonical civilian portraits select their named role. Other military/aviator portraits inherit Commander; industrial/labour portraits inherit Executive. New campaigns give the chosen player's country its perk; other countries retain neutral modifiers. Shared engine previews and command validators apply costs, supplies and defensive power, including tactical rounds. RNG uses the existing seeded stream; no new random calls are introduced.

## Validation

- `npm run check`: **909/909 unit tests in 97 files**, TypeScript and Vite production build passed (zero build errors).
- The 365-day long-run invariant passed before gameplay changes and in the final full check. The release adds 22 focused role/version/localization regressions, including seeded combat, save round trips, neutral old records and portrait immutability.
- **8/8 targeted production-browser scenarios passed** in 40.7 seconds: five-language portrait/perk flow, desktop/mobile HUD/globe/drawer/toast geometry and toast focus/expiry. Linux Chromium with software rendering; no full browser suite or native macOS run was performed.
- `git diff --check`, case-fold audit of 631 existing paths and release Markdown/version consistency checks passed. The command MP3 exactly matches the supplied soundtrack blob; the staging file is absent.
- Appearance defaults to Light; appearancePhase7.css and migration steps are unchanged.

Existing Vite large-chunk and mixed static/dynamic save-module warnings remain. Full browser and native macOS suites were not run locally for this release.

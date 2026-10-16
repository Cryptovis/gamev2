# Phase 9.4 deviations from the blueprint (T6 to T16)

Each item says what the blueprint asked for, what was built, and why. Nothing here touches engine/ or simulation/, and no engine RNG is consumed.

1. Class names. The blueprint's `landing-*` names are not used; the styles use an `l94-*` prefix (and `lw-*` for the wisdom widget) so nothing collides with the retired `.entry-*` rules. Appendix C test ids are unchanged.
2. Focus trap. No `useFocusTrap` hook was written. The drawer and the release notes use the existing `ManagedDialog` / `useWindowLifecycle`, which already trap focus, handle Esc, manage layers and return focus. `ManagedDialog` gained an optional `testId`.
3. Registration check. The math challenge is removed from every guest path (`ensureGuestSession` never calls it) and kept on account registration only.
4. Language control. The dock always shows the five languages as a segmented group of buttons, not a select at narrow widths. The short labels fit a 320 px dock.
5. Dock position. The dock sits at the top of the screen on every size.
6. Ambience. There is no landing-specific ambience track. The dock toggle binds to the existing global mute (`trp-audio-v1`) through `useAmbiencePreference`.
7. Preloader assets. The blueprint names "14 national SVG emblems". No such set exists. Stage 2 decodes the real command-screen and ministry assets that ship in `public/assets` (cover, three atlases, six ministry SVGs, four leader atlases).
8. Preloader and the engine. Stage 1 validates the loaded state structurally (countries present, player country known, day finite). It does not run the engine, so the 120-day trajectory is untouched.
9. Reducer. The T8 reducer keeps a failed load on the loading screen with its error, and `RETURN_TO_MENU` goes back to the landing screen. The blueprint sent a failed load straight back.
10. Template keys. Appendix A's "Day {day}" and "Saved {time}" are not catalog keys: a `{0}` template key would match unrelated strings across the game. The save card builds those labels in code from per-language maps and `Intl`.
11. Release notes carry no date, only the version, so they never go stale.
12. New campaign from inside the game now returns to the landing screen, not the old setup screen. The options-menu text "return to the campaign setup screen" is therefore slightly stale.
13. Setup under the shell. `CampaignSetup` takes `startImmediately`; the shell passes it so the real preloader replaces the wizard's fixed-time loading screen. Without it, the old behaviour is kept.
14. Frame line. The decorative frame can cross the footer note when the page scrolls, so the note has a near-opaque chip.
15. z-index. `.landing094` uses the literal 10000 (the value of `--layer-entry`) so its token test stays self-contained.

## Not done in T6 to T16 (belongs to T17)

- Several e2e specs still use the old markup (`data-entry`, `.load-previous`, `.entry-*`, `.wizard-leadership-quote`). They need an `enterAsGuest` helper and the new test ids.
- `e2e/landingExperience.spec.ts` is not written.

## What could not be run here

The sandbox has no node_modules and the npm registry is blocked, so vitest, `tsc` with the real dependency types, `vite build` and Playwright were not run. Tests were run through a small stand-in for vitest in headless Chromium, bundling the real source with esbuild; the store, IndexedDB, zod-heavy modules and the setup wizard were stubbed for the shell tests. Antigravity's local run is the first real one for these tasks.

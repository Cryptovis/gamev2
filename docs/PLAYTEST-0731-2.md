# 0.73.1-playtest.2 verification

Built on commit 34d8d490b4b3d78437ffa13a545ca996e095b4ab on dev/living-world-050.
The handoff described 0.73.0, but live GitHub already contained playtest.1.

## Automated checks

- Clean npm ci succeeds after repairing missing optional lockfile entries.
- npm run check: 29 test files, 88 tests; TypeScript and production build pass.
- Added regression coverage for mandatory high-risk review, duplicate treaty charges, exact resource aid preview, bloc costs, microstate anchors, visible marker targeting and selected-label clipping.

## Browser checks

Local Chromium automation at 1440 x 900 verified:

- Andorra focus and actual pointer selection in Globe and Flat.
- Invisible hit targets remain transparent when selected.
- Country/microstate/ocean text rectangles do not overlap through successive zoom levels.
- Flat zoom retains the focused map center.
- Trade Pact preview does not mutate treasury before confirmation.
- Modal pauses speed 3 and restores it on cancel/confirm.
- Checking auto-approval then cancelling does not save the preference.
- Trade Pact confirmation charges exactly $5B.
- Alliance, Embargo and War still show mandatory review with stale skip flags injected.
- High-risk dialogs have no auto-approval checkbox.
- Shift+Tab wraps focus; Escape cancels; cancelling War creates no conflict.
- Label-size slider changes the setting to 140% while preserving label collision suppression.
- No browser console errors or uncaught page errors in this run.

Screenshots were visually reviewed for Globe, Flat, the War confirmation and MAP controls.
The headless Linux font set did not render emoji flags; flag appearance in the user's browser remains part of playtest.

## Remaining release gate

User acceptance on StackBlitz is still required before merging PR #2 to main.
This focused smoke test is not an exhaustive campaign or every-resolution playthrough.
Save schema stays v12 and existing 0.73 saves remain compatible.
The existing main bundle warning remains (~692 kB uncompressed).

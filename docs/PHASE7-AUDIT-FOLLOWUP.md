# Phase 7 audit follow-up

Baseline: `29958f97a5b66c1c54d83683ba792501430c42f1`, branch `dev/ron-phase7`.

## Correctness fixes

- Autosave checkpoints remain deduplicated under StrictMode. Visibility/pagehide flushes now refresh the captured snapshot even when that campaign day was already saved. Writes are serialized so an older pending checkpoint cannot overwrite a newer flush. This is a best-effort browser lifecycle flush, not a guarantee against abrupt process termination.
- Domestic crude-oil guidance reuses the resource, refinery and energy engine steps, scoped to the selected country. A raw +0.10/day surplus with ten fully utilized refineries correctly becomes -0.45/day before power-plant use. Disabled oil plants consume nothing. The read-only estimate excludes conditional trade/contract deliveries and combat; it is not an exact next-tick prediction of all systems.
- News filters recognize real engine prefixes including DIPLOMATIC OFFER, PEACE, EXCHANGE, DEVELOPMENT, INFRASTRUCTURE and INVESTMENT. Exchange news is also visible under Economy. Military alerts route to Wars, sanctions to Diplomacy and domestic alerts to All.
- Toast hover and focus pauses are independent; leaving with the mouse does not cancel keyboard focus ownership. Removing the last toast clears pause state so the next notification can expire.

## Bounded performance work

Tactical availability now stops at the first valid target and skips target scans when the round is already blocked. Replacement filtering is done once. All engine validators, reasons, costs and RNG behavior remain authoritative. Forty local old/new comparisons covered all five player units, empty/nonempty queues, current/stale rounds and stocked/empty fuel; returned previews were identical.

On the same 80-cell fixture in one headless Node process, 400 calls after warmup averaged 2.929 ms before and 0.985 ms after. These are local helper timings, not browser FPS or native-device guarantees. Two unused per-render HUD list calculations and obsolete map glyph metadata were removed.

The larger bundle, hidden retained panels, six unreachable source files, unused binding warnings and CSS cascade consolidation remain separate profiling/cleanup candidates. Retained workspace tab/scroll behavior and WebContainer import compatibility need explicit validation before broader changes.

## Observed verification

- `npm run check`: 96 test files, **887/887 tests passed**; TypeScript and Vite production build passed.
- Initial focused correctness suite: 58/58 passed. Focused tactical follow-up: 26/26 passed.
- Production Chromium: **2/2 targeted scenarios passed** in 22.9 seconds (toast lifecycle and desktop tactical draft/round flow). No full browser suite was run for this follow-up.
- `git diff --check` passed. Tracked-path case-fold audit found no collisions.
- Schema 17, domain save types, migrations and validation remain unchanged. No simulation RNG or gameplay formula/threshold changes. No new user-facing copy.
- Light default and appearancePhase7.css are unchanged. Existing Vite mixed-import and large-chunk warnings remain.

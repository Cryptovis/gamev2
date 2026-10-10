# 0.90.0-playtest.1 — Clear Command

Owner: **Codex**. Branch: `dev/clear-command-090`. Starting release: 0.89.0-playtest.7 (`8322a3f`). Save schema: 17, unchanged. Existing schema-17 saves resume; no new campaign required.

## Executed validation

- Baseline 365-day invariant passed before simulation edits.
- `npm run check`: **572 unit tests / 72 files passed**, including the annual invariant, followed by TypeScript and production build.
- Focused Playwright: **9 passed**, covering Affairs in en/tr/es/zh/ru, 1440px/390px controlled-territory navigation and reviewed preparation/cooldown, fresh quote rotation with fixed randomness, and keyboard map controls.
- Desktop/mobile Affairs and country screenshots inspected; disabled button contrast, the war-action selector and the History translation were corrected during visual review.
- Full production-preview Playwright suite: **84 passed (7.5 minutes)**. Final CSS/label adjustments are rechecked in the nine focused scenarios.
- The prior 0.89.7 CI passed in about 9m23s (run 38034143515). With nine more browser scenarios, the job timeout is raised from 10 to 15 minutes; no checks are removed.
- GitHub CI is separate and starts on push. Local runs use Node 24 and Chromium; CI uses its configured Node 22 environment. StackBlitz itself is not exercised by these local browser tests.

## Manual acceptance route

1. Sign in → Demo → New game: artwork has one logo and a short tagline. Reopen the wizard: quote changes; step navigation keeps the same quote.
2. Resume → nation → Greece → Affairs: Overview explains independent-country limits; Foreign political influence shows current values, required thresholds and explicit blockers even with ample funds. No foreign integration preparation button.
3. On a controlled territory: Administration has relief/elections/transfer/candidate actions; Integration shows all thresholds and preparation. One reviewed preparation costs $0.25B and starts a seven-day cooldown. The menu stays outside the scrolling content.
4. Country dossier: Affairs matches the other menu buttons; one Trade entry; full-width red war-planning/readiness entry; identity values wrap.
5. HUD: DIPLOMACY label, visible selected state without a yellow dot. Market retains its six sections and resilient artwork.
6. Focus map: arrows move, +/− zoom, Home returns to your country, Enter opens the dossier. Modal focus prevents map shortcuts from hijacking dialog input.
7. Insufficient council aid funds: precise $5B notice, unchanged influence and council history. A conquered country's remaining wars close without another round.

## Limits and next work

- [QA reconciliation](QA-RECONCILIATION-090.md) is a current-code assessment, not endorsement of all 0.40 findings. Resource balance and performance require measurements before further changes.
- Translation catalogues remain a large eager chunk (build warning); new messages have all five languages, but a complete linguistic/override audit is still open.
- Other long windows and specialized victory/campaign-end surfaces need gradual adoption of shared navigation/accessibility.
- Quotes avoid immediate repeats when local storage is available; denied/cleared storage falls back to random selection.
- No online authentication, multiplayer, new renderer or sound engine. V3 remains the complete-playability milestone.

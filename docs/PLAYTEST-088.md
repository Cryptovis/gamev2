# 0.88.0-playtest.1 — Politics & Victory

Branch: `dev/politics-victory-088`. Base: 0.87.0-playtest.1. Source: Phase 2 of the [0.83 audit](AUDIT-0.83.md): B9, E1–E5.

## Checks run

- GitHub CI on `dev/politics-victory-088` passed: Vitest unit suites, `tsc --noEmit`, production build and the Playwright browser scenarios.
- New unit suites: `aiWar088` (shared declaration rules, AI motives and limits, AI withdrawal, Council ceasefire, liberation, player as defender including concession ending the campaign, allies joining), `politics088` (factions, contested elections with narrow wins and losses, AI change of government, legitimacy and crises, warn-then-coup, AI parity, concessions, saves), `eventsVictory088` (catalogue and translations, old event kinds still resolving, GDP-scaled costs, chains, advisor pacing, a headless year of events, each victory path, sandbox continue, saves).
- Headless measurements (4 years, default player Türkiye unless noted):

| Measure | 0.87 | 0.88 |
|---|---|---|
| AI wars started per year | 0 | 3–6 |
| AI elections held over 4 years | 0 (all fell on day 1461) | 156 (about 8% lost) |
| AI coups over 4 years | 0 | 1 |
| Events per year | 4.75 | 7.25 |
| Advisor pop-ups per year | ~42 | ~11 |
| Scripted moderate player | no victory condition | Regional or Economic Leadership in about 4.6 years |

## How to playtest

1. Play a few years and watch the news for AI wars and ceasefires.
2. Provoke a stronger hostile neighbour (or load a save with hostile relations) and check the defender flow: the pause notice, War Command as defender, HD War as defender and the result of withdrawing.
3. Open the domestic window's Politics section. Change tax or ministry budgets and watch faction satisfaction and the election forecast move.
4. Start as an autocracy (e.g. Russia) and play badly to trigger a regime crisis; try each response.
5. Note which events appear and whether a chain continues after your choice.
6. Open Goals and follow the progress of the three victory paths. On victory, try "Continue in sandbox".

## Known limits

- AI wars are short and usually end in conquest; the AI targets the player only when relations are already hostile.
- AI approval drifts high, so AI governments rarely lose and AI coups are rare.
- Democracies have no unrest path yet.
- Event food and fuel amounts are flat.
- The loss overlay uses one generic text for every loss reason.

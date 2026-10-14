# Playtest 0.99.1 — Slice 8.2

Branch `dev/ron-phase7`; version 0.99.1; Schema 18.

`npm run check`: **1073 tests / 105 files**, TypeScript and Vite production build passed with zero errors. Existing bundling warnings remain.

47 new regressions (`organizationVoting099.test.ts`):

- UNSC 8/15 fails, 9/15 passes, each P5 no vetoes 14/15 yes, each P5 abstention permits adoption; procedural exception and multiple-veto ordering.
- Actual NATO consensus charter and one objection; missing responses are not consent.
- General Assembly quorum, abstentions, ties, strict/inclusive comparison, eligible/cast denominators, unanimity charter exception.
- Weighted quotas, exact large-integer cross-products, state/population majority and four-state blocking minority.
- Foreign/invalid votes, malformed/non-finite snapshots, inherited body names, nested NaN payloads, sequence/date overflow.
- Identical player/AI costs, explicit AI proposers, observers, legacy bodies, protected P5, finite influence, frozen payload/rule/electorate, quota availability, command receipts and changing votes before deadline.
- Membership admission/observer/suspension/expulsion, legacy-roster reconciliation, standing changes, typed timed sanction persistence/expiry, delayed execution, target invalidation and effect collisions.
- Pure frozen-input execution, idempotent processing, shared AI ballot validation, once-only RNG draws, closing-day refusal and identical tick after save/resume.

The check includes all prior 12–18 migration and real Dexie checkpoint regression suites, plus the 365-day invariant. No new runtime dependency was added. Production-browser/native checks were not rerun for this engine-only slice.

Scope: foundation voting and resolution state transitions. Channel-level sanction enforcement, new finance mechanics, full legal charter policies, autonomous proposal agendas, elected-seat replacement and the new UI remain later work. [Release record](RELEASE-0991.md).

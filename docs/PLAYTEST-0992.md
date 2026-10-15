# Playtest 0.99.2 — Global Finance & Monetary Programs

Branch: `dev/ron-phase7` · Schema 18 · Slice 8.3.

## Verified

- `npm run check`: 1131/1131 tests, 106 files; TypeScript and Vite passed with zero errors.
- 58 financing regressions: funded IMF/World Bank/NDB/IDB boards, initial reservation/drawdown, weighted approval, membership and borrower consent, grants, competing capital requests, conditional reviews/pause/resume, fiscal adjustment, percent APR, conserved repayment, cancellation/expiry, default penalties and cross-institution borrowing blocks.
- Existing Schema 12–17 fixtures and earlier Schema 18 optional fields load. Initialization is deterministic/idempotent; spent capital is not replenished on reload. Active/paused/cancelled/defaulted programs roundtrip without replay.
- Same-day sovereign arrears are detected before further tranche release. Organization interest is excluded from generic debt service. No duplicate bilateral loans are created.
- Pre-change and final 365-day world invariants pass. Financing-only 1095-day run across five economies preserves cash and finite values.

## Remaining playtest work

Browser/native suites were not rerun. The programs are currently exposed through typed engine commands; the International Affairs UI is scheduled for Slice 8.5. Full-world 1095-day finance balance calibration, legal charter/roster/quotas, distinct subsidy policy, SDR exchange conversion and autonomous AI financing proposals remain unverified/unimplemented. Existing bundling warnings remain. See [release rules and accounting](RELEASE-0992.md). V3 remains the complete-playability milestone.

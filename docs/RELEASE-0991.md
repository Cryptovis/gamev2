# 0.99.1 — Slice 8.2 Voting & Leverage Engine

Development patch on `dev/ron-phase7`, based on v0.99.0 commit `539695f695b2c06a2e1fcf44ab3a447f2b8e4ec0`. Schema 18 retained.

## Delivered behavior

- Pure `evaluateVotingOutcome` supports all six voting-rule families, explicit failure codes, vote counts and sorted P5 veto identities. Rational comparisons use exact integer cross-products; BigInt is local arithmetic, never saved state.
- General Assembly rules check quorum, cast/eligible denominators, strict majority or inclusive thresholds. Security Council requires a fifteen-country electorate and nine yes votes; P5 no vetoes, P5 abstention does not, and procedural decisions ignore vetoes.
- Consensus rejects objections and incomplete responses. Unanimity requires every yes unless the charter explicitly permits abstention. Double majority checks state/population support and the minimum blocking minority; weighted voting distinguishes eligible weight from yes/no cast weight.
- Typed organization proposal and ballot commands are part of GameCommand. Human dispatch and explicit AI actors share one validator/executor. Membership/body access, active independent actor, target validity, duplicate receipts/topics/votes, finite influence, quota availability and integer deadlines are checked before mutation.
- Admission and discipline proposals cost 5 influence; sanctions cost 8. Successful proposals snapshot rule, eligible voters, integer weights and population, then open five campaign days of voting. Failed commands/previews consume no fee, sequence or RNG. Vote changes are allowed before close; the same repeated choice is a no-op and old command IDs cannot undo later choices.
- Daily `processOrganizations` closes votes at `day >= closesDay`, persists evaluated outcomes, adjusts proposer standing by +2/-1 (bounded 0–100), executes due decisions exactly once and expires new sanction records. Delayed effective days remain pending; target/effect conflicts and unsupported future payloads fail explicitly instead of silently applying.
- Foundational execution admits Member/Observer tiers, suspends/expels ordinary members and creates typed timed sanction effects with source resolution, issuer/body, measures and exemptions. P5/PermanentCouncil identities cannot be demoted or expelled through generic foundation commands.
- UN membership decisions mirror affected legacy UN/security entries. Completed legacy membership ballots update new UN metadata under their original voting rules. WHO/outreach and old ballots remain preserved. New decisions run before the day's country/legacy simulation.
- AI casts one initial vote per eligible open resolution through the same ballot validator in stable resolution/country order. Each accepted AI draw threads the stored RNG; previews, rejected votes, repeats and closing-day votes consume none. Autonomous new-organization proposal agendas and lobbying remain future work.

## Persistence and compatibility

Shared rule, payload and electorate schemas live in `domain/organizationSchemas.ts`, so command and persistence validation use the same contracts. Body quota vote units, Resolution outcome and execution failure reason are optional additions. New `organizationSanctions` effects are strictly validated against their source resolution; prior Schema 18 records without these additions still load, and the 12–17 migration fixtures remain green.

The new sanction effect type is additive, but v0.99.0's older strict validator cannot load records containing it. Use v0.99.1 for campaigns with new sanction decisions; no downgrade compatibility is claimed. Existing legacy sanction flags remain under their old engine and are not set merely because a new scoped sanction record exists.

## Verification

`npm run check`: **1073/1073 tests across 105 files**, TypeScript and Vite production build passed with zero errors. 47 new tests in `organizationVoting099.test.ts` cover voting boundaries, actual NATO/UNSC charters, shared proposal costs, malformed commands, frozen snapshots, deadlines, replay receipts, standing, admission/discipline/sanction execution, effect collisions, legacy reconciliation, AI seed threading and save/resume equivalence.

The 365-day long-run invariant passed before changing mechanics and remains part of the successful full check. Existing migration, optional-field and atomic checkpoint tests remain green. Browser/native suites were not rerun for this engine slice; no browser pass is claimed. Existing Vite bundle-size/ineffective-import warnings remain.

## Follow-ups and limits

Sanction records have scope and expiry, but trade/credit/arms-channel enforcement and cumulative economic effects belong to later slices. NATO military commitments, IMF disbursements, multi-stage UN admission procedures, institution-specific discipline legality, elected-seat replacement and the new International Affairs UI are not delivered here. Core generic foundation commands are game abstractions; capability-specific charter policies must be added before presenting them as real treaty procedures.

Finance/trade/private-forum default rosters remain observers. Weighted quota proposals require explicit approved integer body vote units; GDP weighting snapshots GDP in millionth-$B units. No quota is fabricated from current GDP.

Eligibility/weights are fixed at opening. New members cannot join that electorate; previously eligible countries retain their snapshot vote rights even if membership later changes, while annexed countries cannot submit new votes. Existing votes or denominators are not silently rewritten. Vacant/suspended Council seats block new Council proposals until a valid fifteen-seat electorate exists. The engine bounds open decisions at 64, four per proposer, and 1024 total retained resolutions without discarding active/history-linked records; archival is future work.

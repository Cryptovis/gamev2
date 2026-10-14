# Slice 8.1 organization model and compatibility notes

The domain contracts follow Astra's Phase 8 blueprint. This release adds persisted data and strict validation; simulation behavior stays in the existing legacy world/council systems until the next slice.

## State ownership

`src/domain/organizations.ts` defines 14 OrganizationIds, a Membership record with a separate Chair office, OrganizationBodyState, VotingRule, ResolutionPayload, Resolution, ElectorateSnapshot and OrganizationsState. `WorldState.organizations` is required in Schema 18. The existing GameState embeds WorldState, so the container is included in `snapshotGame` through its world snapshot.

The six voting families are one-country-one-vote, Security Council, weighted GDP/quota, consensus, unanimity and state/population double majority. Rational thresholds persist as integer numerator/denominator pairs; legacy majority explicitly uses greater-than comparison to preserve tie rejection. Quota identifiers and rule/electorate snapshots are data, not live recalculated vote weights. The new engine has no proposal/settlement processor in this slice.

Unknown is retained in the requested domain types for the effect and financing table boundaries, but runtime validation does not accept arbitrary unknown objects: it accepts the supported typed legacy sanction and financing record shapes. Future effect/program kinds must extend the validator deliberately. Every organization, membership, body, rule, payload and resolution uses strict typed schemas, with identity/country/body/seat/date/electorate checks afterwards.

## Legacy migration

Schema 17 validation runs before the adapter creates any organization defaults, so a missing legacy UN member array cannot be disguised by a new roster. The adapter is a no-op outside Schema 17 and never mutates inputs, consumes seeds, generates UUIDs or reads the clock.

The UN membership table combines saved UN/security members and explicitly identified known P5 countries. Non-P5 legacy security members remain ordinary members. The saved legacy arrays retain their exact contents. New P5 seat metadata is not used to rewrite old ballots or grant new powers in the legacy engine. The specialized security body keeps five P5 slots plus up to ten deterministic additional saved members; additional historical seats remain in `legacySecurity` and their country memberships. Annexed countries retain their identities with suspended new membership metadata, rather than transferring permanent seats to occupiers.

Legacy ballots are preserved in `world.ballots`, including WHO ballots. They are not converted into a mismatched new payload type: an old attack-authorization ballot is not a defense-response incident. Slice 8.2 must implement a legacy adapter/authority handoff before switching execution to the new tables. Similarly, legacy sanction records snapshot flags and expiry at migration; they are not an additional source of sanctions enforcement in 0.99.0.

The migrations preserve WHO memberships, missions, religious shares, tutorial, flights, commodities, living/governance/energy/expansion state, finances, wars, command receipts and journals. Repeated default filling creates no new object once normalization is complete. Existing saves are not overwritten during load; explicit save/checkpoint writes the migrated state.

## Roster policy

Catalog version 1 is offline, deterministic scenario data, following the existing project's contemporary scenario rather than asserting an exact reconstruction of the campaign calendar. Loading a migrated campaign never fetches live memberships. Seed rosters filter unknown countries and suspend annexed states. Legacy UN/security data always survives.

- NATO/EU/ASEAN reuse `DIPLOMACY_GROUPS`, avoiding duplicate sources of roster truth. [Existing snapshot notes](DIPLOMACY-SNAPSHOT-0907.md); [NATO membership](https://www.nato.int/en/about-us/organization/nato-member-countries), [ASEAN membership](https://asean.org/about-asean/).
- CSTO uses its six-country membership list as a scenario template; participation freezes and other political nuances are not new mechanics. [CSTO countries](https://en.odkb-csto.org/countries/).
- SCO includes Belarus in its template, reflecting its accession in 2024. [SCO statement](https://eng.sectsco.org/20250127/1666304.html).
- OPEC+ uses the OPEC/Declaration-of-Cooperation producer template. Charter-only participants and quota exceptions require distinct activation data; this roster does not impose production obligations. [OPEC cooperation record](https://www.opec.org/pr-detail/585-10-december-2025.html).
- OIC uses its listed state roster. [OIC member states](https://www.oic-oci.org/en/members).
- BRICS+ uses the eleven-country template listed by the 2025 Brazilian presidency, including Saudi Arabia. Membership/participation ambiguities and partner categories must be addressed when activating mechanics. [Presidency issue note](https://brics.br/en/documents/issue-note-brazils-brics-presidency-english.pdf/@@download/file).
- G20 stores represented state participants. EU/AU organization-level seats require a non-country representative model in a future slice; they are not given fake country IDs.
- IMF/World Bank/WTO/WEF: all represented countries have observer-only scenario records with no body voting seats or funding. This deliberately avoids claiming formal legal membership, quota weights or private consortium rights from an unverified global roster. These datasets are an activation prerequisite.

All available and committed funds start at zero; no migration adds money, debt, aid, influence bonuses or sanctions penalties. Standing starts at zero independently of the preserved global council influence.

# 0.40 Playtest Checklist

## Release gate
- `npm install`
- `npm run check`
- Start a NEW campaign (schema v7)

## Clock / map
- Pause, 1×, 2×, 3× and 5× all work
- Globe drag/zoom has no ghost trails
- Flat map pan/zoom works
- Clicking inside country polygons selects the country

## Cabinet
- Moving one ministry slider keeps total allocations near 100%
- Science allocation changes research-point growth over time
- Defense allocation affects readiness/logistics drift

## Technology
- Locked nodes respect prerequisites
- RP cost is deducted when technology unlocks
- Industry and military unlocks visibly affect their systems

## Industry
- Refineries convert oil to fuel
- Factories convert iron to steel
- Electricity changes over time
- War consumes fuel, not raw oil

## Diplomacy / world
- Alliance requirement is enforced before bloc formation
- Bloc invitations require alliance and relation threshold
- Council influence is spent on resolutions
- Passed sanctions stop trade with target

## Save
- Save / load works for schema v7
- Older saves are rejected rather than partially loaded

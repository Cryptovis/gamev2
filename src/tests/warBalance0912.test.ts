import {describe, expect, it} from 'vitest';
import {AIR_FULL_FACTOR, FRONT_SCALE, SUSTAINMENT_SHARE, COMMITTED_SHARE, airFactor, combatRoundFuel, roundFuelCost} from '../engine/systems/warfare';
import {startTacticalBattle, tacticalFuel, tacticalRoundFuel, validateTacticalOrders, resolveTacticalRound} from '../engine/systems/tactical';
import {RESCUE_MIN_RELATION, availableCreditOffers, creditApplicationPreview, applyForCredit, expansion} from '../engine/systems/sovereignCredit';
import {relationFor} from '../engine/systems/diplomacy';
import {tickGame} from '../engine/tick';
import {openWar} from '../engine/systems/warRules';
import {makeInitialState} from '../data/initialState';
import {BALANCE_SEEDS, SCENARIOS, mean, runAuto, runSmallEconomyDefense, scenarioState} from './warBalanceHarness';

const SEEDS = BALANCE_SEEDS.slice(0, 8);
const daily = (name: string) => mean(SEEDS.map(seed => mean(runAuto(SCENARIOS.find(s => s.name === name)!, seed, 30).deltas)));

describe('playtest.12 war balance (paired auto-resolve scenarios)', () => {
  const plains = daily('equal · plains');

  it('equal forces on plains hold the front within ±0.5 per day', () => {
    expect(Math.abs(plains)).toBeLessThanOrEqual(0.5);
  });

  it('defensive terrain is ordered from open ground to mountains', () => {
    const order = ['equal · plains', 'equal · desert', 'equal · coastal', 'equal · forest', 'equal · urban', 'equal · mountain'].map(daily);
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeLessThan(order[i - 1]);
  });

  it('full air superiority is worth the defensive edge of mountains, counted once and symmetrically', () => {
    expect(airFactor(100)).toBeCloseTo(AIR_FULL_FACTOR, 9);
    expect(airFactor(-100) * airFactor(100)).toBeCloseTo(1, 9);
    expect(airFactor(0)).toBe(1);
    const mountainEdge = plains - daily('equal · mountain'), attackerAir = daily('attacker air superiority · plains') - plains, defenderAir = plains - daily('defender air superiority · plains');
    for (const air of [attackerAir, defenderAir]) {
      expect(air).toBeGreaterThan(mountainEdge * 0.75);
      expect(air).toBeLessThan(mountainEdge * 1.25);
    }
    expect(FRONT_SCALE).toBeGreaterThan(0);
  });

  it('a stronger attacker advances; an attacker without fuel or already exhausted cannot', () => {
    expect(daily('attacker 1.5× forces')).toBeGreaterThan(2);
    expect(daily('attacker without fuel')).toBeLessThan(-5);
    expect(daily('attacker exhausted (50)')).toBeLessThan(plains - 3);
  });
});

describe('playtest.12 fuel: active operations versus passive defence', () => {
  it('both sides burn fuel in auto-resolve: the attacker operational fuel, the defender sustainment', () => {
    const run = runAuto(SCENARIOS[0], SEEDS[0], 10);
    expect(run.defenderFuelUsed).toBeGreaterThan(0);
    expect(run.attackerFuelUsed).toBeGreaterThan(run.defenderFuelUsed * 2);
    const {state, attackerId, defenderId} = scenarioState(SCENARIOS[0], SEEDS[0]);
    expect(combatRoundFuel(state.countries[defenderId])).toBeCloseTo(roundFuelCost(state.countries[defenderId]) * COMMITTED_SHARE * SUSTAINMENT_SHARE, 9);
    expect(combatRoundFuel(state.countries[attackerId], {power: 1, loss: 1, fuel: COMMITTED_SHARE, forces: run as never})).toBeCloseTo(roundFuelCost(state.countries[attackerId]) * COMMITTED_SHARE, 9);
  });

  it('the same orders cost the same fuel for attacker and defender, and holding never needs fuel to be allowed', () => {
    const setup = scenarioState(SCENARIOS[0], SEEDS[0]);
    let s = startTacticalBattle({...setup.state, playerCountryId: setup.attackerId}, setup.warId);
    const w = s.wars[setup.warId];
    for (const side of ['attacker', 'defender'] as const) {
      const infantry = w.tactical!.units.find(u => u.side === side && u.role === 'infantry')!;
      expect(tacticalFuel(s, w, side, [{unitId: infantry.id, kind: 'defend'}])).toBe(0);
      expect(tacticalRoundFuel(s, w, side, [{unitId: infantry.id, kind: 'defend'}])).toBeGreaterThan(0);
    }
    expect(tacticalFuel(s, w, 'attacker', [{unitId: 'attacker-artillery-1', kind: 'reserve'}])).toBe(tacticalFuel(s, w, 'defender', [{unitId: 'defender-artillery-1', kind: 'reserve'}]));
    // A side out of fuel can still hold, and pays only what it has.
    const empty = {...s, countries: {...s.countries, [setup.attackerId]: {...s.countries[setup.attackerId], processedResources: {...s.countries[setup.attackerId].processedResources, fuel: 0}}}};
    expect(validateTacticalOrders(empty, setup.warId, 'attacker', [{unitId: 'attacker-infantry-1', kind: 'defend'}])).toEqual([]);
    s = resolveTacticalRound({...empty, day: empty.day + 1}, setup.warId, [{unitId: 'attacker-infantry-1', kind: 'defend'}], 0);
    expect(s.countries[setup.attackerId].processedResources.fuel).toBe(0);
    expect(s.wars[setup.warId].tactical!.round).toBe(1);
  });
});

describe('playtest.12 small economies at war', () => {
  it('every small economy has at least one possible rescue lender at the start of a campaign', () => {
    const s = makeInitialState(), all = Object.values(s.countries).filter(c => !c.annexedBy && !c.controllerCountryId);
    const without = all.filter(b => b.economy.gdp < 60).filter(b => !all.some(c => c.id !== b.id && Math.min(relationFor(c, b.id).score, relationFor(b, c.id).score) >= RESCUE_MIN_RELATION && c.economy.treasury > Math.max(.01, c.economy.gdp * .04)));
    expect(without.map(c => c.id)).toEqual([]);
  });

  it('do not fall into lasting arrears while defending, even when they start short of cash', () => {
    for (const [d, a, low] of [['ARM', 'GEO', false], ['ARM', 'GEO', true], ['GEO', 'RUS', true]] as const) {
      const r = runSmallEconomyDefense(SEEDS[0], d, a, 90, low);
      expect(r.bankrupt, `${a}→${d}`).toBe(false);
    }
  });

  it('can still reach a rescue line during a war: offered by countries not at war with it, approved after review', () => {
    let s = makeInitialState();
    s = {...s, playerCountryId: 'ARM', eventCooldownUntil: 100000, advisorCooldownUntil: 100000, world: {...s.world, tutorial: {...s.world.tutorial, active: false, completed: true}}};
    const geo = s.countries.GEO;
    s = {...s, countries: {...s.countries, GEO: {...geo, processedResources: {...geo.processedResources, fuel: 5000}}}};
    const opened = openWar(s, 'GEO', 'ARM', false);
    s = opened.state;
    const arm = s.countries.ARM;
    s = {...s, countries: {...s.countries, ARM: {...arm, economy: {...arm.economy, treasury: arm.economy.gdp * 0.005}}}};
    s = tickGame(s);
    const offer = availableCreditOffers(s, 'ARM').find(o => o.emergency && o.targetCountryId === 'ARM');
    expect(offer).toBeDefined();
    expect(offer!.countryId).not.toBe('GEO');
    expect(s.wars[opened.warId!].status).toBe('active');
    expect(creditApplicationPreview(s, offer!.id, 'ARM').allowed).toBe(true);
    s = applyForCredit(s, offer!.id, 'ARM');
    for (let day = 0; day < 4; day++) s = tickGame(s);
    expect(expansion(s).loans.some(l => l.borrowerId === 'ARM')).toBe(true);
  });
});

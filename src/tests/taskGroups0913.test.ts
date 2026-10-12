import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { CAPITAL_POSITIONS } from '../data/capitalPositions';
import { COUNTRY_POSITIONS } from '../data/countryPositions';
import type { GameState, WarState } from '../domain/game';
import type { TaskGroup } from '../domain/taskGroups';
import { AIR_FULL_FACTOR, resolveCombatRound, warCombatView } from '../engine/systems/warfare';
import {
  AIR_RADIUS_KM, BLOCKADE_MAX, INTERDICTION_MAX, assignTaskGroup, assignedTotal, basePosition, cargoBlockade, clampTaskGroups,
  defaultTaskGroups, missionEffects, missionGroups, nearestBase, readyCounts, taskGroupPreview, withDefaultTaskGroups,
} from '../engine/systems/taskGroups';
import { candidatePlans, processAiTaskGroups, reviewTaskGroups } from '../engine/systems/aiTaskGroups';
import { openWar } from '../engine/systems/warRules';
import { executeCommandResult } from '../engine/commands';
import { snapshotGame } from '../persistence/snapshot';
import { migrateSave } from '../persistence/migrations';
import { validSaveShape } from '../persistence/validation';
import { commodityOrderPreview, placeCommodityOrder, processCommodityExchange } from '../engine/systems/commodityExchange';
import { flights, processFlights } from '../engine/systems/flights';
import { BALANCE_SEEDS, MISSION_SCENARIOS, SCENARIOS, groundAircraft, mean, runAuto, scenarioState, withMissions } from './warBalanceHarness';
import { withWarFuel } from './warFixture';

const base = (): GameState => { const s = makeInitialState(); s.world.tutorial.active = false; s.eventCooldownUntil = 100000; s.advisorCooldownUntil = 100000; return s; };
const scenario = (name: string, seed = BALANCE_SEEDS[0]) => scenarioState([...SCENARIOS, ...MISSION_SCENARIOS].find((s) => s.name === name)!, seed);
const total = (groups: readonly TaskGroup[], asset: TaskGroup['asset']) => groups.filter((g) => g.asset === asset).reduce((n, g) => n + g.count, 0);
const onStation = (s: GameState, warId: string): GameState => ({ ...s, wars: { ...s.wars, [warId]: { ...s.wars[warId], taskGroups: s.wars[warId].taskGroups!.map((g) => ({ ...g, readyDay: Math.min(g.readyDay, s.day) })) } } });
/** A real war between two coastal neighbours, with the attacker fuelled. */
function realWar(attackerId = 'GRC', defenderId = 'TUR') {
  const opened = openWar(withWarFuel(base(), attackerId), attackerId, defenderId, false);
  return { state: opened.state, warId: opened.warId!, attackerId, defenderId };
}

describe('Phase 4 task groups — default assignment keeps the earlier balance', () => {
  it('new wars start with the fixed-share groups, ready at once', () => {
    const { state, warId } = realWar();
    const w = state.wars[warId];
    expect(w.taskGroups!.length).toBeGreaterThan(0);
    for (const side of ['attacker', 'defender'] as const) {
      const c = state.countries[side === 'attacker' ? w.attackerId : w.defenderId];
      expect(total(w.taskGroups!.filter((g) => g.side === side && g.mission === 'airSuperiority'), 'fighters')).toBe(Math.ceil(Math.floor(c.military.fighters) * 0.25));
      expect(w.taskGroups!.filter((g) => g.side === side).every((g) => g.readyDay === state.day)).toBe(true);
    }
  });

  it('default groups reproduce a fixed-share (older save) war exactly: front, losses and fuel', () => {
    for (const name of ['equal · plains', 'attacker air superiority · plains', 'attacker without fuel', 'equal · coastal']) {
      const spec = SCENARIOS.find((s) => s.name === name)!;
      for (const seed of BALANCE_SEEDS.slice(0, 3)) {
        const legacy = runAuto({ ...spec, legacy: true }, seed, 20), grouped = runAuto(spec, seed, 20);
        expect(grouped.deltas).toEqual(legacy.deltas);
        expect(grouped.attackerFuelUsed).toBeCloseTo(legacy.attackerFuelUsed, 9);
        expect(grouped.defenderFuelUsed).toBeCloseTo(legacy.defenderFuelUsed, 9);
        expect(grouped.attackerLosses).toBe(legacy.attackerLosses);
      }
    }
  });

  it('wars saved without task groups keep the fixed share and refuse assignments', () => {
    const { state, warId } = scenario('legacy save (fixed share) · plains');
    expect(state.wars[warId].taskGroups).toBeUndefined();
    const p = taskGroupPreview(state, warId, state.wars[warId].attackerId, 'closeAirSupport', 'fighters', 10);
    expect(p.allowed).toBe(false);
    expect(assignTaskGroup(state, warId, state.wars[warId].attackerId, 'closeAirSupport', 'fighters', 10)).toBe(state);
  });
});

describe('Phase 4 task groups — allocation rules', () => {
  it('an aircraft serves one war: the second war can only use what is free', () => {
    let { state, warId, attackerId } = realWar('GRC', 'TUR');
    const fighters = Math.floor(state.countries[attackerId].military.fighters);
    state = assignTaskGroup(state, warId, attackerId, 'airSuperiority', 'fighters', fighters);
    expect(assignedTotal(state, attackerId, 'fighters')).toBe(fighters);
    const second = openWar(withWarFuel(state, attackerId), attackerId, 'BGR', false);
    const w2 = second.state.wars[second.warId!];
    expect(total(w2.taskGroups!.filter((g) => g.side === 'attacker'), 'fighters')).toBe(0);
    const refused = taskGroupPreview(second.state, w2.id, attackerId, 'closeAirSupport', 'fighters', 1);
    expect(refused.allowed).toBe(false);
    expect(refused.max).toBe(0);
    expect(assignedTotal(second.state, attackerId, 'fighters')).toBeLessThanOrEqual(fighters);
  });

  it('assignments never exceed the national stock when it falls for any reason (clamped, no phantom aircraft)', () => {
    let { state, warId, attackerId } = realWar();
    state = onStation(assignTaskGroup(state, warId, attackerId, 'closeAirSupport', 'fighters', 20), warId);
    const before = assignedTotal(state, attackerId, 'fighters');
    expect(before).toBeGreaterThan(10);
    const c = state.countries[attackerId];
    const shrunk = { ...state, countries: { ...state.countries, [attackerId]: { ...c, military: { ...c.military, fighters: 7.6 } } } };
    // Read-time cap: effects never use more than the country owns, even before the clamp runs.
    const counts = readyCounts(shrunk, shrunk.wars[warId], 'attacker');
    expect(counts.airSuperiority.fighters + counts.closeAirSupport.fighters + counts.interdiction.fighters).toBeLessThanOrEqual(7);
    const clamped = clampTaskGroups(shrunk);
    expect(assignedTotal(clamped, attackerId, 'fighters')).toBe(7);
    expect(clamped.wars[warId].taskGroups!.every((g) => g.count > 0 && Number.isInteger(g.count))).toBe(true);
    expect(clampTaskGroups(clamped)).toBe(clamped);
  });

  it('combat losses come out of the war\'s own groups', () => {
    // Large air forces so that per-round aircraft losses are whole numbers.
    let { state, warId } = scenarioState({ name: 'big air forces', adjust: (a, d) => { a.military.fighters = d.military.fighters = 6000; } }, BALANCE_SEEDS[0]);
    const ready = total(state.wars[warId].taskGroups!.filter((g) => g.side === 'attacker'), 'fighters');
    for (let d = 0; d < 25; d++) state = resolveCombatRound({ ...state, day: state.day + 1 }, warId);
    const w = state.wars[warId], lost = w.attackerLosses.fighters;
    expect(lost).toBeGreaterThan(0);
    expect(total(w.taskGroups!.filter((g) => g.side === 'attacker'), 'fighters')).toBe(ready - lost);
  });

  it('a new group prepares 1–3 days before it has any effect', () => {
    let { state, warId, attackerId } = scenario('equal · plains');
    const before = warCombatView(state, state.wars[warId]).p.powerRatio;
    const p = taskGroupPreview(state, warId, attackerId, 'closeAirSupport', 'fighters', 40);
    expect(p.allowed).toBe(true);
    expect(p.readyDay - state.day).toBeGreaterThanOrEqual(1);
    expect(p.readyDay - state.day).toBeLessThanOrEqual(3);
    state = assignTaskGroup(state, warId, attackerId, 'closeAirSupport', 'fighters', 40);
    expect(warCombatView(state, state.wars[warId]).p.powerRatio).toBe(before);
    const later = { ...state, day: p.readyDay };
    expect(warCombatView(later, later.wars[warId]).p.powerRatio).toBeGreaterThan(before);
  });

  it('refuses invalid missions, counts and forces through the player command', () => {
    const { state, warId } = realWar('TUR', 'GRC');
    const player = { ...state, playerCountryId: 'TUR' };
    const cmd = (mission: string, asset: string, count: number) => executeCommandResult(player, { type: 'war/assignTaskGroup', warId, mission: mission as never, asset: asset as never, count });
    expect(cmd('blockade', 'fighters', 5).status).toBe('unavailable');
    expect(cmd('closeAirSupport', 'fighters', 2.5).status).toBe('unavailable');
    expect(cmd('closeAirSupport', 'fighters', 1e6).status).toBe('unavailable');
    const ok = cmd('closeAirSupport', 'fighters', 10);
    expect(ok.status).toBe('applied');
    expect(missionGroups(ok.state.wars[warId], 'attacker', 'closeAirSupport', 'fighters')[0].count).toBe(10);
    const recall = executeCommandResult(ok.state, { type: 'war/recallTaskGroup', warId, mission: 'closeAirSupport', asset: 'fighters' });
    expect(missionGroups(recall.state.wars[warId], 'attacker', 'closeAirSupport', 'fighters')).toHaveLength(0);
  });
});

describe('Phase 4 task groups — bases and range', () => {
  it('bases fly from the capital, falling back deterministically to the map position', () => {
    expect(basePosition('TUR')).toEqual(CAPITAL_POSITIONS.TUR);
    const missing = Object.keys(COUNTRY_POSITIONS).find((id) => !CAPITAL_POSITIONS[id])!;
    expect(missing).toBeDefined();
    expect(basePosition(missing)).toEqual(COUNTRY_POSITIONS[missing]);
  });

  it('fighters cannot reach a distant front without a nearer base; an ally\'s capital gives one', () => {
    let s = withWarFuel(base(), 'USA');
    // No standing alliances: the United States flies from Washington only.
    const strip = s.countries.USA;
    s = { ...s, countries: { ...s.countries, USA: { ...strip, diplomacy: { ...strip.diplomacy, relations: Object.fromEntries(Object.entries(strip.diplomacy.relations).map(([k, r]) => [k, { ...r, treaties: r.treaties.filter((t) => t !== 'alliance') }])) } } } };
    const opened = openWar(s, 'USA', 'IRN', false);
    s = opened.state;
    const w = s.wars[opened.warId!];
    expect(nearestBase(s, w, 'USA').km).toBeGreaterThan(AIR_RADIUS_KM.fighters);
    expect(total(w.taskGroups!.filter((g) => g.side === 'attacker'), 'fighters')).toBe(0);
    expect(taskGroupPreview(s, w.id, 'USA', 'airSuperiority', 'fighters', 10).reasons).toContain('No air base within range of the front.');
    // An alliance with Türkiye gives a base within range.
    const usa = s.countries.USA, rel = usa.diplomacy.relations.TUR ?? { score: 50, status: 'friendly', treaties: [], sanctions: false };
    const allied = { ...s, countries: { ...s.countries, USA: { ...usa, diplomacy: { ...usa.diplomacy, relations: { ...usa.diplomacy.relations, TUR: { ...rel, status: 'friendly' as const, treaties: [...rel.treaties.filter((t) => t !== 'alliance'), 'alliance' as const] } } } } } };
    const p = taskGroupPreview(allied, w.id, 'USA', 'airSuperiority', 'fighters', 10);
    expect(p.allowed).toBe(true);
    expect(p.baseId).toBe('TUR');
  });

  it('warships need a port, and a blockade needs an enemy coast', () => {
    const { state, warId } = realWar('GRC', 'TUR');
    const landlocked = { ...state, infrastructure: { ...state.infrastructure, TUR: { ...state.infrastructure.TUR, ports: 0 } } };
    expect(taskGroupPreview(landlocked, warId, 'GRC', 'blockade', 'warships', 5).reasons).toContain('The enemy has no coast to blockade.');
    expect(taskGroupPreview(landlocked, warId, 'TUR', 'convoyEscort', 'warships', 5).reasons).toContain('Your country has no port for warships.');
  });
});

describe('Phase 4 task groups — mission effects stay within the approved bounds', () => {
  it('air superiority plus close air support never exceed the mountain defensive edge', () => {
    const { state, warId } = scenario('attacker AS + CAS, defender grounded');
    const view = warCombatView(state, state.wars[warId]);
    expect(view.p.airSuperiority).toBe(100);
    expect(view.air).toBeCloseTo(AIR_FULL_FACTOR, 9);
  });

  it('interdiction cuts at most 15% of the enemy supply; air cover halves it', () => {
    const free = scenario('attacker interdiction, defender grounded'), covered = scenario('attacker interdiction (AS covered)');
    const e1 = missionEffects(free.state, free.state.wars[free.warId]), e2 = missionEffects(covered.state, covered.state.wars[covered.warId]);
    expect(e1.attacker.interdiction).toBeGreaterThan(INTERDICTION_MAX * 0.9);
    expect(e1.attacker.interdiction).toBeLessThanOrEqual(INTERDICTION_MAX);
    expect(e2.attacker.interdiction).toBeCloseTo(e1.attacker.interdiction / 2, 9);
  });

  it('a blockade cuts at most 12% of the enemy supply; escorts halve it', () => {
    const open = scenario('attacker blockade (no escorts)'), escorted = scenario('attacker blockade vs defender escorts');
    expect(missionEffects(open.state, open.state.wars[open.warId]).supplyFactor.defender).toBeCloseTo(1 - BLOCKADE_MAX, 9);
    expect(missionEffects(escorted.state, escorted.state.wars[escorted.warId]).supplyFactor.defender).toBeCloseTo(1 - BLOCKADE_MAX / 2, 9);
  });

  it('shore support is worth at most half of close air support (front per day, paired twins)', () => {
    const daily = (name: string) => mean(BALANCE_SEEDS.slice(0, 6).map((seed) => mean(runAuto(MISSION_SCENARIOS.find((s) => s.name === name)!, seed, 30).deltas)));
    const base0 = daily('default task groups · plains');
    const shore = base0 - daily('attacker without shore support'), cas = daily('attacker CAS added (AS + CAS)') - base0;
    expect(shore).toBeGreaterThan(0);
    expect(shore).toBeLessThanOrEqual(cas / 2);
  });

  it('only assigned aircraft burn mission fuel', () => {
    const none = runAuto(MISSION_SCENARIOS.find((s) => s.name === 'attacker no aircraft assigned')!, BALANCE_SEEDS[0], 5);
    const def = runAuto(MISSION_SCENARIOS.find((s) => s.name === 'default task groups · plains')!, BALANCE_SEEDS[0], 5);
    expect(none.attackerFuelUsed).toBeLessThan(def.attackerFuelUsed);
  });
});

describe('Phase 4 task groups — AI uses the same rules and does not see enemy assignments', () => {
  it('reviews deterministically through the shared validator and stays within stock', () => {
    const { state, warId } = realWar();
    const later = { ...state, day: state.day + 20 };
    const a = processAiTaskGroups(later), b = processAiTaskGroups(later);
    expect(JSON.stringify(a.wars[warId])).toBe(JSON.stringify(b.wars[warId]));
    for (const id of [a.wars[warId].attackerId, a.wars[warId].defenderId]) for (const asset of ['fighters', 'bombers', 'warships'] as const)
      expect(assignedTotal(a, id, asset)).toBeLessThanOrEqual(Math.floor(a.countries[id].military[asset]));
    expect(a.wars[warId].taskReviewDay?.attacker).toBe(later.day);
    expect(candidatePlans(later, later.wars[warId], 'attacker').length).toBeLessThanOrEqual(6);
  });

  it('changing the enemy\'s hidden assignment does not change the AI decision', () => {
    const { state, warId, defenderId } = realWar();
    const later = { ...state, day: state.day + 20 };
    const moved = onStation(assignTaskGroup(later, warId, defenderId, 'closeAirSupport', 'fighters', 15), warId);
    const own = (s: GameState) => JSON.stringify(reviewTaskGroups(s, warId, 'attacker').state.wars[warId].taskGroups!.filter((g) => g.side === 'attacker'));
    expect(own(moved)).toBe(own(later));
  });

  it('never changes the player\'s groups', () => {
    const { state, warId } = realWar('GRC', 'TUR');
    const player = { ...state, playerCountryId: 'GRC', day: state.day + 30 };
    const next = processAiTaskGroups(player);
    expect(JSON.stringify(next.wars[warId].taskGroups!.filter((g) => g.side === 'attacker'))).toBe(JSON.stringify(player.wars[warId].taskGroups!.filter((g) => g.side === 'attacker')));
  });
});

describe('Phase 4 task groups — saves', () => {
  it('a mid-war save with task groups loads and continues identically; malformed groups are rejected', () => {
    let { state, warId, attackerId } = realWar();
    state = assignTaskGroup(state, warId, attackerId, 'interdiction', 'fighters', 5);
    state = assignTaskGroup(state, warId, attackerId, 'closeAirSupport', 'fighters', 8);
    for (let d = 0; d < 5; d++) state = resolveCombatRound({ ...state, day: state.day + 1 }, warId);
    const snap = snapshotGame(state);
    expect(validSaveShape(snap)).toBe(true);
    const loaded = migrateSave(snap)!;
    let a: GameState = state, b: GameState = loaded as GameState;
    for (let d = 0; d < 5; d++) { a = resolveCombatRound({ ...a, day: a.day + 1 }, warId); b = resolveCombatRound({ ...b, day: b.day + 1 }, warId); }
    expect(JSON.stringify(b.wars[warId])).toBe(JSON.stringify(a.wars[warId]));
    const bad = snapshotGame(state); (bad.wars[warId].taskGroups as unknown as TaskGroup[])[0].asset = 'bombers' as never; bad.wars[warId].taskGroups![0].mission = 'airSuperiority';
    expect(validSaveShape(bad)).toBe(false);
    const negative = snapshotGame(state); negative.wars[warId].taskGroups![0].count = -3;
    expect(validSaveShape(negative)).toBe(false);
  });

  it('older saves without task groups stay valid', () => {
    const real = realWar(), legacy = { ...real.state, wars: { ...real.state.wars, [real.warId]: { ...real.state.wars[real.warId], taskGroups: undefined } } };
    expect(validSaveShape(snapshotGame(legacy))).toBe(true);
    expect(migrateSave(snapshotGame(legacy))!.wars[real.warId].taskGroups).toBeUndefined();
    const { state, warId } = scenario('legacy save (fixed share) · plains');
    const w: WarState = state.wars[warId];
    expect(withDefaultTaskGroups(state, warId).wars[warId].taskGroups).toEqual(defaultTaskGroups(state, w));
  });
});

describe('Phase 4 cargo chain — one shipment, delivered on its flight\'s day', () => {
  const buyer = 'TUR';
  const opened = () => processCommodityExchange(base());
  function advance(state: GameState, days: number): GameState {
    let s = state;
    for (let i = 0; i < days; i++) { s = processFlights({ ...s, day: s.day + 1 }); s = processCommodityExchange(s); }
    return s;
  }

  it('the flight and the exchange delivery share one id and land on the same day', () => {
    const s = opened(), q = commodityOrderPreview(s, buyer, 'oil', 'buy', 3);
    const n = placeCommodityOrder(s, buyer, 'oil', 'buy', 3);
    const flight = flights(n).at(-1)!, delivery = n.world.commodities!.deliveries.at(-1)!;
    expect(flight.shipmentId).toBeDefined();
    expect(delivery.id).toBe(flight.shipmentId);
    expect(delivery.arriveDay).toBe(flight.arriveDay);
    const before = advance(n, q.arrivalDays - 1);
    expect(before.world.commodities!.positions[buyer].oil!.inbound).toBeCloseTo(3, 9);
    const after = advance(before, 1);
    expect(after.world.commodities!.positions[buyer].oil!.units).toBeCloseTo(3, 9);
    expect(after.world.commodities!.deliveries.filter((d) => d.id === flight.shipmentId)).toHaveLength(0);
  });

  /** Greece blockades Türkiye with ready warships; Türkiye has no escorts. */
  function blockaded(escort = false) {
    let { state, warId } = realWar('GRC', 'TUR');
    state = assignTaskGroup(state, warId, 'GRC', 'shoreSupport', 'warships', 0);
    state = assignTaskGroup(state, warId, 'GRC', 'blockade', 'warships', Math.ceil(Math.floor(state.countries.GRC.military.warships) * 0.25));
    if (escort) { state = assignTaskGroup(state, warId, 'TUR', 'shoreSupport', 'warships', 0); state = assignTaskGroup(state, warId, 'TUR', 'convoyEscort', 'warships', 10); }
    return { state: onStation(state, warId), warId };
  }

  it('an unescorted cargo running a blockade may lose part of its goods (seeded, reported, no refund)', () => {
    const { state } = blockaded();
    expect(cargoBlockade(state, buyer)?.blockaderId).toBe('GRC');
    let lostAny = false;
    for (const seed of BALANCE_SEEDS.slice(0, 8)) {
      let s = processCommodityExchange({ ...state, simulationSeed: seed });
      const paid = s.countries[buyer].economy.treasury, q = commodityOrderPreview(s, buyer, 'oil', 'buy', 4);
      s = placeCommodityOrder(s, buyer, 'oil', 'buy', 4);
      const id = flights(s).at(-1)!.shipmentId!, oil = s.countries[buyer].resources.oil, treasury = s.countries[buyer].economy.treasury;
      expect(paid - treasury).toBeCloseTo(q.total, 6);
      s = advance(s, q.arrivalDays);
      const f = flights(s).find((x) => x.shipmentId === id)!;
      expect(f.status).toBe('landed');
      expect(f.delivered! + f.lost!).toBeCloseTo(4, 9);
      expect(s.countries[buyer].resources.oil - oil).toBeCloseTo(f.delivered!, 6);
      expect(s.world.commodities!.positions[buyer].oil!.units).toBeCloseTo(f.delivered!, 9);
      expect(s.world.commodities!.positions[buyer].oil!.inbound).toBeCloseTo(0, 9);
      if (f.lost! > 0) { lostAny = true; expect(s.sitrep.some((l) => l.startsWith('BLOCKADE //'))).toBe(true); }
      // Same seed, same outcome.
      const again = advance(placeCommodityOrder(processCommodityExchange({ ...state, simulationSeed: seed }), buyer, 'oil', 'buy', 4), q.arrivalDays);
      expect(flights(again).find((x) => x.shipmentId === id)!.lost).toBe(f.lost);
    }
    expect(lostAny).toBe(true);
  });

  it('escorts protect the cargo; war between the endpoints does not stop a paid delivery', () => {
    const { state } = blockaded(true);
    expect(cargoBlockade(state, buyer)).toBeNull();
    // Greece sells to Türkiye while they fight: the paid cargo still lands in full.
    const s = processCommodityExchange(state), q = commodityOrderPreview(s, buyer, 'oil', 'buy', 2);
    const n = advance(placeCommodityOrder(s, buyer, 'oil', 'buy', 2), q.arrivalDays);
    expect(n.world.commodities!.positions[buyer].oil!.units).toBeCloseTo(2, 9);
  });

  it('goods for an occupied buyer are delivered to the buyer of record', () => {
    let s = processCommodityExchange(base());
    const q = commodityOrderPreview(s, buyer, 'oil', 'buy', 2);
    s = placeCommodityOrder(s, buyer, 'oil', 'buy', 2);
    const oil = s.countries[buyer].resources.oil;
    s = { ...s, countries: { ...s.countries, [buyer]: { ...s.countries[buyer], controllerCountryId: 'GRC' } } };
    s = advance(s, q.arrivalDays);
    expect(s.countries[buyer].resources.oil).toBeCloseTo(oil + 2, 6);
    expect(s.world.commodities!.positions[buyer].oil!.units).toBeCloseTo(2, 9);
  });
});

describe('Phase 4 harness', () => {
  it('mission scenarios apply through the shared assignment rule', () => {
    const { state, warId, attackerId } = scenario('default task groups · plains');
    expect(() => withMissions(state, warId, [{ side: 'attacker', mission: 'blockade', asset: 'fighters' as never, share: .25 }])).toThrow();
    expect(withMissions(state, warId, [])).toEqual(state);
    expect(groundAircraft(state, attackerId)).not.toBe(state);
  });
});

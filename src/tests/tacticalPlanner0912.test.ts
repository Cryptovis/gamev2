import {describe, expect, it} from 'vitest';
import type {GameState} from '../domain/game';
import type {TacticalBattle, TacticalSide} from '../domain/tactical';
import {allCells, cellDistance, chooseSingleRoundOrders, resolveStandingRound, resolveTacticalRound, startTacticalBattle, validateTacticalOrders, visibleCells} from '../engine/systems/tactical';
import {PLAN_COMMITMENT, PLAN_EVALUATION_BUDGET, PLAN_MIN_ROUNDS, planTacticalOrders, sideKnowledge} from '../engine/systems/tacticalPlanner';
import {canLoadSave, migrateSave} from '../persistence/migrations';
import {snapshotGame} from '../persistence/snapshot';
import {BALANCE_SEEDS, SCENARIOS, runTactical, scenarioState} from './warBalanceHarness';
import {makeInitialState} from '../data/initialState';
import {applyGameCommand} from '../engine/commands';
import {withWarFuel} from './warFixture';

/** A real campaign battle (Türkiye → Greece) for save and load checks. */
const campaignBattle = () => {
  let s = makeInitialState();
  s.world.tutorial.active = false; s.eventCooldownUntil = 10000; s.advisorCooldownUntil = 10000;
  s = applyGameCommand(withWarFuel(s), {type: 'military/declareWar', targetCountryId: 'GRC'});
  const id = Object.keys(s.wars)[0];
  return {s: startTacticalBattle(s, id), id};
};

const battle = (name = 'equal · plains', seed = BALANCE_SEEDS[0]) => {
  const setup = scenarioState(SCENARIOS.find(s => s.name === name)!, seed);
  const s = startTacticalBattle({...setup.state, playerCountryId: setup.attackerId}, setup.warId);
  return {s, id: setup.warId};
};
const play = (s: GameState, id: string, rounds: number) => {
  for (let r = 0; r < rounds && s.wars[id].status === 'active'; r++) s = resolveStandingRound({...s, day: s.day + 1}, id);
  return s;
};
const tactical = (s: GameState, id: string) => s.wars[id].tactical!;

describe('playtest.12 multi-round tactical AI', () => {
  it('chooses a plan, orders through the shared validator and stays within the command budget', () => {
    const {s, id} = battle();
    for (const side of ['attacker', 'defender'] as const) {
      const planned = planTacticalOrders(s, id, side);
      expect(planned.fallback).toBe(false);
      expect(planned.plan).not.toBeNull();
      expect(planned.orders.length).toBeGreaterThan(0);
      expect(validateTacticalOrders(s, id, side, planned.orders)).toEqual([]);
      expect(planned.evaluations).toBeLessThanOrEqual(PLAN_EVALUATION_BUDGET);
      expect(planned.reason.length).toBeGreaterThan(10);
    }
  });

  it('is deterministic: the same battle and seed give the same plans, orders and results', () => {
    const a = play(battle().s, battle().id, 8), b = play(battle().s, battle().id, 8);
    const id = battle().id;
    expect(snapshotGame(a).wars[id]).toEqual(snapshotGame(b).wars[id]);
    const {s} = battle(), before = JSON.stringify(s);
    planTacticalOrders(s, id, 'defender');
    expect(JSON.stringify(s)).toBe(before);
  });

  it('remembers the plan between rounds and changes it only now and then', () => {
    let {s, id} = battle('attacker 1.5× forces');
    const changes = {attacker: 0, defender: 0}, kept = {attacker: 0, defender: 0};
    for (let round = 0; round < 12 && s.wars[id].status === 'active'; round++) {
      s = {...s, day: s.day + 1};
      for (const side of ['attacker', 'defender'] as const) {
        const planned = planTacticalOrders(s, id, side), previous = tactical(s, id).plans?.[side];
        if (planned.reason.startsWith('Kept')) kept[side]++;
        if (previous && planned.plan!.startedRound !== previous.startedRound) {
          changes[side]++;
          // A young plan is only replaced when it can no longer be carried out.
          if (tactical(s, id).round - previous.startedRound < PLAN_MIN_ROUNDS) expect(planned.reason).toMatch('New plan');
        }
      }
      s = resolveStandingRound(s, id);
      expect(tactical(s, id).plans?.defender?.known.every(e => e.seenRound <= tactical(s, id).round)).toBe(true);
    }
    for (const side of ['attacker', 'defender'] as const) { expect(changes[side]).toBeLessThanOrEqual(5); expect(kept[side]).toBeGreaterThan(changes[side]); }
    expect(PLAN_COMMITMENT).toBeGreaterThan(0);
  });

  it('switches goals far less often than the single-round AI', () => {
    const spec = SCENARIOS.find(s => s.name === 'attacker 1.5× forces')!;
    const runs = (ai: 'planner' | 'single') => BALANCE_SEEDS.slice(0, 6).map(seed => runTactical(spec, seed, 16, ai));
    const rate = (rs: ReturnType<typeof runs>) => rs.reduce((n, r) => n + r.goalSwitches.attacker, 0) / rs.reduce((n, r) => n + r.rounds, 0);
    const planner = runs('planner'), single = runs('single');
    expect(rate(planner)).toBeLessThan(rate(single) * 0.6);
    // And it does not play worse: the stronger attacker still advances.
    expect(planner.reduce((n, r) => n + r.progress, 0)).toBeGreaterThanOrEqual(single.reduce((n, r) => n + r.progress, 0) * 0.9);
  });

  it('falls back to the single-round AI when the evaluation budget is exceeded', () => {
    const {s, id} = battle();
    const planned = planTacticalOrders(s, id, 'attacker', 10);
    expect(planned.fallback).toBe(true);
    expect(planned.orders).toEqual(chooseSingleRoundOrders(s, id, 'attacker'));
    expect(validateTacticalOrders(s, id, 'attacker', planned.orders)).toEqual([]);
  });
});

describe('playtest.12 fog of war', () => {
  /** Moves every enemy group the side cannot see (and does not remember) to another unseen, empty sector. */
  const shuffleHidden = (s: GameState, id: string, side: TacticalSide): GameState => {
    const copy = structuredClone(s), b: TacticalBattle = copy.wars[id].tactical!, seen = visibleCells(b, side);
    const remembered = new Set((b.plans?.[side]?.known ?? []).map(e => e.unitId));
    const free = allCells(b).filter(c => !seen.has(c) && !b.units.some(u => u.remaining > 0 && u.cell === c) && !b.objectives.includes(c)).reverse();
    for (const u of b.units) if (u.side !== side && u.remaining > 0 && !seen.has(u.cell) && !remembered.has(u.id) && free.length) u.cell = free.shift()!;
    return copy;
  };

  it('plans and orders do not change when unseen enemy groups move', () => {
    for (const [name, rounds] of [['equal · plains', 0], ['equal · plains', 3], ['attacker 1.5× forces', 5]] as const) {
      const {s: start, id} = battle(name);
      const s = play(start, id, rounds);
      if (s.wars[id].status !== 'active') continue;
      for (const side of ['attacker', 'defender'] as const) {
        const moved = shuffleHidden(s, id, side);
        const hiddenMoved = JSON.stringify(tactical(moved, id).units) !== JSON.stringify(tactical(s, id).units);
        const a = planTacticalOrders(s, id, side), b = planTacticalOrders(moved, id, side);
        expect(b.orders).toEqual(a.orders);
        expect(b.plan).toEqual(a.plan);
        expect(chooseSingleRoundOrders(moved, id, side)).toEqual(chooseSingleRoundOrders(s, id, side));
        if (rounds === 0) expect(hiddenMoved).toBe(true);
      }
    }
  });

  it('knows objective holders only where it can see them', () => {
    const {s, id} = battle(), b = tactical(s, id);
    const hidden = b.objectives.find(o => !visibleCells(b, 'attacker').has(o))!;
    expect(hidden).toBeDefined();
    const copy = structuredClone(s), cb = tactical(copy, id), enemy = cb.units.find(u => u.side === 'defender' && u.role === 'infantry')!;
    enemy.cell = hidden;
    expect(sideKnowledge(cb, 'attacker', []).holders[cb.objectives.indexOf(hidden)]).toBeNull();
    expect(sideKnowledge(cb, 'defender', []).holders[cb.objectives.indexOf(hidden)]).toBe('defender');
  });

  it('never needs a hidden sector to validate an order: every legal move lies inside the unit’s own vision', () => {
    const {s, id} = battle(), b = tactical(s, id);
    for (const side of ['attacker', 'defender'] as const) {
      const seen = visibleCells(b, side);
      for (const u of b.units.filter(x => x.side === side)) for (const c of allCells(b)) if (cellDistance(b, u.cell, c) <= 2) expect(seen.has(c)).toBe(true);
    }
  });
});

describe('playtest.12 save and load mid-war', () => {
  it('continues a battle identically after save and load, plans included', () => {
    const {s: start, id} = campaignBattle();
    const mid = play(start, id, 4);
    const loaded = migrateSave(snapshotGame(mid))!;
    expect(canLoadSave(loaded)).toBe(true);
    expect(tactical(loaded, id).plans).toEqual(tactical(mid, id).plans);
    const a = play(mid, id, 4), b = play(loaded, id, 4);
    expect(snapshotGame(b).wars[id]).toEqual(snapshotGame(a).wars[id]);
  });

  it('loads schema-17 battles saved without plans and plans afresh', () => {
    const {s: start, id} = campaignBattle();
    const mid = play(start, id, 2), withoutPlans = snapshotGame(mid);
    delete withoutPlans.wars[id].tactical!.plans;
    const loaded = migrateSave(withoutPlans)!;
    expect(canLoadSave(loaded)).toBe(true);
    const next = play(loaded, id, 1);
    expect(tactical(next, id).plans?.defender).toBeDefined();
  });

  it('rejects a saved plan that points outside the battle', () => {
    const {s: start, id} = campaignBattle();
    const saved = snapshotGame(play(start, id, 1));
    expect(canLoadSave(saved)).toBe(true);
    saved.wars[id].tactical!.plans!.defender!.objective = allCells(tactical(saved, id)).find(c => !tactical(saved, id).objectives.includes(c))!;
    expect(canLoadSave(saved)).toBe(false);
  });

  it('a round the player orders by hand drops the player side plan; standing orders keep it', () => {
    const {s, id} = battle();
    const auto = resolveStandingRound({...s, day: s.day + 1}, id);
    expect(tactical(auto, id).plans?.attacker).toBeDefined();
    const manual = resolveTacticalRound({...auto, day: auto.day + 1}, id, [], tactical(auto, id).round);
    expect(tactical(manual, id).plans?.attacker).toBeUndefined();
    expect(tactical(manual, id).plans?.defender).toBeDefined();
  });
});

import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { TacticalBattle, TacticalRoundEvent } from '../domain/tactical';
import { applyGameCommand } from '../engine/commands';
import { chooseTacticalOrders, resolveTacticalRound, startTacticalBattle, validateTacticalOrders } from '../engine/systems/tactical';
import { actionCell, playbackAction, playbackFrames, playbackUnits } from '../engine/systems/tacticalPlayback';
import { migrateSave } from '../persistence/migrations';
import { snapshotGame } from '../persistence/snapshot';

const fixture = () => {
  let s = makeInitialState();
  s.world.tutorial.active = false; s.eventCooldownUntil = 10000; s.advisorCooldownUntil = 10000;
  s = applyGameCommand(s, { type: 'military/declareWar', targetCountryId: 'GRC' });
  const id = Object.keys(s.wars)[0];
  return { s: startTacticalBattle(s, id), id };
};
const place = (b: TacticalBattle, id: string, cell: number) => { b.units.find(u => u.id === id)!.cell = cell; };
const advance = { unitId: 'attacker-infantry-1', kind: 'move' as const, target: 22 };

describe('0.86 battle RNG stream', () => {
  it('resolves combat from the battle stream without consuming the world stream', () => {
    const { s, id } = fixture();
    const n = resolveTacticalRound(s, id, [advance], 0);
    expect(n.simulationSeed).toBe(s.simulationSeed);
    expect(n.wars[id].tactical!.rngState).toBeTypeOf('number');
    expect(n.wars[id].tactical!.rngState).not.toBe(s.wars[id].tactical!.seed);
  });

  it('gives the same battle result whatever the world seed is', () => {
    const { s, id } = fixture();
    const other = { ...s, simulationSeed: (s.simulationSeed + 12345) >>> 0 };
    const a = resolveTacticalRound(s, id, [advance], 0).wars[id], b = resolveTacticalRound(other, id, [advance], 0).wars[id];
    expect(b.attackerLosses).toEqual(a.attackerLosses); expect(b.defenderLosses).toEqual(a.defenderLosses); expect(b.progress).toBe(a.progress);
  });

  it('keeps the battle stream across save and load', () => {
    const { s, id } = fixture(), n = resolveTacticalRound(s, id, [advance], 0), loaded = migrateSave(snapshotGame(n))!;
    expect(loaded.wars[id].tactical!.rngState).toBe(n.wars[id].tactical!.rngState);
  });
});

describe('0.86 AI tactical priorities', () => {
  it('holds a depot it occupies when an enemy is close', () => {
    const { s, id } = fixture(), b = s.wars[id].tactical!, depot = b.objectives[1];
    place(b, 'defender-infantry-1', depot); place(b, 'attacker-infantry-1', depot - 2);
    const orders = chooseTacticalOrders(s, id, 'defender');
    expect(orders).toContainEqual({ unitId: 'defender-infantry-1', kind: 'defend' });
    expect(validateTacticalOrders(s, id, 'defender', orders)).toEqual([]);
  });

  it('bombards a visible enemy in range', () => {
    const { s, id } = fixture(), b = s.wars[id].tactical!;
    place(b, 'attacker-infantry-1', 47);
    const orders = chooseTacticalOrders(s, id, 'defender');
    expect(orders.some(o => o.kind === 'bombard' && o.unitId === 'defender-artillery-1' && o.target === 47)).toBe(true);
  });

  it('takes an open depot within reach', () => {
    const { s, id } = fixture(), b = s.wars[id].tactical!, depot = b.objectives[0];
    place(b, 'attacker-infantry-1', depot - 1);
    expect(chooseTacticalOrders(s, id, 'attacker')).toContainEqual({ unitId: 'attacker-infantry-1', kind: 'move', target: depot });
  });

  it('never exceeds the budget or gives a group two orders', () => {
    let { s, id } = fixture();
    for (let round = 0; round < 6 && s.wars[id].status === 'active'; round++) {
      for (const side of ['attacker', 'defender'] as const) {
        const orders = chooseTacticalOrders(s, id, side);
        expect(validateTacticalOrders(s, id, side, orders)).toEqual([]);
        expect(new Set(orders.map(o => o.unitId)).size).toBe(orders.length);
      }
      s = resolveTacticalRound({ ...s, day: s.day + 1 }, id, chooseTacticalOrders(s, id, 'attacker'), s.wars[id].tactical!.round);
    }
  });
});

describe('0.86 playback', () => {
  const recorded = () => {
    const { s, id } = fixture(), n = resolveTacticalRound(s, id, [advance], 0);
    return n.wars[id].tactical!.events[0];
  };

  it('starts from the units before the round and ends exactly at the recorded result', () => {
    const e = recorded(), frames = playbackFrames(e);
    expect(frames).toBe(e.actions.length);
    expect(playbackUnits(e, 0)).toEqual(e.beforeUnits);
    expect(playbackUnits(e, frames)).toBe(e.units);
  });

  it('moves a group when its move action is reached and highlights that action', () => {
    const e = recorded(), step = e.actions.findIndex(a => a.kind === 'move' && a.unitId === advance.unitId) + 1;
    expect(playbackUnits(e, step - 1).find(u => u.id === advance.unitId)!.cell).toBe(21);
    expect(playbackUnits(e, step).find(u => u.id === advance.unitId)!.cell).toBe(22);
    const action = playbackAction(e, step)!;
    expect(action.kind).toBe('move'); expect(actionCell(action, playbackUnits(e, step))).toBe(22);
  });

  it('plays a migrated round without a timeline as one step', () => {
    const e = { ...recorded(), actions: [] } as TacticalRoundEvent;
    expect(playbackFrames(e)).toBe(1);
    expect(playbackUnits(e, 0)).toEqual(e.beforeUnits); expect(playbackUnits(e, 1)).toBe(e.units);
  });
});

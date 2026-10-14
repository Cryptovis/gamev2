import {withWarFuel} from './warFixture';
import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { GameState } from '../domain/game';
import type { TacticalBattle, TacticalUnit } from '../domain/tactical';
import { applyGameCommand } from '../engine/commands';
import {
  BATTLE_HEIGHT, BATTLE_WIDTH, cellDistance, distributeLosses, engagement, generateTerrain, migrateTacticalBattle,
  objectiveHolders, resolveTacticalRound, startTacticalBattle,
} from '../engine/systems/tactical';
import { COMMITTED_SHARE, emptyLosses, resolveCombatRound } from '../engine/systems/warfare';
import { migrateSave } from '../persistence/migrations';
import { snapshotGame } from '../persistence/snapshot';
import { valid083State } from '../persistence/validation083';

const declare = () => {
  let s = makeInitialState();
  s.world.tutorial.active = false; s.eventCooldownUntil = 10000; s.advisorCooldownUntil = 10000;
  s = applyGameCommand(withWarFuel(s), { type: 'military/declareWar', targetCountryId: 'GRC' });
  return { s, id: Object.keys(s.wars)[0] };
};
const fixture = () => { const { s, id } = declare(); return { s: startTacticalBattle(s, id), id }; };
const total = BATTLE_WIDTH * BATTLE_HEIGHT;
const place = (b: TacticalBattle, id: string, cell: number) => { b.units.find(u => u.id === id)!.cell = cell; };

describe('0.85 HD War v2 battlefield', () => {
  it('opens a 10×8 v2 battle with two objectives and five groups per side', () => {
    const { s, id } = fixture(), b = s.wars[id].tactical!;
    expect(b.version).toBe(2); expect([b.width, b.height]).toEqual([10, 8]); expect(b.terrain).toHaveLength(total);
    expect(b.objectives).toHaveLength(2);
    expect(b.units.filter(u => u.side === 'attacker')).toHaveLength(5); expect(b.units.filter(u => u.side === 'defender')).toHaveLength(5);
  });

  it('is fair: terrain, deployment and objectives are point-symmetric through the board centre (B5)', () => {
    const { s, id } = fixture(), b = s.wars[id].tactical!;
    for (let cell = 0; cell < total; cell++) expect(b.terrain[cell]).toBe(b.terrain[total - 1 - cell]);
    for (const u of b.units.filter(x => x.side === 'attacker')) {
      const mirror = b.units.find(x => x.side === 'defender' && x.id === u.id.replace('attacker', 'defender'))!;
      expect(mirror.cell).toBe(total - 1 - u.cell);
    }
    expect(b.objectives[1]).toBe(total - 1 - b.objectives[0]);
    // Deployment columns stay open so armour is never stuck at the start.
    for (const u of b.units) expect(b.terrain[u.cell]).toBe('plains');
  });

  it('generates terrain from the battle seed alone', () => {
    expect(generateTerrain(42, 'mountain')).toEqual(generateTerrain(42, 'mountain'));
    expect(generateTerrain(42, 'mountain')).not.toEqual(generateTerrain(43, 'mountain'));
    expect(generateTerrain(7, 'plains').includes('plains')).toBe(true);
  });

  it('holds an objective only while no enemy is adjacent, so the first arrival cannot lock it (B5)', () => {
    const { s, id } = fixture(), b = structuredClone(s.wars[id].tactical!), [objective] = b.objectives;
    place(b, 'attacker-infantry-1', objective);
    expect(objectiveHolders(b)[0]).toBe('attacker');
    place(b, 'defender-infantry-2', objective + 1);
    expect(objectiveHolders(b)[0]).toBeNull();
  });

  it('measures contact: groups far from the enemy are not engaged', () => {
    const { s, id } = fixture(), b = structuredClone(s.wars[id].tactical!);
    expect(engagement(b, 'attacker')).toBe(0);
    place(b, 'attacker-infantry-1', 44); place(b, 'defender-infantry-1', 45);
    const contact = engagement(b, 'attacker');
    expect(contact).toBeGreaterThan(0); expect(contact).toBeLessThan(1);
  });

  it('splits campaign losses across groups, weighting groups in contact, without losing or inventing troops', () => {
    const { s, id } = fixture(), b = structuredClone(s.wars[id].tactical!);
    place(b, 'attacker-infantry-1', 44); place(b, 'defender-infantry-1', 45);
    const losses = { ...emptyLosses(), personnel: 1001 };
    const taken = distributeLosses(b, b.units, 'attacker', losses, new Set());
    expect((taken.get('attacker-infantry-1') ?? 0) + (taken.get('attacker-infantry-2') ?? 0)).toBe(1001);
    expect(taken.get('attacker-infantry-1')!).toBeGreaterThan(taken.get('attacker-infantry-2')!);
  });

  it('records an action timeline for playback: moves, blocked moves and objective changes', () => {
    const { s, id } = fixture();
    const n = resolveTacticalRound(s, id, [{ unitId: 'attacker-infantry-1', kind: 'move', target: 22 }], 0);
    const e = n.wars[id].tactical!.events[0];
    expect(e.actions[0]).toMatchObject({ kind: 'move', side: 'attacker', unitId: 'attacker-infantry-1', from: 21, to: 22 });
    expect(e.objectives).toHaveLength(2);
    expect(e.actions.filter(a => a.kind === 'casualties').every(a => (a.amount ?? 0) > 0)).toBe(true);
  });

  it('keeps national and group losses reconciled after a round', () => {
    const { s, id } = fixture();
    const n = resolveTacticalRound(s, id, [{ unitId: 'attacker-infantry-1', kind: 'move', target: 22 }], 0), b = n.wars[id].tactical!, e = b.events[0];
    const sum = (us: TacticalUnit[], side: string) => us.filter(u => u.side === side && u.role === 'infantry').reduce((m, u) => m + u.remaining, 0);
    expect(sum(e.beforeUnits, 'attacker') - sum(b.units, 'attacker')).toBe(e.attackerLosses.personnel);
    expect(s.countries.TUR.military.personnel - n.countries.TUR.military.personnel).toBe(e.attackerLosses.personnel);
  });
});

describe('0.85 auto-resolve parity (B8)', () => {
  it('auto-resolve commits the same share of forces as a tactical battle', () => {
    const { s, id } = declare();
    const n = resolveCombatRound(s, id), w = n.wars[id];
    expect(w.attackerLosses.personnel).toBeLessThanOrEqual(Math.floor(s.countries.TUR.military.personnel * COMMITTED_SHARE));
    expect(w.defenderLosses.personnel).toBeLessThanOrEqual(Math.floor(s.countries.GRC.military.personnel * COMMITTED_SHARE));
  });

  it('auto-resolve and a tactical round inflict losses on the same scale', () => {
    const { s, id } = declare();
    const auto = resolveCombatRound(s, id).wars[id].attackerLosses.personnel;
    const t = startTacticalBattle(s, id);
    const tactical = resolveTacticalRound(t, id, [{ unitId: 'attacker-infantry-1', kind: 'move', target: 22 }], 0).wars[id].attackerLosses.personnel;
    expect(auto).toBeGreaterThan(0); expect(tactical).toBeGreaterThan(0);
    expect(tactical).toBeGreaterThan(auto / 3); expect(tactical).toBeLessThan(auto * 3);
  });
});

describe('0.85 schema 17 migration', () => {
  const legacy = (s: GameState, id: string) => {
    const w = s.wars[id];
    const units: TacticalUnit[] = [
      { id: 'attacker-infantry', side: 'attacker', role: 'infantry', cell: 7, allocated: 1000, remaining: 1000 },
      { id: 'defender-infantry', side: 'defender', role: 'infantry', cell: 10, allocated: 900, remaining: 900 },
    ];
    return { ...w, autoAssault: false, tactical: { version: 1, size: 6, startedDay: s.day, round: 0, terrain: Array(36).fill('plains'), objectiveCell: 15, initialUnits: structuredClone(units), units, revealed: { attacker: [], defender: [] }, events: [] } };
  };

  it('converts a 0.84 battle to v2 without changing its board or units', () => {
    const { s, id } = declare(), v1 = legacy(s, id).tactical;
    const v2 = migrateTacticalBattle(v1 as unknown as Parameters<typeof migrateTacticalBattle>[0]);
    expect(v2).toMatchObject({ version: 2, width: 6, height: 6, objectives: [15] });
    expect(v2.units).toEqual(v1.units); expect(v2.terrain).toHaveLength(36);
    expect(cellDistance(v2, 7, 10)).toBe(3);
  });

  it('loads a schema-16 save with an open 6×6 battle', () => {
    const { s, id } = declare();
    const old = { ...snapshotGame(s), schemaVersion: 16, wars: { ...s.wars, [id]: legacy(s, id) } } as unknown as GameState;
    const loaded = migrateSave(old)!;
    expect(loaded).not.toBeNull(); expect(loaded.schemaVersion).toBe(18);
    expect(loaded.wars[id].tactical).toMatchObject({ version: 2, width: 6, height: 6, objectives: [15], seed: 0 });
    expect(migrateSave(snapshotGame(loaded))).toEqual(loaded); // Phase 1: migrated legacy battle survives another save/load.
  });

  it('rejects a v2 battle that references a sector outside its own grid', () => {
    const { s, id } = fixture(), saved = snapshotGame(s);
    expect(valid083State(saved)).toBe(true);
    saved.wars[id].tactical!.units[0].cell = total + 5;
    expect(valid083State(saved)).toBe(false);
  });
});

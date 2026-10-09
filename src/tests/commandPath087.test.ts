import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { GameState } from '../domain/game';
import type { FacilityKind, IndustrialContract } from '../domain/industrial';
import { applyGameCommand, executeCommandResult } from '../engine/commands';
import { living, withLiving } from '../engine/systems/livingEconomy';
import { CURRENT_SCHEMA_VERSION, migrateSave, migrateSchema, OLDEST_SUPPORTED_SCHEMA } from '../persistence/migrations';
import { snapshotGame } from '../persistence/snapshot';

const base = () => { const s = makeInitialState(); s.world.tutorial.active = false; return s; };
const contract = (s: GameState, sellerId: string, buyerId: string): IndustrialContract => {
  const template = Object.values(s.industrialContracts)[0];
  return { ...(template ?? {}), id: 'C-087', sellerId, buyerId, active: true } as IndustrialContract;
};

describe('0.87 A5: player records go through typed commands', () => {
  it('toggles a facility and deduplicates a repeated command id', () => {
    const s = base(), kind = Object.keys(s.industrialEconomy.TUR.enabled)[0] as FacilityKind, before = s.industrialEconomy.TUR.enabled[kind];
    const first = executeCommandResult(s, { type: 'industry/toggleFacility', kind, commandId: 'toggle-1' });
    expect(first.status).toBe('applied'); expect(first.state.industrialEconomy.TUR.enabled[kind]).toBe(!before);
    const again = executeCommandResult(first.state, { type: 'industry/toggleFacility', kind, commandId: 'toggle-1' });
    expect(again.status).toBe('duplicate'); expect(again.state.industrialEconomy.TUR.enabled[kind]).toBe(!before);
    expect(applyGameCommand(s, { type: 'industry/toggleFacility', kind: 'not-a-facility' as FacilityKind })).toBe(s);
  });

  it('cancels only contracts the player is a party to', () => {
    let s = base();
    s = { ...s, industrialContracts: { ...s.industrialContracts, 'C-087': contract(s, 'TUR', 'GRC'), 'C-OTHER': { ...contract(s, 'DEU', 'FRA'), id: 'C-OTHER' } } };
    expect(applyGameCommand(s, { type: 'industry/cancelContract', id: 'C-087' }).industrialContracts['C-087'].active).toBe(false);
    expect(applyGameCommand(s, { type: 'industry/cancelContract', id: 'C-OTHER' })).toBe(s);
  });

  it('moves the tutorial within its 0–9 steps and pauses the clock', () => {
    const s = { ...base(), speed: 3 as const };
    const n = applyGameCommand(s, { type: 'tutorial/set', step: 42, active: true });
    expect(n.world.tutorial.step).toBe(9); expect(n.speed).toBe(0); expect(n.world.tutorial.completed).toBe(false);
    expect(applyGameCommand(s, { type: 'tutorial/set', step: 3, active: false }).world.tutorial.completed).toBe(true);
  });

  it('marks letters and correspondence as read and dismisses the economic notice', () => {
    let s = base();
    const l = living(s);
    s = withLiving(s, { ...l, notice: { title: 'Notice', summary: 'Text' }, letters: l.letters.map(x => ({ ...x, read: false })) });
    s = { ...s, leadership: { ...s.leadership, messages: [{ id: 'm1', senderId: 'GRC', day: 1, kind: 'birthday', tone: 'warm', text: 'Hello', read: false }] } };
    expect(living(applyGameCommand(s, { type: 'inbox/read', scope: 'letters' })).letters.every(x => x.read)).toBe(true);
    expect(applyGameCommand(s, { type: 'inbox/read', scope: 'leadership' }).leadership.messages[0].read).toBe(true);
    expect(living(applyGameCommand(s, { type: 'living/dismissNotice' })).notice).toBeNull();
  });
});

describe('0.87 A6: schema migration table', () => {
  it('refuses saves older than the oldest supported schema or newer than the game', () => {
    const s = snapshotGame(base());
    expect(migrateSave({ ...s, schemaVersion: OLDEST_SUPPORTED_SCHEMA - 1 })).toBeNull();
    expect(migrateSave({ ...s, schemaVersion: CURRENT_SCHEMA_VERSION + 1 })).toBeNull();
  });

  it('chains steps from an older schema up to the current one', () => {
    const s = snapshotGame(base());
    expect(migrateSchema({ ...s, schemaVersion: 15 }).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrateSave({ ...s, schemaVersion: 15 })?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('stops at a step that cannot apply instead of skipping it', () => {
    const s = snapshotGame(base());
    const old = { ...s, schemaVersion: 12, production: undefined } as unknown as GameState;
    expect(migrateSchema(old).schemaVersion).toBe(12);
    expect(migrateSave(old)).toBeNull();
  });
});

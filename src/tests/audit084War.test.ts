import { describe, it, expect } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { applyGameCommand, executeCommandResult } from '../engine/commands';
import { resolveCombatRound, type CombatOrders, type CombatSideOrders } from '../engine/systems/warfare';
import { startTacticalBattle, sideModifiers } from '../engine/systems/tactical';
import { changeGoodStock } from '../engine/systems/industrialEconomy';
import { valid083State } from '../persistence/validation083';
import type { GameState } from '../domain/game';

const base = () => { const s = makeInitialState(); s.world.tutorial.active = false; s.eventCooldownUntil = 10000; s.advisorCooldownUntil = 10000; return s; };
const declare = (target = 'GRC', s: GameState = base()) => { const n = applyGameCommand(s, { type: 'military/declareWar', targetCountryId: target }); const id = Object.values(n.wars).find(w => w.defenderId === target && w.status === 'active')!.id; return { s: n, id }; };
const side = (s: GameState, id: string): CombatSideOrders => { const m = s.countries[id].military; return { power: 1, loss: 1, fuel: 1, forces: { personnel: m.personnel, tanks: m.tanks, artillery: m.artillery, fighters: m.fighters, bombers: m.bombers, warships: m.warships } }; };
// Mirrors tactical defend/reserve-only orders: no offensive fuel.
const hold = (s: GameState, a: string, d: string): CombatOrders => ({ attacking: false, attacker: { ...side(s, a), fuel: 0 }, defender: { ...side(s, d), fuel: 0 } });

describe('0.84 audit: war resolution', () => {
  it('B1: a round without an attack cannot award victory, even at full defender exhaustion', () => {
    const { s, id } = declare();
    s.wars[id].defenderExhaustion = 99.9; s.countries.TUR.processedResources.fuel = 0;
    const n = resolveCombatRound(s, id, hold(s, 'TUR', 'GRC'));
    expect(n.wars[id].rounds).toBe(1);
    expect(n.wars[id].status).toBe('active');
    expect(n.countries.GRC.controllerCountryId).toBeNull();
  });

  it('B1/B2: holding still with zero fuel accrues no base exhaustion on the defender and never wins', () => {
    let { s, id } = declare();
    s.countries.TUR.processedResources.fuel = 0;
    for (let i = 0; i < 120 && s.wars[id].status === 'active'; i++) { s = resolveCombatRound(s, id, hold(s, 'TUR', 'GRC')); s = { ...s, day: s.day + 1 }; }
    expect(s.wars[id].rounds).toBeGreaterThan(20);
    expect(s.wars[id].status).not.toBe('victory');
    expect(s.countries.GRC.controllerCountryId).toBeNull();
    // Only loss-driven exhaustion remains: far below one point per round.
    expect(s.wars[id].defenderExhaustion).toBeLessThan(s.wars[id].rounds * .8);
  });

  it('B1: legacy auto-assault (no orders) still counts as an attack and builds exhaustion', () => {
    const { s, id } = declare();
    const n = resolveCombatRound(s, id);
    expect(n.wars[id].defenderExhaustion).toBeGreaterThan(.75);
    expect(n.wars[id].attackerExhaustion).toBeGreaterThan(1.2);
  });

  it('B3: declaring war records starting strength and the 8% collapse rule measures against it', () => {
    const { s, id } = declare();
    expect(s.wars[id].attackerStartPersonnel).toBe(s.countries.TUR.military.personnel);
    expect(s.wars[id].defenderStartPersonnel).toBe(s.countries.GRC.military.personnel);
    s.wars[id].defenderStartPersonnel = 100000; s.countries.GRC.military.personnel = 7000;
    const n = applyGameCommand(s, { type: 'military/assault', warId: id });
    expect(n.wars[id].status).toBe('victory');
  });

  it('B3: a tiny military is not defeated on round one by the absolute 5000 floor', () => {
    const { s, id } = declare('CYP');
    expect(s.countries.CYP.military.personnel).toBeLessThan(5000);
    const n = applyGameCommand(s, { type: 'military/assault', warId: id });
    expect(n.wars[id].rounds).toBe(1);
    expect(n.wars[id].status).toBe('active');
  });

  it('B3: the personnel floor does not hand victory to an attacker that did not attack', () => {
    const { s, id } = declare();
    s.countries.GRC.military.personnel = 3000;
    const n = resolveCombatRound(s, id, hold(s, 'TUR', 'GRC'));
    expect(n.wars[id].status).toBe('active');
  });

  it('B3: saves accept the optional start fields, still load without them and reject corrupt values', () => {
    const { s, id } = declare();
    expect(valid083State(s)).toBe(true);
    const legacy = structuredClone(s); delete legacy.wars[id].attackerStartPersonnel; delete legacy.wars[id].defenderStartPersonnel;
    expect(valid083State(legacy)).toBe(true);
    const corrupt = structuredClone(s); corrupt.wars[id].defenderStartPersonnel = Number.NaN;
    expect(valid083State(corrupt)).toBe(false);
  });
});

describe('0.84 audit: war commands', () => {
  it('B4: rejects annexed, controlled and self targets', () => {
    const s = base();
    const annexed = structuredClone(s); annexed.countries.GRC.annexedBy = 'BGR';
    const owned = structuredClone(s); owned.countries.GRC.controllerCountryId = 'TUR';
    const foreign = structuredClone(s); foreign.countries.GRC.controllerCountryId = 'BGR';
    for (const state of [annexed, owned, foreign]) {
      const r = executeCommandResult(state, { type: 'military/declareWar', targetCountryId: 'GRC' });
      expect(r.status).toBe('unavailable');
      expect(Object.keys(r.state.wars)).toHaveLength(0);
      expect(r.state.countries.TUR.diplomacy.relations.GRC?.status).not.toBe('war');
    }
    const self = executeCommandResult(s, { type: 'military/declareWar', targetCountryId: 'TUR' });
    expect(self.status).toBe('unavailable'); expect(Object.keys(self.state.wars)).toHaveLength(0);
  });

  it('B6: a legacy assault is blocked while a national decision is pending', () => {
    const { s, id } = declare();
    const pending: GameState = { ...s, activeEvent: { id: 'e', kind: 'tax_protest', title: 't', description: 'd', triggeredDay: s.day, options: [] } };
    const r = executeCommandResult(pending, { type: 'military/assault', warId: id });
    expect(r.status).toBe('unavailable');
    expect(r.state.wars[id].rounds).toBe(0);
    expect(r.state.countries.GRC.military).toEqual(s.countries.GRC.military);
  });

  it('C6: rejects non-finite numbers at the command boundary', () => {
    const s = base(), rate = s.countries.TUR.economy.taxRate;
    for (const bad of [Number.NaN, Infinity, -Infinity]) {
      const r = executeCommandResult(s, { type: 'economy/setTaxRate', rate: bad, commandId: 'tax-' + bad });
      expect(r.status).toBe('unavailable'); expect(r.state.countries.TUR.economy.taxRate).toBe(rate);
      expect(r.state.world.commandIds ?? []).not.toContain('tax-' + bad);
    }
    expect(executeCommandResult(s, { type: 'ministry/setAllocation', ministry: Object.keys(s.countries.TUR.ministries.allocations)[0] as never, value: Number.NaN }).status).toBe('unavailable');
    expect(executeCommandResult(s, { type: 'exchange/post', good: 'water' as never, quantity: Infinity, price: 1 }).status).toBe('unavailable');
    expect(executeCommandResult(s, { type: 'economy/setTaxRate', rate: 20 }).status).toBe('applied');
  });

  it('C7: a multi-year industrial contract is reported applied and deduplicated', () => {
    let s = base();
    for (const c of Object.values(s.countries)) { c.economy.treasury = 100; c.processedResources.electricity = 100; c.processedResources.steel = 100; c.processedResources.fuel = 100; }
    s.countries.TUR.diplomacy.relations.GRC = { score: 90, status: 'ally', treaties: ['trade', 'alliance'], sanctions: false };
    s.countries.GRC.diplomacy.relations.TUR = { score: 90, status: 'ally', treaties: ['trade', 'alliance'], sanctions: false };
    s = changeGoodStock(s, 'GRC', 'engines', 100);
    const command = { type: 'industry/order' as const, partnerId: 'GRC', good: 'engines' as const, quantity: 5, direction: 'buy' as const, years: 3 as const, commandId: 'contract-1' };
    const r = executeCommandResult(s, command);
    expect(Object.keys(r.state.industrialContracts).length).toBe(Object.keys(s.industrialContracts).length + 1);
    expect(r.status).toBe('applied');
    expect(r.state.world.commandIds).toContain('contract-1');
    expect(executeCommandResult(r.state, command).status).toBe('duplicate');
  });
});

describe('0.84 audit: tactical bombardment', () => {
  it('B7: a bombardment aimed at an empty sector applies no penalty', () => {
    const { s, id } = declare();
    const t = startTacticalBattle(s, id), w = t.wars[id], b = w.tactical!;
    const occupied = new Set(b.units.filter(u => u.remaining > 0).map(u => u.cell));
    const empty = Array.from({ length: 36 }, (_, i) => i).find(c => !occupied.has(c))!;
    const target = b.units.find(u => u.side === 'defender' && u.role === 'infantry')!;
    const quiet = sideModifiers(t, w, 'defender', [], []);
    const miss = sideModifiers(t, w, 'defender', [], [{ unitId: 'attacker-artillery', kind: 'bombard', target: empty }]);
    const hit = sideModifiers(t, w, 'defender', [], [{ unitId: 'attacker-artillery', kind: 'bombard', target: target.cell }]);
    expect(miss.power).toBe(quiet.power); expect(miss.loss).toBe(quiet.loss); expect(miss.lossByType).toEqual({});
    expect(hit.power).toBeLessThan(quiet.power); expect(hit.loss).toBeGreaterThan(quiet.loss); expect(hit.lossByType.personnel).toBe(.12);
  });
});

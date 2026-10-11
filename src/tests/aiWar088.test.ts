import {withWarFuel} from './warFixture';
import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { GameState, WarState } from '../domain/game';
import { applyGameCommand, executeCommandResult } from '../engine/commands';
import { tickGame } from '../engine/tick';
import {
  AI_WAR_GLOBAL_GAP_DAYS, AI_WAR_REVIEW_OFFSET, AI_OCCUPATION_DAYS, AI_COUNCIL_CEASEFIRE_DAYS, RIVALRY_OFFSET,
  aiWarTarget, processAiCeasefires, processAiDeclarations, processAiOccupations, processAiOffensives, processCouncilCeasefires, processRivalries,
} from '../engine/systems/aiWar';
import { addTreaty, relationFor, updateBilateralRelation } from '../engine/systems/diplomacy';
import { living } from '../engine/systems/livingEconomy';
import { chooseTacticalOrders, playerSide, startTacticalBattle, tacticalStartStatus } from '../engine/systems/tactical';
import { pendingVictory } from '../engine/systems/victory';
import { coalitionSupport, resolveCombatRound } from '../engine/systems/warfare';
import { coalitionCandidates, warDeclarationStatus } from '../engine/systems/warRules';
import { valid083State } from '../persistence/validation083';

/** Player Georgia; Türkiye (same region, overwhelming army) is hostile, rearming and fuelled. Day is a war-review day. */
function hostileNeighbour(): GameState {
  let s = makeInitialState();
  s = { ...s, playerCountryId: 'GEO', selectedCountryId: 'GEO', eventCooldownUntil: 100000, advisorCooldownUntil: 100000, world: { ...s.world, tutorial: { ...s.world.tutorial, active: false } } };
  const tur = s.countries.TUR;
  s = { ...s, day: 7 * 3 + AI_WAR_REVIEW_OFFSET, countries: { ...s.countries, TUR: { ...tur, processedResources: { ...tur.processedResources, fuel: 100000 }, politics: { ...tur.politics, stability: 70 }, ai: { ...tur.ai, strategicGoal: 'rearm' } } } };
  return updateBilateralRelation(s, 'TUR', 'GEO', r => ({ ...r, score: -70, status: 'hostile' }));
}
const warOf = (s: GameState, attackerId: string, defenderId: string) => Object.values(s.wars).find(w => w.attackerId === attackerId && w.defenderId === defenderId)!;
const withWar = (s: GameState, war: WarState): GameState => ({ ...s, wars: { ...s.wars, [war.id]: war } });
/** The AI war on the player as it stands right after the declaration. */
function underAttack() {
  const s = processAiDeclarations(hostileNeighbour());
  return { s, war: warOf(s, 'TUR', 'GEO') };
}

describe('0.88 AI war declarations (audit E1)', () => {
  it('declares war on a hostile, weaker neighbour under the player\'s rules and interrupts the player', () => {
    const base = hostileNeighbour();
    expect(aiWarTarget(base, 'TUR')?.targetId).toBe('GEO');
    const { s, war } = underAttack();
    expect(war).toBeDefined();
    expect(war.autoAssault).toBe(true);
    expect(war.attackerStartPersonnel).toBe(base.countries.TUR.military.personnel);
    expect(relationFor(s.countries.TUR, 'GEO').status).toBe('war');
    expect(s.countries.TUR.diplomacy.reputation).toBe(Math.max(0, base.countries.TUR.diplomacy.reputation - 8));
    expect(s.speed).toBe(0);
    expect(living(s).notice?.title).toBe('War declared on your country');
    expect(s.sitrep.some(m => m.includes('declared war on Georgia. You are the defender.'))).toBe(true);
    // The pause holds: a pending notice blocks the clock exactly like an event.
    expect(tickGame(s)).toBe(s);
  });

  it('needs hostility, a motive, fuel, a power edge and no pact', () => {
    const base = hostileNeighbour();
    expect(aiWarTarget(updateBilateralRelation(base, 'TUR', 'GEO', r => ({ ...r, score: -30, status: 'neutral' })), 'TUR')).toBeNull();
    expect(aiWarTarget(addTreaty(base, 'TUR', 'GEO', 'nonAggression'), 'TUR')).toBeNull();
    const tur = base.countries.TUR;
    expect(aiWarTarget({ ...base, countries: { ...base.countries, TUR: { ...tur, ai: { ...tur.ai, strategicGoal: 'stabilize' } } } }, 'TUR')).toBeNull();
    expect(aiWarTarget({ ...base, countries: { ...base.countries, TUR: { ...tur, processedResources: { ...tur.processedResources, fuel: 0 } } } }, 'TUR')).toBeNull();
    const geo = base.countries.GEO;
    const army = { ...tur.military, personnel: tur.military.personnel * 20, tanks: tur.military.tanks * 20, artillery: tur.military.artillery * 20, fighters: tur.military.fighters * 20, bombers: tur.military.bombers * 20 };
    expect(aiWarTarget({ ...base, countries: { ...base.countries, GEO: { ...geo, military: army } } }, 'TUR')).toBeNull();
    expect(aiWarTarget({ ...base, countries: { ...base.countries, GEO: { ...geo, controllerCountryId: 'RUS' } } }, 'TUR')).toBeNull();
    // The hard rule is the player's own.
    expect(warDeclarationStatus(base, 'TUR', 'GEO').allowed).toBe(true);
    expect(warDeclarationStatus(base, 'TUR', 'TUR').allowed).toBe(false);
  });

  it('keeps wars rare: one declaration per review, a worldwide gap and a per-country cooldown', () => {
    const { s } = underAttack();
    expect(processAiDeclarations({ ...s, day: s.day + 7 })).toEqual({ ...s, day: s.day + 7 });
    const ended = withWar(s, { ...warOf(s, 'TUR', 'GEO'), status: 'withdrawn' });
    const later = updateBilateralRelation({ ...ended, day: s.day + AI_WAR_GLOBAL_GAP_DAYS + 7 }, 'TUR', 'GEO', r => ({ ...r, score: -70, status: 'hostile' }));
    expect(aiWarTarget(later, 'TUR')).toBeNull();
  });

  it('is deterministic for the same seed', () => {
    const a = processAiDeclarations(hostileNeighbour()), b = processAiDeclarations(hostileNeighbour());
    expect(Object.keys(a.wars)).toEqual(Object.keys(b.wars));
    expect(a.simulationSeed).toBe(b.simulationSeed);
  });

  it('lets regional rivalries deepen among AI governments only', () => {
    let s = makeInitialState();
    s = { ...s, day: 14 * 2 + RIVALRY_OFFSET };
    const n = processRivalries(s);
    let lowered = 0;
    for (const c of Object.values(n.countries)) for (const [id, r] of Object.entries(c.diplomacy.relations)) {
      if (r.score < relationFor(s.countries[c.id], id).score) { lowered++; expect([c.id, id]).not.toContain(s.playerCountryId); }
    }
    expect(lowered).toBeGreaterThan(0);
    expect(processRivalries({ ...s, day: s.day + 1 })).toEqual({ ...s, day: s.day + 1 });
  });
});

describe('0.88 the player as defender (audit B9)', () => {
  it('shows the player as defender and opens HD War on the defending side', () => {
    const { s, war } = underAttack();
    expect(playerSide(s, war)).toBe('defender');
    expect(tacticalStartStatus(s, war.id)).toBeNull();
    const board = startTacticalBattle(s, war.id);
    const orders = chooseTacticalOrders(board, war.id, 'defender');
    const r = executeCommandResult({ ...board, world: { ...board.world, living: { ...living(board), notice: null } } }, { type: 'tactical/commit', warId: war.id, expectedRound: 0, orders });
    expect(r.status).toBe('applied');
    expect(r.state.wars[war.id].tactical!.round).toBe(1);
    expect(r.state.wars[war.id].tactical!.events[0].playerSide).toBe('defender');
  });

  it('keeps the AI offensive going: halting auto assault or idling on the HD War board does not freeze the war', () => {
    const { s, war } = underAttack();
    const halted = applyGameCommand(s, { type: 'military/setAutoAssault', warId: war.id, enabled: false });
    expect(halted.wars[war.id].autoAssault).toBe(false);
    const next = processAiOffensives({ ...halted, day: halted.day + 1 });
    expect(next.wars[war.id].rounds).toBe(1);
    const board = startTacticalBattle({ ...s, world: { ...s.world, living: { ...living(s), notice: null } } }, war.id);
    // The defender left a whole campaign day without orders: standing orders answer the next round.
    const idle = processAiOffensives({ ...board, day: board.day + 2 });
    expect(idle.wars[war.id].tactical!.round).toBe(1);
    expect(idle.wars[war.id].tactical!.events[0].playerSide).toBe('defender');
    // A defender who fought yesterday is not overridden.
    const fought = processAiOffensives(withWar({ ...board, day: board.day + 1 }, { ...board.wars[war.id], lastCombatDay: board.day }));
    expect(fought.wars[war.id].tactical!.round).toBe(0);
  });

  it('a defender\'s withdrawal concedes through the full lifecycle and ends the campaign when home falls', () => {
    const { s, war } = underAttack();
    const r = executeCommandResult(s, { type: 'military/withdraw', warId: war.id });
    expect(r.state.wars[war.id].status).toBe('victory');
    expect(r.state.countries.GEO.controllerCountryId).toBe('TUR');
    expect(relationFor(r.state.countries.GEO, 'TUR').status).toBe('hostile');
    expect(r.state.campaignStatus).toBe('lost');
    expect(r.state.speed).toBe(0);
    expect(r.state.sitrep[0]).toBe(`CAMPAIGN LOST // ${r.state.countries.GEO.name} fell under ${r.state.countries.TUR.name} control.`);
    expect(pendingVictory(r.state)).toBeUndefined();
  });

  it('losing the defensive war in combat also ends the campaign', () => {
    const { s, war } = underAttack();
    const n = resolveCombatRound(withWar({ ...s, day: s.day + 1 }, { ...war, defenderExhaustion: 99.9 }), war.id);
    expect(n.wars[war.id].status).toBe('victory');
    expect(n.campaignStatus).toBe('lost');
  });

  it('winning the defensive war queues the victory scroll', () => {
    const { s, war } = underAttack();
    const n = resolveCombatRound(withWar({ ...s, day: s.day + 1 }, { ...war, attackerExhaustion: 99.9 }), war.id);
    expect(n.wars[war.id].status).toBe('defeat');
    expect(pendingVictory(n)?.warId).toBe(war.id);
    expect(n.speed).toBe(0);
    expect(n.campaignStatus).toBe('active');
  });

  it('an exhausted AI attacker withdraws and the player is told', () => {
    const { s, war } = underAttack();
    const quiet = { ...s, world: { ...s.world, living: { ...living(s), notice: null } } };
    const n = processAiCeasefires(withWar(quiet, { ...war, attackerExhaustion: 75 }));
    expect(n.wars[war.id].status).toBe('withdrawn');
    expect(living(n).notice?.title).toBe('Ceasefire agreed');
    expect(n.speed).toBe(0);
    expect(n.countries.GEO.controllerCountryId).toBeFalsy();
    expect(relationFor(n.countries.TUR, 'GEO').status).toBe('hostile');
    expect(processAiCeasefires(withWar(quiet, war)).wars[war.id].status).toBe('active');
  });
});

describe('0.88 allies join the defender (audit E5)', () => {
  /** Türkiye (player) attacks Greece; Bulgaria is allied to Greece. Seed 0 makes the first join roll 0.24 (< 0.8). */
  function alliedDefender() {
    let s = makeInitialState();
    // Isolate this authored coalition from real-world opening alliances.
    for (const country of Object.values(s.countries)) country.diplomacy.relations = {};
    s = addTreaty({ ...s, simulationSeed: 0 }, 'GRC', 'BGR', 'alliance');
    return s;
  }

  it('an ally declares war on the attacker and adds power to the defender', () => {
    const base = alliedDefender();
    expect(coalitionCandidates(base, 'TUR', 'GRC')).toEqual([{ countryId: 'BGR', basis: 'alliance' }]);
    const s = applyGameCommand(withWarFuel(base), { type: 'military/declareWar', targetCountryId: 'GRC' });
    const war = warOf(s, 'TUR', 'GRC');
    expect(war.defenderAllies).toEqual(['BGR']);
    expect(relationFor(s.countries.BGR, 'TUR').status).toBe('war');
    expect(coalitionSupport(s, war)).toBeGreaterThan(0);
    const day = { ...s, day: s.day + 1 };
    const withAllies = resolveCombatRound(day, war.id), alone = resolveCombatRound(withWar(day, { ...war, defenderAllies: [] }), war.id);
    expect(withAllies.wars[war.id].progress).toBeLessThan(alone.wars[war.id].progress);
    // The war ends: the ally returns to hostile relations with the attacker.
    const ended = applyGameCommand(s, { type: 'military/withdraw', warId: war.id });
    expect(relationFor(ended.countries.BGR, 'TUR').status).toBe('hostile');
  });

  it('collective-security bloc members may join; allies bound to the attacker and the player never do', () => {
    let s = alliedDefender();
    s = { ...s, blocs: { B: { id: 'B', name: 'Compact', leaderId: 'GRC', memberIds: ['GRC', 'ALB'], cohesion: 70, doctrine: 'collective_security' } } };
    expect(coalitionCandidates(s, 'TUR', 'GRC')).toContainEqual({ countryId: 'ALB', basis: 'bloc' });
    expect(coalitionCandidates(addTreaty(s, 'BGR', 'TUR', 'nonAggression'), 'TUR', 'GRC').map(c => c.countryId)).not.toContain('BGR');
    const playerAlly = addTreaty({ ...s, playerCountryId: 'BGR' }, 'GRC', 'BGR', 'alliance');
    expect(coalitionCandidates(playerAlly, 'TUR', 'GRC').map(c => c.countryId)).not.toContain('BGR');
  });
});

describe('0.88 wars end', () => {
  it('a neutral Council member proposes a ceasefire on a long war, under the player\'s rule', () => {
    const { s, war } = underAttack();
    // The daily tick gives every member influence; here one neutral member has enough to propose.
    const council = { ...s.council, influenceByCountry: { ...s.council.influenceByCountry, USA: 40 } };
    const old = withWar({ ...s, council, day: s.day + AI_COUNCIL_CEASEFIRE_DAYS + 7 - ((AI_COUNCIL_CEASEFIRE_DAYS + 7) % 7) }, war);
    const n = processCouncilCeasefires(old);
    const resolution = n.council.history[0];
    expect(resolution.type).toBe('ceasefire');
    expect(resolution.targetCountryId).toBe('TUR');
    expect(resolution.proposerId).toBe('USA');
    if (resolution.passed) expect(n.wars[war.id].status).toBe('withdrawn');
    // Once per war.
    expect(processCouncilCeasefires({ ...n, wars: old.wars, day: n.day + 7 }).council.history.length).toBe(n.council.history.length);
  });

  it('an AI occupier restores independence a year after victory; the player\'s occupations are untouched', () => {
    let s = makeInitialState();
    const war: WarState = { ...underAttack().war, id: 'IRQ-KWT-1', attackerId: 'IRQ', defenderId: 'KWT', status: 'victory', startedDay: 1, lastCombatDay: 5 };
    s = withWar({ ...s, day: 5 + AI_OCCUPATION_DAYS + 3 }, war);
    s = { ...s, day: s.day + ((AI_WAR_REVIEW_OFFSET - s.day) % 7 + 7) % 7, countries: { ...s.countries, KWT: { ...s.countries.KWT, controllerCountryId: 'IRQ' }, GRC: { ...s.countries.GRC, controllerCountryId: 'TUR' } } };
    s = withWar(s, { ...war, id: 'TUR-GRC-1', attackerId: 'TUR', defenderId: 'GRC' });
    const n = processAiOccupations(s);
    expect(n.countries.KWT.controllerCountryId).toBeNull();
    expect(relationFor(n.countries.KWT, 'IRQ').score).toBe(-40);
    expect(n.countries.GRC.controllerCountryId).toBe('TUR');
  });
});

describe('0.88 save compatibility', () => {
  it('accepts wars with and without defenderAllies and rejects malformed coalitions', () => {
    const s = applyGameCommand(withWarFuel(makeInitialState()), { type: 'military/declareWar', targetCountryId: 'GRC' }), war = warOf(s, 'TUR', 'GRC');
    expect(valid083State(s)).toBe(true);
    expect(valid083State(withWar(s, { ...war, defenderAllies: ['ARM'] }))).toBe(true);
    expect(valid083State(withWar(s, { ...war, defenderAllies: ['TUR'] }))).toBe(false);
    expect(valid083State(withWar(s, { ...war, defenderAllies: ['XXX'] }))).toBe(false);
    expect(valid083State(withWar(s, { ...war, defenderAllies: ['ARM', 'ARM'] }))).toBe(false);
  });
});

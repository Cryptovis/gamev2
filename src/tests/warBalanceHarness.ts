import type {BattlefieldTerrain, CountryState, GameState, WarState} from '../domain/game';
import type {TacticalOrder, TacticalSide} from '../domain/tactical';
import {makeInitialState} from '../data/initialState';
import {emptyLosses, getWarPreview, resolveCombatRound, terrainForCountry} from '../engine/systems/warfare';
import {chooseSingleRoundOrders, cellDistance, resolveStandingRound, resolveTacticalRound, startTacticalBattle} from '../engine/systems/tactical';
import {academyFor, governance} from '../engine/systems/governance';
import {tickGame} from '../engine/tick';
import {openWar} from '../engine/systems/warRules';
import {resolveEvent} from '../engine/systems/events';
import {dismissVictory, pendingVictory} from '../engine/systems/victory';
import {applyForCredit, arrears, availableCreditOffers, creditApplicationPreview, creditRating, expansion} from '../engine/systems/sovereignCredit';

/**
 * Paired war-balance scenarios (Phase 3). Two identical "twin" countries are cloned from one template so that a
 * scenario changes exactly one factor: the defender's terrain, air power, supply, exhaustion or fuel. The combat
 * rules are the game's own; the harness only builds states and advances the day counter.
 */
export const ATTACKER_ID = 'CZE';
/** A host id per terrain: terrainForCountry() maps these ids to the named battlefield. */
export const TERRAIN_HOSTS: Record<BattlefieldTerrain, string> = {plains: 'POL', urban: 'DEU', mountain: 'CHE', forest: 'FIN', desert: 'SAU', coastal: 'CYP'};
export const TEMPLATE_ID = 'POL';

type Mutable = Record<string, unknown>;
/** Copies every per-country record of `from` (country, infrastructure, production…) to `to`. */
function twin(state: GameState, from: string, to: string): GameState {
  const next = {...state} as unknown as Mutable;
  for (const [key, value] of Object.entries(state)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const record = value as Record<string, unknown>;
    if (key !== 'countries' && from in record) next[key] = {...record, [to]: structuredClone(record[from])};
  }
  // World-level records keyed by country (academies, living economy…), one and two levels deep.
  const world = {...state.world} as unknown as Mutable;
  for (const [key, value] of Object.entries(state.world)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const record = value as Record<string, unknown>;
    if (from in record) { world[key] = {...record, [to]: structuredClone(record[from])}; continue; }
    const nested = {...record}; let changed = false;
    for (const [inner, child] of Object.entries(record)) if (child && typeof child === 'object' && !Array.isArray(child) && from in (child as Record<string, unknown>)) { nested[inner] = {...(child as Record<string, unknown>), [to]: structuredClone((child as Record<string, unknown>)[from])}; changed = true; }
    if (changed) world[key] = nested;
  }
  next.world = world;
  const template = state.countries[TEMPLATE_ID], source = state.countries[from];
  const country: CountryState = {...structuredClone(source), id: to, name: `Twin ${to}`, region: template.region, subregion: template.subregion};
  (next as unknown as GameState).countries = {...state.countries, [to]: country};
  return next as unknown as GameState;
}

export interface Setup { state: GameState; warId: string; attackerId: string; defenderId: string }
export interface ScenarioSpec {
  name: string;
  terrain?: BattlefieldTerrain;
  /** Adjust the twins after cloning; both start identical. */
  adjust?: (attacker: CountryState, defender: CountryState) => void;
  war?: Partial<WarState>;
  /** State-level changes, e.g. grounding a side's pilots. */
  prepare?: (state: GameState, attackerId: string, defenderId: string) => GameState;
}
/** Grounds a side's aircraft by leaving them without trained crews: air superiority changes, counts and personnel do not. */
export function groundAircraft(state: GameState, id: string): GameState {
  const g = governance(state);
  return {...state, world: {...state.world, governance: {...g, academies: {...g.academies, [id]: {...academyFor(state, id), pilots: 0}}}}};
}

export function scenarioState(spec: ScenarioSpec, seed: number): Setup {
  const defenderId = TERRAIN_HOSTS[spec.terrain ?? 'plains'];
  let state = makeInitialState();
  state.world.tutorial.active = false;
  state = twin(state, TEMPLATE_ID, ATTACKER_ID);
  state = twin(state, TEMPLATE_ID, defenderId);
  const attacker = state.countries[ATTACKER_ID], defender = state.countries[defenderId];
  for (const c of [attacker, defender]) c.processedResources.fuel = 100000;
  spec.adjust?.(attacker, defender);
  if (spec.prepare) state = spec.prepare(state, ATTACKER_ID, defenderId);
  const crewed = (id: string) => { const c = state.countries[id], a = academyFor(state, id), need = c.military.fighters + c.military.bombers, cover = (need ? Math.min(1, a.pilots / need) : 1) * (a.funded ? 1 : .5); return {...c, military: {...c.military, fighters: c.military.fighters * cover, bombers: c.military.bombers * cover}}; };
  const preview = getWarPreview(crewed(ATTACKER_ID), crewed(defenderId), state.infrastructure[ATTACKER_ID], state.infrastructure[defenderId]);
  const warId = `${ATTACKER_ID}-${defenderId}`;
  const war: WarState = {
    id: warId, attackerId: ATTACKER_ID, defenderId, startedDay: state.day, progress: 0, rounds: 0, autoAssault: true, status: 'active',
    terrain: terrainForCountry(defender), attackerSupply: preview.attackerSupply, defenderSupply: preview.defenderSupply, airSuperiority: preview.airSuperiority,
    attackerExhaustion: 0, defenderExhaustion: 0, lastCombatDay: state.day - 1, attackerLosses: emptyLosses(), defenderLosses: emptyLosses(), lastReport: '',
    attackerStartPersonnel: attacker.military.personnel, defenderStartPersonnel: defender.military.personnel, defenderAllies: [], ...spec.war,
  };
  state = {...state, simulationSeed: seed >>> 0, wars: {[warId]: war}, playerCountryId: 'USA'};
  return {state, warId, attackerId: ATTACKER_ID, defenderId};
}

export interface AutoResult { deltas: number[]; endDay: number | null; status: WarState['status']; attackerLosses: number; defenderLosses: number; attackerFuelUsed: number; defenderFuelUsed: number; air: number; supply: [number, number] }

/** Auto-resolve (the path every AI war and every untouched front uses) for up to `days` days. */
export function runAuto(spec: ScenarioSpec, seed: number, days = 90): AutoResult {
  const {state: start, warId, attackerId, defenderId} = scenarioState(spec, seed);
  let state = start;
  const deltas: number[] = [];
  let endDay: number | null = null;
  for (let day = 1; day <= days; day++) {
    state = {...state, day: state.day + 1};
    const before = state.wars[warId].progress;
    state = resolveCombatRound(state, warId);
    const w = state.wars[warId];
    deltas.push(w.progress - before);
    if (w.status !== 'active') { endDay = day; break; }
  }
  const w = state.wars[warId];
  return {
    deltas, endDay, status: w.status, attackerLosses: w.attackerLosses.personnel / start.countries[attackerId].military.personnel,
    defenderLosses: w.defenderLosses.personnel / start.countries[defenderId].military.personnel,
    attackerFuelUsed: start.countries[attackerId].processedResources.fuel - state.countries[attackerId].processedResources.fuel,
    defenderFuelUsed: start.countries[defenderId].processedResources.fuel - state.countries[defenderId].processedResources.fuel,
    air: w.airSuperiority, supply: [w.attackerSupply, w.defenderSupply],
  };
}

export interface TacticalResult { rounds: number; progress: number; status: WarState['status']; reversals: Record<TacticalSide, number>; moves: Record<TacticalSide, number>; captures: Record<TacticalSide, number>; goalSwitches: Record<TacticalSide, number>; heldRounds: Record<TacticalSide, number> }

/**
 * A tactical battle where both sides are commanded by AI. The attacker plays the "player" side: `planner` uses its
 * standing multi-round plan (auto mode); `single` uses the single-round AI, for comparison. The defender is always the
 * game's opponent AI. Plan consistency is measured as goal switches: rounds in which a side's movement heads for a
 * different objective than the round before, and back-and-forth moves (returning to the sector left the round before).
 */
export function runTactical(spec: ScenarioSpec, seed: number, rounds = 20, attackerAi: 'planner' | 'single' = 'planner'): TacticalResult {
  const setup = scenarioState(spec, seed);
  let state = {...setup.state, playerCountryId: setup.attackerId};
  state = startTacticalBattle(state, setup.warId);
  const reversals = {attacker: 0, defender: 0}, moves = {attacker: 0, defender: 0}, captures = {attacker: 0, defender: 0}, goalSwitches = {attacker: 0, defender: 0}, heldRounds = {attacker: 0, defender: 0};
  const lastFrom = new Map<string, number>(), lastGoal: Record<TacticalSide, number | null> = {attacker: null, defender: null};
  let played = 0;
  for (let r = 0; r < rounds; r++) {
    state = {...state, day: state.day + 1};
    const w = state.wars[setup.warId];
    if (w.status !== 'active' || !w.tactical) break;
    const next = attackerAi === 'planner' ? resolveStandingRound(state, setup.warId) : resolveTacticalRound(state, setup.warId, chooseSingleRoundOrders(state, setup.warId, 'attacker'), w.tactical.round);
    if (next === state) break;
    state = next; played++;
    const b = state.wars[setup.warId].tactical!, event = b.events.at(-1)!;
    const pull: Record<TacticalSide, Map<number, number>> = {attacker: new Map(), defender: new Map()};
    for (const action of event.actions) {
      if (action.kind === 'capture') captures[action.side]++;
      if (action.kind !== 'move' || !action.unitId) continue;
      moves[action.side]++;
      if (lastFrom.get(action.unitId) === action.to) reversals[action.side]++;
      lastFrom.set(action.unitId, action.from!);
      for (const o of b.objectives) pull[action.side].set(o, (pull[action.side].get(o) ?? 0) + cellDistance(b, action.from!, o) - cellDistance(b, action.to!, o));
    }
    for (const side of ['attacker', 'defender'] as const) {
      const ranked = [...pull[side]].filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1] || x[0] - y[0]);
      const goal = ranked[0]?.[0] ?? null;
      if (goal !== null && lastGoal[side] !== null && goal !== lastGoal[side]) goalSwitches[side]++;
      if (goal !== null) lastGoal[side] = goal;
      heldRounds[side] += event.objectives.filter(h => h === side).length;
    }
  }
  const w = state.wars[setup.warId];
  return {rounds: played, progress: w.progress, status: w.status, reversals, moves, captures, goalSwitches, heldRounds};
}

export const BALANCE_SEEDS = Array.from({length: 24}, (_, i) => (0x9e3779b1 * (i + 1)) >>> 0);
export const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

/** Scenario catalogue shared by the measurement and the balance regression tests. */
export const SCENARIOS: ScenarioSpec[] = [
  {name: 'equal · plains'},
  ...(['urban', 'mountain', 'forest', 'desert', 'coastal'] as const).map(terrain => ({name: `equal · ${terrain}`, terrain})),
  // Full air superiority: the other side's aircraft have no trained crews (same forces otherwise).
  {name: 'attacker air superiority · plains', prepare: (s, _, d) => groundAircraft(s, d)},
  {name: 'defender air superiority · plains', prepare: (s, a) => groundAircraft(s, a)},
  {name: 'attacker air superiority · mountain', terrain: 'mountain', prepare: (s, _, d) => groundAircraft(s, d)},
  {name: 'attacker low supply', adjust: a => { a.military.logistics = 15; a.industry.utilization = 20; }},
  {name: 'attacker 1.5× forces', adjust: a => { for (const k of ['personnel', 'tanks', 'artillery', 'fighters', 'bombers'] as const) a.military[k] = Math.round(a.military[k] * 1.5); }},
  {name: 'attacker exhausted (50)', war: {attackerExhaustion: 50}},
  {name: 'attacker without fuel', adjust: a => { a.processedResources.fuel = 0; }},
  {name: 'defender without fuel', adjust: (_, d) => { d.processedResources.fuel = 0; }},
];

export interface SmallEconomyResult { days: number; status: WarState['status']; minTreasury: number; arrearsDays: number; worstRating: number; rescueOfferDay: number | null; rescueApplied: boolean; rescueApproved: boolean; bankrupt: boolean }

/**
 * A small economy (the player) defending for up to 90 days against a regional AI attacker, on the full daily tick.
 * The player applies for the first rescue line offered. "Bankrupt" means arrears that persist for 30+ days.
 */
export function runSmallEconomyDefense(seed: number, defenderId = 'ARM', attackerId = 'GEO', days = 90, lowTreasury = false): SmallEconomyResult {
  let state = makeInitialState();
  state = {...state, simulationSeed: seed >>> 0, playerCountryId: defenderId, speed: 0, eventCooldownUntil: 100000, advisorCooldownUntil: 100000,
    playerProfile: {...state.playerProfile, setupComplete: true}, world: {...state.world, tutorial: {...state.world.tutorial, active: false, completed: true}}};
  const a = state.countries[attackerId], d = state.countries[defenderId];
  state = {...state, countries: {...state.countries, [attackerId]: {...a, processedResources: {...a.processedResources, fuel: Math.max(a.processedResources.fuel, 5000)}},
    // lowTreasury: the defender enters the war with cash below the 1.5%-of-GDP rescue threshold.
    [defenderId]: lowTreasury ? {...d, economy: {...d.economy, treasury: d.economy.gdp * 0.01}} : d}};
  const opened = openWar(state, attackerId, defenderId, true);
  state = opened.state;
  const warId = opened.warId!;
  let minTreasury = Infinity, arrearsDays = 0, worstRating = 100, rescueOfferDay: number | null = null, rescueApplied = false, run = 0;
  for (let day = 0; day < days; day++) {
    if (state.activeEvent) state = resolveEvent(state, state.activeEvent.options[0].id);
    for (let v = pendingVictory(state); v; v = pendingVictory(state)) state = dismissVictory(state, v.warId);
    const living = state.world.living;
    state = {...state, activeEvent: null, activeAdvisor: null, world: {...state.world, living: living ? {...living, advice: {...living.advice, active: null}, notice: undefined} : living}};
    state = tickGame(state);
    const c = state.countries[defenderId];
    minTreasury = Math.min(minTreasury, c.economy.treasury);
    run = arrears(state, defenderId) > 1e-8 ? run + 1 : 0; arrearsDays = Math.max(arrearsDays, run);
    worstRating = Math.min(worstRating, creditRating(state, defenderId).score);
    const rescue = availableCreditOffers(state, defenderId).find(o => o.emergency && o.targetCountryId === defenderId);
    if (rescue && rescueOfferDay === null) rescueOfferDay = day + 1;
    if (rescue && !rescueApplied && creditApplicationPreview(state, rescue.id, defenderId).allowed) { state = applyForCredit(state, rescue.id, defenderId); rescueApplied = true; }
    if (state.wars[warId].status !== 'active') break;
  }
  const rescueApproved = (expansion(state).creditApplications ?? []).some(x => x.borrowerId === defenderId && x.status === 'approved') || expansion(state).loans.some(l => l.borrowerId === defenderId);
  return {days: state.day, status: state.wars[warId].status, minTreasury, arrearsDays, worstRating, rescueOfferDay, rescueApplied, rescueApproved, bankrupt: arrearsDays >= 30};
}

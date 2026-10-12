import type {BattlefieldTerrain, CountryState, GameState, WarState} from '../domain/game';
import type {TacticalOrder, TacticalSide} from '../domain/tactical';
import {makeInitialState} from '../data/initialState';
import {emptyLosses, getWarPreview, resolveCombatRound, terrainForCountry} from '../engine/systems/warfare';
import {chooseTacticalOrders, resolveTacticalRound, startTacticalBattle} from '../engine/systems/tactical';

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
  const preview = getWarPreview(attacker, defender, state.infrastructure[ATTACKER_ID], state.infrastructure[defenderId]);
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

export interface TacticalResult { rounds: number; progress: number; status: WarState['status']; reversals: Record<TacticalSide, number>; moves: Record<TacticalSide, number>; captures: Record<TacticalSide, number> }

/**
 * A tactical battle where both sides use the game's tactical AI (the attacker plays as the "player" side with
 * standing orders, exactly as auto mode does). Counts back-and-forth moves (a unit returning to the sector it
 * left the round before) as a measure of plan inconsistency.
 */
export function runTactical(spec: ScenarioSpec, seed: number, rounds = 20, choose: (s: GameState, id: string, side: TacticalSide) => TacticalOrder[] = chooseTacticalOrders): TacticalResult {
  const setup = scenarioState(spec, seed);
  let state = {...setup.state, playerCountryId: setup.attackerId};
  state = startTacticalBattle(state, setup.warId);
  const reversals = {attacker: 0, defender: 0}, moves = {attacker: 0, defender: 0}, captures = {attacker: 0, defender: 0};
  const lastFrom = new Map<string, number>();
  let played = 0;
  for (let r = 0; r < rounds; r++) {
    state = {...state, day: state.day + 1};
    const w = state.wars[setup.warId];
    if (w.status !== 'active' || !w.tactical) break;
    const next = resolveTacticalRound(state, setup.warId, choose(state, setup.warId, 'attacker'), w.tactical.round);
    if (next === state) break;
    state = next; played++;
    const event = state.wars[setup.warId].tactical?.events.at(-1);
    for (const action of event?.actions ?? []) {
      if (action.kind === 'capture') captures[action.side]++;
      if (action.kind !== 'move' || !action.unitId) continue;
      moves[action.side]++;
      if (lastFrom.get(action.unitId) === action.to) reversals[action.side]++;
      lastFrom.set(action.unitId, action.from!);
    }
  }
  const w = state.wars[setup.warId];
  return {rounds: played, progress: w.progress, status: w.status, reversals, moves, captures};
}

export const BALANCE_SEEDS = Array.from({length: 24}, (_, i) => (0x9e3779b1 * (i + 1)) >>> 0);
export const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

/** Scenario catalogue shared by the measurement and the balance regression tests. */
export const SCENARIOS: ScenarioSpec[] = [
  {name: 'equal · plains'},
  ...(['urban', 'mountain', 'forest', 'desert', 'coastal'] as const).map(terrain => ({name: `equal · ${terrain}`, terrain})),
  // Same total military power, but the attacker trades personnel for aircraft until it holds the air.
  {name: 'attacker air superiority · plains', adjust: (a, d) => { const extra = Math.max(60, d.military.fighters * 2); a.military.personnel = Math.max(1000, a.military.personnel - extra * 8 / 0.002); a.military.fighters += extra; d.military.personnel += d.military.fighters * 8 / 0.002; d.military.fighters = 0; d.military.bombers = 0; }},
  {name: 'defender air superiority · plains', adjust: (a, d) => { const extra = Math.max(60, a.military.fighters * 2); d.military.personnel = Math.max(1000, d.military.personnel - extra * 8 / 0.002); d.military.fighters += extra; a.military.personnel += a.military.fighters * 8 / 0.002; a.military.fighters = 0; a.military.bombers = 0; }},
  {name: 'attacker low supply', adjust: a => { a.military.logistics = 15; a.industry.utilization = 20; }},
  {name: 'attacker 1.5× forces', adjust: a => { for (const k of ['personnel', 'tanks', 'artillery', 'fighters', 'bombers'] as const) a.military[k] = Math.round(a.military[k] * 1.5); }},
  {name: 'attacker exhausted (50)', war: {attackerExhaustion: 50}},
  {name: 'attacker without fuel', adjust: a => { a.processedResources.fuel = 0; }},
  {name: 'defender without fuel', adjust: (_, d) => { d.processedResources.fuel = 0; }},
];

import type { CasualtySnapshot, CountryState, GameState, MilitaryState, WarState } from '../../domain/game';
import { nextRandom } from '../rng';
import { endWarRelation } from './diplomacy';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const zeroLosses = (): CasualtySnapshot => ({ personnel: 0, tanks: 0, artillery: 0, fighters: 0, bombers: 0, warships: 0 });

export const emptyLosses = zeroLosses;

function militaryPower(country: CountryState) {
  const m = country.military;
  const units = m.personnel * 0.002 + m.tanks * 1.6 + m.artillery * 1.1 + m.fighters * 8 + m.bombers * 11 + m.warships * 5;
  const quality = (m.readiness + m.morale + m.logistics + m.technology) / 400;
  return Math.max(1, units * (0.55 + quality * 0.9));
}

function applyLosses(military: MilitaryState, losses: CasualtySnapshot, oilAvailable: boolean): MilitaryState {
  return {
    ...military,
    personnel: Math.max(0, military.personnel - losses.personnel),
    tanks: Math.max(0, military.tanks - losses.tanks),
    artillery: Math.max(0, military.artillery - losses.artillery),
    fighters: Math.max(0, military.fighters - losses.fighters),
    bombers: Math.max(0, military.bombers - losses.bombers),
    warships: Math.max(0, military.warships - losses.warships),
    readiness: clamp(military.readiness - (oilAvailable ? 0.3 : 2.5), 0, 100),
    morale: clamp(military.morale - Math.min(1.2, losses.personnel / 8000), 0, 100),
    logistics: clamp(military.logistics - (oilAvailable ? 0.15 : 1.5), 0, 100),
  };
}

function addLosses(total: CasualtySnapshot, next: CasualtySnapshot): CasualtySnapshot {
  return {
    personnel: total.personnel + next.personnel,
    tanks: total.tanks + next.tanks,
    artillery: total.artillery + next.artillery,
    fighters: total.fighters + next.fighters,
    bombers: total.bombers + next.bombers,
    warships: total.warships + next.warships,
  };
}

function makeLosses(country: CountryState, rate: number, random: number): CasualtySnapshot {
  const m = country.military;
  const scale = rate * (0.72 + random * 0.56);
  return {
    personnel: Math.min(m.personnel, Math.max(20, Math.round(m.personnel * scale))),
    tanks: Math.min(m.tanks, Math.max(0, Math.round(m.tanks * scale * 0.85))),
    artillery: Math.min(m.artillery, Math.max(0, Math.round(m.artillery * scale * 0.75))),
    fighters: Math.min(m.fighters, Math.max(0, Math.round(m.fighters * scale * 0.45))),
    bombers: Math.min(m.bombers, Math.max(0, Math.round(m.bombers * scale * 0.32))),
    warships: Math.min(m.warships, Math.max(0, Math.round(m.warships * scale * 0.18))),
  };
}

export function resolveCombatRound(state: GameState, warId: string): GameState {
  const war = state.wars[warId];
  if (!war || war.status !== 'active') return state;
  const attacker = state.countries[war.attackerId];
  const defender = state.countries[war.defenderId];
  if (!attacker || !defender) return state;

  const fuelCost = Math.max(3, 2.5 + attacker.military.tanks * 0.0016 + attacker.military.fighters * 0.02 + attacker.military.bombers * 0.032);
  const hasFuel = attacker.processedResources.fuel >= fuelCost;

  const r1 = nextRandom(state.simulationSeed);
  const r2 = nextRandom(r1.seed);
  const r3 = nextRandom(r2.seed);

  const attackerPower = militaryPower(attacker) * (hasFuel ? 1 : 0.42);
  const defenderPower = militaryPower(defender) * (0.96 + r1.value * 0.08);
  const ratio = attackerPower / Math.max(1, defenderPower);

  const attackerLossRate = clamp(0.0018 + (1 / Math.max(0.45, ratio)) * 0.0027, 0.0015, 0.012);
  const defenderLossRate = clamp(0.0019 + ratio * 0.0031, 0.0015, 0.016);
  const attackerLosses = makeLosses(attacker, attackerLossRate, r2.value);
  const defenderLosses = makeLosses(defender, defenderLossRate, r3.value);

  const progressDelta = clamp((ratio - 1) * 12 + (r3.value - 0.5) * 6 + (hasFuel ? 1.5 : -7), -18, 18);
  const progress = clamp(war.progress + progressDelta, -100, 100);

  const nextAttacker: CountryState = {
    ...attacker,
    processedResources: { ...attacker.processedResources, fuel: Math.max(0, attacker.processedResources.fuel - Math.min(attacker.processedResources.fuel, fuelCost)) },
    military: applyLosses(attacker.military, attackerLosses, hasFuel),
    politics: { ...attacker.politics, approval: clamp(attacker.politics.approval - attackerLosses.personnel / 300000, 0, 100) },
  };
  const nextDefender: CountryState = {
    ...defender,
    military: applyLosses(defender.military, defenderLosses, true),
    politics: { ...defender.politics, stability: clamp(defender.politics.stability - defenderLosses.personnel / 180000, 0, 100) },
  };

  let status: WarState['status'] = 'active';
  if (progress >= 100 || nextDefender.military.personnel < Math.max(5000, defender.military.personnel * 0.08)) status = 'victory';
  else if (progress <= -100 || nextAttacker.military.personnel < Math.max(5000, attacker.military.personnel * 0.08)) status = 'defeat';

  const report = `${attacker.name} assault: ${progressDelta >= 0 ? '+' : ''}${progressDelta.toFixed(1)} front | losses ${attackerLosses.personnel.toLocaleString()} / enemy ${defenderLosses.personnel.toLocaleString()}${hasFuel ? '' : ' | FUEL CRISIS'}`;
  const nextWar: WarState = {
    ...war,
    progress,
    rounds: war.rounds + 1,
    status,
    autoAssault: status === 'active' ? war.autoAssault : false,
    attackerLosses: addLosses(war.attackerLosses, attackerLosses),
    defenderLosses: addLosses(war.defenderLosses, defenderLosses),
    lastReport: report,
  };

  let nextState: GameState = {
    ...state,
    simulationSeed: r3.seed,
    countries: { ...state.countries, [attacker.id]: nextAttacker, [defender.id]: nextDefender },
    wars: { ...state.wars, [warId]: nextWar },
    sitrep: [`WAR // ${report}`, ...state.sitrep].slice(0, 12),
  };

  if (status === 'victory') {
    nextState = {
      ...nextState,
      countries: {
        ...nextState.countries,
        [attacker.id]: { ...nextState.countries[attacker.id], politics: { ...nextState.countries[attacker.id].politics, approval: clamp(nextState.countries[attacker.id].politics.approval + 4, 0, 100) } },
        [defender.id]: { ...nextState.countries[defender.id], controllerCountryId: attacker.id, politics: { ...nextState.countries[defender.id].politics, stability: clamp(nextState.countries[defender.id].politics.stability - 15, 0, 100) } },
      },
      sitrep: [`VICTORY // ${defender.name} is now under ${attacker.name} control.`, ...nextState.sitrep].slice(0, 12),
    };
    nextState = endWarRelation(nextState, attacker.id, defender.id);
  } else if (status === 'defeat') {
    nextState = { ...endWarRelation(nextState, attacker.id, defender.id), sitrep: [`DEFEAT // ${attacker.name} offensive collapsed.`, ...nextState.sitrep].slice(0, 12) };
  }

  return nextState;
}

export function processAutoWars(state: GameState): GameState {
  let next = state;
  for (const war of Object.values(state.wars)) {
    if (war.status === 'active' && war.autoAssault) next = resolveCombatRound(next, war.id);
  }
  return next;
}

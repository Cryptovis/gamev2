import type { GameState, WarState } from '../../domain/game';
import { activeCountries } from '../../domain/sovereignty';
import { nextRandom } from '../rng';
import { calculateSupplyNetwork } from './supplyNetwork';
import { endWarRelation, relationFor, setWarRelation } from './diplomacy';
import { blocForCountry } from './blocs';
import { pilotCoverage } from './governance';
import { applyWarCondemnation } from './worldInstitutions';
import { coalitionSupportFrom, emptyLosses, getWarPreview } from './warfare';
import { settleWarOutcome } from './warOutcome';

/**
 * War rules shared by the player's commands and the AI (audit E1, B9, E5). The player's 'military/declareWar' and
 * 'military/withdraw' commands and the AI war planner (aiWar.ts) all declare, join and end wars through this module.
 */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const note = (state: GameState, message: string): GameState => ({ ...state, sitrep: [message, ...state.sitrep].slice(0, 12) });

export type WarBlock = 'invalid' | 'attacker_not_independent' | 'target_not_independent' | 'active' | 'fuel';
export interface WarEligibility { allowed: boolean; block?: WarBlock }

export const inActiveWar = (state: GameState, id: string) =>
  Object.values(state.wars).some(w => w.status === 'active' && (w.attackerId === id || w.defenderId === id));

export function activeWarBetween(state: GameState, aId: string, bId: string): WarState | undefined {
  return Object.values(state.wars).find(w => w.status === 'active' && ((w.attackerId === aId && w.defenderId === bId) || (w.attackerId === bId && w.defenderId === aId)));
}

export const WAR_MIN_FUEL_DAYS = 14;
/** Refined fuel is what vehicles use; crude oil alone cannot fund an operation. */
export function warFuelReadiness(state: GameState, attackerId: string) {
  const country = state.countries[attackerId];
  if (!country) return { allowed: false, days: 0, required: 0, missing: 0 };
  const supply = calculateSupplyNetwork(country);
  const required = supply.militaryFuelDemand * WAR_MIN_FUEL_DAYS;
  return { allowed: country.processedResources.fuel >= required, days: supply.fuelDays,
    required, missing: Math.max(0, required - country.processedResources.fuel) };
}
export const WAR_FUEL_MESSAGE = 'Build refined fuel reserves for at least 14 operational days before declaring war. Buy refined fuel in the market or refine oil in your factories.';

/** Human-readable failures use the same eligibility order as the command. */
export function warDeclarationReason(status: WarEligibility): string | undefined {
 if (status.allowed) return undefined;
 switch (status.block) {
  case 'fuel': return WAR_FUEL_MESSAGE;
  case 'active': return 'You are already at war with this country.';
  case 'attacker_not_independent': return 'Your country must be independent to declare war.';
  case 'target_not_independent': return 'This country is under foreign control. Choose an independent country.';
  default: return 'Choose another independent country as the target.';
 }
}
/** Hard rules for opening a war, identical for the player and the AI. */
export function warDeclarationStatus(state: GameState, attackerId: string, defenderId: string): WarEligibility {
  const attacker = state.countries[attackerId], defender = state.countries[defenderId];
  if (!attacker || !defender || attacker.id === defender.id) return { allowed: false, block: 'invalid' };
  if (attacker.annexedBy || (attacker.controllerCountryId != null && attacker.controllerCountryId !== attacker.id)) return { allowed: false, block: 'attacker_not_independent' };
  if (defender.annexedBy || defender.controllerCountryId != null) return { allowed: false, block: 'target_not_independent' };
  if (activeWarBetween(state, attacker.id, defender.id)) return { allowed: false, block: 'active' };
  if (!warFuelReadiness(state, attackerId).allowed) return { allowed: false, block: 'fuel' };
  return { allowed: true };
}

export function cancelPairTrades(state: GameState, aId: string, bId: string): GameState {
  const tradeDeals = Object.fromEntries(Object.entries(state.tradeDeals).map(([id, deal]) => [id, (deal.sellerId === aId && deal.buyerId === bId) || (deal.sellerId === bId && deal.buyerId === aId) ? { ...deal, active: false } : deal]));
  return { ...state, tradeDeals };
}

/** The same war preview the combat resolver uses: aircraft count only as far as trained pilots crew them. */
export function combatPreview(state: GameState, attackerId: string, defenderId: string) {
  const crewed = (id: string) => {
    const c = state.countries[id], cover = pilotCoverage(state, id);
    return { ...c, military: { ...c.military, fighters: c.military.fighters * cover, bombers: c.military.bombers * cover } };
  };
  return getWarPreview(crewed(attackerId), crewed(defenderId), state.infrastructure[attackerId], state.infrastructure[defenderId]);
}

// ---------------------------------------------------------------------------------------------
// Coalitions (audit E5)
// ---------------------------------------------------------------------------------------------

/** Chance that an eligible ally honours its obligation: a formal alliance, or only a collective-security bloc. */
export const JOIN_CHANCE = { alliance: 0.8, bloc: 0.6 } as const;
export interface CoalitionCandidate { countryId: string; basis: keyof typeof JOIN_CHANCE }

function collectiveBloc(state: GameState, countryId: string) {
  const bloc = blocForCountry(state, countryId);
  return bloc?.doctrine === 'collective_security' ? bloc : null;
}

/**
 * Countries that may join the defender: an 'alliance' treaty with the defender, or membership of the defender's
 * collective-security bloc. They stay out if they are bound to the attacker (alliance, non-aggression pact or the
 * same bloc), already fight a war, or are not independent. The player is never committed automatically.
 */
export function coalitionCandidates(state: GameState, attackerId: string, defenderId: string): CoalitionCandidate[] {
  const defenderBloc = collectiveBloc(state, defenderId), attackerBloc = blocForCountry(state, attackerId);
  const result: CoalitionCandidate[] = [];
  for (const c of activeCountries(state.countries)) {
    if ([attackerId, defenderId, state.playerCountryId].includes(c.id) || c.controllerCountryId) continue;
    const alliance = relationFor(c, defenderId).treaties.includes('alliance');
    const bloc = !!defenderBloc?.memberIds.includes(c.id);
    if (!alliance && !bloc) continue;
    const toAttacker = relationFor(c, attackerId);
    if (toAttacker.status === 'war' || toAttacker.treaties.includes('alliance') || toAttacker.treaties.includes('nonAggression')) continue;
    if (attackerBloc && attackerBloc.memberIds.includes(c.id)) continue;
    if (inActiveWar(state, c.id)) continue;
    result.push({ countryId: c.id, basis: alliance ? 'alliance' : 'bloc' });
  }
  return result;
}

/** Support the defender could expect if every candidate joined (what an attacker must plan for). */
export function potentialCoalitionSupport(state: GameState, attackerId: string, defenderId: string): number {
  return coalitionSupportFrom(state, defenderId, coalitionCandidates(state, attackerId, defenderId).map(c => c.countryId));
}

/** Each candidate rolls once (seeded); joiners go to war with the attacker and add power to the defender. */
export function callAllies(state: GameState, warId: string): GameState {
  const war = state.wars[warId];
  if (!war || war.status !== 'active') return state;
  let next = state, seed = state.simulationSeed;
  const joined: string[] = [];
  const attacker = state.countries[war.attackerId], defender = state.countries[war.defenderId];
  for (const candidate of coalitionCandidates(state, war.attackerId, war.defenderId)) {
    const roll = nextRandom(seed); seed = roll.seed;
    if (roll.value >= JOIN_CHANCE[candidate.basis]) continue;
    joined.push(candidate.countryId);
    next = setWarRelation(cancelPairTrades(next, candidate.countryId, war.attackerId), candidate.countryId, war.attackerId);
    next = note(next, `ALLIANCE // ${next.countries[candidate.countryId].name} joined the war on ${defender.name}'s side against ${attacker.name}.`);
  }
  // The player is told, never committed: joining is the player's own declaration.
  const player = state.countries[state.playerCountryId];
  if (player && ![war.attackerId, war.defenderId].includes(player.id) && relationFor(player, war.defenderId).treaties.includes('alliance'))
    next = note(next, `ALLIANCE // ${attacker.name} attacked your ally ${defender.name}.`);
  const current = next.wars[warId];
  return { ...next, simulationSeed: seed, wars: { ...next.wars, [warId]: joined.length ? { ...current, defenderAllies: [...(current.defenderAllies ?? []), ...joined] } : current } };
}

// ---------------------------------------------------------------------------------------------
// Declaring and ending wars
// ---------------------------------------------------------------------------------------------

/**
 * Opens a war with the player's exact consequences: trade severed, war relation, -8 reputation, Global Council
 * condemnation after a rejected attack ballot, then the defender's allies decide whether to join.
 * `autoAssault` is true for AI attackers so their offensive advances daily.
 */
export function openWar(state: GameState, attackerId: string, defenderId: string, autoAssault = false): { state: GameState; warId: string | null } {
  if (!warDeclarationStatus(state, attackerId, defenderId).allowed) return { state, warId: null };
  const attacker = state.countries[attackerId], defender = state.countries[defenderId];
  let warId = `${attacker.id}-${defender.id}-${state.day}`;
  let suffix = 0; while (state.wars[warId]) warId = `${attacker.id}-${defender.id}-${state.day}-${++suffix}`;
  const preview = getWarPreview(attacker, defender, state.infrastructure[attacker.id], state.infrastructure[defender.id]);
  const war: WarState = { id: warId, attackerId: attacker.id, defenderId: defender.id, startedDay: state.day, progress: 0, rounds: 0, autoAssault, status: 'active', terrain: preview.terrain, attackerSupply: preview.attackerSupply, defenderSupply: preview.defenderSupply, airSuperiority: preview.airSuperiority, attackerExhaustion: 0, defenderExhaustion: 0, lastCombatDay: state.day - 1, attackerLosses: emptyLosses(), defenderLosses: emptyLosses(), attackerStartPersonnel: attacker.military.personnel, defenderStartPersonnel: defender.military.personnel, lastReport: `Mobilization ordered · ${preview.terrain.toUpperCase()} theatre · supply ${preview.attackerSupply.toFixed(0)}%.` };
  let next = cancelPairTrades(state, attacker.id, defender.id);
  next = setWarRelation(next, attacker.id, defender.id);
  next = { ...next, wars: { ...next.wars, [warId]: war }, countries: { ...next.countries, [attacker.id]: { ...next.countries[attacker.id], diplomacy: { ...next.countries[attacker.id].diplomacy, reputation: clamp(next.countries[attacker.id].diplomacy.reputation - 8, 0, 100) } } } };
  next = applyWarCondemnation(state, note(next, `WAR // ${attacker.name} declared war on ${defender.name}.`), attacker.id, defender.id);
  return { state: callAllies(next, warId), warId };
}

export const ATTACKER_WITHDREW_REPORT = 'Attacker withdrew from the theatre.';
export const DEFENDER_CONCEDED_REPORT = 'Defender withdrew and conceded control.';

/**
 * Ends an active war by one side's choice, for the player and the AI alike. The attacker withdrawing is a ceasefire
 * ('withdrawn'); the defender withdrawing concedes: the attacker wins and takes control of the defender. Either way the
 * shared end-of-war lifecycle runs (victory scroll for a player win, allies released, home-front check).
 */
export function concedeWar(state: GameState, warId: string, side: 'attacker' | 'defender', message?: string): GameState {
  const war = state.wars[warId];
  if (!war || war.status !== 'active') return state;
  const defending = side === 'defender';
  let next: GameState = { ...state, wars: { ...state.wars, [war.id]: { ...war, status: defending ? 'victory' : 'withdrawn', autoAssault: false, lastReport: defending ? DEFENDER_CONCEDED_REPORT : ATTACKER_WITHDREW_REPORT } } };
  if (defending) { const d = next.countries[war.defenderId]; next = { ...next, countries: { ...next.countries, [d.id]: { ...d, controllerCountryId: war.attackerId, politics: { ...d.politics, stability: clamp(d.politics.stability - 15, 0, 100) } } } }; }
  next = endWarRelation(next, war.attackerId, war.defenderId);
  next = note(next, message ?? (defending ? 'WAR // Defender withdrew and conceded control to the attacker.' : 'WAR // Forces withdrew. Ceasefire established under hostile relations.'));
  return settleWarOutcome(next, war.id);
}

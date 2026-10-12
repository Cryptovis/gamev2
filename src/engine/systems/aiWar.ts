import { WAR_MIN_FUEL_DAYS } from './warRules';
import type { CountryState, GameState, StrategicGoal, WarState } from '../../domain/game';
import { activeCountries } from '../../domain/sovereignty';
import { nextRandom } from '../rng';
import { blocForCountry } from './blocs';
import { proposeCouncilResolution } from './council';
import { changeRelations, relationFor, updateBilateralRelation } from './diplomacy';
import { living, withLiving } from './livingEconomy';
import { calculateSupplyNetwork } from './supplyNetwork';
import { resolveStandingRound } from './tactical';
import { resolveCombatRound } from './warfare';
import { checkHomeFront, releaseCoalition } from './warOutcome';
import { processAiTaskGroups } from './aiTaskGroups';
import { combatPreview, concedeWar, inActiveWar, openWar, potentialCoalitionSupport, warDeclarationStatus } from './warRules';

/**
 * AI wars (audit E1, B9, E5). AI governments declare war through the player's rules (warRules.openWar), fight with the
 * shared combat resolver, call allies through the same coalition rule, end wars through the same concession and
 * Global Council paths, and are limited so wars stay rare and motivated.
 */

const note = (state: GameState, message: string): GameState => ({ ...state, sitrep: [message, ...state.sitrep].slice(0, 12) });

// --- Declaration ------------------------------------------------------------------------------
/** Weekly war review, offset from the weekly policy cycle. */
export const AI_WAR_REVIEW_INTERVAL = 7;
export const AI_WAR_REVIEW_OFFSET = 3;
/** At most this many wars started by AI governments are active at once, worldwide. */
export const AI_WAR_CAP = 3;
/** Minimum days between two AI declarations anywhere in the world. */
export const AI_WAR_GLOBAL_GAP_DAYS = 60;
/** A government that declared war waits this long before declaring another. */
export const AI_WAR_COUNTRY_COOLDOWN_DAYS = 365;
/** Two countries that fought wait this long after their last war ended (or after a peace settlement) before either attacks the other again. */
export const AI_WAR_PAIR_COOLDOWN_DAYS = 1095;
/** Effective power ratio needed, after the defender's potential allies are counted. */
export const AI_WAR_MIN_RATIO = 1.6;
/** Fuel cover needed: the same 14 operational days below which the player's war briefing warns. */
export const AI_WAR_MIN_FUEL_DAYS = WAR_MIN_FUEL_DAYS;
export const AI_WAR_MIN_STABILITY = 45;
export const AI_WAR_GOALS: readonly StrategicGoal[] = ['rearm', 'expand_influence', 'secure_resources'];
/** Chance per weekly review that a government with a valid target actually declares. */
export const AI_WAR_DECLARE_CHANCE = 0.2;

// --- Ending wars ------------------------------------------------------------------------------
/** AI attackers withdraw (ceasefire) at this exhaustion, */
export const AI_CEASEFIRE_EXHAUSTION = 70;
/** or after losing this share of their pre-war personnel, */
export const AI_CEASEFIRE_LOSS_SHARE = 0.3;
/** or when the front has not reached +25 after this many days. */
export const AI_CEASEFIRE_STALEMATE_DAYS = 120;
/** A neutral Council member proposes a ceasefire on the attacker of a war this old (same rule and cost as the player). */
export const AI_COUNCIL_CEASEFIRE_DAYS = 150;
/** AI occupiers settle peace and restore independence this long after victory. The player's occupations are untouched. */
export const AI_OCCUPATION_DAYS = 365;

// --- Rivalries --------------------------------------------------------------------------------
/** Every 14 days some governments let a regional rivalry deepen (relations otherwise only drift upward). */
export const RIVALRY_INTERVAL = 14;
export const RIVALRY_OFFSET = 7;
export const RIVALRY_CHANCE = 0.35;
export const RIVALRY_MIN_TENSION = 30;
export const RIVALRY_FLOOR = -80;

const independent = (c: CountryState | undefined): c is CountryState => !!c && !c.annexedBy && !c.controllerCountryId;
const aiCountry = (state: GameState, c: CountryState | undefined): c is CountryState => independent(c) && c.id !== state.playerCountryId;
const aiStartedWars = (state: GameState) => Object.values(state.wars).filter(w => w.attackerId !== state.playerCountryId);

/** Regional tension between two governments: neighbours with different ideologies or faiths, resource envy and old grudges. */
export function rivalryTension(state: GameState, a: CountryState, b: CountryState): number {
  if (!a.region || a.region !== b.region) return 0;
  const relation = relationFor(a, b.id);
  if (relation.status === 'war') return 0;
  let tension = a.subregion && a.subregion === b.subregion ? 20 : 8;
  if (a.society.ideology !== b.society.ideology) tension += 10;
  if (a.society.dominantReligion !== b.society.dominantReligion) tension += 6;
  if (b.resourceProduction.oil > a.resourceProduction.oil * 2 && a.resources.oil < 80) tension += 6;
  tension -= relation.score * 0.4;
  if (relation.treaties.length) tension -= 40;
  const bloc = blocForCountry(state, a.id);
  if (bloc && bloc.memberIds.includes(b.id)) tension -= 40;
  return tension;
}

export function processRivalries(state: GameState): GameState {
  if (state.day % RIVALRY_INTERVAL !== RIVALRY_OFFSET) return state;
  let next = state, seed = state.simulationSeed;
  const candidates = activeCountries(state.countries).filter(c => aiCountry(state, c));
  for (const country of candidates) {
    const roll = nextRandom(seed); seed = roll.seed;
    if (roll.value >= RIVALRY_CHANCE) continue;
    const source = next.countries[country.id];
    let rival: CountryState | null = null, best = RIVALRY_MIN_TENSION;
    for (const other of candidates) {
      if (other.id === source.id) continue;
      const tension = rivalryTension(next, source, next.countries[other.id]);
      if (tension >= best) { best = tension; rival = next.countries[other.id]; }
    }
    if (!rival || relationFor(source, rival.id).score <= RIVALRY_FLOOR) continue;
    next = changeRelations(next, source.id, rival.id, -(2 + best / 15));
  }
  return { ...next, simulationSeed: seed };
}

/** Day a war stopped shaping the pair: its last round, or the restoration of independence a year after a victory. */
function pairQuietSince(state: GameState, w: WarState): number {
  const ended = Math.max(w.startedDay, w.lastCombatDay);
  return w.status === 'victory' && state.countries[w.defenderId]?.controllerCountryId !== w.attackerId ? ended + AI_OCCUPATION_DAYS : ended;
}

export interface AiWarTarget { targetId: string; ratio: number }

/** Why a government would (not) attack now; null target = no war. Uses only the shared rules plus AI motives. */
export function aiWarTarget(state: GameState, attackerId: string): AiWarTarget | null {
  const attacker = state.countries[attackerId];
  if (!aiCountry(state, attacker) || !attacker.region || inActiveWar(state, attacker.id)) return null;
  if (!AI_WAR_GOALS.includes(attacker.ai.strategicGoal) || attacker.politics.stability < AI_WAR_MIN_STABILITY) return null;
  if (aiStartedWars(state).some(w => w.attackerId === attacker.id && state.day - w.startedDay < AI_WAR_COUNTRY_COOLDOWN_DAYS)) return null;
  if (calculateSupplyNetwork(attacker).fuelDays < AI_WAR_MIN_FUEL_DAYS) return null;
  let best: AiWarTarget | null = null;
  for (const [targetId, relation] of Object.entries(attacker.diplomacy.relations)) {
    const target = state.countries[targetId];
    if (!independent(target) || relation.status !== 'hostile' || target.region !== attacker.region) continue;
    if (relation.treaties.includes('nonAggression') || relation.treaties.includes('alliance')) continue;
    const bloc = blocForCountry(state, attacker.id);
    if (bloc && bloc.memberIds.includes(target.id)) continue;
    if (!warDeclarationStatus(state, attacker.id, target.id).allowed || inActiveWar(state, target.id)) continue;
    if (Object.values(state.wars).some(w => ((w.attackerId === attacker.id && w.defenderId === target.id) || (w.attackerId === target.id && w.defenderId === attacker.id)) && state.day - pairQuietSince(state, w) < AI_WAR_PAIR_COOLDOWN_DAYS)) continue;
    const ratio = combatPreview(state, attacker.id, target.id).powerRatio / (1 + potentialCoalitionSupport(state, attacker.id, target.id));
    if (ratio >= AI_WAR_MIN_RATIO && (!best || ratio > best.ratio)) best = { targetId: target.id, ratio };
  }
  return best;
}

function warDeclaredOnPlayer(state: GameState, war: WarState): GameState {
  const attacker = state.countries[war.attackerId], player = state.countries[state.playerCountryId];
  let next: GameState = { ...state, speed: 0 };
  next = note(next, `WAR // ${attacker.name} declared war on ${player.name}. You are the defender.`);
  if (!living(next).notice)
    next = withLiving(next, { ...living(next), notice: { title: 'War declared on your country', summary: `${attacker.name} declared war on ${player.name}. Open War Command to defend, fight in HD War or concede. Conceding hands control of the country to the attacker and ends the campaign.` } });
  return next;
}

export function processAiDeclarations(state: GameState): GameState {
  if (state.day % AI_WAR_REVIEW_INTERVAL !== AI_WAR_REVIEW_OFFSET) return state;
  const aiWars = aiStartedWars(state);
  if (aiWars.filter(w => w.status === 'active').length >= AI_WAR_CAP) return state;
  if (aiWars.some(w => state.day - w.startedDay < AI_WAR_GLOBAL_GAP_DAYS)) return state;
  let seed = state.simulationSeed;
  for (const country of activeCountries(state.countries)) {
    const target = aiWarTarget(state, country.id);
    if (!target) continue;
    const roll = nextRandom(seed); seed = roll.seed;
    if (roll.value >= AI_WAR_DECLARE_CHANCE) continue;
    const opened = openWar({ ...state, simulationSeed: seed }, country.id, target.targetId, true);
    if (!opened.warId) continue;
    // One declaration per review keeps the global gap meaningful.
    return target.targetId === state.playerCountryId ? warDeclaredOnPlayer(opened.state, opened.state.wars[opened.warId]) : opened.state;
  }
  return { ...state, simulationSeed: seed };
}

// --- Running and ending AI wars ----------------------------------------------------------------

/**
 * An AI attacker keeps the initiative: its offensive advances every day whatever the defender toggles. When the
 * player defends on the HD War board and lets a whole campaign day pass without orders, the defender's standing
 * orders (the same tactical AI the auto mode uses) answer the next round.
 */
export function processAiOffensives(state: GameState): GameState {
  let next = state;
  for (const w of Object.values(state.wars)) {
    if (w.status !== 'active' || w.attackerId === state.playerCountryId) continue;
    const war = next.wars[w.id];
    if (!war || war.status !== 'active') continue;
    if (!war.tactical) next = resolveCombatRound(next, war.id);
    else if (war.defenderId === next.playerCountryId && war.lastCombatDay < next.day - 1) next = resolveStandingRound(next, war.id);
  }
  return next;
}

/** Why an AI attacker would stop now (null = keep fighting). */
export function aiCeasefireReason(state: GameState, war: WarState): string | null {
  if (war.status !== 'active' || war.attackerId === state.playerCountryId) return null;
  const attacker = state.countries[war.attackerId];
  if (!attacker) return null;
  const start = war.attackerStartPersonnel ?? attacker.military.personnel;
  if (war.attackerExhaustion >= AI_CEASEFIRE_EXHAUSTION) return 'exhaustion';
  if (start > 0 && war.attackerLosses.personnel >= start * AI_CEASEFIRE_LOSS_SHARE) return 'losses';
  if (state.day - war.startedDay >= AI_CEASEFIRE_STALEMATE_DAYS && war.progress < 25) return 'stalemate';
  return null;
}

export function processAiCeasefires(state: GameState): GameState {
  let next = state;
  for (const w of Object.values(state.wars)) {
    const war = next.wars[w.id];
    if (!war || !aiCeasefireReason(next, war)) continue;
    const attacker = next.countries[war.attackerId], defender = next.countries[war.defenderId];
    next = concedeWar(next, war.id, 'attacker', `WAR // ${attacker.name} withdrew from ${defender.name}. Ceasefire established under hostile relations.`);
    if (war.defenderId === next.playerCountryId) {
      next = { ...next, speed: 0 };
      if (!living(next).notice) next = withLiving(next, { ...living(next), notice: { title: 'Ceasefire agreed', summary: `${attacker.name} withdrew its forces from ${defender.name}. The war is over; relations remain hostile.` } });
    }
  }
  return next;
}

/** Long wars: the most influential uninvolved government asks the Global Council for a ceasefire on the attacker, once per war. */
export function processCouncilCeasefires(state: GameState): GameState {
  if (state.day % AI_WAR_REVIEW_INTERVAL !== AI_WAR_REVIEW_OFFSET) return state;
  let next = state;
  for (const w of Object.values(state.wars)) {
    const war = next.wars[w.id];
    if (!war || war.status !== 'active' || next.day - war.startedDay < AI_COUNCIL_CEASEFIRE_DAYS) continue;
    if (next.council.history.some(r => r.type === 'ceasefire' && r.targetCountryId === war.attackerId && r.day >= war.startedDay)) continue;
    const parties = new Set([war.attackerId, war.defenderId, ...(war.defenderAllies ?? []), next.playerCountryId]);
    const proposer = activeCountries(next.countries)
      .filter(c => !parties.has(c.id) && !c.controllerCountryId && !inActiveWar(next, c.id) && (next.council.influenceByCountry[c.id] ?? 0) >= 8)
      .sort((a, b) => (next.council.influenceByCountry[b.id] ?? 0) - (next.council.influenceByCountry[a.id] ?? 0) || a.id.localeCompare(b.id))[0];
    if (!proposer) continue;
    next = proposeCouncilResolution(next, 'ceasefire', war.attackerId, proposer.id);
  }
  return next;
}

/** Co-belligerents of wars that ended by any path (combat, concession, Council) return to hostile relations. */
export function processCoalitionRelease(state: GameState): GameState {
  let next = state;
  for (const war of Object.values(state.wars)) if (war.status !== 'active' && war.defenderAllies?.length) next = releaseCoalition(next, war);
  return next;
}

/** AI occupiers (never the player) restore an occupied AI country's independence a year after their victory. */
export function processAiOccupations(state: GameState): GameState {
  if (state.day % AI_WAR_REVIEW_INTERVAL !== AI_WAR_REVIEW_OFFSET) return state;
  let next = state;
  for (const c of activeCountries(state.countries)) {
    const occupier = c.controllerCountryId;
    if (!occupier || occupier === c.id || occupier === state.playerCountryId || c.id === state.playerCountryId) continue;
    const won = Object.values(state.wars).filter(w => w.status === 'victory' && w.attackerId === occupier && w.defenderId === c.id).sort((a, b) => b.lastCombatDay - a.lastCombatDay)[0];
    if (!won || state.day - Math.max(won.lastCombatDay, won.startedDay) < AI_OCCUPATION_DAYS) continue;
    next = { ...next, countries: { ...next.countries, [c.id]: { ...next.countries[c.id], controllerCountryId: null } } };
    next = updateBilateralRelation(next, occupier, c.id, r => ({ ...r, score: -40, status: 'neutral', sanctions: false }));
    next = note(next, `PEACE // ${next.countries[occupier].name} withdrew from ${c.name}; independence restored under a peace settlement.`);
  }
  return next;
}

/** Daily AI war cycle, called once from tickGame after the world systems have run. */
export function processAiWars(state: GameState): GameState {
  let next = checkHomeFront(state);
  if (next.campaignStatus !== 'active') return next;
  next = processAiTaskGroups(next);
  next = processAiOffensives(next);
  next = processAiCeasefires(next);
  next = processCouncilCeasefires(next);
  next = processCoalitionRelease(next);
  next = processAiOccupations(next);
  next = processRivalries(next);
  next = processAiDeclarations(next);
  return checkHomeFront(next);
}

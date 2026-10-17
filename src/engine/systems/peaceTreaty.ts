import type { CountryState, GameState, WarState } from '../../domain/game';
import {
  CLAUSE_DAYS,
  CONFERENCE_PATIENCE_DAYS,
  REGION_IDS,
  emptyPeace,
  type DemandId,
  type PeaceConference,
  type PeaceObligation,
  type PeaceState,
  type PeaceTrigger,
  type RegionId,
} from '../../domain/peace';
import { endWarRelation, updateBilateralRelation } from './diplomacy';
import { consolidateTerritory } from './integration';
import { winnerFor, warScore, type WarScoreBreakdown } from './warScore';
import { REGION_TEMPLATES, type WarSide } from './peaceRegions';
import {
  PUPPET_ID,
  REPARATION_RATE,
  REPARATION_STRAIN,
  annexId,
  budgetLeft,
  checkDemand,
  demandCost,
  disarmId,
  dmzId,
  parseDemand,
  reparationsId,
  toggleDemand,
  totalCost,
} from './peaceDemands';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
/** Smallest war score at which an armistice is worth a table. */
export const ARMISTICE_MIN_SCORE = 15;
const REPARATION_INTERVAL_DAYS = 30;
const TREATIES_KEPT = 40;

export const peaceOf = (state: GameState): PeaceState => state.world.peace ?? emptyPeace();
const withPeace = (state: GameState, peace: PeaceState): GameState => ({ ...state, world: { ...state.world, peace } });
const note = (state: GameState, text: string): GameState => ({ ...state, sitrep: [text, ...state.sitrep].slice(0, 12) });

// --- Opening a conference ----------------------------------------------------------------------

/** Which way the war ended, from the war record. Used when the caller does not say. */
export function triggerFor(state: GameState, war: WarState): PeaceTrigger {
  const side = winnerFor(war);
  if (!side) return 'armistice';
  const loser = state.countries[side === 'attacker' ? war.defenderId : war.attackerId];
  const start = (side === 'attacker' ? war.defenderStartPersonnel : war.attackerStartPersonnel) ?? 0;
  const exhaustion = side === 'attacker' ? war.defenderExhaustion : war.attackerExhaustion;
  if (loser && start > 0 && loser.military.personnel < Math.max(Math.min(5000, start * 0.5), start * 0.08)) return 'collapse';
  if (exhaustion >= 100) return 'surrender';
  return 'victory';
}

/** The side that holds the stronger hand in a war that ended without a decisive result; null when level. */
function scoreLeader(state: GameState, war: WarState): WarScoreBreakdown | null {
  const a = warScore(state, war, 'attacker');
  const d = warScore(state, war, 'defender');
  if (a.subtotal === d.subtotal) return null;
  return a.subtotal > d.subtotal ? a : d;
}

/**
 * Opens the peace conference for a war that has just ended. Called by the shared end-of-war lifecycle, so every way a
 * war can end reaches it. It is idempotent per war. A conference where the player is the winner stays open for the
 * player to fill in; in every other case the winning government dictates terms and the treaty is concluded at once.
 */
export function openPeaceConference(state: GameState, warId: string, trigger?: PeaceTrigger): GameState {
  const war = state.wars[warId];
  if (!war || war.status === 'active') return state;
  if (peaceOf(state).conferences[warId]) return state;
  const decisive = winnerFor(war);
  const score = decisive ? warScore(state, war, decisive) : scoreLeader(state, war);
  if (!score) return state;
  const kind = trigger ?? triggerFor(state, war);
  if (!decisive && (score.total < ARMISTICE_MIN_SCORE || score.winnerId !== state.playerCountryId)) return state;
  if (state.countries[score.loserId]?.annexedBy || state.countries[score.winnerId]?.annexedBy) return state;
  const conference: PeaceConference = {
    warId, winnerId: score.winnerId, loserId: score.loserId, trigger: kind, openedDay: state.day,
    score: score.total, selected: [], status: 'open', imposed: score.winnerId !== state.playerCountryId,
  };
  const peace = peaceOf(state);
  let next = withPeace(state, { ...peace, conferences: { ...peace.conferences, [warId]: conference } });
  if (!conference.imposed) return { ...next, speed: 0 };
  const terms = aiTerms(next, conference, score);
  next = setSelected(next, warId, terms);
  return concludePeace(next, warId);
}

const setSelected = (state: GameState, warId: string, selected: DemandId[]): GameState => {
  const peace = peaceOf(state);
  const conference = peace.conferences[warId];
  if (!conference) return state;
  return withPeace(state, { ...peace, conferences: { ...peace.conferences, [warId]: { ...conference, selected } } });
};

// --- What the table shows -----------------------------------------------------------------------

export interface ConferenceView {
  conference: PeaceConference;
  winner: CountryState;
  loser: CountryState;
  score: WarScoreBreakdown;
  budget: number;
  spent: number;
  left: number;
  occupied: RegionId[];
  ceded: Partial<Record<RegionId, string>>;
  checks: ReturnType<typeof checkDemand>[];
}

/** Engine-side preview of the table: every demand with its cost and whether it can be added now. */
export function conferenceView(state: GameState, warId: string): ConferenceView | null {
  const conference = peaceOf(state).conferences[warId];
  const war = state.wars[warId];
  if (!conference || !war) return null;
  const winner = state.countries[conference.winnerId];
  const loser = state.countries[conference.loserId];
  if (!winner || !loser) return null;
  const side: WarSide = war.attackerId === conference.winnerId ? 'attacker' : 'defender';
  const score = warScore(state, war, side);
  const budget = conference.status === 'open' ? conference.score : score.total;
  const occupied = conference.trigger === 'armistice' ? score.occupied : [...REGION_IDS];
  const checks = catalogFor(war, conference).map(id => checkDemand(state, conference, id, occupied, conference.selected, budget));
  const spent = totalCost(loser, conference.selected);
  return { conference, winner, loser, score, budget, spent, left: budgetLeft(loser, conference.selected, budget), occupied, ceded: peaceOf(state).cessions[loser.id] ?? {}, checks };
}

function catalogFor(war: WarState, conference: PeaceConference): DemandId[] {
  const ids = REGION_IDS.map(annexId);
  if (war.attackerId === conference.winnerId) ids.push(PUPPET_ID);
  ids.push(dmzId('frontier_a'), dmzId('frontier_b'));
  for (const tier of ['light', 'standard', 'heavy'] as const) for (const years of [1, 2, 3, 4, 5]) ids.push(reparationsId(years, tier));
  for (const cap of [70, 50, 30]) ids.push(disarmId('armor', cap));
  for (const cap of [70, 50, 25]) ids.push(disarmId('fleet', cap));
  return ids;
}

/** Player puts a demand on the table or takes it off. Returns the state unchanged when it is not allowed. */
export function togglePeaceDemand(state: GameState, warId: string, id: DemandId): GameState {
  const view = conferenceView(state, warId);
  if (!view || view.conference.status !== 'open' || view.conference.winnerId !== state.playerCountryId) return state;
  const selected = toggleDemand(state, view.conference, id, view.occupied, view.budget);
  return selected ? setSelected(state, warId, selected) : state;
}

// --- AI winners ---------------------------------------------------------------------------------

/**
 * What a government in the winner's seat asks for. A war won by capitulation ends as it always did, with the loser
 * placed under the winner's control; other results take occupied ground first, then tribute, a buffer zone and a cap on
 * the loser's armour. Deterministic: it depends only on the war, the countries and the budget.
 */
export function aiTerms(state: GameState, conference: PeaceConference, score: WarScoreBreakdown): DemandId[] {
  const war = state.wars[conference.warId];
  const loser = state.countries[conference.loserId];
  if (!war || !loser) return [];
  const budget = score.total;
  const wishes: DemandId[] = [];
  const capitulated = conference.trigger !== 'armistice';
  if (capitulated && war.attackerId === conference.winnerId && !loser.controllerCountryId) wishes.push(PUPPET_ID);
  else {
    const byValue = [...score.occupied].sort((a, b) => REGION_TEMPLATES[b].output - REGION_TEMPLATES[a].output || a.localeCompare(b));
    for (const region of byValue) wishes.push(annexId(region));
  }
  wishes.push(reparationsId(2, 'standard'), dmzId('frontier_a'), disarmId('armor', 70));
  const picked: DemandId[] = [];
  let spent = 0;
  for (const id of wishes) {
    const check = checkDemand(state, conference, id, score.occupied, picked, budget);
    if (!check.allowed || spent + check.cost > budget) continue;
    // A cautious winner keeps annexations to the budget's larger half so the tribute and buffers still fit.
    picked.push(id);
    spent += check.cost;
    if (picked.length >= 5) break;
  }
  return picked;
}

// --- Concluding the treaty ----------------------------------------------------------------------

/** True when the war has an open conference at which the player is the winner. */
export function playerOwnsTable(state: GameState, warId: string): boolean {
  const conference = peaceOf(state).conferences[warId];
  return !!conference && conference.status === 'open' && conference.winnerId === state.playerCountryId;
}

/** Makes peace with no terms: the war is settled, nothing is taken, and relations settle at a cool neutrality. */
export function waivePeace(state: GameState, warId: string): GameState {
  const conference = peaceOf(state).conferences[warId];
  if (!conference || conference.status !== 'open') return state;
  let next = closeConference(state, conference, 'waived', [], 0);
  next = updateBilateralRelation(next, conference.winnerId, conference.loserId, relation => ({ ...relation, score: -40, status: 'neutral', sanctions: false }));
  const winner = next.countries[conference.winnerId];
  if (!winner) return next;
  return { ...next, countries: { ...next.countries, [winner.id]: { ...winner, diplomacy: { ...winner.diplomacy, reputation: clamp(winner.diplomacy.reputation + 2, 0, 100) } } } };
}

/** Signs the treaty with the demands now on the table. Applies each term once, in a fixed order. */
export function concludePeace(state: GameState, warId: string): GameState {
  const peace = peaceOf(state);
  const conference = peace.conferences[warId];
  const war = state.wars[warId];
  if (!conference || !war || conference.status !== 'open') return state;
  const winner = state.countries[conference.winnerId];
  const loser = state.countries[conference.loserId];
  const waive = (): GameState => closeConference(state, conference, 'waived', [], 0);
  if (!winner || !loser || loser.annexedBy || winner.annexedBy) return waive();
  const side: WarSide = war.attackerId === conference.winnerId ? 'attacker' : 'defender';
  const score = warScore(state, war, side);
  const budget = conference.score;
  const occupied = conference.trigger === 'armistice' ? score.occupied : [...REGION_IDS];
  // Re-validate in order: a term that no longer fits (stale state) is dropped rather than half-applied.
  const accepted: DemandId[] = [];
  for (const id of conference.selected) {
    if (checkDemand(state, conference, id, occupied, accepted, budget).allowed) accepted.push(id);
  }
  const ordered = orderTerms(accepted);
  if (ordered.length === 0) return closeConference(state, conference, 'waived', [], 0);
  let next = state;
  for (const id of ordered) next = applyTerm(next, conference, id);
  next = settleRelations(next, conference, ordered);
  return closeConference(next, conference, 'concluded', ordered, totalCost(loser, ordered));
}

/** Annexations, then the puppet government, disarmament, buffer zones and tribute. */
const TERM_ORDER = ['annex', 'puppet', 'disarm', 'dmz', 'reparations'];
export function orderTerms(ids: readonly DemandId[]): DemandId[] {
  const rank = (id: DemandId) => TERM_ORDER.indexOf(parseDemand(id)?.kind ?? '');
  return ids.map((id, index) => ({ id, index })).sort((a, b) => rank(a.id) - rank(b.id) || a.index - b.index).map(entry => entry.id);
}

function closeConference(state: GameState, conference: PeaceConference, status: 'concluded' | 'waived', terms: DemandId[], spent: number): GameState {
  const peace = peaceOf(state);
  const winnerName = state.countries[conference.winnerId]?.name ?? conference.winnerId;
  const loserName = state.countries[conference.loserId]?.name ?? conference.loserId;
  const closed: PeaceConference = { ...conference, status, selected: terms, closedDay: state.day };
  const involvesPlayer = [conference.winnerId, conference.loserId].includes(state.playerCountryId);
  const treaty = { id: `${conference.warId}:treaty`, warId: conference.warId, day: state.day, winnerId: conference.winnerId, loserId: conference.loserId, trigger: conference.trigger, terms, scoreSpent: spent, imposed: !!conference.imposed, read: !(conference.imposed && involvesPlayer) };
  const next = withPeace(state, { ...peace, conferences: { ...peace.conferences, [conference.warId]: closed }, treaties: [...peace.treaties, treaty].slice(-TREATIES_KEPT) });
  const text = status === 'waived' || terms.length === 0
    ? 'PEACE // {0} and {1} made peace without terms.'
    : 'PEACE // Treaty between {0} and {1} signed with {2} terms.';
  return note(next, text.replace('{0}', winnerName).replace('{1}', loserName).replace('{2}', String(terms.length)));
}

function settleRelations(state: GameState, conference: PeaceConference, terms: readonly DemandId[]): GameState {
  const heavy = terms.filter(id => ['annex', 'puppet'].includes(parseDemand(id)?.kind ?? '')).length;
  const penalty = Math.min(35, terms.length * 5);
  let next = endWarRelation(state, conference.winnerId, conference.loserId);
  next = updateBilateralRelation(next, conference.winnerId, conference.loserId, relation => ({ ...relation, score: -65 - penalty, status: 'hostile' }));
  const winner = next.countries[conference.winnerId];
  if (!winner) return next;
  const cost = heavy * 2 + (terms.includes(PUPPET_ID) ? 6 : 0);
  return { ...next, countries: { ...next.countries, [winner.id]: { ...winner, diplomacy: { ...winner.diplomacy, reputation: clamp(winner.diplomacy.reputation - cost, 0, 100) } } } };
}

function applyTerm(state: GameState, conference: PeaceConference, id: DemandId): GameState {
  const demand = parseDemand(id);
  if (!demand) return state;
  switch (demand.kind) {
    case 'annex': return cedeRegion(state, conference.loserId, conference.winnerId, demand.region);
    case 'puppet': return installPuppet(state, conference.loserId, conference.winnerId);
    case 'disarm': return disarm(state, conference, demand.target, demand.cap);
    case 'dmz': return addObligation(state, { id: `${conference.warId}:dmz:${demand.zone}`, kind: 'dmz', bound: conference.loserId, beneficiary: conference.winnerId, zone: demand.zone, startDay: state.day, endDay: state.day + CLAUSE_DAYS });
    case 'reparations': return addObligation(state, { id: `${conference.warId}:reparations`, kind: 'reparations', payerId: conference.loserId, payeeId: conference.winnerId, tier: demand.tier, startDay: state.day, endDay: state.day + demand.years * 365, nextDay: state.day + REPARATION_INTERVAL_DAYS, paid: 0 });
  }
}

const addObligation = (state: GameState, obligation: PeaceObligation): GameState => {
  const peace = peaceOf(state);
  return withPeace(state, { ...peace, obligations: [...peace.obligations.filter(o => o.id !== obligation.id), obligation] });
};

/** The loser becomes a controlled state under the winner and takes on its regime and ideology. */
function installPuppet(state: GameState, loserId: string, winnerId: string): GameState {
  const loser = state.countries[loserId];
  const winner = state.countries[winnerId];
  if (!loser || !winner) return state;
  return {
    ...state,
    countries: {
      ...state.countries,
      [loserId]: { ...loser, controllerCountryId: winnerId, politics: { ...loser.politics, regime: winner.politics.regime, stability: clamp(loser.politics.stability - 15, 0, 100) }, society: { ...loser.society, ideology: winner.society.ideology } },
      [winnerId]: { ...winner, politics: { ...winner.politics, approval: clamp(winner.politics.approval + 4, 0, 100) } },
    },
  };
}

function disarm(state: GameState, conference: PeaceConference, target: 'armor' | 'fleet', pct: number): GameState {
  const loser = state.countries[conference.loserId];
  if (!loser) return state;
  const cap = Math.floor((target === 'armor' ? loser.military.tanks : loser.military.warships) * pct / 100);
  const next = addObligation(state, { id: `${conference.warId}:disarm:${target}`, kind: 'disarm', bound: conference.loserId, beneficiary: conference.winnerId, target, cap, startDay: state.day, endDay: state.day + CLAUSE_DAYS });
  return enforceDisarmament(next);
}

// --- Ceding regions -----------------------------------------------------------------------------

const shareOf = (ceded: Partial<Record<RegionId, string>>, metric: 'population' | 'output' | 'resources', region: RegionId) => {
  const remaining = 1 - REGION_IDS.filter(id => ceded[id]).reduce((sum, id) => sum + REGION_TEMPLATES[id][metric], 0);
  return remaining <= 1e-9 ? 1 : Math.min(1, REGION_TEMPLATES[region][metric] / remaining);
};

/** Moves `fraction` of every extensive quantity, rounded so that the winner gains exactly what the loser loses. */
function split<T extends Record<string, number>>(from: T, fraction: number): { kept: T; moved: T } {
  const kept = { ...from };
  const moved = { ...from };
  for (const key of Object.keys(from) as (keyof T)[]) {
    const take = Math.round(from[key] * fraction * 1e6) / 1e6;
    moved[key] = take as T[keyof T];
    kept[key] = (from[key] - take) as T[keyof T];
  }
  return { kept, moved };
}

function cedeRegion(state: GameState, loserId: string, winnerId: string, region: RegionId): GameState {
  const loser = state.countries[loserId];
  const winner = state.countries[winnerId];
  if (!loser || !winner) return state;
  const peace = peaceOf(state);
  const ceded = peace.cessions[loserId] ?? {};
  if (ceded[region]) return state;
  const fp = shareOf(ceded, 'population', region), fo = shareOf(ceded, 'output', region), fr = shareOf(ceded, 'resources', region);
  const people = split({ population: loser.demographics.population, workforce: loser.demographics.workforce }, fp);
  const money = split({ gdp: loser.economy.gdp, treasury: loser.economy.treasury, debt: loser.economy.debt }, fo);
  const works = split({ factories: loser.industry.factories, refineries: loser.industry.refineries, mines: loser.industry.mines }, fo);
  const stock = split(loser.resources as unknown as Record<string, number>, fr);
  const output = split(loser.resourceProduction as unknown as Record<string, number>, fr);
  const processed = split(loser.processedResources as unknown as Record<string, number>, fo);
  const plus = (a: Record<string, number>, b: Record<string, number>) => Object.fromEntries(Object.keys(a).map(key => [key, a[key] + (b[key] ?? 0)]));
  const lost: CountryState = {
    ...loser,
    demographics: { ...loser.demographics, ...people.kept },
    economy: { ...loser.economy, ...money.kept },
    industry: { ...loser.industry, ...works.kept },
    resources: stock.kept as unknown as CountryState['resources'],
    resourceProduction: output.kept as unknown as CountryState['resourceProduction'],
    processedResources: processed.kept as unknown as CountryState['processedResources'],
  };
  const gained: CountryState = {
    ...winner,
    demographics: { ...winner.demographics, population: winner.demographics.population + people.moved.population, workforce: winner.demographics.workforce + people.moved.workforce },
    economy: { ...winner.economy, gdp: winner.economy.gdp + money.moved.gdp, treasury: winner.economy.treasury + money.moved.treasury, debt: winner.economy.debt + money.moved.debt },
    industry: { ...winner.industry, factories: winner.industry.factories + works.moved.factories, refineries: winner.industry.refineries + works.moved.refineries, mines: winner.industry.mines + works.moved.mines },
    resources: plus(winner.resources as unknown as Record<string, number>, stock.moved) as unknown as CountryState['resources'],
    resourceProduction: plus(winner.resourceProduction as unknown as Record<string, number>, output.moved) as unknown as CountryState['resourceProduction'],
    processedResources: plus(winner.processedResources as unknown as Record<string, number>, processed.moved) as unknown as CountryState['processedResources'],
  };
  const nextCeded = { ...ceded, [region]: winnerId };
  let next: GameState = withPeace({ ...state, countries: { ...state.countries, [loserId]: lost, [winnerId]: gained } }, { ...peace, cessions: { ...peace.cessions, [loserId]: nextCeded } });
  // Every region gone: the loser ceases to exist as a state and folds into the winner like any other annexation.
  if (REGION_IDS.every(id => nextCeded[id])) {
    next = { ...next, countries: { ...next.countries, [loserId]: { ...next.countries[loserId], controllerCountryId: winnerId } } };
    next = consolidateTerritory(next, loserId, winnerId);
  }
  return next;
}

// --- Standing obligations -----------------------------------------------------------------------

/** Daily: tribute is paid, armour and fleet caps hold, buffer zones cap readiness, finished clauses lapse. */
export function processPeaceObligations(state: GameState): GameState {
  const peace = state.world.peace;
  if (!peace || peace.obligations.length === 0) return state;
  let next = state;
  const live: PeaceObligation[] = [];
  for (const obligation of peace.obligations) {
    if (state.day >= obligation.endDay || bindingGone(next, obligation)) continue;
    if (obligation.kind === 'reparations' && state.day >= obligation.nextDay) {
      const paid = payTribute(next, obligation);
      next = paid.state;
      live.push(paid.obligation);
    } else live.push(obligation);
  }
  next = withPeace(next, { ...peaceOf(next), obligations: live });
  return enforceDisarmament(next);
}

const bindingGone = (state: GameState, o: PeaceObligation) => {
  const bound = o.kind === 'reparations' ? o.payerId : o.bound;
  return !state.countries[bound] || !!state.countries[bound].annexedBy;
};

type Reparations = Extract<PeaceObligation, { kind: 'reparations' }>;

/** One monthly payment: what the treasury can bear of the instalment is moved, the rest is a shortfall that strains the government. */
function payTribute(state: GameState, o: Reparations): { state: GameState; obligation: Reparations } {
  const payer = state.countries[o.payerId];
  const payee = state.countries[o.payeeId];
  const later = { ...o, nextDay: o.nextDay + REPARATION_INTERVAL_DAYS };
  if (!payer || !payee || payee.annexedBy) return { state, obligation: later };
  const due = REPARATION_RATE[o.tier] * payer.economy.gdp / 12;
  const paid = Math.min(due, Math.max(0, payer.economy.treasury));
  const strain = REPARATION_STRAIN[o.tier] + (paid < due - 1e-9 ? 0.3 : 0);
  const next: GameState = {
    ...state,
    countries: {
      ...state.countries,
      [payer.id]: { ...payer, economy: { ...payer.economy, treasury: payer.economy.treasury - paid }, politics: { ...payer.politics, stability: clamp(payer.politics.stability - strain, 0, 100) } },
      [payee.id]: { ...payee, economy: { ...payee.economy, treasury: payee.economy.treasury + paid } },
    },
  };
  return { state: next, obligation: { ...later, paid: o.paid + paid } };
}

/** Armour and fleet never exceed the signed caps; each buffer zone takes 8 points off the bound country's readiness ceiling. */
export function enforceDisarmament(state: GameState): GameState {
  const peace = state.world.peace;
  if (!peace) return state;
  let next = state;
  for (const o of peace.obligations) {
    if (o.kind === 'reparations' || state.day >= o.endDay) continue;
    const c = next.countries[o.bound];
    if (!c || c.annexedBy) continue;
    let military = c.military;
    if (o.kind === 'disarm') {
      if (o.target === 'armor' && military.tanks > o.cap) military = { ...military, tanks: o.cap };
      if (o.target === 'fleet' && military.warships > o.cap) military = { ...military, warships: o.cap };
    } else {
      const ceiling = 100 - 8 * peace.obligations.filter(x => x.kind === 'dmz' && x.bound === o.bound && state.day < x.endDay).length;
      if (military.readiness > ceiling) military = { ...military, readiness: ceiling };
    }
    if (military !== c.military) next = { ...next, countries: { ...next.countries, [c.id]: { ...c, military } } };
  }
  return next;
}

/** True while a signed buffer-zone clause bars `bound` from attacking `beneficiary`. */
export function dmzBars(state: GameState, boundId: string, beneficiaryId: string): boolean {
  return (state.world.peace?.obligations ?? []).some(o => o.kind === 'dmz' && o.bound === boundId && o.beneficiary === beneficiaryId && state.day < o.endDay);
}

/** Open conferences whose winner never signed: after the patience period the demands on the table are signed as they stand. */
export function processPeaceConferences(state: GameState): GameState {
  const peace = state.world.peace;
  if (!peace) return state;
  let next = state;
  for (const conference of Object.values(peace.conferences)) {
    if (conference.status === 'open' && state.day >= conference.openedDay + CONFERENCE_PATIENCE_DAYS) next = concludePeace(next, conference.warId);
  }
  return next;
}

/** The player has read an imposed treaty. */
export function acknowledgeTreaty(state: GameState, treatyId: string): GameState {
  const peace = peaceOf(state);
  if (!peace.treaties.some(t => t.id === treatyId && !t.read)) return state;
  return withPeace(state, { ...peace, treaties: peace.treaties.map(t => (t.id === treatyId ? { ...t, read: true } : t)) });
}

/** The table the player must sit at (open, player is the winner), or the first unread imposed treaty. */
export function pendingPeace(state: GameState): { kind: 'conference'; warId: string } | { kind: 'notice'; treatyId: string } | null {
  const peace = state.world.peace;
  if (!peace) return null;
  const open = Object.values(peace.conferences).filter(c => c.status === 'open' && c.winnerId === state.playerCountryId).sort((a, b) => a.openedDay - b.openedDay || a.warId.localeCompare(b.warId))[0];
  if (open) return { kind: 'conference', warId: open.warId };
  const unread = peace.treaties.find(t => !t.read);
  return unread ? { kind: 'notice', treatyId: unread.id } : null;
}

// --- Preview of the signed terms ----------------------------------------------------------------

export interface TreatyPreview {
  /** Regions the winner would take. */
  regions: RegionId[];
  /** Share of the loser's current output, population and resources that moves (0 to 1). */
  gdpShare: number;
  populationShare: number;
  resourceShare: number;
  gdpMovedB: number;
  populationMoved: number;
  puppet: boolean;
  /** Tribute: share of monthly GDP, the first instalment in $B and the total over the term. */
  tributeRate: number;
  monthlyTributeB: number;
  totalTributeB: number;
  tributeYears: number;
  armorCap: number | null;
  fleetCap: number | null;
  dmzZones: RegionId[];
  fullAnnexation: boolean;
}

const sumShare = (regions: readonly RegionId[], metric: 'population' | 'output' | 'resources') => regions.reduce((total, id) => total + REGION_TEMPLATES[id][metric], 0);

/** What the demands on the table would do, in numbers the table can show before anything is signed. Mirrors cedeRegion/disarm/payTribute. */
export function treatyPreview(state: GameState, conference: PeaceConference): TreatyPreview {
  const loser = state.countries[conference.loserId];
  const ceded = peaceOf(state).cessions[conference.loserId] ?? {};
  const remaining = (metric: 'population' | 'output' | 'resources') => 1 - sumShare(REGION_IDS.filter(id => ceded[id]), metric);
  const parsed = conference.selected.map(id => parseDemand(id)).filter((d): d is NonNullable<typeof d> => !!d);
  const regions = parsed.flatMap(d => (d.kind === 'annex' ? [d.region] : []));
  const fraction = (metric: 'population' | 'output' | 'resources') => (remaining(metric) <= 1e-9 ? 0 : Math.min(1, sumShare(regions, metric) / remaining(metric)));
  const gdpShare = fraction('output'), populationShare = fraction('population'), resourceShare = fraction('resources');
  const tribute = parsed.find((d): d is Extract<typeof d, { kind: 'reparations' }> => d.kind === 'reparations');
  const armor = parsed.find((d): d is Extract<typeof d, { kind: 'disarm' }> => d.kind === 'disarm' && d.target === 'armor');
  const fleet = parsed.find((d): d is Extract<typeof d, { kind: 'disarm' }> => d.kind === 'disarm' && d.target === 'fleet');
  const gdpAfter = loser ? loser.economy.gdp * (1 - gdpShare) : 0;
  const monthly = tribute ? REPARATION_RATE[tribute.tier] * gdpAfter / 12 : 0;
  return {
    regions, gdpShare, populationShare, resourceShare,
    gdpMovedB: loser ? loser.economy.gdp * gdpShare : 0,
    populationMoved: loser ? Math.round(loser.demographics.population * populationShare) : 0,
    puppet: parsed.some(d => d.kind === 'puppet'),
    tributeRate: tribute ? REPARATION_RATE[tribute.tier] : 0,
    monthlyTributeB: monthly,
    totalTributeB: tribute ? monthly * tribute.years * 12 : 0,
    tributeYears: tribute?.years ?? 0,
    armorCap: armor && loser ? Math.floor(loser.military.tanks * armor.cap / 100) : null,
    fleetCap: fleet && loser ? Math.floor(loser.military.warships * fleet.cap / 100) : null,
    dmzZones: parsed.flatMap(d => (d.kind === 'dmz' ? [d.zone] : [])),
    fullAnnexation: REGION_IDS.every(id => ceded[id] || regions.includes(id)),
  };
}

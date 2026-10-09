import type { ActiveGameEvent, CountryState, EventKind, GameState } from '../../domain/game';
import { EVENT_CATALOGUE, EVENT_DEFINITIONS, type EventContext, type EventDefinition, type EventEffects, type EventOptionDefinition } from '../../data/events';
import { nextRandom } from '../rng';
import { foodReserveDays, oilReserveDays, SHORTAGE_RESERVE_DAYS } from './resources';
import { formatCostB, scaledCostB } from './policyPressure';
import { changeRelations } from './diplomacy';

export { FOOD_CRISIS_PER_MILLION } from '../../data/events';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Days before the same public-agenda event kind may fire again (on top of the global cooldown). */
export const EVENT_KIND_COOLDOWN = 60;
/** Global pause after an event is resolved: EVENT_COOLDOWN_MIN + a seeded 0..EVENT_COOLDOWN_SPREAD-1 days (0.84: 24 + 0..87). */
export const EVENT_COOLDOWN_MIN = 20;
export const EVENT_COOLDOWN_SPREAD = 36;
/** First day the weekly public agenda is evaluated. */
export const AGENDA_START_DAY = 21;
/** Chain flags older than this are dropped when an event resolves. */
export const EVENT_FLAG_MAX_AGE = 400;

/** Seeded pressure-weighted pick, so lower-pressure kinds (e.g. earthquakes) still occur. */
export function pickWeighted<T extends {pressure:number}>(items:T[],value:number):T|undefined{
 const total=items.reduce((sum,item)=>sum+item.pressure,0);
 let cursor=value*total;
 for(const item of items){cursor-=item.pressure;if(cursor<0)return item;}
 return items.at(-1);
}

/** Pure facts the event catalogue reads. */
export function buildEventContext(state: GameState, player: CountryState): EventContext {
  const isPlayers = (war: { attackerId: string; defenderId: string }) => war.attackerId === player.id || war.defenderId === player.id;
  const war = Object.values(state.wars).find((w) => w.status === 'active' && isPlayers(w));
  const relations = Object.entries(player.diplomacy.relations).filter(([id]) => id !== player.id && state.countries[id] && !state.countries[id].annexedBy);
  let rival: EventContext['rival'], partner: EventContext['partner'];
  for (const [id, r] of relations) {
    if (r.status !== 'war' && (!rival || r.score < rival.score)) rival = { id, score: r.score };
    if (r.status !== 'war' && !r.sanctions && r.score >= 20 && !state.countries[id].globalSanctions && (!partner || r.score > partner.score)) partner = { id, score: r.score };
  }
  const regionOf = (id: string) => state.countries[id]?.region;
  const flags = player.eventFlags ?? {};
  return {
    state, player, day: state.day, war,
    casualties: war ? war.attackerLosses.personnel + war.defenderLosses.personnel : 0,
    hostileCount: relations.filter(([, r]) => r.status === 'hostile' || r.status === 'war').length,
    allies: relations.filter(([, r]) => r.treaties.includes('alliance')).length,
    foodReserveDays: foodReserveDays(player),
    foodPerMillion: player.resources.food / Math.max(1e-9, player.demographics.population / 1_000_000),
    shortageReserveDays: SHORTAGE_RESERVE_DAYS,
    oilReserveDays: oilReserveDays(player),
    compromisedOps: Object.values(state.intelOperations).filter((op) => op.status === 'compromised' && op.sourceCountryId === player.id && state.day - op.completeDay <= 5).length,
    energyCoverage: state.world.energy?.[player.id]?.lastCoverage ?? 100,
    regionalWars: Object.values(state.wars).filter((w) => w.status === 'active' && !isPlayers(w) && (regionOf(w.attackerId) === player.region || regionOf(w.defenderId) === player.region)).length,
    recentWarEnded: Object.values(state.wars).some((w) => w.status !== 'active' && isPlayers(w) && state.day - w.lastCombatDay <= 180),
    rival, partner,
    flagAge: (flag) => (flags[flag] === undefined ? undefined : state.day - flags[flag]),
  };
}

/** GDP-scaled money change of an option for this payer: positive = cost, negative = revenue. */
export function eventOptionCostB(player: CountryState, effects: EventEffects): number {
  const base = effects.costB ?? 0;
  return base === 0 ? 0 : Math.sign(base) * scaledCostB(player, Math.abs(base));
}

const signed = (value: number) => `${value > 0 ? '+' : ''}${Number(value.toFixed(2))}`;
const STAT_HINTS: Array<[keyof EventEffects, string]> = [
  ['approval', 'Approval'], ['stability', 'Stability'], ['reputation', 'Reputation'], ['cohesion', 'Cohesion'], ['inflation', 'Inflation'],
  ['taxRate', 'Tax'], ['unemployment', 'Unemployment'], ['utilization', 'Industry utilization'], ['morale', 'Morale'], ['readiness', 'Readiness'],
  ['militaryTechnology', 'Military technology'], ['counterIntelligence', 'Counter-intelligence'], ['researchPoints', 'Research points'], ['subjectRelations', 'Relations'],
];
const RESOURCE_HINTS: Array<['food' | 'fuel' | 'electricity', string]> = [['food', 'food'], ['fuel', 'fuel'], ['electricity', 'electricity']];

/** The consequence line shown on an option, computed from the same effects resolveEvent applies. */
export function eventOptionHint(player: CountryState, effects: EventEffects): string {
  const parts: string[] = [];
  const money = eventOptionCostB(player, effects);
  if (money > 0) parts.push(`-${formatCostB(money)}`);
  if (money < 0) parts.push(`+${formatCostB(-money)}`);
  for (const [key, label] of STAT_HINTS) { const v = effects[key]; if (typeof v === 'number' && v !== 0) parts.push(`${label} ${signed(v)}`); }
  for (const [key, label] of RESOURCE_HINTS) { const v = effects[key]; if (v) parts.push(`${signed(v)} ${label}`); }
  if (effects.setFlags?.length) parts.push('Follow-up likely');
  return parts.length ? parts.join(', ') : 'No immediate effect';
}

function instantiate(definition: EventDefinition, state: GameState, player: CountryState, subjectCountryId?: string): ActiveGameEvent {
  const subjectName = subjectCountryId ? state.countries[subjectCountryId]?.name ?? subjectCountryId : '';
  return {
    id: `${definition.kind}-${state.day}`,
    kind: definition.kind,
    title: definition.title,
    description: definition.description.replace('{0}', subjectName),
    triggeredDay: state.day,
    options: definition.options.map((o) => ({ id: o.id, label: o.label, consequenceHint: eventOptionHint(player, o.effects) })),
    ...(subjectCountryId ? { subjectCountryId } : {}),
  };
}

type Candidate = { kind: EventKind; pressure: number; definition: EventDefinition; subject?: string };

/** Agenda events eligible now, with their pressure (per-kind cooldown, gate and subject applied). */
export function agendaCandidates(ctx: EventContext): Candidate[] {
  const lastFired = ctx.player.eventLastFired ?? {};
  const out: Candidate[] = [];
  for (const definition of EVENT_DEFINITIONS) {
    if (definition.tier !== 'agenda') continue;
    if (ctx.day - (lastFired[definition.kind] ?? -Infinity) < (definition.cooldownDays ?? EVENT_KIND_COOLDOWN)) continue;
    if (definition.condition && !definition.condition(ctx)) continue;
    const subject = definition.subject?.(ctx);
    if (definition.subject && !subject) continue;
    const pressure = definition.weight(ctx);
    if (pressure > 0) out.push({ kind: definition.kind, pressure, definition, subject });
  }
  return out.sort((a, b) => b.pressure - a.pressure);
}

/** Weekly chance that the public agenda produces an event: the 0.84 top-pressure curve plus a share of the other pressures. */
export function agendaFireChance(candidates: Candidate[]): number {
  if (!candidates.length) return 0;
  const [top, ...rest] = candidates;
  const extra = rest.reduce((sum, c) => sum + c.pressure, 0) * 0.25;
  return clamp(0.015 + (top.pressure + extra) / 180, 0.03, 0.55);
}

function makeEvent(state: GameState): { event: ActiveGameEvent | null; seed: number } {
  const player = state.countries[state.playerCountryId];
  if (!player || state.activeEvent || state.day < state.eventCooldownUntil) return { event: null, seed: state.simulationSeed };
  const roll = nextRandom(state.simulationSeed);
  const ctx = buildEventContext(state, player);

  // Strategic emergencies bypass the slower public-agenda cadence.
  for (const definition of EVENT_DEFINITIONS) {
    if (definition.tier === 'emergency' && definition.condition?.(ctx)) return { seed: roll.seed, event: instantiate(definition, state, player) };
  }

  // Public agenda is evaluated weekly rather than producing daily random popups.
  if (state.day < AGENDA_START_DAY || state.day % 7 !== 0) return { event: null, seed: roll.seed };
  const candidates = agendaCandidates(ctx);
  if (roll.value > 1 - agendaFireChance(candidates)) {
    // The pressures set how likely an agenda event is; which one fires is a weighted draw.
    const pick = nextRandom(roll.seed);
    const chosen = pickWeighted(candidates, pick.value)!;
    return { event: instantiate(chosen.definition, state, player, chosen.subject), seed: pick.seed };
  }
  return { event: null, seed: roll.seed };
}

export function maybeTriggerEvent(state: GameState): GameState {
  const result = makeEvent(state);
  if (!result.event) return { ...state, simulationSeed: result.seed };
  const player = state.countries[state.playerCountryId];
  const countries = { ...state.countries, [player.id]: { ...player, eventLastFired: { ...player.eventLastFired, [result.event.kind]: state.day } } };
  return { ...state, countries, simulationSeed: result.seed, activeEvent: result.event, speed: 0, sitrep:[`EVENT // ${result.event.title}`, ...state.sitrep].slice(0,12) };
}

function applyEffects(player: CountryState, effects: EventEffects, day: number): CountryState {
  const add = (value: number, delta: number | undefined, min = 0, max = 100) => (delta ? clamp(value + delta, min, max) : value);
  const { economy, politics, diplomacy, society, military, intelligence, industry, technology, resources, processedResources } = player;
  const flags = { ...(player.eventFlags ?? {}) };
  for (const flag of effects.clearFlags ?? []) delete flags[flag];
  for (const [flag, setDay] of Object.entries(flags)) if (day - setDay > EVENT_FLAG_MAX_AGE) delete flags[flag];
  for (const flag of effects.setFlags ?? []) flags[flag] = day;
  return {
    ...player,
    economy: { ...economy, treasury: economy.treasury - eventOptionCostB(player, effects), inflation: add(economy.inflation, effects.inflation, -2, 80), taxRate: add(economy.taxRate, effects.taxRate, 0, 60), unemployment: add(economy.unemployment, effects.unemployment, 0, 60) },
    politics: { ...politics, approval: add(politics.approval, effects.approval), stability: add(politics.stability, effects.stability) },
    diplomacy: { ...diplomacy, reputation: add(diplomacy.reputation, effects.reputation) },
    society: { ...society, cohesion: add(society.cohesion, effects.cohesion) },
    military: { ...military, morale: add(military.morale, effects.morale), readiness: add(military.readiness, effects.readiness), technology: add(military.technology, effects.militaryTechnology) },
    intelligence: { ...intelligence, counterIntelligence: add(intelligence.counterIntelligence, effects.counterIntelligence) },
    industry: { ...industry, utilization: add(industry.utilization, effects.utilization) },
    technology: { ...technology, researchPoints: add(technology.researchPoints, effects.researchPoints, 0, Number.MAX_SAFE_INTEGER) },
    resources: { ...resources, food: add(resources.food, effects.food, 0, Number.MAX_SAFE_INTEGER) },
    processedResources: { ...processedResources, fuel: add(processedResources.fuel, effects.fuel, 0, Number.MAX_SAFE_INTEGER), electricity: add(processedResources.electricity, effects.electricity, 0, Number.MAX_SAFE_INTEGER) },
    eventFlags: flags,
  };
}

/** The catalogue option behind an active event's option id (also for events saved before 0.88). */
export function eventOptionDefinition(kind: EventKind, optionId: string): EventOptionDefinition | undefined {
  return EVENT_CATALOGUE[kind]?.options.find((o) => o.id === optionId);
}

export function resolveEvent(state: GameState, optionId: string): GameState {
  const event = state.activeEvent;
  const player = state.countries[state.playerCountryId];
  if (!event || !player || !event.options.some((option) => option.id === optionId)) return state;
  const definition = eventOptionDefinition(event.kind, optionId);
  const cost = (id: string) => { const d = eventOptionDefinition(event.kind, id); return d ? eventOptionCostB(player, d.effects) : 0; };
  const affordable = (id: string) => cost(id) <= player.economy.treasury;
  // Refuse a response the treasury cannot fund while a cheaper option exists; never strand the event.
  if (!affordable(optionId) && event.options.some((option) => affordable(option.id))) return { ...state, sitrep: [`EVENT // Treasury cannot fund this response (${formatCostB(cost(optionId))}).`, ...state.sitrep].slice(0, 12) };

  let next: GameState = state;
  if (definition) {
    next = { ...state, countries: { ...state.countries, [player.id]: applyEffects(player, definition.effects, state.day) } };
    const subject = event.subjectCountryId;
    if (subject && definition.effects.subjectRelations && next.countries[subject]) next = changeRelations(next, player.id, subject, definition.effects.subjectRelations);
  }
  const summary = definition?.summary ?? 'Government response executed.';
  const cooldown = EVENT_COOLDOWN_MIN + ((state.simulationSeed >>> 6) % EVENT_COOLDOWN_SPREAD);
  return { ...next, activeEvent: null, speed: state.preferredSpeed, eventCooldownUntil: state.day + cooldown, sitrep: [`EVENT RESOLVED // ${summary}`, ...state.sitrep].slice(0, 12) };
}

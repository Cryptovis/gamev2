import { nextRandom } from '../rng';
import type { CouncilResolution, GameState } from '../../domain/game';
import type { CaseStage, IaeaCase, IaeaFinding, IaeaRecord, IaeaStatus, NuclearProgram } from '../../domain/nuclear';
import { SECURITY_COUNCIL_P5 } from '../../data/nuclearArsenals';
import { activeCountries } from '../../domain/sovereignty';
import { changeRelations } from './diplomacy';
import { SANCTIONS_DURATION_DAYS } from './council';
import type { SiteOutput } from './nuclearEnrichment';
import { INSPECTION_DAYS, INSPECTION_DAYS_PROTOCOL, INSPECTION_DAYS_QUERIED, iaeaOf, note, programOf, withIaea, withProgram } from './nuclearState';

/**
 * Phase 9.7: the International Atomic Energy Agency. Declared sites are safeguarded and inspected. Clandestine sites
 * raise suspicion in proportion to their size, assay and how poorly they are hidden; the agency finds them at full
 * suspicion or on a snap inspection. A finding opens a case: the Board of Governors, then a Security Council vote that
 * a friendly permanent member can veto, then sanctions through the same Global Council mechanism as any other.
 */
export const BOARD_DELAY_DAYS = 14;
export const UNSC_DELAY_DAYS = 45;
export const WITHDRAWAL_VOTE_DAYS = 30;
/** Sanctions after a finding last two years. */
export const NUCLEAR_SANCTIONS_DAYS = SANCTIONS_DURATION_DAYS * 2;
/** Relation lost with every state when sites are exposed, and when the treaty is left. */
export const EXPOSURE_RELATION_HIT = 15;
export const WITHDRAWAL_RELATION_HIT = 20;
/** Suspicion each kind of cascade adds per day at full visibility. */
const LEVEL_WEIGHT = { leu: 0.4, heu: 0.9, wgu: 1.7 } as const;
const CONCEALMENT_BASE = 92;
const CONCEALMENT_PER_BLOCK = 3.5;
const CONCEALMENT_LEVEL_PENALTY = { leu: 0, heu: 6, wgu: 14 } as const;
const FINDINGS_KEPT = 8;
/** Veto: a permanent member this friendly toward the violator blocks sanctions. */
export const VETO_RELATION = 50;
/** A state this cool or colder toward the violator votes for sanctions. */
const VOTE_AGAINST_BELOW = 40;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** How well a clandestine site hides: it falls as the hall grows and as the assay climbs. */
export function siteConcealment(centrifuges: number, target: 'leu' | 'heu' | 'wgu'): number {
  return clamp(CONCEALMENT_BASE - CONCEALMENT_PER_BLOCK * (centrifuges / 1000) - CONCEALMENT_LEVEL_PENALTY[target], 5, 100);
}

/** How closely the world is watching: the best intelligence network among states cool toward the violator and the permanent members. */
export function scrutiny(state: GameState, id: string): number {
  let best = 0;
  for (const c of activeCountries(state.countries)) {
    if (c.id === id) continue;
    const cool = (c.diplomacy.relations[id]?.score ?? 0) <= -10 || SECURITY_COUNCIL_P5.includes(c.id);
    if (cool) best = Math.max(best, c.intelligence.networkStrength);
  }
  return clamp(0.5 + 0.5 * (best / 100), 0.5, 1);
}

const hash = (text: string) => { let h = 2166136261; for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619); return h >>> 0; };
/** A reproducible roll in [0,1) for a country on a day; it does not touch the simulation seed. */
export function rollFor(state: GameState, id: string, salt: string): number {
  const seed = ((state.simulationSeed >>> 0) ^ Math.imul(state.day + 1, 0x9e3779b1) ^ hash(id + salt)) >>> 0;
  return nextRandom(nextRandom(seed).seed).value;
}

const record = (iaea: IaeaRecord, state: GameState, kind: IaeaFinding['kind']): IaeaRecord => ({ ...iaea, findings: [{ day: state.day, kind }, ...iaea.findings].slice(0, FINDINGS_KEPT) });

/** The standing the agency would report today. */
export function deriveStatus(iaea: IaeaRecord, exposedSites: number, sanctioned: boolean): IaeaStatus {
  if (!iaea.npt) return 'withdrawn';
  if (iaea.case && iaea.case.stage !== 'closed') return iaea.case.stage === 'exposed' ? 'noncompliant' : 'referred';
  if (sanctioned && iaea.case?.outcome === 'sanctions') return 'sanctioned';
  if (exposedSites > 0 || iaea.compliance < 50) return 'noncompliant';
  if (iaea.compliance < 80) return 'queried';
  return 'compliant';
}

export function suspicionRate(state: GameState, id: string, program: NuclearProgram, outputs: readonly SiteOutput[]): number {
  const iaea = iaeaOf(state, id);
  const producing = new Set(outputs.map(o => o.siteId));
  let rate = 0;
  for (const site of program.sites) {
    if (site.kind !== 'clandestine' || site.exposed || site.centrifuges <= 0) continue;
    const visibility = 1 - siteConcealment(site.centrifuges, site.target) / 100;
    rate += (site.centrifuges / 1000) * LEVEL_WEIGHT[site.target] * visibility * (producing.has(site.id) ? 1 : 0.3);
  }
  return rate * 0.9 * scrutiny(state, id) * (iaea.additionalProtocol ? 1.8 : 1);
}

const inspectionInterval = (iaea: IaeaRecord) => (iaea.status === 'queried' || iaea.status === 'noncompliant' ? INSPECTION_DAYS_QUERIED : iaea.additionalProtocol ? INSPECTION_DAYS_PROTOCOL : INSPECTION_DAYS);

/** Every hidden site is found: the case opens, relations and reputation fall. */
export function exposeSites(state: GameState, id: string): GameState {
  const program = programOf(state, id);
  const country = state.countries[id];
  const iaea = iaeaOf(state, id);
  if (!country || !iaea.npt || !program.sites.some(s => s.kind === 'clandestine' && !s.exposed)) return state;
  const sites = program.sites.map(s => (s.kind === 'clandestine' ? { ...s, exposed: true } : s));
  const opened: IaeaCase = { openedDay: state.day, stage: 'exposed', cause: 'exposure', boardDay: state.day + BOARD_DELAY_DAYS, unscDay: state.day + UNSC_DELAY_DAYS };
  let next = withProgram(state, id, { ...program, sites });
  next = withIaea(next, id, record({ ...iaea, compliance: clamp(iaea.compliance - 35, 0, 100), suspicion: 60, case: opened, status: 'noncompliant' }, state, 'exposed'));
  next = {
    ...next,
    countries: { ...next.countries, [id]: { ...country, diplomacy: { ...country.diplomacy, reputation: clamp(country.diplomacy.reputation - 20, 0, 100) }, politics: { ...country.politics, stability: clamp(country.politics.stability - 5, 0, 100), approval: clamp(country.politics.approval - 3, 0, 100) } } },
  };
  for (const other of activeCountries(next.countries)) if (other.id !== id) next = changeRelations(next, other.id, id, -EXPOSURE_RELATION_HIT);
  return note(next, `NUCLEAR // IAEA inspectors found undeclared enrichment in ${country.name}.`);
}

/** The state leaves the treaty: safeguards end, every site is in the open, a vote follows. */
export function withdrawFromTreaty(state: GameState, id: string): GameState {
  const country = state.countries[id];
  const iaea = iaeaOf(state, id);
  if (!country || !iaea.npt) return state;
  const program = programOf(state, id);
  const opened: IaeaCase = { openedDay: state.day, stage: 'board', cause: 'withdrawal', boardDay: state.day, unscDay: state.day + WITHDRAWAL_VOTE_DAYS };
  let next = withProgram(state, id, { ...program, sites: program.sites.map(s => ({ ...s, exposed: true })) });
  next = withIaea(next, id, record({ ...iaea, npt: false, compliance: 0, suspicion: 0, additionalProtocol: false, status: 'withdrawn', case: opened }, state, 'withdrawn'));
  next = { ...next, countries: { ...next.countries, [id]: { ...country, diplomacy: { ...country.diplomacy, reputation: clamp(country.diplomacy.reputation - 25, 0, 100) } } } };
  for (const other of activeCountries(next.countries)) if (other.id !== id) next = changeRelations(next, other.id, id, -WITHDRAWAL_RELATION_HIT);
  return note(next, `NUCLEAR // ${country.name} has left the non-proliferation treaty.`);
}

/** The Security Council vote: sanctions, a veto by a friendly permanent member, or a vote that fails. */
export function securityCouncilVote(state: GameState, id: string): { outcome: 'sanctions' | 'vetoed' | 'failed'; vetoedBy?: string; support: number } {
  const support = supportShare(state, id);
  if (SECURITY_COUNCIL_P5.includes(id)) return { outcome: 'vetoed', vetoedBy: id, support };
  for (const p5 of SECURITY_COUNCIL_P5) {
    const member = state.countries[p5];
    if (!member || member.annexedBy) continue;
    if ((member.diplomacy.relations[id]?.score ?? 0) >= VETO_RELATION) return { outcome: 'vetoed', vetoedBy: p5, support };
  }
  return { outcome: support >= 50 ? 'sanctions' : 'failed', support };
}

function supportShare(state: GameState, id: string): number {
  let yes = 0, total = 0;
  for (const c of activeCountries(state.countries)) {
    if (c.id === id) continue;
    const weight = Math.max(1, Math.sqrt(Math.max(1, c.economy.gdp)));
    total += weight;
    if ((c.diplomacy.relations[id]?.score ?? 0) < VOTE_AGAINST_BELOW) yes += weight;
  }
  return total ? Number(((yes / total) * 100).toFixed(1)) : 0;
}

function advanceCase(state: GameState, id: string): GameState {
  const iaea = iaeaOf(state, id);
  const c = iaea.case;
  const country = state.countries[id];
  if (!c || c.stage === 'closed' || !country) return state;
  let next = state;
  let stage: CaseStage = c.stage;
  let current = iaea;
  if (stage === 'exposed' && state.day >= c.boardDay) {
    stage = 'board';
    current = record({ ...current, case: { ...c, stage } }, state, 'board');
    next = note(withIaea(next, id, current), `NUCLEAR // The IAEA Board of Governors finds ${country.name} in breach of its safeguards and refers the case to the Security Council.`);
  }
  if (stage === 'board' && state.day >= c.unscDay) {
    const vote = securityCouncilVote(state, id);
    current = iaeaOf(next, id);
    const closed: IaeaCase = { ...c, stage: 'closed', outcome: vote.outcome === 'sanctions' ? 'sanctions' : vote.outcome === 'vetoed' ? 'vetoed' : 'failed', vetoedBy: vote.vetoedBy };
    current = record({ ...current, case: closed }, state, vote.outcome === 'sanctions' ? 'sanctions' : 'vetoed');
    next = withIaea(next, id, current);
    if (vote.outcome === 'sanctions') {
      const target = next.countries[id];
      const proposer = SECURITY_COUNCIL_P5.find(p => p !== id && next.countries[p] && !next.countries[p].annexedBy) ?? SECURITY_COUNCIL_P5[0];
      const resolution: CouncilResolution = { id: `IAEA-sanctions-${id}-${state.day}`, type: 'sanctions', proposerId: proposer, targetCountryId: id, supportPercent: vote.support, passed: true, day: state.day, summary: `sanctions on ${target.name}: ${vote.support}% support (nuclear safeguards)` };
      next = { ...next, countries: { ...next.countries, [id]: { ...target, globalSanctions: true, globalSanctionsUntil: state.day + NUCLEAR_SANCTIONS_DAYS } }, council: { ...next.council, history: [resolution, ...next.council.history].slice(0, 20) } };
      next = note(next, `NUCLEAR // The Security Council imposes sanctions on ${target.name}.`);
    } else if (vote.outcome === 'vetoed') {
      next = note(next, `NUCLEAR // ${next.countries[vote.vetoedBy!]?.name ?? 'A permanent member'} vetoes sanctions on ${country.name}.`);
    } else {
      next = note(next, `NUCLEAR // The Security Council vote on ${country.name} fails to carry.`);
    }
  }
  return next;
}

/**
 * One day of safeguards for one state: suspicion from hidden sites, a snap inspection when one is due, the case against
 * the state, and the slow recovery of its rating.
 */
export function processIaeaDay(state: GameState, id: string, outputs: readonly SiteOutput[]): GameState {
  let next = state;
  const program = programOf(next, id);
  let iaea = iaeaOf(next, id);
  const hidden = program.sites.some(s => s.kind === 'clandestine' && !s.exposed);
  if (iaea.npt) {
    const rate = suspicionRate(next, id, program, outputs);
    iaea = { ...iaea, suspicion: clamp(iaea.suspicion + (hidden ? rate : -0.25), 0, 100) };
    next = withIaea(next, id, iaea);
    if (hidden && iaea.suspicion >= 100) return exposeSites(next, id);
    if (next.day >= iaea.nextInspectionDay) {
      const probability = clamp((iaea.suspicion / 100) * (iaea.additionalProtocol ? 1.5 : 1), 0, 0.95);
      const found = hidden && rollFor(next, id, 'inspection') < probability;
      if (found) return exposeSites(withIaea(next, id, { ...iaea, nextInspectionDay: next.day + inspectionInterval(iaea), lastInspectionDay: next.day }), id);
      const queried = iaea.suspicion >= 40;
      iaea = record({ ...iaea, lastInspectionDay: next.day, nextInspectionDay: next.day + inspectionInterval(iaea), compliance: clamp(iaea.compliance + (queried ? -5 : 2), 0, 100) }, next, queried ? 'queried' : 'clean');
      next = withIaea(next, id, iaea);
      const name = next.countries[id]?.name ?? id;
      if (id === next.playerCountryId) next = note(next, queried ? `NUCLEAR // IAEA inspectors question ${name} about unexplained activity.` : `NUCLEAR // IAEA snap inspection of ${name} finds nothing to report.`);
    }
    iaea = iaeaOf(next, id);
    const exposed = program.sites.filter(s => s.exposed).length;
    const open = iaea.case && iaea.case.stage !== 'closed';
    const drift = exposed > 0 ? -0.2 : open ? 0 : iaea.additionalProtocol ? 0.3 : 0.15;
    iaea = { ...iaea, compliance: clamp(iaea.compliance + drift, 0, 100) };
  }
  next = withIaea(next, id, iaea);
  next = advanceCase(next, id);
  iaea = iaeaOf(next, id);
  const sanctioned = !!next.countries[id]?.globalSanctions;
  const exposedNow = programOf(next, id).sites.filter(s => s.exposed).length;
  return withIaea(next, id, { ...iaea, status: deriveStatus(iaea, exposedNow, sanctioned) });
}

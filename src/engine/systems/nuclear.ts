import type { CountryState, GameState } from '../../domain/game';
import { ENRICH_LEVELS, type DeliveryForces, type EnrichLevel, type IaeaRecord, type NuclearBuild, type NuclearBuildKind, type NuclearCommand, type NuclearProgram, type NuclearSite, type SiteKind } from '../../domain/nuclear';
import { POWER_PLANTS } from '../../data/powerPlants';
import { isArmedAtStart } from '../../data/nuclearArsenals';
import {
  BLOCK_SIZE, KG_PER_URANIUM_UNIT, LEU_KG_PER_PLANT_DAY, MAX_BLOCKS_PER_SITE, MAX_SITES, WARHEAD_KG,
  enrichDay, enrichmentCost, feedAllowed, feedAvailable, siteProductPerDay, siteSwuPerDay, type SiteOutput,
} from './nuclearEnrichment';
import {
  ASSEMBLY_BATCH, ASSEMBLY_MAX_LEVEL, ASSEMBLY_REST_DAYS, BUILD_BASE, CLANDESTINE_COST_FACTOR, UPKEEP_YEAR, WARHEAD_COST,
  DETERRENCE_SHIELD, LOW_DETERRENCE, costScale, dailyUpkeep, programForce, type ForceView,
} from './nuclearForces';
import { exposeSites, processIaeaDay, scrutiny, siteConcealment, suspicionRate, withdrawFromTreaty, deriveStatus } from './nuclearIaea';
import { hasProgram, iaeaOf, note, nuclearOf, programOf, withIaea, withProgram } from './nuclearState';

/**
 * Phase 9.7: the nuclear system. The facade over enrichment (nuclearEnrichment.ts), the triad (nuclearForces.ts) and the
 * IAEA (nuclearIaea.ts): the player's commands, the daily tick, and `nuclearView`, the engine-side preview the panel
 * reads so that no formula lives in the UI. Everything is pure and uses detMath for transcendental maths.
 */
const TECH = 'energy-nuclear';
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Share of the IAEA rating lost when a hidden site is declared on the state's own initiative, and gained by dismantling an exposed one. */
const DECLARE_COMPLIANCE_COST = 10;
const DISMANTLE_COMPLIANCE_GAIN = 8;
/** Suspicion a warhead adds when a treaty party assembles it. */
const WEAPONIZATION_SUSPICION = 10;
const READINESS_LOSS_UNPAID = 0.5;
const READINESS_GAIN_PAID = 0.25;

export type NuclearBlock =
  | 'no_tech' | 'no_funds' | 'site_limit' | 'no_site' | 'block_limit' | 'no_assembly' | 'assembly_max' | 'assembling'
  | 'no_material' | 'rest' | 'no_launcher' | 'treaty_left' | 'treaty_party' | 'feed' | 'wgu_declared' | 'already' | 'no_hidden' | 'in_progress';

const armed = (program: NuclearProgram) => program.warheads > 0;
export const nuclearEligible = (state: GameState, id: string): boolean => {
  const country = state.countries[id];
  return !!country && (country.technology.unlocked.includes(TECH) || isArmedAtStart(id) || armed(programOf(state, id)));
};

const costs = (country: CountryState) => {
  const k = costScale(country);
  return {
    block: BUILD_BASE.centrifuges.cost * k, blockHidden: BUILD_BASE.centrifuges.cost * k * CLANDESTINE_COST_FACTOR,
    icbm: BUILD_BASE.icbm.cost * k, ssbn: BUILD_BASE.ssbn.cost * k, bomber: BUILD_BASE.bomber.cost * k,
    warhead: WARHEAD_COST,
  };
};
const assemblyCost = (country: CountryState, level: number) => BUILD_BASE.assembly.cost * costScale(country) * (level + 1);
const queuedBlocks = (program: NuclearProgram, siteId: string) => queued(program, 'centrifuges', siteId) / BLOCK_SIZE;
const queued = (program: NuclearProgram, kind: NuclearBuildKind, siteId?: string) => program.builds.filter(b => b.kind === kind && (siteId === undefined || b.siteId === siteId)).reduce((sum, b) => sum + b.qty, 0);

// --- Commands -----------------------------------------------------------------------------------

function order(state: GameState, id: string, program: NuclearProgram, kind: NuclearBuildKind, cost: number, siteId?: string): GameState {
  const country = state.countries[id];
  const base = BUILD_BASE[kind];
  const serial = program.serial + 1;
  const build: NuclearBuild = { id: `${id}:${kind}:${serial}`, kind, siteId, qty: kind === 'centrifuges' ? BLOCK_SIZE : 1, startDay: state.day, doneDay: state.day + base.days, cost };
  const paid = { ...state, countries: { ...state.countries, [id]: { ...country, economy: { ...country.economy, treasury: country.economy.treasury - cost } } } };
  return withProgram(paid, id, { ...program, serial, builds: [...program.builds, build] });
}

/** Why `command` cannot be carried out now, or null. The panel disables buttons from the same function. */
export function nuclearBlock(state: GameState, id: string, command: NuclearCommand): NuclearBlock | null {
  const country = state.countries[id];
  if (!country) return 'no_tech';
  const program = programOf(state, id);
  const iaea = iaeaOf(state, id);
  const afford = (cost: number) => (country.economy.treasury >= cost ? null : 'no_funds' as const);
  const site = 'siteId' in command ? program.sites.find(s => s.id === command.siteId) : undefined;
  switch (command.type) {
    case 'nuclear/buildSite': {
      if (!nuclearEligible(state, id)) return 'no_tech';
      if (program.sites.length >= MAX_SITES) return 'site_limit';
      if (command.kind === 'clandestine' && !iaea.npt) return 'treaty_left';
      return afford(command.kind === 'clandestine' ? costs(country).blockHidden : costs(country).block);
    }
    case 'nuclear/expandSite': {
      if (!site) return 'no_site';
      if (site.centrifuges / BLOCK_SIZE + queuedBlocks(program, site.id) >= MAX_BLOCKS_PER_SITE) return 'block_limit';
      return afford(site.kind === 'clandestine' && !site.exposed ? costs(country).blockHidden : costs(country).block);
    }
    case 'nuclear/configureSite':
      if (!site) return 'no_site';
      if (!feedAllowed(command.target, command.feed)) return 'feed';
      if (command.target === 'wgu' && site.kind === 'declared' && iaea.npt) return 'wgu_declared';
      return null;
    case 'nuclear/dismantleSite': return site ? null : 'no_site';
    case 'nuclear/declareSite':
      if (!site || site.kind !== 'clandestine') return 'no_hidden';
      return iaea.npt ? null : 'treaty_left';
    case 'nuclear/buildAssembly':
      if (!nuclearEligible(state, id)) return 'no_tech';
      if (program.assembly + queued(program, 'assembly') >= ASSEMBLY_MAX_LEVEL) return 'assembly_max';
      if (queued(program, 'assembly') > 0) return 'assembling';
      return afford(assemblyCost(country, program.assembly));
    case 'nuclear/assembleWarheads': {
      const batch = ASSEMBLY_BATCH[program.assembly] ?? 0;
      if (batch === 0) return 'no_assembly';
      if (program.lastAssemblyDay !== undefined && state.day < program.lastAssemblyDay + ASSEMBLY_REST_DAYS) return 'rest';
      const count = Math.floor(command.count);
      if (!(count >= 1 && count <= batch)) return 'no_assembly';
      if (program.stock.wgu < count * WARHEAD_KG) return 'no_material';
      return afford(count * WARHEAD_COST);
    }
    case 'nuclear/buildDelivery':
      if (!nuclearEligible(state, id)) return 'no_tech';
      if (program.assembly < 1) return 'no_assembly';
      return afford(costs(country)[command.kind]);
    case 'nuclear/setPatrol': return program.delivery.ssbn > 0 ? null : 'no_launcher';
    case 'nuclear/setProtocol': return iaea.npt ? null : 'treaty_left';
    case 'nuclear/withdrawTreaty': return iaea.npt ? null : 'already';
  }
}

export function applyNuclearCommand(state: GameState, command: NuclearCommand): GameState {
  const id = state.playerCountryId;
  const country = state.countries[id];
  if (!country || nuclearBlock(state, id, command)) return state;
  const program = programOf(state, id);
  const iaea = iaeaOf(state, id);
  const k = costs(country);
  switch (command.type) {
    case 'nuclear/buildSite': {
      const serial = program.serial + 1;
      const site: NuclearSite = { id: `S${serial}`, kind: command.kind, centrifuges: 0, target: 'leu', feed: 'natural', builtDay: state.day, concealment: siteConcealment(BLOCK_SIZE, 'leu') };
      const placed = { ...program, serial, sites: [...program.sites, site] };
      return order(state, id, placed, 'centrifuges', command.kind === 'clandestine' ? k.blockHidden : k.block, site.id);
    }
    case 'nuclear/expandSite': {
      const site = program.sites.find(s => s.id === command.siteId)!;
      return order(state, id, program, 'centrifuges', site.kind === 'clandestine' && !site.exposed ? k.blockHidden : k.block, site.id);
    }
    case 'nuclear/configureSite': {
      const sites = program.sites.map(s => (s.id === command.siteId ? { ...s, target: command.target, feed: command.feed, concealment: siteConcealment(s.centrifuges, command.target) } : s));
      return withProgram(state, id, { ...program, sites });
    }
    case 'nuclear/dismantleSite': {
      const site = program.sites.find(s => s.id === command.siteId)!;
      const next = withProgram(state, id, { ...program, sites: program.sites.filter(s => s.id !== site.id), builds: program.builds.filter(b => b.siteId !== site.id) });
      const remaining = program.sites.filter(s => s.id !== site.id);
      const bonus = site.exposed ? DISMANTLE_COMPLIANCE_GAIN : 0;
      const stillHidden = remaining.some(s => s.kind === 'clandestine' && !s.exposed);
      return withIaea(next, id, { ...iaea, compliance: clamp(iaea.compliance + bonus, 0, 100), suspicion: stillHidden ? iaea.suspicion : Math.min(iaea.suspicion, 20) });
    }
    case 'nuclear/declareSite': {
      const sites = program.sites.map(s => (s.id === command.siteId ? { ...s, kind: 'declared' as SiteKind, exposed: false, target: s.target === 'wgu' ? ('heu' as EnrichLevel) : s.target } : s));
      let next = withProgram(state, id, { ...program, sites });
      const was = program.sites.find(s => s.id === command.siteId)!;
      const record: IaeaRecord = { ...iaea, compliance: clamp(iaea.compliance + (was.exposed ? DISMANTLE_COMPLIANCE_GAIN : -DECLARE_COMPLIANCE_COST), 0, 100), suspicion: iaea.suspicion / 2, findings: [{ day: state.day, kind: 'declared' as const }, ...iaea.findings].slice(0, 8) };
      next = withIaea(next, id, { ...record, status: deriveStatus(record, sites.filter(s => s.exposed).length, !!country.globalSanctions) });
      next = { ...next, countries: { ...next.countries, [id]: { ...country, diplomacy: { ...country.diplomacy, reputation: clamp(country.diplomacy.reputation - 3, 0, 100) } } } };
      return note(next, `NUCLEAR // ${country.name} declares a new enrichment site to the IAEA.`);
    }
    case 'nuclear/buildAssembly': return order(state, id, program, 'assembly', assemblyCost(country, program.assembly));
    case 'nuclear/assembleWarheads': {
      const count = Math.floor(command.count);
      const stock = { ...program.stock, wgu: program.stock.wgu - count * WARHEAD_KG };
      let next = withProgram(state, id, { ...program, stock, warheads: program.warheads + count, lastAssemblyDay: state.day });
      next = { ...next, countries: { ...next.countries, [id]: { ...country, economy: { ...country.economy, treasury: country.economy.treasury - count * WARHEAD_COST } } } };
      return iaea.npt ? withIaea(next, id, { ...iaea, suspicion: clamp(iaea.suspicion + count * WEAPONIZATION_SUSPICION, 0, 100) }) : next;
    }
    case 'nuclear/buildDelivery': return order(state, id, program, command.kind, k[command.kind]);
    case 'nuclear/setPatrol': return withProgram(state, id, { ...program, patrol: clamp(Math.floor(command.count), 0, program.delivery.ssbn) });
    case 'nuclear/setProtocol': return withIaea(state, id, { ...iaea, additionalProtocol: command.enabled });
    case 'nuclear/withdrawTreaty': return withdrawFromTreaty(state, id);
  }
}

// --- The daily tick -----------------------------------------------------------------------------

const READY_NOTE: Record<NuclearBuildKind, string> = {
  centrifuges: 'NUCLEAR // A centrifuge block is ready.', assembly: 'NUCLEAR // The warhead assembly line is ready.', icbm: 'NUCLEAR // A silo-based missile is ready.',
  ssbn: 'NUCLEAR // A ballistic missile submarine is ready.', bomber: 'NUCLEAR // A strategic bomber is ready.',
};

function finishBuilds(state: GameState, id: string): GameState {
  const program = programOf(state, id);
  const done = program.builds.filter(b => b.doneDay <= state.day);
  if (done.length === 0) return state;
  let sites = program.sites;
  let assembly = program.assembly;
  const delivery: DeliveryForces = { ...program.delivery };
  for (const b of done) {
    if (b.kind === 'centrifuges') sites = sites.map(s => (s.id === b.siteId ? { ...s, centrifuges: s.centrifuges + b.qty, concealment: siteConcealment(s.centrifuges + b.qty, s.target) } : s));
    else if (b.kind === 'assembly') assembly = Math.min(ASSEMBLY_MAX_LEVEL, assembly + 1);
    else if (b.kind === 'icbm') delivery.icbm += 1;
    else if (b.kind === 'ssbn') delivery.ssbn += 1;
    else delivery.bombers += 1;
  }
  let next = withProgram(state, id, { ...program, sites, assembly, delivery, builds: program.builds.filter(b => b.doneDay > state.day) });
  if (id === state.playerCountryId) for (const b of done) next = note(next, READY_NOTE[b.kind]);
  return next;
}

/** Reactor fuel: stored 3.67% material is burned in civil stations and displaces the raw uranium they would draw. */
function burnReactorFuel(state: GameState, id: string): GameState {
  const program = programOf(state, id);
  const plants = state.world.energy?.[id]?.plants.nuclear ?? 0;
  const country = state.countries[id];
  if (plants <= 0 || program.stock.leu <= 0 || !country) return state;
  const need = plants * LEU_KG_PER_PLANT_DAY;
  const burned = Math.min(program.stock.leu, need);
  const refund = (burned / need) * plants * POWER_PLANTS.nuclear.fuelUse;
  const next = withProgram(state, id, { ...program, stock: { ...program.stock, leu: program.stock.leu - burned } });
  return { ...next, countries: { ...next.countries, [id]: { ...country, resources: { ...country.resources, uranium: country.resources.uranium + refund } } } };
}

function enrich(state: GameState, id: string): { state: GameState; outputs: SiteOutput[] } {
  const country = state.countries[id];
  const result = enrichDay(programOf(state, id), country);
  const uranium = Math.max(0, country.resources.uranium - result.uraniumUsed);
  const next = withProgram(state, id, result.program);
  return { state: { ...next, countries: { ...next.countries, [id]: { ...country, resources: { ...country.resources, uranium } } } }, outputs: result.outputs };
}

function payUpkeep(state: GameState, id: string): GameState {
  const program = programOf(state, id);
  const country = state.countries[id];
  const due = dailyUpkeep(program);
  if (due <= 0) return program.readiness >= 100 ? state : withProgram(state, id, { ...program, readiness: clamp(program.readiness + READINESS_GAIN_PAID, 0, 100) });
  const paid = Math.min(due, Math.max(0, country.economy.treasury));
  const funded = paid >= due - 1e-12;
  const readiness = clamp(program.readiness + (funded ? READINESS_GAIN_PAID : -READINESS_LOSS_UNPAID), 0, 100);
  const next = withProgram(state, id, { ...program, readiness });
  return { ...next, countries: { ...next.countries, [id]: { ...country, economy: { ...country.economy, treasury: country.economy.treasury - paid }, politics: funded ? country.politics : { ...country.politics, stability: clamp(country.politics.stability - 0.05, 0, 100) } } } };
}

/** Daily: construction, reactor fuel, enrichment, upkeep and safeguards for every state that has a programme. */
export function processNuclear(state: GameState): GameState {
  const nuclear = state.world.nuclear;
  if (!nuclear) return state;
  let next = state;
  for (const id of Object.keys(nuclear.programs).sort()) {
    const country = next.countries[id];
    if (!country || country.annexedBy) continue;
    next = finishBuilds(next, id);
    next = burnReactorFuel(next, id);
    const enriched = enrich(next, id);
    next = payUpkeep(enriched.state, id);
    next = processIaeaDay(next, id, enriched.outputs);
  }
  return next;
}

// --- Deterrence and war -------------------------------------------------------------------------

export function deterrenceOf(state: GameState, id: string): ForceView {
  const program = programOf(state, id);
  return programForce(program, program.readiness);
}

/** A state with a credible second strike cannot be attacked by one with almost none; two armed states can still fight. */
export function shieldedByDeterrence(state: GameState, attackerId: string, defenderId: string): boolean {
  return deterrenceOf(state, defenderId).deterrence >= DETERRENCE_SHIELD && deterrenceOf(state, attackerId).deterrence < LOW_DETERRENCE;
}

// --- What the panel shows -----------------------------------------------------------------------

export interface SiteView {
  site: NuclearSite;
  blocks: number;
  queuedBlocks: number;
  swuPerDay: number;
  /** Feed kilograms and separative work for each kilogram of product. */
  perKg: { feedKg: number; swu: number } | null;
  kgPerDay: number;
  /** Days to enough weapons-grade material for one warhead at this rate (only for a 90% cascade). */
  daysPerWarhead: number | null;
  feedKg: number;
  concealment: number | null;
  block: Record<'expand' | 'dismantle' | 'declare', NuclearBlock | null>;
  /** Why each target and feed pair cannot be set on this site, keyed `target:feed`; null when it can. */
  configure: Record<string, NuclearBlock | null>;
}

export interface NuclearView {
  eligible: boolean;
  /** True once the programme has been written to the save; false while the legacy arsenal is only read from data. */
  started: boolean;
  program: NuclearProgram;
  iaea: IaeaRecord;
  sites: SiteView[];
  force: ForceView;
  upkeepDaily: number;
  upkeepYearly: number;
  costs: { block: number; blockHidden: number; assembly: number; icbm: number; ssbn: number; bomber: number; warhead: number };
  block: { siteDeclared: NuclearBlock | null; siteHidden: NuclearBlock | null; assembly: NuclearBlock | null; assemble: NuclearBlock | null; icbm: NuclearBlock | null; ssbn: NuclearBlock | null; bomber: NuclearBlock | null; patrol: NuclearBlock | null; protocol: NuclearBlock | null; withdraw: NuclearBlock | null };
  assembleMax: number;
  /** Days before the assembly line can finish another batch. */
  restDays: number;
  plants: number;
  leuNeedPerDay: number;
  leuCoverDays: number | null;
  inspectionInDays: number | null;
  hiddenSites: number;
  suspicionPerDay: number;
  /** Days until hidden work is found at today's rate, or null when nothing is hidden or the rate is zero. */
  exposureInDays: number | null;
  scrutiny: number;
  sanctioned: boolean;
  /** Natural uranium held in the national stock, in kilograms. */
  uraniumKg: number;
}

export function nuclearView(state: GameState, id: string): NuclearView {
  const country = state.countries[id];
  const program = programOf(state, id);
  const iaea = iaeaOf(state, id);
  const k = costs(country);
  const plants = state.world.energy?.[id]?.plants.nuclear ?? 0;
  const leuNeedPerDay = plants * LEU_KG_PER_PLANT_DAY;
  const sites: SiteView[] = program.sites.map(site => {
    const perKg = enrichmentCost(site.target, site.feed);
    const kgPerDay = siteProductPerDay(site);
    return {
      site, blocks: site.centrifuges / BLOCK_SIZE, queuedBlocks: queuedBlocks(program, site.id), swuPerDay: siteSwuPerDay(site), perKg, kgPerDay,
      daysPerWarhead: site.target === 'wgu' && kgPerDay > 0 ? WARHEAD_KG / kgPerDay : null,
      feedKg: feedAvailable(country, program.stock, site.feed),
      concealment: site.kind === 'clandestine' && !site.exposed ? siteConcealment(site.centrifuges, site.target) : null,
      configure: Object.fromEntries(ENRICH_LEVELS.flatMap(target => (['natural', 'leu', 'heu'] as const).map(feed => [`${target}:${feed}`, nuclearBlock(state, id, { type: 'nuclear/configureSite', siteId: site.id, target, feed })]))),
      block: {
        expand: nuclearBlock(state, id, { type: 'nuclear/expandSite', siteId: site.id }),
        dismantle: nuclearBlock(state, id, { type: 'nuclear/dismantleSite', siteId: site.id }),
        declare: nuclearBlock(state, id, { type: 'nuclear/declareSite', siteId: site.id }),
      },
    };
  });
  const hiddenSites = program.sites.filter(s => s.kind === 'clandestine' && !s.exposed).length;
  const rate = suspicionRate(state, id, program, []);
  const upkeepDaily = dailyUpkeep(program);
  return {
    eligible: nuclearEligible(state, id), started: hasProgram(state, id), program, iaea, sites, force: programForce(program, program.readiness),
    upkeepDaily, upkeepYearly: upkeepDaily * 365,
    costs: { block: k.block, blockHidden: k.blockHidden, assembly: assemblyCost(country, program.assembly), icbm: k.icbm, ssbn: k.ssbn, bomber: k.bomber, warhead: k.warhead },
    block: {
      siteDeclared: nuclearBlock(state, id, { type: 'nuclear/buildSite', kind: 'declared' }),
      siteHidden: nuclearBlock(state, id, { type: 'nuclear/buildSite', kind: 'clandestine' }),
      assembly: nuclearBlock(state, id, { type: 'nuclear/buildAssembly' }),
      assemble: nuclearBlock(state, id, { type: 'nuclear/assembleWarheads', count: 1 }),
      icbm: nuclearBlock(state, id, { type: 'nuclear/buildDelivery', kind: 'icbm' }),
      ssbn: nuclearBlock(state, id, { type: 'nuclear/buildDelivery', kind: 'ssbn' }),
      bomber: nuclearBlock(state, id, { type: 'nuclear/buildDelivery', kind: 'bomber' }),
      patrol: nuclearBlock(state, id, { type: 'nuclear/setPatrol', count: 0 }),
      protocol: nuclearBlock(state, id, { type: 'nuclear/setProtocol', enabled: true }),
      withdraw: nuclearBlock(state, id, { type: 'nuclear/withdrawTreaty' }),
    },
    assembleMax: Math.min(ASSEMBLY_BATCH[program.assembly] ?? 0, Math.floor(program.stock.wgu / WARHEAD_KG), Math.floor(country.economy.treasury / WARHEAD_COST)),
    restDays: program.lastAssemblyDay === undefined ? 0 : Math.max(0, program.lastAssemblyDay + ASSEMBLY_REST_DAYS - state.day),
    plants, leuNeedPerDay, leuCoverDays: leuNeedPerDay > 0 ? program.stock.leu / leuNeedPerDay : null,
    inspectionInDays: iaea.npt ? Math.max(0, iaea.nextInspectionDay - state.day) : null,
    hiddenSites, suspicionPerDay: rate, exposureInDays: hiddenSites > 0 && rate > 0 ? Math.max(0, (100 - iaea.suspicion) / rate) : null,
    scrutiny: scrutiny(state, id), sanctioned: !!country.globalSanctions, uraniumKg: country.resources.uranium * KG_PER_URANIUM_UNIT,
  };
}

export { exposeSites, UPKEEP_YEAR, nuclearOf };

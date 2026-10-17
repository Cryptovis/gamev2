import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { GameState } from '../domain/game';
import { applyGameCommand } from '../engine/commands';
import { tickGame } from '../engine/tick';
import { log } from '../engine/detMath';
import { createEnergy } from '../engine/systems/energy';
import { warDeclarationReason, warDeclarationStatus } from '../engine/systems/warRules';
import { NUCLEAR_ARSENALS } from '../data/nuclearArsenals';
import { LEVEL_ASSAY, type NuclearCommand } from '../domain/nuclear';
import {
  BLOCK_SIZE, KG_PER_URANIUM_UNIT, LEU_KG_PER_PLANT_DAY, WARHEAD_KG, enrichDay, enrichmentCost, feedAllowed, siteProductPerDay,
} from '../engine/systems/nuclearEnrichment';
import { ASSEMBLY_REST_DAYS, BUILD_BASE, DETERRENCE_SHIELD, forceView } from '../engine/systems/nuclearForces';
import { BOARD_DELAY_DAYS, UNSC_DELAY_DAYS, scrutiny, securityCouncilVote, siteConcealment } from '../engine/systems/nuclearIaea';
import { deterrenceOf, nuclearBlock, nuclearView, processNuclear } from '../engine/systems/nuclear';
import { iaeaOf, programOf } from '../engine/systems/nuclearState';
import { snapshotGame } from '../persistence/snapshot';
import { migrateSave } from '../persistence/migrations';
import { validNuclearState } from '../persistence/validation097';
import { MERGED_CATALOG_GROUP } from '../i18n/localeText';
import { UI_CATALOG_097N } from '../i18n/uiCatalog097Nuclear';

const base = (): GameState => {
  const s = makeInitialState();
  s.world.tutorial.active = false;
  s.eventCooldownUntil = 100000;
  s.advisorCooldownUntil = 100000;
  const t = s.countries.TUR;
  s.countries.TUR = { ...t, technology: { ...t.technology, unlocked: [...t.technology.unlocked, 'energy-nuclear'] }, economy: { ...t.economy, treasury: 800 }, resources: { ...t.resources, uranium: 40 } };
  return s;
};
const run = (s: GameState, cmd: NuclearCommand) => applyGameCommand(s, cmd);
const days = (s: GameState, n: number) => { let x = s; for (let i = 0; i < n; i++) x = processNuclearDay(x); return x; };
/** One nuclear day on its own, so the tests do not depend on the rest of the economy. */
const processNuclearDay = (s: GameState) => processNuclear({ ...s, day: s.day + 1 });
/** Builds a site with some halls finished at once: the build is queued and fast-forwarded. */
function withSite(s: GameState, kind: 'declared' | 'clandestine', blocks: number, target: 'leu' | 'heu' | 'wgu' = 'leu', feed: 'natural' | 'leu' | 'heu' = 'natural'): { s: GameState; siteId: string } {
  let x = run(s, { type: 'nuclear/buildSite', kind });
  const siteId = programOf(x, 'TUR').sites[0].id;
  for (let i = 1; i < blocks; i++) x = run(x, { type: 'nuclear/expandSite', siteId });
  x = { ...x, day: x.day + BUILD_BASE.centrifuges.days };
  x = processNuclear(x);
  x = run(x, { type: 'nuclear/configureSite', siteId, target, feed });
  return { s: x, siteId };
}

describe('9.7 separative work', () => {
  it('prices each step with the standard separative-work formula', () => {
    const leu = enrichmentCost('leu', 'natural')!;
    const heu = enrichmentCost('heu', 'natural')!;
    const wgu = enrichmentCost('wgu', 'natural')!;
    expect(leu.swu).toBeGreaterThan(4);
    expect(leu.swu).toBeLessThan(5.5);
    expect(heu.swu).toBeGreaterThan(35);
    expect(heu.swu).toBeLessThan(50);
    expect(wgu.swu).toBeGreaterThan(190);
    expect(wgu.swu).toBeLessThan(230);
    expect(wgu.feedKg).toBeGreaterThan(heu.feedKg);
    expect(heu.feedKg).toBeGreaterThan(leu.feedKg);
  });
  it('is far cheaper from enriched feed, which is what shortens a breakout', () => {
    expect(enrichmentCost('wgu', 'leu')!.swu).toBeLessThan(enrichmentCost('wgu', 'natural')!.swu / 2);
    expect(enrichmentCost('wgu', 'heu')!.swu).toBeLessThan(enrichmentCost('wgu', 'leu')!.swu);
  });
  it('refuses a feed that is not below the target', () => {
    expect(feedAllowed('leu', 'leu')).toBe(false);
    expect(feedAllowed('leu', 'heu')).toBe(false);
    expect(feedAllowed('heu', 'leu')).toBe(true);
    expect(enrichmentCost('leu', 'heu')).toBeNull();
  });
  it('uses the engine logarithm, so the result is the one detMath gives', () => {
    const p = (x: number) => (2 * x - 1) * log(x / (1 - x));
    const ratio = (LEVEL_ASSAY.leu - 0.0025) / (0.00711 - 0.0025);
    const swu = p(LEVEL_ASSAY.leu) + (ratio - 1) * p(0.0025) - ratio * p(0.00711);
    expect(enrichmentCost('leu', 'natural')!.swu).toBe(swu);
  });
  it('turns centrifuges into product in proportion to their number', () => {
    const one = siteProductPerDay({ centrifuges: BLOCK_SIZE, target: 'leu', feed: 'natural' });
    const two = siteProductPerDay({ centrifuges: 2 * BLOCK_SIZE, target: 'leu', feed: 'natural' });
    expect(Math.abs(two - 2 * one) < 1e-12).toBe(true);
    expect(siteProductPerDay({ centrifuges: 0, target: 'leu', feed: 'natural' })).toBe(0);
  });
});

describe('9.7 building and running cascades', () => {
  it('queues a centrifuge block, bills the treasury and finishes it after its build time', () => {
    const s = base();
    const before = s.countries.TUR.economy.treasury;
    const queued = run(s, { type: 'nuclear/buildSite', kind: 'declared' });
    const p = programOf(queued, 'TUR');
    expect(p.sites.length).toBe(1);
    expect(p.sites[0].centrifuges).toBe(0);
    expect(p.builds.length).toBe(1);
    expect(queued.countries.TUR.economy.treasury).toBeLessThan(before);
    const early = processNuclear({ ...queued, day: queued.day + BUILD_BASE.centrifuges.days - 1 });
    expect(programOf(early, 'TUR').sites[0].centrifuges).toBe(0);
    const done = processNuclear({ ...queued, day: queued.day + BUILD_BASE.centrifuges.days });
    expect(programOf(done, 'TUR').sites[0].centrifuges).toBe(BLOCK_SIZE);
    expect(programOf(done, 'TUR').builds.length).toBe(0);
  });
  it('needs the civil nuclear technology and enough money, and caps hall size', () => {
    const noTech = makeInitialState();
    expect(nuclearBlock(noTech, 'TUR', { type: 'nuclear/buildSite', kind: 'declared' })).toBe('no_tech');
    const poor = base();
    poor.countries.TUR = { ...poor.countries.TUR, economy: { ...poor.countries.TUR.economy, treasury: 0 } };
    expect(nuclearBlock(poor, 'TUR', { type: 'nuclear/buildSite', kind: 'declared' })).toBe('no_funds');
    let { s, siteId } = withSite(base(), 'declared', 1);
    for (let i = 1; i < 10; i++) s = run(s, { type: 'nuclear/expandSite', siteId });
    expect(nuclearBlock(s, 'TUR', { type: 'nuclear/expandSite', siteId })).toBe('block_limit');
  });
  it('makes reactor fuel from natural uranium and draws the uranium stock down', () => {
    const { s } = withSite(base(), 'declared', 2, 'leu');
    const before = s.countries.TUR.resources.uranium;
    const stockBefore = programOf(s, 'TUR').stock.leu;
    const after = days(s, 30);
    const made = programOf(after, 'TUR').stock.leu - stockBefore;
    expect(made).toBeGreaterThan(0);
    expect(after.countries.TUR.resources.uranium).toBeLessThan(before);
    const perDay = siteProductPerDay({ centrifuges: 2 * BLOCK_SIZE, target: 'leu', feed: 'natural' });
    expect(Math.abs(made - 30 * perDay) < 1e-6).toBe(true);
    const used = (before - after.countries.TUR.resources.uranium) * KG_PER_URANIUM_UNIT;
    expect(Math.abs(used - made * enrichmentCost('leu', 'natural')!.feedKg) < 1e-6).toBe(true);
  });
  it('stops when the feed runs out', () => {
    const { s } = withSite(base(), 'declared', 4, 'leu');
    const dry = { ...s, countries: { ...s.countries, TUR: { ...s.countries.TUR, resources: { ...s.countries.TUR.resources, uranium: 0 } } } };
    const stockBefore = programOf(dry, 'TUR').stock.leu;
    const after = days(dry, 10);
    expect(programOf(after, 'TUR').stock.leu).toBe(stockBefore);
  });
  it('re-enriches reactor fuel to research grade and consumes it as feed', () => {
    let { s, siteId } = withSite(base(), 'declared', 2, 'heu', 'leu');
    s = { ...s, world: { ...s.world, nuclear: { ...s.world.nuclear!, programs: { ...s.world.nuclear!.programs, TUR: { ...programOf(s, 'TUR'), stock: { leu: 500, heu: 0, wgu: 0 } } } } } };
    const after = days(s, 20);
    const p = programOf(after, 'TUR');
    expect(p.stock.heu).toBeGreaterThan(0);
    expect(p.stock.leu).toBeLessThan(500);
    expect(siteId.length).toBeGreaterThan(0);
  });
  it('shares one pool of feed between sites in a fixed order', () => {
    const { s } = withSite(base(), 'declared', 2, 'leu');
    const site = programOf(s, 'TUR').sites[0];
    const twin = { ...programOf(s, 'TUR'), sites: [site, { ...site, id: 'S9' }], stock: { leu: 0, heu: 0, wgu: 0 } };
    const scarce = { ...s.countries.TUR, resources: { ...s.countries.TUR.resources, uranium: 0.0035 } };
    const result = enrichDay(twin, scarce);
    expect(result.outputs.length).toBe(2);
    expect(result.outputs[0].kg).toBeGreaterThan(result.outputs[1].kg - 1e-12);
    expect(result.uraniumUsed).toBeLessThan(0.0035 + 1e-12);
  });
  it('feeds civil power stations from stored reactor fuel and refunds the raw uranium they would use', () => {
    let { s } = withSite(base(), 'declared', 1, 'leu');
    const energy = createEnergy(s.countries.TUR);
    s = { ...s, world: { ...s.world, energy: { ...(s.world.energy ?? {}), TUR: { ...energy, plants: { ...energy.plants, nuclear: 2 } } } } };
    s = { ...s, world: { ...s.world, nuclear: { ...s.world.nuclear!, programs: { ...s.world.nuclear!.programs, TUR: { ...programOf(s, 'TUR'), stock: { leu: 100, heu: 0, wgu: 0 }, sites: programOf(s, 'TUR').sites.map(x => ({ ...x, centrifuges: 0 })) } } } } };
    const after = processNuclearDay(s);
    expect(programOf(after, 'TUR').stock.leu).toBe(100 - 2 * LEU_KG_PER_PLANT_DAY);
    expect(after.countries.TUR.resources.uranium).toBeGreaterThan(s.countries.TUR.resources.uranium);
    const view = nuclearView(after, 'TUR');
    expect(view.leuNeedPerDay).toBe(2 * LEU_KG_PER_PLANT_DAY);
    expect(view.leuCoverDays).toBeGreaterThan(10);
  });
  it('limits what a declared site may make while the state is a treaty party', () => {
    const { s, siteId } = withSite(base(), 'declared', 1);
    expect(nuclearBlock(s, 'TUR', { type: 'nuclear/configureSite', siteId, target: 'wgu', feed: 'natural' })).toBe('wgu_declared');
    expect(nuclearBlock(s, 'TUR', { type: 'nuclear/configureSite', siteId, target: 'heu', feed: 'natural' })).toBeNull();
    expect(nuclearBlock(s, 'TUR', { type: 'nuclear/configureSite', siteId, target: 'leu', feed: 'heu' })).toBe('feed');
  });
});

/** A state with weapons-grade material, an assembly line and a rested line, ready to make warheads. */
function armedSetup(): GameState {
  let { s } = withSite(base(), 'declared', 1);
  const p = programOf(s, 'TUR');
  s = { ...s, world: { ...s.world, nuclear: { ...s.world.nuclear!, programs: { ...s.world.nuclear!.programs, TUR: { ...p, assembly: 2, stock: { leu: 0, heu: 0, wgu: 200 } } } } } };
  return s;
}

describe('9.7 warheads and the triad', () => {
  it('assembles warheads from weapons-grade material in batches, billing the treasury', () => {
    const s = armedSetup();
    const made = run(s, { type: 'nuclear/assembleWarheads', count: 3 });
    const p = programOf(made, 'TUR');
    expect(p.warheads).toBe(3);
    expect(p.stock.wgu).toBe(200 - 3 * WARHEAD_KG);
    expect(made.countries.TUR.economy.treasury).toBeLessThan(s.countries.TUR.economy.treasury);
  });
  it('limits a batch to the assembly level and makes the line rest between batches', () => {
    const s = armedSetup();
    expect(nuclearBlock(s, 'TUR', { type: 'nuclear/assembleWarheads', count: 5 })).toBe('no_assembly');
    const made = run(s, { type: 'nuclear/assembleWarheads', count: 4 });
    expect(nuclearBlock(made, 'TUR', { type: 'nuclear/assembleWarheads', count: 1 })).toBe('rest');
    const rested = { ...made, day: made.day + ASSEMBLY_REST_DAYS };
    expect(nuclearBlock(rested, 'TUR', { type: 'nuclear/assembleWarheads', count: 1 })).toBeNull();
  });
  it('needs the material: without 25 kg a core cannot be made', () => {
    const s = armedSetup();
    const thin = { ...s, world: { ...s.world, nuclear: { ...s.world.nuclear!, programs: { ...s.world.nuclear!.programs, TUR: { ...programOf(s, 'TUR'), stock: { leu: 0, heu: 0, wgu: WARHEAD_KG - 1 } } } } } };
    expect(nuclearBlock(thin, 'TUR', { type: 'nuclear/assembleWarheads', count: 1 })).toBe('no_material');
  });
  it('builds an assembly line level by level and refuses a second order while one is in progress', () => {
    const s = withSite(base(), 'declared', 1).s;
    const ordered = run(s, { type: 'nuclear/buildAssembly' });
    expect(nuclearBlock(ordered, 'TUR', { type: 'nuclear/buildAssembly' })).toBe('assembling');
    const done = processNuclear({ ...ordered, day: ordered.day + BUILD_BASE.assembly.days });
    expect(programOf(done, 'TUR').assembly).toBe(1);
  });
  it('builds missiles, submarines and bombers once there is an assembly line, and finishes them on time', () => {
    const s = armedSetup();
    for (const kind of ['icbm', 'ssbn', 'bomber'] as const) {
      const ordered = run(s, { type: 'nuclear/buildDelivery', kind });
      const done = processNuclear({ ...ordered, day: ordered.day + BUILD_BASE[kind].days });
      const d = programOf(done, 'TUR').delivery;
      expect(kind === 'icbm' ? d.icbm : kind === 'ssbn' ? d.ssbn : d.bombers).toBe(1);
    }
    expect(nuclearBlock(withSite(base(), 'declared', 1).s, 'TUR', { type: 'nuclear/buildDelivery', kind: 'icbm' })).toBe('no_assembly');
  });
  it('rates deterrence by the warheads that would survive a first strike', () => {
    const none = forceView(0, { icbm: 0, ssbn: 0, bombers: 0 }, 0, 100);
    expect(none.deterrence).toBe(0);
    const silos = forceView(30, { icbm: 10, ssbn: 0, bombers: 0 }, 0, 100);
    const subs = forceView(30, { icbm: 0, ssbn: 2, bombers: 0 }, 2, 100);
    const portSubs = forceView(30, { icbm: 0, ssbn: 2, bombers: 0 }, 0, 100);
    expect(subs.deterrence).toBeGreaterThan(silos.deterrence);
    expect(portSubs.deterrence).toBeLessThan(subs.deterrence);
    expect(forceView(30, { icbm: 10, ssbn: 0, bombers: 0 }, 0, 50).deterrence).toBeLessThan(silos.deterrence);
    expect(silos.deliverable).toBe(30);
    expect(forceView(100, { icbm: 1, ssbn: 0, bombers: 0 }, 0, 100).deliverable).toBe(3);
  });
  it('puts submarines to sea only up to the fleet size', () => {
    const s = armedSetup();
    const fleet = { ...s, world: { ...s.world, nuclear: { ...s.world.nuclear!, programs: { ...s.world.nuclear!.programs, TUR: { ...programOf(s, 'TUR'), delivery: { icbm: 0, ssbn: 3, bombers: 0 } } } } } };
    expect(programOf(run(fleet, { type: 'nuclear/setPatrol', count: 99 }), 'TUR').patrol).toBe(3);
    expect(programOf(run(fleet, { type: 'nuclear/setPatrol', count: -4 }), 'TUR').patrol).toBe(0);
    expect(nuclearBlock(armedSetup(), 'TUR', { type: 'nuclear/setPatrol', count: 1 })).toBe('no_launcher');
  });
  it('reads the legacy arsenals from data until a state acts, with a strong deterrent for the great powers', () => {
    const s = base();
    expect(programOf(s, 'USA').warheads).toBe(NUCLEAR_ARSENALS.USA.warheads);
    expect(s.world.nuclear).toBeUndefined();
    expect(deterrenceOf(s, 'USA').deterrence).toBeGreaterThan(95);
    expect(deterrenceOf(s, 'ISR').deterrence).toBeGreaterThan(DETERRENCE_SHIELD);
    expect(deterrenceOf(s, 'PRK').deterrence).toBeLessThan(DETERRENCE_SHIELD);
    expect(deterrenceOf(s, 'GRC').deterrence).toBe(0);
  });
  it('bills upkeep only for growth beyond the legacy arsenal', () => {
    const s = base();
    const usa = { ...s, playerCountryId: 'USA' as const };
    const idle = nuclearView(usa, 'USA');
    expect(idle.upkeepDaily).toBe(0);
    const built = applyGameCommand(usa, { type: 'nuclear/buildDelivery', kind: 'bomber' });
    const done = processNuclear({ ...built, day: built.day + BUILD_BASE.bomber.days });
    expect(nuclearView(done, 'USA').upkeepDaily).toBeGreaterThan(0);
  });
  it('lets upkeep run down the treasury and readiness when it cannot be paid', () => {
    const s = armedSetup();
    const made = run(s, { type: 'nuclear/assembleWarheads', count: 4 });
    const broke = { ...made, countries: { ...made.countries, TUR: { ...made.countries.TUR, economy: { ...made.countries.TUR.economy, treasury: 0 } } } };
    const after = days(broke, 20);
    expect(programOf(after, 'TUR').readiness).toBeLessThan(100);
    expect(after.countries.TUR.economy.treasury).toBeGreaterThan(-1e-9);
    const funded = days(made, 20);
    expect(funded.countries.TUR.economy.treasury).toBeLessThan(made.countries.TUR.economy.treasury);
    expect(programOf(funded, 'TUR').readiness).toBe(100);
  });
  it('shields a state with a credible second strike from one that has almost none', () => {
    const s = base();
    expect(warDeclarationStatus(s, 'TUR', 'ISR')).toMatchObject({ allowed: false, block: 'deterrence' });
    expect(warDeclarationStatus(s, 'USA', 'ISR').block).not.toBe('deterrence');
    expect(warDeclarationStatus(s, 'TUR', 'GRC').block).not.toBe('deterrence');
  });
});

describe('9.7 IAEA safeguards', () => {
  it('does not suspect declared sites however large they are', () => {
    const { s } = withSite(base(), 'declared', 6, 'heu');
    const after = days(s, 200);
    expect(iaeaOf(after, 'TUR').suspicion).toBe(0);
    expect(iaeaOf(after, 'TUR').status).toBe('compliant');
  });
  it('hides a small clandestine hall for a long time and a large weapons hall hardly at all', () => {
    expect(siteConcealment(2000, 'leu')).toBeGreaterThan(siteConcealment(6000, 'wgu'));
    const small = withSite(base(), 'clandestine', 1, 'leu').s;
    const smallAfter = days(small, 100);
    expect(iaeaOf(smallAfter, 'TUR').case).toBeUndefined();
    const big = withSite(base(), 'clandestine', 6, 'wgu').s;
    const bigAfter = days(big, 120);
    expect(iaeaOf(bigAfter, 'TUR').case === undefined).toBe(false);
  });
  it('raises suspicion with size and assay, and previews the days to exposure', () => {
    const lo = withSite(base(), 'clandestine', 2, 'leu').s;
    const hi = withSite(base(), 'clandestine', 6, 'wgu').s;
    expect(nuclearView(hi, 'TUR').suspicionPerDay).toBeGreaterThan(nuclearView(lo, 'TUR').suspicionPerDay);
    const v = nuclearView(hi, 'TUR');
    expect(v.hiddenSites).toBe(1);
    expect(v.exposureInDays).toBeGreaterThan(0);
    const declared = withSite(base(), 'declared', 6, 'heu').s;
    expect(nuclearView(declared, 'TUR').exposureInDays).toBeNull();
  });
  it('exposes hidden sites at full suspicion: reputation, relations and stability fall at once', () => {
    let { s } = withSite(base(), 'clandestine', 6, 'wgu');
    s = { ...s, world: { ...s.world, nuclear: { ...s.world.nuclear!, iaea: { ...s.world.nuclear!.iaea, TUR: { ...iaeaOf(s, 'TUR'), suspicion: 99.9 } } } } };
    const after = days(s, 3);
    const iaea = iaeaOf(after, 'TUR');
    expect(iaea.case?.cause).toBe('exposure');
    expect(programOf(after, 'TUR').sites[0].exposed).toBe(true);
    expect(iaea.compliance).toBeLessThan(70);
    expect(after.countries.TUR.diplomacy.reputation).toBeLessThan(s.countries.TUR.diplomacy.reputation);
    expect(after.countries.TUR.politics.stability).toBeLessThan(s.countries.TUR.politics.stability);
    expect(after.countries.GRC.diplomacy.relations.TUR.score).toBeLessThan(s.countries.GRC.diplomacy.relations.TUR?.score ?? 1);
    expect(after.sitrep.some(t => t.includes('undeclared enrichment'))).toBe(true);
  });
  const exposedState = (): GameState => {
    let { s } = withSite(base(), 'clandestine', 6, 'wgu');
    s = { ...s, world: { ...s.world, nuclear: { ...s.world.nuclear!, iaea: { ...s.world.nuclear!.iaea, TUR: { ...iaeaOf(s, 'TUR'), suspicion: 99.9 } } } } };
    return days(s, 2);
  };
  it('runs the case: Board of Governors, then the Security Council, then sanctions', () => {
    const s = exposedState();
    const opened = iaeaOf(s, 'TUR').case!;
    const board = processNuclear({ ...s, day: opened.boardDay });
    expect(iaeaOf(board, 'TUR').case?.stage).toBe('board');
    expect(iaeaOf(board, 'TUR').status).toBe('referred');
    expect(board.countries.TUR.globalSanctions).toBeFalsy();
    const vote = processNuclear({ ...board, day: opened.unscDay });
    expect(opened.unscDay - opened.boardDay).toBe(UNSC_DELAY_DAYS - BOARD_DELAY_DAYS);
    expect(iaeaOf(vote, 'TUR').case?.stage).toBe('closed');
    if (iaeaOf(vote, 'TUR').case?.outcome === 'sanctions') {
      expect(vote.countries.TUR.globalSanctions).toBe(true);
      expect(vote.countries.TUR.globalSanctionsUntil).toBeGreaterThan(vote.day + 365);
      expect(vote.council.history[0].passed).toBe(true);
      expect(iaeaOf(vote, 'TUR').status).toBe('sanctioned');
    }
  });
  it('passes sanctions when the council is cool and lets a friendly permanent member veto them', () => {
    const s = exposedState();
    const cool = { ...s, countries: Object.fromEntries(Object.entries(s.countries).map(([id, c]) => [id, id === 'TUR' ? c : { ...c, diplomacy: { ...c.diplomacy, relations: { ...c.diplomacy.relations, TUR: { score: -30, status: 'neutral' as const, treaties: [], sanctions: false } } } }])) } as GameState;
    expect(securityCouncilVote(cool, 'TUR').outcome).toBe('sanctions');
    const rus = cool.countries.RUS;
    const friend = { ...cool, countries: { ...cool.countries, RUS: { ...rus, diplomacy: { ...rus.diplomacy, relations: { ...rus.diplomacy.relations, TUR: { score: 70, status: 'ally' as const, treaties: [], sanctions: false } } } } } } as GameState;
    expect(securityCouncilVote(friend, 'TUR')).toMatchObject({ outcome: 'vetoed', vetoedBy: 'RUS' });
    const opened = iaeaOf(friend, 'TUR').case!;
    const vetoed = processNuclear({ ...processNuclear({ ...friend, day: opened.boardDay }), day: opened.unscDay });
    expect(vetoed.countries.TUR.globalSanctions).toBeFalsy();
    expect(iaeaOf(vetoed, 'TUR').case?.outcome).toBe('vetoed');
  });
  it('lets a permanent member veto its own case', () => {
    expect(securityCouncilVote(base(), 'RUS')).toMatchObject({ outcome: 'vetoed', vetoedBy: 'RUS' });
  });
  it('measures scrutiny by the best intelligence network among cool states and permanent members', () => {
    const s = base();
    expect(scrutiny(s, 'TUR')).toBeGreaterThan(0.49);
    expect(scrutiny(s, 'TUR')).toBeLessThan(1.0001);
  });
  it('lets the state declare a hidden site before it is found, at a small price', () => {
    const { s, siteId } = withSite(base(), 'clandestine', 3, 'wgu');
    const declared = run(s, { type: 'nuclear/declareSite', siteId });
    const site = programOf(declared, 'TUR').sites[0];
    expect(site.kind).toBe('declared');
    expect(site.target).toBe('heu');
    expect(iaeaOf(declared, 'TUR').compliance).toBeLessThan(100);
    expect(iaeaOf(declared, 'TUR').case).toBeUndefined();
    expect(nuclearBlock(declared, 'TUR', { type: 'nuclear/declareSite', siteId })).toBe('no_hidden');
  });
  it('lets the state dismantle a site, which calms the agency and restores the rating', () => {
    const exposed = (() => { let { s } = withSite(base(), 'clandestine', 6, 'wgu'); s = { ...s, world: { ...s.world, nuclear: { ...s.world.nuclear!, iaea: { ...s.world.nuclear!.iaea, TUR: { ...iaeaOf(s, 'TUR'), suspicion: 99.9 } } } } }; return days(s, 2); })();
    const siteId = programOf(exposed, 'TUR').sites[0].id;
    const gone = run(exposed, { type: 'nuclear/dismantleSite', siteId });
    expect(programOf(gone, 'TUR').sites.length).toBe(0);
    expect(iaeaOf(gone, 'TUR').compliance).toBeGreaterThan(iaeaOf(exposed, 'TUR').compliance);
  });
  it('speeds detection with the additional protocol and improves the rating of an honest state', () => {
    const { s } = withSite(base(), 'clandestine', 3, 'heu');
    const protocol = run(s, { type: 'nuclear/setProtocol', enabled: true });
    expect(nuclearView(protocol, 'TUR').suspicionPerDay).toBeGreaterThan(nuclearView(s, 'TUR').suspicionPerDay);
    const honest = withSite(base(), 'declared', 1).s;
    const withProtocol = run(honest, { type: 'nuclear/setProtocol', enabled: true });
    const low = { ...withProtocol, world: { ...withProtocol.world, nuclear: { ...withProtocol.world.nuclear!, iaea: { ...withProtocol.world.nuclear!.iaea, TUR: { ...iaeaOf(withProtocol, 'TUR'), compliance: 60 } } } } };
    expect(iaeaOf(days(low, 30), 'TUR').compliance).toBeGreaterThan(60);
  });
  it('holds snap inspections on schedule and reports a clean one', () => {
    const { s } = withSite(base(), 'declared', 1);
    const next = iaeaOf(s, 'TUR').nextInspectionDay;
    const before = { ...s, day: next - 1 };
    const inspected = processNuclear({ ...before, day: next });
    expect(iaeaOf(inspected, 'TUR').lastInspectionDay).toBe(next);
    expect(iaeaOf(inspected, 'TUR').nextInspectionDay).toBeGreaterThan(next);
    expect(iaeaOf(inspected, 'TUR').findings[0].kind).toBe('clean');
  });
  it('lets the state leave the treaty: safeguards end, relations and reputation fall, a vote follows', () => {
    const { s } = withSite(base(), 'declared', 2, 'heu');
    const left = run(s, { type: 'nuclear/withdrawTreaty' });
    const iaea = iaeaOf(left, 'TUR');
    expect(iaea.npt).toBe(false);
    expect(iaea.status).toBe('withdrawn');
    expect(iaea.case?.cause).toBe('withdrawal');
    expect(left.countries.TUR.diplomacy.reputation).toBeLessThan(s.countries.TUR.diplomacy.reputation);
    expect(nuclearBlock(left, 'TUR', { type: 'nuclear/withdrawTreaty' })).toBe('already');
    expect(nuclearBlock(left, 'TUR', { type: 'nuclear/buildSite', kind: 'clandestine' })).toBe('treaty_left');
    const siteId = programOf(left, 'TUR').sites[0].id;
    expect(nuclearBlock(left, 'TUR', { type: 'nuclear/configureSite', siteId, target: 'wgu', feed: 'natural' })).toBeNull();
    const later = days(left, 40);
    expect(iaeaOf(later, 'TUR').case?.stage).toBe('closed');
  });
});

describe('9.7 saves and determinism', () => {
  it('leaves world.nuclear absent and the state untouched when nobody has a programme', () => {
    const s = base();
    expect(processNuclear(s)).toBe(s);
    let x = s;
    for (let i = 0; i < 30; i++) x = tickGame({ ...x, speed: 1 });
    expect(x.world.nuclear).toBeUndefined();
  });
  it('keeps programmes through snapshot and migration and accepts saves with and without them', () => {
    const { s } = withSite(base(), 'clandestine', 2, 'heu');
    const loaded = migrateSave(snapshotGame(s));
    expect(loaded === null).toBe(false);
    expect(JSON.stringify(loaded!.world.nuclear)).toBe(JSON.stringify(s.world.nuclear));
    expect(validNuclearState(s)).toBe(true);
    expect(validNuclearState(base())).toBe(true);
  });
  it('rejects corrupt nuclear state', () => {
    const { s } = withSite(base(), 'clandestine', 2, 'heu');
    const bad = (mutate: (n: any) => void) => { const copy = structuredClone(s) as any; mutate(copy.world.nuclear); return validNuclearState(copy); };
    expect(bad(n => { n.programs.TUR.sites[0].target = 'plutonium'; })).toBe(false);
    expect(bad(n => { n.programs.TUR.stock.wgu = -1; })).toBe(false);
    expect(bad(n => { n.programs.TUR.patrol = 5; })).toBe(false);
    expect(bad(n => { n.programs.XXX = n.programs.TUR; })).toBe(false);
    expect(bad(n => { n.iaea.TUR.compliance = 140; })).toBe(false);
    expect(bad(n => { n.iaea.TUR.status = 'angry'; })).toBe(false);
    expect(bad(n => { n.programs.TUR.builds.push({ id: 'b', kind: 'laser', qty: 1, startDay: 1, doneDay: 2, cost: 1 }); })).toBe(false);
    expect(validNuclearState({ ...s, world: { ...s.world, nuclear: 'x' } })).toBe(false);
  });
  it('produces identical states from identical inputs and never touches the simulation seed', () => {
    const play = () => days(withSite(base(), 'clandestine', 5, 'wgu').s, 90);
    const a = play(), b = play();
    expect(JSON.stringify(a.world.nuclear)).toBe(JSON.stringify(b.world.nuclear));
    expect(a.simulationSeed).toBe(base().simulationSeed);
  });
  it('fills in a whole 360 days through the real tick without leaving non-finite numbers', () => {
    let s = withSite(base(), 'declared', 3, 'leu').s;
    for (let i = 0; i < 360; i++) s = tickGame({ ...s, speed: 1 });
    const p = programOf(s, 'TUR');
    for (const v of [p.stock.leu, p.stock.heu, p.stock.wgu, p.readiness, s.countries.TUR.economy.treasury, s.countries.TUR.resources.uranium, iaeaOf(s, 'TUR').compliance]) expect(Number.isFinite(v)).toBe(true);
    expect(p.stock.leu).toBeGreaterThan(0);
  });
});

describe('9.7 text and war shield', () => {
  it('has four non-empty translations for every key and keeps placeholders in step', () => {
    for (const [key, translations] of Object.entries(UI_CATALOG_097N)) {
      expect(translations.length).toBe(4);
      const holes = (text: string) => (text.match(/\{\d\}/g) ?? []).sort().join('');
      for (const text of translations) {
        expect(text.trim().length).toBeGreaterThan(0);
        expect(holes(text)).toBe(holes(key));
      }
    }
  });
  it('is not shadowed by a later catalogue entry', () => {
    const later = MERGED_CATALOG_GROUP.slice(MERGED_CATALOG_GROUP.indexOf(UI_CATALOG_097N) + 1);
    for (const catalog of later) for (const key of Object.keys(UI_CATALOG_097N)) expect(key in catalog).toBe(false);
  });
  it('gives a readable reason when a nuclear power cannot be attacked', () => {
    expect(warDeclarationReason({ allowed: false, block: 'deterrence' } as never)).toContain('nuclear');
  });
});

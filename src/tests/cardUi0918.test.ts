import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { FACILITIES } from '../data/industrialCatalog';
import type { GameState } from '../domain/game';
import type { FacilityKind } from '../domain/industrial';
import { executeCommandResult } from '../engine/commands';
import { CONCESSION_DAYS, concessionStatus } from '../engine/systems/factions';
import { UI_CATALOG_0918 } from '../i18n/uiCatalog0918';
import { translateText } from '../i18n/localeText';
import { CURRENT_SCHEMA_VERSION } from '../persistence/migrations';
import { facilityArtVariant } from '../ui/icons/FacilityArt';
import { buildBlockLabel, facilityBuildBlock, factoryView, PROJECT_LIMIT } from '../ui/panels/factoryView';
import { CONCESSION_ORDER, policyCards, reasonParts } from '../ui/panels/policyCards';

const KINDS = Object.keys(FACILITIES) as FacilityKind[];
const techs = [...new Set(KINDS.map((k) => FACILITIES[k].tech).filter((t): t is string => Boolean(t)))];

/** The player with a deep treasury and every facility technology unlocked. */
function rich(): GameState {
  const s = makeInitialState(), p = s.countries[s.playerCountryId];
  return { ...s, countries: { ...s.countries, [p.id]: { ...p, economy: { ...p.economy, treasury: 1_000_000 }, technology: { ...p.technology, unlocked: [...new Set([...p.technology.unlocked, ...techs])] } } } };
}
function withEconomy(s: GameState, patch: (n: GameState['industrialEconomy'][string]) => Partial<GameState['industrialEconomy'][string]>): GameState {
  const id = s.playerCountryId, n = s.industrialEconomy[id];
  return { ...s, industrialEconomy: { ...s.industrialEconomy, [id]: { ...n, ...patch(n) } } };
}
function withPlayer(s: GameState, patch: (c: GameState['countries'][string]) => Partial<GameState['countries'][string]>): GameState {
  const id = s.playerCountryId, c = s.countries[id];
  return { ...s, countries: { ...s.countries, [id]: { ...c, ...patch(c) } } };
}

describe('Phase 6.4 policy cards', () => {
  it('builds six cards in the documented order with typed commands for the player', () => {
    const s = rich(), cards = policyCards(s, s.playerCountryId);
    expect(cards.map((c) => c.id)).toEqual(['tax', ...CONCESSION_ORDER.map((f) => `concession:${f}`)]);
    expect(CONCESSION_ORDER).toEqual(['labour', 'business', 'security', 'traditional', 'liberal']);
    expect(cards[0].status).toBe('available');
    expect(cards[0].taxRate).toBe(s.countries[s.playerCountryId].economy.taxRate);
    expect(cards[0].command).toBeUndefined();
    for (const card of cards.slice(1)) {
      expect(card.status).toBe('available');
      expect(card.command).toEqual({ type: 'politics/concession', faction: card.faction });
    }
  });

  it('after a concession that card is active for 180 days and the other four are locked with the engine reason', () => {
    const s = rich(), labour = policyCards(s, s.playerCountryId).find((c) => c.id === 'concession:labour')!;
    const result = executeCommandResult(s, labour.command!);
    expect(result.status).toBe('applied');
    const cards = policyCards(result.state, s.playerCountryId), reason = concessionStatus(result.state.countries[s.playerCountryId], result.state.day).reason;
    const active = cards.filter((c) => c.status === 'active');
    expect(active.map((c) => c.id)).toEqual(['concession:labour']);
    expect(active[0].daysLeft).toBe(CONCESSION_DAYS);
    expect(active[0].activeUntilDay).toBe(s.day + CONCESSION_DAYS);
    const locked = cards.filter((c) => c.status === 'locked');
    expect(locked).toHaveLength(4);
    for (const card of locked) { expect(card.reason).toBe(reason); expect(card.command).toBeUndefined(); }
    expect(cards[0].status).toBe('available'); // the Tax Code is never locked
  });

  it('counts the days left down as game days pass and unlocks the cards once it ends', () => {
    const s = rich(), applied = executeCommandResult(s, { type: 'politics/concession', faction: 'business' }).state;
    expect(policyCards({ ...applied, day: applied.day + 30 }, s.playerCountryId).find((c) => c.status === 'active')!.daysLeft).toBe(CONCESSION_DAYS - 30);
    const later = policyCards({ ...applied, day: applied.day + CONCESSION_DAYS + 1 }, s.playerCountryId);
    expect(later.filter((c) => c.status === 'active')).toHaveLength(0);
  });

  it('with too little treasury the concession cards are locked with the engine reason', () => {
    const s = withPlayer(rich(), (c) => ({ economy: { ...c.economy, treasury: 0 } })), cards = policyCards(s, s.playerCountryId);
    expect(concessionStatus(s.countries[s.playerCountryId], s.day).reason).toBe('Insufficient treasury.');
    for (const card of cards.slice(1)) { expect(card.status).toBe('locked'); expect(card.reason).toBe('Insufficient treasury.'); expect(card.command).toBeUndefined(); }
    expect(cards[0].status).toBe('available');
  });

  it('a controlled government cannot bargain', () => {
    const s = withPlayer(rich(), () => ({ controllerCountryId: 'USA' })), cards = policyCards(s, s.playerCountryId);
    for (const card of cards.slice(1)) { expect(card.status).toBe('locked'); expect(card.reason).toBe('A controlled government cannot bargain with factions.'); }
  });

  it('a foreign country is read-only: the same cards, no commands', () => {
    const s = rich(), cards = policyCards(s, 'FRA');
    expect(cards).toHaveLength(6);
    expect(cards.every((c) => c.command === undefined)).toBe(true);
    expect(cards[0].taxRate).toBe(s.countries.FRA.economy.taxRate);
    expect(policyCards(s, 'NOPE')).toEqual([]);
  });

  it('does not change the state it reads', () => {
    const s = rich(), before = JSON.stringify(s.countries[s.playerCountryId].politics);
    policyCards(s, s.playerCountryId);
    expect(JSON.stringify(s.countries[s.playerCountryId].politics)).toBe(before);
  });

  it('splits the engine reason into a translatable template', () => {
    expect(reasonParts('A concession to Labour runs until day 240.')).toEqual({ key: 'A concession to {0} runs until day {1}.', values: ['Labour', '240'] });
    expect(reasonParts('Insufficient treasury.')).toEqual({ key: 'Insufficient treasury.', values: [] });
  });
});

describe('Phase 6.4 build block mirrors the engine', () => {
  const scenarios: Record<string, (s: GameState, kind: FacilityKind) => GameState> = {
    'ready': (s) => s,
    'six projects': (s, kind) => withEconomy(s, (n) => ({ projects: Array.from({ length: PROJECT_LIMIT }, (_, i) => ({ id: `p${i}`, kind, readyDay: s.day + 50 })) })),
    'five projects': (s, kind) => withEconomy(s, () => ({ projects: Array.from({ length: PROJECT_LIMIT - 1 }, (_, i) => ({ id: `p${i}`, kind, readyDay: s.day + 50 })) })),
    'missing technology': (s) => withPlayer(s, (c) => ({ technology: { ...c.technology, unlocked: [] } })),
    'treasury just below cost': (s, kind) => withPlayer(s, (c) => ({ economy: { ...c.economy, treasury: FACILITIES[kind].cost - 0.0001 } })),
    'treasury exactly the cost': (s, kind) => withPlayer(s, (c) => ({ economy: { ...c.economy, treasury: FACILITIES[kind].cost } })),
    'empty deposit': (s) => withEconomy(s, (n) => ({ deposits: Object.fromEntries(Object.keys(n.deposits).map((k) => [k, 0])) as typeof n.deposits })),
    'full deposits': (s) => withEconomy(s, (n) => ({ deposits: Object.fromEntries(Object.keys(n.deposits).map((k) => [k, 500])) as typeof n.deposits })),
    'non-finite treasury': (s) => withPlayer(s, (c) => ({ economy: { ...c.economy, treasury: Number.NaN } })),
  };
  const projectsOf = (s: GameState) => s.industrialEconomy[s.playerCountryId].projects.length;

  for (const [name, make] of Object.entries(scenarios)) {
    it(`${name}: facilityBuildBlock is null exactly when industry/build is applied, for every facility`, () => {
      for (const kind of KINDS) {
        const s = make(rich(), kind), block = facilityBuildBlock(s, s.playerCountryId, kind);
        const result = executeCommandResult(s, { type: 'industry/build', kind });
        const built = result.status === 'applied' && projectsOf(result.state) === projectsOf(s) + 1;
        expect(block === null, `${name} / ${kind}: block=${block}, engine ${result.status}`).toBe(built);
      }
    });
  }

  it('names the reason in the engine order and treats another country as foreign', () => {
    const s = rich(), kind: FacilityKind = 'civil_factory';
    expect(facilityBuildBlock(s, s.playerCountryId, kind)).toBeNull();
    expect(facilityBuildBlock(s, 'FRA', kind)).toBe('foreign');
    expect(facilityBuildBlock(scenarios['six projects'](s, kind), s.playerCountryId, kind)).toBe('limit');
    const techKind = KINDS.find((k) => FACILITIES[k].tech)!;
    expect(facilityBuildBlock(scenarios['missing technology'](s, techKind), s.playerCountryId, techKind)).toBe('tech');
    expect(facilityBuildBlock(scenarios['treasury just below cost'](s, kind), s.playerCountryId, kind)).toBe('treasury');
    const mine = KINDS.find((k) => FACILITIES[k].deposit)!;
    expect(facilityBuildBlock(scenarios['empty deposit'](s, mine), s.playerCountryId, mine)).toBe('deposit');
  });

  it('every block has wording', () => {
    for (const block of ['limit', 'tech', 'treasury', 'deposit', 'foreign'] as const) expect(buildBlockLabel(block, 'x').length).toBeGreaterThan(0);
    expect(buildBlockLabel('tech', 'energy-water')).toBe('Research {0}');
  });
});

describe('Phase 6.4 factory view', () => {
  it('reports output from the last tick and electricity from power x count', () => {
    const kind: FacilityKind = 'waterworks', d = FACILITIES[kind];
    const s = withEconomy(rich(), (n) => ({ facilities: { ...n.facilities, [kind]: 3 }, enabled: { ...n.enabled, [kind]: true }, lastOutput: { water: 7.5 }, bottlenecks: { [kind]: 'operational' } }));
    const v = factoryView(s, s.playerCountryId, kind)!;
    expect(v.count).toBe(3);
    expect(v.dailyOutput).toEqual({ good: 'water', amount: 7.5, healthy: true });
    expect(v.dailyPower.amount).toBeCloseTo(d.power * 3, 10);
    expect(v.dailyPower.healthy).toBe(true);
    expect(v.bottleneck).toBeNull();
  });

  it('an electricity bottleneck makes the power row unhealthy and the production row too', () => {
    const kind: FacilityKind = 'waterworks';
    const s = withEconomy(rich(), (n) => ({ facilities: { ...n.facilities, [kind]: 2 }, enabled: { ...n.enabled, [kind]: true }, bottlenecks: { [kind]: 'electricity' } }));
    const v = factoryView(s, s.playerCountryId, kind)!;
    expect(v.bottleneck).toBe('electricity');
    expect(v.dailyPower.healthy).toBe(false);
    expect(v.dailyOutput.healthy).toBe(false);
  });

  it('another bottleneck leaves electricity healthy but production not', () => {
    const kind: FacilityKind = 'gold_mine';
    const s = withEconomy(rich(), (n) => ({ facilities: { ...n.facilities, [kind]: 1 }, enabled: { ...n.enabled, [kind]: true }, bottlenecks: { [kind]: 'treasury' } }));
    const v = factoryView(s, s.playerCountryId, kind)!;
    expect(v.dailyPower.healthy).toBe(true);
    expect(v.dailyOutput.healthy).toBe(false);
  });

  it('a paused or unbuilt facility is not healthy and shows no bottleneck', () => {
    const kind: FacilityKind = 'coal_mine';
    const paused = withEconomy(rich(), (n) => ({ facilities: { ...n.facilities, [kind]: 2 }, enabled: { ...n.enabled, [kind]: false }, bottlenecks: { [kind]: 'electricity' } }));
    const v = factoryView(paused, paused.playerCountryId, kind)!;
    expect(v.enabled).toBe(false);
    expect(v.bottleneck).toBeNull();
    expect(v.dailyOutput.healthy).toBe(false);
    const none = withEconomy(rich(), (n) => ({ facilities: { ...n.facilities, [kind]: 0 } }));
    const u = factoryView(none, none.playerCountryId, kind)!;
    expect(u.count).toBe(0);
    expect(u.dailyPower.amount).toBe(0);
    expect(u.dailyOutput.healthy).toBe(false);
  });

  it('the industrial park has no output good', () => {
    const s = rich(), v = factoryView(s, s.playerCountryId, 'civil_factory')!;
    expect(v.dailyOutput.good).toBeNull();
    expect(v.dailyOutput.amount).toBe(0);
  });

  it('limit reached at six projects and not at five', () => {
    const kind: FacilityKind = 'civil_factory', proj = (n: number, s: GameState) => withEconomy(s, () => ({ projects: Array.from({ length: n }, (_, i) => ({ id: `p${i}`, kind, readyDay: s.day + 9 })) }));
    const base = rich();
    expect(factoryView(proj(5, base), base.playerCountryId, kind)).toMatchObject({ projects: 5, projectLimit: 6, limitReached: false, build: null });
    expect(factoryView(proj(6, base), base.playerCountryId, kind)).toMatchObject({ projects: 6, limitReached: true, build: 'limit' });
  });

  it('returns null for a country without an industrial economy', () => {
    expect(factoryView(rich(), 'NOPE', 'gold_mine')).toBeNull();
  });

  it('picks one of three drawings for every facility kind', () => {
    const seen = new Set(KINDS.map(facilityArtVariant));
    expect([...seen].sort()).toEqual(['mine', 'plant', 'works']);
    expect(facilityArtVariant('civil_factory')).toBe('plant');
    expect(facilityArtVariant('waterworks')).toBe('mine');
    expect(facilityArtVariant('armor_mill')).toBe('works');
    expect(facilityArtVariant('gold_mine')).toBe('mine');
  });
});

describe('Phase 6.4 stays out of the save format', () => {
  it('keeps schema 17', () => { expect(CURRENT_SCHEMA_VERSION).toBe(17); });
});

describe('Phase 6.4 translations', () => {
  it('every card and factory label translates in all four non-English languages', () => {
    for (const [key, values] of Object.entries(UI_CATALOG_0918)) {
      expect(values).toHaveLength(4);
      for (const [i, lang] of ['tr', 'es', 'zh', 'ru'].entries()) {
        expect(values[i].trim()).not.toBe('');
        expect(translateText(lang, key)).toBe(key === key.toUpperCase() ? values[i].toLocaleUpperCase(lang) : values[i]);
      }
    }
  });
  it('keeps placeholders and has no translation artefacts', () => {
    for (const [key, values] of Object.entries(UI_CATALOG_0918)) {
      const slots = key.match(/\{\d\}/g) ?? [];
      for (const value of values) {
        for (const slot of slots) expect(value).toContain(slot);
        expect(/\{\\f|&(?:amp|quot|lt|gt|apos|#\d+);/.test(value)).toBe(false);
      }
    }
  });
  it('the law names are distinct in every language', () => {
    for (const i of [0, 1, 2, 3]) {
      const names = ['Labour Charter', 'Business Relief Act', 'Security Mandate', 'Traditional Values Act', 'Urban Reform Act'].map((k) => UI_CATALOG_0918[k][i]);
      expect(new Set(names).size).toBe(5);
    }
  });
});

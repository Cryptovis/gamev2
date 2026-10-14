import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { CAPITAL_POSITIONS } from '../data/capitalPositions';
import type { CountryState, WarState } from '../domain/game';
import { eventPins, unrestLevel, UNREST_PIN_LEVEL } from '../map/eventPins';
import { UI_CATALOG_0919 } from '../i18n/uiCatalog0919';
import { translateText } from '../i18n/localeText';
import { CURRENT_SCHEMA_VERSION } from '../persistence/migrations';
import { directionOf, liveDeltas, moneyDeltaText, stockDeltaText } from '../ui/hud/liveDeltas';
import { portraitMood } from '../ui/hud/portraitMood';

const equirect = (ll: [number, number]): [number, number] => [(ll[0] + 180) / 360 * 1200, (90 - ll[1]) / 180 * 700];
const war = (id: string, a: string, d: string, status = 'active') => ({ id, attackerId: a, defenderId: d, status }) as unknown as WarState;
function world(patch: Record<string, Partial<CountryState['politics']>> = {}) {
  const base = makeInitialState(), countries = { ...base.countries };
  for (const c of Object.values(countries)) countries[c.id] = { ...c, politics: { ...c.politics, stability: 70 } };
  for (const [id, p] of Object.entries(patch)) countries[id] = { ...countries[id], politics: { ...countries[id].politics, ...p } };
  return { countries, playerCountryId: base.playerCountryId };
}
const input = (w: ReturnType<typeof world>, wars: Record<string, WarState> = {}, extra = {}) => ({ ...w, wars, capitals: CAPITAL_POSITIONS, project: equirect, width: 1200, height: 700, ...extra });

describe('Phase 6.5 live change counters', () => {
  it('formats money like the cost labels and keeps the sign', () => {
    expect(moneyDeltaText(1.234)).toBe('+$1.23B');
    expect(moneyDeltaText(-0.4)).toBe('-$0.4B');
    expect(moneyDeltaText(12.34)).toBe('+$12.3B');
    expect(moneyDeltaText(250.4)).toBe('+$250B');
    expect(moneyDeltaText(0.0002)).toBe('$0B');
    expect(moneyDeltaText(-0.0002)).toBe('$0B');
  });
  it('formats stock changes', () => {
    expect(stockDeltaText(-400)).toBe('-400');
    expect(stockDeltaText(0.456)).toBe('+0.46');
    expect(stockDeltaText(12.34)).toBe('+12.3');
    expect(stockDeltaText(0.001)).toBe('0');
  });
  it('arrows follow the sign and noise stays flat', () => {
    expect(directionOf(1, 0.01)).toBe('up');
    expect(directionOf(-1, 0.01)).toBe('down');
    expect(directionOf(0.005, 0.01)).toBe('flat');
    expect(directionOf(Number.NaN, 0.01)).toBe('flat');
    expect(directionOf(Number.POSITIVE_INFINITY, 0.01)).toBe('flat'); // non-finite values never colour a counter
  });
  it('returns treasury, food and oil in order', () => {
    const d = liveDeltas({ dailyBalance: 1.2, net: { food: -0.4, oil: 0 } });
    expect(d.map((x) => x.id)).toEqual(['treasury', 'food', 'oil']);
    expect(d.map((x) => x.direction)).toEqual(['up', 'down', 'flat']);
    expect(d[0].text).toBe('+$1.2B');
    expect(d[1].text).toBe('-0.4');
  });
});

describe('Phase 6.5 portrait mood', () => {
  const calm = { atWar: false, regimeCrisis: false, stability: 55, approval: 50 };
  it('is calm in ordinary times', () => { expect(portraitMood(calm)).toBe('calm'); });
  it('turns to alarm in a war, a regime crisis or low stability, before gold', () => {
    expect(portraitMood({ ...calm, atWar: true, approval: 90, stability: 90 })).toBe('alarm');
    expect(portraitMood({ ...calm, regimeCrisis: true })).toBe('alarm');
    expect(portraitMood({ ...calm, stability: 29.9, approval: 95 })).toBe('alarm');
    expect(portraitMood({ ...calm, stability: 30 })).toBe('calm');
  });
  it('turns gold only with high approval and good stability', () => {
    expect(portraitMood({ ...calm, approval: 70, stability: 60 })).toBe('gold');
    expect(portraitMood({ ...calm, approval: 69.9, stability: 80 })).toBe('calm');
    expect(portraitMood({ ...calm, approval: 90, stability: 59.9 })).toBe('calm');
  });
});

describe('Phase 6.5 event pins', () => {
  it('draws one swords pin per active war at the middle of the two capitals', () => {
    const w = world(), pins = eventPins(input(w, { a: war('a', 'TUR', 'GRC') }));
    const wars = pins.filter((p) => p.kind === 'war');
    expect(wars).toHaveLength(1);
    const t = equirect(CAPITAL_POSITIONS.TUR), g = equirect(CAPITAL_POSITIONS.GRC);
    expect(wars[0].point[0]).toBeCloseTo((t[0] + g[0]) / 2, 6);
    expect(wars[0].point[1]).toBeCloseTo((t[1] + g[1]) / 2, 6);
    expect(wars[0].target).toBe('a');
    expect(wars[0].label.values).toEqual([w.countries.TUR.name, w.countries.GRC.name]);
  });
  it('ignores ended wars and wars with an unknown country', () => {
    const w = world();
    expect(eventPins(input(w, { a: war('a', 'TUR', 'GRC', 'ended'), b: war('b', 'TUR', 'NOPE') }))).toEqual([]);
  });
  it('lists the player\'s wars first and caps the war pins', () => {
    const w = world(), wars: Record<string, WarState> = {};
    for (const [i, [a, d]] of [['FRA', 'DEU'], ['ITA', 'ESP'], ['USA', 'CAN'], ['TUR', 'GRC']].entries()) wars[`w${i}`] = war(`w${i}`, a, d);
    const pins = eventPins(input(w, wars, { maxWar: 2 }));
    expect(pins.filter((p) => p.kind === 'war')).toHaveLength(2);
    expect(pins[0].target).toBe('w3');
    expect(pins[0].severity).toBeGreaterThan(pins[1].severity);
  });
  it('uses the visible capital when only one is on the visible side, and nothing when neither is', () => {
    const w = world(), tur = CAPITAL_POSITIONS.TUR;
    const only = eventPins(input(w, { a: war('a', 'TUR', 'GRC') }, { project: (ll: [number, number]) => (ll === tur ? [100, 100] : null) }));
    expect(only[0].point).toEqual([100, 100]);
    expect(eventPins(input(w, { a: war('a', 'TUR', 'GRC') }, { project: () => null }))).toEqual([]);
  });
  it('drops pins outside the screen', () => {
    const w = world();
    expect(eventPins(input(w, { a: war('a', 'TUR', 'GRC') }, { project: () => [-200, 50] }))).toEqual([]);
  });
  it('draws a megaphone where stability is under 30 or a regime crisis is open', () => {
    const w = world({ GRC: { stability: 20 } });
    const pins = eventPins(input(w));
    expect(pins.map((p) => p.id)).toEqual(['unrest:GRC']);
    expect(pins[0].kind).toBe('unrest');
    expect(pins[0].severity).toBe(unrestLevel(w.countries.GRC));
    expect(pins[0].point[1]).toBeCloseTo(equirect(CAPITAL_POSITIONS.GRC)[1] - 18, 6);
    const calm = world({ GRC: { stability: 30 } });
    expect(eventPins(input(calm))).toEqual([]);
  });
  it('an open regime crisis alone is enough', () => {
    const w = world(), c = w.countries.FRA;
    const crisis = { ...c, politics: { ...c.politics, factions: { ...(c.politics.factions as any), crisis: { openedDay: 1, deadlineDay: 40 } } } } as CountryState;
    expect(unrestLevel(crisis)).toBeGreaterThanOrEqual(UNREST_PIN_LEVEL);
    expect(eventPins(input({ ...w, countries: { ...w.countries, FRA: crisis } })).map((p) => p.id)).toEqual(['unrest:FRA']);
  });
  it('ranks unrest by level with the player first and honours the cap', () => {
    const w = world({ GRC: { stability: 5 }, FRA: { stability: 25 }, DEU: { stability: 10 }, TUR: { stability: 28 } });
    const ids = eventPins(input(w)).map((p) => p.id);
    expect(ids).toEqual(['unrest:TUR', 'unrest:GRC', 'unrest:DEU', 'unrest:FRA']);
    expect(eventPins(input(w, {}, { maxUnrest: 2 })).map((p) => p.id)).toEqual(['unrest:TUR', 'unrest:GRC']);
  });
  it('skips annexed and occupied countries', () => {
    const w = world({ GRC: { stability: 5 }, FRA: { stability: 5 } });
    w.countries.GRC = { ...w.countries.GRC, annexedBy: 'TUR' } as CountryState;
    w.countries.FRA = { ...w.countries.FRA, controllerCountryId: 'DEU' } as CountryState;
    expect(eventPins(input(w))).toEqual([]);
  });
  it('is deterministic and does not touch its input', () => {
    const w = world({ GRC: { stability: 5 } }), wars = { a: war('a', 'TUR', 'GRC') }, before = JSON.stringify(wars);
    expect(eventPins(input(w, wars))).toEqual(eventPins(input(w, wars)));
    expect(JSON.stringify(wars)).toBe(before);
  });
});

describe('Phase 6.5 stays out of the save format', () => {
  it('keeps the current schema 18', () => { expect(CURRENT_SCHEMA_VERSION).toBe(18); });
});

describe('Phase 6.5 translations', () => {
  it('every label translates in all four non-English languages', () => {
    for (const [key, values] of Object.entries(UI_CATALOG_0919)) {
      expect(values).toHaveLength(4);
      for (const [i, lang] of ['tr', 'es', 'zh', 'ru'].entries()) {
        expect(values[i].trim()).not.toBe('');
        expect(translateText(lang, key)).toBe(values[i]);
      }
    }
  });
  it('keeps placeholders and has no artefacts', () => {
    for (const [key, values] of Object.entries(UI_CATALOG_0919)) for (const value of values) {
      for (const slot of key.match(/\{\d\}/g) ?? []) expect(value).toContain(slot);
      expect(/\{\\f|&(?:amp|quot|lt|gt|apos|#\d+);/.test(value)).toBe(false);
    }
  });
});

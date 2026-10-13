import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { CAPITAL_POSITIONS } from '../data/capitalPositions';
import { MICROSTATE_POINTS } from '../data/microstates';
import type { CountryState, RelationStatus, TreatyType } from '../domain/game';
import { capitalPinScale, capitalPins, type CapitalPinInput } from '../map/capitalPins';
import { DESK_TILT, tilt, toViewBox, untilt } from '../map/deskTilt';
import { renderSurface, type SurfaceView } from '../map/surfaceRaster';
import { UI_CATALOG_0917 } from '../i18n/uiCatalog0917';
import { translateText } from '../i18n/localeText';
import { DEFAULT_MAP_DESK, parseMapDesk } from '../presentation/mapDeskSettings';

// A small deterministic generator keeps the "random point" checks reproducible.
function lcg(seed: number) { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32; }

describe('desk tilt pointer mapping', () => {
  it('untilt is the inverse of tilt for random points in several boxes', () => {
    const rnd = lcg(917);
    for (const [w, h] of [[1440, 900], [1024, 640], [1920, 1080]]) {
      for (let i = 0; i < 2000; i++) {
        const x = rnd() * w, y = rnd() * h, [X, Y] = tilt(x, y, w, h), [bx, by] = untilt(X, Y, w, h);
        expect(Math.abs(bx - x)).toBeLessThan(1e-6);
        expect(Math.abs(by - y)).toBeLessThan(1e-6);
      }
    }
  });
  it('the bottom-centre point (the tilt origin) maps to itself', () => {
    const [x, y] = tilt(720, 900, 1440, 900), [bx, by] = untilt(720, 900, 1440, 900);
    expect(x).toBeCloseTo(720, 9); expect(y).toBeCloseTo(900, 9);
    expect(bx).toBeCloseTo(720, 9); expect(by).toBeCloseTo(900, 9);
  });
  it('the top edge lands a little below the top of the box, so the screen top corresponds to a point above the local box', () => {
    const [, topY] = tilt(720, 0, 1440, 900);
    expect(topY).toBeGreaterThan(5); expect(topY).toBeLessThan(15);
    expect(untilt(720, 0, 1440, 900)[1]).toBeLessThan(0);
  });
  it('the tilt constants are the documented ones', () => {
    expect(DESK_TILT).toMatchObject({ degrees: 18, perspective: 1600, scale: 1.12, originX: 0.5, originY: 1 });
  });
  it('toViewBox undoes the xMidYMid meet letterboxing', () => {
    // 1440×900: scale 1.2, 30 px bars above and below.
    expect(toViewBox(720, 450, 1440, 900)).toEqual([600, 350]);
    expect(toViewBox(0, 30, 1440, 900)).toEqual([0, 0]);
    expect(toViewBox(1440, 870, 1440, 900)[0]).toBeCloseTo(1200, 9);
    expect(toViewBox(1440, 870, 1440, 900)[1]).toBeCloseTo(700, 9);
    // 390×844: scale 0.325, bars above and below.
    const [x, y] = toViewBox(195, 422, 390, 844);
    expect(x).toBeCloseTo(600, 9); expect(y).toBeCloseTo(350, 9);
    expect(toViewBox(0, 308.25, 390, 844)[1]).toBeCloseTo(0, 9);
  });
  it('a tilted click on a known screen point resolves back to the same viewBox point', () => {
    const w = 1440, h = 900, [bx, by] = [640, 420]; // viewBox point
    const k = Math.min(w / 1200, h / 700), ox = (w - 1200 * k) / 2, oy = (h - 700 * k) / 2;
    const [sx, sy] = tilt(ox + bx * k, oy + by * k, w, h);
    const [lx, ly] = untilt(sx, sy, w, h), [vx, vy] = toViewBox(lx, ly, w, h);
    expect(vx).toBeCloseTo(bx, 6); expect(vy).toBeCloseTo(by, 6);
  });
});

describe('relief reprojection mode', () => {
  // A uniform grey 8×4 "hillshade": every sample is 100.
  const grey = { width: 8, height: 4, data: new Uint8ClampedArray(8 * 4 * 4).map((_, i) => (i % 4 === 3 ? 255 : 100)) };
  const flat: SurfaceView = { flat: true, rotate: [0, 0, 0], scale: 190, translate: [600, 350], pan: { x: 0, y: 0 }, zoom: 1 };
  const globe: SurfaceView = { flat: false, rotate: [0, 0, 0], scale: 286, translate: [600, 358], pan: { x: 0, y: 0 }, zoom: 1 };
  const px = (a: Uint8ClampedArray, x: number, y: number) => Array.from(a.slice((y * 120 + x) * 4, (y * 120 + x) * 4 + 4));

  it('writes the luminance sample unshaded to R, G and B with full alpha (flat)', () => {
    expect(px(renderSurface(grey, flat, 120, 70, undefined, 0, 70, 'relief'), 60, 35)).toEqual([100, 100, 100, 255]);
  });
  it('colour mode still applies the flat shade, so relief is a distinct mode', () => {
    expect(px(renderSurface(grey, flat, 120, 70), 60, 35)).toEqual([91, 91, 91, 255]);
    expect(px(renderSurface(grey, flat, 120, 70, undefined, 0, 70, 'color'), 60, 35)).toEqual([91, 91, 91, 255]);
  });
  it('skips the globe limb shading and leaves pixels outside the sphere transparent', () => {
    const relief = renderSurface(grey, globe, 120, 70, undefined, 0, 70, 'relief'), color = renderSurface(grey, globe, 120, 70);
    expect(px(relief, 60, 7)).toEqual([100, 100, 100, 255]);   // close to the limb: no darkening
    expect(px(color, 60, 7)[0]).toBeLessThan(85);              // the colour surface darkens there
    expect(px(relief, 0, 0)).toEqual([0, 0, 0, 0]);            // outside the sphere
    expect(px(color, 0, 0)).toEqual([0, 0, 0, 0]);
  });
  it('renders in row bands exactly like a single pass', () => {
    const whole = renderSurface(grey, globe, 120, 70, undefined, 0, 70, 'relief'), banded = new Uint8ClampedArray(120 * 70 * 4);
    renderSurface(grey, globe, 120, 70, banded, 0, 35, 'relief');
    renderSurface(grey, globe, 120, 70, banded, 35, 70, 'relief');
    expect(Array.from(banded)).toEqual(Array.from(whole));
  });
});

describe('map desk settings', () => {
  it('defaults are all on', () => expect(DEFAULT_MAP_DESK).toEqual({ tilt: true, relief: true, pins: true }));
  it('missing, empty or invalid storage gives the defaults', () => {
    expect(parseMapDesk(null)).toEqual(DEFAULT_MAP_DESK);
    expect(parseMapDesk('')).toEqual(DEFAULT_MAP_DESK);
    expect(parseMapDesk('{not json')).toEqual(DEFAULT_MAP_DESK);
    expect(parseMapDesk('null')).toEqual(DEFAULT_MAP_DESK);
    expect(parseMapDesk('42')).toEqual(DEFAULT_MAP_DESK);
    expect(parseMapDesk('"tilt"')).toEqual(DEFAULT_MAP_DESK);
  });
  it('a stored value is read back', () => expect(parseMapDesk('{"tilt":false,"relief":false,"pins":false}')).toEqual({ tilt: false, relief: false, pins: false }));
  it('a partial object keeps the defaults for the missing fields', () => expect(parseMapDesk('{"relief":false}')).toEqual({ tilt: true, relief: false, pins: true }));
  it('wrongly typed fields fall back per field', () => expect(parseMapDesk('{"tilt":"no","relief":0,"pins":false}')).toEqual({ tilt: true, relief: true, pins: false }));
});

// ---- capital pins ----------------------------------------------------------------------------------------------
type Overrides = Partial<Record<string, { status?: RelationStatus; treaties?: TreatyType[] }>>;
function world(relations: Overrides = {}, patch: Partial<Record<string, Partial<CountryState>>> = {}) {
  const base = makeInitialState(), countries = { ...base.countries };
  const player = countries[base.playerCountryId];
  // The real start has NATO and other treaties for the player; start from a clean slate so each test names its own relations.
  const rel: typeof player.diplomacy.relations = {};
  for (const [id, r] of Object.entries(relations)) rel[id] = { score: 0, status: r?.status ?? 'neutral', treaties: r?.treaties ?? [], sanctions: false };
  countries[player.id] = { ...player, diplomacy: { ...player.diplomacy, relations: rel } };
  for (const [id, p] of Object.entries(patch)) countries[id] = { ...countries[id], ...p } as CountryState;
  return { countries, playerCountryId: base.playerCountryId };
}
/** Equirectangular stand-in for the map projection. */
const equirect = (ll: [number, number]): [number, number] => [(ll[0] + 180) / 360 * 1200, (90 - ll[1]) / 180 * 700];
const ids = (pins: { id: string }[]) => pins.map((p) => p.id);
const inputFor = (w: ReturnType<typeof world>, extra: Partial<CapitalPinInput> = {}): CapitalPinInput =>
  ({ ...w, selectedCountryId: null, hovered: null, project: equirect, zoom: 1, flat: true, ...extra });
/** A projector that only knows the listed countries (by their capital's array identity); everything else is off the globe. */
function placed(at: Record<string, [number, number]>) {
  const byRef = new Map<[number, number], [number, number]>();
  for (const [id, p] of Object.entries(at)) byRef.set(CAPITAL_POSITIONS[id], p);
  return (ll: [number, number]) => byRef.get(ll) ?? null;
}

describe('capital pins', () => {
  it('at world zoom only the player\'s capital shows when there are no relations', () => {
    const pins = capitalPins(inputFor(world()));
    expect(pins).toEqual([expect.objectContaining({ id: 'TUR', role: 'player', priority: 1000 })]);
  });
  it('player, selected and hovered are always present with their own priority', () => {
    const w = world();
    const pins = capitalPins(inputFor(w, { selectedCountryId: 'BRA', hovered: 'JPN' }));
    expect(ids(pins)).toEqual(['TUR', 'BRA', 'JPN']);
    expect(pins.map((p) => [p.role, p.priority])).toEqual([['player', 1000], ['selected', 900], ['other', 800]]);
  });
  it('relation roles come from the player\'s relations: war → enemy, alliance → ally, any other treaty or an embassy → partner', () => {
    const w = world({ GRC: { status: 'war' }, DEU: { treaties: ['alliance'] }, BRA: { treaties: ['trade'] }, JPN: { treaties: [] }, ARG: { treaties: ['nonAggression'] } });
    const pins = capitalPins(inputFor(w, { embassyPartners: new Set(['JPN']) }));
    const role = Object.fromEntries(pins.map((p) => [p.id, p.role]));
    expect(role).toMatchObject({ TUR: 'player', GRC: 'enemy', DEU: 'ally', BRA: 'partner', ARG: 'partner', JPN: 'partner' });
    expect(Object.keys(role)).toHaveLength(6);
    expect(ids(pins)).toEqual(['TUR', 'GRC', 'DEU', 'ARG', 'BRA', 'JPN']); // player, enemy, ally, then partners by id
  });
  it('an alliance wins over a trade treaty, and war wins over everything', () => {
    const w = world({ DEU: { treaties: ['trade', 'alliance'] }, GRC: { status: 'war', treaties: ['alliance'] } });
    const role = Object.fromEntries(capitalPins(inputFor(w)).map((p) => [p.id, p.role]));
    expect(role.DEU).toBe('ally'); expect(role.GRC).toBe('enemy');
  });
  it('other countries appear only from zoom 1.8 on the flat map and 1.4 on the globe', () => {
    const w = world();
    expect(capitalPins(inputFor(w, { zoom: 1.79 }))).toHaveLength(1);
    expect(capitalPins(inputFor(w, { zoom: 1.8 })).length).toBeGreaterThan(5);
    expect(capitalPins(inputFor(w, { zoom: 1.39, flat: false }))).toHaveLength(1);
    expect(capitalPins(inputFor(w, { zoom: 1.4, flat: false })).length).toBeGreaterThan(5);
  });
  it('never returns more than maxPins (default 48) and keeps the most important pins', () => {
    const w = world({ GRC: { status: 'war' } });
    const keys = Object.keys(CAPITAL_POSITIONS);
    const grid = placed(Object.fromEntries(keys.map((id, i) => [id, [30 + (i % 38) * 30, 30 + Math.floor(i / 38) * 100] as [number, number]])));
    const all = capitalPins(inputFor(w, { project: grid, zoom: 4 }));
    expect(all).toHaveLength(48);
    expect(ids(all).slice(0, 2)).toEqual(['TUR', 'GRC']);
    const few = capitalPins(inputFor(w, { project: grid, zoom: 4, maxPins: 5 }));
    expect(few).toHaveLength(5);
    expect(ids(few).slice(0, 2)).toEqual(['TUR', 'GRC']);
  });
  it('among other countries the larger population wins the cut', () => {
    const w = world();
    const grid = placed({ TUR: [100, 100], CHN: [300, 300], IND: [500, 300], MLT: [700, 300] });
    const pins = capitalPins(inputFor(w, { project: grid, zoom: 3, maxPins: 3 }));
    expect(ids(pins)[0]).toBe('TUR');
    expect(ids(pins).slice(1).sort()).toEqual(['CHN', 'IND']);
  });
  it('drops a pin closer than 18 px to a higher-priority pin, but keeps one exactly 18 px away', () => {
    const w = world({ GRC: { status: 'war' }, DEU: { treaties: ['alliance'] }, BRA: { treaties: ['trade'] } });
    const pins = capitalPins(inputFor(w, { project: placed({ TUR: [100, 100], GRC: [500, 300], DEU: [517, 300], BRA: [518, 300] }) }));
    expect(ids(pins)).toEqual(['TUR', 'GRC', 'BRA']);
  });
  it('never drops the player, selected or hovered pin to a collision', () => {
    const w = world({ GRC: { status: 'war' } });
    const pins = capitalPins(inputFor(w, { selectedCountryId: 'GRC', hovered: 'DEU', project: placed({ TUR: [200, 200], GRC: [205, 200], DEU: [210, 200] }) }));
    expect(ids(pins)).toEqual(['TUR', 'GRC', 'DEU']);
  });
  it('skips the far side of the globe, even for a selected country', () => {
    const w = world({ GRC: { status: 'war' } });
    const pins = capitalPins(inputFor(w, { selectedCountryId: 'DEU', flat: false, zoom: 3, project: placed({ TUR: [100, 100], GRC: [300, 300] }) }));
    expect(ids(pins)).toEqual(['TUR', 'GRC']);
  });
  it('skips points outside the screen (12 px margin)', () => {
    const w = world({ GRC: { status: 'war' }, DEU: { treaties: ['alliance'] }, BRA: { treaties: ['trade'] } });
    const pins = capitalPins(inputFor(w, { project: placed({ TUR: [100, 100], GRC: [-12, 300], DEU: [-13, 300], BRA: [1212, 712] }) }));
    expect(ids(pins)).toEqual(['TUR', 'GRC', 'BRA']);
  });
  it('skips annexed and occupied countries', () => {
    const w = world({ GRC: { status: 'war' }, DEU: { treaties: ['alliance'] }, BRA: { treaties: ['trade'] } }, { GRC: { controllerCountryId: 'TUR' }, DEU: { annexedBy: 'TUR' } });
    expect(ids(capitalPins(inputFor(w)))).toEqual(['TUR', 'BRA']);
  });
  it('skips microstates, which have their own marker', () => {
    const micro = Object.keys(MICROSTATE_POINTS).find((id) => CAPITAL_POSITIONS[id] && makeInitialState().countries[id]);
    expect(micro).toBeDefined();
    const w = world({ [micro!]: { status: 'war' } });
    expect(ids(capitalPins(inputFor(w, { zoom: 6 })))).not.toContain(micro);
  });
  it('is deterministic and sorted by priority, then id', () => {
    const w = world({ GRC: { status: 'war' }, DEU: { treaties: ['alliance'] } });
    const a = capitalPins(inputFor(w, { zoom: 3, selectedCountryId: 'BRA' })), b = capitalPins(inputFor(w, { zoom: 3, selectedCountryId: 'BRA' }));
    expect(a).toEqual(b);
    for (let i = 1; i < a.length; i++) expect(a[i - 1].priority).toBeGreaterThanOrEqual(a[i].priority);
    expect(ids(a).slice(0, 4)).toEqual(['TUR', 'BRA', 'GRC', 'DEU']);
  });
  it('the pin scale grows with zoom and stays within 0.8–1.4', () => {
    expect(capitalPinScale(0)).toBe(0.8);
    expect(capitalPinScale(1)).toBeCloseTo(0.95, 9);
    expect(capitalPinScale(2)).toBeCloseTo(1.1, 9);
    expect(capitalPinScale(12)).toBe(1.4);
    expect(capitalPins(inputFor(world(), { zoom: 2 }))[0].scale).toBeCloseTo(1.1, 9);
  });
  it('does not change the game state it reads', () => {
    const w = world({ GRC: { status: 'war' } }), before = JSON.stringify(w.countries.TUR.diplomacy);
    capitalPins(inputFor(w, { zoom: 3 }));
    expect(JSON.stringify(w.countries.TUR.diplomacy)).toBe(before);
  });
});

describe('map desk translations', () => {
  it('every map desk label translates in all four non-English languages', () => {
    for (const [key, values] of Object.entries(UI_CATALOG_0917)) {
      expect(values).toHaveLength(4);
      for (const [i, lang] of ['tr', 'es', 'zh', 'ru'].entries()) {
        expect(values[i].trim()).not.toBe('');
        expect(translateText(lang, key)).toBe(key === key.toUpperCase() ? values[i].toLocaleUpperCase(lang) : values[i]);
      }
    }
  });
  it('keeps the proper noun Natural Earth in every language and has no artefacts', () => {
    for (const value of UI_CATALOG_0917['Shaded relief: Natural Earth (public domain)']) expect(value).toContain('Natural Earth');
    for (const values of Object.values(UI_CATALOG_0917)) for (const value of values) expect(/\{\\f|&(?:amp|quot|lt|gt|apos|#\d+);/.test(value)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { GameState, WarState } from '../domain/game';
import { executeCommandResult } from '../engine/commands';
import { living, processLetters, withLiving } from '../engine/systems/livingEconomy';
import { embassyFor, relationFor } from '../engine/systems/diplomacy';
import { CURRENT_SCHEMA_VERSION } from '../persistence/migrations';
import { UI_CATALOG_0916 } from '../i18n/uiCatalog0916';
import { translateText } from '../i18n/localeText';
import { countdown, deskCounts, deskNews, deskOffers, deskOperations, deskTabForCategory, deskWars, newsCategory } from '../ui/panels/executiveDeskModel';

/** A foreign proposal as the engine creates it (diplomaticOffers), folded into a letter by the real processLetters step. */
function withOffer(s: GameState, senderId: string, type: 'embassy' | 'trade_pact', expiresIn: number): GameState {
  const offer = { id: `OFFER-${type}-${senderId}-${s.day}`, type, senderId, receiverId: s.playerCountryId, createdDay: s.day, expiresDay: s.day + expiresIn, message: `${s.countries[senderId].name} proposes cooperation.` };
  return processLetters({ ...s, diplomaticOffers: [...s.diplomaticOffers, offer] });
}
function rich(): GameState {
  const s = makeInitialState(), p = s.countries[s.playerCountryId];
  s.countries[p.id] = { ...p, economy: { ...p.economy, treasury: 500 } };
  return s;
}
const later = (s: GameState, days: number): GameState => ({ ...s, day: s.day + days });

describe('Phase 6.2 desk proposals come from the engine letters', () => {
  it('an incoming offer appears with its countdown and typed accept/decline commands', () => {
    const s = withOffer(rich(), 'GRC', 'trade_pact', 24);
    expect(s.diplomaticOffers).toEqual([]);
    const [offer] = deskOffers(s);
    expect(offer).toMatchObject({ kind: 'trade_pact', senderId: 'GRC', countdown: { daysLeft: 24, urgent: false, lastDay: false } });
    expect(offer.accept).toEqual({ type: 'diplomacy/resolveLetter', id: offer.id, accept: true });
    expect(offer.decline).toEqual({ type: 'diplomacy/resolveLetter', id: offer.id, accept: false });
    expect(deskCounts(s).diplomacy).toBe(1);
  });
  it('counts down, turns urgent at three days, shows the last day and disappears once the engine expires it', () => {
    const s = withOffer(rich(), 'GRC', 'embassy', 10);
    expect(deskOffers(later(s, 6))[0].countdown).toEqual({ daysLeft: 4, urgent: false, lastDay: false });
    expect(deskOffers(later(s, 7))[0].countdown).toEqual({ daysLeft: 3, urgent: true, lastDay: false });
    expect(deskOffers(later(s, 10))[0].countdown).toEqual({ daysLeft: 0, urgent: true, lastDay: true });
    const expired = processLetters(later(s, 11));
    expect(deskOffers(expired)).toEqual([]);
    expect(living(expired).letters.find((x) => x.senderId === 'GRC')?.status).toBe('expired');
  });
  it('lists the soonest deadline first', () => {
    let s = withOffer(rich(), 'GRC', 'embassy', 20);
    s = withOffer(s, 'BRA', 'trade_pact', 5);
    expect(deskOffers(s).map((o) => o.senderId)).toEqual(['BRA', 'GRC']);
  });
  it('accepting through the typed command opens the agreement and clears the card', () => {
    const s = withOffer(rich(), 'BRA', 'embassy', 24), [offer] = deskOffers(s);
    expect(embassyFor(s, s.playerCountryId, 'BRA')).toBeNull();
    const result = executeCommandResult(s, offer.accept);
    expect(result.status).toBe('applied');
    expect(embassyFor(result.state, s.playerCountryId, 'BRA')).not.toBeNull();
    expect(living(result.state).letters.find((x) => x.id === offer.id)?.status).toBe('accepted');
    expect(deskOffers(result.state)).toEqual([]);
  });
  it('declining is free and closes the proposal', () => {
    const s = withOffer(rich(), 'GRC', 'trade_pact', 24), [offer] = deskOffers(s);
    const result = executeCommandResult(s, offer.decline);
    expect(result.state.countries[s.playerCountryId].economy.treasury).toBe(s.countries[s.playerCountryId].economy.treasury);
    expect(relationFor(result.state.countries[s.playerCountryId], 'GRC').treaties).not.toContain('trade');
    expect(living(result.state).letters.find((x) => x.id === offer.id)?.status).toBe('rejected');
    expect(deskOffers(result.state)).toEqual([]);
  });
  it('shows the shared fee and whether both sides can pay it', () => {
    const s = withOffer(rich(), 'GRC', 'embassy', 24), [offer] = deskOffers(s);
    expect(offer.playerShareB).toBeGreaterThan(0);
    expect(offer.affordable).toBe(true);
    const p = s.countries[s.playerCountryId];
    const poor = { ...s, countries: { ...s.countries, [p.id]: { ...p, economy: { ...p.economy, treasury: offer.playerShareB / 2 } } } };
    expect(deskOffers(poor)[0].affordable).toBe(false);
  });
  it('ignores outgoing letters, closures and letters for other countries', () => {
    const s = rich(), l = living(s);
    const base = { sentDay: s.day, replyDay: s.day + 3, expiresDay: s.day + 20, status: 'pending' as const, years: 1 as const, message: 'x', read: false };
    const next = withLiving(s, { ...l, letters: [
      { ...base, id: 'out', kind: 'embassy', senderId: s.playerCountryId, receiverId: 'GRC', incoming: false },
      { ...base, id: 'closure', kind: 'closure', senderId: 'GRC', receiverId: s.playerCountryId, incoming: true },
      { ...base, id: 'other', kind: 'embassy', senderId: 'GRC', receiverId: 'BRA', incoming: true },
      ...l.letters,
    ] });
    expect(deskOffers(next)).toEqual([]);
  });
});

describe('Phase 6.2 desk wars, operations and news', () => {
  const war = (attackerId: string, defenderId: string, progress: number, startedDay = 5): WarState => ({ id: `war-${attackerId}-${defenderId}`, attackerId, defenderId, progress, rounds: 3, startedDay, status: 'active' } as WarState);
  it('reports each of the player\'s wars, oldest first, with the front from the player\'s side', () => {
    const s = rich(), id = s.playerCountryId;
    const withWars = { ...s, wars: { a: war(id, 'GRC', 12), b: war('SYR', id, 30, 9), c: war('GRC', 'BRA', 50) } };
    expect(deskWars(withWars)).toEqual([
      expect.objectContaining({ enemyId: 'GRC', defending: false, front: 12 }),
      expect.objectContaining({ enemyId: 'SYR', defending: true, front: -30 }),
    ]);
    expect(deskCounts(withWars).war).toBe(2);
  });
  it('lists running operations with the days until their result', () => {
    const s = rich();
    const launched = executeCommandResult(s, { type: 'intelligence/launch', operationType: 'gather_intelligence', targetCountryId: 'GRC' }).state;
    const [op] = deskOperations(launched);
    expect(op).toMatchObject({ type: 'gather_intelligence', targetId: 'GRC', countdown: { daysLeft: 5 } });
    expect(deskOperations(later(launched, 5))[0].countdown.lastDay).toBe(true);
  });
  it('parses news categories and sends each to one tab', () => {
    expect(newsCategory('WAR // Front holds.')).toEqual(['WAR', 'Front holds.']);
    expect(newsCategory('DIPLOMATIC OFFER // Greece: Trade pact proposal received.')).toEqual(['DIPLOMATIC OFFER', 'Greece: Trade pact proposal received.']);
    expect(newsCategory('No category here')).toBeNull();
    expect(deskTabForCategory('DIPLOMATIC OFFER')).toBe('diplomacy');
    expect(deskTabForCategory('ALLIANCE')).toBe('war');
    expect(deskTabForCategory('REGIME')).toBe('intel');
    expect(deskTabForCategory('AI TRADE')).toBeNull();
  });
  it('keeps the desk about the player: AI-to-AI treaties and foreign elections stay in the News window', () => {
    const s = rich(), name = s.countries[s.playerCountryId].name;
    const journal = [
      { id: 'n1', day: 9, kind: 'world' as const, message: 'DIPLOMACY // Afghanistan and Iran signed a trade pact.' },
      { id: 'n2', day: 9, kind: 'world' as const, message: `DIPLOMACY // Greece improved relations with ${name}.` },
      { id: 'n3', day: 8, kind: 'command' as const, message: 'DIPLOMACY // Delegation departed for France.' },
      { id: 'n4', day: 8, kind: 'world' as const, message: 'ELECTION // Serbia government re-elected.' },
      { id: 'n5', day: 7, kind: 'world' as const, message: 'DIPLOMATIC OFFER // Greece: Trade pact proposal received.' },
      { id: 'n6', day: 7, kind: 'world' as const, message: 'WAR // Greece declared war on Bulgaria.' },
      { id: 'n7', day: 6, kind: 'world' as const, message: 'INTEL // GATHER INTELLIGENCE launched against France.' },
    ];
    const withNews = { ...s, sitrep: [], world: { ...s.world, journal } };
    expect(deskNews(withNews, 'diplomacy').map((n) => n.id)).toEqual(['n2', 'n3', 'n5']);
    expect(deskNews(withNews, 'war').map((n) => n.id)).toEqual(['n6']);
    expect(deskNews(withNews, 'intel').map((n) => n.id)).toEqual(['n7']);
  });
  it('shows at most twelve reports per tab', () => {
    const s = rich();
    const journal = Array.from({ length: 20 }, (_, i) => ({ id: `w${i}`, day: 20 - i, kind: 'world' as const, message: `WAR // Report ${i}.` }));
    expect(deskNews({ ...s, sitrep: [], world: { ...s.world, journal } }, 'war')).toHaveLength(12);
  });
});

describe('Phase 6.2 desk stays read-only and translated', () => {
  it('building the desk never mutates state or the save schema', () => {
    const s = withOffer(rich(), 'GRC', 'trade_pact', 24), snapshot = JSON.stringify(s);
    deskOffers(s); deskWars(s); deskOperations(s); deskCounts(s); for (const tab of ['diplomacy', 'war', 'intel'] as const) deskNews(s, tab);
    expect(JSON.stringify(s)).toBe(snapshot);
    expect(s.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(CURRENT_SCHEMA_VERSION).toBe(17);
  });
  it('countdown never goes below zero', () => {
    expect(countdown(10, 14)).toEqual({ daysLeft: 0, urgent: true, lastDay: true });
  });
  it('every desk label translates in all four non-English languages, including the countdown templates', () => {
    for (const [key, values] of Object.entries(UI_CATALOG_0916)) {
      if (key.includes('{0}')) continue;
      for (const [i, lang] of ['tr', 'es', 'zh', 'ru'].entries()) expect(translateText(lang, key)).toBe(key === key.toUpperCase() ? values[i].toLocaleUpperCase(lang) : values[i]);
    }
    expect(translateText('tr', 'Time left: 17 days')).toBe('Kalan süre: 17 gün');
    expect(translateText('es', 'Result in 4 days')).toBe('Resultado en 4 días');
    expect(translateText('tr', 'Greece: Trade pact proposal received.')).toBe('Yunanistan: Ticaret paktı teklifi alındı.');
  });
});

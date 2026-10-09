import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { ALL_EVENT_KINDS, EVENT_CATALOGUE, EVENT_DEFINITIONS, EVENT_FLAGS } from '../data/events';
import type { ActiveGameEvent, CountryState, EventKind, GameState } from '../domain/game';
import { applyGameCommand } from '../engine/commands';
import { tickGame } from '../engine/tick';
import { agendaCandidates, buildEventContext, eventOptionCostB, eventOptionHint, maybeTriggerEvent, resolveEvent } from '../engine/systems/events';
import { ADVISOR_GLOBAL_GAP_DAYS } from '../engine/systems/advisorPacing';
import { maybeCreateResourceAdvisor, dismissAdvisor } from '../engine/systems/advisor';
import { dismissAdvice, processWellbeing } from '../engine/systems/livingEconomy';
import { campaignVictoryProgress, continueAfterVictory, DIPLOMATIC_MIN_REPUTATION, ECONOMIC_GDP_GROWTH, MANDATE_DAYS, processCampaignVictory, VICTORY_EARLIEST_DAY, VICTORY_HOLD_DAYS } from '../engine/systems/campaignVictory';
import { relationFor } from '../engine/systems/diplomacy';
import { snapshotGame } from '../persistence/snapshot';
import { migrateSave } from '../persistence/migrations';
import { UI_CATALOG_088_F } from '../i18n/uiCatalog088F';

const OLD_KINDS: EventKind[] = ['food_crisis', 'inflation_shock', 'war_weariness', 'corruption_scandal', 'fuel_crisis', 'intelligence_breach', 'earthquake', 'health_crisis', 'tax_protest', 'reform_demand', 'foreign_policy_backlash'];
const withCountry = (s: GameState, c: CountryState): GameState => ({ ...s, countries: { ...s.countries, [c.id]: c } });
const withPlayer = (s: GameState, patch: (p: CountryState) => CountryState) => withCountry(s, patch(s.countries[s.playerCountryId]));
const player = (s: GameState) => s.countries[s.playerCountryId];

/** An activeEvent exactly as a 0.84–0.87 save stores it (fixed English hint, no subject). */
function legacyEvent(kind: EventKind, day: number): ActiveGameEvent {
  const d = EVENT_CATALOGUE[kind];
  return { id: `${kind}-${day}`, kind, title: d.title, description: d.description, triggeredDay: day, options: d.options.map((o) => ({ id: o.id, label: o.label, consequenceHint: 'legacy hint' })) };
}

/** Clears whatever would pause the clock; events take their first affordable option. */
function acknowledge(state: GameState): GameState {
  let s = state;
  if (s.activeEvent) { const ev = s.activeEvent; for (const o of ev.options) { s = resolveEvent(s, o.id); if (!s.activeEvent) break; } }
  if (s.activeAdvisor) s = dismissAdvisor(s);
  const living = s.world.living;
  if (living?.advice.active) s = dismissAdvice(s, living.advice.active);
  if (s.world.living?.notice) s = { ...s, world: { ...s.world, living: { ...s.world.living, notice: undefined } } };
  return { ...s, world: { ...s.world, tutorial: { ...s.world.tutorial, active: false } } };
}

describe('0.88 audit E3: event catalogue', () => {
  it('defines every kind once with 2–3 options and translated text for each new kind', () => {
    expect(EVENT_DEFINITIONS.map((d) => d.kind).sort()).toEqual([...ALL_EVENT_KINDS].sort());
    const fresh = EVENT_DEFINITIONS.filter((d) => !OLD_KINDS.includes(d.kind));
    expect(fresh.length).toBeGreaterThanOrEqual(15);
    expect(new Set(fresh.map((d) => d.category)).size).toBeGreaterThanOrEqual(7);
    for (const d of EVENT_DEFINITIONS) {
      expect(d.options.length).toBeGreaterThanOrEqual(2);
      expect(d.options.length).toBeLessThanOrEqual(3);
      expect(new Set(d.options.map((o) => o.id)).size).toBe(d.options.length);
    }
    const catalog = new Set(Object.keys(UI_CATALOG_088_F));
    const missing = fresh.flatMap((d) => [d.title, d.description, ...d.options.flatMap((o) => [o.label, o.summary])]).filter((text) => !catalog.has(text));
    expect(missing).toEqual([]);
    for (const values of Object.values(UI_CATALOG_088_F)) { expect(values).toHaveLength(4); for (const v of values) expect(v.trim().length).toBeGreaterThan(0); }
  });

  it('every kind from an older save still resolves with its saved option ids', () => {
    for (const kind of OLD_KINDS) {
      for (const option of EVENT_CATALOGUE[kind].options) {
        const s = { ...makeInitialState(), day: 50, activeEvent: legacyEvent(kind, 49) };
        const next = resolveEvent(s, option.id);
        expect(next.activeEvent, `${kind}/${option.id}`).toBeNull();
        expect(next.sitrep[0]).toBe(`EVENT RESOLVED // ${option.summary}`);
      }
    }
    // 0.84 effects are preserved, e.g. tax relief and food imports.
    const tax = resolveEvent({ ...makeInitialState(), day: 50, activeEvent: legacyEvent('tax_protest', 49) }, 'tax_relief');
    expect(player(tax).economy.taxRate).toBe(makeInitialState().countries.TUR.economy.taxRate - 3);
    const food = resolveEvent({ ...makeInitialState(), day: 50, activeEvent: legacyEvent('food_crisis', 49) }, 'imports');
    expect(player(food).resources.food).toBe(makeInitialState().countries.TUR.resources.food + 120);
  });

  it('scales money with GDP in both the hint and the charge', () => {
    const s = makeInitialState();
    const micro = Object.values(s.countries).filter((c) => !c.annexedBy).sort((a, b) => a.economy.gdp - b.economy.gdp)[0];
    const effects = EVENT_CATALOGUE.earthquake.options[0].effects;
    expect(eventOptionCostB(s.countries.TUR, effects)).toBeCloseTo(8, 0);
    expect(eventOptionCostB(micro, effects)).toBeLessThan(1);
    expect(eventOptionHint(s.countries.TUR, effects)).toBe('-$8B, Approval +3, Stability +2');
    const microState = { ...s, playerCountryId: micro.id, day: 50, activeEvent: legacyEvent('earthquake', 49) };
    const paid = micro.economy.treasury - resolveEvent(microState, 'disaster_relief').countries[micro.id].economy.treasury;
    expect(paid).toBeCloseTo(eventOptionCostB(micro, effects), 6);
    expect(eventOptionHint(s.countries.TUR, EVENT_CATALOGUE.export_boom.options[0].effects)).toBe('+$5B');
  });

  it('runs the investigation → findings → trial chain through flags', () => {
    let s: GameState = { ...makeInitialState(), day: 100, activeEvent: legacyEvent('corruption_scandal', 100) };
    s = resolveEvent(s, 'investigate');
    expect(player(s).eventFlags?.[EVENT_FLAGS.investigation]).toBe(100);
    const kindsAt = (day: number, st: GameState) => agendaCandidates(buildEventContext({ ...st, day }, player(st))).map((c) => c.kind);
    expect(kindsAt(120, s)).not.toContain('investigation_findings');
    expect(kindsAt(120, s)).not.toContain('corruption_scandal');
    expect(kindsAt(130, s)).toContain('investigation_findings');
    s = resolveEvent({ ...s, day: 130, activeEvent: { ...legacyEvent('investigation_findings', 130) } }, 'publish_findings');
    expect(player(s).eventFlags?.[EVENT_FLAGS.investigation]).toBeUndefined();
    expect(kindsAt(170, s)).not.toContain('corruption_trial');
    expect(kindsAt(175, s)).toContain('corruption_trial');
    s = resolveEvent({ ...s, day: 175, activeEvent: legacyEvent('corruption_trial', 175) }, 'full_trial');
    expect(player(s).eventFlags ?? {}).toEqual({});
  });

  it('every chain flag that an option sets is read by a later event', () => {
    const set = new Set(EVENT_DEFINITIONS.flatMap((d) => d.options.flatMap((o) => o.effects.setFlags ?? [])));
    expect(set.size).toBeGreaterThanOrEqual(3);
    for (const flag of set) {
      const followUp = EVENT_DEFINITIONS.find((d) => d.options.some((o) => o.effects.clearFlags?.includes(flag)));
      expect(followUp, flag).toBeDefined();
    }
  });

  it('names the subject country and changes relations with it', () => {
    const base = makeInitialState();
    const rivalId = Object.keys(base.countries).find((id) => id !== 'TUR' && !base.countries[id].annexedBy)!;
    const s0 = withPlayer({ ...base, day: 70 }, (p) => ({ ...p, diplomacy: { ...p.diplomacy, relations: { ...p.diplomacy.relations, [rivalId]: { ...relationFor(p, rivalId), score: -70, status: 'hostile' } } } }));
    const candidate = agendaCandidates(buildEventContext(s0, player(s0))).find((c) => c.kind === 'border_incident');
    expect(candidate?.subject).toBe(rivalId);
    const event: ActiveGameEvent = { ...legacyEvent('border_incident', 70), description: EVENT_CATALOGUE.border_incident.description.replace('{0}', base.countries[rivalId].name), subjectCountryId: rivalId };
    const next = resolveEvent({ ...s0, activeEvent: event }, 'de_escalate');
    expect(relationFor(player(next), rivalId).score).toBeGreaterThan(-70);
  });

  it('is deterministic and threads the seed', () => {
    const s = { ...makeInitialState(), day: 28, eventCooldownUntil: 0 };
    expect(maybeTriggerEvent(s)).toEqual(maybeTriggerEvent(s));
    expect(maybeTriggerEvent(s).simulationSeed).not.toBe(s.simulationSeed);
  });

  it('a resolved event of an unknown kind is cleared without effects', () => {
    const s = { ...makeInitialState(), day: 50, activeEvent: { ...legacyEvent('earthquake', 49), kind: 'retired_kind' as EventKind } };
    const next = resolveEvent(s, 'disaster_relief');
    expect(next.activeEvent).toBeNull();
    expect(player(next).economy.treasury).toBe(player(s).economy.treasury);
  });
});

describe('0.88 audit E3: advisor pacing', () => {
  it('contextual advice waits for the shared gap after a resource advisor pop-up', () => {
    let s = processWellbeing({ ...makeInitialState(), day: 10, world: { ...makeInitialState().world, tutorial: { active: false, step: 0, completed: true } } });
    s = withPlayer(s, (p) => ({ ...p, politics: { ...p.politics, approval: 20 } }));
    // A resource advisor was shown on day 10.
    s = { ...s, world: { ...s.world, living: { ...s.world.living!, advice: { ...s.world.living!.advice, lastPopupDay: 10 } } } };
    expect(processWellbeing({ ...s, day: 10 + ADVISOR_GLOBAL_GAP_DAYS - 1 }).world.living?.advice.active).toBeNull();
    expect(processWellbeing({ ...s, day: 10 + ADVISOR_GLOBAL_GAP_DAYS }).world.living?.advice.active).toBe('approval');
  });

  it('the resource advisor respects the gap and records its own pop-up', () => {
    const base = processWellbeing({ ...makeInitialState(), day: 10, world: { ...makeInitialState().world, tutorial: { active: false, step: 0, completed: true } } });
    const s = withPlayer({ ...base, day: 40, advisorCooldownUntil: 0 }, (p) => ({ ...p, resources: { ...p.resources, food: 1, oil: 1, iron: 1, uranium: 0 } }));
    const blocked = { ...s, world: { ...s.world, living: { ...s.world.living!, advice: { ...s.world.living!.advice, lastPopupDay: 30 } } } };
    expect(maybeCreateResourceAdvisor(blocked).activeAdvisor).toBeNull();
    const shown = maybeCreateResourceAdvisor(s);
    if (shown.activeAdvisor) expect(shown.world.living?.advice.lastPopupDay).toBe(40);
  });

  it('a headless year has 4–12 events (0.87: 4) and at most 13 advisor pop-ups', () => {
    let s = makeInitialState();
    let events = 0, advisors = 0;
    for (let day = 0; day < 365; day++) {
      s = acknowledge(s);
      const before = s;
      s = tickGame(s);
      if (s.activeEvent && !before.activeEvent) events++;
      if (s.activeAdvisor && !before.activeAdvisor) advisors++;
      if (s.world.living?.advice.active && !before.world.living?.advice.active) advisors++;
    }
    expect(events).toBeGreaterThanOrEqual(4);
    expect(events).toBeLessThanOrEqual(12);
    expect(advisors).toBeLessThanOrEqual(13);
  }, 120_000);
});

describe('0.88 audit E4: campaign victory', () => {
  const tracked = (s: GameState) => processCampaignVictory(s);

  it('counts won elections and grants the mandate victory on the second', () => {
    let s = tracked({ ...makeInitialState(), day: 1000 });
    expect(s.world.campaign?.reelections).toBe(0);
    const reelect = (st: GameState) => tracked(withPlayer({ ...st, day: st.day + 1 }, (p) => ({ ...p, politics: { ...p.politics, electionDaysRemaining: 1460 } })));
    const countdown = (st: GameState) => tracked(withPlayer({ ...st, day: st.day + 1 }, (p) => ({ ...p, politics: { ...p.politics, electionDaysRemaining: 0 } })));
    s = reelect(countdown(s));
    expect(s.world.campaign?.reelections).toBe(1);
    expect(s.campaignStatus).toBe('active');
    s = reelect(countdown(s));
    expect(s.campaignStatus).toBe('won');
    expect(s.world.campaign?.achieved?.path).toBe('mandate');
    expect(s.speed).toBe(0);
    expect(tickGame(s).day).toBe(s.day);
  });

  it('non-democracies win the mandate after eight years with stability', () => {
    const base = makeInitialState();
    const autocracy = Object.values(base.countries).find((c) => !['democracy', 'republic'].includes(c.politics.regime))!;
    let s = tracked({ ...base, playerCountryId: autocracy.id, day: 1 });
    s = withPlayer({ ...s, day: 1 + MANDATE_DAYS }, (p) => ({ ...p, politics: { ...p.politics, stability: 40 } }));
    expect(tracked(s).campaignStatus).toBe('active');
    s = withPlayer(s, (p) => ({ ...p, politics: { ...p.politics, stability: 70 } }));
    expect(tracked(s).world.campaign?.achieved?.path).toBe('mandate');
  });

  it('economic leadership needs growth, approval and low inflation held for the full period', () => {
    let s = tracked({ ...makeInitialState(), day: 2 });
    const grow = (st: GameState) => withPlayer(st, (p) => ({ ...p, economy: { ...p.economy, gdp: 1300 * ECONOMIC_GDP_GROWTH + 1, inflation: 5 }, politics: { ...p.politics, approval: 60 } }));
    s = tracked(grow({ ...s, day: VICTORY_EARLIEST_DAY }));
    expect(s.world.campaign?.holdingSince.economic).toBe(VICTORY_EARLIEST_DAY);
    s = tracked(grow({ ...s, day: VICTORY_EARLIEST_DAY + VICTORY_HOLD_DAYS - 1 }));
    expect(s.campaignStatus).toBe('active');
    // A break resets the hold.
    const broken = tracked(withPlayer({ ...s, day: s.day + 1 }, (p) => ({ ...p, economy: { ...p.economy, inflation: 14 } })));
    expect(broken.world.campaign?.holdingSince.economic).toBeUndefined();
    s = tracked(grow({ ...s, day: VICTORY_EARLIEST_DAY + VICTORY_HOLD_DAYS }));
    expect(s.campaignStatus).toBe('won');
    expect(s.world.campaign?.achieved?.path).toBe('economic');
  });

  it('regional leadership counts alliances and requires reputation and peace', () => {
    const base = tracked({ ...makeInitialState(), day: 2 });
    const ids = Object.keys(base.countries).filter((id) => id !== 'TUR').slice(0, 4);
    const allied = withPlayer(base, (p) => ({ ...p, diplomacy: { reputation: DIPLOMATIC_MIN_REPUTATION, relations: { ...p.diplomacy.relations, ...Object.fromEntries(ids.map((id) => [id, { ...relationFor(p, id), score: 70, status: 'ally' as const, treaties: ['alliance' as const] }])) } } }));
    let s = tracked({ ...allied, day: 800 });
    const diplomatic = campaignVictoryProgress(s).find((p) => p.path === 'diplomatic')!;
    expect(diplomatic.requirements.every((r) => r.met)).toBe(true);
    s = tracked({ ...s, day: 800 + VICTORY_HOLD_DAYS });
    expect(s.world.campaign?.achieved?.path).toBe('diplomatic');
  });

  it('nothing is won in the first two years and progress is exposed for every path', () => {
    const s = tracked({ ...makeInitialState(), day: 10 });
    const progress = campaignVictoryProgress(s);
    expect(progress.map((p) => p.path)).toEqual(['mandate', 'economic', 'diplomatic']);
    for (const p of progress) { expect(p.progress).toBeGreaterThanOrEqual(0); expect(p.progress).toBeLessThan(1); expect(UI_CATALOG_088_F[p.title]).toBeDefined(); expect(UI_CATALOG_088_F[p.summary]).toBeDefined(); for (const r of p.requirements) expect(UI_CATALOG_088_F[r.label] ?? UI_CATALOG_088_F[r.label.replace(/^\w/, (c) => c.toUpperCase())]).toBeDefined(); }
  });

  it('the player can continue in sandbox mode without winning again', () => {
    let s = tracked({ ...makeInitialState(), day: 1000 });
    s = { ...s, world: { ...s.world, campaign: { ...s.world.campaign!, reelections: 2 } } };
    s = tracked({ ...s, day: 1001 });
    expect(s.campaignStatus).toBe('won');
    const continued = applyGameCommand(s, { type: 'campaign/continue' });
    expect(continued.campaignStatus).toBe('active');
    expect(continued.world.campaign?.sandbox).toBe(true);
    const later = tickGame(continued);
    expect(later.day).toBe(continued.day + 1);
    expect(later.campaignStatus).toBe('active');
    expect(continueAfterVictory(makeInitialState())).toEqual(makeInitialState());
  });

  it('won saves and saves without the new fields both load', () => {
    let s = tracked({ ...makeInitialState(), day: 1000 });
    s = tracked({ ...s, day: 1001, world: { ...s.world, campaign: { ...s.world.campaign!, reelections: 2 } } });
    expect(s.campaignStatus).toBe('won');
    expect(migrateSave(snapshotGame(s))?.campaignStatus).toBe('won');
    const legacy = snapshotGame({ ...makeInitialState(), day: 40, activeEvent: legacyEvent('earthquake', 39) });
    delete (legacy.world as { campaign?: unknown }).campaign;
    const loaded = migrateSave(legacy);
    expect(loaded?.activeEvent?.kind).toBe('earthquake');
    expect(resolveEvent(loaded!, 'local_response').activeEvent).toBeNull();
  });
});

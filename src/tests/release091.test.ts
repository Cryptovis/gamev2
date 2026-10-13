import { describe, expect, it } from 'vitest';
import { version } from '../../package.json';
import { makeInitialState } from '../data/initialState';
import { getWarPreview } from '../engine/systems/warfare';
import { warDeclarationStatus } from '../engine/systems/warRules';
import { ALERT_STATUS_TITLE, commandAlerts, sentenceCase, strategicObjectives } from '../store/commandIntelligence';
import { airBadgeFor, dossierView, outlookFor, ratioShare, warPlanningView } from '../ui/panels/targetBriefing';
import { UI_CATALOG_0920 } from '../i18n/uiCatalog0920';
import { translateText } from '../i18n/localeText';
import { FEATURE_TOUR } from '../ui/panels/CampaignTutorial';
import { CURRENT_SCHEMA_VERSION } from '../persistence/migrations';

const sourcePaths = Object.keys(import.meta.glob(['../**/*.ts', '../**/*.tsx', '../**/*.css', '../**/*.json']));

describe('0.91.0 macOS case collision (Task 0)', () => {
  it('no two source files differ only by letter case, so APFS checkouts compile', () => {
    expect(sourcePaths.length).toBeGreaterThan(100);
    const seen = new Map<string, string>();
    for (const path of sourcePaths) {
      const key = path.toLowerCase();
      expect(seen.get(key), `${path} collides with ${seen.get(key)}`).toBeUndefined();
      seen.set(key, path);
    }
  });
  it('ExecutiveDesk.tsx and its model live in different files', () => {
    expect(sourcePaths).toContain('../ui/panels/ExecutiveDesk.tsx');
    expect(sourcePaths).toContain('../ui/panels/executiveDeskModel.ts');
    expect(sourcePaths).not.toContain('../ui/panels/executiveDesk.ts');
  });
});

describe('0.91.0 release', () => {
  it('is version 0.91.0 on schema 17', () => {
    expect(version).toBe('0.91.0');
    expect(CURRENT_SCHEMA_VERSION).toBe(17);
  });
});

describe('0.91.0 war planning view', () => {
  const state = makeInitialState();
  const target = Object.values(state.countries).find((c) => c.id !== state.playerCountryId)!;
  it('reads the engine preview and eligibility without recomputing them', () => {
    const view = warPlanningView(state, target.id)!;
    const player = state.countries[state.playerCountryId];
    const preview = getWarPreview(player, target, state.infrastructure[player.id], state.infrastructure[target.id]);
    expect(view.powerRatio).toBe(preview.powerRatio);
    expect(view.ourSupply).toBe(preview.attackerSupply);
    expect(view.enemySupply).toBe(preview.defenderSupply);
    expect(view.airSuperiority).toBe(preview.airSuperiority);
    expect(view.allowed).toBe(warDeclarationStatus(state, player.id, target.id).allowed);
    expect(view.allowed || typeof view.reason === 'string').toBe(true);
    expect(view.ourShare).toBeGreaterThanOrEqual(4);
    expect(view.ourShare).toBeLessThanOrEqual(96);
  });
  it('is null for the player and for unknown countries', () => {
    expect(warPlanningView(state, state.playerCountryId)).toBeNull();
    expect(warPlanningView(state, 'NOPE')).toBeNull();
  });
  it('presentation bands', () => {
    expect(outlookFor(1.25)).toBe('favourable');
    expect(outlookFor(1)).toBe('balanced');
    expect(outlookFor(0.79)).toBe('unfavourable');
    expect(airBadgeFor(15)).toBe('superiority');
    expect(airBadgeFor(0)).toBe('contested');
    expect(airBadgeFor(-15)).toBe('inferiority');
    expect(ratioShare(1)).toBe(50);
    expect(ratioShare(0)).toBe(4);
    expect(ratioShare(Infinity)).toBe(4);
    expect(ratioShare(10_000)).toBe(96);
  });
});

describe('0.91.0 dossier view', () => {
  it('gives finite figures for any country', () => {
    const state = makeInitialState();
    for (const id of Object.keys(state.countries).slice(0, 40)) {
      const v = dossierView(state, id)!;
      for (const [key, value] of Object.entries(v)) if (typeof value === 'number') expect(Number.isFinite(value), `${id}.${key}`).toBe(true);
    }
    expect(dossierView(state, 'NOPE')).toBeNull();
  });
});

describe('0.91.0 help briefing and alert wording', () => {
  it('lists the six campaign goals in the original order and marks Day 30', () => {
    const state = makeInitialState();
    const goals = strategicObjectives(state);
    expect(goals.map((g) => g.label)).toEqual(['Establish a player trade flow', 'Resolve a covert operation', 'Unlock a technology', 'Join or form an alliance bloc', 'Execute a combat round', 'Reach Day 30']);
    expect(goals[5].done).toBe(state.day >= 30);
    expect(strategicObjectives({ ...state, day: 30 })[5].done).toBe(true);
  });
  it('writes "Oil · Import Needed", not "oil · IMPORT NEED"', () => {
    expect(ALERT_STATUS_TITLE['IMPORT NEED']).toBe('Import Needed');
    expect(sentenceCase('oil')).toBe('Oil');
    expect(sentenceCase('petrol', 'tr')).toBe('Petrol');
  });
  it('alerts keep the engine status string the wording maps from', () => {
    for (const a of commandAlerts(makeInitialState())) if (a.resource) expect(['IMPORT NEED', 'CRITICAL']).toContain(a.title);
  });
});

describe('0.91.0 feature tour', () => {
  it('has four steps, each with a title, a body and a translation', () => {
    expect(FEATURE_TOUR).toHaveLength(4);
    for (const [title, body] of FEATURE_TOUR) for (const key of [title, body]) expect(translateText('tr', key)).not.toBe(key);
  });
});

describe('0.91.0 translations', () => {
  it('every label translates in all four non-English languages', () => {
    for (const [key, values] of Object.entries(UI_CATALOG_0920)) {
      expect(values).toHaveLength(4);
      for (const [i, lang] of ['tr', 'es', 'zh', 'ru'].entries()) {
        expect(values[i].trim()).not.toBe('');
        expect(translateText(lang, key)).toBe(values[i]);
      }
    }
  });
  it('keeps placeholders and has no artefacts', () => {
    for (const [key, values] of Object.entries(UI_CATALOG_0920)) for (const value of values) {
      for (const slot of key.match(/\{\d\}/g) ?? []) expect(value).toContain(slot);
      expect(/\{\\f|&(?:amp|quot|lt|gt|apos|#\d+);/.test(value)).toBe(false);
    }
  });
});

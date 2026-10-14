import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { GameState } from '../domain/game';
import { executeCommandResult } from '../engine/commands';
import { relationFor, relationshipIndex, relationshipStance } from '../engine/systems/diplomacy';
import { agreementEligibility } from '../engine/systems/treaties';
import { diplomaticMissionStatus } from '../engine/systems/policyPressure';
import { CAPITAL_POSITIONS } from '../data/capitalPositions';
import { CAPITAL_NAMES, capitalName } from '../data/capitalNames';
import { CURRENT_SCHEMA_VERSION } from '../persistence/migrations';
import { UI_CATALOG_0915 } from '../i18n/uiCatalog0915';
import { translateText } from '../i18n/localeText';
import { targetHubActions, targetHubSummary, workspaceForSelection, type HubActionId } from '../ui/panels/targetCountryHub';

const TARGET = 'FRA';
const ORDER: HubActionId[] = ['embassy', 'trade', 'nonAggression', 'alliance', 'embargo', 'aid', 'mission', 'espionage'];
function richState(): GameState {
  const s = makeInitialState();
  const player = s.countries[s.playerCountryId];
  s.countries[player.id] = { ...player, economy: { ...player.economy, treasury: 500 } };
  return s;
}
function atWar(s: GameState): GameState {
  const p = s.countries[s.playerCountryId], t = s.countries[TARGET];
  const rel = (from: typeof p, to: string) => ({ ...from.diplomacy.relations, [to]: { ...relationFor(from, to), status: 'war' as const, score: -80 } });
  return { ...s, countries: { ...s.countries, [p.id]: { ...p, diplomacy: { ...p.diplomacy, relations: rel(p, TARGET) } }, [TARGET]: { ...t, diplomacy: { ...t.diplomacy, relations: rel(t, p.id) } } } };
}

describe('Phase 6.1 hub routing', () => {
  const base = { playerCountryId: 'TUR', selectedCountryId: 'FRA', navigation: null };
  it('a foreign country opens the hub; the player nation keeps the full panel', () => {
    expect(workspaceForSelection(base, 'FRA', null)).toBe('hub');
    expect(workspaceForSelection({ ...base, selectedCountryId: 'TUR' }, 'TUR', null)).toBe('panel');
    expect(workspaceForSelection(base, null, null)).toBe('none');
  });
  it('Full Dossier opens the panel for that country only', () => {
    expect(workspaceForSelection(base, 'FRA', 'FRA')).toBe('panel');
    expect(workspaceForSelection({ ...base, selectedCountryId: 'QAT' }, 'QAT', 'FRA')).toBe('hub');
  });
  it('a tab request from another window (navigate) opens the panel, but a child tool kept in the trail does not', () => {
    expect(workspaceForSelection({ ...base, navigation: { countryId: 'FRA' } }, 'FRA', null)).toBe('panel');
    // navigate('diplomacy-inbox', FRA) clears the live selection while FRA stays in the workspace trail.
    expect(workspaceForSelection({ ...base, selectedCountryId: null, navigation: { countryId: 'FRA' } }, 'FRA', null)).toBe('hub');
  });
});

describe('Phase 6.1 hub cards follow the engine rules', () => {
  it('shows eight cards in the approved order, each with a typed command aimed at the target', () => {
    const actions = targetHubActions(richState(), TARGET);
    expect(actions.map((a) => a.id)).toEqual(ORDER);
    expect(actions.map((a) => a.command.type)).toEqual(['diplomacy/request', 'diplomacy/request', 'diplomacy/signNonAggression', 'diplomacy/signAlliance', 'diplomacy/toggleEmbargo', 'diplomacy/giftTreasury', 'diplomacy/improveRelations', 'intelligence/launch']);
    for (const action of actions) {
      const command = action.command as { targetCountryId?: string; id?: string };
      expect(command.targetCountryId ?? command.id).toBe(TARGET);
    }
  });
  it('enables treaties and missions exactly when the engine validators do', () => {
    const s = richState(), actions = Object.fromEntries(targetHubActions(s, TARGET).map((a) => [a.id, a]));
    expect(actions.nonAggression.allowed).toBe(agreementEligibility(s, s.playerCountryId, TARGET, 'nonAggression').allowed);
    expect(actions.alliance.allowed).toBe(agreementEligibility(s, s.playerCountryId, TARGET, 'alliance').allowed);
    expect(actions.mission.allowed).toBe(diplomaticMissionStatus(s, s.playerCountryId, TARGET).allowed);
  });
  it('every card command runs through the engine without throwing and never touches the save schema', () => {
    const s = richState();
    for (const action of targetHubActions(s, TARGET)) {
      const result = executeCommandResult(s, action.command);
      expect(['applied', 'unavailable']).toContain(result.status);
      expect(result.state.schemaVersion).toBe(s.schemaVersion);
    }
    expect(CURRENT_SCHEMA_VERSION).toBe(18);
  });
  it('economic aid changes treasury and relations only through the engine', () => {
    const s = richState(), aid = targetHubActions(s, TARGET).find((a) => a.id === 'aid')!;
    const five = aid.variants!.find((v) => v.label === '$5B')!;
    const after = executeCommandResult(s, five.command);
    expect(after.status).toBe('applied');
    expect(after.state.countries[s.playerCountryId].economy.treasury).toBeLessThan(s.countries[s.playerCountryId].economy.treasury);
    expect(relationFor(after.state.countries[s.playerCountryId], TARGET).score).toBeGreaterThan(relationFor(s.countries[s.playerCountryId], TARGET).score);
  });
  it('the espionage card starts one intelligence operation and then shows it as active', () => {
    const s = richState(), spy = targetHubActions(s, TARGET).find((a) => a.id === 'espionage')!;
    expect(spy.allowed).toBe(true);
    const next = executeCommandResult(s, spy.command).state;
    expect(Object.values(next.intelOperations).filter((op) => op.status === 'active' && op.targetCountryId === TARGET)).toHaveLength(1);
    const again = targetHubActions(next, TARGET).find((a) => a.id === 'espionage')!;
    expect(again.status).toBe('active');
    expect(again.allowed).toBe(false);
  });
  it('a sent embassy proposal turns the card into a link to the proposal tracker', () => {
    const s = richState(), embassy = targetHubActions(s, TARGET).find((a) => a.id === 'embassy')!;
    expect(embassy.allowed).toBe(true);
    const next = executeCommandResult(s, embassy.command).state;
    const card = targetHubActions(next, TARGET).find((a) => a.id === 'embassy')!;
    expect(card.trackProposal).toBe(true);
    expect(card.allowed).toBe(true);
  });
  it('during a war embargo and aid are locked and the summary reports the war', () => {
    const s = atWar(richState()), actions = Object.fromEntries(targetHubActions(s, TARGET).map((a) => [a.id, a]));
    expect(actions.embargo.allowed).toBe(false);
    expect(actions.aid.allowed).toBe(false);
    expect(actions.aid.variants!.every((v) => !v.allowed)).toBe(true);
    expect(targetHubSummary(s, TARGET)).toMatchObject({ atWar: true, mood: '⚔️' });
  });
  it('the summary reads the engine relation index and stance', () => {
    const s = richState(), rel = relationFor(s.countries[s.playerCountryId], TARGET);
    expect(targetHubSummary(s, TARGET)).toMatchObject({ capital: 'Paris', relationIndex: relationshipIndex(rel), stance: relationshipStance(rel), atWar: false });
    expect(targetHubSummary(s, s.playerCountryId)).toBeNull();
    expect(targetHubActions(s, s.playerCountryId)).toEqual([]);
  });
  it('building the hub never mutates the state', () => {
    const s = richState(), snapshot = JSON.stringify(s);
    targetHubActions(s, TARGET); targetHubSummary(s, TARGET);
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});

describe('Phase 6.1 capitals and translations', () => {
  it('names a capital for every capital position (201)', () => {
    expect(Object.keys(CAPITAL_NAMES).sort()).toEqual(Object.keys(CAPITAL_POSITIONS).sort());
    expect(Object.keys(CAPITAL_NAMES)).toHaveLength(201);
    expect(capitalName('QAT')).toBe('Doha');
    expect(capitalName('ZAF')).toBe('Pretoria');
    expect(Object.values(CAPITAL_NAMES).every((name) => name.trim().length > 1 && !/[()\/;]/.test(name))).toBe(true);
  });
  it('every new hub label translates in all four non-English languages', () => {
    for (const [key, values] of Object.entries(UI_CATALOG_0915)) for (const [i, lang] of ['tr', 'es', 'zh', 'ru'].entries()) expect(translateText(lang, key)).toBe(key === key.toUpperCase() ? values[i].toLocaleUpperCase(lang) : values[i]);
  });
  it('every card title and subtitle on a fresh campaign and during a war is translated', () => {
    for (const s of [richState(), atWar(richState())]) {
      for (const action of targetHubActions(s, TARGET)) for (const text of [action.title, action.detail]) for (const lang of ['tr', 'es', 'zh', 'ru']) {
        expect(translateText(lang, text), `${lang}: ${text}`).not.toBe(text);
      }
    }
  });
});

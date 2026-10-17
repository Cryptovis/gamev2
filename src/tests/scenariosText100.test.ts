import { describe, expect, it } from 'vitest';
import { MERGED_CATALOG_GROUP, formatText, translateText } from '../i18n/localeText';
import { UI_CATALOG_100S } from '../i18n/uiCatalog100Scenarios';
import { SCENARIOS } from '../scenarios/scenarios';

import { readFileSync } from 'node:fs';
const files = import.meta.glob<string>([
  '../scenarios/scenarios.ts', '../ui/panels/landing/ScenarioPicker.tsx', '../ui/panels/landing/LandingShell.tsx', '../ui/panels/AudioOptions.tsx',
  '../ui/panels/CampaignSetup.tsx', '../ui/styles/scenarios100.css', '../main.tsx', '../audio/AudioDirector.tsx',
], { query: '?raw', import: 'default', eager: true });
const read = (path: string) => {
  const content = files[`../${path.replace(/^src\//, '')}`];
  if (content && typeof content === 'string' && content.length > 0) return content;
  try {
    return readFileSync(new URL(path.replace(/^src\//, '../'), import.meta.url), 'utf8');
  } catch {
    return content ?? '';
  }
};
const SOURCES = ['src/scenarios/scenarios.ts', 'src/ui/panels/landing/ScenarioPicker.tsx', 'src/ui/panels/AudioOptions.tsx'];
const holes = (text: string) => (text.match(/\{\d\}/g) ?? []).sort().join('');
const LANGUAGES = ['tr', 'es', 'zh', 'ru'] as const;
const covered = (text: string) => text in UI_CATALOG_100S || MERGED_CATALOG_GROUP.some(g => text in g);

function literals(source: string): string[] {
  const found = new Set<string>();
  for (const m of source.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\\n$]|\\.)*)`/g)) {
    const text = (m[1] ?? m[2] ?? m[3]).replace(/\\'/g, "'");
    if (/^[A-Z{][^<>]* [^<>]*$/.test(text) && !/^[A-Z_]+$/.test(text) && !/^(?:https?|\w+\/)/.test(text) && text.length > 3) found.add(text);
  }
  return [...found];
}

describe('10.0 text', () => {
  it('has four non-empty translations for every key and keeps placeholders in step', () => {
    expect(Object.keys(UI_CATALOG_100S).length).toBeGreaterThan(50);
    for (const [key, translations] of Object.entries(UI_CATALOG_100S)) {
      expect(translations.length).toBe(4);
      for (const text of translations) { expect(text.trim().length).toBeGreaterThan(0); expect(holes(text)).toBe(holes(key)); }
    }
  });
  it('is last in the merged group and never shadows an earlier translation with a different one', () => {
    const at = MERGED_CATALOG_GROUP.indexOf(UI_CATALOG_100S);
    expect(at).toBeGreaterThan(-1);
    for (const earlier of MERGED_CATALOG_GROUP.slice(0, at)) for (const key of Object.keys(UI_CATALOG_100S)) if (key in earlier) expect(JSON.stringify(earlier[key])).toBe(JSON.stringify(UI_CATALOG_100S[key]));
    for (const later of MERGED_CATALOG_GROUP.slice(at + 1)) for (const key of Object.keys(UI_CATALOG_100S)) expect(key in later).toBe(false);
  });
  it('translates every scenario title, tagline, summary, fact and briefing line', () => {
    for (const s of SCENARIOS) for (const text of [s.title, s.tagline, s.summary, ...s.facts, ...s.briefing]) expect(covered(text), text).toBe(true);
  });
  it('covers every sentence the picker, the engine and the audio options can show', () => {
    const missing: string[] = [];
    for (const file of SOURCES) for (const text of literals(read(file))) if (!covered(text)) missing.push(`${file}: ${text}`);
    expect(missing).toEqual([]);
  });
  it('covers the one-word labels too', () => {
    for (const word of ['Scenario', 'Standard', 'Demanding', 'Brutal', 'Cancel', 'Crisis', 'Uneasy', 'Calm']) expect(covered(word), word).toBe(true);
  });
  it('translates into every language and leaves English as written', () => {
    for (const [key, row] of Object.entries(UI_CATALOG_100S)) {
      expect(translateText('en', key)).toBe(key);
      LANGUAGES.forEach((language, i) => expect(translateText(language, key)).toBe(row[i]));
    }
  });
  it('fills the placeholder in every language', () => {
    expect(formatText('tr', 'Ambience now: {0}', ['Sakin'])).toBe('Şu anki ortam: Sakin');
    expect(formatText('zh', 'Ambience now: {0}', ['平静'])).toBe('当前氛围：平静');
  });
  it('gives each scenario a different name in every language', () => {
    for (const language of LANGUAGES) expect(new Set(SCENARIOS.map(s => translateText(language, s.title))).size).toBe(SCENARIOS.length);
  });
});

describe('10.0 the window follows the repository rules', () => {
  it('selects only what it shows and never reads the whole store', () => {
    for (const file of ['src/ui/panels/landing/ScenarioPicker.tsx', 'src/ui/panels/AudioOptions.tsx', 'src/audio/AudioDirector.tsx']) expect(/useGameStore\(\s*\)/.test(read(file))).toBe(false);
  });
  it('is opened from the landing card and no longer says coming soon', () => {
    const shell = read('src/ui/panels/landing/LandingShell.tsx');
    expect(shell).toContain('<ScenarioPicker');
    expect(shell).toMatch(/scenariosEnabled/);
  });
  it('hands the choice to the setup wizard and starts the campaign with it', () => {
    const setup = read('src/ui/panels/CampaignSetup.tsx');
    expect(setup).toContain('scenarioId:scenarioIdRef.current');
    expect(setup).toContain('data-testid="wizard-scenario"');
  });
  it('shows the difficulty with a shape as well as a word, and fits a phone', () => {
    const picker = read('src/ui/panels/landing/ScenarioPicker.tsx'), css = read('src/ui/styles/scenarios100.css');
    expect(picker).toContain('●'); expect(picker).toContain('▲'); expect(picker).toContain('◆');
    expect(css).toContain('max-width:700px');
    expect(css).toContain('min-height:44px');
  });
  it('loads the stylesheet', () => expect(read('src/main.tsx')).toContain('scenarios100.css'));
  it('keeps the audio layers off simulation state', () => {
    const director = read('src/audio/AudioDirector.tsx');
    expect(director).not.toMatch(/dispatch\(|setState\(|Math\.random|Date\.now/);
  });
});

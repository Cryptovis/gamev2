import { describe, expect, it } from 'vitest';
import { MERGED_CATALOG_GROUP, formatText, translateText } from '../i18n/localeText';
import { UI_CATALOG_099S } from '../i18n/uiCatalog099System';

import { readFileSync } from 'node:fs';
const read = (path: string) => {
  try { return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8'); } catch { return ''; }
};
const COMPONENTS = ['src/ui/panels/SimulationOptions.tsx', 'src/ui/panels/CloudOptions.tsx'];
const holes = (text: string) => (text.match(/\{\d\}/g) ?? []).sort().join('');
const LANGUAGES = ['tr', 'es', 'zh', 'ru'] as const;

/** Every sentence-like string literal in a source file: capitalised or a placeholder opener, with a space, no markup. */
function literals(source: string): string[] {
  const found = new Set<string>();
  for (const m of source.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\\n$]|\\.)*)`/g)) {
    const text = (m[1] ?? m[2] ?? m[3]).replace(/\\'/g, "'");
    if (/^[A-Z{][^<>]* [^<>]*$/.test(text) && !/^[A-Z_]+$/.test(text) && !/^(?:https?|\w+\/)/.test(text) && text.length > 3) found.add(text);
  }
  return [...found];
}

describe('9.9 text', () => {
  it('has four non-empty translations for every key and keeps placeholders in step', () => {
    expect(Object.keys(UI_CATALOG_099S).length).toBeGreaterThan(100);
    for (const [key, translations] of Object.entries(UI_CATALOG_099S)) {
      expect(translations.length).toBe(4);
      for (const text of translations) {
        expect(text.trim().length).toBeGreaterThan(0);
        expect(holes(text)).toBe(holes(key));
      }
    }
  });

  it('is in the merged group and never shadows an earlier translation with a different one', () => {
    const at = MERGED_CATALOG_GROUP.indexOf(UI_CATALOG_099S);
    expect(at).toBeGreaterThan(-1);
    for (const earlier of MERGED_CATALOG_GROUP.slice(0, at)) {
      for (const key of Object.keys(UI_CATALOG_099S)) if (key in earlier) expect(JSON.stringify(earlier[key])).toBe(JSON.stringify(UI_CATALOG_099S[key]));
    }
    for (const later of MERGED_CATALOG_GROUP.slice(at + 1)) for (const key of Object.keys(UI_CATALOG_099S)) expect(key in later).toBe(false);
  });

  it('covers every sentence the two option panels can show', () => {
    const missing: string[] = [];
    for (const file of COMPONENTS) for (const text of literals(read(file))) if (!(text in UI_CATALOG_099S) && !MERGED_CATALOG_GROUP.some(g => text in g)) missing.push(`${file}: ${text}`);
    expect(missing).toEqual([]);
  });

  it('translates into every language and leaves English as written', () => {
    for (const [key, row] of Object.entries(UI_CATALOG_099S)) {
      expect(translateText('en', key)).toBe(key);
      LANGUAGES.forEach((language, i) => expect(translateText(language, key)).toBe(row[i]));
    }
  });

  it('fills the placeholders in every language', () => {
    expect(formatText('tr', '{0} FPS', ['60'])).toBe('60 FPS');
    expect(formatText('ru', '{0} ms · slowest {1} ms', ['4', '9'])).toBe('4 мс · самый медленный 9 мс');
    expect(formatText('es', 'Cloud: Day {0}, revision {1}', ['12', '3'])).toBe('Nube: día 12, revisión 3');
    expect(formatText('zh', 'Uploaded as revision {0}.', ['7'])).toBe('已作为修订 7 上传。');
  });

  it('gives the cloud statuses and the worker reasons their own wording', () => {
    for (const text of ['Ready to sync', 'Everything is in step', 'A campaign changed on two devices', 'Offline', 'Locked: passphrase needed', 'The simulation worker failed.', 'Changed on both sides']) {
      expect(text in UI_CATALOG_099S).toBe(true);
      expect(new Set(UI_CATALOG_099S[text]).size).toBeGreaterThan(1);
    }
  });
});

describe('9.9 panels follow the repository rules', () => {
  it('select only what they display and never read the whole store', () => {
    for (const file of COMPONENTS) {
      const source = read(file);
      expect(/useGameStore\(\s*\)/.test(source)).toBe(false);
    }
  });

  it('show state with a shape as well as a colour', () => {
    const css = read('src/ui/styles/system099.css');
    for (const kind of ['good', 'warn', 'busy', 'plain']) expect(css).toContain(`.sys-badge[data-kind="${kind}"]`);
    expect(css).toContain('clip-path');
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain('max-width:480px');
  });

  it('loads the stylesheet before the hotfix sheets and the panels from the settings view', () => {
    const main = read('src/main.tsx');
    expect(main.indexOf('system099.css')).toBeGreaterThan(-1);
    expect(main.indexOf('system099.css')).toBeLessThan(main.indexOf('hotfix15.css'));
    const options = read('src/ui/panels/PlayerOptionsMenu.tsx');
    expect(options).toContain('<SimulationOptions');
    expect(options).toContain('<CloudOptions');
  });
});

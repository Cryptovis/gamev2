import { useState } from 'react';
import type { GameLanguage } from '../../../domain/game';
import type { ScenarioId } from '../../../domain/scenario';
import { flagEmoji } from '../../../data/countryThemes';
import { translateText } from '../../../i18n/localeText';
import { DEFAULT_SCENARIO, SCENARIOS, scenarioById, type ScenarioDifficulty } from '../../../scenarios/scenarios';
import { useGameStore } from '../../../store/gameStore';
import { ManagedDialog } from '../../windows/ManagedDialog';

export interface ScenarioPickerProps {
  language: GameLanguage;
  open: boolean;
  onClose(): void;
  onBegin(scenarioId: ScenarioId, countryId: string | null): void;
}

const DIFFICULTY: Record<ScenarioDifficulty, string> = { standard: 'Standard', demanding: 'Demanding', brutal: 'Brutal' };
/** A shape per level as well as a word, so the level never rests on colour alone. */
const MARK: Record<ScenarioDifficulty, string> = { standard: '●', demanding: '▲', brutal: '◆' };

/**
 * The Historical scenarios window. The list picks the scenario, the detail pane shows what changes at the start and
 * which nations suit it, and Begin hands the choice to the setup wizard (name, portrait and nation are still chosen
 * there). Every sentence comes from the catalogs; the opening state itself is built by the scenario engine.
 */
export function ScenarioPicker({ language, open, onClose, onBegin }: ScenarioPickerProps) {
  const t = (text: string) => translateText(language, text);
  const countries = useGameStore(s => s.countries);
  const [selected, setSelected] = useState<ScenarioId>(DEFAULT_SCENARIO);
  const [nation, setNation] = useState<string | null>(null);
  if (!open) return null;
  const def = scenarioById(selected);
  const nations = def.suggested.filter(id => countries[id]);
  const choose = (id: ScenarioId) => { setSelected(id); setNation(null); };
  return <div className="l94-modal-layer" data-testid="scenario-scrim" onMouseDown={onClose}>
    <ManagedDialog className="l94-modal sc100-modal" label={t('Historical scenarios')} onClose={onClose} testId="scenario-picker">
      <header>
        <h2>{t('Historical scenarios')}</h2>
        <button type="button" className="lw-btn" data-testid="scenario-close" onClick={onClose}>{t('Close')}</button>
      </header>
      <div className="l94-modal-body sc100-body" lang={language}>
        <div className="sc100-list" role="radiogroup" aria-label={t('Scenario')}>
          {SCENARIOS.map(s => <button key={s.id} type="button" role="radio" aria-checked={s.id === selected} className="sc100-card" data-testid={`scenario-${s.id}`} data-difficulty={s.difficulty} onClick={() => choose(s.id)}>
            <span className="sc100-title">{t(s.title)}</span>
            <span className="sc100-tagline">{t(s.tagline)}</span>
            <span className="sc100-level" data-testid={`scenario-level-${s.id}`}><span aria-hidden="true">{MARK[s.difficulty]}</span> {t(DIFFICULTY[s.difficulty])}</span>
          </button>)}
        </div>
        <section className="sc100-detail" data-testid="scenario-detail" data-scenario={def.id} aria-live="polite">
          <h3>{t(def.title)}</h3>
          <p>{t(def.summary)}</p>
          <h4>{t('At the start')}</h4>
          <ul className="sc100-facts">{def.facts.map(f => <li key={f}>{t(f)}</li>)}</ul>
          <h4>{t('Suggested nations')}</h4>
          <div className="sc100-nations" role="group" aria-label={t('Suggested nations')}>
            <button type="button" className="sc100-chip" aria-pressed={nation === null} data-testid="scenario-nation-any" onClick={() => setNation(null)}>{t('Any nation')}</button>
            {nations.map(id => <button key={id} type="button" className="sc100-chip" aria-pressed={nation === id} data-testid={`scenario-nation-${id}`} onClick={() => setNation(id)}>
              <span aria-hidden="true">{flagEmoji(countries[id].iso2)}</span> {t(countries[id].name)}
            </button>)}
          </div>
          <p className="sc100-hint">{t('You choose your name, portrait and nation next.')}</p>
          <div className="sc100-actions">
            <button type="button" className="lw-btn" data-testid="scenario-cancel" onClick={onClose}>{t('Cancel')}</button>
            <button type="button" className="lw-btn sc100-begin" data-testid="scenario-begin" onClick={() => onBegin(selected, nation)}>{t('Begin scenario')}</button>
          </div>
        </section>
      </div>
    </ManagedDialog>
  </div>;
}

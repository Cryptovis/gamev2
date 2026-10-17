import type { GameState, WarState } from '../../domain/game';
import { LocaleText, translateLive } from '../../i18n/localeText';
import { warScoreBoard, WAR_SCORE_MAX, type WarScoreBreakdown, type WarScoreKey } from '../../engine/systems/warScore';

/** Labels for the eight lines of the war score, shared by the war command window and the peace table. */
export const WAR_SCORE_LABELS: Record<WarScoreKey, string> = {
  casualties: 'Casualties inflicted',
  divisions: 'Divisions destroyed',
  occupation: 'Occupied regions',
  capital: 'Capital captured',
  blockade: 'Naval blockade',
  embargo: 'Embargo pressure',
  air: 'Air dominance',
  attrition: 'Enemy exhaustion',
};

/** One side's war score as a list of bars. The bars come from the engine; nothing is computed here. */
export function ScoreLines({ score }: { score: WarScoreBreakdown }) {
  return (
    <ul className="score-lines">
      {score.lines.map(line => (
        <li key={line.key} data-line={line.key} className={line.points > 0 ? 'has-points' : ''}>
          <span><LocaleText value={WAR_SCORE_LABELS[line.key]} /></span>
          <b>{line.points.toFixed(1)}</b>
          <i aria-hidden="true"><em style={{ width: `${Math.round((line.points / line.max) * 100)}%` }} /></i>
        </li>
      ))}
    </ul>
  );
}

/**
 * War score in the war inspection view. Both fronts are shown as totals; the breakdown is for the player's side, or
 * the attacker's when the player is not a belligerent.
 */
export function WarScorePanel({ state, war }: { state: GameState; war: WarState }) {
  const board = warScoreBoard(state, war);
  const mine: 'attacker' | 'defender' = war.defenderId === state.playerCountryId ? 'defender' : 'attacker';
  const score = board[mine];
  const enemy = board[mine === 'attacker' ? 'defender' : 'attacker'];
  return (
    <section className="war-score-panel" data-testid="war-score" aria-label={translateLive('War score')}>
      <header>
        <h3><LocaleText value="War score" /></h3>
        <p className="score-versus">
          <span data-side={mine}><b data-testid="war-score-own">{score.total}</b> <small>{state.countries[score.winnerId]?.name}</small></span>
          <span aria-hidden="true">:</span>
          <span data-side="other"><b data-testid="war-score-enemy">{enemy.total}</b> <small>{state.countries[enemy.winnerId]?.name}</small></span>
        </p>
      </header>
      <ScoreLines score={score} />
      <footer>
        <small><LocaleText value="Points are spent at the peace table. A surrender or collapse raises the winner to at least 100." /></small>
        <small>{score.subtotal.toFixed(1)} / {WAR_SCORE_MAX}</small>
      </footer>
    </section>
  );
}

import type { TacticalBattle, TacticalSide } from '../../domain/tactical';
import type { BattleEffect, RoundSummary } from '../../presentation/battleEffects';
import { cellColumn, cellRow } from '../../engine/systems/tactical';
import { LocaleText } from '../../i18n/localeText';
import '../styles/battleFx.css';

/**
 * Phase 5: board effects for one recorded playback step (movement trail, artillery arc and impact, recon sweep,
 * contact flash). Drawn from `BattleEffect` only; purely decorative (aria-hidden) and never interactive.
 * The board is drawn in cell units: one cell = 10 × 10.
 */
export function BattleFxLayer({ board, effect, side }: { board: TacticalBattle; effect: BattleEffect | null; side: TacticalSide }) {
  if (!effect) return null;
  const centre = (cell: number | undefined): [number, number] | null => cell === undefined ? null : [cellColumn(board, cell) * 10 + 5, cellRow(board, cell) * 10 + 5];
  const a = centre(effect.from), b = centre(effect.to) ?? a;
  if (!b) return null;
  const own = effect.side === side ? 'friendly' : 'enemy';
  const arc = a ? `M${a[0]},${a[1]} Q${(a[0] + b[0]) / 2},${Math.min(a[1], b[1]) - 14} ${b[0]},${b[1]}` : '';
  return (
    <svg key={effect.id} className={`battle-fx ${own}`} viewBox={`0 0 ${board.width * 10} ${board.height * 10}`} preserveAspectRatio="none" aria-hidden="true" data-fx={effect.kind}>
      {(effect.kind === 'move' || effect.kind === 'blocked') && a && <>
        <line className="fx-trail" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} pathLength={1} />
        {effect.kind === 'move' ? <circle className="fx-arrive" cx={b[0]} cy={b[1]} r={2.2} /> : <path className="fx-blocked" d={`M${b[0] - 2.5},${b[1] - 2.5} L${b[0] + 2.5},${b[1] + 2.5} M${b[0] + 2.5},${b[1] - 2.5} L${b[0] - 2.5},${b[1] + 2.5}`} />}
      </>}
      {effect.kind === 'bombard' && <>
        {a && <path className="fx-shell" d={arc} pathLength={1} />}
        <circle className={effect.hit ? 'fx-impact' : 'fx-impact fx-miss'} cx={b[0]} cy={b[1]} r={effect.hit ? 4.6 : 2.6} />
        {effect.hit && <circle className="fx-shock" cx={b[0]} cy={b[1]} r={6.5} />}
      </>}
      {effect.kind === 'recon' && <circle className="fx-sweep" cx={b[0]} cy={b[1]} r={9} />}
      {(effect.kind === 'casualties' || effect.kind === 'lost') && <circle className="fx-contact" cx={b[0]} cy={b[1]} r={4.8} />}
      {(effect.kind === 'capture' || effect.kind === 'contest') && <circle className={`fx-objective ${effect.kind}`} cx={b[0]} cy={b[1]} r={4.4} />}
    </svg>
  );
}

const signed = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;
/** One line for a whole round, used when effects are summarised (fast playback, 5× clock, low effects, reduced motion). */
export function RoundSummaryStrip({ summary, side }: { summary: RoundSummary; side: TacticalSide }) {
  const enemy: TacticalSide = side === 'attacker' ? 'defender' : 'attacker';
  const front = summary.frontChange * (side === 'attacker' ? 1 : -1);
  return (
    <div className="round-summary-strip" role="status" data-summary={summary.id}>
      <strong><LocaleText value="Round summary" /></strong>
      <span><LocaleText value="Moves" />: {summary.moves}</span>
      <span><LocaleText value="Bombardments" />: {summary.bombardments} ({summary.hits} <LocaleText value="hits" />)</span>
      <span><LocaleText value="Your personnel lost" />: {summary.personnelLost[side].toLocaleString()}</span>
      <span><LocaleText value="Opponent personnel lost" />: {summary.personnelLost[enemy].toLocaleString()}</span>
      {summary.captures[side] + summary.captures[enemy] > 0 && <span><LocaleText value="Objectives captured" />: {summary.captures[side]} / {summary.captures[enemy]}</span>}
      {summary.groupsLost[side] + summary.groupsLost[enemy] > 0 && <span><LocaleText value="Groups lost" />: {summary.groupsLost[side]} / {summary.groupsLost[enemy]}</span>}
      <span><LocaleText value="Front change" />: {signed(front)}</span>
    </div>
  );
}

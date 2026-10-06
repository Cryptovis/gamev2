import type { ReactNode } from 'react';
import type { GameSpeed } from '../../domain/game';
import { useGameStore } from '../../store/gameStore';
import { ApprovalIcon, FoodIcon, IronIcon, OilIcon, TreasuryIcon } from '../icons/GameIcons';

const speeds: Array<{ speed: GameSpeed; label: string; hint: string }> = [
  { speed: 0, label: 'Ⅱ', hint: 'Pause' },
  { speed: 1, label: '1×', hint: '15s/day' },
  { speed: 2, label: '2×', hint: '7s/day' },
  { speed: 3, label: '3×', hint: '3s/day' },
  { speed: 5, label: '5×', hint: '1s/day' },
];

function Metric({ icon, label, value, tone = 'neutral' }: { icon: ReactNode; label: string; value: string; tone?: 'neutral' | 'warning' | 'good' }) {
  return <div className={`top-metric ${tone}`}>
    <span className="top-metric-icon">{icon}</span>
    <span><small>{label}</small><strong>{value}</strong></span>
  </div>;
}

export function TopBar() {
  const day = useGameStore((s) => s.day);
  const speed = useGameStore((s) => s.speed);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const player = useGameStore((s) => s.countries[s.playerCountryId]);
  const saveNow = useGameStore((s) => s.saveNow);
  const loadLatest = useGameStore((s) => s.loadLatest);
  const reset = useGameStore((s) => s.resetGame);
  const msg = useGameStore((s) => s.saveMessage);

  return <header className="topbar">
    <div className="brand-block">
      <div className="eyebrow">ALPYX // GLOBAL COMMAND · LIVING WORLD 0.50 ALPHA</div>
      <div className="brand-line"><strong>{player.name}</strong><span className="day-chip">DAY {day}</span></div>
    </div>

    <div className="metrics" aria-label="National resources">
      <Metric icon={<TreasuryIcon size={16}/>} label="TREASURY" value={`$${player.economy.treasury.toFixed(1)}B`} />
      <Metric icon={<FoodIcon size={16}/>} label="FOOD" value={player.resources.food.toFixed(0)} tone={player.resources.food < 80 ? 'warning' : 'neutral'} />
      <Metric icon={<OilIcon size={16}/>} label="OIL" value={player.resources.oil.toFixed(0)} tone={player.resources.oil < 25 ? 'warning' : 'neutral'} />
      <Metric icon={<IronIcon size={16}/>} label="IRON" value={player.resources.iron.toFixed(0)} />
      <Metric icon={<ApprovalIcon size={16}/>} label="APPROVAL" value={`${player.politics.approval.toFixed(0)}%`} tone={player.politics.approval >= 60 ? 'good' : player.politics.approval < 40 ? 'warning' : 'neutral'} />
    </div>

    <div className="top-actions">
      <div className="save-control">
        <button onClick={() => void saveNow()}>SAVE</button>
        <button onClick={() => void loadLatest()}>LOAD</button>
        <button onClick={reset}>NEW</button>
        {msg && <small>{msg}</small>}
      </div>
      <div className="speed-segment" aria-label="Game speed controls">
        {speeds.map((item) => <button key={item.speed} className={item.speed === speed ? 'active' : ''} onClick={() => setSpeed(item.speed)} title={item.hint}>
          <strong>{item.label}</strong><small>{item.speed === 0 ? 'PAUSE' : item.hint}</small>
        </button>)}
      </div>
    </div>
  </header>;
}

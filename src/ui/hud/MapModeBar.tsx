import type { MapMode } from '../../domain/map';
import { useGameStore } from '../../store/gameStore';

const modes: Array<{ mode: MapMode; label: string; glyph: string }> = [
  { mode: 'political', label: 'POLITICAL', glyph: '◉' },
  { mode: 'diplomacy', label: 'DIPLOMACY', glyph: '◇' },
  { mode: 'resources', label: 'RESOURCES', glyph: '⬡' },
  { mode: 'military', label: 'MILITARY', glyph: '◆' },
  { mode: 'religion', label: 'RELIGION', glyph: '✦' },
  { mode: 'ideology', label: 'IDEOLOGY', glyph: '▣' },
];

export function MapModeBar() {
  const mapMode = useGameStore((state) => state.mapMode);
  const setMapMode = useGameStore((state) => state.setMapMode);
  const mapNotice = useGameStore((state) => state.mapNotice);

  return (
    <section className="map-mode-bar" aria-label="Map modes">
      <div className="map-mode-buttons">
        {modes.map(({ mode, label, glyph }) => (
          <button key={mode} className={mode === mapMode ? 'active' : ''} onClick={() => setMapMode(mode)}><span>{glyph}</span>{label}</button>
        ))}
      </div>
      <div className="map-notice">{mapNotice}</div>
    </section>
  );
}

import { useAutosave } from '../engine/useAutosave';
import { useGameClock } from '../engine/useGameClock';
import { WorldMap } from '../map/WorldMap';
import { useGameStore } from '../store/gameStore';
import { TopBar } from '../ui/hud/TopBar';
import { CountryPanel } from '../ui/panels/CountryPanel';
import { MapModeBar } from '../ui/hud/MapModeBar';
import { EventModal } from '../ui/panels/EventModal';
import { CampaignOverlay } from '../ui/panels/CampaignOverlay';
import { MarketTicker } from '../ui/hud/MarketTicker';
import { WorldPulse } from '../ui/hud/WorldPulse';

export function App(){
  useGameClock(); useAutosave();
  const sitrep=useGameStore((s)=>s.sitrep);
  return <main className="game-shell"><WorldMap/><TopBar/><MapModeBar/><CountryPanel/><MarketTicker/><WorldPulse/><div className="sitrep">SITREP // {sitrep[0]}</div><EventModal/><CampaignOverlay/></main>;
}

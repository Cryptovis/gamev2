import type { CSSProperties } from 'react';
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
import { PlaytestObjectives } from '../ui/hud/PlaytestObjectives';
import { CampaignSetup } from '../ui/panels/CampaignSetup';
import { AdvisorModal } from '../ui/panels/AdvisorModal';
import { countryThemeFor } from '../data/countryThemes';

export function App(){
  useGameClock(); useAutosave();
  const sitrep=useGameStore((s)=>s.sitrep);
  const player=useGameStore((s)=>s.countries[s.playerCountryId]);
  const theme=countryThemeFor(player.iso2);
  return <main className="game-shell" style={{'--accent':theme.primary,'--accent-2':theme.accent,'--nation-secondary':theme.secondary} as CSSProperties}><WorldMap/><TopBar/><MapModeBar/><CountryPanel/><MarketTicker/><WorldPulse/><PlaytestObjectives/><div className="sitrep">SITREP // {sitrep[0]}</div><EventModal/><AdvisorModal/><CampaignSetup/><CampaignOverlay/></main>;
}

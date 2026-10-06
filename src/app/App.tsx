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
import { CommandRails } from '../ui/hud/CommandRails';
import { CampaignSetup } from '../ui/panels/CampaignSetup';
import { AdvisorModal } from '../ui/panels/AdvisorModal';
import { countryThemeFor } from '../data/countryThemes';

export function App(){
  useGameClock(); useAutosave();
  const sitrep=useGameStore((s)=>s.sitrep);
  const player=useGameStore((s)=>s.countries[s.playerCountryId]);
  const selectedCountryId=useGameStore((s)=>s.selectedCountryId);
  const mapMode=useGameStore((s)=>s.mapMode);
  const mapPresentation=useGameStore((s)=>s.mapPresentation);
  const theme=countryThemeFor(player.iso2);
  return <main className="game-shell" style={{'--accent':theme.primary,'--accent-2':theme.accent,'--nation-secondary':theme.secondary} as CSSProperties}><WorldMap/><TopBar/><MapModeBar/>{selectedCountryId&&<CountryPanel/>}<CommandRails/><div className="sitrep"><span>SITREP // {sitrep[0]}</span><span className="sitrep-command-meta"><b>WORLD COMMAND CHANNEL</b><small>PLAYER · {mapPresentation.toUpperCase()} · {mapMode.toUpperCase()} MAP</small></span></div><EventModal/><AdvisorModal/><CampaignSetup/><CampaignOverlay/></main>;
}

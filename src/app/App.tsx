import {EconomicAdvice} from '../ui/panels/EconomicAdvice';
import {LocaleText} from '../i18n/localeText';
import {WarTheatreModal} from '../ui/panels/WarTheatreModal';
import {ActionReceipt} from '../ui/panels/ReviewDialog';
import {CampaignTutorial} from '../ui/panels/CampaignTutorial';
import type { CSSProperties } from 'react';
import { useAutosave } from '../engine/useAutosave';
import { useGameClock } from '../engine/useGameClock';
import { WorldMap } from '../map/WorldMap';
import { useGameStore } from '../store/gameStore';
import { TopBar } from '../ui/hud/TopBar';
import { CountryPanel } from '../ui/panels/CountryPanel';
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
  const mapProjection=useGameStore((s)=>s.mapProjection);
  const theme=countryThemeFor(player.iso2);
  return <main className="game-shell" style={{'--accent':theme.primary,'--accent-2':theme.accent,'--nation-secondary':theme.secondary} as CSSProperties}><WorldMap/><TopBar/>{selectedCountryId&&<CountryPanel/>}<CommandRails/><div className="sitrep"><span><LocaleText value={"SITREP // "}/><LocaleText value={sitrep[0]}/></span><span className="sitrep-command-meta"><b><LocaleText value={"WORLD COMMAND CHANNEL"}/></b><small><LocaleText value={"PLAYER · "}/><LocaleText value={mapPresentation.toUpperCase()}/><LocaleText value={" · "}/><LocaleText value={mapMode.toUpperCase()}/><LocaleText value={" · "}/><LocaleText value={mapProjection.toUpperCase()}/></small></span></div><EventModal/><AdvisorModal/><EconomicAdvice/><CampaignSetup/><CampaignOverlay/><CampaignTutorial/><ActionReceipt/><WarTheatreModal/><footer className="studio-footer">AlpyX Game Studios</footer></main>;
}

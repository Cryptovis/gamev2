const VictoryScroll=lazy(()=>import('../ui/panels/VictoryScroll').then(m=>({default:m.VictoryScroll})));
import {EconomicAdvice} from '../ui/panels/EconomicAdvice';
import {LocaleText} from '../i18n/localeText';
const WarTheatreModal=lazy(()=>import('../ui/panels/WarTheatreModal').then(m=>({default:m.WarTheatreModal})));
import {ActionReceipt} from '../ui/panels/ReviewDialog';
import {CampaignTutorial} from '../ui/panels/CampaignTutorial';
import {lazy,Suspense,type CSSProperties} from 'react';
import { useAutosave } from '../engine/useAutosave';
import { useGameClock } from '../engine/useGameClock';
import { WorldMap } from '../map/WorldMap';
import { useGameStore } from '../store/gameStore';
import { TopBar } from '../ui/hud/TopBar';
const CountryPanel=lazy(()=>import('../ui/panels/CountryPanel').then(m=>({default:m.CountryPanel})));
import { EventModal } from '../ui/panels/EventModal';
import { CampaignOverlay } from '../ui/panels/CampaignOverlay';
import { CommandRails } from '../ui/hud/CommandRails';
const CampaignSetup=lazy(()=>import('../ui/panels/CampaignSetup').then(m=>({default:m.CampaignSetup})));
const AdvisorModal=lazy(()=>import('../ui/panels/AdvisorModal').then(m=>({default:m.AdvisorModal})));
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
  return <main className="game-shell" style={{'--accent':'#f5d58a','--accent-2':'#c9e0e9','--nation-primary':theme.primary,'--nation-secondary':theme.secondary} as CSSProperties}><WorldMap/><TopBar/><Suspense fallback={<div className="loading-popup"><LocaleText value="Loading command…"/></div>}>{selectedCountryId&&<CountryPanel/>}<CommandRails/><div className="sitrep"><span><LocaleText value={"NEWS // "}/><LocaleText value={sitrep[0]}/></span><span className="sitrep-command-meta"><b><LocaleText value={"WORLD COMMAND CHANNEL"}/></b><small><LocaleText value={"PLAYER · "}/><LocaleText value={mapPresentation.toUpperCase()}/><LocaleText value={" · "}/><LocaleText value={mapMode.toUpperCase()}/><LocaleText value={" · "}/><LocaleText value={mapProjection.toUpperCase()}/></small></span></div><EventModal/><AdvisorModal/><EconomicAdvice/><CampaignSetup/><CampaignOverlay/><CampaignTutorial/><ActionReceipt/><WarTheatreModal/><VictoryScroll/></Suspense><footer className="studio-footer">AlpyX Game Studios</footer></main>;
}

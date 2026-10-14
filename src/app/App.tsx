import {SitrepToasts} from '../ui/hud/SitrepToasts';
import {AudioDirector} from '../audio/AudioDirector';
import {STUDIO_NAME} from '../ui/BrandMark';
import {VictoryScroll} from '../ui/panels/VictoryScroll';
import {EconomicAdvice} from '../ui/panels/EconomicAdvice';
import {LocaleText} from '../i18n/localeText';
import {WarTheatreModal} from '../ui/panels/WarTheatreModal';
import {ActionReceipt} from '../ui/panels/ReviewDialog';
import {CampaignTutorial} from '../ui/panels/CampaignTutorial';
import {Suspense,useState,useCallback,useEffect,type CSSProperties} from 'react';
import { useAutosave } from '../engine/useAutosave';
import { useGameClock } from '../engine/useGameClock';
import { WorldMap } from '../map/WorldMap';
import { useGameStore } from '../store/gameStore';
import { TopBar } from '../ui/hud/TopBar';
import {CountryWorkspace} from '../ui/panels/CountryWorkspace';
import { EventModal } from '../ui/panels/EventModal';
import { RegimeCrisisModal } from '../ui/panels/RegimeCrisisModal';
import { CampaignOverlay } from '../ui/panels/CampaignOverlay';
import { CommandRails } from '../ui/hud/CommandRails';
import {CampaignEntry} from '../ui/panels/CampaignEntry';
import {AdvisorModal} from '../ui/panels/AdvisorModal';
import { countryThemeFor } from '../data/countryThemes';

export function App(){
  const [entryBlocked,setEntryBlocked]=useState(true);
  const onPlaying=useCallback((playing:boolean)=>setEntryBlocked(!playing),[]);
  useGameClock(!entryBlocked); useAutosave(!entryBlocked);
  // Select only the primitive iso2 so the shell does not re-render on every tick of the player's country.
  const playerIso2=useGameStore((s)=>s.countries[s.playerCountryId].iso2);
  const language=useGameStore((s)=>s.playerProfile.language);
  useEffect(()=>{document.documentElement.lang=language;},[language]);
  const selectedCountryId=useGameStore((s)=>s.selectedCountryId??[...s.workspaceTrail].reverse().find(f=>f.selectedCountryId)?.selectedCountryId);
  const theme=countryThemeFor(playerIso2);
  return <><Suspense fallback={<div className="loading-popup"><LocaleText value="Loading command…"/></div>}><CampaignEntry onPlaying={onPlaying}/></Suspense>{!entryBlocked&&<main className="game-shell" style={{'--accent':'#f5d58a','--accent-2':'#c9e0e9','--nation-primary':theme.primary,'--nation-secondary':theme.secondary} as CSSProperties}><WorldMap/><TopBar/><Suspense fallback={<div className="loading-popup"><LocaleText value="Loading command…"/></div>}>{selectedCountryId&&<CountryWorkspace selectedCountryId={selectedCountryId}/>}<CommandRails/><SitrepToasts/><EventModal/><RegimeCrisisModal/><AdvisorModal/><EconomicAdvice/><CampaignOverlay/><CampaignTutorial/><ActionReceipt/><WarTheatreModal/><VictoryScroll/></Suspense><AudioDirector/><footer className="studio-footer" translate="no">{STUDIO_NAME}</footer></main>}</>;
}

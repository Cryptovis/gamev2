import {LandingShell} from './landing/LandingShell';

/** Entry flow for the app: landing, setup, loading, then the game. The flow itself lives in LandingShell. */
export function CampaignEntry({onPlaying}:{onPlaying:(playing:boolean)=>void}) {
  return <LandingShell onPlaying={onPlaying}/>;
}

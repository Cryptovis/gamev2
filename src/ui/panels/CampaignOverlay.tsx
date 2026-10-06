import { useGameStore } from '../../store/gameStore';
export function CampaignOverlay(){
  const status=useGameStore((s)=>s.campaignStatus);
  const reset=useGameStore((s)=>s.resetGame);
  if(status==='active')return null;
  return <div className="event-backdrop"><section className="event-modal"><div className="panel-kicker">CAMPAIGN ENDED</div><h2>Government Removed From Office</h2><p>Your administration failed to retain power. The campaign is over, but the simulation remains deterministic and restartable.</p><button className="restart-button" onClick={reset}>START NEW CAMPAIGN</button></section></div>;
}
